# Production Deployment Guide

## Multi-Platform Inventory Management System

**Purpose:** Deploy the application as a production service rather than
a local/demo environment.

**Repository:**
`https://github.com/benedictamankw18/Multi-Platform-Inventory-Management-System-with-RESTful-API-Backend`

**Current deployment targets** - **Frontend:** Vercel ---
`https://multi-platform-inventory-management.vercel.app` - **Backend
API:** Render ---
`https://multi-platform-inventory-management.onrender.com` - **Health
check:**
`https://multi-platform-inventory-management.onrender.com/api/v1/health` -
**Database:** Neon PostgreSQL - **Redis / queue:** Upstash
Redis-compatible service - **Frontend folder:** `web-client/` -
**Backend folder:** `backend/`

> Important: a deployment that loads in a browser is not automatically
> production-ready. Complete the security, reliability, backup,
> monitoring, and end-to-end checks in this guide before using real
> business data.

------------------------------------------------------------------------

## 1. Prepare the repository

Run commands from the project root. For the current Windows workspace:

``` powershell
cd D:\inv
git status
git pull
```

Check that the backend and frontend have their lockfiles and package
scripts:

``` powershell
Get-ChildItem .\backend
Get-ChildItem .\web-client
Get-Content .\backend\package.json
Get-Content .\web-client\package.json
```

Confirm that: - `backend/package.json` contains a working `start`
script. - `web-client/package.json` contains a working `build` script. -
The expected lockfiles (`package-lock.json`, if using npm) are
committed. - Production secrets are not committed to Git. - `.env`,
`.env.*` files containing secrets are ignored by Git. Keep safe example
files such as `.env.example` free of real values.

Before pushing changes, inspect what Git will commit:

``` powershell
git status
git diff --cached
```

Never commit database passwords, API keys, Gmail app passwords, JWT
secrets, private connection strings, or real customer data.

## 2. Rotate credentials that have been exposed

Credentials were previously pasted into a chat. Treat them as
compromised and rotate them **before real production use**. Rotate: 1.
Neon database password; update the database credentials in Render. 2.
Upstash Redis credential/token; update `REDIS_URL`. 3. Gmail app
password; update the email password variable. 4. Agoosms API key; update
the SMS API key. 5. `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`;
generate new independent values and update all services that validate
those tokens.

Do not reuse the old values. Do not put new values in this document,
Git, screenshots, logs, or support tickets.

Generate independent random JWT secrets locally with Node.js:

``` powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Use one output for `ACCESS_TOKEN_SECRET` and the other for
`REFRESH_TOKEN_SECRET`. Rotating JWT secrets can invalidate existing
sessions; plan for users to sign in again.

## 3. Configure the production PostgreSQL database

### 3.1 Use a managed production database

In Neon: 1. Open the intended production project and database. 2. Rotate
the database password. 3. Keep the connection details private. 4.
Confirm that the schema and required initial data are present. 5. Prefer
a separate development database so test activity cannot damage
production data.

The current backend's `backend/src/config/db.js` prefers discrete `DB_*`
settings when they are present. In that case, `DATABASE_URL` may not be
used. Configure the discrete variables consistently, or deliberately
change the application configuration to use only `DATABASE_URL`; do not
supply conflicting values.

### 3.2 Set database variables in Render

Set these in the **backend Web Service** environment:

  Variable        Value
  --------------- ----------------------------------------------
  `NODE_ENV`      `production`
  `DB_HOST`       Neon PostgreSQL hostname only
  `DB_PORT`       `5432`
  `DB_NAME`       Production database name, e.g. `inventorydb`
  `DB_USER`       Neon database username
  `DB_PASSWORD`   Newly rotated database password

Do not include `https://` in `DB_HOST`. Do not add quotation marks
around values in Render.

The backend code enables PostgreSQL SSL when `NODE_ENV=production`. Keep
this enabled for the managed database. If you instead configure the app
to use `DATABASE_URL`, use the provider's current connection string and
ensure its SSL requirements are satisfied.

**Important:** Do not publish `DATABASE_URL` or `DB_PASSWORD`. If a
password contains special characters and is embedded in a URL, it must
be URL-encoded.

### 3.3 Database readiness checks

Before accepting real traffic: - Verify that the application can connect
from Render. - Confirm expected tables and required records exist. -
Test reading and writing a test record through the application. -
Confirm that the production account is not using a development
database. - Establish a backup and restore procedure (see Section 10).

