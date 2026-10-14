# Implementation Plan: Batches & Expiry

Status: approved-for-planning (post architecture review + plan debug)
Scope: backend + web-client + desktop-client
Feature: per-batch inventory with expiry tracking, FEFO stock issue (manual override allowed), expiry report, scheduled expiry alerts

Companion doc in the repo: `BATCHES_EXPIRY_PLAN.md` (design rationale + debug findings).

---

## Preconditions (must decide before Phase 1)
1. Gate = `products.expiry_required` (assumed).
2. FEFO short-coverage = best-effort (do not hard-fail when the aggregate guard passed).
3. Merge cost = weighted average on the batch.
4. Permissions = reuse `VIEW_INVENTORY` / `MANAGE_INVENTORY` / `VIEW_REPORTS`.
5. Transfers of expiry products: implement batch-aware (recommended) or hard-block with 409.

---

## Phase 0 — Schema + read-only report (zero write-path risk)

### 0.1 `database/migrations/001_product_batches_expiry.sql` (new)
Idempotent DDL:

    CREATE TABLE IF NOT EXISTS public.product_batches (
      batch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid NOT NULL REFERENCES public.products(product_id),
      branch_id uuid NOT NULL REFERENCES public.branches(branch_id),
      supplier_id uuid REFERENCES public.suppliers(supplier_id),
      po_id uuid REFERENCES public.purchase_orders(po_id),
      batch_number varchar(100),
      expiry_date date,
      received_date date DEFAULT current_date,
      cost_price numeric(12,2),
      quantity_received numeric(12,2) NOT NULL DEFAULT 0,
      quantity_on_hand numeric(12,2) NOT NULL DEFAULT 0,
      quantity_reserved numeric(12,2) NOT NULL DEFAULT 0,
      status varchar(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','DEPLETED','EXPIRED','DISPOSED')),
      created_by varchar(100),
      created_at timestamp without time zone DEFAULT now(),
      updated_at timestamp without time zone DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_product_batches_active
      ON public.product_batches (product_id, branch_id,
           COALESCE(batch_number,''), COALESCE(expiry_date, DATE '9999-12-31'))
      WHERE status = 'ACTIVE';

    CREATE INDEX IF NOT EXISTS ix_product_batches_fefo
      ON public.product_batches (branch_id, product_id, expiry_date, batch_id)
      WHERE status = 'ACTIVE' AND quantity_on_hand > 0;

    CREATE INDEX IF NOT EXISTS ix_product_batches_expiry
      ON public.product_batches (expiry_date) WHERE status = 'ACTIVE';

    CREATE TABLE IF NOT EXISTS public.sale_item_batches (
      sale_item_id uuid NOT NULL,
      batch_id uuid NOT NULL REFERENCES public.product_batches(batch_id),
      quantity numeric(12,2) NOT NULL,
      cost_price numeric(12,2),
      PRIMARY KEY (sale_item_id, batch_id)
    );

Same file, after the DDL:
- Backfill: insert one `product_batches` row per existing `product_branch_inventory` row whose product has `expiry_required = true` (`batch_number = NULL`, `expiry_date = DATE '9999-12-31'`, `quantity_on_hand = aggregate`, `quantity_received = aggregate`, `status='ACTIVE'`, `cost_price = products.cost_price`).
- Notification CHECK:
  - `ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;`
  - Re-add with `'EXPIRY_ALERT'` appended to the allow-list.

### 0.2 Migration plumbing
- `database/docker-init/02-migrations.sh` — run `psql -f /migrations/*.sql` after `01-schema.sh`.
- `database/apply-migrations.sh` — same scripts against an existing volume.
- Do NOT touch the pg_dump.

### 0.3 Read-only expiry report (backend)
- `repositories/report.repository.js`: `expiryReport(branchId, withinDays, includeExpired)` — join `product_batches` + `products` + `branches`, `WHERE status='ACTIVE' AND quantity_on_hand > 0 AND expiry_date <= current_date + withinDays`.
- Include a `reconciliationDrift()` query: count of `expiry_required` products where aggregate != SUM(batches). Report only, no auto-fix.
- `services/report.service.js`, `controllers/report.controller.js`: thin pass-through.
- `routes/report.routes.js`: `GET /reports/expiry` (`VIEW_REPORTS`).
- `validations/report.validation.js`: add `expiryValidation`.

### 0.4 Verify
- Migration applies to a fresh Docker volume and to an existing DB with identical resulting schema.
- `GET /reports/expiry` returns backfilled rows; sentinel date excluded from alerts.

---

## Phase 1 — Batch spine (expiry products only)

### 1.1 New vertical slice
`repositories/productBatch.repository.js` (all accept `txClient`):
- `upsertBatch` — atomic `INSERT ... ON CONFLICT (product_id, branch_id, COALESCE(batch_number,''), COALESCE(expiry_date, DATE '9999-12-31')) WHERE status='ACTIVE' DO UPDATE SET quantity_on_hand = product_batches.quantity_on_hand + EXCLUDED.quantity_on_hand, quantity_received = product_batches.quantity_received + EXCLUDED.quantity_received, updated_at = now()`.
- `getBatchById`, `listBatches` (filters + pagination), `listBatchesByProductAndBranch`.
- `lockFefoBatches(product_id, branch_id)` — `... WHERE status='ACTIVE' AND quantity_on_hand > 0 ORDER BY expiry_date ASC, batch_id ASC FOR UPDATE`.
- `decrementBatch`, `setBatchStatus`, `countBatches`.

`services/productBatch.service.js`:
- `addStockToBatch(client, { product_id, branch_id, batch_number, expiry_date, quantity, cost_price, supplier_id, po_id, createdBy })` — enforces expiry when `expiry_required`.
- `allocateFefo(client, { product_id, branch_id, quantity, batch_id? })` -> allocations `[{ batch_id, quantity, cost_price }]`.
- `restoreBatchesFromSale(client, saleItems, refundQtyByLine)`.
- `disposeBatch(batchId, performedBy)`.

`controllers/productBatch.controller.js`, `routes/productBatch.routes.js`, `validations/productBatch.validation.js`; mount `/api/v1/batches` in `app.js`.

### 1.2 Wire stock-in
- `purchase.service.js:receivePurchase` (lines 100-121): call `addStockToBatch` per line (already inside a transaction with `client`); stop dropping PO item batch/expiry.
- `inventory.service.js:createTransaction`:
  - Fix Defect 2: open a transaction when `client` is null; join the caller's when provided. Wrap transaction insert + aggregate update + batch writes together.
  - Expiry products: `in`/`adjustment` -> `addStockToBatch`; `out` -> `allocateFefo` or batch override. Non-expiry unchanged.
  - Set `updated_at` on batch writes (Defect 7).

### 1.3 Transfers / adjustments guard
- Batch-aware option: at ship (`inventoryTransfer.service.js:192-209`) pick FEFO source batches, persist picked lots on the transfer, decrement batches + aggregate, all in one transaction; at receive (`:256-278`) recreate/merge destination batches (same batch_number/expiry) + aggregate. Fix swallowed errors.
- Or guard: return 409 for `expiry_required` products until batch-aware versions exist.
- Adjustments already flow through `createTransaction`, covered by 1.2.

### 1.4 Sync pull-only guard (Defect 1)
- `sync.repository.js`: add `product-batches` -> `product_batches` to `ENTITY_TABLE_MAP`; add `product_batches: ['branch_id']` to `BRANCH_SCOPE_MAP`; add `PUSH_BLOCKED_ENTITIES = new Set(['product_batches'])` check at the top of `pushChanges`.
- Note: pull and push share `ENTITY_TABLE_MAP`, so this code change is required for "pull-only".

### 1.5 Verify
- Concurrent receive of the same new batch merges without failure.
- Manual `POST /inventory/transactions` is atomic.
- Invariant holds after receive / adjustment / transfer.

---

## Phase 2 — Expiry alerts
- `notification.service.js`: `createExpiryNotification` (type `EXPIRY_ALERT`, dedup mirroring `findRecentLowStock`, recipients = `MANAGE_INVENTORY` at branch, `user_id` fallback), `scanExpiringBatches(withinDays)`.
- `notification.repository.js`: `findRecentExpiry(branch_id, product_id, batch_number, hours)`, `listExpiringBatchCandidates(withinDays)`.
- `worker/queue.worker.js`: `EXPIRY_SCAN_INTERVAL_MIN` loop beside the low-stock scan (default 1440).
- Confirm a queue-worker service exists in `docker-compose.yml`, else alerts never fire.

---

## Phase 3 — FEFO sales + fixed restore
- `sales.service.js:createSale`: keep the oversell guard at lines 148-159; after it, `allocateFefo` per expiry line (honor `item.batch_id`); insert `sale_item_batches`; store weighted-average allocation cost in `sale_items.cost_price`.
- `restoreSaleInventory` (lines 413-431): restore from `sale_item_batches` by refunded quantity; legacy fallback to aggregate when no allocation rows exist; fix or guard partial-refund over-restore for expiry products.
- Optional: change `profitReport` (`report.repository.js:56-70`) to `COALESCE(si.cost_price, p.cost_price)` — explicit, tested, with the historical-restatement caveat; reconcile the two existing profit definitions.

---

## Phase 4 — Web client
- `services/api.ts`: `Batch` / `ExpiryAlert` types + `getBatches` / `getProductBatches` / `createBatch` / `updateBatch` / `disposeBatch` / `getExpiryReport`; extend `Sale.items`, `InventoryItem`.
- `pages/PosPage.tsx`: extend `CartItem`; FEFO default + optional per-line batch picker (online only); include `batch_id` in the item map (lines 622-632).
- `pages/InventoryPage.tsx`: batch / expiry / days-left columns + expiring badge + batch drill-down modal.
- `pages/PurchasesPage.tsx`: expiry column; receive uses PO item expiry.
- `pages/ReportsPage.tsx`: `expiry` tab (union line 30, tabs 355-364, loader + block + export).
- New `pages/ExpiryAlertsPage.tsx` (clone `LowStockAlertsPage.tsx`).
- `App.tsx` routes (lines 130-133) + `components/Layout.tsx` nav/icon (lines 10-40, 42-72).
- `services/offline.ts`: add `batches` to `PULL_ENTITIES` + `BRANCH_SCOPED_ENTITIES` + URL mapping; do NOT queue batch mutations.

## Phase 5 — Desktop client
- Mirror Phase 4 one-to-one; keep `[data-scan]` scanner flows and native print intact.

---

## Cross-cutting
- Every new route: `authenticate` + `checkPermission`; mutating creates use `idempotency(...)` where a client may retry (e.g. `POST /batches`).
- Audit all batch mutations via `auditRepo.writeLog`.
- Match schema conventions exactly (`timestamp without time zone DEFAULT now()`, `gen_random_uuid()`), or `pullChanges` / offline breaks.

## Test plan (jest + supertest, currently unused)
- FEFO order; manual override; merge-on-receive under concurrency; insufficient-stock rollback; multi-batch line weighted cost; void/refund (full + partial + legacy) batch restore; expiry report; alert dedup; sync `product_batches` pull works and push is rejected; migration applied to fresh vs existing DB.

## Rollout / rollback
- Ship Phase 0 alone first (read-only) to validate backfill / invariant in the real DB.
- Each phase is independently revertible; batches are additive, so rollback = stop writing batches (aggregate behavior remains correct).
