# Implementation Plan: Batches & Expiry

Status: approved for implementation (preconditions locked)
Scope: backend + web-client + desktop-client
Feature: per-batch inventory with expiry tracking, FEFO stock issue (manual override allowed), expiry report, scheduled expiry alerts

Companion doc in this repo: `BATCHES_EXPIRY_PLAN.md` (design rationale + plan-debug findings). This file is the actionable build plan and it supersedes the plan dir copy.

---

## Build progress (backend)

| Phase | Status |
|-------|--------|
| Phase 0 — schema + read-only expiry report | ✅ Done & verified (migration `001`, runners, `GET /reports/expiry`) |
| Phase 1 — batch spine (stock-in, aggregate parity, batch API, sync pull-only) | ✅ Done & verified on scratch DB; `001` applied to live DB |
| Phase 2 — scheduled expiry alerts | ✅ Done & verified on scratch DB (scan + 24h dedup + window, recipient scoping); wired into `queue.worker.js` (daily, 7-day default, env-configurable) |
| Phase 3 — sales FEFO + batch disposal | ✅ Done & verified on scratch DB (incl. `sale_item_batches`, weighted-avg line cost, void/refund restore, dispose); `002` applied to live DB |
| Phase 4 — web-client | ✅ Done (as-built: `api.ts` batch/expiry types + `getBatches`/`getBatchesByProductAndBranch`/`disposeBatch`/`getExpiryReport`; POS per-line FEFO/override lot picker; Inventory "Lots" drill-down + dispose; Purchases expiry column; Reports **Expiry** tab with dispose; `offline.ts`/`SyncPage` pull-only `product-batches`). Typecheck + `vite build` + lint clean. Deviations: no separate `ExpiryAlertsPage` route (expiry alerts surface via notifications + the report tab) and no client `createBatch`/`updateBatch` (ledger is server-authoritative). |
| Phase 5 — desktop-client | ✅ Done (as-built: all 7 files ported to `desktop-client/src` — `api.ts` batch/expiry types + endpoints, POS per-line FEFO/override lot picker, Inventory "Lots" modal + dispose, Purchases expiry column, Reports **Expiry** tab, `offline.ts`/`SyncPage` pull-only `product-batches`); desktop-specific `data-scan` scanner flows, native print, and `resetSaleForm` preserved. Typecheck + `vite build` + lint clean. |

Deviations / notes recorded during the build (supersede earlier plan text):

- **Transfers (precondition 5): interim 409 guard.** Transfers of `expiry_required` products are blocked (`EXPIRY_TRANSFER_UNSUPPORTED`) because the transfer record does not yet persist picked lots; allowing them would desync the batch ledger from the aggregate. Batch-aware transfers with lot persistence remain a later increment.
- **Migration `002_sales_batch_disposal.sql`** adds `DISPOSAL` to the `inventory_transactions` CHECK (dispose endpoint records a ledger transaction). `001` backfill remains the only schema-related change to the canonical dump's consumers.
- **Race fix:** `inventory.service.applyTransaction` now locks the `product_branch_inventory` row (`FOR UPDATE`) so concurrent stock-outs cannot both pass the oversell guard (lost-update). `createSale`'s aggregate `UPDATE ... WHERE quantity_on_hand >= $1` is already atomic within its transaction.
- **Sync:** `product_batches` is pull-only via `PUSH_BLOCKED_ENTITIES`; `sale_item_batches` is server-side only (not synced).
- Expiry-product manual stock-out via `POST /inventory/transactions` requires `batch_id` for a strict override; otherwise FEFO applies. Purchase receipts pass `batch_number`/`expiry_date` from the PO line into the batch ledger.
- **Phase 1.2 wiring fix (post-review).** The manual `POST /inventory/transactions` path was not actually wired: `inventoryTransaction.controller.js` dropped `batch_number`/`expiry_date`/`batch_id`/`unit_cost`, and the validation rejected/ignored them, so stocking an `expiry_required` product in via Stock Movements failed with `EXPIRY_REQUIRED` even when the client sent an expiry date. The controller now forwards those fields, `inventoryTransaction.validation.js` accepts them, and the web + desktop `StockMovementsPage` collects **Expiry Date (required)** and **Batch/Lot Number (optional)** when the selected product is `expiry_required`. Verified live: stock-in creates batch rows, FEFO sale consumes earliest expiry, override consumes the named lot, dispose decrements the aggregate and writes a `DISPOSAL` row, and `SUM(batches ACTIVE+EXPIRED) = aggregate` holds.

