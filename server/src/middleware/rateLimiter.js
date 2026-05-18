const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // 1000 in dev, 100 in production
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      path: req.path,
      method: req.method,
    });
    res.status(options.statusCode).json(options.message);
  },
});

// Strict rate limiter for auth endpoints (login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 5 : 50, // 50 in dev, 5 in production
  message: {
    status: 'error',
    message: 'Too many login attempts. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`, {
      path: req.path,
      method: req.method,
      email: req.body?.email,
    });
    res.status(options.statusCode).json(options.message);
  },
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: {
    status: 'error',
    message: 'Too many password reset attempts. Please try again after an hour.',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}`, {
      path: req.path,
      method: req.method,
    });
    res.status(options.statusCode).json(options.message);
  },
});

// Notification creation rate limiter
const notificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 notification creations per minute
  message: {
    status: 'error',
    message: 'Too many notification requests. Please slow down.',
    code: 'NOTIFICATION_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Notification rate limit exceeded for IP: ${req.ip}`, {
      path: req.path,
      method: req.method,
    });
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  notificationLimiter,
};
