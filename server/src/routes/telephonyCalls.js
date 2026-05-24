'use strict';

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { handleValidationErrors, validatePagination } = require('../middleware/validate');
const { body, query } = require('express-validator');
const logger = require('../utils/logger');
const { notifyByPermission } = require('../utils/notify');

const router = express.Router();

// ── HMAC Signature Validation (with JWT fallback for testing) ────────────
function validateTelephonySignature(req, res, next) {
  // If request has a valid JWT Bearer token, skip HMAC (for Postman / dev testing)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      req.user = decoded;
      logger.info('Inbound call authenticated via JWT token', { ip: req.ip, userId: decoded.id });
      return next();
    } catch (err) {
      // JWT invalid — fall through to HMAC validation below (vendor may still be calling)
      logger.warn('JWT verification failed, falling back to HMAC', { ip: req.ip });
    }
  }

  // ── HMAC-SHA256 signature validation ──
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.TELEPHONY_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('TELEPHONY_WEBHOOK_SECRET not set — skipping signature validation in dev');
      return next();
    }
    logger.error('TELEPHONY_WEBHOOK_SECRET not configured in production');
    return res.status(500).json({ status: 'error', message: 'Webhook not configured' });
  }

  if (!signature) {
    logger.warn('Missing X-Webhook-Signature header', { ip: req.ip });
    return res.status(401).json({ status: 'error', message: 'Missing signature header' });
  }

  if (!req.rawBody) {
    logger.error('Raw body not available for HMAC verification');
    return res.status(500).json({ status: 'error', message: 'Server configuration error' });
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('hex');

  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expected, 'hex');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      logger.warn('Invalid webhook signature', { ip: req.ip });
      return res.status(403).json({ status: 'error', message: 'Invalid signature' });
    }
  } catch (err) {
    logger.warn('Signature comparison error', { ip: req.ip, error: err.message });
    return res.status(401).json({ status: 'error', message: 'Invalid signature format' });
  }

  next();
}

