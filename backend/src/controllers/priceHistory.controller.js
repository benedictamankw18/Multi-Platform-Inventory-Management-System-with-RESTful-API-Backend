const priceHistoryService = require('../services/priceHistory.service');

async function createPriceHistory(req, res, next) {
  try {
    const created = await priceHistoryService.createPriceHistory({
      product_id: req.body.product_id,
      price: req.body.price,
      effective_date: req.body.effective_date,
      changed_by: req.user ? req.user.sub : null,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

async function listPriceHistory(req, res, next) {
  try {
    const { product_id, page = 1, limit = 50 } = req.query || {};
    const results = await priceHistoryService.listPriceHistory({ product_id : product_id, page: Number(page), limit: Number(limit) });
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPriceHistory,
  listPriceHistory,
};
