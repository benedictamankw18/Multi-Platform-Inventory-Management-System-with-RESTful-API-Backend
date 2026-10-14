# MPIMS Mobile Client — Milestones

Mobile app: `mobile-client/` — Expo (React Native) + TypeScript, single codebase for Android + iOS,
reusing the existing REST backend at `/api/v1` (default port `8040`).

Navigation: **Expo Router**, routes in `src/app/`, non-route code outside it.
API base URL: `EXPO_PUBLIC_API_BASE_URL` (fallback `http://localhost:8040/api/v1`).

## Milestone overview

| # | Milestone | Status |
|---|-----------|--------|
| 0 | Project scaffold & tooling | ✅ Completed |
| A | Permission-gated shell (+ backend inventory authorization fix) | ✅ Completed |
| B | Stock in/out + barcode | ✅ Completed |
| C | POS / Sales + barcode | ✅ Completed |
| D | Sales list & sale detail | ✅ Completed |
| E | Catalog: products CRUD, categories, units of measure, price history | ✅ Completed |
| E.1 | Bottom-navigation redesign + UX polish (tabs, branch switch, login toggle) | ✅ Completed |
| F | Inventory depth: history, low stock, batches, transfers | ⏳ Planned |
| G | Procurement & parties: purchases, suppliers, customers, expenses | ⏳ Planned |
| H | Administration: branches, users, roles, notifications | ⏳ Planned |
| I | Reports: reports & expiry report | ⏳ Planned |

**Excluded** (web/desktop only): sync & offline, message queue, SMS balance, business settings,
system settings, sync logs, audit logs. The mobile client is **online-only**.

---

## Milestone 0 — Project scaffold & tooling ✅

**Goal:** create `mobile-client/` and wire Expo Router + TypeScript, without touching the
web/desktop builds.

**Delivered**
- Expo Router in `src/app/`; `main` = `expo-router/entry`; `scheme` = `mpims`; `experiments.typedRoutes` on.
- `tsconfig` path alias `@/* -> ./src/*`.
- Removed the old `App.tsx` / `index.ts` entry.
- Dependencies (via `npx expo install`): `expo-router`, `react-native-safe-area-context`,
  `react-native-screens`, `expo-linking`, `expo-constants`, `expo-crypto`.
- Base source:
  - `src/theme/theme.ts` — design tokens
  - `src/services/secureTokens.ts` — SecureStore wrapper (tokens, device id)
  - `src/services/api.ts` — axios instance, refresh queue, `X-Device-Id`, endpoint helpers
  - `src/contexts/AuthContext.tsx` — session, permissions, branch selection
- Routes: `(auth)/login`, `select-branch`, `(app)/_layout` (Tabs + guard),
  `(app)/index` (dashboard), `(app)/products`, `(app)/inventory`, `(app)/more`, `+not-found`.
- Env: `.env.example` (committed) + `.env.local` (git-ignored).
- Tooling: `eslint` + `eslint-config-expo`, `eslint.config.js`, `react-dom` pinned to fix an
  npm `ERESOLVE`, `expo` bumped via `expo install --fix`.
- Docs consolidated into `mobile-client/README.md`.
- Persistence notes: `authUser` / `selectedBranch` in SecureStore; `accessToken` + `refreshToken`
  under separate keys (iOS ~2048-byte limit).

**Checks:** `npx tsc --noEmit` (0), `npx expo lint` (0), `npx expo-doctor` (21/21),
`npx expo export --platform android|ios` (bundled).

---

## Milestone A — Permission-gated shell ✅

**Goal:** hide/guard UI by role permission, and close an authorization gap on the backend.

### Part 1 — Backend authorization fix
File: `backend/src/routes/inventoryTransaction.routes.js` (mounted at `/api/v1/inventory/transactions`).
- `POST /` → `checkPermission('MANAGE_INVENTORY')` (previously `authenticate` only).
- `GET /` and `GET /:transactionId` → `checkPermission('VIEW_INVENTORY')`.

Rationale verified against `database/seed-permissions.sql`: Business Owner / Administrator bypass;
Manager, Branch Manager, Storekeeper hold `MANAGE_INVENTORY`; Technical has `VIEW_INVENTORY` only;
Cashier has neither. Web/desktop already gate on the same codes.