Do not repeatedly import a full SQL dump into a live database to fix an
application connection error. Use versioned migrations or a reviewed,
repeatable database change process.

## 4. Configure Redis and the queue worker

Create or use a production Redis database with TLS enabled. Add the
provider's full TLS URL to Render:

  -----------------------------------------------------------------------
  Variable                            Value
  ----------------------------------- -----------------------------------
  `REDIS_URL`                         The private `rediss://...` URL
                                      supplied by the Redis provider

  `QUEUE_MAX_RETRIES`                 `5`, if appropriate for the app's
                                      retry policy

  `QUEUE_WORKER_INTERVAL_MS`          `30000`, if appropriate for the
                                      app's worker design
  -----------------------------------------------------------------------

Use `rediss://` when the provider requires TLS. Do not paste the Redis
URL into Git or public issue trackers.

### Choose one queue-worker deployment model

The application can run the worker inside the backend process unless
`RUN_QUEUE_WORKER=false`. Avoid unintentionally running duplicate
workers.

**Option A --- Worker runs with the backend** - Leave the backend
configured to run its in-process worker. - Do not start a second worker
service unless the application is explicitly designed for multiple
workers.

**Option B --- Separate Render worker service** 1. Create a Render
**Background Worker** from the same repository. 2. Set its root
directory to `backend` if Render uses a monorepo root directory. 3. Use
the install command `npm ci` when a compatible `package-lock.json` is
present. 4. Use the start command `npm run queue:worker` if that script
exists in `backend/package.json`. 5. Give the worker the same required
database and Redis environment variables as the backend. 6. Set
`RUN_QUEUE_WORKER=false` on the backend Web Service if its startup code
uses that variable to disable the in-process worker. 7. Deploy both
services and inspect both logs.

Use only one model unless you have intentionally designed and tested
multi-worker concurrency.

## 5. Deploy the backend to Render

In the Render Dashboard, create or open the backend **Web Service**
connected to the correct GitHub repository and branch.

For this monorepo, configure the service's root directory as `backend`
if Render supports root-directory configuration for the repository.

Typical settings (confirm against the actual `backend/package.json`):

  Setting             Value
  ------------------- ------------------
  Runtime             Node
  Root directory      `backend`
  Build command       `npm ci`
  Start command       `npm start`
  Health-check path   `/api/v1/health`

If `npm ci` fails because the lockfile is absent or out of sync, fix and
commit the lockfile rather than silently relying on an unpinned install.

Add the required production environment variables in Render's
Environment section. In addition to the database and Redis values, check
which of these the backend actually reads:

``` text
NODE_ENV=production
ACCESS_TOKEN_SECRET=<new-long-random-secret>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_SECRET=<different-new-long-random-secret>
REFRESH_TOKEN_TTL_DAYS=30
APP_URL=https://multi-platform-inventory-management.vercel.app
COOKIE_SECURE=true
SESSION_INACTIVITY_TIMEOUT_MINUTES=30
QUEUE_MAX_RETRIES=5
QUEUE_WORKER_INTERVAL_MS=30000
REPORT_CACHE_TTL=300
```

Set email and SMS variables only if those features are configured and
tested. Variable names are case-sensitive in Node.js. The project has
used names such as `Email_HOST`, `Email_PORT`, `Email_USER`, and
`Email_PASSWORD`; verify the exact names read by the code before setting
them. Do not assume changing the casing is harmless.

For Gmail SMTP, use the correct account and a dedicated app password
where applicable. For SMS, use the correct provider endpoint and sender
ID. A test sender ID may not be approved for production delivery.

Do not manually set `PORT` unless the platform specifically requires it.
Render normally provides `PORT`; the backend should listen on
`process.env.PORT`.

Deploy the service. Then open:

`https://multi-platform-inventory-management.onrender.com/api/v1/health`

A successful health check should return the response defined by the
application. A browser error or HTTP failure should be investigated in
Render logs before proceeding.

## 6. Configure backend CORS and cookies

The browser frontend and API use different origins, so the backend must
permit the deployed frontend origin.

1.  Inspect the backend CORS configuration to identify the exact setting
    or allowlist used by the code.
2.  Allow the production frontend origin exactly:
    `https://multi-platform-inventory-management.vercel.app`
