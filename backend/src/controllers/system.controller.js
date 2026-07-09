const systemService = require('../services/system.service');

function actorId(req) {
  return req.user && (req.user.sub || req.user.id);
}

async function listSettings(req, res, next) {
  try {
    const data = await systemService.listSettings();
    return res.status(200).json({ data });
  } catch (err) {
    return next(err);
  }
}

async function getSetting(req, res, next) {
  try {
    const data = await systemService.getSetting(req.params.key);
    return res.status(200).json({ data });
  } catch (err) {
    return next(err);
  }
}

async function upsertSetting(req, res, next) {
  try {
    const saved = await systemService.upsertSetting(req.body, actorId(req));
    return res.status(200).json({ data: saved });
  } catch (err) {
    return next(err);
  }
}

async function updateSetting(req, res, next) {
  try {
    const saved = await systemService.updateSetting(req.params.key, req.body, actorId(req));
    return res.status(200).json({ data: saved });
  } catch (err) {
    return next(err);
  }
}

async function deleteSetting(req, res, next) {
  try {
    const deleted = await systemService.deleteSetting(req.params.key, actorId(req));
    return res.status(200).json({ data: deleted });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listSettings,
  getSetting,
  upsertSetting,
  updateSetting,
  deleteSetting,
};
