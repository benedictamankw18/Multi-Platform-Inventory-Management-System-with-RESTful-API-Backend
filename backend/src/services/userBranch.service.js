const userBranchRepo = require('../repositories/userBranch.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');

exports.addUserBranch = async ({ user_id, branch_id } = {}, actorId = null) => {
  if (!user_id || !branch_id) {
    throw new AppError('user_id and branch_id are required.', { status: 400 });
  }

  // avoid duplicate assignment
  const existing = await userBranchRepo.listBranchesForUser(user_id);
  if (existing.some(b => b.branch_id === branch_id)) {
    throw new AppError('User is already assigned to this branch.', { status: 409 });
  }

  const row = await userBranchRepo.addUserBranch({ user_id, branch_id });
  await auditRepo.writeLog(actorId, 'ASSIGN_BRANCH', 'USER_BRANCH', null, { user_id, branch_id });
  return row;
};

exports.removeUserBranch = async (user_id, branch_id, actorId = null) => {
  if (!user_id || !branch_id) {
    throw new AppError('user_id and branch_id are required.', { status: 400 });
  }
  const row = await userBranchRepo.removeUserBranch(user_id, branch_id);
  await auditRepo.writeLog(actorId, 'REMOVE_BRANCH', 'USER_BRANCH', null, { user_id, branch_id });
  return row;
};

exports.listBranchesForUser = async (user_id) => {
  if (!user_id) throw new AppError('user_id is required.', { status: 400 });
  return userBranchRepo.listBranchesForUser(user_id);
};
