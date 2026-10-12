# Installation & Setup

Installation guide for the **Multi-Platform Inventory Management System** — an
Express REST API (`/api/v1`) with a React web client and an Electron desktop
client, backed by PostgreSQL, Redis and a background queue worker.

There are two supported ways to get the system onto a machine:

| Path | Best for | Time | Requires |
| ---- | -------- | ---- | -------- |
| **A. Docker Compose** (recommended) | Evaluation, staging, production | ~10 min | Docker Desktop / Engine + Compose v2 |
| **B. Local development** | Writing code, debugging | ~20 min | Node.js, PostgreSQL, Redis |

> For a condensed Docker quick-start, see also [`DOCKER.md`](./DOCKER.md).

---

## 1. Overview

| Component | Technology | Role |
| --------- | ---------- | ---- |
| API (`backend/`) | Node.js 22 + Express 5 | REST endpoints under `/api/v1` |
| Queue worker (`backend/src/worker/`) | Node.js | Email/SMS sending, low-stock scans |
| Database | PostgreSQL 18 | Persistent store (43 tables) |
| Cache / rate limit | Redis 7 | Report cache, permission cache, rate limiting |
| Web client (`web-client/`) | React 19 + Vite 8 + TypeScript | Browser SPA served by nginx |
| Desktop client (`desktop-client/`) | Electron + the same React app | Native printing + barcode scanner |

The API serves **both** clients. The desktop client is **not** containerised — it
runs locally and talks to the API (default `http://localhost:8040`).

---

## 2. Prerequisites

### Docker path
- Docker Desktop (Windows/macOS) **or** Docker Engine + Compose v2 (Linux).
- Git.
- Node.js is only needed to generate secrets (optional if you invent your own).

### Local development path
- **Node.js 20+** (22 LTS recommended) and npm.
- **PostgreSQL 16+** (18 recommended) running locally.
- **Redis 7** running locally (or `npm run start:redis` to spin one up in Docker).
- Git.

### Optional hardware
- USB barcode scanner. Any "keyboard wedge" scanner works in the browser and
  desktop app; HID-mode scanners are supported by the desktop app only.
- Receipt/label printer (silent printing is a desktop-client feature).

---

## 3. Option A — Docker Compose (recommended)

Docker Compose builds and runs Postgres, Redis, the API, the queue worker, and
nginx serving the web client.

### 3.1 Get the code

```sh
git clone <repository-url>
cd Multi-Platform-Inventory-Management-System-with-RESTful-API-Backend
```

### 3.2 Create the root environment file

Compose reads secrets from a single git-ignored file at the repository root:

```sh
cp .env.docker.example .env
```

### 3.3 Generate strong secrets

```sh
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run it **twice** — one value for `ACCESS_TOKEN_SECRET`, one for
`REFRESH_TOKEN_SECRET`. Never reuse the example/local values.

### 3.4 Edit `.env`

Minimum values to change (everything marked `change_me`):

| Variable | Meaning |
| -------- | ------- |
| `POSTGRES_PASSWORD` | Database password (also passed to the API and worker). |
| `SEED_ADMIN_PASSWORD` | Password of the first administrator. **Leave blank to skip admin creation.** |
| `ACCESS_TOKEN_SECRET` | Random 64-byte hex string. |
| `REFRESH_TOKEN_SECRET` | A *different* random 64-byte hex string. |

Useful optional values: `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL`,
`SEED_BRANCH_NAME`, `WEB_PORT`, `API_PORT`, `COOKIE_SECURE`, `AGOOSMS_*`.

> `POSTGRES_USER` must stay `postgres` — the schema dump assigns objects to that
> role. Each secret is interpolated from this file only; nothing is baked into
> the images.

### 3.5 Build and start

```sh
docker compose up -d --build
```

First run performs database initialisation (see §6). Subsequent runs reuse the
`pgdata` volume and skip it.

### 3.6 Verify

```sh
docker compose ps                                             # all services healthy/up
curl http://localhost:8040/api/v1/health                      # direct to the API
curl http://localhost/api/v1/health                           # through nginx (WEB_PORT)
docker compose exec postgres psql -U postgres -d multiplatforminventorysystem -c "\dt"
```

### 3.7 First login

1. Open the app at `http://localhost` (or `http://localhost:8080` if you set
   `WEB_PORT=8080`).
2. Sign in with `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`.
3. Select the seeded branch (`SEED_BRANCH_NAME`, default `Main Branch`).
4. **Change the administrator password immediately** (My Profile).

---

## 4. Option B — Local development

### 4.1 Start PostgreSQL and Redis

Use your existing services, or run Redis in Docker:

```sh
cd backend
npm run start:redis        # docker run --rm -p 6379:6379 redis:latest
```

Create an empty database, e.g. `multiplatforminventorysystem`.