---

## Locked preconditions

| # | Question | Decision |
|---|----------|----------|
| 1 | Feature gate | `products.expiry_required = true` |
| 2 | FEFO short coverage | Best-effort + fill-batch; never fail a sale the aggregate guard approved |
| 3 | Merge cost policy | Weighted average on the batch |
| 4 | Permissions | Reuse `VIEW_INVENTORY` / `MANAGE_INVENTORY` / `VIEW_REPORTS` |
| 5 | Expiry-product transfers | Batch-aware (not hard-block) |

Derived requirements:
- Expiry products must supply an `expiry_date` on receive; reject otherwise.
- Toggling `expiry_required` false -> true must auto-backfill a sentinel batch for existing aggregate stock, in the same transaction as the toggle.
- Short FEFO coverage is attributed to the product/branch sentinel fill batch so `SUM(batches) = aggregate` always holds.
- Batch merge stores weighted-average `cost_price`.
- Transfers must persist picked lots and run transactionally.

---

## Phase 0 — Schema + read-only report (zero write-path risk)

### 0.1 `database/migrations/001_product_batches_expiry.sql` (new)
Idempotent DDL:

```sql
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
```

Same file, after the DDL:
- **Backfill:** insert one `product_batches` row per existing `product_branch_inventory` row whose product has `expiry_required = true`:
  `batch_number = NULL`, `expiry_date = DATE '9999-12-31'`, `quantity_on_hand = aggregate.quantity_on_hand`,
  `quantity_received = aggregate.quantity_on_hand`, `status = 'ACTIVE'`, `cost_price = products.cost_price`.
- **Notification CHECK:**
  `ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;`
  then re-add with `'EXPIRY_ALERT'` appended to the allow-list.
- **Transaction type (only when the dispose endpoint lands):** extend the `inventory_transactions.transaction_type` CHECK with `'DISPOSAL'` in the same migration that first inserts it.

### 0.2 Migration plumbing
- `database/docker-init/04-migrations.sh` — run `psql -f /migrations/*.sql` after `01-schema.sh`/`02-seed.sh`/`03-seed-permissions.sql` (slots 02/03 were already taken, so migrations mount as `04`).
- `database/apply-migrations.sh` — apply the same scripts to an existing volume.
- Mount the script and `./database/migrations:/migrations:ro` in `docker-compose.yml`.
- Do NOT edit the pg_dump (`database/inventory_management_database_schema.sql`). Migrations are the single source of truth for new schema.

### 0.3 Read-only expiry report (backend)
- `backend/src/repositories/report.repository.js`: add `expiryReport(branchId, withinDays, includeExpired)` — join `product_batches` + `products` + `branches`, `WHERE status='ACTIVE' AND quantity_on_hand > 0 AND expiry_date <= current_date + withinDays` (sentinel `9999-12-31` naturally excluded).
- Add `reconciliationDrift()`: count expiry products where aggregate != `SUM(batches)`.
- `backend/src/services/report.service.js`, `backend/src/controllers/report.controller.js`: thin pass-through.
- `backend/src/routes/report.routes.js`: `GET /reports/expiry` with `authenticate` + `checkPermission('VIEW_REPORTS')`.
- `backend/src/validations/report.validation.js`: add `expiryValidation`.

### 0.4 Verify
- Migration applies to a fresh Docker volume and to an existing DB; resulting schemas match.
- `GET /reports/expiry` returns backfilled rows; sentinel date excluded from alerts.
- `reconciliationDrift()` reads zero after backfill.

---

## Phase 1 — Batch spine (expiry products only)

### 1.1 New vertical slice

