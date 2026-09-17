const systemRepo = require('../repositories/system.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');

const ALLOWED_TYPES = ['boolean', 'number', 'string'];

function actorId(actor) {
  return actor || null;
}

function inferType(value) {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  if (typeof value === 'string') return 'string';
  return null;
}

function normalizeSettingValue(value, requestedType) {
  const actualType = inferType(value);
  if (!actualType) {
    throw new AppError('Setting value must be a boolean, number, or string.', {
      code: 'INVALID_SETTING_VALUE',
      status: 400,
    });
  }

  const type = requestedType || actualType;
  if (!ALLOWED_TYPES.includes(type)) {
    throw new AppError('Setting type must be boolean, number, or string.', {
      code: 'INVALID_SETTING_TYPE',
      status: 400,
    });
  }

  if (type !== actualType) {
    throw new AppError(`Setting value must match declared type ${type}.`, {
      code: 'SETTING_TYPE_MISMATCH',
      status: 400,
    });
  }

  return { type, value };
}

function serializeValue(value, type) {
  return JSON.stringify({ type, value });
}

function deserializeValue(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return { type: 'string', value: '' };
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (parsed && ALLOWED_TYPES.includes(parsed.type) && inferType(parsed.value) === parsed.type) {
      return { type: parsed.type, value: parsed.value };
    }
  } catch (err) {
    // Existing plain-text settings are treated as strings.
  }

  return { type: 'string', value: rawValue };
}

function formatSetting(row) {
  if (!row) return null;
  const typed = deserializeValue(row.setting_value);

  return {
    id: row.setting_id,
    key: row.setting_key,
    value: typed.value,
    type: typed.type,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listSettings() {
  const settings = await systemRepo.getAll();
  return settings.map(formatSetting);
}

async function getSetting(key) {
  const setting = await systemRepo.getByKey(key);
  if (!setting) {
    throw new AppError('Setting not found.', { code: 'SETTING_NOT_FOUND', status: 404 });
  }
  return formatSetting(setting);
}

async function upsertSetting(payload, performedBy) {
  const { key, value, type, description } = payload;
  const normalized = normalizeSettingValue(value, type);
  const saved = await systemRepo.upsert({
    key,
    value: serializeValue(normalized.value, normalized.type),
    description,
  });

  await auditRepo.writeLog(actorId(performedBy), 'UPSERT_SYSTEM_SETTING', 'SYSTEM_SETTING', saved.setting_id, {
    key,
    type: normalized.type,
  });

  return formatSetting(saved);
}

async function updateSetting(key, payload, performedBy) {
  const existing = await systemRepo.getByKey(key);
  if (!existing) {
    throw new AppError('Setting not found.', { code: 'SETTING_NOT_FOUND', status: 404 });
  }

  const current = deserializeValue(existing.setting_value);
  const nextValue = payload.value !== undefined ? payload.value : current.value;
  const nextType = payload.type || current.type;
  const normalized = normalizeSettingValue(nextValue, nextType);

  const saved = await systemRepo.upsert({
    key,
    value: serializeValue(normalized.value, normalized.type),
    description: payload.description !== undefined ? payload.description : existing.description,
  });

  await auditRepo.writeLog(actorId(performedBy), 'UPDATE_SYSTEM_SETTING', 'SYSTEM_SETTING', saved.setting_id, {
    key,
    type: normalized.type,
  });

  return formatSetting(saved);
}

async function deleteSetting(key, performedBy) {
  const deleted = await systemRepo.remove(key);
  if (!deleted) {
    throw new AppError('Setting not found.', { code: 'SETTING_NOT_FOUND', status: 404 });
  }

  await auditRepo.writeLog(actorId(performedBy), 'DELETE_SYSTEM_SETTING', 'SYSTEM_SETTING', deleted.setting_id, {
    key,
  });

  return formatSetting(deleted);
}

module.exports = {
  listSettings,
  getSetting,
  upsertSetting,
  updateSetting,
  deleteSetting,
};
