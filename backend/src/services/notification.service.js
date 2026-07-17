const { v4: uuidv4 } = require('uuid');
const notificationRepo = require('../repositories/notification.repository');
const auditRepo = require('../repositories/audit.repository');

async function createNotification({ user_id, title, body, message, branch_id, priority, type, data, createdBy, recipients, expires_at }) {
  // support legacy fields and new payload/recipient naming
  const id = uuidv4();
  const userId = user_id || (createdBy && createdBy) || null;
  const payloadData = data || null;
  const created = await notificationRepo.createNotification(
            { id, user_id: userId, branch_id: branch_id, title: title || null, message: message || null, expires_at: expires_at || null,
              notification_type: type || null, priority: priority || null, data: payloadData ? JSON.stringify(payloadData) : null, recipients: recipients,
              is_read: false, created_by: createdBy });
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'create_notification', resource_id: id, meta: { user_id, title }, performed_by: createdBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return created;
}

async function listNotifications(query) {
  const { userId, isRead, page = 1, limit = 50 } = query || {};
  const offset = (page - 1) * limit;
  return notificationRepo.listNotifications({ userId, isRead, limit, offset });
}

async function getNotificationById(id) {
  return notificationRepo.getNotificationById(id);
}

async function markAsRead(id, performedBy) {
  const updated = await notificationRepo.markAsRead(id, performedBy);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'mark_notification_read', resource_id: id, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function updateNotification(id, patch, performedBy) {
  const updated = await notificationRepo.updateNotification(id, patch);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'update_notification', resource_id: id, meta: patch, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function deleteNotification(id, performedBy) {
  const deleted = await notificationRepo.deleteNotification(id);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'delete_notification', resource_id: id, performed_by: performedBy });
    }
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
