# Security Audit — Multi-Platform Inventory Management System

| | |
|---|---|
| **Date** | 2026-10-12 |
| **Scope** | `backend` (Express 5 + PostgreSQL + Redis), `web-client`, `desktop-client` (Electron), `docker-compose`, tracked files, git history, dependency audit |
| **Method** | Static analysis + source inspection. The running app was **not** started for this pass; a subset of findings was independently re-verified against source. Dependency figures are from `npm audit` on the committed lockfiles. |
| **Status** | Findings confirmed; **no files modified** (analysis only) |
| **Legend** | CRITICAL / HIGH / MEDIUM / LOW |
| **Verification** | `[V]` = independently re-verified against source in this audit; `[R]` = reported, recommended to validate on a running instance |

> ⚠️ Secret values are **redacted** in this document. To see a value, open the referenced file:line directly. Do not paste secrets into tickets/chat.

---

## 1. Executive summary

The application's authentication core is solid (bcrypt(10), refresh‑token rotation with reuse detection, per‑request session checks, parameterized queries almost everywhere, safe error responses). However, three areas need prompt attention:

1. **A CRITICAL authenticated SQL injection** in the offline‑sync push endpoint, where client‑supplied JSON keys are interpolated as SQL identifiers. Any logged‑in user can exploit it.
2. **A cluster of HIGH issues**: the sync *pull* endpoint leaks `password_hash` to any authenticated user, the login rate limiter is trivially bypassed, and uploads can be stored as attacker‑controlled `.html`/`.svg` and served same‑origin (stored XSS → session theft).
3. **Authorization gaps**: several mutation routes are `authenticate`‑only with no permission check, plus a notification IDOR.

Committed demo credentials/password‑reset token are also present in tracked files.

---

## 2. Committed secrets / leaks

### L1 — Plaintext password + bcrypt hash committed — **MEDIUM** `[V]`
- **Evidence:** `backend/checkpasswordMatch.js:3-4`, `backend/hashpassword.js:3` (both tracked). Literal password `<REDACTED>` and a real `$2b$` hash.
- **Impact:** The password is now permanently associated with this project. If it has ever been used for a real/staging account, that account is compromised.
- **Remediation:** Delete both helper scripts (or convert to argument/env‑driven with no literals). Rotate the password. Invalidate sessions and any password‑reset tokens minted with it.

### L2 — Credentials + live reset token in Postman collection — **MEDIUM** `[V]`
- **Evidence:** `backend/postman/Multi-Platform-Inventory-Management-System-with-RESTful-API-Backend.postman_collection.json` lines `362`, `492`, `5113` — plaintext password `<REDACTED>`, usernames (`john.smith`, `david.ghana`), and a password‑reset token `<REDACTED>` (line 492).
- **Impact:** Leaks usable accounts + a (possibly expired) reset token.
- **Remediation:** Scrub the collection to use collection variables / placeholders. Rotate the password and invalidate reset tokens.

### L3 — `.env` hygiene is otherwise good — **INFO** `[R]`
- Root `.env` and `backend/.env` exist locally but are **gitignored**, and `git rev-list --all` shows only `.env.example` was ever committed. `database/docker-init/02-seed.sh` reads the admin password from the environment. **No action needed.**

---

## 3. Vulnerabilities

### C1 — Authenticated SQL injection via offline‑sync push — **CRITICAL** `[V]`
- **Where:** `backend/src/repositories/sync.repository.js` `pushChanges()` lines **241–269**; reachable via `POST /api/v1/sync/:entity/push` and `POST /api/v1/sync/push`.
- **Why:** The table name is allow‑listed (`ENTITY_TABLE_MAP`), but **column names are taken from the client JSON** and interpolated as quoted identifiers: `"${c}"`, `EXCLUDED."${k}"`, `ON CONFLICT ("${idKey}")`. `pushEntityValidation` (`backend/src/validations/sync.validation.js:30-32`) only checks that `items` is an array — there is **no column/schema validation**. The route is `authenticate`‑only (`backend/src/routes/sync.routes.js:11`) — no permission check.
- **Attack scenario:** Any authenticated user (e.g. Cashier) sends an item whose key breaks out of the quoted identifier:
  `"a\" = (WITH d AS (DELETE FROM users RETURNING user_id) SELECT count(*) FROM d)"`.
  This is executable in a single‑statement PostgreSQL query; values can also be exfiltrated into readable columns via subqueries in the `DO UPDATE SET` clause.
