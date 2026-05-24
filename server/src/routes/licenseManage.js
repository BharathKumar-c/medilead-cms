/**
 * License Management Route
 *
 * GET /api/license/status — returns current license status (authenticated)
 * POST /api/license/verify-key — verifies the UI access key against LICENSE_UI_KEY env var
 * PUT /internal/license/update-expiry — updates license expiry date (key-gated + IP-whitelisted)
 *
 * Security:
 *  - GET /api/license/status requires authentication only
 *  - POST /api/license/verify-key requires authentication, checks against LICENSE_UI_KEY env var
 *  - PUT /internal/license/update-expiry is IP-whitelisted (UNLOCK_ALLOWED_IPS env var)
 *  - Writes new expiry + HMAC to .env file for persistence across restarts
 *  - Updates in-memory license state via licenseModule.updateExpiry()
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const licenseModule = require('../license/licenseModule');
const {hmacSign} = require('../utils/hmac');
const auditLog = require('../utils/auditLog');
const {authenticate} = require('../middleware/auth');

const router = express.Router();

// ─── IP Whitelist (reused for update-expiry) ───

function getAllowedIps() {
  const raw = process.env.UNLOCK_ALLOWED_IPS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
}

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
  // X-Forwarded-For: "client, proxy1, proxy2" — first entry is the real client
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return normalizeIp(firstIp);
  }
  return normalizeIp(req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '');
}

function ipWhitelist(req, res, next) {
  const allowedIps = getAllowedIps();
  const clientIp = getClientIp(req);

  console.log('Allowed IPs:', allowedIps);
  console.log('Client IP:', clientIp);

  if (allowedIps.length === 0) {
    auditLog('LICENSE_MGMT_BLOCKED', {
      reason: 'No allowed IPs configured',
      ip: clientIp,
    });
    return res.status(403).json({
      status: 'error',
      message: 'Service unavailable.',
      code: 'FORBIDDEN',
    });
  }

  const isAllowed = allowedIps.some(
    (allowedIp) => normalizeIp(allowedIp) === clientIp,
  );
  if (!isAllowed) {
    auditLog('LICENSE_MGMT_BLOCKED', {
      reason: 'IP not in whitelist',
      ip: clientIp,
    });
    return res.status(403).json({
      status: 'error',
      message: 'Service unavailable.',
      code: 'FORBIDDEN',
    });
  }

  next();
}

// ─── GET /api/license/status ───
// Returns current license info. Works even when license is expired (exempt from licenseGuard).

router.get('/status', authenticate, async (req, res) => {
  try {
    const expiry = licenseModule.getExpiryDate();
    const valid = licenseModule.isValid();
    const daysLeft = licenseModule.daysRemaining();
    const graceDays = parseInt(process.env.LICENSE_GRACE_DAYS || '3', 10);

    res.json({
      status: 'success',
      data: {
        valid,
        expiryDate: expiry ? expiry.toISOString().split('T')[0] : null,
        daysRemaining: daysLeft,
        graceDays,
      },
    });
  } catch (err) {
    auditLog('LICENSE_STATUS_ERROR', {error: err.message});
    res
      .status(500)
      .json({status: 'error', message: 'Failed to get license status.'});
  }
});

// ─── POST /api/license/verify-key ───
// Verifies the UI access key against LICENSE_UI_KEY env var.
// Required before accessing the license management screen.

router.post('/verify-key', authenticate, async (req, res) => {
  const {accessKey} = req.body || {};
  const expectedKey = process.env.LICENSE_UI_KEY;

  if (!expectedKey) {
    auditLog('LICENSE_VERIFY_NO_KEY', {
      userId: req.user.id,
      reason: 'LICENSE_UI_KEY not configured',
    });
    return res.status(500).json({
      status: 'error',
      message: 'License access key not configured on server.',
    });
  }

  if (!accessKey || typeof accessKey !== 'string') {
    auditLog('LICENSE_VERIFY_INVALID', {
      userId: req.user.id,
      reason: 'Missing access key',
    });
    return res
      .status(400)
      .json({status: 'error', message: 'Access key is required.'});
  }

  if (accessKey !== expectedKey) {
    auditLog('LICENSE_VERIFY_FAILED', {userId: req.user.id});
    return res
      .status(401)
      .json({status: 'error', message: 'Invalid access key.'});
  }

  auditLog('LICENSE_VERIFY_SUCCESS', {userId: req.user.id});
  res.json({status: 'success', message: 'Access granted.'});
});

// ─── PUT /internal/license/update-expiry ───
// Updates license expiry date. IP-whitelisted. Persists to .env file.

router.put('/update-expiry', ipWhitelist, async (req, res) => {
  const {expiryDate} = req.body || {};
  const clientIp = getClientIp(req);

  if (!expiryDate || typeof expiryDate !== 'string') {
    auditLog('LICENSE_UPDATE_INVALID', {
      ip: clientIp,
      reason: 'Missing expiryDate',
    });
    return res.status(400).json({
      status: 'error',
      message: 'Missing expiryDate (YYYY-MM-DD format).',
    });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
    auditLog('LICENSE_UPDATE_INVALID', {
      ip: clientIp,
      reason: 'Invalid date format',
    });
    return res
      .status(400)
      .json({status: 'error', message: 'Invalid date format. Use YYYY-MM-DD.'});
  }

  const parsedDate = new Date(expiryDate + 'T23:59:59.999Z');
  if (isNaN(parsedDate.getTime())) {
    auditLog('LICENSE_UPDATE_INVALID', {
      ip: clientIp,
      reason: 'Unparseable date',
    });
    return res.status(400).json({status: 'error', message: 'Invalid date.'});
  }

  // Update in-memory state
  const result = licenseModule.updateExpiry(expiryDate);
  if (!result.success) {
    auditLog('LICENSE_UPDATE_FAILED', {ip: clientIp, reason: result.error});
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update license: ' + result.error,
    });
  }

  // Compute HMAC for the new expiry date
  const hmacSecret = process.env.LICENSE_HMAC_SECRET;
  if (!hmacSecret) {
    auditLog('LICENSE_UPDATE_FAILED', {
      ip: clientIp,
      reason: 'No HMAC secret configured',
    });
    return res
      .status(500)
      .json({status: 'error', message: 'Server configuration error.'});
  }

  const newExpiryHmac = hmacSign(expiryDate, hmacSecret);

  // Persist to .env file
  try {
    const envPath = path.join(__dirname, '..', '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Replace LICENSE_EXPIRY line
    envContent = envContent.replace(
      /^LICENSE_EXPIRY\s*=\s*".*"$/m,
      `LICENSE_EXPIRY="${expiryDate}"`,
    );

    // Replace LICENSE_EXPIRY_HMAC line
    envContent = envContent.replace(
      /^LICENSE_EXPIRY_HMAC\s*=\s*".*"$/m,
      `LICENSE_EXPIRY_HMAC="${newExpiryHmac}"`,
    );

    fs.writeFileSync(envPath, envContent, 'utf8');

    auditLog('LICENSE_UPDATE_SUCCESS', {
      ip: clientIp,
      newExpiry: expiryDate,
      daysRemaining: licenseModule.daysRemaining(),
    });

    res.json({
      status: 'success',
      message: 'License expiry updated.',
      data: {
        expiryDate,
        daysRemaining: licenseModule.daysRemaining(),
      },
    });
  } catch (err) {
    auditLog('LICENSE_UPDATE_FAILED', {
      ip: clientIp,
      reason: 'File write error: ' + err.message,
    });
    res
      .status(500)
      .json({status: 'error', message: 'Failed to persist license update.'});
  }
});

module.exports = router;
