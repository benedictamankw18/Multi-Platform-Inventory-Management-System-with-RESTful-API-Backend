const queueRepo = require('../repositories/queue.repository');

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

module.exports = { list };
