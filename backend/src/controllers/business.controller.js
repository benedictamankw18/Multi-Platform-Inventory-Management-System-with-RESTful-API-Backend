const businessService = require('../services/business.service');

async function listSettings(req, res, next) {
  try {
    const data = await businessService.listSettings();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function getSetting(req, res, next) {
  try {
    const key = req.params.key;
    const data = await businessService.getSetting(key);
    if (!data) return res.status(404).json({ message: 'Setting not found' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function upsertSetting(req, res, next) {
  try {
    const payload = req.body;
    const performedBy = req.user ? req.user.id : null;
    const saved = await businessService.upsertSetting(payload, performedBy);
    res.json({ data: saved });
  } catch (err) {
    next(err);
  }
}

async function deleteSetting(req, res, next) {
  try {
    const settingId = req.params.setting_id;
    const performedBy = req.user ? req.user.id : null;
    const deleted = await businessService.deleteSetting(settingId, performedBy);
    if (!deleted) return res.status(404).json({ message: 'Setting not found' });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSettings,
  getSetting,
  upsertSetting,
  deleteSetting,
};
