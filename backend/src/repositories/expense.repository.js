const db = require('../config/db');

const TABLE = 'expenses';

exports.createExpense = async ({ expense_id, branch_id = null, recorded_by = null, category = null, description = null, amount = null, expense_date = null }, client = db) => {
  const q = `INSERT INTO ${TABLE} (expense_id, branch_id, recorded_by, category, description, amount, expense_date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
  const params = [expense_id, branch_id || null, recorded_by || null, category || null, description || null, amount || null, expense_date || null];
  const { rows } = await client.query(q, params);
  return rows[0];
};

exports.getExpenseById = async (expense_id, client = db) => {
  const q = `SELECT * FROM ${TABLE} WHERE expense_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [expense_id]);
  return rows[0];
};

exports.listExpenses = async ({ branchId, fromDate, toDate, category, limit = 50, offset = 0 } = {}, client = db) => {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (branchId) { params.push(branchId); where.push(`branch_id = $${params.length}`); }
  if (category) { params.push(category); where.push(`category = $${params.length}`); }
  if (fromDate) { params.push(fromDate); where.push(`expense_date >= $${params.length}`); }
  if (toDate) { params.push(toDate); where.push(`expense_date <= $${params.length}`); }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  params.push(limit);
  params.push(offset);
  base += ` ORDER BY expense_date DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await client.query(base, params);
  return rows;
};

exports.updateExpense = async (expense_id, patch, client = db) => {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of Object.keys(patch)) {
    fields.push(`${key} = $${idx}`);
    params.push(patch[key]);
    idx++;
  }
  if (!fields.length) return exports.getExpenseById(expense_id, client);
  params.push(expense_id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, updated_at = now() WHERE expense_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0];
};

exports.deleteExpense = async (expense_id, client = db) => {
  const q = `DELETE FROM ${TABLE} WHERE expense_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [expense_id]);
  return rows[0];
};
