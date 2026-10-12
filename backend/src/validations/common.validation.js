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

// True when an expiry_date is today or later. The comparison is done on whole
// UTC days so a date-only value of "today" (which parses to midnight) is not
// wrongly treated as being in the past. Empty / unparseable values pass through
// untouched so the preceding optional()/isISO8601() checks still own those
// errors.
exports.isNotPastDate = (value) => {
  if (value === undefined || value === null || value === '') return true;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  const startOfDay = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return startOfDay(date) >= startOfDay(new Date());
};
