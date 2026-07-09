const branchService = require('../services/branch.service');

async function createBranch(req, res, next) {
  try {
    const branch = await branchService.createBranch(req.body, req.user);
    res.status(201).json({ data: branch });
  } catch (err) {
    next(err);
  }
}

async function listBranches(req, res, next) {
  try {
    const branches = await branchService.listBranches(req.query);
    res.json({ data: branches });
  } catch (err) {
    next(err);
  }
}

async function searchBranches(req, res, next) {
  try {
    const branches = await branchService.listBranches(req.body);
    res.json({ data: branches });
  } catch (err) {
    next(err);
  }
}

async function getBranchById(req, res, next) {
  try {
    const branch = await branchService.getBranchById(req.params.branchId);
    res.json({ data: branch });
  } catch (err) {
    next(err);
  }
}

async function updateBranch(req, res, next) {
  try {
    const branch = await branchService.updateBranch(req.params.branchId, req.body, req.user);
    res.json({ data: branch });
  } catch (err) {
    next(err);
  }
}

async function deleteBranch(req, res, next) {
  try {
    const branch = await branchService.deleteBranch(req.params.branchId, req.user);
    res.json({ data: branch });
  } catch (err) {
    next(err);
  }
}

async function activateBranch(req, res, next) {
  try {
    const branch = await branchService.activateBranch(req.params.id, req.user);
    res.json({ data: branch });
  } catch (err) {
    next(err);
  }
}

async function deactivateBranch(req, res, next) {
  try {
    const branch = await branchService.deactivateBranch(req.params.id, req.user);
    res.json({ data: branch });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBranch,
  listBranches,
  searchBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
  activateBranch,
  deactivateBranch,
};
