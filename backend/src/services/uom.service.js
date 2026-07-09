const uomRepo = require('../repositories/uom.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

function actorId(actor) {
  return actor || null;
}

function normalizePayload(payload = {}) {
  return {
    uom_name: payload.name ?? payload.uom_name,
    description: payload.description,
    symbol: payload.symbol,
    conversion_factor: payload.conversion_factor,
  };
}

function formatUom(row) {
  if (!row) return null;
  return {
    ...row,
    name: row.uom_name,
  };
}

async function requireUom(id) {
  const uom = await uomRepo.getUomById(id);
  if (!uom) {
    throw new AppError('Unit of measure not found.', { code: 'UOM_NOT_FOUND', status: 404 });
  }
  return uom;
}

async function ensureUniqueName(name, currentId = null) {
  if (!name) return;

  const existing = await uomRepo.findUomByName(name);
  if (existing && existing.uom_id !== currentId) {
    throw new AppError('A unit of measure with that name already exists.', {
      code: 'DUPLICATE_UOM',
      status: 409,
    });
  }
}

async function createUom(payload = {}, createdBy = null) {
  const normalized = normalizePayload(payload);

  await ensureUniqueName(normalized.uom_name);

  try {
    const created = await uomRepo.createUom({
      uom_name: normalized.uom_name,
      description: normalized.description,
      symbol: normalized.symbol,
      conversion_factor: normalized.conversion_factor ?? 1,
    });

    await auditRepo.writeLog(actorId(createdBy), 'CREATE_UOM', 'UNIT_OF_MEASURE', created.uom_id, {
      name: created.uom_name,
    });

    return formatUom(created);
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      throw new AppError('A unit of measure with that name already exists.', {
        code: 'DUPLICATE_UOM',
        status: 409,
      });
    }
    throw err;
  }
}

async function getUomById(id) {
  return formatUom(await requireUom(id));
}

async function listUoms(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Number(query.limit) || 25, 100);
  const offset = (page - 1) * limit;
  const rows = await uomRepo.listUoms({ q: query.q, limit, offset });

  return {
    units: rows.map(formatUom),
    pagination: { page, limit },
  };
}

async function updateUom(id, payload = {}, performedBy = null) {
  await requireUom(id);

  const normalized = normalizePayload(payload);
  if (Object.values(normalized).every((value) => value === undefined)) {
    throw new AppError('No updatable fields were provided.', { code: 'VALIDATION_ERROR', status: 400 });
  }

  await ensureUniqueName(normalized.uom_name, id);

  try {
    const updated = await uomRepo.updateUom(id, normalized);
    await auditRepo.writeLog(actorId(performedBy), 'UPDATE_UOM', 'UNIT_OF_MEASURE', id, normalized);
    return formatUom(updated);
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      throw new AppError('A unit of measure with that name already exists.', {
        code: 'DUPLICATE_UOM',
        status: 409,
      });
    }
    throw err;
  }
}

async function deleteUom(id, performedBy = null) {
  await requireUom(id);
  try {
    const deleted = await uomRepo.deleteUom(id);
    await auditRepo.writeLog(actorId(performedBy), 'DELETE_UOM', 'UNIT_OF_MEASURE', id);
    return formatUom(deleted);
  } catch (err) {
    if (err.code === FOREIGN_KEY_VIOLATION) {
      throw new AppError('This unit of measure is in use and cannot be deleted.', {
        code: 'UOM_IN_USE',
        status: 409,
      });
    }
    throw err;
  }
}

module.exports = {
  createUom,
  getUomById,
  listUoms,
  updateUom,
  deleteUom,
};