### 4.2 Load the schema

The canonical schema is `database/inventory_management_database_schema.sql`. It
is a PostgreSQL 18 `pg_dump` and must be **treated as immutable**. When loading
it manually, strip the standalone-psql lines first (this is exactly what
`database/docker-init/01-schema.sh` does):

```sh
sed -e '/^\\restrict/d' -e '/^\\unrestrict/d' -e '/^\\connect/d' \
    -e '/^DROP DATABASE/d' -e '/^CREATE DATABASE/d' \
    -e '/^ALTER DATABASE/d' -e '/^CREATE SCHEMA public;/d' \
    database/inventory_management_database_schema.sql \
  | psql -U postgres -d multiplatforminventorysystem
```

### 4.3 Seed roles, branch, business settings and the admin user

`database/docker-init/02-seed.sh` is designed for the Postgres entrypoint but its
SQL is idempotent. The simplest local route is to let Docker perform the initial
init once (Option A), then point local development at that database. Otherwise,
run the script's SQL manually and provide the `SEED_ADMIN_*` values.

### 4.4 Permissions and migrations

```sh
psql -U postgres -d multiplatforminventorysystem -f database/seed-permissions.sql

DB_HOST=localhost DB_NAME=multiplatforminventorysystem DB_USER=postgres \
  DB_PASSWORD=<password> sh database/apply-migrations.sh
```

### 4.5 Backend environment

```sh
cd backend
cp .env.example .env
```

Edit `backend/.env`:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (preferred), **or**
  the libpq names `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`, **or** a
  full `DATABASE_URL`. `backend/src/config/db.js` accepts all three.
- `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` — strong random values.
- `REDIS_URL` (e.g. `redis://127.0.0.1:6379`).
- `PORT` — the API port (default `8040`; the example file shows `3000`).

### 4.6 Install dependencies

```sh
cd backend         && npm install
cd ../web-client    && npm install
cd ../desktop-client && npm install
```

### 4.7 Run

See [`RUNNING.md`](./RUNNING.md) for the full command reference. In short:

```sh
# terminal 1
cd backend && npm run dev          # API on :8040

# terminal 2 (optional — the API forks a worker unless RUN_QUEUE_WORKER=false)
cd backend && npm run queue:worker

# terminal 3
cd web-client && npm run dev       # Vite dev server

# or the desktop app
cd desktop-client && npm run dev   # Vite renderer + Electron
```

---

## 5. Environment variable reference

### Root `.env` (Docker Compose)

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `POSTGRES_USER` | `postgres` | Must remain `postgres`. |
| `POSTGRES_PASSWORD` | — (required) | Used by Postgres, API and worker. |
| `POSTGRES_DB` | `multiplatforminventorysystem` | Database name. |
| `SEED_ADMIN_USERNAME` | `admin` | First admin username. |
| `SEED_ADMIN_PASSWORD` | — | Blank ⇒ no admin is created. |
| `SEED_ADMIN_EMAIL` | `admin@example.com` | First admin e-mail. |
| `SEED_BRANCH_NAME` | `Main Branch` | Default branch. |
| `ACCESS_TOKEN_SECRET` | — (required) | JWT access-token signing key. |
| `REFRESH_TOKEN_SECRET` | — (required) | JWT refresh-token signing key. |
| `ACCESS_TOKEN_TTL` | `15m` | Access-token lifetime. |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Refresh-token lifetime (days). |
| `SESSION_INACTIVITY_TIMEOUT_MINUTES` | `30` | Idle expiry before re-auth. |
| `COOKIE_SECURE` | `false` | `true` only behind HTTPS. |
| `QUEUE_WORKER_INTERVAL_MS` | `30000` | Worker poll interval. |
| `QUEUE_MAX_RETRIES` | `5` | Max send attempts per job. |
| `AGOOSMS_API_URL` / `AGOOSMS_API_KEY` / `AGOOSMS_SENDER_ID` | — | SMS is disabled when blank. |
| `Email_HOST` / `Email_PORT` / `Email_USER` / `Email_PASSWORD` / `Email_SECURE` | — / `587` | SMTP for outgoing e-mail. **Blank `Email_HOST` ⇒ messages are logged only.** `587` = STARTTLS, `465` = implicit TLS. |
| `APP_URL` | — | Public base URL used to build password-reset links. |
| `WEB_PORT` | `80` | Host port for the web app. |
| `API_PORT` | `8040` | Host port for direct API access. |

### `backend/.env` (local development)

