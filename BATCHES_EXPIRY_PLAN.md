# Batches & Expiry — Corrected Implementation Plan

Status: proposed (post architecture review + plan debug)
Scope: backend + web-client + desktop-client
Feature: per-batch inventory with expiry tracking, FEFO stock issue (manual override allowed), expiry report, scheduled expiry alerts

This document supersedes the earlier draft plan. It folds in the architecture review findings AND the plan-debug defects (see section 9). Evidence is `file:line`. "Confirmed" = verified in code; "Proposed" = decision made here; "Open" = needs a product decision.

---

## 1. Context (confirmed)

- Backend: Node/Express 5, CommonJS, layered route -> validate -> controller -> service -> repository -> `pg` pool (`backend/src/config/db.js`).
- Clients: `web-client/` and `desktop-client/` (React + Vite + TS, near-identical). Domain types are inline in `src/services/api.ts`. Both have an IndexedDB offline outbox (`src/services/offline.ts`, `offlineStore.ts`).
- Inventory is aggregate: `product_branch_inventory` has ONE row per `(product_id, branch_id)` with `quantity_on_hand`, `available_quantity`, `reserved_quantity`, `damaged_quantity`, `expired_quantity` (`database/inventory_management_database_schema.sql:529-546`).
- Partial expiry fields already exist but are unused: `products.expiry_required` (`:603`), `purchase_order_items.batch_number/expiry_date` (`:627-628`), `sale_items.batch_number/expiry_date` (`:758-759`).
- `purchase.service.js:receivePurchase` (82-142) increments the aggregate only; it drops PO item batch/expiry.
- `sales.service.js:createSale` (81-358) decrements the aggregate via an atomic oversell guard `WHERE ... quantity_on_hand >= $1` (`:148-159`). `voidSale`/`refundSale` call `restoreSaleInventory` (`:413-431`), which restores the ENTIRE sale quantity on ANY refund, including partial refunds (pre-existing bug). `createSale` never writes `inventory_transactions`.
- Transfers: `inventoryTransfer.service.js:192-209` (ship) and `:256-278` (receive) update `product_branch_inventory` only, OUTSIDE a transaction, inside `try/catch` that only `console.error`s. The status change commits before the inventory update, so a transfer can be marked SHIPPED/RECEIVED even if the stock update fails.
- Sync pull and push BOTH resolve the entity via one allow-list: `sync.repository.js` `pullChanges` `:157 resolveTable(entity)` and `pushChanges` `:185 resolveTable(entity)`; `resolveTable` `:45-49` reads `ENTITY_TABLE_MAP` `:9-26`. `pullChanges` filters `WHERE updated_at > $1` (`:175`); `pushChanges` upserts on the primary key (`:202-244`).
- Manual inventory transactions: `inventoryTransaction.routes.js:10` -> `inventoryTransaction.controller.js:5` -> `inventory.service.js:69-96` with NO transaction wrapper (no `BEGIN/COMMIT`). Only the purchase path passes a client (`purchase.service.js:115`).
- `notifications.notification_type` CHECK allow-list excludes any expiry type (`:445`). `inventory_transactions.transaction_type` CHECK allow-list is `('STOCK_IN','STOCK_OUT','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','SALE')` (`:327`).
- Sync allow-lists: `sync.repository.js` `ENTITY_TABLE_MAP` (9-26), `BRANCH_SCOPE_MAP` (34-43). Client offline lists: `web-client/src/services/offline.ts` `KNOWN_ENTITIES` (45-60), `PULL_ENTITIES` (62-76), `BRANCH_SCOPED_ENTITIES` (81-88).
- No migration runner. The canonical DB is a full pg_dump (`database/inventory_management_database_schema.sql`) loaded only on an empty volume by `database/docker-init/01-schema.sh`.
- No automated tests exist (jest + supertest installed but unused).

---

## 2. Goals / Non-goals

Goals
- Track stock per batch/lot with its own expiry date for products where `expiry_required = true`.
- Consume stock FEFO by default, with an optional server-validated batch override.
- Expiry report and scheduled expiry alerts.
- Keep all existing behavior (reports, offline sync, POS) working unchanged for non-expiry products.

Non-goals (this pass)
- Making `product_batches` the sole source of truth.
- Auto-quarantining expired stock (report + explicit dispose only).
- Offline batch selection in POS.
- A migration framework (Flyway/Alembic/Knex).

---

## 3. Corrected design

