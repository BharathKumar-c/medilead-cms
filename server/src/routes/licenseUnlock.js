/**
 * License Unlock Route
 *
 * POST /internal/license/unlock — emergency unlock endpoint.
 * Extends the license by 30 days using a bcrypt-verified unlock key.
 *
 * Security:
 *  - IP-whitelisted (UNLOCK_ALLOWED_IPS env var, comma-separated)
 *  - Rate-limited: max 3 attempts per 15 min per IP, blocked for 1 hour after
 *    (rate limiting enforced in licenseModule.unlock, not express-rate-limit,
 *     so the 1-hour penalty actually applies)
 *  - Uses bcrypt.compare() for key validation
 *  - Never reveals whether the key was wrong or the IP was blocked
 *
 * @module licenseUnlock
 */

'use strict';

const express = require('express');
const licenseModule = require('../license/licenseModule');
const auditLog = require('../utils/auditLog');

const router = express.Router();

/**
 * Parse allowed IPs from UNLOCK_ALLOWED_IPS env var.
 * @returns {string[]} Array of allowed IP addresses
 */
function getAllowedIps() {
  const raw = process.env.UNLOCK_ALLOWED_IPS;
  if (!raw) return [];
  return raw.split(',').map((ip) => ip.trim()).filter(Boolean);
}

/**
 * Normalize IP address (strip IPv6-mapped IPv4 prefix).
 * @param {string} ip
 * @returns {string}
 */
function normalizeIp(ip) {
  return (ip || '').replace(/^::ffff:/, '');
}

/**
 * IP whitelist middleware for the unlock route.
 */
function ipWhitelist(req, res, next) {
  const allowedIps = getAllowedIps();
  const clientIp = normalizeIp(req.ip || req.connection.remoteAddress);

  // If no IPs configured, block all access
  if (allowedIps.length === 0) {
    auditLog('UNLOCK_BLOCKED', { reason: 'No allowed IPs configured', ip: clientIp });
    return res.status(403).json({
      status: 'error',
      message: 'Service unavailable.',
      code: 'FORBIDDEN',
    });
  }

  const isAllowed = allowedIps.some(
    (allowedIp) => normalizeIp(allowedIp) === clientIp
  );

  if (!isAllowed) {
    auditLog('UNLOCK_BLOCKED', { reason: 'IP not in whitelist', ip: clientIp });
    return res.status(403).json({
      status: 'error',
      message: 'Service unavailable.',
      code: 'FORBIDDEN',
    });
  }

  next();
}

/**
 * POST /internal/license/unlock
 * Accept: { "unlockKey": "<plaintext-key>" }
 *
 * Rate limiting is handled inside licenseModule.unlock():
 *  - 3 attempts per 15 min per IP
 *  - After 3 failures, blocked for 1 hour
 *  - This ensures the 1-hour penalty actually applies (not pre-empted by express-rate-limit)
 */
router.post('/', ipWhitelist, async (req, res) => {
  const { unlockKey } = req.body || {};
  const clientIp = normalizeIp(req.ip || req.connection.remoteAddress);

  if (!unlockKey || typeof unlockKey !== 'string') {
    auditLog('UNLOCK_INVALID_REQUEST', { ip: clientIp });
    return res.status(403).json({
      status: 'error',
      message: 'Service unavailable.',
      code: 'FORBIDDEN',
    });
  }

  const result = await licenseModule.unlock(unlockKey, clientIp);

  if (result.success) {
    return res.status(200).json({
      status: 'success',
      message: 'Service restored.',
    });
  }

  // Same generic response whether key was wrong or IP was rate-limited
  return res.status(403).json({
    status: 'error',
    message: 'Service unavailable.',
    code: 'FORBIDDEN',
  });
});

module.exports = router;
