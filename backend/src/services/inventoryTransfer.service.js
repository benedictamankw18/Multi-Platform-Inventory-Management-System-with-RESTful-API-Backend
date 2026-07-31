const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/AppError');
const transferRepo = require('../repositories/inventoryTransfer.repository');
const auditRepo = require('../repositories/audit.repository');
const productRepo = require('../repositories/product.repository');
const branchRepo = require('../repositories/branch.repository');
const productBranchInventoryRepo = require('../repositories/productBranchInventory.repository');
const inventoryRepo = require('../repositories/inventory.repository');
const notificationRepo = require('../repositories/notification.repository');
const notificationService = require('./notification.service');

function generateTransferNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `TRF-${date}-${rand}`;
}

async function createTransfer({ product_id, from_branch_id, to_branch_id, quantity, transfer_date, notes, createdBy }) {
  if (from_branch_id === to_branch_id) {
    throw new AppError('Source and destination branches must be different.', { status: 400, code: 'INVALID_BRANCHES' });
  }

  const product = await productRepo.getProductById(product_id);
  if (!product)     throw new AppError('Product not found.', { status: 404, code: 'PRODUCT_NOT_FOUND' });

  const pbi = await productBranchInventoryRepo.getInventoryByProductAndBranch(product_id, from_branch_id);
  const available = pbi ? Number(pbi.quantity_on_hand || 0) : 0;
  if (available < Number(quantity)) {
    const fromBranch = await branchRepo.getBranchById(from_branch_id).catch(() => null);
    if (fromBranch) {
      const shortageRecipients = await notificationRepo.findUsersWithPermissionAtBranch(
        ['MANAGE_INVENTORY', 'MANAGE_SETTINGS'], from_branch_id
      );
      if (shortageRecipients.length) {
        notificationService.createNotification({
          title: 'Branch Inventory Shortage',
          message: `Insufficient stock for "${product.product_name}" at ${fromBranch.branch_name}. Available: ${available}, requested: ${quantity}.`,
          branch_id: from_branch_id,
          type: 'BRANCH_SHORTAGE',
          priority: 'HIGH',
          createdBy,
          recipients: shortageRecipients,
        }).catch(() => {});
      }
    }
    throw new AppError(`Insufficient stock for "${product.product_name}" at source branch. Available: ${available}, requested: ${quantity}.`, { status: 400, code: 'INSUFFICIENT_STOCK' });
  }

  const id = uuidv4();
  const transfer_number = generateTransferNumber();
  const created = await transferRepo.createTransfer({
    transfer_id: id, product_id, from_branch_id, to_branch_id, quantity,
    transfer_number, requested_at: transfer_date, notes, requested_by: createdBy,
  });

  try {
    await auditRepo.writeLog(createdBy, 'create_inventory_transfer', 'INVENTORY_TRANSFER', id, { product_id, from_branch_id, to_branch_id, quantity });
  } catch (e) {
    console.error('audit error', e.message);
  }

  try {
    const toBranch = await branchRepo.getBranchById(to_branch_id);
    if (toBranch) {
      const recipients = await require('../repositories/notification.repository').findUsersWithPermissionAtBranch(
        ['MANAGE_INVENTORY', 'MANAGE_SETTINGS'], to_branch_id
      );
      if (recipients.length) {
        await notificationService.createNotification({
          title: 'Transfer Request',
          message: `New inventory transfer request for "${product.product_name}" from ${created.from_branch_name || 'source branch'} to ${toBranch.branch_name}. Quantity: ${quantity}.`,
          branch_id: to_branch_id,
          type: 'TRANSFER_REQUEST',
          priority: 'NORMAL',
          createdBy,
          recipients,
        });
      }
    }
  } catch (e) {
    console.error('transfer notification error', e.message);
  }

  return created;
}

async function getTransferById(id) {
  return transferRepo.getTransferById(id);
}

async function listTransfers(query) {
  const { q, productId, fromBranchId, toBranchId, branchId, status, startDate, endDate, requestedBy, page = 1, limit = 25 } = query || {};
  const offset = (page - 1) * limit;
  const [items, total] = await Promise.all([
    transferRepo.listTransfers({ q, productId, fromBranchId, toBranchId, branchId, status, startDate, endDate, requestedBy, limit, offset }),
    transferRepo.countTransfers({ productId, fromBranchId, toBranchId, branchId, status, startDate, endDate, requestedBy }),
  ]);
  return { items, total };
}