### 3.1 Source of truth and scope (Proposed)
- The feature applies ONLY to products with `products.expiry_required = true`. All other products keep aggregate-only behavior exactly as today.
- `product_branch_inventory` remains the maintained aggregate CACHE. `product_batches` is the DETAIL ledger for expiry products. Both are updated in the SAME transaction for every mutation of an expiry product.
- Invariant (expiry products only): `SUM(product_batches.quantity_on_hand WHERE status IN ('ACTIVE','EXPIRED')) = product_branch_inventory.quantity_on_hand`. Provide a reconciliation query and surface mismatches (do not auto-fix).
- Do NOT convert `product_branch_inventory` into a view. It is written directly by `inventory.repository`, `productBranchInventory.repository`, purchase, transfers, and sync, and is cached offline.

### 3.2 Data model (Proposed)
New table `product_batches`:
- `batch_id uuid PK default gen_random_uuid()`
- `product_id uuid NOT NULL`, `branch_id uuid NOT NULL`, `supplier_id uuid`, `po_id uuid`
- `batch_number varchar(100)`, `expiry_date date` (sentinel `DATE '9999-12-31'` when unknown), `received_date date default current_date`
- `cost_price numeric(12,2)`
- `quantity_received numeric(12,2) NOT NULL default 0`
- `quantity_on_hand numeric(12,2) NOT NULL default 0`
- `quantity_reserved numeric(12,2) NOT NULL default 0`
- `status varchar(20) NOT NULL default 'ACTIVE'` CHECK `('ACTIVE','DEPLETED','EXPIRED','DISPOSED')`
- `created_at`, `updated_at` (`timestamptz` not used elsewhere; match `timestamp without time zone DEFAULT now()`), `created_by`

Indexes:
- Merge key: `UNIQUE (product_id, branch_id, COALESCE(batch_number,''), COALESCE(expiry_date, DATE '9999-12-31')) WHERE status='ACTIVE'`. BOTH columns wrapped: Postgres treats NULL as distinct, so an unwrapped `expiry_date` would allow duplicate ACTIVE rows. Use this exact expression list in `ON CONFLICT` targets (see 3.5).
- FEFO/read: `(branch_id, product_id, expiry_date, batch_id) WHERE status='ACTIVE' AND quantity_on_hand > 0`.
- Expiry report: `(expiry_date) WHERE status='ACTIVE'`.

Every write MUST set `updated_at = now()` (no trigger): `pullChanges` filters on `updated_at` (`sync.repository.js:175`), so a write that omits it is invisible to offline pulls (Defect 7).

New table `sale_item_batches` (replaces a single `sale_items.batch_id`; a FEFO line can span batches):
- `sale_item_id uuid NOT NULL`, `batch_id uuid NOT NULL`, `quantity numeric(12,2) NOT NULL`, `cost_price numeric(12,2)`
- PK/unique on `(sale_item_id, batch_id)`.
- `unit_price`/`line_total` stay on `sale_items`; this table is the batch allocation detail used for void/refund restoration.

Schema changes to existing tables:
- `sale_items`: keep existing `batch_number`/`expiry_date`; no new `batch_id` column.
- `inventory_transactions`: add `batch_id uuid` ONLY if disposal/batch movements will be recorded there. Extend the `transaction_type` CHECK with `DISPOSAL` when the dispose endpoint is added (do the CHECK change in the same migration, before any DISPOSAL insert).
- `notifications.notification_type` CHECK: add `'EXPIRY_ALERT'` (drop + recreate `notifications_notification_type_check`; additive value is safe for existing rows).

### 3.3 Migration strategy (Proposed)
- The pg_dump is the immutable BASE. Do NOT hand-edit it. Migrations are the single source of truth for new schema.
- Add `database/migrations/` with idempotent, additive SQL (`IF NOT EXISTS`, `DO $$...$$` for CHECK changes, `CREATE OR REPLACE`). First file: `001_product_batches_expiry.sql`.
- Add `database/docker-init/02-migrations.sh` that runs `psql -f /migrations/*.sql` after `01-schema.sh`, so a fresh volume = base dump + all migrations. NOTE: docker-init runs only when the volume is empty.
- Add `database/apply-migrations.sh` to apply the same migrations to an existing volume.
- Never dual-maintain schema in the dump and a migration file.

### 3.4 Backfill (Proposed, required)
- As part of `001`, for every existing `product_branch_inventory` row whose product has `expiry_required = true`, insert one `product_batches` row: `batch_number=NULL`, `expiry_date = DATE '9999-12-31'`, `quantity_on_hand = aggregate quantity_on_hand`, `quantity_received = same`, `status='ACTIVE'`, `cost_price = products.cost_price`.
- Without this, FEFO and the expiry report see zero stock for all existing inventory.

