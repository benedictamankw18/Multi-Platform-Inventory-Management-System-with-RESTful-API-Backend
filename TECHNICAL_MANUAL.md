# Technical Manual

Architecture, data model, API and internals of the **Multi-Platform Inventory
Management System** (MPIMS).

- [1. System architecture](#1-system-architecture)
- [2. Repository structure](#2-repository-structure)
- [3. Backend architecture](#3-backend-architecture)
- [4. Authentication & authorization](#4-authentication--authorization)
- [5. Database](#5-database)
- [6. REST API reference](#6-rest-api-reference)
- [7. Background processing](#7-background-processing)
- [8. Offline & synchronization](#8-offline--synchronization)
- [9. Desktop integration](#9-desktop-integration)
- [10. Reporting](#10-reporting)
- [11. Frontend clients](#11-frontend-clients)
- [12. Configuration](#12-configuration)
- [13. Build & tooling](#13-build--tooling)
- [14. Security](#14-security)
- [15. Testing & verification](#15-testing--verification)
- [16. Known limitations](#16-known-limitations)

---

## 1. System architecture

```
┌──────────────┐        ┌──────────────┐
│  Web browser │        │ Electron app │   React 19 + Vite 8 + TypeScript
│  (React SPA) │        │ (renderer)   │   (shared UI; desktop adds IPC)
└──────┬───────┘        └──────┬───────┘
       │ HTTPS / REST          │ REST (localhost:8040)
       ▼                       ▼
┌─────────────────────────────────────────────┐
│ nginx (web image)  ── serves SPA, proxies API│
└───────────────────────┬─────────────────────┘
                        ▼
┌─────────────────────────────────────────────┐     ┌──────────────┐
│ backend (Express 5, Node 22)  /api/v1        │────▶│  PostgreSQL  │
│   routes → controllers → services → repos    │     │      18      │
└───────────────┬─────────────────────────────┘     └──────────────┘
                │                                     ┌──────────────┐
                ├────────────────────────────────────▶│  Redis 7     │
                │                                     │ cache/limits │
                ▼                                     └──────────────┘
┌─────────────────────────────────────────────┐
│ queue-worker (separate container)            │  e-mail/SMS, low-stock scans
└─────────────────────────────────────────────┘
```

Key properties:

- **Single API, two clients.** The web and desktop clients share the same React
  codebase and talk to the same `/api/v1` API.
- **Stateless API + Redis.** JWTs carry identity; Redis holds caches and rate
  limits. The API can be scaled horizontally.
- **Additive migrations.** Schema changes ship as append-only SQL files.
- **Offline-first desktop.** The desktop client caches data in IndexedDB and
  queues writes when offline.

---

## 2. Repository structure

```
.
├─ backend/                     Express REST API
│  ├─ server.js                 HTTP bootstrap; forks the queue worker
│  └─ src/
│     ├─ app.js                 Express app, middleware order, route mounts
│     ├─ config/                db.js, swagger.js, mail.js, database.js
│     ├─ routes/                URL → controller (+, validators, permissions)
│     ├─ controllers/           HTTP request/response only
│     ├─ services/              business logic
│     ├─ repositories/          SQL / persistence
│     ├─ validations/           express-validator rule sets
│     ├─ middleware/            auth, permission, rate limit, error, logger
│     ├─ utils/                 AppError, jwt, bcrypt, cache, geoip, batchNumber
│     └─ worker/                queue.worker.js (background jobs)
├─ web-client/                  React SPA (browser)
├─ desktop-client/              Electron shell + same React pages
│  └─ electron/                 main.mjs, preload.cjs, hid-scanner.cjs
├─ database/
│  ├─ inventory_management_database_schema.sql   canonical DDL (immutable)
│  ├─ seed-permissions.sql                        permission catalogue + grants
│  ├─ migrations/                                 additive, idempotent SQL
│  ├─ docker-init/                                first-boot scripts
│  └─ apply-migrations.sh                         migrate an existing database
├─ docker-compose.yml           full server-side stack
├─ .env.docker.example          Compose environment template
├─ INSTALLATION.md / RUNNING.md / TECHNICAL_MANUAL.md / USER_MANUAL.md
├─ DOCKER.md / AUDIT.md / README.md (SRS)
└─ docs/                        project documentation set
```

---

## 3. Backend architecture

### 3.1 Layering

Requests flow strictly downward; each layer has one job:

```
route  →  validation  →  auth/permission middleware  →  controller
       →  service  →  repository  →  PostgreSQL / Redis
```

| Layer | Responsibility | Must **not** |
| ----- | --------------- | ------------ |
| `routes/` | Path + HTTP verb, attach validators and permission middleware | Contain business rules |
| `validations/` | Input shape/format checks (`express-validator`) | Touch the database |
| `controllers/` | Read `req`, call a service, send `res` | Contain SQL or business logic |
| `services/` | Business rules, transaction orchestration, audit writes | Format HTTP responses |
| `repositories/` | Parameterised SQL | Contain business rules |

This keeps `services/` framework-agnostic and testable, and concentrates SQL in
`repositories/`.

### 3.2 `app.js` middleware order

Order is significant (see the header comment in `backend/src/app.js`):

1. Security headers (`helmet`) and CORS.
2. Body parsers + static `/uploads` (with cross-origin resource policy).
3. Cookie parser.
4. Request logging (file logger + `morgan`).
5. Global rate limiter (login-specific limiting lives in `auth.routes.js`).
6. Health check (`GET /api/v1/health`) and Swagger UI (`/api/v1/docs`) —
   **before** routes so they are reachable.
7. Route mounts.
8. 404 catch-all (`notFound.middleware.js`).
9. Global error handler (`error.middleware.js`) — last, four-argument signature.

`TRUST_PROXY` sets Express's `trust proxy` so `req.ip` (login history, rate
limits) is correct behind nginx.

### 3.3 Conventions

- **Errors:** services throw `AppError` (`backend/src/utils/AppError.js`) with a
  `status` and a `code`. The error middleware converts it to JSON. Raw database
  or driver errors are never returned to clients — they are logged server-side
  and replaced with a generic message.
- **Async handlers:** controllers use `express-async-handler`, so thrown errors
  propagate to the global handler without `try/catch` noise.
- **Audit logging:** privileged actions call `audit.repository.writeLog(...)` via
  services.

---

## 4. Authentication & authorization

### 4.1 Token model

| Token | Transport | Lifetime | Notes |
| ----- | --------- | -------- | ----- |
| **Access token** | `Authorization: Bearer <jwt>` | `ACCESS_TOKEN_TTL` (15m) | Signed with `ACCESS_TOKEN_SECRET`. |
| **Refresh token** | HTTP-only cookie | `REFRESH_TOKEN_TTL_DAYS` (30d) | Signed with `REFRESH_TOKEN_SECRET`; rotated on use; reuse is detected. |

### 4.2 Sessions

- Every login creates a row in `user_sessions` (`session_id`, `user_id`,
  `revoked`, `issued_at`, refresh-token metadata).
- **Immediate logout:** a revoked session or a deactivated user
  (`users.is_active = false`) fails closed on the next request — the API checks
  the session/user state, not just JWT validity.
- **Inactivity:** sessions idle beyond
  `SESSION_INACTIVITY_TIMEOUT_MINUTES` (30m) are rejected.
- **Self-service:** `GET /api/v1/sessions` lists the caller's sessions and
  `DELETE /api/v1/sessions/:id` revokes one. A user may revoke **only their own**
  session; a missing or non-owned id returns `404` (never `403`, so the API does
  not disclose whether the id exists). The audit entry is written only after the
  ownership check passes.
- `login_history` records attempts (with GeoIP-derived location); `password_reset_tokens`
  back the 1-hour reset flow.

### 4.3 Roles and permissions (RBAC)

Permissions are checked with **AND** semantics (a route may require several).
`permission.middleware.js` resolves a role's permission set (cached in Redis as
`role-permissions:<roleId>` for **300s**) and grants a bypass to `Business Owner`
and `Administrator`.

Seven system roles are seeded (`database/docker-init/02-seed.sh`):

| Role | Intent |
| ---- | ------ |
| Administrator | Full system access. |
| Business Owner | Effectively all permissions. |
| Manager | Full operations except user/branch management. |
| Branch Manager | Branch operations, minus user/branch/settings/delete. |
| Storekeeper | Stock-centric (receiving, counts, transfers). |
| Cashier | Point of sale and basic viewing. |
| Technical | Monitoring and read-only access. |

**Two families of permission:**

- **Data permissions** gate API endpoints (server-enforced) — e.g.
  `VIEW_PRODUCTS`, `VIEW_SALES`, `VIEW_CATEGORIES`, `VIEW_SUPPLIERS`.
- **Page permissions** gate navigation/routes in the clients — e.g.
  `VIEW_PRODUCTS_PAGE`, `VIEW_CUSTOMERS_PAGE`, `VIEW_SYNC_PAGE`,
  `VIEW_REPORTS_PAGE`, `VIEW_AUDIT_LOGS_PAGE`.

The full catalogue (35 permissions) lives in `database/seed-permissions.sql`.
The page/data split lets an operator hide a screen from a role while the
endpoints it needs for other screens stay reachable. Note that a *few* screens
(Categories, Suppliers) are also server-enforced, so a restricted role receives
`403` if it calls them directly.

### 4.4 The Cashier restriction (worked example)

Migration `008_cashier_page_access.sql` adds the five `*_PAGE` permissions,
grants them to every non-Cashier role, and **removes them from Cashier**, which
also loses `VIEW_CATEGORIES` and `VIEW_SUPPLIERS`. Cashier keeps the data
permissions its remaining screens need (`VIEW_PRODUCTS`, `VIEW_CUSTOMERS`,
`VIEW_REPORTS`, `VIEW_AUDIT_LOGS`, `CREATE_SALE`, …). Both clients hide the
corresponding menus and wrap the routes in `PermissionRoute`.

---

## 5. Database

### 5.1 Schema management

- **`database/inventory_management_database_schema.sql`** is the canonical DDL
  dump and is treated as **immutable**. Changes are never made by editing it.
- **`database/migrations/*.sql`** are additive and idempotent; there is **no
  tracking table**, so re-running the whole directory is safe.
- Fresh volumes run the init scripts in order (schema → seed → permissions →
  migrations). Existing databases use `database/apply-migrations.sh`.
- `POSTGRES_USER` must remain `postgres` because the dump assigns objects to it.

### 5.2 Tables (43)

Grouped by domain:

| Domain | Tables |
| ------ | ------ |
| Identity & access | `users`, `roles`, `permissions`, `role_permissions`, `user_sessions`, `refresh_tokens`, `password_reset_tokens`, `user_branches`, `login_history` |
| Organisation | `branches`, `business_settings`, `system_settings`, `backups` |
| Catalogue | `products`, `product_images`, `product_branch_inventory`, `categories`, `units_of_measure` |
| Pricing | `price_history` |
| Inventory | `inventory_transactions`, `inventory_transfers`, `stock_adjustments`, `stock_adjustment_items`, `stock_counts`, `stock_count_items` |
| Purchasing | `purchase_orders`, `purchase_order_items`, `suppliers`, `supplier_payments` |
| Sales | `sales`, `sale_items`, `payments`, `receipts`, `customers`, `customer_payments` |
| Finance | `expenses`, `expense_categories` |
| Messaging | `notifications`, `notification_recipients`, `message_queue` |
| Observability | `audit_logs`, `activity_logs`, `sync_logs` |

### 5.3 Notable model decisions

- **Batch ledger:** product batches and expiry dates are tracked across
  receiving, sales and transfers (migrations `001`, `002`, `005`). A NULL expiry
  is stored as NULL (no sentinel date). Batch numbers are generated as
  `PO-<po_number>` on purchase receive (`utils/batchNumber.js`).
- **Price history provenance:** `price_history` carries `price_type`, `source`,
  `reference_type` and `reference_id`. A purchase receive records
  `source='PURCHASE'`, `price_type='COST'` (migration `007`).
- **Weighted-average cost:** `addStock` updates cost using a weighted average.
- **Transfers** are a state machine; shipping and receiving are atomic, and
  expiry-tracked products are non-transferable (migration `006`).
- **Purchase order totals** were backfilled in migration `004`.

---

## 6. REST API reference

Base URL: `http://<host>:8040/api/v1`. Interactive docs: `/api/v1/docs`.
Authentication: `Authorization: Bearer <access-token>` unless noted.

| Prefix | Purpose |
| ------ | ------- |
| `/auth` | Login, refresh, logout, password reset/branch selection. |
| `/users` | User administration. |
| `/roles`, `/permissions` | Role/permission administration. |
| `/user-branches` | Branch memberships per user. |
| `/sessions` | List/revoke the caller's sessions. |
| `/branches` | Branch records. |
| `/business`, `/business-settings` | Business profile/settings (public subset for branding/currency). |
| `/system`, `/system-settings` | System settings. |
| `/products`, `/product-images`, `/product-branch-inventory` | Catalogue & per-branch stock. |
| `/categories`, `/units-of-measure` (alias `/uoms`) | Catalogue metadata. |
| `/price-history` | Price/cost change history. |
| `/inventories` | Inventory levels & adjustments. |
| `/inventory-transfers` | Inter-branch transfers. |
| `/inventory/transactions` | Stock movement ledger. |
| `/batches` | Product batches & expiry. |
| `/purchases` | Purchase orders & receiving. |
| `/suppliers`, `/supplier-payments` | Suppliers & payments. |
| `/sales` | Sales, receipts, void/refund. |
| `/customers`, `/customer-payments` | Customers & payments. |
| `/expenses`, `/expense-categories` | Expenses. |
| `/reports` | Analytics (guarded by `VIEW_REPORTS`). |
| `/notifications` | In-app notifications. |
| `/sync` | Offline sync (push/pull). |
| `/audit` | Audit logs (guarded by `VIEW_AUDIT_LOGS`). |
| `/admin/queue`, `/admin/sms` | Message-queue admin, SMS tools. |
| `/health` | Liveness probe (no auth). |

### 6.1 Response conventions

- Successful responses return the resource/collection as JSON.
- List endpoints support pagination (`page`, `limit`) and return a `total`.
- Errors return `{ "message": "..." }` (plus optional `details`) with an
  appropriate status. Validation failures return `400`; auth failures `401`;
  authorization failures `403`; missing resources `404`.

### 6.2 Representative request flow

```
POST /api/v1/sales
  ├─ route: auth + hasPermission('CREATE_SALE') + validations/sales.validation.js
  ├─ controller: sales.controller.create
  ├─ service: sales.service.createSale
  │     ├─ inventory.service (decrement stock, weighted-average cost)
  │     ├─ batch ledger / price_history side effects
  │     ├─ audit.repository.writeLog(...)
  │     └─ receipts
  └─ repository: sales.repository.* (parameterised SQL, transactional)
```

---

## 7. Background processing

The queue worker (`backend/src/worker/queue.worker.js`) polls the
`message_queue` table every `QUEUE_WORKER_INTERVAL_MS` (30s), sending e-mail and
SMS jobs with up to `QUEUE_MAX_RETRIES` (5) attempts. It also runs periodic
low-stock scans that create notifications.

- **Local dev:** the API forks the worker in-process unless
  `RUN_QUEUE_WORKER=false`.
- **Docker:** a dedicated `queue-worker` container runs it; the API sets
  `RUN_QUEUE_WORKER=false` to avoid two workers.
- **Administration:** the **Message Queue** page lists jobs (status, attempts,
  last error) and lets an admin **Resend** a PROCESSING/FAILED job.
- **SMS** uses the Agoo SMS provider (`AGOOSMS_*`); when unconfigured, jobs
  remain queued.

---

## 8. Offline & synchronization

The desktop client is offline-first:

- Data is cached in the browser's **IndexedDB** (`idb`).
- POS sales are accepted while offline and stored locally with a pending flag.
- When connectivity returns, `/api/v1/sync` endpoints push queued changes and
  pull updates; results are recorded in `sync_logs`.
- The UI surfaces connectivity via an online/offline pill (visible to roles with
  `VIEW_SYNC_PAGE`) and a **Sync Logs** page (permission
  `VIEW_AUDIT_LOGS_PAGE`).

The web client shares the offline context but is primarily used online.

---

## 9. Desktop integration

The Electron shell (`desktop-client/electron/main.mjs`) adds capabilities the
browser cannot provide:

- **Barcode scanning** (FR-030): two mutually exclusive paths emitting the same
  `scanner:barcode` IPC message —
  1. a keyboard "burst" scanner captured app-wide via `before-input-event`
     (gated by the renderer so normal typing is unaffected), and
  2. a raw **HID** scanner via `node-hid` for non-keyboard readers.
  Enabling a HID device disables the burst scanner to avoid double reads.
- **Native printing** (FR-031): silent printing through Chromium's
  `webContents.print`, with a configurable printer (`printer-config.json` in the
  app's user-data directory). Falls back to the system dialog if unavailable.
- **Security posture:** `contextIsolation: true`, `nodeIntegration: false`,
  `sandbox: true`, a preload bridge (`preload.cjs`), and external links opened in
  the system browser.

The renderer loads `http://localhost:5173` in dev and `dist/index.html` in a
packaged build.

---

## 10. Reporting

`/api/v1/reports/*` is guarded by `VIEW_REPORTS`. Reports are cached in Redis
(`REPORT_CACHE_TTL`, default 300s; some endpoints use a shorter TTL).

The dashboard sales-trend endpoint:

```
GET /api/v1/reports/sales-trend?startDate&endDate&granularity=day|week|month&branchId
```

returns `points[]` (zero-filled `YYYY-MM-DD` buckets), a `previous` comparison
and `totals`. Granularity is auto-selected when omitted, the result is cached
for ~60s, and **VOID sales are excluded**.

Other report endpoints include daily/monthly/annual sales, profit, inventory
valuation, low stock, best-selling and branch performance.

---

## 11. Frontend clients

The web and desktop clients share the React architecture:

- **Contexts:** `AuthContext` (`hasPermission` with an Administrator/Owner
  bypass), `OfflineContext`, `BusinessSettingsContext`, `ToastContext`.
- **Routing:** `App.tsx` wraps authenticated pages in `ProtectedRoute` and
  per-page `PermissionRoute` guards; branch selection is enforced separately.
- **Navigation:** `Layout.tsx` filters `navItems` by permission, so a missing
  menu means a missing permission.
- **Currency:** `useCurrency()` / `formatCurrency` render amounts as a code
  prefix (e.g. `GHS 12.00`), sourced from `GET /business/public` with a
  `DEFAULT_CURRENCY='GHS'` fallback.
- **Exports:** CSV/Excel/PDF via `xlsx`, `jspdf` and `jspdf-autotable`.

---

## 12. Configuration

| File | Scope |
| ---- | ----- |
| `.env` (root) | Docker Compose only (secrets, ports). |
| `backend/.env` | Local backend development. |
| `VITE_API_BASE_URL` (web & desktop) | Optional; both clients default to the relative path `/api/v1`. In dev the Vite server proxies `/api` and `/uploads` to `http://localhost:8040`. |

`backend/src/config/db.js` resolves the pool from either discrete `DB_*` /
`PG*` values **or** a `DATABASE_URL` (discrete values win). `TRUST_PROXY`
controls proxy awareness. `backend/src/config/swagger.js` defines the OpenAPI
document (title, server URL, security schemes, tags).

---

## 13. Build & tooling

| Area | Tooling |
| ---- | ------- |
| Backend runtime | Node.js 22, Express 5, `pg`, `redis` |
| Web/Desktop build | Vite 8, TypeScript (`tsc -b`), Oxlint |
| Desktop packaging | `electron-builder` (`dist`, `dist:win`) |
| Containers | Dockerfiles for `backend` (multi-stage, `npm ci --omit=dev`) and `web-client` (nginx) |

Build commands are listed in [`RUNNING.md`](./RUNNING.md#3-building-for-production).

---

## 14. Security

- **Secrets** live only in git-ignored `.env` files; nothing is baked into
  images.
- **Transport:** JWT access tokens + HTTP-only refresh cookies; `COOKIE_SECURE`
  for HTTPS.
- **Session integrity:** revoked sessions and deactivated users fail closed;
  refresh-token reuse is detected and audited.
- **Authorization:** route-level data permissions (AND semantics) plus
  client-side page guards; resource ownership is enforced in services (e.g.
  session revocation is own-only).
- **Input handling:** `express-validator` on mutations; parameterised SQL in
  repositories (no string-concatenated queries).
- **Hardening:** `helmet`, CORS, general + login rate limiting, `hpp`/body-size
  handling.
- **Error hygiene:** technical/driver errors are logged, never returned.
- **Uploads:** product images/business logos served from the shared `uploads`
  volume with an explicit cross-origin resource policy.

---

## 15. Testing & verification

- There is currently **no committed automated test suite** (no `*.test.js`
  files; Jest is listed as a dependency but unused for tests).
- Verification is by **type-check + build + lint** for each client
  (`npm run build`, `npm run lint`) and by **end-to-end API checks** against a
  running backend (health, login, permission-scoped requests).
- When adding features, mirror them in **both** clients and add a migration for
  any schema change.

---

## 16. Known limitations

- No future-date validation on product `expiry_date`.
- `refundSale` restores the full quantity on a partial refund.
- Non-fatal GeoIP preload warning at boot when the database cannot be fetched
  (lookups degrade to `null`).
- Page hiding for `VIEW_REPORTS`/`VIEW_AUDIT_LOGS` screens is client-side only;
  the corresponding data endpoints remain reachable by roles that hold those
  data permissions. (Categories/Suppliers are server-enforced.)
- The desktop client is not containerised; it must reach the API over the
  network.