`backend/src/repositories/productBatch.repository.js` (every function accepts an optional `txClient`):
- `upsertBatch` — atomic:
  `INSERT INTO product_batches (...) VALUES (...) ON CONFLICT (product_id, branch_id, COALESCE(batch_number,''), COALESCE(expiry_date, DATE '9999-12-31')) WHERE status='ACTIVE' DO UPDATE SET quantity_on_hand = product_batches.quantity_on_hand + EXCLUDED.quantity_on_hand, quantity_received = product_batches.quantity_received + EXCLUDED.quantity_received, cost_price = <weighted-average expr>, updated_at = now()`.
  A SELECT-then-INSERT merge races and fails the whole receive under concurrency; this is why the upsert is mandatory.
- `getBatchById`, `listBatches` (filters + pagination), `listBatchesByProductAndBranch`.
- `lockFefoBatches(product_id, branch_id)` — `... WHERE status='ACTIVE' AND quantity_on_hand > 0 ORDER BY expiry_date ASC, batch_id ASC FOR UPDATE` (deterministic order avoids deadlocks).
- `decrementBatch`, `setBatchStatus`, `countBatches`.

`backend/src/services/productBatch.service.js`:
- `addStockToBatch(client, { product_id, branch_id, batch_number, expiry_date, quantity, cost_price, supplier_id, po_id, createdBy })` — enforces `expiry_date` when the product is `expiry_required`; weighted-average cost on merge.
- `allocateFefo(client, { product_id, branch_id, quantity, batch_id? })` -> allocations `[{ batch_id, quantity, cost_price }]`, honoring a server-validated manual `batch_id` override, and attributing any shortfall to the sentinel fill batch (create/merge if absent).
- `restoreBatchesFromSale(client, saleItems, refundQtyByLine)`.
- `disposeBatch(batchId, performedBy)`.

Also: `backend/src/controllers/productBatch.controller.js`, `backend/src/routes/productBatch.routes.js`, `backend/src/validations/productBatch.validation.js`; mount `/api/v1/batches` in `backend/src/app.js`.

### 1.2 Wire stock-in
- `backend/src/services/purchase.service.js:receivePurchase` (lines 100-121): call `addStockToBatch` per line (already inside a transaction with `client`); stop dropping PO item `batch_number`/`expiry_date`.
- `backend/src/services/inventory.service.js:createTransaction`:
  - Open a transaction when `client` is null; join the caller's when provided. Wrap the transaction insert + aggregate update + batch writes together. (The manual `POST /inventory/transactions` path currently has no transaction.)
  - Expiry products: `in`/`adjustment` -> `addStockToBatch`; `out` -> `allocateFefo` or the validated batch override. Non-expiry products unchanged.
  - Every batch write sets `updated_at = now()` (offline pull filters on it).

### 1.3 Transfers (batch-aware, decision Q5)
- Prerequisite: fix transactionality and stop swallowing errors in `backend/src/services/inventoryTransfer.service.js:192-209` (ship) and `:256-278` (receive) — the status must not commit if the stock update fails.
- Ship: FEFO-pick source lots for the transferred quantity, persist the picked `{ batch_number, expiry_date, quantity, cost_price }` on the transfer, decrement lots + aggregate, all in one transaction.
- Receive: recreate/merge destination lots with the same `batch_number`/`expiry_date` (branch is in the merge key, so destination rows are new) and increment the destination aggregate.
- The transfer record must carry lot allocations; if the transfer is single-line, add a small child table or a JSON column in the same migration (exact shape confirmed here in Phase 1).
- If batch-aware transfers cannot land on schedule, fall back to an explicit 409 for `expiry_required` products — never silent drift.
- Adjustments already flow through `createTransaction`, covered by 1.2.

### 1.4 Sync pull-only guard
`pullChanges` and `pushChanges` both resolve entities through `ENTITY_TABLE_MAP` (`sync.repository.js:157`, `:185`), so "pull-only" requires a code change:
1. Add `product-batches` -> `product_batches` to `ENTITY_TABLE_MAP`.
2. Add `product_batches: ['branch_id']` to `BRANCH_SCOPE_MAP`.
3. Add `PUSH_BLOCKED_ENTITIES = new Set(['product_batches'])` and reject those entities at the top of `pushChanges`.

Rationale: push upserts on the PK and overwrites `quantity_on_hand` with client values; a colliding client batch would fail the whole push payload.

### 1.5 Verify
- Concurrent receive of the same new batch merges without failure.
- Manual `POST /inventory/transactions` is atomic (batch + aggregate + transaction row commit or roll back together).
- Invariant holds after receive / adjustment / transfer.
- Sync pulls `product_batches`; push to `product_batches` is rejected.

