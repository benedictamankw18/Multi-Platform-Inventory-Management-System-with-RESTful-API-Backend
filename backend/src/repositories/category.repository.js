/**
 * category.repository.js
 *
 * Data-access functions for the `categories` table.
 */

const db = require('../config/db');

exports.createCategory = async ({ categoryId, categoryName, description = null, isActive = true, parent_category_id = null }, client = db) => {
  const query = `
    INSERT INTO categories (category_id, category_name, description, parent_category_id, is_active)
    VALUES ($1, $2, $3, $4, $5 )
    RETURNING *;
  `;
  const { rows } = await client.query(query, [categoryId || null, categoryName, description, parent_category_id, isActive]);
  return rows[0];
};

exports.getCategoryById = async (categoryId, client = db) => {
  const query = `SELECT * FROM categories WHERE category_id = $1 LIMIT 1;`;
  const { rows } = await client.query(query, [categoryId]);
  return rows[0];
};

exports.getCategoryByName = async (categoryName, client = db) => {
  const query = `SELECT * FROM categories WHERE category_name = $1 LIMIT 1;`;
  const { rows } = await client.query(query, [categoryName]);
  return rows[0];
};

exports.searchCategories = async (categoryName, client = db) => {
  const query = `SELECT * FROM categories WHERE category_name ILIKE $1;`;
  const { rows } = await client.query(query, [`%${categoryName}%`]);
  return rows;
};

function buildFilters({ q, isActive } = {}) {
  const conditions = [];
  const values = [];
  if (q) { values.push(`%${q}%`); conditions.push(`(category_name ILIKE $${values.length} OR description ILIKE $${values.length})`); }
  if (isActive !== undefined) { values.push(isActive); conditions.push(`is_active = $${values.length}`); }
  return { whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values };
}

exports.getAllCategories = async (filters = {}, client = db) => {
  const { whereClause, values } = buildFilters(filters);
  const safeLimit = Math.min(Number(filters.limit) || 25, 100);
  const safePage = Math.max(Number(filters.page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const query = `
    SELECT * FROM categories
    ${whereClause}
    ORDER BY category_name
    LIMIT ${safeLimit} OFFSET ${offset};
  `;
  const { rows } = await client.query(query, values);
  return rows;
};

exports.countCategories = async (filters = {}, client = db) => {
  const { whereClause, values } = buildFilters(filters);
  const query = `SELECT COUNT(*) FROM categories ${whereClause};`;
  const { rows } = await client.query(query, values);
  return Number(rows[0].count);
};

exports.updateCategory = async (categoryId, fields = {}, client = db) => {
  const set = [];
  const values = [];
  let idx = 1;

  const allowed = ['category_name', 'description', 'is_active', 'parent_category_id'];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      values.push(fields[key]);
      set.push(`${key} = $${idx}`);
      idx++;
    }
  }

  if (set.length === 0) return exports.getCategoryById(categoryId, client);

  values.push(categoryId);
  const query = `
    UPDATE categories
    SET ${set.join(', ')}, updated_at = now()
    WHERE category_id = $${idx}
    RETURNING *;
  `;
  const { rows } = await client.query(query, values);
  return rows[0];
};

exports.deactivateCategory = async (categoryId, client = db) => {
  const query = `
    UPDATE categories
    SET is_active = FALSE, updated_at = now()
    WHERE category_id = $1
    RETURNING *;
  `;
  const { rows } = await client.query(query, [categoryId]);
  return rows[0];
};

exports.activateCategory = async (categoryId, client = db) => {
  const query = `
    UPDATE categories
    SET is_active = TRUE, updated_at = now()
    WHERE category_id = $1
    RETURNING *;
  `;
  const { rows } = await client.query(query, [categoryId]);
  return rows[0];
};
