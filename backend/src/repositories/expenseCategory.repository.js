const db = require('../config/db');

const TABLE = 'expense_categories';

exports.createExpenseCategory = async ({ category_id, category_name, description = null }, client = db) => {
  const q = `INSERT INTO ${TABLE} (category_id, category_name, description) VALUES ($1,$2,$3) RETURNING *`;
  const { rows } = await client.query(q, [category_id, category_name, description]);
  return rows[0];
};

exports.getExpenseCategoryById = async (category_id, client = db) => {
  const q = `SELECT * FROM ${TABLE} WHERE category_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [category_id]);
  return rows[0];
};

exports.getExpenseCategoryByName = async (category_name, client = db) => {
  const q = `SELECT * FROM ${TABLE} WHERE category_name = $1 LIMIT 1`;
  const { rows } = await client.query(q, [category_name]);
  return rows[0];
};

exports.listExpenseCategories = async ({ q: search, limit = 50, offset = 0 } = {}, client = db) => {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (search) { params.push(`%${search}%`); where.push(`category_name ILIKE $${params.length}`); }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  base += ` ORDER BY category_name LIMIT $${params.length+1} OFFSET $${params.length+2}`;
  params.push(limit);
  params.push(offset);
  const { rows } = await client.query(base, params);
  return rows;
};

exports.updateExpenseCategory = async (category_id, patch, client = db) => {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of Object.keys(patch)) {
    fields.push(`${key} = $${idx}`);
    params.push(patch[key]);
    idx++;
  }
  if (!fields.length) return exports.getExpenseCategoryById(category_id, client);
  params.push(category_id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, updated_at = now() WHERE category_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0];
};

exports.deleteExpenseCategory = async (category_id, client = db) => {
  const q = `DELETE FROM ${TABLE} WHERE category_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [category_id]);
  return rows[0];
};
