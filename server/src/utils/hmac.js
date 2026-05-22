/**
 * HMAC Utilities
 *
 * HMAC-SHA256 sign and verify helpers for license date tamper detection.
 * All comparisons use timing-safe Buffer comparison to resist oracle attacks.
 *
 * @module hmac
 */

const crypto = require('crypto');

/**
 * Compute HMAC-SHA256 of a message.
 * @param {string} message - Data to sign (e.g. ISO date string)
 * @param {string} secret - Hex-encoded HMAC secret
 * @returns {string} Hex-encoded HMAC digest
 */
function hmacSign(message, secret) {
  return crypto
    .createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(message, 'utf8')
    .digest('hex');
}

/**
 * Verify an HMAC-SHA256 signature using timing-safe comparison.
 * @param {string} message - Original data that was signed
 * @param {string} signature - Hex-encoded HMAC to verify against
 * @param {string} secret - Hex-encoded HMAC secret
 * @returns {boolean} True if signature is valid
 */
function hmacVerify(message, signature, secret) {
  const computed = hmacSign(message, secret);
  // Timing-safe comparison: both buffers must be same length
  const computedBuf = Buffer.from(computed, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');
  if (computedBuf.length !== signatureBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(computedBuf, signatureBuf);
}

module.exports = { hmacSign, hmacVerify };
