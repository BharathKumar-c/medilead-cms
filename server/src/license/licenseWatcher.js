/**
 * License Watcher
 *
 * Runs a jittered background interval (~60 minutes ± 5 min random jitter)
 * that re-verifies the license HMAC and checks expiry.
 * Uses setTimeout recursion (not setInterval) for jitter support.
 *
 * On each tick:
 *  1. Re-verify HMAC integrity (detect runtime tampering)
 *  2. Check if current UTC time has passed expiry
 *  3. If expired or tampered: invalidate license and audit-log the event
 *  4. Never crashes the process — degrades gracefully
 *
 * @module licenseWatcher
 */

'use strict';

const auditLog = require('../utils/auditLog');

const BASE_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes
const JITTER_MAX_MS = 5 * 60 * 1000;      // ±5 minutes

/**
 * Start the jittered license watcher.
 *
 * @param {function} isValid - Returns current license validity boolean
 * @param {function} verifyIntegrity - Re-verifies HMAC; returns boolean
 * @param {function} invalidate - Sets isLicenseValid = false
 */
function startWatcher(isValid, verifyIntegrity, invalidate) {
  function tick() {
    // Add ±5 min jitter to next interval
    const jitter = Math.floor(Math.random() * (2 * JITTER_MAX_MS + 1)) - JITTER_MAX_MS;
    const nextInterval = Math.max(BASE_INTERVAL_MS + jitter, 60 * 1000); // Min 1 minute

    try {
      // Step 1: HMAC re-verification
      const integrityOk = verifyIntegrity();

      // Step 2: Check expiry
      const stillValid = isValid();

      if (!integrityOk || !stillValid) {
        invalidate();
        auditLog('WATCHER_INVALIDATED', {
          reason: !integrityOk ? 'HMAC mismatch' : 'License expired',
          integrityOk,
          stillValid,
        });
      } else {
        auditLog('WATCHER_TICK', { status: 'valid' });
      }
    } catch (err) {
      // Never crash — log and continue
      auditLog('WATCHER_ERROR', { error: err.message });
    }

    watcherTimerId = setTimeout(tick, nextInterval);
  }

  let watcherTimerId = null;

  // Initial tick after first interval (not immediately — give server time to start)
  watcherTimerId = setTimeout(tick, BASE_INTERVAL_MS);

  auditLog('WATCHER_STARTED', { intervalMs: BASE_INTERVAL_MS });
}

module.exports = { startWatcher };