### 3.5 Stock-in (Proposed)
- Single funnel `productBatch.service.addStockToBatch(client, {...})`, called within the caller's transaction:
  - Atomic upsert via `INSERT INTO product_batches (...) VALUES (...) ON CONFLICT (product_id, branch_id, COALESCE(batch_number,''), COALESCE(expiry_date, DATE '9999-12-31')) WHERE status='ACTIVE' DO UPDATE SET quantity_on_hand = product_batches.quantity_on_hand + EXCLUDED.quantity_on_hand, quantity_received = ..., updated_at = now()`. A SELECT-then-INSERT merge races and fails the whole receive under concurrency (Defect 4).
  - Increment aggregate `quantity_on_hand`/`available_quantity`.
  - Enforce `expiry_required` -> `expiry_date` mandatory.
- Wire into `purchase.service.js:receivePurchase` (`:100-121`) so PO item batch/expiry are no longer dropped (already inside a transaction with a client).
- Wire into `inventory.service.js:createTransaction` for `in` and `adjustment` on expiry products. IMPORTANT: the manual path currently has NO transaction (Defect 2). `createTransaction` must open its own `BEGIN/COMMIT` when no `client` is passed, and join the caller's transaction when one is. Assign the `updated_by`/`updated_at` explicitly.
- Cost policy (Open Q3): default weighted-average stored on the batch on merge.

### 3.6 Stock-out / FEFO (Proposed)
- Do NOT replace the existing oversell guard. Keep `sales.service.js:148-159` (`UPDATE ... WHERE ... quantity_on_hand >= $1 RETURNING *`) as the authoritative check; it row-locks the `(product,branch)` row and serializes concurrent sales, which transitively serializes batch allocation.
- Then allocate batches in the SAME transaction, only for expiry products:
  - If `item.batch_id` supplied: validate it belongs to product/branch and has enough `quantity_on_hand`; consume it.
  - Else FEFO: `SELECT ... WHERE product_id=$ AND branch_id=$ AND status='ACTIVE' AND quantity_on_hand > 0 ORDER BY expiry_date ASC, batch_id ASC FOR UPDATE` (deterministic order to avoid deadlocks).
  - Record each allocation in `sale_item_batches`.
- Cost (Defect 3): a line may span batches with different costs, so store the WEIGHTED-AVERAGE cost of the allocations in `sale_items.cost_price` (`SUM(alloc.quantity * alloc.cost_price) / line.quantity`); the per-batch truth is `sale_item_batches`.
- Short coverage handling (Open Q2): normal path does not hard-fail if the aggregate guard passed (preserves current behavior and the `created_offline` non-failing path); record untracked remainder for reconciliation. A strict mode for expiry products is optional.
- `created_offline === true` path (`:136-147`) always uses the non-failing branch.
- Rounding: `numeric(12,2)`; allocated batch quantities must sum exactly to the line quantity.

### 3.7 Void / refund (Proposed)
- Restore from `sale_item_batches` by the refunded quantity, and track how much of each line has already been restored so repeated partial refunds cannot over-restore.
- Legacy fallback (Defect 6): if the sale has NO `sale_item_batches` rows (pre-migration sales), fall back to the existing aggregate restore in `restoreSaleInventory` (`sales.service.js:413-431`).
- Fix the pre-existing partial-refund over-restore for expiry products, or block partial refunds for expiry products until fixed.
- Dispose endpoint (if built) writes `inventory_transactions` type `DISPOSAL` with `batch_id`, decrements the batch, and adjusts aggregate `expired_quantity`.

### 3.8 Transfers and adjustments (Proposed — NOT deferrable without a guard)
- Either make ship/receive and adjustments batch-aware in the SAME phase batches go live, AND wrap the transfer inventory updates in a real transaction (they currently are not; fixes the swallow-at `:207-209`/`:276-278`), or
- Hard-block transfers/adjustments of `expiry_required` products with a clear 409 until batch-aware versions exist.
- Transfer batch mapping (Defect 5): the transfer record has no batch data, so define it explicitly:
  1. At ship: pick source batches FEFO for the transfer quantity, decrement them, and persist the picked `{batch_number, expiry_date, quantity, cost_price}` on the transfer (new child rows or JSON column) so receive can recreate the same lots.
  2. At receive: create/merge destination `product_batches` with the same `batch_number`/`expiry_date` (the merge key includes `branch_id`, so destination rows are new) and increment the destination aggregate.
  3. Handle residual/partial quantities and keep the whole thing in one transaction.
