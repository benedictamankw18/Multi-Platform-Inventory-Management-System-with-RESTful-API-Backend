const { v4: uuidv4 } = require('uuid');
const notificationRepo = require('../repositories/notification.repository');
const auditRepo = require('../repositories/audit.repository');

async function createNotification({ user_id, title, body, message, branch_id, priority, type, data, createdBy, recipients, expires_at }) {
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
  return created;
}

async function listNotifications(query) {
  const { userId, isRead, branchId, page = 1, limit = 50 } = query || {};
  const offset = (page - 1) * limit;
  return notificationRepo.listNotifications({ userId, isRead, branchId, limit, offset });
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

module.exports = {
  createNotification,
  listNotifications,
  getNotificationById,
  markAsRead,
  updateNotification,
  deleteNotification,
};