- **Remediation:** Map a **fixed allow‑list of columns per entity** (and per branch), derive `idKey` server‑side, and reject/ignore any unknown key. Never build identifiers from client input. Optionally add `assertIdent()` (`^[a-z_][a-z0-9_]*$` **and** allow‑list membership). Add a permission gate to the sync routes.

### H1 — Sensitive data exposure via sync pull (`password_hash`) — **HIGH** `[V]`
- **Where:** `backend/src/routes/sync.routes.js:10` (`GET /:entity/pull`, authenticate‑only) → `backend/src/repositories/sync.repository.js:195` (`SELECT * FROM "${table}"`).
- **Why:** `users` and `roles` are pullable entities (`ENTITY_TABLE_MAP` lines 19–20) with **no branch scoping** (`BRANCH_SCOPE_MAP` has no entry) and `SELECT *` includes `password_hash`. No permission guard.
- **Attack scenario:** A Cashier calls `GET /api/v1/sync/users/pull` and downloads every user's bcrypt hash (plus emails/phones) for offline cracking; can also pull all sales/purchases org‑wide (no branch filter when `branchId` is omitted).
- **Remediation:** Restrict sync routes to the required permissions; branch‑scope every pull; select an **explicit column list** that excludes credential fields. For `users`/`roles`, either drop from the pullable map or gate behind `MANAGE_USERS`.

### H2 — Login brute‑force / rate‑limit bypass — **HIGH** `[V]`
- **Where:** `backend/src/middleware/rateLimiter.middleware.js` — `loginKeyGenerator()` lines **71–77** and `identityKeyGenerator()` lines **52–69**; limiters at **186** (`loginLimiter`, 5/15 min) and **174–184** (`generalLimiter`, 500/15 min).
- **Why:**
  - `loginLimiter` keys on client‑supplied `X-Device-Id` + username (line 74) → rotate the header every request → effectively unlimited login attempts.
  - `generalLimiter` keys on `jwt.decode()` of the Bearer token **without verifying the signature** (line 56) plus `X-Device-Id` → a forged token with rotating `sub`/`sid` resets the budget.
- **Attack scenario:** Credential stuffing / password brute force against `/auth/login` with no effective throttle.
- **Remediation:** Key the login limiter on **IP (+ failed username)**, never on an attacker‑controlled header. Key the general limiter on the **verified identity after auth** (or IP only, since it runs pre‑auth). Drop reliance on unverified `jwt.decode`.

### H3 — Unsafe upload handling → stored XSS — **HIGH** `[V]`
- **Where:** `backend/src/middleware/upload.middleware.js` (lines **33–50** MIME‑only filter; **26** extension from `file.originalname`) and `productImageUpload.middleware.js`; files served from `backend/src/app.js:99-102` (`express.static('uploads')`), proxied by `web-client/nginx.conf` (`/uploads/`).
- **Why:** The filter trusts the client‑supplied MIME type only; the stored extension comes from `file.originalname`. No magic‑byte verification.
- **Attack scenario:** Upload a file named `x.html` with `Content-Type: image/png` → saved as `<random>.html` under `/uploads`, served as `text/html` from the app origin → stored XSS. Combined with the web client keeping refresh tokens in `localStorage` (`web-client/src/services/api.ts:61-67`), an XSS steals the full session.
- **Remediation:** Validate the **file content signature** (e.g. `file-type`); whitelist extensions independent of MIME; reject SVG/HTML; serve uploads with `X-Content-Type-Options: nosniff` + `Content-Disposition: attachment` for non‑images; ideally store outside the web root.