- Deferring with no guard guarantees drift (aggregate != SUM(batches)) and breaks the expiry report.

### 3.9 Expiry report (Proposed)
- `report.repository.js` + `report.service.js` + `report.controller.js`: `expiryReport(branchId, withinDays, includeExpired)`, reading `product_batches` joined to products/branches.
- `report.routes.js`: `GET /reports/expiry` with `VIEW_REPORTS`; validation in `report.validation.js`.
- Read-only: this can ship first, before any batch writes.

### 3.10 Alerts (Proposed)
- `notification.service.js`: `createExpiryNotification({ batch, product, branch, daysToExpiry })` with its own dedup (mirror `findRecentLowStock`), type `EXPIRY_ALERT`, recipients = users with `MANAGE_INVENTORY` at branch. `notifications.user_id` is NOT NULL; fall back to first recipient as low-stock does.
- `notification.repository.js`: `findRecentExpiry(branch_id, product_id, batch_number, hours)` + `listExpiringBatchCandidates(withinDays)`.
- `worker/queue.worker.js`: add `EXPIRY_SCAN_INTERVAL_MIN` (default 1440) loop beside the low-stock scan.
- Confirm the queue worker is actually deployed (docker-compose service) or alerts never fire.

### 3.11 Sync (Proposed) — CORRECTED for Defect 1
- `pullChanges` and `pushChanges` both resolve entities through `ENTITY_TABLE_MAP` (`sync.repository.js:157`, `:185`). There is no separate pull-only list. Therefore "pull-only" requires a CODE CHANGE, not just configuration:
  1. Add `product-batches` -> `product_batches` to `ENTITY_TABLE_MAP` (so pull resolves).
  2. Add `product_batches: ['branch_id']` to `BRANCH_SCOPE_MAP`.
  3. Add a `PUSH_BLOCKED_ENTITIES` set (e.g. `['product_batches']`) and make `pushChanges` reject it before touching the DB.
  4. Client: add `'batches'` to `PULL_ENTITIES` + `BRANCH_SCOPED_ENTITIES` in `offline.ts`; add the URL->entity mapping so GETs resolve, but do NOT queue batch mutations.
- Rationale: push upserts on the PK (`:202-244`), overwrites `quantity_on_hand` with client values, and conflicts on the PK (not the merge key), so a colliding client batch would fail the whole push payload.
- Offline POS: server always allocates FEFO; the client stays aggregate. Optional `batch_id` override is server-validated. (Because offline sales are replayed as POSTs the server runs `createSale`, server-side FEFO applies automatically.)

### 3.12 Permissions / audit
- All new routes: `authenticate` + `checkPermission`. Reads: `VIEW_INVENTORY`. Writes/dispose: `MANAGE_INVENTORY`. Report: `VIEW_REPORTS`.
- Audit all batch mutations via `auditRepo.writeLog`.
- Permissions are reused (no `seed-permissions.sql`/role changes needed) unless separate `VIEW_BATCHES`/`MANAGE_BATCHES` are wanted (Open Q4).

---

## 4. API (Proposed)
- `POST /batches/search` (VIEW_INVENTORY) — list with filters product/branch/status/expiry window, pagination defaults consistent with other repos.
- `GET /batches/:batchId` (VIEW_INVENTORY)
- `GET /batches/product/:productId/branch/:branchId` (VIEW_INVENTORY) — POS picker (read-only). No route-shadowing issue: `:batchId` matches one segment only, so the longer path does not collide.
- `PATCH /batches/:batchId` (MANAGE_INVENTORY) — adjust reserved/qty.
- `POST /batches/:batchId/dispose` (MANAGE_INVENTORY) — status DISPOSED + developments per 3.7.
- `GET /reports/expiry` (VIEW_REPORTS)
- New vertical slice files mirroring existing layering: `productBatch.repository.js`, `productBatch.service.js`, `productBatch.controller.js`, `productBatch.routes.js`, `productBatch.validation.js`; mount in `app.js` under `/api/v1/batches`.

---

## 5. Phasing (revised for lowest risk)

Phase 0 — read-only, no write risk
- Decide Open Q1-Q5.
- Migration scaffold: `database/migrations/001_product_batches_expiry.sql` (tables + backfill + notification CHECK) and `02-migrations.sh` + `apply-migrations.sh`.
- Read-only `GET /reports/expiry` + repository query.
- Reconciliation query (report count of drift) — no fixing.

