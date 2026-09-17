const userBranchRepo = require('../repositories/userBranch.repository');
const branchRepo = require('../repositories/branch.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');
const notificationService = require('./notification.service');

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

  const branch = await branchRepo.getBranchById(branch_id).catch(() => null)
  const branchName = branch?.branch_name || 'Unknown Branch'
  notificationService.createNotification({
    title: 'Branch Assigned',
    message: `You have been assigned to branch ${branchName}.`,
    type: 'INFO',
    priority: 'NORMAL',
    user_id,
    recipients: [user_id],
    createdBy: actorId,
    channels: ['in_app', 'email', 'sms'],
  }).catch((e) => console.error('assign branch notif error', e && e.message))

  return row;
};

exports.removeUserBranch = async (user_id, branch_id, actorId = null) => {
  if (!user_id || !branch_id) {
    throw new AppError('user_id and branch_id are required.', { status: 400 });
  }
  const row = await userBranchRepo.removeUserBranch(user_id, branch_id);
  await auditRepo.writeLog(actorId, 'REMOVE_BRANCH', 'USER_BRANCH', null, { user_id, branch_id });

  const branch = await branchRepo.getBranchById(branch_id).catch(() => null)
  const branchName = branch?.branch_name || 'Unknown Branch'
  notificationService.createNotification({
    title: 'Branch Unassigned',
    message: `You have been removed from branch ${branchName}.`,
    type: 'INFO',
    priority: 'NORMAL',
    user_id,
    recipients: [user_id],
    createdBy: actorId,
    channels: ['in_app', 'email', 'sms'],
  }).catch((e) => console.error('remove branch notif error', e && e.message))

  return row;
};

exports.listBranchesForUser = async (user_id) => {
  if (!user_id) throw new AppError('user_id is required.', { status: 400 });
  return userBranchRepo.listBranchesForUser(user_id);
};
