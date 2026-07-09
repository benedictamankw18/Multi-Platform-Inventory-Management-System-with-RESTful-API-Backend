const { Pool } = require('pg');

function toInt(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

const pool = new Pool({
  host: process.env.DB_HOST || undefined,
  port: toInt(process.env.DB_PORT),
  database: process.env.DB_NAME || undefined,
  user: process.env.DB_USER || undefined,
  password: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : undefined,
});

module.exports = pool;