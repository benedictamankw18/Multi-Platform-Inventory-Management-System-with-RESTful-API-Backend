# Running the System

How to run, rebuild, and operate the Multi-Platform Inventory Management System.
For first-time installation, see [`INSTALLATION.md`](./INSTALLATION.md).

- [1. Docker Compose](#1-docker-compose)
- [2. Local development](#2-local-development)
- [3. Building for production](#3-building-for-production)
- [4. Operating the stack](#4-operating-the-stack)
- [5. Verifying a running system](#5-verifying-a-running-system)
- [6. Command cheat sheet](#6-command-cheat-sheet)

---

## 1. Docker Compose

The whole server-side stack runs with one Compose file (`docker-compose.yml`):

| Service | Purpose | Host port |
| ------- | ------- | --------- |
| `postgres` | Database (schema + seeds applied on first init) | internal |
| `redis` | Cache + rate-limit store | internal |
| `backend` | Express REST API (`/api/v1`) | `${API_PORT}` (8040) |
| `queue-worker` | Background e-mail/SMS + low-stock scans | internal |
| `web` | nginx serving the React SPA and proxying the API | `${WEB_PORT}` (80) |

### 1.1 Start

```sh
cp .env.docker.example .env       # first time only; edit the secrets
docker compose up -d --build      # build images and start everything
docker compose ps                 # check status / health
```

Open the app at `http://localhost` (or `http://localhost:8080` if
`WEB_PORT=8080`). Direct API access is at `http://localhost:8040/api/v1`.

### 1.2 Follow logs

```sh
docker compose logs -f backend
docker compose logs -f queue-worker
docker compose logs -f web
docker compose logs -f postgres
```

### 1.3 Restart / stop

```sh
docker compose restart            # restart all containers
docker compose restart backend    # restart one
docker compose stop               # stop without removing
docker compose start              # start again
docker compose down               # stop and remove containers (volumes kept)
docker compose down -v            # DESTRUCTIVE: also deletes pgdata/uploads/geoipdata
```

> `docker compose down -v` deletes the database volume. It is the only way to
> re-run first-time initialisation, and it destroys all data.

### 1.4 Rebuild after code changes

The API and web images are built from the source tree (**no** source
bind-mount), so a code change requires a rebuild of the relevant image:

```sh
docker compose up -d --build backend   # after backend changes
docker compose up -d --build web       # after web-client changes
docker compose up -d --build           # everything
```

### 1.5 Apply new migrations to the running database

Init scripts run only on an empty volume. For an existing database, apply the
migrations directly:

```sh
docker compose cp database/migrations postgres:/migrations
docker compose exec -T postgres sh -c \
  'for f in /migrations/*.sql; do psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f" || exit 1; done'
```

Or, from the host with the Compose database reachable:

```sh
DB_HOST=localhost DB_NAME=multiplatforminventorysystem DB_USER=postgres \
  DB_PASSWORD=<password> sh database/apply-migrations.sh
```

### 1.6 Purge the permission cache

Role → permission grants are cached in Redis for 300 seconds
(`role-permissions:<roleId>`). After changing grants manually in SQL, clear it so
the change takes effect immediately:

```sh
docker compose exec redis redis-cli --scan --pattern 'role-permissions:*' | \
  xargs -r docker compose exec -T redis redis-cli del
# or simply:
docker compose restart redis
```

---

## 2. Local development

Run the API and clients from source with hot reload.

### 2.1 Backend API

```sh
cd backend
npm run dev            # nodemon server.js — API on :8040
```

Unless `RUN_QUEUE_WORKER=false` is set, the API forks an **in-process** queue
worker. To run the worker separately instead:

```sh
# terminal A
RUN_QUEUE_WORKER=false npm run dev     # or set it in backend/.env
# terminal B
npm run queue:worker
```

Need Redis locally?

```sh
cd backend
npm run start:redis    # docker run --rm -p 6379:6379 redis:latest
```

### 2.2 Web client

```sh
cd web-client
npm run dev            # Vite dev server (default http://localhost:5173)
```

The client builds requests against `VITE_API_BASE_URL`, defaulting to the
relative path `/api/v1`. The Vite dev server proxies `/api` and `/uploads` to
`http://localhost:8040`, so simply run the backend on its default port. To point
at a different API, set `VITE_API_BASE_URL` in a `web-client/.env.local` file
before building.

### 2.3 Desktop client

The desktop app is Electron wrapping the same React app.

```sh
cd desktop-client
npm run dev            # concurrently: Vite renderer (:5173) + Electron
```

Individual processes:

```sh
npm run dev:renderer   # Vite only (http://127.0.0.1:5173)
npm run dev:desktop    # waits for :5173, then launches Electron
```

`desktop-client/package.json` describes the app as *"renderer-only; requires the
API backend at localhost:8040"* — start the API first.

> If native modules (e.g. `node-hid`) fail after a Node/Electron upgrade, run
> `npm run rebuild`.

### 2.4 Desktop against the Docker API

You can pair the Electron client (local dev) with the containerised API:

1. `docker compose up -d backend postgres redis`
2. In `desktop-client`, run `npm run dev`.
3. No change needed — the Vite dev server proxies `/api` to
   `http://localhost:8040` (the API's default port).

### 2.5 Local e-mail (Mailpit)

Outgoing e-mail uses SMTP and is **disabled when `Email_HOST` is blank** (the
message body is logged to the API/worker console instead). To capture mail
locally, run the bundled catcher:

```sh
docker compose --profile mail up -d     # SMTP on :1025, web UI on :8025
```

Then point the sender at it:

| Where the API runs | `Email_HOST` | `Email_PORT` | `Email_SECURE` |
| ------------------ | ------------ | ------------ | -------------- |
| In Docker (compose) | `mailpit` | `1025` | `false` |
| On the host (local dev) | `localhost` | `1025` | `false` |

Open `http://localhost:8025` to read captured messages. A standalone catcher
works too:
`docker run --rm -p 1025:1025 -p 8025:8025 axllent/mailpit`.

> If `Email_HOST` points at a catcher that isn't running, send jobs fail and
> retry. Keep the catcher up (`docker compose --profile mail up -d`), or blank
> `Email_HOST` to fall back to console logging.

---

## 3. Building for production

### 3.1 Web client

```sh
cd web-client
npm run build          # tsc -b && vite build  → dist/
npm run lint           # oxlint
npm run preview        # serve the production build locally
```

The Docker `web` image runs `npm run build` and serves `dist/` with nginx.

### 3.2 Backend

No build step — the API runs directly from source with production dependencies
(`npm ci --omit=dev`, see `backend/Dockerfile`).

### 3.3 Desktop installers

```sh
cd desktop-client
npm run dist           # build + electron-builder (current platform)
npm run dist:win       # Windows installer
```

> The desktop build sets `npmRebuild: false` in `desktop-client/package.json`.
> `node-hid` ships a prebuilt Node-API (N-API v4) binary that is ABI-stable
> across Node and Electron, so electron-builder packages it as-is and no C++
> toolchain (Visual Studio Build Tools) is required. If a native module ever
> needs a build for a specific ABI, run `npm run rebuild`
> (`electron-rebuild -f -w node-hid`) from `desktop-client` with a toolchain
> installed.

### 3.4 Docker images

```sh
docker compose build                 # build all images
docker compose build backend web     # build specific images
```

### 3.5 Android APK

The mobile client links native code (`expo-dev-client`, the thermal receipt
printer), so Expo Go cannot run it — build a real APK:

```sh
cd mobile-client
npx expo prebuild --platform android        # clears and regenerates android/ (gitignored)
cd android
./gradlew assembleRelease "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"
# → android/app/build/outputs/apk/release/app-release.apk
```

> **`http://` APIs need an explicit cleartext opt-in.** The Android template sets
> `android:usesCleartextTraffic="true"` only in the **debug** and `debugOptimized`
> manifests, so a **release** build has no such attribute. Because
> `targetSdkVersion` is 36, Android 9+ then blocks cleartext by default and every
> request fails *immediately* — not as a timeout — with
> `CLEARTEXT communication to <host> not permitted by network security policy`.
> The app surfaces that as *"Could not reach the server"*, which looks exactly
> like a dead API or a firewall problem. Allow it in `app.json` (the
> `expo-build-properties` plugin is already a dependency for this reason):
>
> ```json
> "plugins": [
>   ["expo-build-properties", { "android": { "usesCleartextTraffic": true } }]
> ]
> ```
>
> Always confirm it landed in the built APK:
>
> ```sh
> aapt2 dump xmltree --file AndroidManifest.xml app-release.apk | grep usesCleartextTraffic
> ```

> **Choose ABIs deliberately.** `gradle.properties` defaults to all four
> (`armeabi-v7a,arm64-v8a,x86,x86_64`) and every additional ABI is another full
> native compile, so build only what your devices need — check a connected
> device with `adb shell getprop ro.product.cpu.abilist`. The prebuilt
> dependencies ship `arm64-v8a` and `armeabi-v7a`, so those two cover essentially
> all real hardware without paying for the emulator ABIs.
>
> In **PowerShell** a bare comma is parsed as an array token, so the flag must be
> quoted or Gradle fails with *"Missing argument in parameter list"*:
>
> ```powershell
> .\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"
> ```

> **`expo prebuild` clears `android/` first** — on Expo SDK 57 it prints
> `- Clearing android`. That deletes `android/app/build` and `.cxx`, so the next
> build recompiles every native module: roughly an hour instead of a few minutes
> on a warm cache. Re-run prebuild only when native configuration really
> changes, and when it does, note that a config-only change (like adding
> `expo-build-properties`) alters just the generated
> `android/app/src/main/AndroidManifest.xml` — copying that one file into the
> build tree keeps the warm cache intact.

> **Sideloading over wireless ADB.** `adb pair <ip>:<port>` uses the *pairing*
> port, which is not the port `adb connect <ip>:<port>` needs — take the latter
> from *Wireless debugging* on the device, or simply let mDNS auto-connect. A
> wirelessly connected device commonly enumerates twice (its serial and its
> `adb-<serial>-<guid>._adb-tls-connect._tcp` name), making every command fail
> with `more than one device/emulator`; pin the serial once with
> `$env:ANDROID_SERIAL = '<serial>'`. Then
> `adb install -r mobile-client/release/app-release.apk`.

> **Build from a short path.** Gradle configures every native module project at
> the *real* location of `node_modules`, so CMake derives its object-file paths
> from this repository's absolute path. Node resolves real paths, so `subst`
> mappings, directory junctions, and `LongPathsEnabled` do not help — the long
> path always comes back. When the object-file directory plus CMake's mangled
> filename exceeds `CMAKE_OBJECT_PATH_MAX` (250), `react-native-screens` and
> `react-native-worklets` fail with
> `ninja: error: manifest 'build.ninja' still dirty after 100 tries`.
> Work around it by building from a short root, e.g. copy `mobile-client` to
> `D:\mc` and run Gradle there, or relocate the repository to a short path such
> as `D:\ims`. If you copy the tree, keep `node_modules` in sync — the build
> evaluates the Expo config, so a plugin named in `app.json` must also be
> installed in the copy, or `:expo-constants:createExpoConfig` fails with
> `Failed to resolve plugin for module "..."`.

> `assembleRelease` signs with the prebuild-generated debug keystore
> (`android/app/debug.keystore`, alias `androiddebugkey`, password `android`),
> which is fine for sideloading but not for Play Store uploads. Gradle needs
> JDK 17 — the `java` on `PATH` may be older. `EXPO_PUBLIC_API_BASE_URL` from
> `mobile-client/.env.local` is inlined into the JS bundle when Gradle runs
> Metro during `assembleRelease`, so set it *before* building (it is baked in,
> not read at runtime). Copy the finished APK to `mobile-client/release/`
> (gitignored).

---

## 4. Operating the stack

### 4.1 Volumes

| Volume | Contents |
| ------ | -------- |
| `pgdata` | PostgreSQL data. |
| `redisdata` | Redis append-only persistence. |
| `uploads` | Product images and business logos (shared by nginx and the API). |
| `geoipdata` | GeoLite2 database cache (downloaded at runtime; degrades offline). |

### 4.2 Database shell

```sh
docker compose exec postgres psql -U postgres -d multiplatforminventorysystem
# list tables
docker compose exec postgres psql -U postgres -d multiplatforminventorysystem -c "\dt"
```

### 4.3 Backups

```sh
# logical dump
docker compose exec -T postgres pg_dump -U postgres multiplatforminventorysystem > backup.sql

# restore
docker compose exec -T postgres psql -U postgres -d multiplatforminventorysystem < backup.sql
```

### 4.4 Health checks

```sh
docker compose ps                                              # STATUS shows (healthy)
curl http://localhost:8040/api/v1/health                       # direct
curl http://localhost/api/v1/health                            # via nginx
```

### 4.5 SMS / e-mail queue

Background delivery jobs live in the `message_queue` table and are visible in
the app under **Message Queue** (permission `MANAGE_SETTINGS`). If e-mail/SMS
delivery is not configured (`AGOOSMS_*`/SMTP blank), jobs remain queued and can
be resent once configured.

---

## 5. Verifying a running system

```sh
# 1. Health
curl http://localhost:8040/api/v1/health

# 2. Log in and capture a token
curl -s -X POST http://localhost:8040/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"admin@example.com","password":"<SEED_ADMIN_PASSWORD>"}'

# 3. Swagger UI (interactive)
#    open http://localhost:8040/api/v1/docs in a browser
```

Manual smoke test:

1. Log in with the administrator account.
2. Select a branch.
3. Open **Dashboard** — KPIs and the sales-trend chart render.
4. Open **POS**, add a product, complete a sale, print/reprint a receipt.
5. Open **Products → Price History** — entries appear.
6. Open **Reports** and **Audit Logs**.

---

## 6. Command cheat sheet

### Docker

| Task | Command |
| ---- | ------- |
| Start / build | `docker compose up -d --build` |
| Status | `docker compose ps` |
| Logs (one service) | `docker compose logs -f backend` |
| Restart | `docker compose restart` |
| Rebuild API | `docker compose up -d --build backend` |
| Rebuild web | `docker compose up -d --build web` |
| Apply migrations | see §1.5 |
| Stop | `docker compose stop` |
| Remove containers | `docker compose down` |
| Remove + wipe data | `docker compose down -v` |

### Backend

| Task | Command |
| ---- | ------- |
| Dev server | `npm run dev` |
| Production start | `npm start` |
| Worker only | `npm run queue:worker` |
| Local Redis | `npm run start:redis` |

### Web client

| Task | Command |
| ---- | ------- |
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Lint | `npm run lint` |
| Preview build | `npm run preview` |

### Desktop client

| Task | Command |
| ---- | ------- |
| Dev (renderer + app) | `npm run dev` |
| Renderer only | `npm run dev:renderer` |
| Build | `npm run build` |
| Installer (current OS) | `npm run dist` |
| Installer (Windows) | `npm run dist:win` |
| Rebuild native modules | `npm run rebuild` |
