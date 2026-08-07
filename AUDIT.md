# Functional Requirements Audit — FR-001 to FR-041

Audit of the three codebases against the project functional requirements.

- **Backend**: `backend/` (Express 5 · CommonJS · Postgres)
- **Desktop client**: `desktop-client/` (Electron + React + Vite, TypeScript)
- **Web client**: `web-client/` (React + Vite, TypeScript)

All evidence is `file_path:line_number`. Route mounting verified in `backend/src/app.js:120-155` (all under `/api/v1`).

## Legend

- ✅ Implemented
- ⚠️ Partial (works, but with a noted limitation)
- ❌ Missing
- — Not applicable (client-only / server-only requirement)

## Summary

| Codebase | Implemented | Partial | Missing |
|----------|------------|---------|---------|
| Backend  | 41 / 41    | 0 | 0 |
| Desktop  | 41 / 41    | 0 | 0 |
| Web      | 41 / 41    | 0 | 0 |

No client↔server endpoint contract mismatches were found — every endpoint the desktop client calls exists server-side.

## FR-by-FR Matrix

### User Management (FR-001 – FR-004)

| FR | Requirement | Backend | Desktop | Web | Notes |
|----|-------------|---------|---------|-----|-------|
| FR-001 | Login with valid credentials | ✅ | ✅ | ✅ | bcrypt verify + session + JWT (`auth.routes.js:64`, `auth.service.js:99-178`); rejects deactivated accounts |
| FR-002 | Secure logout | ✅ | ✅ | ✅ | session revocation (`auth.service.js:259-276`), HttpOnly refresh cookie cleared |
| FR-003 | Role-based access control | ✅ | ✅ | ✅ | `permission.middleware.js:45-90` + `role.middleware.js:14-25`; UI routes gated via `PermissionRoute` (`App.tsx:91-103`) |
| FR-004 | Admin create/update/deactivate users | ✅ | ✅ | ✅ | `user.routes.js:72,225,245`; deactivation revokes sessions |

### Product Management (FR-005 – FR-009)

| FR | Requirement | Backend | Desktop | Web | Notes |
|----|-------------|---------|---------|-----|-------|
| FR-005 | Add products | ✅ | ✅ | ✅ | `product.routes.js:20` with `idempotency('products')`; optionally creates branch inventory atomically |
| FR-006 | Update products | ✅ | ✅ | ✅ | price changes write `price_history` (`product.service.js:143-155`) |
| FR-007 | Deactivate products | ✅ | ✅ | ✅ | soft-delete via `is_active` |
| FR-008 | Search and view products | ✅ | ✅ | ✅ | `POST /products/search` (`product.repository.js:112-159`). Offline POS search hardened: live `/products/search` results are folded into the offline catalog cache on every successful search (`offline.ts` `mergePulledProducts` in the axios success interceptor), so the local catalog stays warm between full sync pulls; offline POS search is branch-scoped (web matches desktop) and degrades available-first when the branch inventory cache is missing — see Offline Notes |
| FR-009 | Barcode assignment | ✅ | ✅ | ✅ | Barcode validation added to `validations/product.validation.js` (create + update: trim, max 100 chars; uniqueness still enforced in `product.service.js:73-78,132-135`). Barcode label printing (CODE128, 40×25 / 58×40 mm, copies, print sheet) added to both Products pages |

### Inventory Management (FR-010 – FR-014)

| FR | Requirement | Backend | Desktop | Web | Notes |
|----|-------------|---------|---------|-----|-------|
| FR-010 | Stock-in transactions | ✅ | ✅ | ✅ | `POST /inventory/transactions` with `idempotency` (`inventoryTransaction.routes.js:10`) |
| FR-011 | Stock-out transactions | ✅ | ✅ | ✅ | insufficient-stock guard (`inventory.service.js:77-86`) |
| FR-012 | Inventory history | ✅ | ✅ | ✅ | filters product/branch/type/date (`inventory.repository.js:25-47`) |
| FR-013 | Current inventory levels | ✅ | ✅ | ✅ | per-branch incl. available/reserved/damaged/expired (`inventory.repository.js:174-225`) |
| FR-014 | Low-stock alerts | ✅ | ✅ | ✅ | triggers on stock transactions (`inventory.service.js:104-117`) **and** sale-driven decrements (`sales.service.js` low-stock candidate capture), plus a scheduled scan (`queue.worker.js`, `LOW_STOCK_SCAN_INTERVAL_MIN` default 30) as a catch-all; `lowStock` report honors per-branch `reorder_level` (`report.repository.js:88-103`) |

