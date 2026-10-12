const authService = require('../services/auth.service');

const { describeError } = require('../utils/httpError');

function handleError(res, err) {
  console.error('[sessions.controller]', err);
  const { status, message } = describeError(err);
  return res.status(status).json({ message });
}

exports.listMySessions = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      authService.listSessionsForUser(userId, { limit, offset }),
      authService.countSessionsForUser(userId),
    ]);
    return res.status(200).json({ sessions, total, page, limit });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.listMyLoginHistory = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;
    const loginHistory = await authService.listLoginHistoryForUser(userId, { limit, offset });
    return res.status(200).json({ loginHistory });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const actorId = req.user && req.user.sub;
    const sessionId = req.params.id;
    const result = await authService.revokeSessionById(sessionId, actorId);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};
