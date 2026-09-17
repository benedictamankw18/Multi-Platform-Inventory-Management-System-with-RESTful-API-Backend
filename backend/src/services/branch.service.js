const { v4: uuidv4 } = require('uuid');

const branchRepo = require('../repositories/branch.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');

function actorId(user) {
  return user && (user.sub || user.id || user.user_id);
}

async function requireBranch(branchId) {
  const branch = await branchRepo.getBranchById(branchId);
  if (!branch) throw new AppError('Branch not found.', { status: 404 });
  return branch;
}

async function createBranch(payload, actor = null) {
  const { branch_name } = payload;
  if (!branch_name || !branch_name.trim()) {
    throw new AppError('branch_name is required.', { status: 400 });
  }

  const branch = await branchRepo.createBranch({
    branch_id: uuidv4(),
    branch_name: branch_name.trim(),
    address: payload.address,
    phone: payload.phone,
    is_active: payload.is_active,
    email: payload.email,
    manager_id: payload.manager_id,
    city: payload.city,
    country: payload.country,
    postal_code: payload.postal_code,
    latitude: payload.latitude,
    longitude: payload.longitude,
  });

  await auditRepo.writeLog(actorId(actor), 'CREATE_BRANCH', 'BRANCH', branch.branch_id, {
    branch_name: branch.branch_name,
  });

  return branch;
}

async function getBranchById(branchId) {
  return requireBranch(branchId);
}

async function listBranches(query) {
  const { q, isActive, page = 1, limit = 25 } = query || {};
  const offset = (Number(page) - 1) * Number(limit);
  return branchRepo.listBranches({ q, isActive, limit: Number(limit), offset });
}

async function updateBranch(branchId, payload, actor = null) {
  await requireBranch(branchId);

  if (!payload.branch_name || !payload.branch_name.trim()) {
    throw new AppError('branch_name is required.', { status: 400 });
  }

  const updated = await branchRepo.updateBranch(branchId, {
    branch_name: payload.branch_name.trim(),
    address: payload.address,
    phone: payload.phone,
    is_active: payload.is_active,
    email: payload.email,
    manager_id: payload.manager_id,
    city: payload.city,
    country: payload.country,
    postal_code: payload.postal_code,
    latitude: payload.latitude,
    longitude: payload.longitude,
  });

  await auditRepo.writeLog(actorId(actor), 'UPDATE_BRANCH', 'BRANCH', branchId, payload);
  return updated;
}

async function deleteBranch(branchId, actor = null) {
  const existing = await requireBranch(branchId);
  const deleted = await branchRepo.deleteBranch(branchId);

  await auditRepo.writeLog(actorId(actor), 'DELETE_BRANCH', 'BRANCH', branchId, {
    branch_name: existing.branch_name,
  });

  return deleted;
}

async function activateBranch(branchId, actor = null) {
  await requireBranch(branchId);
  const activated = await branchRepo.activateBranch(branchId);
  await auditRepo.writeLog(actorId(actor), 'ACTIVATE_BRANCH', 'BRANCH', branchId);
  return activated;
}

async function deactivateBranch(branchId, actor = null) {
  await requireBranch(branchId);
  const deactivated = await branchRepo.deactivateBranch(branchId);
  await auditRepo.writeLog(actorId(actor), 'DEACTIVATE_BRANCH', 'BRANCH', branchId);
  return deactivated;
}

module.exports = {
  createBranch,
  getBranchById,
  listBranches,
  updateBranch,
  deleteBranch,
  activateBranch,
  deactivateBranch,
};
