const uomService = require('../services/uom.service');

function actorId(req) {
  return req.user && (req.user.sub || req.user.id);
}

async function createUom(req, res, next) {
  try {
    const created = await uomService.createUom(req.body, actorId(req));
    return res.status(201).json({ data: created });
  } catch (err) {
    return next(err);
  }
}

async function listUoms(req, res, next) {
  try {
    const { q, page, limit, isActive, includeInactive } = req.query;
    // Inactive units stay visible by default so product / purchase-order pickers
    // keep resolving existing records; callers opt into a status filter.
    const activeFilter = includeInactive === 'true' || includeInactive === true
      ? undefined
      : (isActive === undefined || isActive === ''
        ? undefined
        : isActive === 'true' || isActive === true);
    const results = await uomService.listUoms({ q, page, limit, isActive: activeFilter });
    return res.status(200).json({ data: results.units, total: results.total, pagination: results.pagination });
  } catch (err) {
    return next(err);
  }
}

async function getUomById(req, res, next) {
  try {
    const uom = await uomService.getUomById(req.params.id);
    return res.status(200).json({ data: uom });
  } catch (err) {
    return next(err);
  }
}

async function updateUom(req, res, next) {
  try {
    const updated = await uomService.updateUom(req.params.id, req.body, actorId(req));
    return res.status(200).json({ data: updated });
  } catch (err) {
    return next(err);
  }
}

async function deactivateUom(req, res, next) {
  try {
    const result = await uomService.deactivateUom(req.params.id, actorId(req));
    if (result.alreadyInState) {
      return res.status(200).json({ message: 'Unit of measure already inactive.', data: result.uom });
    }
    return res.status(200).json({ data: result.uom });
  } catch (err) {
    return next(err);
  }
}

async function activateUom(req, res, next) {
  try {
    const result = await uomService.activateUom(req.params.id, actorId(req));
    if (result.alreadyInState) {
      return res.status(200).json({ message: 'Unit of measure already active.', data: result.uom });
    }
    return res.status(200).json({ data: result.uom });
  } catch (err) {
    return next(err);
  }
}

async function deleteUom(req, res, next) {
  try {
    const deleted = await uomService.deleteUom(req.params.id, actorId(req));
    return res.status(200).json({ data: deleted });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createUom,
  listUoms,
  getUomById,
  updateUom,
  deactivateUom,
  activateUom,
  deleteUom,
};
