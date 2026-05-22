/**
 * License Guard Middleware
 *
 * Express middleware that checks the license validity flag on every request.
 * Mounted globally BEFORE all routes.
 * If the license is invalid: returns HTTP 503 with a generic message.
 *
 * @module licenseGuard
 */

'use strict';

const licenseModule = require('../license/licenseModule');
const auditLog = require('../utils/auditLog');

/**
 * Express middleware: blocks all requests when the license is invalid.
 */
function licenseGuard(req, res, next) {
  // Allow the unlock endpoint and health check even when license is invalid
  if (req.path === '/internal/license/unlock' && req.method === 'POST') {
    return next();
  }
  if (req.path === '/api/health') {
    return next();
  }

  if (!licenseModule.isValid()) {
    auditLog('REQUEST_BLOCKED', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return res.status(503).json({
      status: 'error',
      message: 'Service unavailable.',
      code: 'SERVICE_UNAVAILABLE',
    });
  }

  next();
}

module.exports = licenseGuard;
