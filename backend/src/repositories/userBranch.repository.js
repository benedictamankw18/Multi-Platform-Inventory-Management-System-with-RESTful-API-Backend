const db = require('../config/db');

const TABLE = 'user_branches';

exports.addUserBranch = async ({ user_id, branch_id }, client = db) => {
  const q = `INSERT INTO ${TABLE} (user_id, branch_id) VALUES ($1,$2) RETURNING *`;
  const { rows } = await client.query(q, [user_id, branch_id]);
  return rows[0];
};

exports.removeUserBranch = async (user_id, branch_id, client = db) => {
  const q = `DELETE FROM ${TABLE} WHERE user_id = $1 AND branch_id = $2 RETURNING *`;
  const { rows } = await client.query(q, [user_id, branch_id]);
  return rows[0];
};

exports.listBranchesForUser = async (user_id, client = db) => {
  const q = `SELECT b.* FROM ${TABLE} ub JOIN branches b ON b.branch_id = ub.branch_id WHERE ub.user_id = $1 ORDER BY b.branch_name`;
  const { rows } = await client.query(q, [user_id]);
  return rows;
};

exports.listUsersForBranch = async (branch_id, client = db) => {
  const q = `SELECT ub.user_id FROM ${TABLE} ub WHERE ub.branch_id = $1`;
  const { rows } = await client.query(q, [branch_id]);
  return rows.map(r => r.user_id);
};
