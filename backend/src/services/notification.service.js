const { v4: uuidv4 } = require('uuid');
const notificationRepo = require('../repositories/notification.repository');
const auditRepo = require('../repositories/audit.repository');
const userRepo = require('../repositories/user.repository');
const queueService = require('./queue.service');

async function createNotification({ user_id, title, body, message, branch_id, priority, type, data, createdBy, recipients, expires_at, channels = ['in_app'] }) {
  const id = uuidv4();
  const userId = user_id || (createdBy && createdBy) || null;
  const payloadData = data || null;
  const created = await notificationRepo.createNotification(
            { id, user_id: userId, branch_id: branch_id, title: title || null, message: message || null, expires_at: expires_at || null,
              notification_type: type || null, priority: priority || null, data: payloadData ? JSON.stringify(payloadData) : null, recipients: recipients,
              is_read: false, created_by: createdBy });
  try {
    await auditRepo.writeLog(createdBy, 'create_notification', 'NOTIFICATION', id, { user_id, title });
  } catch (e) {
    console.error('audit error', e.message);
  }

  if (channels.includes('email') || channels.includes('sms')) {
    const users = await Promise.all(
      (recipients || []).map((id) => userRepo.findUserById(id).catch(() => null))
    );
    const valid = users.filter(Boolean);
    const subject = title || 'Notification';
    const text = message || '';
    for (const user of valid) {
      if (channels.includes('email') && user.email) {
        queueService.enqueueMessage('email', {
          to: user.email,
          subject,
          text,
          html: text ? `<p>${text.replace(/\n/g, '<br>')}</p>` : undefined,
        }).catch((e) => console.error('email enqueue error', e && e.message));
      }
      if (channels.includes('sms') && user.phone) {
        queueService.enqueueMessage('sms', {
          to: user.phone,
          message: text,
        }).catch((e) => console.error('sms enqueue error', e && e.message));
      }
    }
  }

  return created;
}

async function listNotifications(query) {
  const { userId, isRead, branchId, type, page = 1, limit = 50 } = query || {};
  const offset = (page - 1) * limit;
  return notificationRepo.listNotifications({ userId, isRead, branchId, notificationType: type, limit, offset });
}

async function getNotificationById(id) {
  return notificationRepo.getNotificationById(id);
}

async function markAsRead(id, performedBy) {
  const updated = await notificationRepo.markAsRead(id, performedBy);
  try {
    await auditRepo.writeLog(performedBy, 'mark_notification_read', 'NOTIFICATION', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function updateNotification(id, patch, performedBy) {
  const updated = await notificationRepo.updateNotification(id, patch);
  try {
    await auditRepo.writeLog(performedBy, 'update_notification', 'NOTIFICATION', id, patch);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function deleteNotification(id, performedBy) {
  const deleted = await notificationRepo.deleteNotification(id);
  try {
    await auditRepo.writeLog(performedBy, 'delete_notification', 'NOTIFICATION', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return deleted;
}

async function createLowStockNotification({ product, branch, newQuantity, performedBy, threshold }) {
  const recent = await notificationRepo.findRecentLowStock(branch.branch_id, product.product_id, 24);
  if (recent) return null;

  const recipients = await notificationRepo.findUsersWithPermissionAtBranch(
    ['MANAGE_INVENTORY', 'MANAGE_SETTINGS'],
    branch.branch_id
  );
  if (!recipients.length) return null;

  const title = 'Low Stock Alert';
  const label = threshold !== undefined ? 'threshold' : 'minimum';
  const value = threshold !== undefined ? threshold : product.minimum_stock;
  const message = `"${product.product_name}" is running low at ${branch.branch_name}. Current stock: ${newQuantity}, ${label}: ${value}.`;

  return createNotification({
    title,
    message,
    branch_id: branch.branch_id,
    type: 'LOW_STOCK',
    priority: 'HIGH',
    createdBy: performedBy,
    recipients,
  });
}

async function createSyncFailureNotification({ entity, errorMessage, performedBy }) {
  const recent = await notificationRepo.findRecentSyncFailure(entity, 1);
  if (recent) return null;

  const recipients = await notificationRepo.findUsersWithPermission(['MANAGE_SYNC']);
  if (!recipients.length) return null;

  const title = 'Sync Failure';
  const message = `Failed to sync "${entity}": ${errorMessage}`;

  return createNotification({
    title,
    message,
    type: 'SYNC_FAILURE',
    priority: 'HIGH',
    createdBy: performedBy || 'system',
    recipients,
  });
}

module.exports = {
  createNotification,
  listNotifications,
  getNotificationById,
  markAsRead,
  updateNotification,
  deleteNotification,
  createLowStockNotification,
  createSyncFailureNotification,
};