### Sales Management (FR-015 – FR-019)

| FR | Requirement | Backend | Desktop | Web | Notes |
|----|-------------|---------|---------|-----|-------|
| FR-015 | Process sales | ✅ | ✅ | ✅ | sale + items + payments in one txn (`sales.service.js:79-299`); void/refund also present |
| FR-016 | Calculate transaction totals | ✅ | ✅ | ✅ | totals recomputed server-side (`sales.service.js:182-198`) |
| FR-017 | Generate receipts | ✅ | ✅ | ✅ | JSON receipt endpoint `GET /sales/:id/receipt` + stored `receipts` row (`sales.service.js:324-352`); clients render a printable receipt. Desktop printing is native/silent via the FR-031 bridge |
| FR-018 | Store sales records | ✅ | ✅ | ✅ | `sales.repository.js:6-28` incl. `invoice_number` + offline flags |
| FR-019 | Multiple payment methods | ✅ | ✅ | ✅ | CASH/CARD/MOBILE_MONEY/BANK_TRANSFER/CREDIT, accepts array (`sales.service.js:9,32-77`) |

### Supplier Management (FR-020 – FR-022)

| FR | Requirement | Backend | Desktop | Web | Notes |
|----|-------------|---------|---------|-----|-------|
| FR-020 | Maintain supplier records | ✅ | ✅ | ✅ | CRUD + activate/deactivate (`supplier.routes.js:12-17`) |
| FR-021 | Purchase order creation | ✅ | ✅ | ✅ | create/submit/approve/receive (`purchase.routes.js:18,26-28,37-40`). `receivePurchase` stocks received items in one DB transaction: requires `APPROVED` (else 409), upserts `product_branch_inventory` per line and writes `STOCK_IN` inventory transactions (`reference_type='PURCHASE'`, `reference_id=po_id`, `unit_cost`), persists `quantity_received`, sets `RECEIVED` + `received_date`; already-`RECEIVED` calls are idempotent no-ops (`purchase.service.js:78-127`, tx via `txClient` threading in `purchase.repository.js`, `purchaseItem.repository.js`, `inventory.service.js:69-120`) |
| FR-022 | Purchase history | ✅ | ✅ | ✅ | searchable by supplier/status/branch (`purchase.repository.js:36-62`) |

### Branch Management (FR-023 – FR-025)

| FR | Requirement | Backend | Desktop | Web | Notes |
|----|-------------|---------|---------|-----|-------|
| FR-023 | Multiple business branches | ✅ | ✅ | ✅ | CRUD + activate/deactivate (`branch.routes.js:17-24`) |
| FR-024 | Inventory by branch | ✅ | ✅ | ✅ | branch-scoped (`inventory.controller.js:22-31`). Sync pulls are branch-scoped too: `pullChanges` filters by `branch_id`/`from_branch_id`/`to_branch_id`/`notifications.branch_id OR NULL` (`sync.repository.js` `BRANCH_SCOPE_MAP`), resolved as `?branchId || req.user.branchId` (`sync.controller.js:15-28`), returning `[]` for scoped entities when no branch is known; offline clients send `?branchId` and skip scoped entities until a branch is selected (`offline.ts`) |
| FR-025 | Sales by branch | ✅ | ✅ | ✅ | `branch_id` on sales (`sales.repository.js:69-72`) + report filter |

### Reporting (FR-026 – FR-029)

| FR | Requirement | Backend | Desktop | Web | Notes |
|----|-------------|---------|---------|-----|-------|
| FR-026 | Sales reports | ✅ | ✅ | ✅ | daily/monthly/annual/profit (`report.routes.js:17-20`) |
| FR-027 | Inventory reports | ✅ | ✅ | ✅ | on-hand/available/reorder fields |
| FR-028 | Stock movement reports | ✅ | ✅ | ✅ | `GET /reports/stock-movements` (`report.routes.js`), group by product/day in `report.repository.js:stockMovements()`, per-transaction-type quantities; "Stock Movements" tab in both Reports pages with XLSX/CSV/PDF export |
| FR-029 | Branch performance reports | ✅ | ✅ | ✅ | `report.routes.js:25`, `report.repository.js:137-149` |

