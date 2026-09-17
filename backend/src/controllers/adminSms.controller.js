const queueService = require('../services/queue.service');
const smsService = require('../services/sms.service');

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

async function getBalance(req, res, next) {
  try {
    const result = await smsService.getAgooBalance();
    if (!result.success) {
      const status = result.statusCode && result.statusCode >= 400 && result.statusCode < 500 ? result.statusCode : 502;
      return res.status(status).json({ success: false, message: result.error || 'Failed to fetch SMS balance.' });
    }
    return res.status(200).json({
      success: true,
      data: {
        balance: result.balance,
        currency: result.currency,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { sendTest, getBalance };
