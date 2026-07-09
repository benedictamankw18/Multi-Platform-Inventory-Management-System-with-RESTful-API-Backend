const notificationService = require('../services/notification.service');

async function createNotification(req, res, next) {
  try {
    const created = await notificationService.createNotification({
      user_id: req.body.user_id,
      title: req.body.title,
      body: req.body.body,
      type: req.body.type,
      data: req.body.message || req.body.data,
      createdBy: req.user ? req.user.id : null,
      title: req.body.title || null,
      body: req.body.body || null,
      recipients : req.body.recipients || null,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

async function listNotifications(req, res, next) {
  try {
    // support /me route by populating userId
    const q = Object.assign({}, req.query || {});
    if (req.path.endsWith('/me') && req.user) q.userId = req.user.id;
    const results = await notificationService.listNotifications(q);
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

async function getNotificationById(req, res, next) {
  try {
    const n = await notificationService.getNotificationById(req.params.notificationId || req.params.id);
    if (!n) return res.status(404).json({ message: 'Notification not found.' });
    res.json({ data: n });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const id = req.params.notificationId || req.params.id;
    const updated = await notificationService.markAsRead(id, req.user ? req.user.id : null);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

async function updateNotification(req, res, next) {
  try {
    const id = req.params.notificationId || req.params.id;
    const updated = await notificationService.updateNotification(id, req.body, req.user ? req.user.id : null);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const id = req.params.notificationId || req.params.id;
    const deleted = await notificationService.deleteNotification(id, req.user ? req.user.id : null);
    if (!deleted) return res.status(404).json({ message: 'Notification not found.' });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createNotification,
  listNotifications,
  getNotificationById,
  deleteNotification,
  markAsRead,
  updateNotification,
};
