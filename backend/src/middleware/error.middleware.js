/**
 * error.middleware.js
 *
 * Central error handler. The full technical error is kept in the server logs
 * (console.error) for debugging, but the client only ever receives a safe,
 * plain-language message produced by utils/httpError.describeError.
 */

const { describeError } = require('../utils/httpError');

module.exports = (err, req, res, next) => {
    // Full technical detail stays in the server logs for debugging.
    console.error(err);

    const { status, message, code } = describeError(err);

    return res.status(status).json({
        success: false,
        ...(code ? { code } : {}),
        message,
    });
};