async function updateTransfer(id, patch, performedBy) {
  const existing = await transferRepo.getTransferById(id);
  if (!existing) throw new AppError('Transfer not found.', { status: 404, code: 'TRANSFER_NOT_FOUND' });
  if (existing.status !== 'DRAFT') throw new AppError('Only draft transfers can be edited.', { status: 400, code: 'INVALID_STATUS' });

  const updated = await transferRepo.updateTransfer(id, patch);
  try {
    await auditRepo.writeLog(performedBy, 'update_inventory_transfer', 'INVENTORY_TRANSFER', id, patch);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function deactivateTransfer(id, performedBy) {
  const existing = await transferRepo.getTransferById(id);
  if (!existing) throw new AppError('Transfer not found.', { status: 404, code: 'TRANSFER_NOT_FOUND' });
  if (existing.status !== 'PENDING') throw new AppError('Only pending transfers can be sent back to draft.', { status: 400, code: 'INVALID_STATUS' });

  const deactivated = await transferRepo.deactivateTransfer(id);
  try {
    await auditRepo.writeLog(performedBy, 'deactivate_inventory_transfer', 'INVENTORY_TRANSFER', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return deactivated;
}

async function activateTransfer(id, performedBy) {
  const existing = await transferRepo.getTransferById(id);
  if (!existing) throw new AppError('Transfer not found.', { status: 404, code: 'TRANSFER_NOT_FOUND' });
  if (existing.status !== 'DRAFT') throw new AppError('Only draft transfers can be submitted for approval.', { status: 400, code: 'INVALID_STATUS' });

  const activated = await transferRepo.activateTransfer(id);
  try {
    await auditRepo.writeLog(performedBy, 'activate_inventory_transfer', 'INVENTORY_TRANSFER', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return activated;
}

async function approveTransfer(id, performedBy, userBranchId) {
  const existing = await transferRepo.getTransferById(id);
  if (!existing) throw new AppError('Transfer not found.', { status: 404, code: 'TRANSFER_NOT_FOUND' });
  if (existing.status !== 'PENDING') throw new AppError('Only pending transfers can be approved.', { status: 400, code: 'INVALID_STATUS' });
  if (existing.requested_by === performedBy) throw new AppError('You cannot approve your own transfer request.', { status: 400, code: 'CANNOT_APPROVE_OWN' });
  if (userBranchId && existing.to_branch_id !== userBranchId) throw new AppError('Only users at the destination branch can approve this transfer.', { status: 403, code: 'WRONG_BRANCH' });

  const approved = await transferRepo.approveTransfer(id, performedBy);

  try {
    await auditRepo.writeLog(performedBy, 'approve_inventory_transfer', 'INVENTORY_TRANSFER', id);
  } catch (e) {
    console.error('audit error', e.message);
  }

  try {
    if (existing.requested_by) {
      const product = await productRepo.getProductById(existing.product_id);
      await notificationService.createNotification({
        title: 'Transfer Approved',
        message: `Your transfer request for "${product ? product.product_name : 'product'}" (${approved.transfer_number}) has been approved and is ready to ship.`,
        branch_id: existing.from_branch_id,
        type: 'INFO',
        priority: 'NORMAL',
        createdBy: performedBy,
        recipients: [existing.requested_by],
      });
    }
  } catch (e) {
    console.error('transfer notification error', e.message);
  }

  return approved;
}

async function shipTransfer(id, performedBy, userBranchId) {
  const existing = await transferRepo.getTransferById(id);
  if (!existing) throw new AppError('Transfer not found.', { status: 404, code: 'TRANSFER_NOT_FOUND' });
  if (existing.status !== 'APPROVED') throw new AppError('Only approved transfers can be shipped.', { status: 400, code: 'INVALID_STATUS' });
  if (userBranchId && existing.from_branch_id !== userBranchId) throw new AppError('Only users at the source branch can ship this transfer.', { status: 403, code: 'WRONG_BRANCH' });

  const product = await productRepo.getProductById(existing.product_id);
  const pbi = await productBranchInventoryRepo.getInventoryByProductAndBranch(existing.product_id, existing.from_branch_id);
  const available = pbi ? Number(pbi.quantity_on_hand || 0) : 0;
  if (available < Number(existing.quantity)) {
    throw new AppError(`Insufficient stock for "${product ? product.product_name : existing.product_id}". Available: ${available}, transfer quantity: ${existing.quantity}.`, { status: 400, code: 'INSUFFICIENT_STOCK' });
  }

  const shipped = await transferRepo.shipTransfer(id, performedBy);

  try {
    const sourceQty = available - Number(existing.quantity);
    if (pbi) {
      await productBranchInventoryRepo.updateInventory(pbi.inventory_id, { quantity_on_hand: sourceQty, available_quantity: sourceQty });
    }

    const txId = uuidv4();
    await inventoryRepo.createTransaction({
      transaction_id: txId, product_id: existing.product_id, branch_id: existing.from_branch_id,
      transaction_type: 'TRANSFER_OUT', quantity: existing.quantity,
      previous_quantity: available, new_quantity: sourceQty, performed_by: performedBy,
      notes: `Transfer ${shipped.transfer_number} shipped to ${existing.to_branch_name || existing.to_branch_id}`,
    });
  } catch (e) {
    console.error('transfer ship inventory adjustment error', e.message);
  }

  try {
    await auditRepo.writeLog(performedBy, 'ship_inventory_transfer', 'INVENTORY_TRANSFER', id);
  } catch (e) {
    console.error('audit error', e.message);
  }

  try {
    const toBranchUsers = await require('../repositories/notification.repository').findUsersWithPermissionAtBranch(
      ['MANAGE_INVENTORY'], existing.to_branch_id
    );
    if (toBranchUsers.length) {
      await notificationService.createNotification({
        title: 'Transfer Shipped',
        message: `Transfer "${shipped.transfer_number}" for "${product ? product.product_name : 'product'}" has been shipped from ${existing.from_branch_name || 'source branch'} and is on its way.`,
        branch_id: existing.to_branch_id,
        type: 'INFO',
        priority: 'NORMAL',
        createdBy: performedBy,
        recipients: toBranchUsers,
      });
    }
    if (existing.requested_by) {
      await notificationService.createNotification({
        title: 'Transfer Shipped',
        message: `Your transfer request "${shipped.transfer_number}" for "${product ? product.product_name : 'product'}" has been shipped.`,
        branch_id: existing.from_branch_id,
        type: 'INFO',
        priority: 'NORMAL',
        createdBy: performedBy,
        recipients: [existing.requested_by],
      });
    }
  } catch (e) {
    console.error('transfer notification error', e.message);
  }

  return shipped;
}

async function receiveTransfer(id, performedBy, userBranchId) {
  const existing = await transferRepo.getTransferById(id);
  if (!existing) throw new AppError('Transfer not found.', { status: 404, code: 'TRANSFER_NOT_FOUND' });
  if (existing.status !== 'SHIPPED') throw new AppError('Only shipped transfers can be received.', { status: 400, code: 'INVALID_STATUS' });
  if (userBranchId && existing.to_branch_id !== userBranchId) throw new AppError('Only users at the destination branch can receive this transfer.', { status: 403, code: 'WRONG_BRANCH' });

  const received = await transferRepo.receiveTransfer(id, performedBy);

  try {
    let destPbi = await productBranchInventoryRepo.getInventoryByProductAndBranch(existing.product_id, existing.to_branch_id);
    const destQty = destPbi ? Number(destPbi.quantity_on_hand || 0) + Number(existing.quantity) : Number(existing.quantity);
    if (destPbi) {
      await productBranchInventoryRepo.updateInventory(destPbi.inventory_id, { quantity_on_hand: destQty, available_quantity: destQty });
    } else {
      const inventory_id = uuidv4();
      await productBranchInventoryRepo.createInventoryRecord({ inventory_id, product_id: existing.product_id, branch_id: existing.to_branch_id, quantity_on_hand: destQty, available_quantity: destQty });
    }

    const txId = uuidv4();
    await inventoryRepo.createTransaction({
      transaction_id: txId, product_id: existing.product_id, branch_id: existing.to_branch_id,
      transaction_type: 'TRANSFER_IN', quantity: existing.quantity,
      previous_quantity: destPbi ? Number(destPbi.quantity_on_hand || 0) : 0, new_quantity: destQty,
      performed_by: performedBy,
      notes: `Transfer ${received.transfer_number} received from ${existing.from_branch_name || existing.from_branch_id}`,
    });
  } catch (e) {
    console.error('transfer receive inventory adjustment error', e.message);
  }

  try {
    await auditRepo.writeLog(performedBy, 'receive_inventory_transfer', 'INVENTORY_TRANSFER', id);
  } catch (e) {
    console.error('audit error', e.message);
  }

  try {
    if (existing.requested_by) {
      const product = await productRepo.getProductById(existing.product_id);
      await notificationService.createNotification({
        title: 'Transfer Received',
        message: `Your transfer request "${received.transfer_number}" for "${product ? product.product_name : 'product'}" has been received at ${existing.to_branch_name || 'destination branch'}.`,
        branch_id: existing.to_branch_id,
        type: 'INFO',
        priority: 'NORMAL',
        createdBy: performedBy,
        recipients: [existing.requested_by],
      });
    }
  } catch (e) {
    console.error('transfer notification error', e.message);
  }

  return received;
}

async function rejectTransfer(id, performedBy) {
  const existing = await transferRepo.getTransferById(id);
  if (!existing) throw new AppError('Transfer not found.', { status: 404, code: 'TRANSFER_NOT_FOUND' });
  if (existing.status !== 'PENDING') throw new AppError('Only pending transfers can be rejected.', { status: 400, code: 'INVALID_STATUS' });

  const reject = await transferRepo.rejectTransfer(id);
  try {
    await auditRepo.writeLog(performedBy, 'reject_inventory_transfer', 'INVENTORY_TRANSFER', id);
  } catch (e) {
    console.error('audit error', e.message);
  }

  try {
    if (existing.requested_by) {
      const product = await productRepo.getProductById(existing.product_id);
      await notificationService.createNotification({
        title: 'Transfer Rejected',
        message: `Your transfer request for "${product ? product.product_name : 'product'}" (${existing.transfer_number}) has been rejected.`,
        branch_id: existing.from_branch_id,
        type: 'WARNING',
        priority: 'NORMAL',
        createdBy: performedBy,
        recipients: [existing.requested_by],
      });
    }
  } catch (e) {
    console.error('transfer notification error', e.message);
  }

  return reject;
}

module.exports = {
  createTransfer,
  getTransferById,
  listTransfers,
  updateTransfer,
  deactivateTransfer,
  rejectTransfer,
  approveTransfer,
  activateTransfer,
  shipTransfer,
  receiveTransfer,
};
