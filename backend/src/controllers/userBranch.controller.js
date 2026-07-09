const userBranchService = require('../services/userBranch.service');

function handleError(res, err) {
  console.error('[userBranch.controller]', err);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
}

exports.createUserBranch = async (req, res) => {
  try {
    const actorId = req.user && req.user.sub;
    const { user_id, branch_id } = req.body;
    const row = await userBranchService.addUserBranch({ user_id, branch_id }, actorId);
    return res.status(201).json({ assignment: row });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.deleteUserBranch = async (req, res) => {
  try {
    const actorId = req.user && req.user.sub;
    const user_id = req.params.userId || req.body.user_id;
    const branch_id = req.params.branchId || req.body.branch_id;
    const row = await userBranchService.removeUserBranch(user_id, branch_id, actorId);
    if (!row) return res.status(404).json({ message: 'Assignment not found.' });
    return res.status(200).json({ removed: row });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.listBranchesForUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const branches = await userBranchService.listBranchesForUser(userId);
    return res.status(200).json({ branches });
  } catch (err) {
    return handleError(res, err);
  }
};
