/**
 * httpError.js
 *
 * Turns any error into a safe, user-facing { status, message, code }.
 *
 * Shared by the central error middleware and by controllers that respond to
 * errors themselves, so raw database wording (table/column/constraint names,
 * "violates not-null constraint", SQLSTATE codes, ...) is never sent to a
 * client. The full technical error is still logged where it is caught.
 */

const AppError = require('./AppError');

const PG_UNIQUE_VIOLATION = '23505';            // duplicate key
const PG_FOREIGN_KEY_VIOLATION = '23503';       // referenced row missing / in use
const PG_NOT_NULL_VIOLATION = '23502';          // a required column was empty
const PG_CHECK_VIOLATION = '23514';             // value rejected by a rule
const PG_INVALID_TEXT_REPRESENTATION = '22P02'; // wrong value format (e.g. bad UUID)

// A raw PostgreSQL error carries a 5-character SQLSTATE code plus driver
// metadata (severity/detail/constraint/column/...). Used to tell database
// errors apart from errors our own code raises.
function isDatabaseError(err) {
  return Boolean(
    err &&
    typeof err.code === 'string' &&
    /^[0-9A-Z]{5}$/.test(err.code) &&
    (err.severity || err.detail || err.constraint || err.column || err.table || err.schema || err.routine)
  );
}

// Plain-language messages, keyed by PostgreSQL error code.
function messageForDatabaseError(code) {
  switch (code) {
    case PG_UNIQUE_VIOLATION:
      return { status: 409, message: 'A record with these details already exists.' };
    case PG_FOREIGN_KEY_VIOLATION:
      return { status: 409, message: "This action can't be completed because it conflicts with existing data." };
    case PG_NOT_NULL_VIOLATION:
      return { status: 400, message: 'Some required information is missing.' };
    case PG_CHECK_VIOLATION:
      return { status: 400, message: 'The provided value is not allowed.' };
    case PG_INVALID_TEXT_REPRESENTATION:
      return { status: 400, message: 'Invalid input.' };
    default:
      return { status: 500, message: 'Something went wrong. Please try again.' };
  }
}

function describeError(err) {
  // Errors raised deliberately by our own code already carry a clear message
  // and an intended HTTP status.
  if (err instanceof AppError || (err && err.name === 'AppError')) {
    return { status: err.status || 500, message: err.message, code: err.code };
  }

  if (isDatabaseError(err)) {
    return messageForDatabaseError(err.code);
  }

  // Anything else keeps its message (services throw clear, user-facing ones).
  return {
    status: (err && err.status) || 500,
    message: (err && err.message) || 'Something went wrong. Please try again.',
  };
}

module.exports = { describeError, isDatabaseError };
