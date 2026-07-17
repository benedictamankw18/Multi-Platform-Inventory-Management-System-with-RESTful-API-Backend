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

exports.listPriceHistoryByProduct = async (
    product_id,
    { limit = 50, offset = 0 } = {},
    client = db
) => {

    let q = `SELECT * FROM ${TABLE}`;
    const params = [];

    if (product_id) {
        params.push(product_id);
        q += ` WHERE product_id = $${params.length}`;
    }

    params.push(limit);
    params.push(offset);

    q += `
        ORDER BY created_at DESC
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
    `;

    const { rows } = await client.query(q, params);

    return rows;
};