The backend additionally recognises:

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `NODE_ENV` | — | `development` for local work. |
| `PORT` | `8040` | API listen port. |
| `DB_HOST` / `PGHOST` | — | Database host. |
| `DB_PORT` / `PGPORT` | `5432` | Database port. |
| `DB_NAME` / `PGDATABASE` | — | Database name. |
| `DB_USER` / `PGUSER` | — | Database user. |
| `DB_PASSWORD` / `PGPASSWORD` | — | Database password. |
| `DATABASE_URL` | — | Used only if no discrete host/database is set. Percent-encode special characters in the password. |
| `REDIS_URL` | — | Redis connection string. |
| `REPORT_CACHE_TTL` | `300` | Report cache lifetime (seconds). |
| `TRUST_PROXY` | — | Set to `1` behind one reverse proxy (the Docker `web` service). |
| `RUN_QUEUE_WORKER` | *(unset)* | `false` stops the API forking an in-process worker (compose uses this). |
| `SWAGGER_BASE_URL` | — | Overrides the Swagger "servers" URL. |
| `Email_HOST` / `Email_PORT` / `Email_USER` / `Email_PASSWORD` / `Email_SECURE` | — / `587` | SMTP for outgoing e-mail (same names as the Docker environment). Blank `Email_HOST` ⇒ messages are logged only. |
| `APP_URL` | — | Public base URL used to build password-reset links. |

---

## 6. Database initialisation details

On a **fresh** Docker volume, files in `database/docker-init/` run in order:

1. **`01-schema.sh`** — loads `inventory_management_database_schema.sql`,
   filtering out the `CREATE/DROP DATABASE`, `\connect` and `\restrict` lines.
2. **`02-seed.sh`** — creates the system roles, a default branch, a minimal
   `business_settings` row, and the initial administrator (bcrypt via
   `pgcrypto`), then grants the admin access to the branch in `user_branches`.
3. **`03-seed-permissions.sql`** — the permission catalogue and default
   role → permission grants.
4. **`04-migrations.sh`** — applies every `database/migrations/*.sql`.

The schema dump is **DDL-only**, so step 2 is what makes a fresh database
login-able.

### Migrations

Migrations are additive and idempotent, with **no tracking table** — re-running
them is safe.

| File | Purpose |
| ---- | ------- |
| `001_product_batches_expiry.sql` | Product batches + expiry dates. |
| `002_sales_batch_disposal.sql` | Batch consumption/disposal on sales. |
| `003_units_of_measure_is_active.sql` | `is_active` flag on units of measure. |
| `004_purchase_order_total_backfill.sql` | Backfills purchase-order totals. |
| `005_universal_batch_ledger.sql` | Universal batch ledger. |
| `006_inventory_transfer_shipped_state.sql` | Transfer "shipped" state. |
| `007_price_history_provenance.sql` | Price-history provenance columns. |
| `008_cashier_page_access.sql` | Dedicated page-access permissions + Cashier restriction. |

Because init scripts run only on an empty volume, an **existing** database picks
up new migrations with `database/apply-migrations.sh`:

```sh
DB_HOST=localhost DB_NAME=multiplatforminventorysystem DB_USER=postgres \
  DB_PASSWORD=<password> sh database/apply-migrations.sh
```

> The only way to reset the database is to delete the `pgdata` volume
> (`docker compose down -v`). This is **destructive** — it deletes all data.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `error while creating mount source path ... /var/lib/postgresql` | Pre-18 volume path on Postgres 18 | Compose already mounts `/var/lib/postgresql`; use the provided file as-is. |
| Compose: `set POSTGRES_PASSWORD in .env` | Missing required value | Copy `.env.docker.example` → `.env` and fill it in. |
| Port 80 busy / permission denied | `WEB_PORT=80` in use or reserved | Set `WEB_PORT=8080` (or another free port) and reopen the app. |
| Cannot log in; no admin exists | `SEED_ADMIN_PASSWORD` was blank at init | Set it and re-initialise the volume (`docker compose down -v` then up), **or** create a user via SQL. |
| Admin login OK but "No branch assigned" | Missing `user_branches` row | The seed grants it; for custom users, add a branch membership under **Users → Branches**. |
| API restarts with Redis errors | Redis not ready | Compose waits for Redis health; locally ensure Redis is running. |
| Changes to code don't appear in Docker | Images are baked (no source bind-mount) | `docker compose up -d --build backend web`. |
| Reset-password e-mail never arrives | SMTP not configured, or a send hiccup | If `Email_HOST` is blank, messages are only logged (see [`RUNNING.md`](./RUNNING.md) → Local e-mail). Otherwise Admin → **Message Queue** → **Resend** the job. |

---

## 8. Related documents

- [`RUNNING.md`](./RUNNING.md) — running, rebuilding and operating the system.
- [`TECHNICAL_MANUAL.md`](./TECHNICAL_MANUAL.md) — architecture and API reference.
- [`USER_MANUAL.md`](./USER_MANUAL.md) — end-user guide.
- [`DOCKER.md`](./DOCKER.md) — Docker deployment specifics.
- API docs (live): `http://localhost:8040/api/v1/docs`.
