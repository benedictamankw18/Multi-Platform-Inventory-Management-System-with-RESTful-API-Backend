const { v4: uuidv4 } = require('uuid');
const purchaseItemRepo = require('../repositories/purchaseItem.repository');
const purchaseRepo = require('../repositories/purchase.repository');
const auditRepo = require('../repositories/audit.repository');

async function addItemToPurchase({ po_id, product_id, uom_id, quantity, unit_price, discount = 0, expiry_date = null, batch_number = null, serial_number = null, createdBy = null } = {}) {
  const po = await purchaseRepo.getPurchaseOrderById(po_id);
  if (!po) throw new Error('Purchase order not found');

  const po_item_id = uuidv4();
  const quantity_ordered = Number(quantity || 0);
  const unit_cost = Number(unit_price || 0);
  const discountAmount = Number(discount || 0);
  const line_total = parseFloat((quantity_ordered * unit_cost - discountAmount).toFixed(2));

  const created = await purchaseItemRepo.createPurchaseItem({
    po_item_id,
    po_id,
    product_id,
    uom_id,
    quantity_ordered,
    unit_cost,
    line_total,
    discount: discountAmount,
    expiry_date,
    batch_number,
    serial_number,
  });
  try {
    await auditRepo.writeLog(createdBy, 'create_purchase_item', 'PURCHASE_ITEM', po_item_id, { po_id, product_id, uom_id, quantity_ordered, unit_cost, discount: discountAmount });
  } catch (e) {
    console.error('audit error', e.message);
  }
  return created;
}

async function listItems(po_id, { limit = 100, offset = 0 } = {}) {
  return purchaseItemRepo.listItemsByPurchase(po_id, { limit, offset });
}

async function updateItem(item_id, patch, performedBy) {
  const mapped = { ...patch };
  if (mapped.quantity !== undefined) { mapped.quantity_ordered = mapped.quantity; delete mapped.quantity }
  if (mapped.unit_price !== undefined) { mapped.unit_cost = mapped.unit_price; delete mapped.unit_price }
  const updated = await purchaseItemRepo.updatePurchaseItem(item_id, mapped);
  try {
    await auditRepo.writeLog(performedBy, 'update_purchase_item', 'PURCHASE_ITEM', item_id, patch);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function removeItem(item_id, performedBy) {
  const deleted = await purchaseItemRepo.deletePurchaseItem(item_id);
  try {
    await auditRepo.writeLog(performedBy, 'delete_purchase_item', 'PURCHASE_ITEM', item_id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return deleted;
}

module.exports = {
  addItemToPurchase,
  listItems,
  updateItem,
  removeItem,
};