### Part 2 — Mobile permission gating
New:
- `src/config/permissions.ts` — single source of truth for permission codes (page vs data).
- `src/components/PermissionGate.tsx` — route-level guard; unauthorized → `<Redirect href="/" />`.
- `src/components/LoadingScreen.tsx` — shared full-screen spinner.

Modified:
- `src/contexts/AuthContext.tsx` — added `permissionsLoaded` (set in `finally` on restore/login,
  reset on login/logout) to avoid tab flash and fail closed.
- `src/app/(app)/_layout.tsx` — order: `isLoading` → auth redirects → `permissionsLoaded` → Tabs;
  tabs hidden via `href: null` using **page** permissions.
- `src/app/(app)/products.tsx`, `inventory.tsx` — split into thin route + inner view wrapped in
  `PermissionGate` (also prevents the fetch effect from running for unauthorized users).
- `src/app/(app)/index.tsx` — dashboard cards are permission-aware, with an empty state.
- `README.md` — folder layout, page-vs-data note, documented discrepancies.

### Follow-up fix — root layout route warning
`src/app/_layout.tsx`: replaced explicit `<Stack.Screen>` children with a self-closing
`<Stack screenOptions={{ headerShown: false }} />`. A route group only becomes a navigator node
when its folder has a `_layout.tsx`; `(auth)` has none, so it is flattened to `(auth)/login` and
the explicit `name="(auth)"` matched nothing (the `WARN [Layout children]`).

### Follow-up fix — web bundling
`react-native-web` was missing, so Expo Router's web path failed to resolve
(`react-native-web/dist/index`, `react-native-web/dist/exports/NativeEventEmitter`).
Added it with `npx expo install react-native-web` (resolved to 0.21.4 for SDK 57);
`@expo/metro-runtime` was already present via `expo-router`.

**Checks:** `npx tsc --noEmit` (0), `npx expo lint` (0), `npx expo-doctor` (21/21),
`npx expo export --platform android` and `--platform web` (both bundled),
`node --check` on the backend route.

**Not automated:** backend 403/200 behavior (no backend test suite) — manual `curl.exe`/Postman;
on-device tab visibility + deep-link redirect.

---

## Milestone B — Stock in/out + barcode ✅

**Goal:** let permitted roles record stock movements from a phone.

**Delivered**
- `src/services/api.ts`: `Product.expiry_required?`; `InventoryTransaction` +
  `CreateInventoryTransactionInput` types; `createInventoryTransaction`
  (`POST /inventory/transactions`) and `getInventoryTransactions` (`GET /inventory/transactions`).
- `src/app/(app)/stock-movements.tsx`: new **Stock** tab (gated on `MANAGE_INVENTORY`, `href: null`
  otherwise) wrapped in `PermissionGate` — Stock In / Stock Out toggle, product search + Scan,
  selected-product card (available stock shown for Stock Out), quantity, unit cost (in),
  expiry + batch (in, required when `product.expiry_required`), notes, inline success/error.
- `src/components/BarcodeScanner.tsx`: `expo-camera` `CameraView` modal, `useCameraPermissions`,
  `onBarcodeScanned`, focused `barcodeScannerSettings`, unmounted when closed, first hit latched.
- `src/app/(app)/_layout.tsx` + `index.tsx`: Stock tab and dashboard card.
- `app.json`: `expo-camera` config plugin (`cameraPermission`, `barcodeScannerEnabled: true`,
  `recordAudioAndroid: false`).
- Scan/search reuse `POST /products/search { q }` (ILIKE on `product_name`, `sku`, `barcode`);
  availability reuses `POST /inventories/search`. No backend change (already guarded in A).
- The mobile client is online-only, so no offline outbox / `client_mutation_id` work is planned; the
  idempotency middleware is simply passed through.

**Verify:** `tsc`, `lint`, `expo-doctor`, bundle; API 403 + hidden tab / deep-link redirect for a
role without `MANAGE_INVENTORY`; on-device scan → submit. Camera needs a real device, and the
`expo-camera` plugin requires a dev build for a standalone app (Expo Go already bundles it).

---

## Milestone C — POS + barcode ✅

