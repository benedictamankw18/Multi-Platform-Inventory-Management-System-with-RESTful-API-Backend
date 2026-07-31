/**
 * product.service.js
 *
 * Business logic for products. Uses product.repository for SQL and audit.repository
 * for audit logging.
 */

const productRepo = require('../repositories/product.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');
const { v4: uuidv4 } = require('uuid');
const priceHistoryService = require('./priceHistory.service');

exports.createProduct = async (payload, actorId = null) => {
  // Basic required fields
  const {
    sku,
    product_name: productName,
    base_uom_id: baseUomId,
  } = payload;

  if (!sku || !productName || !baseUomId) {
    throw new AppError('sku, product_name and base_uom_id are required.', { status: 400 });
  }

  // Ensure SKU uniqueness
  const existing = await productRepo.getProductBySku(sku);
  if (existing) {
    throw new AppError('A product with this SKU already exists.', { status: 409 });
  }

  const productId = uuidv4();

  const created = await productRepo.createProduct({ productId, sku, productName, baseUomId, ...payload });

  // Audit log (fire-and-forget is acceptable)
  await auditRepo.writeLog(actorId, 'CREATE_PRODUCT', 'PRODUCT', created.product_id, { sku: created.sku, name: created.product_name });

  return created;
};

exports.getProductById = async (productId) => {
  const p = await productRepo.getProductById(productId);
  if (!p) throw new AppError('Product not found.', { status: 404 });
  return p;
};

exports.listProducts = async (filters = {}) => {
  const { branch_id: branchId, ...rest } = filters;
  const products = await productRepo.getAllProducts({ ...rest, branchId });
  const total = await productRepo.countProducts({ ...rest, branchId });
  return { products, total };
};

exports.updateProduct = async (productId, fields, actorId = null) => {
  const existing = await productRepo.getProductById(productId);
  if (!existing) throw new AppError('Product not found.', { status: 404 });

  // Prevent SKU collision
  if (fields.sku && fields.sku !== existing.sku) {
    const dup = await productRepo.getProductBySku(fields.sku);
    if (dup) throw new AppError('Another product already uses this SKU.', { status: 409 });
  }

  const updated = await productRepo.updateProduct(productId, fields);
  await auditRepo.writeLog(actorId, 'UPDATE_PRODUCT', 'PRODUCT', productId, fields);

  const priceFields = ['retail_price', 'cost_price', 'wholesale_price'];
  for (const field of priceFields) {
    if (field in fields && Number(fields[field]) !== Number(existing[field] || 0)) {
      const oldVal = existing[field] != null ? Number(existing[field]) : null;
      const newVal = Number(fields[field]);
      priceHistoryService.createPriceHistory({
        product_id: productId,
        old_price: oldVal,
        price: newVal,
        changed_by: actorId,
      }).catch((e) => console.error('price history error', e.message));
    }
  }

  return updated;
};

exports.deactivateProduct = async (productId, actorId = null) => {
  const existing = await productRepo.getProductById(productId);
  if (!existing) throw new AppError('Product not found.', { status: 404 });
  if (!existing.is_active) return { alreadyInState: true, product: existing };

  const deactivated = await productRepo.deactivateProduct(productId);
  await auditRepo.writeLog(actorId, 'DEACTIVATE_PRODUCT', 'PRODUCT', productId, null);
  return { alreadyInState: false, product: deactivated };
};


exports.activateProduct = async (productId, actorId = null) => {
  const existing = await productRepo.getProductById(productId);
  if (!existing) throw new AppError('Product not found.', { status: 404 });
  if (existing.is_active) return { alreadyInState: true, product: existing };

  const activated = await productRepo.activateProduct(productId);
  await auditRepo.writeLog(actorId, 'REACTIVATE_PRODUCT', 'PRODUCT', productId, null);
  return { alreadyInState: false, product: activated };
};
