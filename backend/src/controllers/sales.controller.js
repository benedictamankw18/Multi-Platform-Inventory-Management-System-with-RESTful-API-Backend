const salesService = require('../services/sales.service');

async function createSale(req, res, next) {
  try {
    const created = await salesService.createSale(req.body, req.user);
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

async function listSales(req, res, next) {
  try {
    const results = await salesService.listSales(req.query);
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

async function searchSales(req, res, next) {
  try {
    const results = await salesService.listSales(req.body);
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

async function getSaleById(req, res, next) {
  try {
    const sale = await salesService.getSaleById(req.params.saleId);
    res.json({ data: sale });
  } catch (err) {
    next(err);
  }
}

async function getSaleItems(req, res, next) {
  try {
    const items = await salesService.getSaleItems(req.params.saleId);
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
}

async function getSaleReceipt(req, res, next) {
  try {
    const receipt = await salesService.getSaleReceipt(req.params.saleId, req.user);
    res.json({ data: receipt });
  } catch (err) {
    next(err);
  }
}

async function voidSale(req, res, next) {
  try {
    const sale = await salesService.voidSale(req.params.saleId, req.user);
    res.json({ data: sale });
  } catch (err) {
    next(err);
  }
}

async function refundSale(req, res, next) {
  try {
    const sale = await salesService.refundSale(req.params.saleId, req.body, req.user);
    res.json({ data: sale });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSale,
  listSales,
  searchSales,
  getSaleById,
  getSaleItems,
  getSaleReceipt,
  voidSale,
  refundSale,
};