**Goal:** ring up a sale and take payment, matching the web/desktop POS.

**Delivered**
- New guarded route `src/app/(app)/pos.tsx`, gated on `CREATE_SALE` (the page permission web uses).
- Cart via product search + **Scan** (reuse `BarcodeScanner` + `POST /products/search`; an exact
  barcode match auto-adds).
- Pricing parity: `getEffectivePrice` (wholesale when `quantity ≥ wholesale_min_qty`, else retail);
  line `line_discount` from `discount_percentage`, `tax_amount` from `tax_rate`; `sale_type` =
  `WHOLESALE` when any line qualifies, else `RETAIL`.
- Split payments: `CASH, CARD, MOBILE_MONEY, BANK_TRANSFER, CREDIT` (`payments: [{ amount,
  payment_method }]`) with a one-tap "add remaining". Complete when `Σpayments ≥ total`.
- Optional customer: free-text `customer_name` (customer search arrives with Milestone G).
- `POST /sales` with `items`, `payments`, `branch_id`, `cashier_id/name`, `sale_type`,
  `discount_amount`, `tax_amount`, `device_id`, and a `local_transaction_id` (`expo-crypto`
  `randomUUID()`, reused across retries of the same cart). Totals are left to the server.
- On-screen receipt summary from the `201` response (`items` + `payments`). **No printing** and no
  `GET /sales/:id/receipt` (that needs `VIEW_SALES`; Business Settings is excluded).
- New `Product` wholesale fields; `Sale` / `CreateSaleInput` types + `createSale` in
  `src/services/api.ts`.
- Currency symbol read from `GET /business/public` (display only).

**Checks:** `npx tsc --noEmit` (0), `npx expo lint` (0), `npx expo-doctor` (21/21),
`npx expo export --platform android` (bundled, 1288 modules).

**Manual (pending):** end-to-end sale against a running backend; permission gating for a role without
`CREATE_SALE` (hidden tab + 403); retail vs wholesale totals; split-payment change.

---

## Milestone D — Sales list & sale detail ✅

**Goal:** browse past sales and open one, matching web/desktop `SalesPage`.

**Delivered**
- Nested stack `src/app/(app)/sales/`: `_layout.tsx` (headers), `index.tsx` (list), `[saleId].tsx`
  (detail); tab + dashboard card gated on `VIEW_SALES`.
- `GET /sales` with search (`q`), status filter chips, branch scope, page/25 pagination plus
  "Load more", and pull-to-refresh.
- Detail loaded via `GET /sales/:saleId` + `GET /sales/:saleId/receipt` (the only read exposing
  `payments`; web uses the same trick). Items, totals, payments, status, cashier/customer, remarks.
- Void + refund gated on `VOID_SALE` (`POST /sales/:saleId/void`, `POST /sales/:saleId/refund`
  with optional amount/reason) with inline feedback and reload.
- `voidSale: 'VOID_SALE'` added to `config/permissions.ts`; `getSales`, `getSaleById`,
  `getSaleReceipt`, `voidSale`, `refundSale` added to `api.ts`.
- New shared `hooks/useCurrency.ts` (display-only `/business/public`); POS refactored onto it.

**Checks:** `npx tsc --noEmit` (0), `npx expo lint` (0), `npx expo-doctor` (21/21),
`npx expo export --platform android` (bundled, 1292 modules).

**Manual (pending):** list/detail against seeded sales; search + status filters; pagination; a role
with `VIEW_SALES` but no `VOID_SALE` sees no Void/Refund buttons; first receipt fetch on detail.

---

## Milestone E — Catalog ✅

**Goal:** full product catalog — products CRUD, categories, units of measure, and price history.

**Delivered**
- Nested stack `src/app/(app)/products/`: `_layout.tsx` (headers), `index.tsx` (list), `new.tsx`,
  `[productId].tsx` (detail / edit / deactivate / reactivate), `categories.tsx`,
  `units-of-measure.tsx`, `price-history.tsx`. The tab sets `headerShown: false` so this stack owns
  the header (same arrangement as the Sales tab); static routes take precedence over `[productId]`.