3.  Add any custom production frontend domain only when it is actually
    in use.
4.  Do not use `*` as the allowed origin when credentialed cookies are
    required.
5.  If authentication uses cookies, ensure the backend returns the
    appropriate credential headers and the frontend request client is
    configured to send credentials where required.
6.  Keep `COOKIE_SECURE=true` under HTTPS.
7.  Confirm cookie `SameSite` settings are compatible with the actual
    authentication flow. Cross-site cookies generally require
    `SameSite=None; Secure`; do not change cookie settings without
    verifying the app's design.

The exact CORS environment-variable name depends on the code. Do not
invent a variable name: search the backend source for `cors(`,
`Access-Control-Allow-Origin`, and credential handling, then configure
the name the application actually reads.

A CORS error is different from an API server outage. Check the browser's
Network and Console panels and the Render logs.

## 7. Deploy the frontend to Vercel

Open the Vercel project connected to the repository.

Configure the project for the Vite frontend:

  Setting            Value
  ------------------ --------------------------------------------
  Root directory     `web-client`
  Framework          Vite, if auto-detection does not select it
  Install command    `npm ci` when the lockfile is present
  Build command      `npm run build`
  Output directory   `dist`

Under **Settings → Environment Variables**, add:

  -------------------------------------------------------------------------------------------------------
  Name                                Value
  ----------------------------------- -------------------------------------------------------------------
  `VITE_API_BASE_URL`                 `https://multi-platform-inventory-management.onrender.com/api/v1`

  -------------------------------------------------------------------------------------------------------

Apply it to Production and to Preview only if Preview deployments should
use this API. Vite exposes `VITE_*` variables to browser code, so
**never put secrets** in them.

After saving the variable, redeploy the frontend so Vite builds with the
new value. Vite's development proxy to `localhost:8040` is for local
development; a deployed browser cannot use your computer's localhost as
the API.

Open the deployed site and inspect the browser Network panel. API calls
should target the Render domain, not the Vercel domain and not
`localhost`.

## 8. Verify the end-to-end application

Run these checks in a browser after both deployments are healthy.

### Core functionality

-   [ ] Frontend loads over HTTPS.
-   [ ] Health endpoint returns the expected response.
-   [ ] Login and logout work.
-   [ ] Access-token expiry and refresh behavior work as designed.
-   [ ] Products and categories load from production.
-   [ ] Creating/updating a test product works and persists after
    refresh.
-   [ ] Branch and user permissions are enforced.
-   [ ] Validation errors are handled safely.
-   [ ] Reports and exports work.
-   [ ] Email and SMS work only if configured.
-   [ ] Queue-backed operations complete and failed jobs are visible in
    logs.
-   [ ] No API request points to `localhost` or the wrong environment.

### Browser diagnostics

Press **F12 → Network** and inspect a failed request: - `CORS` message:
review backend CORS allowlist and credential settings. - `401` or `403`:
inspect authentication, token, cookie, and permissions logic. - `404`:
check the API base URL and route prefix. - `500`: inspect Render logs
for the underlying exception. - `502`, `503`, or timeout: check service
health, startup logs, database connection, and Redis connection.

Do not share screenshots or logs containing tokens, cookies, passwords,
or connection strings.

## 9. Security hardening before real users

-   [ ] Rotate every credential previously exposed.
-   [ ] Use separate production and development credentials.
-   [ ] Enforce HTTPS for frontend and API.
-   [ ] Keep all secrets in platform secret/environment settings, never
    frontend variables or source control.
-   [ ] Verify password hashing, authorization, and tenant/branch
    isolation.
-   [ ] Enforce server-side validation for every write operation.
-   [ ] Add or verify rate limits for login, password reset, OTP, and
    sensitive endpoints.
-   [ ] Use secure cookie attributes where cookie authentication is
    used.
-   [ ] Ensure production error responses do not expose stack traces,
    SQL, secrets, or internal paths.
-   [ ] Restrict CORS to trusted origins.
-   [ ] Review upload handling, file size/type limits, and access
    controls if uploads are enabled.
-   [ ] Verify dependency vulnerabilities and update packages through
    tested changes.
-   [ ] Restrict database access to the app's needs and protect
    administrative credentials.
-   [ ] Disable demo/test accounts and test SMS/email settings before
    launch.
-   [ ] Confirm audit logging records important actions without
    recording secrets.
