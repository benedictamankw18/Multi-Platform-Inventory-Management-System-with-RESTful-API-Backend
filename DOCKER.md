# Docker Deployment

The full stack runs with Docker Compose:

| Service        | Image / build        | Purpose                                            | Host port        |
| -------------- | -------------------- | -------------------------------------------------- | ---------------- |
| `postgres`     | `postgres:18-alpine` | Database (schema + permissions seeded on first run)| internal         |
| `redis`        | `redis:7-alpine`     | Cache + rate-limit store (required)                | internal         |
| `backend`      | `./backend`          | Express REST API (`/api/v1`)                       | `${API_PORT}` (8040) |
| `queue-worker` | `./backend`          | Background jobs (email/SMS queue, low-stock scans) | internal         |
| `web`          | `./web-client`       | nginx serving the React SPA + proxying the API     | `${WEB_PORT}` (80)   |

Open the app at `http://localhost:${WEB_PORT}` (default `http://localhost`).

## Prerequisites

- Docker Desktop (or Docker Engine + Compose v2).
- Node.js is only needed to generate secrets locally.

## First-time setup

```sh
cp .env.docker.example .env
```

Edit `.env` and set strong values. Generate the JWT secrets with:

```sh
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Key settings:

- `POSTGRES_PASSWORD` — database password (also used by the API/worker).
- `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` — must be long, random, and **not** reused from `backend/.env`.
- `COOKIE_SECURE` — set to `true` only when serving over HTTPS.

> `POSTGRES_USER` must remain `postgres`: the database dump assigns objects to that role.

Set `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_EMAIL` — these
create the first administrator on initial database init. Change the password
after your first login.

## Run

```sh
docker compose up -d --build      # build images and start everything
docker compose ps                 # check health status
docker compose logs -f backend    # follow API logs
docker compose logs -f queue-worker
docker compose down               # stop and remove containers (data volumes kept)
```

The database is initialised automatically the first time the `pgdata` volume is
created, in order:

1. `database/docker-init/01-schema.sh` loads the schema. The dump is a full
   `pg_dump` and is filtered to drop the `CREATE/DROP DATABASE`, `\connect`, and
   `\restrict`/`\unrestrict` lines that assume a standalone psql session.
2. `database/docker-init/02-seed.sh` creates the system roles, a default branch,
   a `business_settings` row, and the initial administrator (bcrypt hash via
   pgcrypto) from the `SEED_ADMIN_*` variables, and grants the administrator
   access to the default branch in `user_branches` (the branch-selection screen
   is driven by `user_branches`, not `users.branch_id`).
3. `database/seed-permissions.sql` populates permissions and the default
   role→permission assignments.

The dump itself contains no data, so step 2 is what makes a fresh database
login-able. Log in with the `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` values,
then change the password immediately.

## Verify

```sh
curl http://localhost/api/v1/health                 # via nginx
curl http://localhost:8040/api/v1/health            # direct to the API
docker compose exec postgres psql -U postgres -d multiplatforminventorysystem -c "\dt"
```

## Common operations

```sh
docker compose restart redis           # API keeps working (bounded reconnect + backoff)
docker compose up -d --build backend   # rebuild the API after code changes
docker compose down -v                 # DESTRUCTIVE: also deletes DB/uploads/geoip volumes
```

Resetting the database is **only** possible by deleting the `pgdata` volume
(`docker compose down -v`), because init scripts run only on an empty volume.

## Volumes

- `pgdata` — PostgreSQL data.
- `redisdata` — Redis append-only persistence.
- `uploads` — uploaded product images / business logos (shared by nginx proxy and API).
- `geoipdata` — GeoLite2 database cache (downloaded at runtime; degrades gracefully if offline).

## Notes

- Secrets live only in the git-ignored root `.env`; they are never baked into images.
- The Electron **desktop client is not containerised** — run it locally against the API.
- For HTTPS, terminate TLS at a reverse proxy in front of `web` and set `COOKIE_SECURE=true`.
