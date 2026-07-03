/**
 * rateLimiter.middleware.js
 *
 * Exports two distinct limiters so callers can choose:
 *   - default export (require directly): general API limiter, 100 req / 15 min
 *   - named export  ({ loginLimiter }):  login limiter,   5 req / 15 min
 *
 * Fix vs. uploaded version: the original did:
 *   exports.loginLimiter = rateLimit({...});  // writes loginLimiter onto exports
 *   module.exports = limiter;                 // REPLACES the whole exports object
 *
 * That last line discards loginLimiter, so
 *   const { loginLimiter } = require('./rateLimiter.middleware')
 * silently returns undefined and no login rate limiting ever fires.
 *
 * Fix: export everything from one object so nothing gets replaced.
 */

const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
});

// Export both from the same object — nothing overwrites loginLimiter.
// Routes that want the general limiter:  const limiter = require('./rateLimiter.middleware')
// Routes that want the login limiter:    const { loginLimiter } = require('./rateLimiter.middleware')
generalLimiter.loginLimiter = loginLimiter;

module.exports = generalLimiter;
