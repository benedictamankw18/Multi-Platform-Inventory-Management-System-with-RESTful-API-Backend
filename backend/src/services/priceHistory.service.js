const { v4: uuidv4 } = require('uuid');
const priceHistoryRepo = require('../repositories/priceHistory.repository');
const productRepo = require('../repositories/product.repository');
const auditRepo = require('../repositories/audit.repository');

async function createPriceHistory({ product_id, price, effective_date = null, changed_by = null } = {}) {
  // ensure product exists
  const product = await productRepo.getProductById(product_id);
  if (!product) throw new Error('Product not found');

  const old_price = product.retail_price != null ? product.retail_price : product.cost_price;
  const history_id = uuidv4();
  const created = await priceHistoryRepo.createPriceHistory({ history_id, product_id, old_price, new_price: price, changed_by, effective_date });

  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'create_price_history', resource_id: history_id, meta: { product_id, old_price, new_price: price }, performed_by: changed_by });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }

  return created;
}

async function listPriceHistory({ product_id = null, page = 1, limit = 50 } = {}) {
  if (product_id) {
    const offset = (page - 1) * limit;
    return priceHistoryRepo.listPriceHistoryByProduct(product_id, { limit, offset });
  }
  // if no product_id, return empty or could implement list-all; for now return empty array
  return [];
}

module.exports = {
  createPriceHistory,
  listPriceHistory,
};