### Desktop Application (FR-030 – FR-032)

| FR | Requirement | Backend | Desktop | Web | Notes |
|----|-------------|---------|---------|-----|-------|
| FR-030 | Barcode scanning | — | ✅ | ✅ | Desktop: native scanner bridge — `electron/preload.cjs` + `electron/main.mjs` global keyboard "burst" scanner (wedge scan works app-wide, focus-independent) + optional raw-HID mode (`electron/hid-scanner.cjs`, node-hid, graceful fallback if unbuildable); scans route into POS auto-add, Stock Movements lookup, or any `[data-scan]` search input; device picker in System Settings. Web: debounced scan field auto-adds exact match |
| FR-031 | Receipt printing | — | ✅ | ✅ | Desktop: native silent printing via the preload/IPC bridge — `electron/main.mjs` (`printer:get-printers` / `printer:print` / `printer:get-config` / `printer:set-config`, `webContents.getPrintersAsync()` + `webContents.print({silent, deviceName, printBackground})`, persisted `userData/printer-config.json`) + `preload.cjs` (`inventoryPrinter`) + `src/services/printService.ts` (`printReceipt`, `window.print()` fallback). All receipt/label flows route through the bridge (POS auto + manual, Sales, Suppliers, Products labels); System Settings has a "Receipt Printer" card (printer picker, silent toggle, test print). Web: browser print dialog |
| FR-032 | Communicate with REST API | — | ✅ | ✅ | axios `baseURL: '/api/v1'` + Vite proxy to `:8040`; token refresh interceptor |

### Notification Management (FR-033 – FR-035)

| FR | Requirement | Backend | Desktop | Web | Notes |
|----|-------------|---------|---------|-----|-------|
| FR-033 | Notify at reorder level | ✅ | ✅ | ✅ | `LOW_STOCK` notification with working 24h dedup keyed on the quoted product name (`notification.service.js:89-118`, `notification.repository.js:213-231`) + recipients at branch; fires on stock transactions, sale-driven decrements, and a scheduled scan (`queue.worker.js`) |
| FR-034 | Notify admins of failed sync | ✅ | ✅ | ✅ | `createSyncFailureNotification` + 1h dedup (`notification.service.js:115-133`), called from `sync.service.js:34,54,80` |
| FR-035 | Notify of branch shortages | ✅ | ✅ | ✅ | Backend: `BRANCH_SHORTAGE` on transfer with insufficient source stock (`inventoryTransfer.service.js:31-46`). Both clients: unread-count badge on the Notifications sidebar item + topbar bell (`src/hooks/useUnreadNotifications.ts`, per-user count via `/notifications/me?isRead=false`, 60s poll + focus/visibility + `notifications-changed` event after mark-read/delete) |

### Inventory Transfers (FR-036 – FR-038)

| FR | Requirement | Backend | Desktop | Web | Notes |
|----|-------------|---------|---------|-----|-------|
| FR-036 | Transfer between branches | ✅ | ✅ | ✅ | full status flow DRAFT→PENDING→APPROVED→SHIPPED→RECEIVED (`inventoryTransfer.service.js:19-86,179-304`) |
| FR-037 | Transfer history | ✅ | ✅ | ✅ | filters product/branch/status/date/requester (`inventoryTransfer.repository.js:39-91`) |
| FR-038 | Approve/reject transfers | ✅ | ✅ | ✅ | approve (`inventoryTransfer.service.js:144-177`), reject PENDING→REJECTED (`:306-336`) |

### Offline Synchronization (FR-039 – FR-041)

