const businessRepo = require('../repositories/business.repository');
const auditRepo = require('../repositories/audit.repository');

async function listSettings() {
  return businessRepo.getAllSettings();
}

async function getSetting(key) {
  return businessRepo.getSettingByKey(key);
}

async function upsertSetting(payload, performedBy) {
  const { key, value, meta, patch } = payload;
  const saved = await businessRepo.upsertSetting({ key, value, meta, patch: patch || {}, updated_by: performedBy });
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'upsert_business_setting', resource_id: saved.id || null, meta: { key }, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return saved;
}

async function deleteSetting(key, performedBy) {
  const deleted = await businessRepo.deleteSetting(key);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'delete_business_setting', resource_id: deleted ? deleted.id : null, meta: { key }, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return deleted;
}

module.exports = {
  listSettings,
  getSetting,
  upsertSetting,
  deleteSetting,
};
