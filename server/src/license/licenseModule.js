/**
 * License Module
 *
 * Core IIFE encapsulating all license expiry enforcement logic.
 * Exposes only: isValid(), daysRemaining(), checkLogin(), startWatcher(), unlock().
 * The raw expiry date is XOR-encoded in memory and never accessible outside the closure.
 *
 * Security roles:
 *  - Reads LICENSE_EXPIRY from env, immediately deletes it from process.env
 *  - Verifies HMAC on startup and on every watcher tick
 *  - XOR-encodes the expiry date with a random session key
 *  - Detects --inspect / --inspect-brk debug flags at startup
 *  - Supports emergency unlock via bcrypt-verified key (extends by 30 days)
 *
 * @module licenseModule
 */

'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { xorEncode, xorDecode, generateSessionKey } = require('../utils/xorBuffer');
const { hmacSign, hmacVerify } = require('../utils/hmac');
const auditLog = require('../utils/auditLog');

const licenseModule = (() => {
  // ─── Anti-debug detection (runs immediately at load time) ───
  const debugFlags = ['--inspect', '--inspect-brk'];
  const isDebugging = process.execArgv.some((arg) =>
    debugFlags.some((flag) => arg.startsWith(flag))
  );

  if (isDebugging) {
    auditLog('ANTI_DEBUG', { reason: 'Inspector flag detected in process.execArgv' });
  }

  // ─── Closure-scoped state ───
  const xorSessionKey = generateSessionKey(32); // Regenerated every server start
  let encodedExpiryBuf = null;    // XOR-encoded expiry date (Buffer)
  let hmacSecret = null;          // Hex-encoded HMAC secret (deleted from env after read)
  let storedHmac = null;          // HMAC of the raw expiry date string
  let graceDays = 3;              // Configurable grace period
  let isLicenseValid = false;     // Master validity flag
  let watcherTimerId = null;      // setTimeout handle for the watcher
  let unlockAttempts = new Map(); // IP -> { count, firstAttempt, blockedUntil }

  // ─── Initialization ───
  function init() {
    if (isDebugging) {
      isLicenseValid = false;
      return;
    }

    const rawExpiry = process.env.LICENSE_EXPIRY;
    const rawSecret = process.env.LICENSE_HMAC_SECRET;
    const rawHmac = process.env.LICENSE_EXPIRY_HMAC;
    const rawGrace = process.env.LICENSE_GRACE_DAYS;

    // Immediately remove raw expiry from env
    delete process.env.LICENSE_EXPIRY;

    if (!rawExpiry || !rawSecret || !rawHmac) {
      auditLog('INIT_FAILED', { reason: 'Missing license environment variables' });
      isLicenseValid = false;
      return;
    }

    hmacSecret = rawSecret;

    // Parse grace days
    if (rawGrace && !isNaN(parseInt(rawGrace, 10))) {
      graceDays = Math.max(0, parseInt(rawGrace, 10));
    }

    // Verify HMAC of the expiry date
    if (!hmacVerify(rawExpiry, rawHmac, hmacSecret)) {
      auditLog('TAMPER_DETECTED', { reason: 'HMAC verification failed at startup' });
      isLicenseValid = false;
      return;
    }

    // Parse the date and XOR-encode it
    const expiryDate = new Date(rawExpiry + 'T23:59:59.999Z');
    if (isNaN(expiryDate.getTime())) {
      auditLog('INIT_FAILED', { reason: 'Invalid expiry date format' });
      isLicenseValid = false;
      return;
    }

    const dateStr = expiryDate.toISOString();
    encodedExpiryBuf = xorEncode(Buffer.from(dateStr, 'utf8'), xorSessionKey);

    // Store HMAC of the ISO format (what verifyIntegrity() will check against)
    storedHmac = hmacSign(dateStr, hmacSecret);

    // Check expiry
    const now = Date.now();
    const hardExpiry = expiryDate.getTime();

    if (now > hardExpiry) {
      auditLog('LICENSE_EXPIRED', { expiredAt: new Date(hardExpiry).toISOString() });
      isLicenseValid = false;
      return;
    }

    isLicenseValid = true;
    auditLog('STARTUP', {
      status: 'valid',
      daysRemaining: Math.ceil((hardExpiry - now) / (1000 * 60 * 60 * 24)),
    });
  }

  // ─── Decode the expiry date from XOR buffer ───
  function getExpiryDate() {
    if (!encodedExpiryBuf) return null;
    const decoded = xorDecode(encodedExpiryBuf, xorSessionKey);
    const dateStr = decoded.toString('utf8');
    return new Date(dateStr);
  }

  // ─── Re-verify HMAC at runtime (detects tampering via env manipulation) ───
  function verifyIntegrity() {
    if (!encodedExpiryBuf || !hmacSecret || !storedHmac) {
      return false;
    }
    const expiryDate = getExpiryDate();
    if (!expiryDate || isNaN(expiryDate.getTime())) {
      auditLog('TAMPER_DETECTED', { reason: 'Failed to decode expiry date' });
      return false;
    }
    const dateStr = expiryDate.toISOString();
    if (!hmacVerify(dateStr, storedHmac, hmacSecret)) {
      auditLog('TAMPER_DETECTED', { reason: 'Runtime HMAC re-verification failed' });
      return false;
    }
    return true;
  }

  // ─── Public API ───

  /**
   * Check whether the license is currently valid.
   * @returns {boolean}
   */
  function isValid() {
    if (isDebugging) return false;
    if (!isLicenseValid) return false;
    if (!verifyIntegrity()) {
      isLicenseValid = false;
      return false;
    }
    const expiry = getExpiryDate();
    if (!expiry) {
      isLicenseValid = false;
      return false;
    }
    return Date.now() <= expiry.getTime();
  }

  /**
   * Days remaining until license expiry (integer).
   * Returns 0 if expired or invalid.
   * @returns {number}
   */
  function daysRemaining() {
    if (!isValid()) return 0;
    const expiry = getExpiryDate();
    if (!expiry) return 0;
    const diff = expiry.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Check license at login time. Returns an object with decision + headers.
   * @param {string} [clientIp] - Requesting IP for audit logging
   * @returns {{ allowed: boolean, status: number, headers: object }}
   */
  function checkLogin(clientIp) {
    if (isDebugging) {
      auditLog('LOGIN_BLOCKED', { reason: 'Debug mode', ip: clientIp });
      return { allowed: false, status: 403, headers: {} };
    }

    if (!isLicenseValid || !encodedExpiryBuf || !verifyIntegrity()) {
      isLicenseValid = false;
      auditLog('LOGIN_BLOCKED', { reason: 'License invalid', ip: clientIp });
      return { allowed: false, status: 403, headers: {} };
    }

    const expiry = getExpiryDate();
    if (!expiry) {
      isLicenseValid = false;
      auditLog('LOGIN_BLOCKED', { reason: 'Expiry decode failed', ip: clientIp });
      return { allowed: false, status: 403, headers: {} };
    }

    const now = Date.now();
    const hardExpiry = expiry.getTime();

    // Hard expired
    if (now > hardExpiry) {
      isLicenseValid = false;
      auditLog('LOGIN_BLOCKED', { reason: 'License expired', ip: clientIp });
      return { allowed: false, status: 403, headers: {} };
    }

    // Grace period check
    const daysLeft = Math.ceil((hardExpiry - now) / (1000 * 60 * 60 * 24));
    const headers = {};
    if (daysLeft <= graceDays) {
      headers['X-License-Warning'] = 'License expiring soon. Contact support.';
      auditLog('LOGIN_GRACE', { ip: clientIp, daysRemaining: daysLeft });
    }

    return { allowed: true, status: 200, headers };
  }

  /**
   * Emergency unlock: extend expiry by 30 days using a bcrypt-verified key.
   * @param {string} unlockKey - Plaintext unlock key submitted by the vendor
   * @param {string} clientIp - Requesting IP for audit and rate limiting
   * @returns {Promise<{ success: boolean, status: number }>}
   */
  async function unlock(unlockKey, clientIp) {
    // Rate limiting: 3 attempts per 15 min, block for 1 hour after 3 failures
    const now = Date.now();
    const record = unlockAttempts.get(clientIp) || { count: 0, firstAttempt: now, blockedUntil: 0 };

    if (record.blockedUntil > now) {
      auditLog('UNLOCK_RATE_LIMITED', { ip: clientIp });
      return { success: false, status: 403 };
    }

    if (record.count >= 3 && (now - record.firstAttempt) < 15 * 60 * 1000) {
      record.blockedUntil = now + 60 * 60 * 1000; // Block for 1 hour
      unlockAttempts.set(clientIp, record);
      auditLog('UNLOCK_RATE_LIMITED', { ip: clientIp, reason: 'Max attempts exceeded' });
      return { success: false, status: 403 };
    }

    // Reset counter if 15-minute window has passed
    if ((now - record.firstAttempt) >= 15 * 60 * 1000) {
      record.count = 0;
      record.firstAttempt = now;
    }

    const unlockHash = process.env.LICENSE_UNLOCK_HASH;
    if (!unlockHash) {
      auditLog('UNLOCK_FAILED', { ip: clientIp, reason: 'No unlock hash configured' });
      return { success: false, status: 403 };
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(unlockKey, unlockHash);
    } catch (_err) {
      valid = false;
    }

    record.count++;
    unlockAttempts.set(clientIp, record);

    if (!valid) {
      auditLog('UNLOCK_FAILED', {
        ip: clientIp,
        maskedKey: unlockKey ? unlockKey.slice(0, 4) + '****' : 'null',
      });
      return { success: false, status: 403 };
    }

    // Extend expiry by 30 days from now (or current expiry, whichever is later)
    const currentExpiry = getExpiryDate();
    const base = currentExpiry && currentExpiry.getTime() > now ? currentExpiry : new Date(now);
    const newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Re-encode
    const newDateStr = newExpiry.toISOString();
    encodedExpiryBuf = xorEncode(Buffer.from(newDateStr, 'utf8'), xorSessionKey);

    // Recompute HMAC (the in-memory representation — NOT persisted to .env)
    storedHmac = hmacSign(newDateStr, hmacSecret);

    isLicenseValid = true;

    // Reset rate limit for this IP after successful unlock
    unlockAttempts.delete(clientIp);

    auditLog('UNLOCK_SUCCESS', {
      ip: clientIp,
      maskedKey: unlockKey.slice(0, 4) + '****',
      newExpiry: newDateStr,
      extendedDays: 30,
    });

    return { success: true, status: 200 };
  }

  /**
   * Start the background license watcher with jittered interval.
   * Delegates to licenseWatcher.js.
   */
  function startWatcher() {
    const { startWatcher: start } = require('./licenseWatcher');
    start(isValid, verifyIntegrity, () => { isLicenseValid = false; });
  }

  /**
   * Update the license expiry date in-memory.
   * @param {string} newExpiryDateStr - New expiry date in "YYYY-MM-DD" format
   * @returns {{ success: boolean, newExpiry: string|null, error: string|null }}
   */
  function updateExpiry(newExpiryDateStr) {
    try {
      const newDate = new Date(newExpiryDateStr + 'T23:59:59.999Z');
      if (isNaN(newDate.getTime())) {
        return { success: false, newExpiry: null, error: 'Invalid date format' };
      }

      const newDateStr = newDate.toISOString();
      encodedExpiryBuf = xorEncode(Buffer.from(newDateStr, 'utf8'), xorSessionKey);
      storedHmac = hmacSign(newDateStr, hmacSecret);
      isLicenseValid = true;

      return { success: true, newExpiry: newDateStr, error: null };
    } catch (err) {
      return { success: false, newExpiry: null, error: err.message };
    }
  }

  /**
   * Get the current expiry date from the XOR-encoded buffer.
   * @returns {Date|null}
   */
  function getExpiryDatePublic() {
    return getExpiryDate();
  }

  // ─── Initialize on load ───
  init();

  // ─── Expose minimal public API ───
  return Object.freeze({
    isValid,
    daysRemaining,
    checkLogin,
    unlock,
    updateExpiry,
    getExpiryDate: getExpiryDatePublic,
    startWatcher,
  });
})();

module.exports = licenseModule;
