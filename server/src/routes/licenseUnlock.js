/**
 * License Unlock Route
 *
 * POST /internal/license/unlock — emergency unlock endpoint.
 * Extends the license by 30 days using a bcrypt-verified unlock key.
 *
 * Security:
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
 * Normalize IP address (strip IPv6-mapped IPv4 prefix).
 * @param {string} ip
 * @returns {string}
 */
function normalizeIp(ip) {
  const raw = (ip || '').replace(/^::ffff:/, '');
  if (raw === '::1') return '127.0.0.1';
  return raw;
}

/**
 * Get the real client IP, accounting for reverse proxies.
 * Checks X-Forwarded-For first (set by proxies like Vite dev server, Nginx, Render),
 * then falls back to req.ip, then req.socket.remoteAddress.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return normalizeIp(firstIp);
  }
  return normalizeIp(req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '');
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
router.post('/', async (req, res) => {
  const { unlockKey } = req.body || {};
  const clientIp = getClientIp(req);

  // ── TEMPORARY DIAGNOSTIC — remove after fix confirmed ──
  console.log('[UNLOCK DEBUG] Detected clientIp:', clientIp);
  console.log('[UNLOCK DEBUG] UNLOCK_ALLOWED_IPS:', process.env.UNLOCK_ALLOWED_IPS);
  console.log('[UNLOCK DEBUG] UNLOCK_HASH present:', !!process.env.LICENSE_UNLOCK_HASH);
  console.log('[UNLOCK DEBUG] UNLOCK_HASH length:', (process.env.LICENSE_UNLOCK_HASH || '').length);
  // ────────────────────────────────────────────────────────

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
    auditLog('UNLOCK_SUCCESS', { ip: clientIp });
    return res.status(200).json({
      status: 'success',
      message: 'Service restored.',
    });
  }

  // Same generic response whether key was wrong or IP was rate-limited
  auditLog('UNLOCK_FAILED', { ip: clientIp });
  return res.status(403).json({
    status: 'error',
    message: 'Service unavailable.',
    code: 'FORBIDDEN',
  });
});

module.exports = router;