// ── Validation ────────────────────────────────────────────────────────────
const validateInboundCall = [
  body('caller_phone_number')
    .trim().notEmpty().withMessage('caller_phone_number is required')
    .matches(/^\+?[1-9]\d{6,14}$/).withMessage('caller_phone_number must be valid E.164 format'),
  body('call_status')
    .trim().notEmpty().withMessage('call_status is required')
    .isIn(['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'missed'])
    .withMessage('call_status must be one of: initiated, ringing, in-progress, completed, failed, missed'),
  body('timestamp')
    .notEmpty().withMessage('timestamp is required')
    .isISO8601().withMessage('timestamp must be a valid ISO 8601 datetime'),
  body('vendor_call_id')
    .optional({ checkFalsy: true }).trim()
    .isLength({ max: 100 }).withMessage('vendor_call_id must be under 100 characters'),
  body('duration_seconds')
    .optional().isInt({ min: 0 }).withMessage('duration_seconds must be a non-negative integer'),
  body('direction')
    .optional({ checkFalsy: true }).trim()
    .isIn(['inbound', 'outbound']).withMessage('direction must be inbound or outbound'),
  body('recording_url')
    .optional({ checkFalsy: true }).trim()
    .isLength({ max: 500 }).withMessage('recording_url must be under 500 characters'),
  body('intercom_number')
    .optional({ checkFalsy: true }).trim()
    .isLength({ max: 50 }).withMessage('intercom_number must be under 50 characters'),
  handleValidationErrors,
];

const validateTelephonyQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
  query('status').optional({ checkFalsy: true })
    .isIn(['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'missed'])
    .withMessage('Invalid status filter'),
  query('direction').optional({ checkFalsy: true })
    .isIn(['inbound', 'outbound']).withMessage('Invalid direction filter'),
  query('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  handleValidationErrors,
];

// ── Helpers ───────────────────────────────────────────────────────────────
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone || '—';
  return phone.slice(0, 4) + '*'.repeat(phone.length - 6) + phone.slice(-2);
}

// ── POST /api/calls/inbound ───────────────────────────────────────────────
router.post('/inbound', validateTelephonySignature, validateInboundCall, async (req, res) => {
  try {
    const { caller_phone_number, call_status, timestamp, vendor_call_id, duration_seconds, direction, recording_url, intercom_number } = req.body;

    const result = await db.query(
      `INSERT INTO telephony_call_logs (caller_phone_number, call_status, timestamp, vendor_call_id, duration_seconds, direction, recording_url, intercom_number, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, caller_phone_number, call_status, timestamp, intercom_number`,
      [caller_phone_number, call_status, timestamp, vendor_call_id || null, duration_seconds || 0, direction || 'inbound', recording_url || null, intercom_number || null, req.body]
    );

    const call = result.rows[0];

    logger.info('Telephony webhook received', {
      id: call.id,
      phone: maskPhone(caller_phone_number),
      status: call_status,
      direction: direction || 'inbound',
      vendorCallId: vendor_call_id,
    });

    // ── Emit real-time socket events + notification for all users with SIP permission ──
    const io = req.app.get('io');
    if (io) {
      // Map telephony call_status to frontend event type
      let eventType;
      switch (call_status) {
        case 'initiated': case 'ringing': eventType = 'incoming'; break;
        case 'in-progress': eventType = 'answered'; break;
        case 'completed': eventType = 'ended'; break;
        case 'failed': eventType = 'failed'; break;
        case 'missed': eventType = 'missed'; break;
        default: eventType = 'incoming';
      }

      // Lookup lead info for enriched event data
      let leadInfo = null;
      try {
        const leadResult = await db.query(
          'SELECT id, name, phone FROM leads WHERE phone = $1 OR alternate_contact = $1 LIMIT 1',
          [caller_phone_number]
        );
        if (leadResult.rows.length > 0) {
          leadInfo = leadResult.rows[0];
        }
      } catch (leadErr) {
        logger.warn('Lead lookup failed for socket event', { error: leadErr.message });
      }

      // Get all users with SIP event permission
      let sipUsers = [];
      try {
        // If intercom_number is provided, only notify users assigned to that intercom
        if (intercom_number) {
          const userResult = await db.query(`
            SELECT u.id FROM users u
            WHERE u.intercom_number = $1 AND u.is_active = true
          `, [intercom_number]);
          sipUsers = userResult.rows;
        } else {
          // Fallback: notify all users with SIP permission
          const userResult = await db.query(`
            SELECT DISTINCT u.id FROM users u
            INNER JOIN user_roles ur ON u.id = ur.user_id
            INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
            INNER JOIN permissions p ON rp.permission_id = p.id
            WHERE p.name = 'calls:receive_sip_events' AND u.is_active = true
          `);
          sipUsers = userResult.rows;
        }
      } catch (userErr) {
        logger.warn('Failed to fetch SIP users for socket event', { error: userErr.message });
      }

      const socketPayload = {
        event: eventType,
        call_id: call.id,
        caller: caller_phone_number,
        callee: '',
        status: call_status,
        duration: duration_seconds || 0,
        timestamp: timestamp || new Date().toISOString(),
        direction: direction || 'inbound',
        intercom_number: intercom_number || null,
        lead_id: leadInfo?.id || null,
        lead_name: leadInfo?.name || null,
      };

      for (const user of sipUsers) {
        io.to(`user_${user.id}`).emit('call-event', socketPayload);
      }

      // For ringing/initiated calls, emit incoming-call popup only to the specific agent(s)
      if (eventType === 'incoming') {
        const incomingPayload = {
          call: {
            id: call.id,
            caller_number: caller_phone_number,
            direction: direction || 'inbound',
            status: call_status,
            duration: duration_seconds || 0,
            intercom_number: intercom_number || null,
          },
          leadInfo: leadInfo ? {
            id: leadInfo.id,
            name: leadInfo.name,
            phone: leadInfo.phone,
          } : null,
        };
        for (const user of sipUsers) {
          io.to(`user_${user.id}`).emit('incoming-call', incomingPayload);
        }
      }

      // Create notification
      const statusLabel = call_status === 'completed' ? 'Call completed' : (call_status === 'missed' ? 'Missed call' : 'Incoming call');
      notifyByPermission(io, 'calls:receive_sip_events', {
        type: call_status === 'missed' ? 'warning' : 'info',
        title: `${statusLabel} from ${caller_phone_number}${leadInfo ? ` (${leadInfo.name})` : ''}`,
        link: '/vendor-call-logs',
      }).catch(err => logger.error('Failed to send notification for inbound call', { error: err.message }));
    }

    res.status(201).json({
      success: true,
      message: 'Call log recorded successfully',
      data: {
        id: call.id,
        caller_phone_number: maskPhone(call.caller_phone_number),
        call_status: call.call_status,
        timestamp: call.timestamp,
      },
    });
  } catch (err) {
    if (err.code === '23505' && err.constraint?.includes('vendor_call_id')) {
      logger.warn('Duplicate telephony call ID', { vendorCallId: req.body.vendor_call_id });
      return res.status(409).json({ status: 'error', message: 'Duplicate call event' });
    }
    logger.error('Telephony webhook error', { error: err.message, stack: err.stack });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// ── GET /api/calls/telephony/stats ────────────────────────────────────────
router.get('/telephony/stats', authenticate, async (req, res) => {
  try {
    const userRoles = req.user.roles || [req.user.role];
    const isAdmin = userRoles.includes('super_admin') || userRoles.includes('manager');

    // Non-admin users only see stats for their intercom
    let intercomFilter = '';
    const params = [];
    if (!isAdmin && req.user.intercom_number) {
      intercomFilter = ' AND intercom_number = $1';
      params.push(req.user.intercom_number);
    }

    const result = await db.query(`
      SELECT
        COUNT(*)::int as total_today,
        COUNT(*) FILTER (WHERE direction = 'inbound')::int as inbound,
        COUNT(*) FILTER (WHERE direction = 'outbound')::int as outbound,
        COUNT(*) FILTER (WHERE call_status = 'missed')::int as missed_today,
        COALESCE(AVG(duration_seconds), 0)::int as avg_duration
      FROM telephony_call_logs
      WHERE received_at::date = CURRENT_DATE${intercomFilter}
    `, params);

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (err) {
    logger.error('Get telephony stats error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred', code: 'TELEPHONY_STATS_ERROR' });
  }
});

// ── GET /api/calls/telephony ──────────────────────────────────────────────
router.get('/telephony', authenticate, validateTelephonyQuery, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, direction, phone } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const where = [];
    let paramIndex = 1;

    // Intercom-based filtering: non-admin/manager users only see their intercom calls
    const userRoles = req.user.roles || [req.user.role];
    const isAdmin = userRoles.includes('super_admin') || userRoles.includes('manager');
    if (!isAdmin && req.user.intercom_number) {
      where.push(`t.intercom_number = $${paramIndex++}`);
      params.push(req.user.intercom_number);
    }

    if (status) {
      where.push(`t.call_status = $${paramIndex++}`);
      params.push(status);
    }
    if (direction) {
      where.push(`t.direction = $${paramIndex++}`);
      params.push(direction);
    }
    if (phone) {
      where.push(`t.caller_phone_number ILIKE $${paramIndex++}`);
      params.push(`%${phone}%`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT t.id, t.caller_phone_number, t.call_status, t.duration_seconds, t.direction,
                t.recording_url, t.timestamp, t.received_at, t.vendor_call_id, t.created_at,
                l.name as lead_name, l.phone as lead_phone, l.id as lead_id
         FROM telephony_call_logs t
         LEFT JOIN leads l ON t.caller_phone_number = l.phone
         ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, parseInt(limit), parseInt(offset)]
      ),
      db.query(
        `SELECT COUNT(*) FROM telephony_call_logs t ${whereClause}`,
        params
      ),
    ]);

    res.json({
      status: 'success',
      data: {
        calls: dataResult.rows.map(row => ({
          id: row.id,
          caller_number: row.caller_phone_number,
          caller_phone_number: maskPhone(row.caller_phone_number),
          call_status: row.call_status,
          duration: row.duration_seconds,
          direction: row.direction,
          recording_url: row.recording_url,
          timestamp: row.timestamp,
          received_at: row.received_at,
          vendor_call_id: row.vendor_call_id,
          created_at: row.created_at,
          lead_name: row.lead_name || null,
          lead_phone: row.lead_phone || null,
          lead_id: row.lead_id || null,
        })),
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (err) {
    logger.error('Get telephony logs error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ status: 'error', message: 'An error occurred', code: 'TELEPHONY_LOGS_ERROR' });
  }
});

module.exports = router;
