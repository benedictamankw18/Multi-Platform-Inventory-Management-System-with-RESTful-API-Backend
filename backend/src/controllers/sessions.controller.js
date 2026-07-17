const authService = require('../services/auth.service');

function handleError(res, err) {
  console.error('[sessions.controller]', err);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
}

exports.listMySessions = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;
    const sessions = await authService.listSessionsForUser(userId, { limit, offset });
    return res.status(200).json({ sessions });
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