### M1 — IDOR / notification data exposure — **MEDIUM** `[V]`
- **Where:** `backend/src/routes/notification.routes.js:11-17` (authenticate‑only) → `notification.repository.js`.
- **Why:** `GET /notifications` passes `req.query` straight through with no default filter → with no `userId` it returns every user's notifications; a caller can pass `?userId=<victim>`. `getNotificationById`, `updateNotification`, `deleteNotification` have no ownership check.
- **Remediation:** Always scope listing/mutation by `req.user.sub` (the existing `markAsRead` pattern is a good model).

### M2 — Authenticated‑only mutation routes (missing authorization) — **MEDIUM** `[V]`
These routers apply `authenticate` but **no `checkPermission`/`authorize`** on mutating routes:

| Router | Routes | Impact |
|---|---|---|
| `inventoryTransaction.routes.js` | POST `/`, GET `/`, GET `:id` | any authenticated user can **create inventory transactions** |
| `customerPayment.routes.js` | POST `/`, GET `/` | records/reads customer payments |
| `supplierPayment.routes.js` | POST `/`, PUT/GET/DELETE `:id`, GET `supplier/:id` | mutates supplier payments (only line 11 is gated with `VIEW_SUPPLIERS`) |
| `priceHistory.routes.js` | GET `/`, POST `/` | writes price history |
| `productBranchInventory.routes.js:18` | `router.use(authenticate)` → all CRUD | writes to the aggregate inventory table, which is otherwise server‑authoritative |
| `business.routes.js` | GET `/`, GET `:key` | reads all settings (mutations are gated) |
| `sync.routes.js` | all | see C1/H1 |

- **Remediation:** Add the appropriate `checkPermission('...')` to each mutating route (reuse `MANAGE_INVENTORY`, `MANAGE_*`, `VIEW_*`).

### M3 — Known‑vulnerable dependencies — **MEDIUM** `[R]`
- **Evidence:** `npm audit` against committed lockfiles.
  - **backend:** 15 vulns — 1 critical (`proxy-addr` via `express`), 9 high (direct: `compression`, `multer`, `nodemailer`; plus `brace-expansion`, `js-yaml`, `browserslist`, …). All have fixes.
  - **web-client:** 8 vulns, 7 high. Production: `xlsx@0.18.5` (SheetJS prototype pollution CVE‑2023‑30533 + ReDoS CVE‑2024‑22363 — **this package parses user‑uploaded import spreadsheets**), `axios`, `react-router-dom`.
  - **desktop-client:** 24 vulns (2 critical). Same `xlsx`/`axios`; `electron`/`electron-builder` are dev‑only (not shipped).
- **Remediation:** `npm audit fix` / bump: `xlsx` → SheetJS **0.20.3** (the npm‑registry build is unpatched; use the SheetJS CDN build), `multer`, `nodemailer`, `compression`, `axios`, `react-router-dom`, and rebase `express` so `proxy-addr` resolves. Re‑run `npm audit` after.

### L4 — Low / general hardening `[V]` unless noted
- **Open CORS** — `app.js:92` `app.use(cors())` allows `*`. Safe‑ish today (credentialed cookie flows are SameSite=Lax) but pin an origin allow‑list for production. `[V]`
- **Password‑reset tokens stored in plaintext** — `auth.repository.js:217` (`password_reset_tokens.token`). Hash at rest; reconsider SMS as the reset channel. `[R]`
- **Dead / broken code** — `audit.middleware.js` requires a non‑existent `../utils/auditLog` (would crash on require; currently unused); empty stubs `token.utils.js`, `bcrypt.utils.js`, `password.utils.js`, `auditLog.utils.js`. Unused deps: `xss-clean` (unmaintained), `hpp`. `jwt.utils.js` uses `JWT_SECRET`/`JWT_REFRESH_SECRET` while the live flow uses `ACCESS_TOKEN_SECRET`/`REFRESH_TOKEN_SECRET` — a footgun. `[R]`
- **Public Swagger** — `/api/v1/docs` and `/api/v1/health` are public; consider gating docs in production. `[R]`

---

## 4. Auth‑coverage matrix (routes) `[V]`

