const syncService = require('../services/sync.service');
const validate = require('../middleware/validation.middleware');


async function getLastSync(req, res, next) {
  try {
    const { entity } = req.params;
    const row = await syncService.getLastSync(entity);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function pull(req, res, next) {
  try {
    const { entity } = req.params;
    const { since } = req.query;
    const rows = await syncService.pull(entity, since);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function push(req, res, next) {
  try {
    const { entity } = req.params;
    const items = req.body.items || req.body;
    const result = await syncService.push(entity, items);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLastSync,
  pull,
  push,
  // global
  pushGlobal: async (req, res, next) => {
    try {
      const payload = req.body;
      const result = await syncService.pushGlobal(payload);
      res.json({ data: result });
    } catch (err) { next(err); }
  },
  pullGlobal: async (req, res, next) => {
    try {
      const payload = req.body || {};
      const result = await syncService.pullGlobal(payload);
      res.json({ data: result });
    } catch (err) { next(err); }
  },
  listLogs: async (req, res, next) => {
    try {
      const q = req.query || {};
      const rows = await syncService.listSyncLogs(q);
      res.json({ data: rows });
    } catch (err) { next(err); }
  },
  retry: async (req, res, next) => {
    try {
      const { sync_id } = req.body;
      const updated = await syncService.retrySync(sync_id);
      res.json({ data: updated });
    } catch (err) { next(err); }
  },
};