-   [ ] Review the privacy, retention, and access policies for customer
    and employee data.

Do not claim the application is secure merely because HTTPS is enabled.
Complete an application-specific security review.

## 10. Backups, monitoring, and recovery

### Backups

-   Enable and understand the database provider's backup/restore
    features.
-   Decide the recovery point objective (how much data loss is
    acceptable) and recovery time objective (how quickly service must
    return).
-   Schedule backups or exports appropriate to the business's data
    volume.
-   Test restoring a backup into a separate database.
-   Keep backup access restricted and encrypt downloaded backup files.
-   Do not store production dumps in the public repository.

### Monitoring

-   Review Render backend and worker logs after each deploy.
-   Set up alerts for service failures, high error rates, and resource
    exhaustion where available.
-   Monitor database connection limits and storage.
-   Monitor Redis usage, queue depth, retries, and failed jobs.
-   Track application errors without logging credentials, session
    cookies, or personal data unnecessarily.

### Recovery

Document who can restore the database, rotate credentials, roll back a
deployment, and contact the hosting providers. Test the recovery process
before relying on it.

## 11. Custom domain (optional but recommended)

1.  Register or choose the intended domain.
2.  Add the frontend domain in Vercel and apply the DNS records Vercel
    provides.
3.  Add the API domain in Render if you want a separate domain such as
    `api.example.com`.
4.  Follow each platform's current DNS and TLS instructions exactly.
5.  Update `VITE_API_BASE_URL`, backend CORS allowlists, `APP_URL`, and
    authentication redirect URLs to the final HTTPS domains.
6.  Redeploy and repeat the full end-to-end checks.

Do not copy DNS records from a different project; use the exact records
displayed by the hosting provider for your domain.

## 12. Release procedure for future updates

For each production release:

1.  Create a branch and make the change.
2.  Run backend tests and frontend tests/build locally.
3.  Review the diff and check for secrets.
4.  Test against a non-production database.
5.  Review any database migration and confirm a rollback or recovery
    plan.
6.  Merge/push to the branch connected to hosting.
7.  Watch the Vercel and Render deployments until they finish.
8.  Check health, logs, authentication, and critical workflows.
9.  Verify background-worker health if the release affects queues.
10. Record the release and any issues.

Avoid making unreviewed changes directly to the production database.

## 13. Final production go-live checklist

-   [ ] All exposed credentials rotated.
-   [ ] Production database is correct and has verified schema/data.
-   [ ] Backend deployed and health check passes.
-   [ ] Redis connects over TLS.
-   [ ] Exactly the intended queue-worker model is running.
-   [ ] Vercel `VITE_API_BASE_URL` points to the production Render API.
-   [ ] Backend CORS allows only the intended frontend origins.
-   [ ] Authentication, cookie, and authorization flows tested.
-   [ ] No secrets are committed or exposed in browser code.
-   [ ] Email/SMS verified using production-approved credentials.
-   [ ] Backups and a restore test completed.
-   [ ] Logs, alerts, and recovery ownership documented.
-   [ ] Critical end-to-end workflows tested using non-sensitive test
    data.

**Go-live rule:** Do not put real business or customer data into the
system until the credential rotation, access-control checks,
backup/restore test, and core end-to-end tests are complete.

------------------------------------------------------------------------

## Troubleshooting quick reference

  -----------------------------------------------------------------------
  Symptom                             First checks
  ----------------------------------- -----------------------------------
  Vercel calls itself instead of      Confirm `VITE_API_BASE_URL`, then
  Render                              redeploy Vercel

  CORS error                          Backend CORS allowlist,
                                      credentials, cookie attributes

  PostgreSQL insecure-connection      `NODE_ENV=production`, current
  error                               `db.js`, database SSL settings

  PostgreSQL authentication failure   Rotated Neon password and `DB_*`
                                      values in Render

  Redis TLS error                     `REDIS_URL` uses the provider's
                                      correct TLS URL

  Queue does not process jobs         Worker service logs, DB/Redis env,
                                      duplicate-worker configuration

  Backend health endpoint fails       Render startup logs, port binding,
                                      database initialization

  Works locally but not in production Production env variables, URL
                                      configuration, CORS, build-time
                                      Vite variables
  -----------------------------------------------------------------------

**Never paste secret values into a support request.** Share variable
names, sanitized error messages, and relevant code instead.
