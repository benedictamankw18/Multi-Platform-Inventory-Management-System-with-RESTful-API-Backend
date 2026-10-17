const { Pool } = require('pg');

function toInt(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Resolve the pool configuration from the environment.
 *
 * Discrete settings are preferred and read from BOTH the `DB_*` names used by
 * this project and the standard libpq `PG*` names, so container env and local
 * `.env` cannot silently drift apart. A full `DATABASE_URL` is used only when no
 * discrete host/database is provided (containers / managed databases). NB: a
 * password inside a URL must be percent-encoded (e.g. `@` -> `%40`).
 */
function resolvePoolConfig() {
  const rawPassword =
    process.env.DB_PASSWORD != null ? process.env.DB_PASSWORD :
    process.env.PGPASSWORD != null ? process.env.PGPASSWORD :
    undefined;

  const discrete = {
    host: process.env.DB_HOST || process.env.PGHOST || undefined,
    port: toInt(process.env.DB_PORT || process.env.PGPORT),
    database:
      process.env.DB_NAME || process.env.DB_DATABASE || process.env.PGDATABASE || undefined,
    user: process.env.DB_USER || process.env.PGUSER || undefined,
    password: rawPassword != null ? String(rawPassword) : undefined,
  };

  const hasDiscrete = Object.values(discrete).some((v) => v !== undefined);
  if (!hasDiscrete && process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  return discrete;
}

const poolConfig = resolvePoolConfig();

if (process.env.NODE_ENV === "production") {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);
module.exports = pool;
