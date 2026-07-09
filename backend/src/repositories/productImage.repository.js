const db = require('../config/db');

const TABLE = 'product_images';

exports.createProductImage = async ({ image_id, product_id, image_url, is_primary = false }, client = db) => {
  const q = `INSERT INTO ${TABLE} (image_id, product_id, image_url, is_primary) VALUES ($1,$2,$3,$4) RETURNING *`;
  const { rows } = await client.query(q, [image_id, product_id, image_url, is_primary]);
  return rows[0];
};

exports.getImagesByProductId = async (product_id, client = db) => {
  const q = `SELECT * FROM ${TABLE} WHERE product_id = $1 ORDER BY created_at ASC`;
  const { rows } = await client.query(q, [product_id]);
  return rows;
};

exports.getPrimaryImage = async (product_id, client = db) => {
  const q = `SELECT * FROM ${TABLE} WHERE product_id = $1 AND is_primary = true LIMIT 1`;
  const { rows } = await client.query(q, [product_id]);
  return rows[0];
};

exports.updateProductImage = async (image_id, patch, client = db) => {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of Object.keys(patch)) {
    fields.push(`${key} = $${idx}`);
    params.push(patch[key]);
    idx++;
  }
  if (!fields.length) return exports.getImageById(image_id, client);
  params.push(image_id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, created_at = now() WHERE image_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0];
};

exports.getImageById = async (image_id, client = db) => {
  const q = `SELECT * FROM ${TABLE} WHERE image_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [image_id]);
  return rows[0];
};

exports.deleteProductImage = async (image_id, client = db) => {
  const q = `DELETE FROM ${TABLE} WHERE image_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [image_id]);
  return rows[0];
};
