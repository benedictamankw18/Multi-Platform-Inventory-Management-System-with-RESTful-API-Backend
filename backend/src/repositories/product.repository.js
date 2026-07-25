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
    cost_price = 0,
    retail_price = null,
    wholesaleUomId = null,
    wholesaleConversionFactor = null,
    wholesale_price = null,
    wholesaleMinQty = null,
    isActive = true,
    description = null,
    image_url = null,
    brand = null,
    model = null,
    manufacturer = null,
    weight = null,
    length = null,
    width = null,
    height = null,
    tax_rate = 0,
    discount_percentage = 0,
    minimum_stock = 0,
    maximum_stock = null,
    serial_number_required = false,
    expiry_required = false,
    track_inventory = true,
  },
  client = db
) => {
  const query = `
    INSERT INTO products (
      product_id, sku, barcode, product_name, category_id, supplier_id,
      base_uom_id, cost_price, retail_price, wholesale_uom_id,
      wholesale_conversion_factor, wholesale_price, wholesale_min_qty, is_active,
      description, image_url, brand, model, manufacturer,
      weight, length, width, height, tax_rate, discount_percentage,
      minimum_stock, maximum_stock, serial_number_required, expiry_required, track_inventory
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
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
    cost_price,
    retail_price,
    wholesaleUomId,
    wholesaleConversionFactor,
    wholesale_price,
    wholesaleMinQty,
    isActive,
    description,
    image_url,
    brand,
    model,
    manufacturer,
    weight,
    length,
    width,
    height,
    tax_rate,
    discount_percentage,
    minimum_stock,
    maximum_stock,
    serial_number_required,
    expiry_required,
    track_inventory,
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

function buildFilters({ q, categoryId, supplierId, isActive, branchId } = {}) {
  const conditions = [];
  const values = [];

  if (q) {
    values.push(`%${q}%`);
    conditions.push(`(p.product_name ILIKE $${values.length} OR p.sku ILIKE $${values.length} OR p.barcode ILIKE $${values.length})`);
  }
  if (categoryId) { values.push(categoryId); conditions.push(`p.category_id = $${values.length}`); }
  if (supplierId) { values.push(supplierId); conditions.push(`p.supplier_id = $${values.length}`); }
  if (isActive !== undefined) { values.push(isActive); conditions.push(`p.is_active = $${values.length}`); }

  return { whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values, hasJoin: Boolean(branchId) };
}

exports.getAllProducts = async (filters = {}, client = db) => {
  const { whereClause, values, hasJoin } = buildFilters(filters);
  const safeLimit = Math.min(Number(filters.limit) || 25, 10000);
  const safePage = Math.max(Number(filters.page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const join = hasJoin ? `INNER JOIN product_branch_inventory pbi ON p.product_id = pbi.product_id AND pbi.branch_id = $${values.length + 1}` : '';
  if (hasJoin) values.push(filters.branchId);

  const query = `
    SELECT p.*,
      (SELECT pi.image_url FROM product_images pi
       WHERE pi.product_id = p.product_id AND pi.is_primary = true
       LIMIT 1) AS primary_image_url
    FROM products p
    ${join}
    ${whereClause}
    ORDER BY p.product_name
    LIMIT ${safeLimit} OFFSET ${offset};
  `;

  const { rows } = await client.query(query, values);
  return rows;
};

exports.countProducts = async (filters = {}, client = db) => {
  const { whereClause, values, hasJoin } = buildFilters(filters);
  const join = hasJoin ? `INNER JOIN product_branch_inventory pbi ON p.product_id = pbi.product_id AND pbi.branch_id = $${values.length + 1}` : '';
  if (hasJoin) values.push(filters.branchId);
  const query = `SELECT COUNT(*) FROM products p ${join} ${whereClause};`;
  const { rows } = await client.query(query, values);
  return Number(rows[0].count);
};

exports.updateProduct = async (productId, fields = {}, client = db) => {
  const set = [];
  const values = [];
  let idx = 1;

  const allowed = [
    'sku','barcode','product_name','category_id','supplier_id','base_uom_id','cost_price','retail_price',
    'wholesale_uom_id','wholesale_conversion_factor','wholesale_price','wholesale_min_qty','is_active',
    'description','image_url','brand','model','manufacturer',
    'weight','length','width','height','tax_rate','discount_percentage',
    'minimum_stock','maximum_stock','serial_number_required','expiry_required','track_inventory'
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
