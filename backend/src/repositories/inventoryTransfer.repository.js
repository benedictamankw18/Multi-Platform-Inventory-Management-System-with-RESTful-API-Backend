const client = require('../config/db');

const TABLE = 'inventory_transfers';

async function createTransfer({ transfer_id, product_id, from_branch_id, to_branch_id, quantity, status = 'PENDING', requested_by = null, approved_by = null, requested_at = null, approved_at = null, notes = null, transfer_number = null, shipped_at = null, received_at = null, received_by = null }) {
  if(!transfer_id){
    throw new Error('transfer_id is required');
  }
  const q = `INSERT INTO ${TABLE} (transfer_id, product_id, from_branch_id, to_branch_id, quantity, status, requested_by, approved_by, requested_at, approved_at, notes, transfer_number, shipped_at, received_at, received_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`;
  const now = new Date();
  const values = [transfer_id, product_id, from_branch_id, to_branch_id, quantity, status, requested_by, approved_by, requested_at ?? new Date(), approved_at || null, notes || null, transfer_number || null, shipped_at || null, received_at || null, received_by || null];
  const { rows } = await client.query(q, values);
  return rows[0] || null;
}

async function getTransferById(id) {
  const q = `SELECT * FROM ${TABLE} WHERE transfer_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [id]);
  return rows[0] || null;
}

async function listTransfers({ productId, fromBranchId, toBranchId, status, startDate, endDate, limit = 25, offset = 0 }) {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (productId) { params.push(productId); where.push(`product_id = $${params.length}`); }
  if (fromBranchId) { params.push(fromBranchId); where.push(`from_branch_id = $${params.length}`); }
  if (toBranchId) { params.push(toBranchId); where.push(`to_branch_id = $${params.length}`); }
  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  if (startDate) { params.push(startDate); where.push(`requested_at >= $${params.length}`); }
  if (endDate) { params.push(endDate); where.push(`requested_at <= $${params.length}`); }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  params.push(limit);
  params.push(offset);
  base += ` ORDER BY requested_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await client.query(base, params);
  return rows;
}

async function updateTransfer(id, patch) {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of Object.keys(patch)) {
    fields.push(`${key} = $${idx}`);
    params.push(patch[key]);
    idx++;
  }
  if (!fields.length) return getTransferById(id);
  params.push(id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')} WHERE transfer_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0] || null;
}

async function deleteTransfer(id) {
  const q = `DELETE FROM ${TABLE} WHERE transfer_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [id]);
  return rows[0] || null;
}

async function deactivateTransfer(id) {
  const q = `UPDATE ${TABLE} SET status = 'DRAFT' WHERE transfer_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [id]);
  return rows[0] || null;
}

async function activateTransfer(id) {
  const q = `UPDATE ${TABLE} SET status = 'PENDING'  WHERE transfer_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [id]);
  return rows[0] || null;
}

async function approveTransfer(id, approved_by) {
  const q = `UPDATE ${TABLE} SET status = 'APPROVED', approved_by = $1, received_by = $1, approved_at = NOW(), received_at = NOW()   WHERE transfer_id = $2 RETURNING *`;
  const { rows } = await client.query(q, [ approved_by, id]);
  return rows[0] || null;
}

async function rejectTransfer(id) {
  const q = `UPDATE ${TABLE} SET status = 'REJECTED' WHERE transfer_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [id]);
  return rows[0] || null;
}

module.exports = {
  createTransfer,
  getTransferById,
  listTransfers,
  updateTransfer,
  deleteTransfer,
  deactivateTransfer,
  approveTransfer,
  rejectTransfer,
  activateTransfer,
};
