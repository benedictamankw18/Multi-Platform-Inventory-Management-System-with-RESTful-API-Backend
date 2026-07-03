/**
 * AppError.js
 *
 * Shared error type for the service layer. Services throw an AppError with
 * a machine-readable `code` and a suggested HTTP `status`, so controllers
 * stay thin:
 *
 *   try {
 *     const result = await authService.login(req.body);
 *     return res.status(200).json(result);
 *   } catch (err) {
 *     return res.status(err.status || 500).json({ message: err.message });
 *   }
 *
 * Used by auth.service.js and intended to be reused by role.service.js,
 * user.service.js, etc., so error handling has one consistent shape across
 * the whole service layer instead of every service inventing its own.
 */

class AppError extends Error {
  constructor(message, { code = 'APP_ERROR', status = 500 } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

module.exports = AppError;