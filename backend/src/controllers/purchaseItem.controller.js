const purchaseItemService = require('../services/purchaseItem.service');

async function createPurchaseItem(req, res, next) {
  try {
    const po_id = req.params.purchaseId;
    const created = await purchaseItemService.addItemToPurchase({
      po_id,
      product_id: req.body.product_id,
      uom_id: req.body.uom_id,
      quantity: req.body.quantity,
      unit_price: req.body.unit_price,
      discount: req.body.discount,
      expiry_date: req.body.expiry_date,
      batch_number: req.body.batch_number,
      serial_number: req.body.serial_number,
      createdBy: req.user ? req.user.sub : null,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

async function listPurchaseItems(req, res, next) {
  try {
    const po_id = req.params.purchaseId;
    const { page = 1, limit = 100 } = req.query || {};
    const offset = (page - 1) * limit;
    const results = await purchaseItemService.listItems(po_id, { limit: Number(limit), offset: Number(offset) });
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

async function updatePurchaseItem(req, res, next) {
  try {
    const item_id = req.params.itemId;
    const updated = await purchaseItemService.updateItem(item_id, req.body, req.user ? req.user.sub : null);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

async function deletePurchaseItem(req, res, next) {
  try {
    const item_id = req.params.itemId;
    const deleted = await purchaseItemService.removeItem(item_id, req.user ? req.user.sub : null);
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPurchaseItem,
  listPurchaseItems,
  updatePurchaseItem,
  deletePurchaseItem,
};
