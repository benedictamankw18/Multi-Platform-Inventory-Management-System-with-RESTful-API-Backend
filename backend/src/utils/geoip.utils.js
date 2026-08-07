/**
 * geoip.utils.js
 *
 * Local IP-to-location resolution backed by the MaxMind GeoLite2-City
 * database (distributed via the `geolite2-redist` npm package, so no
 * license key is needed). The reader is opened lazily and cached for the
 * process lifetime; every failure path returns null so geolocation can
 * never break the request it runs inside.
 */

const maxmind = require('maxmind');

let readerPromise = null;

function loadReader() {
  return import('geolite2-redist')
    .then((geolite2) => geolite2.open('GeoLite2-City', (dbPath) => maxmind.open(dbPath)))
    .catch((err) => {
      // Transient failure (e.g. first-run DB download while offline): drop the
      // cached promise so the next call retries, but do not reject callers.
      console.error('[geoip] failed to open GeoLite2 database:', err && err.message);
      readerPromise = null;
      return null;
    });
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
