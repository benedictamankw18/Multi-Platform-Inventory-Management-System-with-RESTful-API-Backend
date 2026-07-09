/**
 * product.repository.js
 *
 * Data-access layer for the `products` table. Thin wrappers around SQL
 * statements. All functions accept an optional `client` for transactional
 * callers.
 */

const db = require('../config/db');

exports.createProduct = async (
  {
    productId,
    sku,
    barcode = null,
    productName,
    categoryId = null,
    supplierId = null,
    baseUomId,
    costPrice = 0,
    retailPrice = null,
    wholesaleUomId = null,
    wholesaleConversionFactor = null,
    wholesalePrice = null,
    wholesaleMinQty = null,
    isActive = true,
  },
  client = db
) => {
  const query = `
    INSERT INTO products (
      product_id, sku, barcode, product_name, category_id, supplier_id,
      base_uom_id, cost_price, retail_price, wholesale_uom_id,
      wholesale_conversion_factor, wholesale_price, wholesale_min_qty, is_active
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *;
  `;
  const params = [
    productId || null,
    sku,
    barcode,
    productName,
    categoryId,
    supplierId,
    baseUomId,
    costPrice,
    retailPrice,
    wholesaleUomId,
    wholesaleConversionFactor,
    wholesalePrice,
    wholesaleMinQty,
    isActive,
  ];

  const { rows } = await client.query(query, params);
  return rows[0];
};

exports.getProductById = async (productId, client = db) => {
  const query = `SELECT * FROM products WHERE product_id = $1 LIMIT 1;`;
  const { rows } = await client.query(query, [productId]);
  return rows[0];
};

exports.getProductBySku = async (sku, client = db) => {
  const query = `SELECT * FROM products WHERE sku = $1 LIMIT 1;`;
  const { rows } = await client.query(query, [sku]);
  return rows[0];
};

exports.getProductByBarcode = async (barcode, client = db) => {
  const query = `SELECT * FROM products WHERE barcode = $1 LIMIT 1;`;
  const { rows } = await client.query(query, [barcode]);
  return rows[0];
};

function buildFilters({ q, categoryId, supplierId, isActive } = {}) {
  const conditions = [];
  const values = [];

  if (q) {
    values.push(`%${q}%`);
    conditions.push(`(product_name ILIKE $${values.length} OR sku ILIKE $${values.length} OR barcode ILIKE $${values.length})`);
  }
  if (categoryId) { values.push(categoryId); conditions.push(`category_id = $${values.length}`); }
  if (supplierId) { values.push(supplierId); conditions.push(`supplier_id = $${values.length}`); }
  if (isActive !== undefined) { values.push(isActive); conditions.push(`is_active = $${values.length}`); }

  return { whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values };
}

exports.getAllProducts = async (filters = {}, client = db) => {
  const { whereClause, values } = buildFilters(filters);
  const safeLimit = Math.min(Number(filters.limit) || 25, 100);
  const safePage = Math.max(Number(filters.page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const query = `
    SELECT * FROM products
    ${whereClause}
    ORDER BY product_name
    LIMIT ${safeLimit} OFFSET ${offset};
  `;

  const { rows } = await client.query(query, values);
  return rows;
};

exports.countProducts = async (filters = {}, client = db) => {
  const { whereClause, values } = buildFilters(filters);
  const query = `SELECT COUNT(*) FROM products ${whereClause};`;
  const { rows } = await client.query(query, values);
  return Number(rows[0].count);
};

exports.updateProduct = async (productId, fields = {}, client = db) => {
  const set = [];
  const values = [];
  let idx = 1;

  const allowed = [
    'sku','barcode','product_name','category_id','supplier_id','base_uom_id','cost_price','retail_price',
    'wholesale_uom_id','wholesale_conversion_factor','wholesale_price','wholesale_min_qty','is_active'
  ];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      values.push(fields[key]);
      set.push(`${key} = $${idx}`);
      idx++;
    }
  }

  if (set.length === 0) {
    return exports.getProductById(productId, client);
  }

  values.push(productId);
  const query = `
    UPDATE products
    SET ${set.join(', ')}, updated_at = now()
    WHERE product_id = $${idx}
    RETURNING *;
  `;

  const { rows } = await client.query(query, values);
  return rows[0];
};

exports.deactivateProduct = async (productId, client = db) => {
  const query = `
    UPDATE products
    SET is_active = FALSE, updated_at = now()
    WHERE product_id = $1
    RETURNING *;
  `;
  const { rows } = await client.query(query, [productId]);
  return rows[0];
};

exports.activateProduct = async (productId, client = db) => {
  const query = `
    UPDATE products
    SET is_active = TRUE, updated_at = now()
    WHERE product_id = $1
    RETURNING *;
  `;
  const { rows } = await client.query(query, [productId]);
  return rows[0];
};