---

## Phase 2 — Expiry alerts
- `backend/src/services/notification.service.js`: `createExpiryNotification` (type `EXPIRY_ALERT`, dedup mirroring `findRecentLowStock`, recipients = users with `MANAGE_INVENTORY` at the branch, `user_id` fallback as low-stock does), `scanExpiringBatches(withinDays)`.
- `backend/src/repositories/notification.repository.js`: `findRecentExpiry(branch_id, product_id, batch_number, hours)`, `listExpiringBatchCandidates(withinDays)`.
- `backend/src/worker/queue.worker.js`: add an `EXPIRY_SCAN_INTERVAL_MIN` loop (default 1440) beside the low-stock scan.
- Confirm a queue-worker service exists in `docker-compose.yml`, or alerts never fire.

---

## Phase 3 — FEFO sales + fixed restore
- `backend/src/services/sales.service.js:createSale`: keep the oversell guard (lines 148-159) as authoritative. After it, for expiry lines, `allocateFefo` (honor a supplied `batch_id`), insert `sale_item_batches`, and store the weighted-average allocation cost in `sale_items.cost_price` (`SUM(alloc.quantity * alloc.cost_price) / line.quantity`).
- `restoreSaleInventory` (lines 413-431): restore from `sale_item_batches` by refunded quantity; legacy fallback to the aggregate when the sale has no allocation rows (pre-migration sales); fix or guard the pre-existing partial-refund over-restore for expiry products.
- Optional: change `profitReport` (`report.repository.js:56-70`) to `COALESCE(si.cost_price, p.cost_price)`; do it explicitly and reconcile the two existing profit definitions (`:56-70` vs `:152-163`), noting historical restatement.

---

## Phase 4 — Web client
- `web-client/src/services/api.ts`: `Batch` / `ExpiryAlert` types + `getBatches` / `getProductBatches` / `createBatch` / `updateBatch` / `disposeBatch` / `getExpiryReport`; extend `Sale.items`, `InventoryItem`.
- `web-client/src/pages/PosPage.tsx`: extend `CartItem`; FEFO default + optional per-line batch picker (online only); include `batch_id` in the item mapping.
- `web-client/src/pages/InventoryPage.tsx`: batch / expiry / days-left columns + expiring badge + batch drill-down modal.
- `web-client/src/pages/PurchasesPage.tsx`: expiry column; receive uses PO item expiry.
- `web-client/src/pages/ReportsPage.tsx`: `expiry` tab (union + tabs + loader + block + export).
- New `web-client/src/pages/ExpiryAlertsPage.tsx` (clone `LowStockAlertsPage.tsx`).
- `web-client/src/App.tsx` routes + `web-client/src/components/Layout.tsx` nav/icon.
- `web-client/src/services/offline.ts`: add `batches` to `PULL_ENTITIES` + `BRANCH_SCOPED_ENTITIES` + URL mapping; do NOT queue batch mutations.

## Phase 5 — Desktop client
- Mirror Phase 4 one-to-one in `desktop-client/`; keep `[data-scan]` scanner flows and native print intact.

---

## Cross-cutting
- Every new route: `authenticate` + `checkPermission` (reuse policy, Q4).
- Mutating creates that a client may retry (e.g. `POST /batches`) use the existing idempotency middleware.
- Audit all batch mutations via `auditRepo.writeLog`.
- Match schema conventions exactly (`timestamp without time zone DEFAULT now()`, `gen_random_uuid()`), or `pullChanges`/offline breaks.

## Test plan (jest + supertest, currently unused)
- FEFO order; manual override; merge-on-receive under concurrency; insufficient-stock rollback; fill-batch on short coverage; multi-batch line weighted cost; void/refund (full + partial + legacy) batch restore; expiry report; alert dedup; sync `product_batches` pull works and push is rejected; migration applied to fresh vs existing DB; `expiry_required` toggle-on backfill.

## Rollout / rollback
- Ship Phase 0 alone first (read-only) to validate backfill and the invariant in the real DB.
- Each phase is independently revertible; batches are additive, so rollback = stop writing batches (aggregate behavior remains correct).
