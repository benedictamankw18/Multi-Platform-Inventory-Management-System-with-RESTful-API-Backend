const queueService = require('../services/queue.service');

async function sendTest(req, res, next) {
  try {
    const { to, message, senderId } = req.body || {};
    if (!to || !message) return res.status(400).json({ success: false, message: 'Both "to" and "message" are required.' });

    const entry = await queueService.enqueueMessage('sms', { to, message, senderId, purpose: 'admin_test' });
    return res.status(202).json({ success: true, queued: true, entry });
  } catch (err) {
    return next(err);
  }
}

module.exports = { sendTest };