- `src/components/ProductForm.tsx` — shared create/edit form: SKU, name, barcode, category, base UoM,
  cost/retail/wholesale price + wholesale min qty, tax rate, discount %, minimum stock, description,
  and `track_inventory` / `expiry_required` / `serial_number_required` switches. Category + UoM
  pickers load from the catalog endpoints; if those reads are forbidden the pickers render no options.
- Products list: debounced search (`q`), "Show inactive", page/25 pagination + "Load more",
  pull-to-refresh, inactive badge, retail price.
- Product detail: info + pricing cards, category/UoM names resolved best-effort, "View price history",
  Edit, and Deactivate/Reactivate (Alert confirmation).
- Categories: list + search, create/edit (name, description, parent category), activate/deactivate.
- Units of measure: list + search + "active only", create/edit (name, symbol, conversion factor,
  description), activate/deactivate, and a hard **delete**.
- Price history: read-only list with an optional product filter (debounced product search), page/50
  + "Load more"; rows keyed on `history_id`.
- `api.ts` additions: `searchProducts`, `getProductById`, `createProduct`, `updateProduct`,
  `deactivateProduct`, `reactivateProduct`, `getCategories`, `createCategory`, `updateCategory`,
  `activateCategory`, `deactivateCategory`, `getUnitsOfMeasure`, `createUnitOfMeasure`,
  `updateUnitOfMeasure`, `activateUnitOfMeasure`, `deactivateUnitOfMeasure`, `deleteUnitOfMeasure`,
  `getPriceHistory`; plus `Category`, `UnitOfMeasure`, `PriceHistoryEntry`, `ProductInput` types.

**Gates (page):** `VIEW_PRODUCTS_PAGE` (products list/detail + price history), `VIEW_CATEGORIES`
(categories + units of measure). **Writes:** `CREATE_PRODUCT` (product create/edit/deactivate) and
`MANAGE_CATEGORIES` (category + UoM writes) — matching the server-side route guards.

**Deferred:** product / category image upload (out of scope for mobile) and product CSV import.

**Checks:** `npx tsc --noEmit` (0), `npx expo lint` (0), `npx expo-doctor` (21/21),
`npx expo export --platform android` (bundled).

**Manual (pending):** create/edit/deactivate a product against the live API; category + UoM CRUD
(including the UoM hard delete); price-history filter; a role with `VIEW_PRODUCTS_PAGE` but without
`CREATE_PRODUCT` sees no create/edit controls.

---

## Milestone E.1 — Bottom navigation & UX polish ✅

**Goal:** replace the default tab bar with a purpose-built one and fold secondary screens behind More.

**Delivered**
- `src/components/TabBar.tsx` — custom bottom tab bar passed via `<Tabs tabBar={…} />`. Five items
  (Dashboard, Products, POS, Sales, More) drawn with the same **Feather** icon set as the web/desktop
  clients, rendered through `@expo/vector-icons`. The POS item is a larger, circular, raised centre
  button (`monitor`); the other four keep a consistent 22–24px icon with a label.
- Responsive: full-width bar on phones; at `width >= 600` it becomes a centred, floating bar
  (max width 640) with rounded corners and a shadow.
- Accessibility: per-item `accessibilityRole` / `accessibilityState.selected` /
  `accessibilityLabel` / `accessibilityHint` / `testID`, a keyboard + web focus ring, and hover
  tooltips (web only — hover never fires on touch); the bar itself is `role="tablist"`.
- Visibility is computed in `src/app/(app)/_layout.tsx` (permission-filtered) and handed to the bar,
  so the existing `href: null` + `PermissionGate` model is unchanged. Presses emit the standard
  `tabPress` event and delegate to `navigation.navigate`, so nested stacks and deep links are intact.
- `Tabs` is imported from **`expo-router/js-tabs`** (the vendored React Navigation bottom tabs); in
  SDK 57 the root `Tabs` export is deprecated. Verified in the installed source that
  `withLayoutContext` forwards the `tabBar` prop to the navigator.
- Inventory and stock movements no longer have tabs: both stay routable (`href: null`) and are reached
  from **More**, still wrapped in `PermissionGate`.
- Change branch: a button on the Dashboard and on More pushes `/select-branch?mode=switch`;
  `select-branch.tsx` gained a `mode=switch` path (with a Cancel action) that preserves the mandatory
  first-selection guard for users who have no branch yet.
