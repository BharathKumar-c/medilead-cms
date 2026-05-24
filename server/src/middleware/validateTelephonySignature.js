const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Verify HMAC-SHA256 signature from telephony vendor webhook.
 * Expects header: X-Webhook-Signature = hex(HMAC-SHA256(secret, rawBody))
 */
const validateTelephonySignature = (req, res, next) => {
  const secret = process.env.TELEPHONY_WEBHOOK_SECRET;

  // In development, skip if no secret is configured
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
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    logger.warn('Invalid webhook signature', { ip: req.ip });
    return res.status(403).json({ success: false, message: 'Invalid signature' });
  }

  next();
};

module.exports = validateTelephonySignature;
