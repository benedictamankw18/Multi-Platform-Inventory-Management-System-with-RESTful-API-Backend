const { v4: uuidv4 } = require('uuid');
const priceHistoryRepo = require('../repositories/priceHistory.repository');
const productRepo = require('../repositories/product.repository');
const auditRepo = require('../repositories/audit.repository');

async function createPriceHistory({ product_id, price, effective_date = null, changed_by = null } = {}) {
  const product = await productRepo.getProductById(product_id);
  if (!product) throw new Error('Product not found');

  const old_price = product.retail_price != null ? product.retail_price : product.cost_price;
  const history_id = uuidv4();
  const created = await priceHistoryRepo.createPriceHistory({ history_id, product_id, old_price, new_price: price, changed_by, effective_date });

  try {
    await auditRepo.writeLog(changed_by, 'create_price_history', 'PRICE_HISTORY', history_id, { product_id, old_price, new_price: price });
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
  return [];
}

module.exports = {
  createPriceHistory,
  listPriceHistory,
};