Phase 1 — batch spine (expiry products only)
- Batch-aware stock-in (`receivePurchase` + `createTransaction`), with the manual path made transactional (Defect 2) and atomic upsert merge (Defect 4).
- Batch-aware OR hard-blocked transfers/adjustments (fix transfer transactionity + mapping, Defect 5).
- Backfill executed; reconciliation available.

Phase 2 — expiry alerts
- `EXPIRY_ALERT` notification + dedup + worker scan.

Phase 3 — FEFO sales + fixed restore
- Layer FEFO under the existing guard; `sale_item_batches`; weighted-average line cost (Defect 3); fix partial-refund restore + legacy fallback (Defect 6).

Phase 4 — web client
- `api.ts` batches/expiry section; POS batch picker (online, optional override); Inventory batch columns; Purchases expiry display; Reports `expiry` tab; new `ExpiryAlertsPage` (clone `LowStockAlertsPage`); routes in `App.tsx`; nav in `Layout.tsx`; `offline.ts` pull-only entity (3.11).

Phase 5 — desktop client
- Mirror Phase 4; keep scanner `[data-scan]` flows intact.

Cut for an academic timeline: offline batch display, manual-override UI (keep server param), weighted-average costing on merge, desktop reuses web page patterns.

---

## 6. Risks / tradeoffs
- Aggregate-vs-batch drift: mitigated by single-transaction updates + reconciliation, and by making transfers/adjustments batch-aware or blocked.
- Migration dual-source: avoided by base-dump + migrations.
- Profit restatement: changing `profitReport` to use `sale_items.cost_price` changes historical numbers; do it explicitly and tested, and reconcile the two existing profit definitions (`report.repository.js:56-70` vs `:152-163`).
- Sync push safety: keep batches pull-only (requires the code change in 3.11).
- Partial refund integrity: must be fixed or blocked for expiry products.
- Merge semantics: merging the same batch/expiry at different costs collapses cost detail; use weighted-average (Open Q3).

## 7. Open questions
1. Is `expiry_required` the intended feature gate?
2. FEFO short-coverage: best-effort (recommended) or hard-fail?
3. Merge cost policy: weighted-average (recommended) or cost in the merge key?
4. Reuse `VIEW_INVENTORY`/`MANAGE_INVENTORY` or add `VIEW_BATCHES`/`MANAGE_BATCHES`?
5. Are transfers of expiry products realistically used? (decides whether 3.8 is a blocker or a guard)

## 8. Verification
- Migrations apply cleanly to (a) a fresh Docker volume and (b) an existing volume; resulting schemas match.
- Aggregate = SUM(batch quantity_on_hand) for expiry products after receive/sale/void/refund/transfer.
- Manual `POST /inventory/transactions` is atomic (batch + aggregate + transaction row all commit or all roll back).
- Concurrent receive of the same new batch does not fail (ON CONFLICT merge).
- Concurrent sales cannot oversell; FEFO allocation sums exactly to line quantity.
- Multi-batch line cost equals the weighted average of its allocations.
- Sync pulls `product_batches`; sync push to `product_batches` is rejected.
- Expiry report and alerts fire only for expiry products; dedup prevents spam.
- Both clients build (`npm run build`) and typecheck; offline replay of a sale works.

## 9. Plan-debug findings (defects fixed in this revision)
1. HIGH — "pull-only sync" contradicted the code: pull and push share `ENTITY_TABLE_MAP` (`sync.repository.js:157`, `:185`). Fixed in 3.11 by adding a `PUSH_BLOCKED_ENTITIES` guard.
2. HIGH — manual inventory-transaction path is not transactional (`inventoryTransaction.controller.js:5` -> `inventory.service.js:69-96`). Fixed in 3.5 by making `createTransaction` open a transaction when no client is passed.
3. MEDIUM — single `sale_items.cost_price` cannot represent a multi-batch FEFO line. Fixed in 3.6 with weighted-average line cost.
4. MEDIUM — batch merge SELECT-then-INSERT races. Fixed in 3.5 with `ON CONFLICT` upsert.
5. MEDIUM — transfer batch mapping undefined. Fixed in 3.8.
6. LOW — no legacy restore fallback for pre-migration sales. Fixed in 3.7.
7. LOW — `updated_at` maintenance omitted (pull sync filters on it). Fixed in 3.2/3.11.
