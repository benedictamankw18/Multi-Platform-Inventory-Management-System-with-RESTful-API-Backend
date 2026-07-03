/**
 * validation.middleware.js
 *
 * Runs after a *.validation.js chain in the route definition and converts
 * any collected express-validator errors into a 422 response. Unchanged
 * from the version already in this project's uploaded files — it was
 * already correct, so it's reused as-is rather than rewritten.
 */

const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array(),
    });
  }

  next();
};
