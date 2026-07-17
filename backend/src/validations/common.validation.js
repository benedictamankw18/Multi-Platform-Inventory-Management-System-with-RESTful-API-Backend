/**
 * common.validation.js
 *
 * Shared validation helpers reused across auth/user/role/permission
 * validation files, so a UUID route param is checked the same way
 * everywhere instead of every file rewriting the same rule.
 */

const { param } = require('express-validator');

// uuidParam('id', 'role ID') -> validates req.params.id is a UUID,
// with a field-specific message in the error response.
exports.uuidParam = (field, label) =>
  param(field).isUUID().withMessage(`Invalid ${label}.`);
