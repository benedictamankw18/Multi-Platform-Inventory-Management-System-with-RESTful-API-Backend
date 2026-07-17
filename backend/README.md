# Backend README

This folder contains the Express REST API backend for the Inventory Management System.

## Environment variables
- `ACCESS_TOKEN_SECRET`: secret used to sign access JWTs.
- `REFRESH_TOKEN_SECRET`: secret used to sign refresh JWTs.
- `ACCESS_TOKEN_TTL`: access token time-to-live (for example, `15m`).
- `REFRESH_TOKEN_TTL_DAYS`: refresh token TTL in days (integer).
- `SESSION_INACTIVITY_TIMEOUT_MINUTES`: session inactivity expiry in minutes.
- Database connection: set `DATABASE_URL` (or `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`).
- `NODE_ENV` and `PORT` for runtime behavior.
- `REDIS_URL`: Redis connection string (default: `redis://127.0.0.1:6379`).
- `REPORT_CACHE_TTL`: cache TTL for report queries in seconds.

## Auth / cookies
- The server issues short-lived access tokens (JWT) and longer-lived refresh tokens.
- For web clients the refresh token is set as an `HttpOnly` cookie named `refreshToken` with `SameSite=Lax` and `path=/api/auth`.
- Desktop/API clients can provide the refresh token in the request body as `refreshToken` or `refresh_token`.

## Local setup
1. Copy `backend/.env.example` to `backend/.env` and fill values.
2. Install dependencies:

```bash
cd backend
npm install
```

3. Start Redis.

### Option 1: Docker (works if Docker Desktop is installed)
```bash
npm run start:redis
```

### Option 2: WSL / Ubuntu
```bash
wsl -d Ubuntu
sudo apt update
sudo apt install redis-server -y
sudo service redis-server start
redis-cli ping
```

### Option 3: Windows local install
If Redis is installed locally, start it with:
```bash
redis-server
```

4. Start the backend:

```bash
npm run dev
```

## Redis cache notes
- The backend now uses Redis for:
  - role list and role dropdown reads
  - permission list reads
  - permission middleware role-permission checks
- Cache entries are invalidated automatically after role or permission mutations.
- If Redis is unavailable, the application falls back to database reads and continues running.

## Useful scripts
```bash
npm run dev
npm run start:redis
npm run queue:worker
```

## Testing
- Unit and integration tests live alongside the services (Jest + supertest). Run `npm test` from the `backend` folder after tests are added.
