/**
 * geoip.utils.js
 *
 * Local IP-to-location resolution backed by the MaxMind GeoLite2-City
 * database (distributed via the `geolite2-redist` npm package, so no
 * license key is needed). The reader is opened lazily and cached for the
 * process lifetime; every failure path returns null so geolocation can
 * never break the request it runs inside.
 *
 * NOTE: this deliberately does NOT use `geolite2.open()` from the
 * `geolite2-redist` package. That function constructs an `AutoUpdater`
 * which schedules a fire-and-forget checksum check ~500ms later; when the
 * redistribution mirror (raw.githubusercontent.com) is unreachable that
 * detached promise rejects with an unhandled rejection and kills the whole
 * process (observed at boot on offline/DNS-blocked machines). Instead we
 * manage the database file ourselves and open it directly with `maxmind`,
 * so geolocation degrades to null instead of crashing the server.
 *
 * The first run may need to download the database. That load happens in the
 * background (triggered at boot by warmUpGeoip) and is never awaited by a
 * request: resolveLocation returns null until the reader is ready, so a slow
 * or unreachable mirror cannot stall login. A bounded timeout + cooldown stops
 * a hung download from retrying on every request.
 */

const maxmind = require('maxmind');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const DB_NAME = 'GeoLite2-City';
const STORAGE_DIR = path.resolve(__dirname, '..', '..', 'data', 'geoip');
const DB_PATH = path.join(STORAGE_DIR, `${DB_NAME}.mmdb`);
// The database may already exist inside the npm package (previous download).
// Reused once as a seed so we don't re-download on first run.
const PACKAGE_DB_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'node_modules',
  'geolite2-redist',
  'dbs'
);
const PACKAGE_DB_PATH = path.join(PACKAGE_DB_DIR, `${DB_NAME}.mmdb`);

// Give up on a slow/unreachable download so it can be retried later; requests
// are never blocked on it either way.
const LOAD_TIMEOUT_MS = 60 * 1000;
const RETRY_COOLDOWN_MS = 10 * 60 * 1000;

let reader = null;
let loading = false;
let nextRetryAt = 0;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    if (timer.unref) timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function ensureDatabase() {
  if (fs.existsSync(DB_PATH)) return DB_PATH;

  // Seed from the copy shipped/cached by the geolite2-redist package.
  if (fs.existsSync(PACKAGE_DB_PATH)) {
    await fsp.mkdir(STORAGE_DIR, { recursive: true });
    await fsp.copyFile(PACKAGE_DB_PATH, DB_PATH);
    return DB_PATH;
  }

  // Fresh download.
  await fsp.mkdir(STORAGE_DIR, { recursive: true });
  const geolite2 = await import('geolite2-redist');
  await geolite2.downloadDbs({ dbList: [DB_NAME], path: STORAGE_DIR });
  return DB_PATH;
}

// Kick off a single background load attempt. Never awaited by a request path.
function startLoading() {
  if (reader || loading) return;
  if (Date.now() < nextRetryAt) return;

  loading = true;
  (async () => {
    try {
      const dbPath = await withTimeout(ensureDatabase(), LOAD_TIMEOUT_MS, 'geoip download');
      reader = await withTimeout(maxmind.open(dbPath), 10000, 'geoip open');
      console.log('[geoip] GeoLite2 database ready');
    } catch (err) {
      // Transient failure (offline first run, slow mirror): schedule a retry.
      console.error('[geoip] failed to load GeoLite2 database:', err && err.message);
      nextRetryAt = Date.now() + RETRY_COOLDOWN_MS;
    } finally {
      loading = false;
    }
  })();
}

async function warmUpGeoip() {
  startLoading();
}

async function resolveLocation(ip) {
  if (!ip || typeof ip !== 'string') return null;

  // Never block the caller on the initial download: if the reader is not ready,
  // ensure a load is in flight and return null for now.
  if (!reader) {
    startLoading();
    return null;
  }

  try {
    const record = reader.get(ip);
    if (!record) return null;
    const city = record.city && record.city.names && record.city.names.en;
    const region =
      record.subdivisions &&
      record.subdivisions[0] &&
      record.subdivisions[0].names &&
      record.subdivisions[0].names.en;
    const country = record.country && record.country.names && record.country.names.en;
    const parts = [city, region, country].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  } catch {
    return null;
  }
}

module.exports = { resolveLocation, warmUpGeoip };