**Protected correctly via `router.use`:**
| Router | Gate |
|---|---|
| `audit.routes.js:33` | `authenticate, checkPermission('VIEW_AUDIT_LOGS')` |
| `role.routes.js:33` | `authenticate, checkPermission('MANAGE_USERS')` |
| `permission.routes.js:24` | `authenticate, checkPermission('MANAGE_USERS')` |
| `userBranch.routes.js:11` | `authenticate, authorize('Administrator','Business Owner')` |
| `sessions.routes.js:9` | `authenticate` |
| `productImage.routes.js:10-11` | `authenticate + CREATE_PRODUCT` |

**No truly‑unauthenticated routes** except the intentional `GET /business/public` (plus `/health`, `/docs`).

**Authenticated but not authorized:** see M2.

---

## 5. Verified solid

- Refresh‑token rotation with reuse detection that revokes the whole session (`auth.service.js:207-211, 226-227`).
- Per‑request session validity + account‑active check (`auth.middleware.js`).
- `bcrypt(10)` everywhere; generic login/forgot‑password responses (no user enumeration via message); account‑deactivation and self‑delete/self‑role‑change guards (`user.service.js`).
- Almost all repositories use parameterized queries; error responses go through `describeError()` so raw DB/stack details stay out of responses.
- Helmet; cookies `httpOnly` + `SameSite=Lax`; Docker secrets only from `.env` (required via `${VAR:?}`); non‑root container user.
- `.env` never in git history.

---

## 6. Remediation plan (priority order)

| # | Fix | Severity | Complexity | Tests / verification |
|---|---|---|---|---|
| 1 | Column allow‑list in `pushChanges()` **+** restrict sync routes by permission | CRITICAL | S | Malicious‑key push → rejected, no injection; normal sync regression |
| 2 | Scoped pull: explicit columns (exclude `password_hash`), permission‑gated `users`/`roles`, branch‑scope all | HIGH | M | `GET /sync/users/pull` as Cashier → 403/limited, no hash |
| 3 | Rate limiters → key on IP + verified identity (drop `X-Device-Id`, no unverified `jwt.decode`) | HIGH | M | Rotate `X-Device-Id`/forged token → still limited |
| 4 | Uploads: magic‑byte check, extension whitelist, `nosniff`/disposition | HIGH | S | `x.html` w/ `image/png` → rejected/safe |
| 5 | Notification ownership scoping (service/repo) | MEDIUM | S | Cross‑user read/update/delete → denied |
| 6 | Add `checkPermission` to the M2 mutating routers | MEDIUM | S | Role‑based route tests |
| 7 | Scrub committed credentials/token **+ rotate** `Bhim@1234`; invalidate sessions + reset tokens | MEDIUM | S | `git grep` clean; old creds rejected |
| 8 | Dependency bumps (`xlsx`→0.20.x, `multer`, `nodemailer`, `compression`, `axios`, `react-router-dom`, `express`/`proxy-addr`) | MEDIUM | M | Re‑run `npm audit`; builds + `tsc -b` |
| 9 | LOW: CORS allow‑list; hash reset tokens; delete dead files/deps; gate Swagger | LOW | S | Smoke tests |

Items 1–6 and 9 are code changes; 7 is rotation + repo cleanup (requires rotating the shared password); 8 requires re‑running `npm audit` after bumps.

---

## 7. Open decisions (needed before implementing 1–2)

1. **Sync semantics:** may the desktop client legitimately pull `users`/`roles`?
   - Yes → explicit safe columns + `MANAGE_USERS`.
   - No → remove from `ENTITY_TABLE_MAP` pull.
2. **Sync route permission:** which permission guards push/pull (new `SYNC_DATA`, or reuse `MANAGE_INVENTORY` / `VIEW_*` per entity)?
3. **Magic‑byte check:** add the `file-type` dependency, or hand‑roll a signature check (no new dep)?

---

## Appendix — Environment hygiene (verified)

- Root `.env` and `backend/.env` are gitignored and absent from git history.
- `.env.docker.example` is a clean template (blank SMTP values, no real secrets).
- Gmail SMTP app password that was exposed during development has been rotated and is not in the repo.