- Login: password visibility toggle (Ionicons `eye-outline` / `eye-off-outline`). Added
  `@expo/vector-icons` + `expo-font` and the `expo-font` config plugin in `app.json`.

**Checks:** `npx tsc --noEmit` (0), `npx expo lint` (0). `npx expo-doctor` (21/21) was clean when the
icon toggle was added; a fresh `expo-doctor` + `expo export` after the tab-bar change is still pending.

**Manual (pending):** five tabs render; raised POS button; Inventory/Stock reachable from More;
branch switching from Dashboard and More; responsive bar at ≥600px; web hover tooltip + focus ring.

---

## Milestone F — Inventory depth ⏳

Inventory history, Low stock, Batches, Transfers. Gate: `VIEW_INVENTORY`.
**Blocked detail:** the low-stock permission mismatch (see Known issues) must be reconciled first.

---

## Milestone G — Procurement & parties ⏳

Purchases (`VIEW_PURCHASES`), Suppliers (`VIEW_SUPPLIERS`), Customers (`VIEW_CUSTOMERS_PAGE`),
Expenses (`VIEW_EXPENSES`). Adds customer search for POS.

---

## Milestone H — Administration ⏳

Branches (`MANAGE_BRANCHES`), Users/Roles (`MANAGE_USERS`), Notifications + create
(`MANAGE_NOTIFICATIONS`). Depth (full CRUD vs review/notify-only) to be confirmed.

---

## Milestone I — Reports ⏳

Reports + expiry report. Gate: `VIEW_REPORTS_PAGE`.

---

## Known issues / follow-ups

- **Low-stock permission mismatch:** the web UI gates the low-stock page on `VIEW_INVENTORY`, but
  the backend `/reports/low-stock` requires `VIEW_REPORTS`. Reconcile before building a mobile
  low-stock screen.
- **No backend automated tests:** verification is manual (`curl.exe` / `backend/postman`).
- **`backend/.env.example`** sets `PORT=3000` while the runtime default is `8040`
  (`INSTALLATION.md`/`RUNNING.md` document 8040).
- **Unused dependencies:** `expo-sqlite`, `expo-print`, `expo-sharing` are declared but currently
  unused (offline is excluded and printing is deferred) and can be removed.
- **Currency / branding source:** read display-only from the unauthenticated `GET /business/public`;
  the Business Settings *management* page remains web/desktop-only.
- **Android emulator networking:** use `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8040/api/v1`
  (not `localhost`).
- `mobile-client/` is currently an **untracked** git directory; nothing committed.

## Permission codes (reference)

Page: `VIEW_PRODUCTS_PAGE`, `VIEW_CATEGORIES`, `VIEW_CUSTOMERS_PAGE`, `VIEW_PURCHASES`,
`VIEW_SUPPLIERS`, `VIEW_EXPENSES`, `VIEW_REPORTS_PAGE`, `VIEW_SYNC_PAGE`, `VIEW_AUDIT_LOGS_PAGE`.
Data: `VIEW_PRODUCTS`, `VIEW_INVENTORY`, `MANAGE_INVENTORY`, `VIEW_SALES`, `CREATE_SALE`,
`VOID_SALE`, `MANAGE_BRANCHES`, `MANAGE_USERS`, `MANAGE_NOTIFICATIONS`, `VIEW_REPORTS`,
`MANAGE_SETTINGS`. `Administrator` / `Business Owner` bypass all checks.

Mobile uses: `VIEW_PRODUCTS_PAGE`, `VIEW_CATEGORIES`, `VIEW_INVENTORY`, `MANAGE_INVENTORY`,
`VIEW_SALES`, `CREATE_SALE`, `VIEW_PURCHASES`, `VIEW_SUPPLIERS`, `VIEW_CUSTOMERS_PAGE`,
`VIEW_EXPENSES`, `MANAGE_BRANCHES`, `MANAGE_USERS`, `MANAGE_NOTIFICATIONS`, `VIEW_REPORTS_PAGE`.
Excluded: `MANAGE_SETTINGS`, `VIEW_SYNC_PAGE`, `VIEW_AUDIT_LOGS_PAGE`.
