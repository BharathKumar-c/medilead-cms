const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Unified telephony webhook signature validation.
 *
 * Primary: HMAC-SHA256 via X-Webhook-Signature header
 *   (used by telephony vendor — verifies request authenticity)
 *
 * Fallback: JWT Bearer token
 *   (used for Postman / dev testing — anyone with a valid JWT can bypass HMAC)
 *
 * Expects header: X-Webhook-Signature = hex(HMAC-SHA256(secret, rawBody))
 */
const validateTelephonySignature = (req, res, next) => {
  // JWT Bearer token fallback (for Postman / dev testing)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      req.user = decoded;
      logger.info('Inbound call authenticated via JWT token', { ip: req.ip, userId: decoded.id });
      return next();
    } catch (err) {
      // JWT invalid — fall through to HMAC validation below
      logger.warn('JWT verification failed, falling back to HMAC', { ip: req.ip });
    }
  }

  // ── HMAC-SHA256 signature validation (primary) ──
  const secret = process.env.TELEPHONY_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('TELEPHONY_WEBHOOK_SECRET not set — skipping signature validation in dev');
      return next();
    }
    logger.error('TELEPHONY_WEBHOOK_SECRET not configured in production');
    return res.status(500).json({ success: false, message: 'Webhook not configured' });
  }

  const signature = req.headers['x-webhook-signature'];
  if (!signature) {
    logger.warn('Missing X-Webhook-Signature header', { ip: req.ip });
    return res.status(401).json({ success: false, message: 'Missing signature header' });
  }

  // req.rawBody is set by the verify callback in express.json() in index.js
  if (!req.rawBody) {
    logger.error('Raw body not available for HMAC verification');
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('hex');

  // timingSafeEqual requires equal-length buffers
  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expected, 'hex');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      logger.warn('Invalid webhook signature', { ip: req.ip });
      return res.status(403).json({ success: false, message: 'Invalid signature' });
    }
  } catch (err) {
    logger.warn('Signature comparison error', { ip: req.ip, error: err.message });
    return res.status(401).json({ success: false, message: 'Invalid signature format' });
  }

  next();
};

module.exports = validateTelephonySignature;
