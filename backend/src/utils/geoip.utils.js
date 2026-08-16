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

let readerPromise = null;

async function ensureDatabase() {
  if (fs.existsSync(DB_PATH)) return DB_PATH;

  // Seed from the copy shipped/cached by the geolite2-redist package.
  if (fs.existsSync(PACKAGE_DB_PATH)) {
    await fsp.mkdir(STORAGE_DIR, { recursive: true });
    await fsp.copyFile(PACKAGE_DB_PATH, DB_PATH);
    return DB_PATH;
  }

  // Fresh download. Awaited + caught here so an offline first run cannot
  // reject the caller or leave an orphaned (crash-prone) promise behind.
  await fsp.mkdir(STORAGE_DIR, { recursive: true });
  const geolite2 = await import('geolite2-redist');
  await geolite2.downloadDbs({ dbList: [DB_NAME], path: STORAGE_DIR });
  return DB_PATH;
}

function loadReader() {
  return (async () => {
    try {
      const dbPath = await ensureDatabase();
      return await maxmind.open(dbPath);
    } catch (err) {
      // Transient failure (e.g. first-run download while offline): drop the
      // cached promise so the next call retries, but do not reject callers.
      console.error('[geoip] failed to open GeoLite2 database:', err && err.message);
      readerPromise = null;
      return null;
    }
  })();
}

function getReader() {
  if (!readerPromise) readerPromise = loadReader();
  return readerPromise;
}

async function warmUpGeoip() {
  await getReader();
}

async function resolveLocation(ip) {
  if (!ip || typeof ip !== 'string') return null;
  try {
    const reader = await getReader();
    if (!reader) return null;
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
