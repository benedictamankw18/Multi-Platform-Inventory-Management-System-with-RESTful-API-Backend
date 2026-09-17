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
    const results = await uomService.listUoms(req.query);
    return res.status(200).json({ data: results.units, pagination: results.pagination });
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
  deleteUom,
};
