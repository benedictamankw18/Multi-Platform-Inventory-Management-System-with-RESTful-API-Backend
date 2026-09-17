const queueRepo = require('../repositories/queue.repository');
const AppError = require('../utils/AppError');

const RESENDABLE_STATUSES = ['PROCESSING', 'FAILED'];

async function list(req, res, next) {
  try {
    const { status, type } = req.query;
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 1000);
    const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);

    const items = await queueRepo.list({ status: status || null, type: type || null, limit, offset });

    // parse payload JSON for convenience
    const parsed = items.map((row) => {
      let payload = null;
      try {
        payload = row.payload ? JSON.parse(row.payload) : null;
      } catch (e) {
        payload = row.payload;
      }
      return { ...row, payload };
    });

    return res.json({ success: true, data: parsed });
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/admin/queue/:id/resend
async function resend(req, res, next) {
  try {
    const { id } = req.params;
    const job = await queueRepo.getById(id);
    if (!job) throw new AppError('Queue message not found.', { code: 'QUEUE_MESSAGE_NOT_FOUND', status: 404 });
    if (!RESENDABLE_STATUSES.includes(job.status)) {
      throw new AppError(`Only PROCESSING or FAILED messages can be resent (current status: ${job.status}).`, { code: 'QUEUE_RESEND_NOT_ALLOWED', status: 409 });
    }
    const updated = await queueRepo.requeue(id);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, resend };
