const supplierService = require('../services/supplier.service');

async function createSupplier(req, res, next) {
  try {
    const created = await supplierService.createSupplier({
      supplier_name: req.body.supplier_name,
      contact_email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      createdBy: req.user ? req.user.sub : null,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

async function listSuppliers(req, res, next) {
  try {
    const results = await supplierService.listSuppliers(req.body || req.query);
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

async function getSupplierById(req, res, next) {
  try {
    const supplier = await supplierService.getSupplierById(req.params.supplierId);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
    res.json({ data: supplier });
  } catch (err) {
    next(err);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const id = req.params.supplierId;
    const patch = req.body;
    const updated = await supplierService.updateSupplier(id, patch, req.user ? req.user.sub : null);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

async function deactivateSupplier(req, res, next) {
  try {
    const id = req.params.supplierId;
    const deactivated = await supplierService.deactivateSupplier(id, req.user ? req.user.sub : null);
    res.json({ data: deactivated });
  } catch (err) {
    next(err);
  }
}

async function reactivateSupplier(req, res, next) {
  try {
    const id = req.params.supplierId;
    const reactivated = await supplierService.reactivateSupplier(id, req.user ? req.user.sub : null);
    res.json({ data: reactivated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSupplier,
  listSuppliers,
  getSupplierById,
  updateSupplier,
  deactivateSupplier,
  reactivateSupplier,
};
