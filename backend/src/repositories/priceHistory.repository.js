const db = require('../config/db');

const TABLE = 'price_history';

exports.createPriceHistory = async ({ history_id, product_id, old_price = null, new_price = null, changed_by = null, effective_date = null } = {}, client = db) => {
  // If an effective_date is supplied, insert it into created_at column
  if (effective_date) {
    const q = `INSERT INTO ${TABLE} (history_id, product_id, old_price, new_price, changed_by, created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    const params = [history_id, product_id || null, old_price, new_price, changed_by || null, effective_date];
    const { rows } = await client.query(q, params);
    return rows[0];
  }
  const q = `INSERT INTO ${TABLE} (history_id, product_id, old_price, new_price, changed_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
  const params = [history_id, product_id || null, old_price, new_price, changed_by || null];
  const { rows } = await client.query(q, params);
  return rows[0];
};

exports.getPriceHistoryById = async (history_id, client = db) => {
  const q = `SELECT * FROM ${TABLE} WHERE history_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [history_id]);
  return rows[0];
};

exports.listPriceHistoryByProduct = async (product_id, { limit = 50, offset = 0 } = {}, client = db) => {
  const q = `SELECT * FROM ${TABLE} WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
  const { rows } = await client.query(q, [product_id, limit, offset]);
  return rows;
};