| FR | Requirement | Backend | Desktop | Web | Notes |
|----|-------------|---------|---------|-----|-------|
| FR-039 | Store transactions locally during outages | ✅ | ✅ | ✅ | Backend: `sync.routes.js:9-11` (pull/push), `sync.service.js:19-95`. Desktop + Web: IndexedDB outbox (`services/offlineStore.ts`), axios interceptor (`services/offline.ts`) — mutations queued offline, replay-safe via `local_transaction_id` (web port is 1:1, `web-client/src/services/offline*.ts`) |
| FR-040 | Sync when connectivity restored | ✅ | ✅ | ✅ | `OfflineContext.tsx` drain + 10s health probe in both clients; web adds a live `/sync` page ("Sync now", per-entry/log retry, pending/failed stats) + sync pill + pending-offline-sales banner on POS |
| FR-041 | Prevent duplicate sync | ✅ | ✅ | ✅ | Backend: `idempotency.middleware.js:22-76` (claims `(device_id, key)` in `sync_logs` via `INSERT…ON CONFLICT DO NOTHING`) + `UNIQUE(device_id, local_transaction_id)` (`sync.repository.js:116-131`, `database/file.sql:1497`). `POST /sales` now mounts `idempotency('sales', { keyField: 'local_transaction_id' })` (`sales.routes.js:18`), backed by the `sales` table's `UNIQUE(local_transaction_id)` (`file.sql:1425`) and a 23505 graceful-return in `sales.service.js:200-237`; the pre-INSERT dedup check (`sales.service.js:97-105`) remains. Desktop + Web: both send `local_transaction_id` on every sale (`PosPage.tsx` `OFFLINE-` invoices) and `X-Device-Id`, so both are safe |

## Cross-cutting items verified

| Item | Status | Evidence |
|------|--------|----------|
| `/api/v1/health` | ✅ | `app.js:111-113` |
| Refresh-token flow (rotation, reuse detection) | ✅ | `auth.routes.js:89`, `auth.service.js:184-248` |
| userBranch assignment endpoints | ✅ | `userBranch.routes.js:11-19`, `auth.routes.js:112,114` |

## Gaps (actionable)

1. **Report/export stubs.** Backend generic `/reports` + `/export` return HTTP 501 for xlsx/pdf (`report.controller.js:492-500`); clients export client-side, so no user-facing impact.
2. **Minor.**
   - Sync-log `device_id` is a fresh uuid per row instead of the client `X-Device-Id` (`sync.service.js:26,32,45,51`; the idempotency middleware *does* read the header).
   - Customer import/export are backend 501 stubs (`customer.routes.js:20-21`); clients do row-by-row client-side import.

## Offline notes (FR-008 / FR-039 / FR-040)

- The desktop offline stack (outbox + idempotency) is fully implemented and verified, and was ported 1:1 into the web client (`offlineStore.ts`, `offlineEvents.ts`, `offline.ts`, `OfflineContext.tsx`, `SyncPage.tsx`, `PosPage.tsx` offline flows). Both clients: IndexedDB `inventory-offline` v2, axios interceptor queues mutations offline, auto-sync on reconnect + 10s health probe.
- Web caveats:
  - IndexedDB is per-origin, so offline scope is a single browser tab/site (unlike the desktop app's single persistent instance).
  - `crypto.randomUUID()` requires a secure context (HTTPS or localhost); `http://` LAN deployments should fall back to a manual UUID helper.
  - No Service Worker — the app still needs a live tab to queue and replay offline work; refresh-without-connectivity shows an error rather than a cached shell.
- **Open issue (resolved):** offline POS search used to rely only on the IndexedDB catalog caches `entity:pulled:products` / `entity:pulled:inventories`, hydrated only during an online boot/reconnect. If the backend was unreachable (e.g., frozen) during every boot, the cache stayed empty and offline search reported "no product catalog cached". Fixed: (1) the axios success interceptor now folds every successful `/products/search` response into `entity:pulled:products` via `mergePulledProducts` (`offline.ts`), so the local catalog stays warm even if full sync pulls haven't run recently; (2) offline POS search is branch-scoped in both clients (web now sends `branchId` online and filters offline against the branch inventories cache, matching desktop); (3) it degrades available-first — when the branch inventory cache is missing/empty but the catalog is cached, it searches the full catalog with an informational message instead of returning nothing. Residual note: a frozen backend from the very first boot still yields an empty cache (nothing ever succeeded to warm it) — restart backend cleanly, then verify cache hydration.
