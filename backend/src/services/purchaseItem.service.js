const { v4: uuidv4 } = require('uuid');
const purchaseItemRepo = require('../repositories/purchaseItem.repository');
const purchaseRepo = require('../repositories/purchase.repository');
const productRepo = require('../repositories/product.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');

function assertDraftStatus(po) {
  if (!po || po.status !== 'DRAFT') {
    throw new AppError('Purchase order items can only be modified while the order is in DRAFT status.', { status: 409 });
  }
}

// Expiry-tracked products must carry an expiry date on the PO line, so the
// batch ledger has something to sort on (FEFO) at receive time. Enforced here,
// at the point the line is created/updated, so problems surface early.
function assertExpiryRequirement(product, expiryDate) {
  if (product && product.expiry_required && !expiryDate) {
    throw new AppError(`Expiry date is required for "${product.product_name}".`, {
      status: 400,
      code: 'EXPIRY_REQUIRED',
    });
  }
}

async function addItemToPurchase({ po_id, product_id, uom_id, quantity, unit_price, discount = 0, expiry_date = null, batch_number = null, serial_number = null, createdBy = null } = {}) {
  const po = await purchaseRepo.getPurchaseOrderById(po_id);
  if (!po) throw new Error('Purchase order not found');
  assertDraftStatus(po);

  const product = await productRepo.getProductById(product_id);
  if (!product) throw new AppError('Product not found.', { status: 404 });
  assertExpiryRequirement(product, expiry_date);

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
  await purchaseRepo.recalculateTotal(po_id);
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
  const item = await purchaseItemRepo.getPurchaseItemById(item_id);
  if (!item) throw new AppError('Purchase order item not found.', { status: 404 });
  const po = await purchaseRepo.getPurchaseOrderById(item.po_id);
  assertDraftStatus(po);
  const mapped = { ...patch };
  if (mapped.quantity !== undefined) { mapped.quantity_ordered = mapped.quantity; delete mapped.quantity }
  if (mapped.unit_price !== undefined) { mapped.unit_cost = mapped.unit_price; delete mapped.unit_price }

  // line_total is derived from the effective quantity, unit cost and discount so
  // a stale or omitted client value can never corrupt the order total.
  const effQty = mapped.quantity_ordered !== undefined ? mapped.quantity_ordered : item.quantity_ordered;
  const effCost = mapped.unit_cost !== undefined ? mapped.unit_cost : item.unit_cost;
  const effDiscount = mapped.discount !== undefined ? mapped.discount : item.discount;
  mapped.line_total = parseFloat((Number(effQty) * Number(effCost) - Number(effDiscount || 0)).toFixed(2));

  // Enforce the expiry requirement against the product/expiry that will apply
  // after this update (only when either is being changed).
  if (mapped.product_id !== undefined || mapped.expiry_date !== undefined) {
    const effectiveProductId = mapped.product_id !== undefined ? mapped.product_id : item.product_id;
    const effectiveExpiry = mapped.expiry_date !== undefined ? mapped.expiry_date : item.expiry_date;
    const product = await productRepo.getProductById(effectiveProductId);
    if (!product) throw new AppError('Product not found.', { status: 404 });
    assertExpiryRequirement(product, effectiveExpiry);
  }

  const updated = await purchaseItemRepo.updatePurchaseItem(item_id, mapped);
  await purchaseRepo.recalculateTotal(item.po_id);
  try {
    await auditRepo.writeLog(performedBy, 'update_purchase_item', 'PURCHASE_ITEM', item_id, patch);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function removeItem(item_id, performedBy) {
  const item = await purchaseItemRepo.getPurchaseItemById(item_id);
  if (!item) throw new AppError('Purchase order item not found.', { status: 404 });
  const po = await purchaseRepo.getPurchaseOrderById(item.po_id);
  assertDraftStatus(po);
  const deleted = await purchaseItemRepo.deletePurchaseItem(item_id);
  await purchaseRepo.recalculateTotal(item.po_id);
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
