'use strict';

const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const validateTelephonySignature = require('../middleware/validateTelephonySignature');
const { handleValidationErrors, validatePagination } = require('../middleware/validate');
const { body } = require('express-validator');
const logger = require('../utils/logger');
const { notifyByPermission } = require('../utils/notify');

const router = express.Router();

// ── Unified call statuses (mapped from both legacy SIP and telephony vendor) ──
const CALL_STATUSES = ['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'missed'];

// ── Helpers ──
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone || '—';
  return phone.slice(0, 4) + '*'.repeat(phone.length - 6) + phone.slice(-2);
}

function mapSipEventToStatus(event) {
  const map = {
    incoming:  'ringing',
    outgoing:  'ringing',
    answered:  'in-progress',
    ended:     'completed',
    missed:    'missed',
    failed:    'failed',
    hold:      'in-progress',
    unhold:    'in-progress',
  };
  return map[event] || 'initiated';
}

function generateCallCode(id) {
  // id is UUID — use first 8 chars as a short code
  return 'C' + (typeof id === 'string' ? id.replace(/-/g, '').substring(0, 8) : String(id));
}

// ── Helpers for socket events ──
async function getSipUsers(db, intercomNumber) {
  if (intercomNumber) {
    const result = await db.query(
      'SELECT id FROM users WHERE intercom_number = $1 AND is_active = true',
      [intercomNumber]
    );
    return result.rows;
  }
  const result = await db.query(`
    SELECT DISTINCT u.id FROM users u
    INNER JOIN user_roles ur ON u.id = ur.user_id
    INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
    INNER JOIN permissions p ON rp.permission_id = p.id
    WHERE p.name = 'calls:receive_sip_events' AND u.is_active = true
  `);
  return result.rows;
}

async function lookupLead(db, phoneNumber) {
  if (!phoneNumber) return null;
  const result = await db.query(
    'SELECT id, name, phone, uhid FROM leads WHERE phone = $1 OR alternate_contact = $1 LIMIT 1',
    [phoneNumber]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function emitCallEvent(io, userIds, event, payload) {
  if (!io) return;
  for (const user of userIds) {
    io.to(`user_${user.id}`).emit(event, payload);
  }
}

// ── Validators ──
const validateInboundCall = [
  body('caller_phone_number')
    .trim().notEmpty().withMessage('caller_phone_number is required')
    .matches(/^\+?[1-9]\d{6,14}$/).withMessage('caller_phone_number must be valid E.164 format'),
  body('call_status')
    .trim().notEmpty().withMessage('call_status is required')
    .isIn(CALL_STATUSES).withMessage(`call_status must be one of: ${CALL_STATUSES.join(', ')}`),
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

const validateSipEvent = [
  body('event')
    .notEmpty().withMessage('Event type is required')
    .isIn(['incoming', 'outgoing', 'answered', 'ended', 'missed', 'hold', 'unhold', 'failed'])
    .withMessage('Invalid SIP event type'),
  body('call_id')
    .optional({ checkFalsy: true }).trim()
    .isLength({ max: 100 }).withMessage('Call ID must be under 100 characters'),
  body('caller')
    .optional({ checkFalsy: true }).trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Caller number must be 10-15 digits'),
  body('callee')
    .optional({ checkFalsy: true }).trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Callee number must be 10-15 digits'),
  body('duration')
    .optional().isInt({ min: 0 }).withMessage('Duration must be a non-negative integer'),
  handleValidationErrors,
];

const validateManualCallLog = [
  body('caller_number')
    .trim().notEmpty().withMessage('Caller number is required')
    .matches(/^[0-9]{10,15}$/).withMessage('Caller number must be 10-15 digits'),
  body('callee_number')
    .optional({ checkFalsy: true }).trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Callee number must be 10-15 digits'),
  body('direction')
    .optional().isIn(['inbound', 'outbound']).withMessage('Direction must be inbound or outbound'),
  body('lead_id')
    .optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid lead ID'),
  handleValidationErrors,
];

const validateCallUpdate = [
  body('call_status')
    .optional()
    .isIn(CALL_STATUSES).withMessage(`call_status must be one of: ${CALL_STATUSES.join(', ')}`),
  body('duration_seconds')
    .optional().isInt({ min: 0 }).withMessage('duration_seconds must be a non-negative integer'),
  body('notes')
    .optional({ checkFalsy: true }).trim()
    .isLength({ max: 2000 }).withMessage('Notes must be less than 2000 characters'),
  handleValidationErrors,
];

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/calls/inbound  — Telephony vendor webhook
//  Auth: HMAC-SHA256 or JWT Bearer fallback
// ─────────────────────────────────────────────────────────────────────────────
router.post('/inbound', validateTelephonySignature, validateInboundCall, async (req, res) => {
  try {
    const { caller_phone_number, call_status, timestamp, vendor_call_id, duration_seconds, direction, recording_url, intercom_number } = req.body;

    // Auto-lookup lead by phone
    const lead = await lookupLead(db, caller_phone_number);

    const result = await db.query(
      `INSERT INTO telephony_call_logs
         (caller_phone_number, call_status, timestamp, vendor_call_id, duration_seconds,
          direction, recording_url, intercom_number, lead_id, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, caller_phone_number, call_status, timestamp, intercom_number, lead_id`,
      [caller_phone_number, call_status, timestamp, vendor_call_id || null,
       duration_seconds || 0, direction || 'inbound', recording_url || null,
       intercom_number || null, lead?.id || null, req.body]
    );

    const call = result.rows[0];

    // Generate code if not set
    if (!call.code) {
      const code = generateCallCode(call.id);
      await db.query('UPDATE telephony_call_logs SET code = $1 WHERE id = $2', [code, call.id]);
    }

    logger.info('Inbound call recorded', {
      id: call.id,
      phone: maskPhone(caller_phone_number),
      status: call_status,
      direction: direction || 'inbound',
      leadId: lead?.id || null,
    });

    // ── Real-time socket events ──
    const io = req.app.get('io');
    if (io) {
      // Map status to frontend event type
      const eventMap = { initiated: 'incoming', ringing: 'incoming', 'in-progress': 'answered', completed: 'ended', failed: 'failed', missed: 'missed' };
      const eventType = eventMap[call_status] || 'incoming';

      // Get targeted users
      const sipUsers = await getSipUsers(db, intercom_number);

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
        lead_id: lead?.id || null,
        lead_name: lead?.name || null,
      };

      await emitCallEvent(io, sipUsers, 'call-event', socketPayload);

      // Incoming call popup
      if (eventType === 'incoming') {
        await emitCallEvent(io, sipUsers, 'incoming-call', {
          call: {
            id: call.id,
            caller_number: caller_phone_number,
            direction: direction || 'inbound',
            status: call_status,
            duration: duration_seconds || 0,
            intercom_number: intercom_number || null,
          },
          leadInfo: lead ? { id: lead.id, name: lead.name, phone: lead.phone } : null,
        });
      }

      // Notification
      const statusLabel = call_status === 'completed' ? 'Call completed' : (call_status === 'missed' ? 'Missed call' : 'Incoming call');
      notifyByPermission(io, 'calls:receive_sip_events', {
        type: call_status === 'missed' ? 'warning' : 'info',
        title: `${statusLabel} from ${caller_phone_number}${lead ? ` (${lead.name})` : ''}`,
        link: '/calls',
      }).catch(err => logger.error('Failed to send notification', { error: err.message }));
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
      logger.warn('Duplicate call ID', { vendorCallId: req.body.vendor_call_id });
      return res.status(409).json({ status: 'error', message: 'Duplicate call event' });
    }
    logger.error('Inbound call error', { error: err.message, stack: err.stack });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/calls/sip-event  — SIP event webhook (legacy/direct SIP)
//  Auth: JWT required
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sip-event', authenticate, validateSipEvent, async (req, res) => {
  try {
    const { event, call_id, caller, callee, duration } = req.body;

    const callStatus = mapSipEventToStatus(event);
    const direction = (event === 'incoming' || event === 'missed') ? 'inbound' : 'outbound';
    const phoneNumber = event === 'incoming' ? caller : (caller || callee);

    // Lead lookup
    const lead = await lookupLead(db, phoneNumber);

    // Try to find existing call by vendor_call_id
    let existingCall = null;
    if (call_id) {
      const found = await db.query('SELECT * FROM telephony_call_logs WHERE vendor_call_id = $1', [call_id]);
      if (found.rows.length > 0) existingCall = found.rows[0];
    }

    const io = req.app.get('io');

    if (existingCall) {
      // Update existing call
      const updates = ['call_status = $1', 'updated_at = NOW()'];
      const params = [callStatus];
      let idx = 2;

      if (duration !== undefined && (event === 'ended' || event === 'answered')) {
        updates.push(`duration_seconds = $${idx++}`);
        params.push(duration || 0);
      }
      if (lead && !existingCall.lead_id) {
        updates.push(`lead_id = $${idx++}`);
        params.push(lead.id);
      }

      await db.query(
        `UPDATE telephony_call_logs SET ${updates.join(', ')} WHERE id = $${idx}`,
        [...params, existingCall.id]
      );
    } else {
      // Create new call log
      const recordingUrl = event === 'answered' ? '/api/recordings/sample-call.wav' : null;
      const result = await db.query(
        `INSERT INTO telephony_call_logs
           (vendor_call_id, caller_phone_number, call_status, duration_seconds, direction,
            recording_url, lead_id, user_id, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [call_id || `sip-${Date.now()}`, phoneNumber, callStatus, duration || 0,
         direction, recordingUrl, lead?.id || null, req.user?.id || null,
         { sip_event: true, event, caller, callee }]
      );

      // Generate code
      if (!result.rows[0].code) {
        const code = generateCallCode(result.rows[0].id);
        await db.query('UPDATE telephony_call_logs SET code = $1 WHERE id = $2', [code, result.rows[0].id]);
      }
    }

    // ── Real-time socket events ──
    if (io) {
      const sipUsers = await getSipUsers(db, null);

      const socketPayload = {
        event,
        call_id: call_id || existingCall?.id,
        caller,
        callee,
        status: callStatus,
        duration: duration || 0,
        timestamp: new Date().toISOString(),
      };
      await emitCallEvent(io, sipUsers, 'call-event', socketPayload);

      // Incoming call popup
      if (event === 'incoming') {
        let enrichedLeadInfo = null;
        if (lead) {
          const statsResult = await db.query(
            `SELECT COUNT(*) as total_calls,
                    COUNT(*) FILTER (WHERE call_status = 'missed') as missed_calls
             FROM telephony_call_logs
             WHERE caller_phone_number = $1 OR lead_id = $2`,
            [phoneNumber, lead.id]
          );
          enrichedLeadInfo = {
            id: lead.id,
            name: lead.name,
            uhid: lead.uhid || null,
            callStats: {
              totalCalls: parseInt(statsResult.rows[0].total_calls) || 0,
              missedCalls: parseInt(statsResult.rows[0].missed_calls) || 0,
            },
          };
        }

        await emitCallEvent(io, sipUsers, 'incoming-call', {
          call: { id: existingCall?.id, caller_number: caller, direction, status: callStatus, duration: duration || 0 },
          leadInfo: enrichedLeadInfo,
        });
      }

      // Notification
      const notificationTypes = {
        incoming: { type: 'info', title: `Incoming call from ${caller}${lead ? ` (${lead.name})` : ''}` },
        answered: { type: 'success', title: `Call answered: ${caller}${lead ? ` (${lead.name})` : ''}` },
        ended: { type: 'info', title: `Call ended: ${caller}${lead ? ` (${lead.name})` : ''} (${duration || 0}s)` },
        missed: { type: 'warning', title: `Missed call from ${caller}${lead ? ` (${lead.name})` : ''}` },
      };
      const nt = notificationTypes[event];
      if (nt) {
        notifyByPermission(io, 'calls:receive_sip_events', {
          type: nt.type,
          title: nt.title,
          link: '/calls',
        }).catch(err => logger.error('Failed to send notification', { error: err.message }));
      }
    }

    logger.info('SIP event processed', { event, phone: maskPhone(phoneNumber), leadId: lead?.id });

    res.json({ status: 'success', message: 'SIP event processed.' });
  } catch (err) {
    logger.error('SIP event error', { error: err.message, body: req.body });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message, code: 'SIP_EVENT_ERROR' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/calls  — List call logs with filters (unified)
//  Auth: JWT required
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authenticate, validatePagination, async (req, res) => {
  try {
    const { user_id, direction, status, call_status, limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const where = [];
    let paramIndex = 1;

    if (user_id) {
      where.push(`tcl.user_id = $${paramIndex++}`);
      params.push(user_id);
    }
    if (direction) {
      where.push(`tcl.direction = $${paramIndex++}`);
      params.push(direction);
    }
    // Support both `status` and `call_status` query params (backward compat)
    const statusFilter = status || call_status;
    if (statusFilter) {
      where.push(`tcl.call_status = $${paramIndex++}`);
      params.push(statusFilter);
    }

    // Intercom-based filtering: non-admin/manager users only see their intercom calls
    const userRoles = req.user.roles || [req.user.role];
    const isAdmin = userRoles.includes('super_admin') || userRoles.includes('manager');
    if (!isAdmin && req.user.intercom_number) {
      where.push(`tcl.intercom_number = $${paramIndex++}`);
      params.push(req.user.intercom_number);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT tcl.*, l.name as lead_name, l.phone as lead_phone, u.name as user_name
         FROM telephony_call_logs tcl
         LEFT JOIN leads l ON tcl.lead_id = l.id
         LEFT JOIN users u ON tcl.user_id = u.id
         ${whereClause}
         ORDER BY tcl.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, parseInt(limit), parseInt(offset)]
      ),
      db.query(
        `SELECT COUNT(*) FROM telephony_call_logs tcl ${whereClause}`,
        params
      ),
    ]);

    res.json({
      status: 'success',
      data: {
        calls: dataResult.rows.map(row => ({
          id: row.id,
          caller_number: row.caller_phone_number,
          callee_number: row.vendor_call_id?.startsWith('sip-') ? null : null,
          direction: row.direction,
          call_status: row.call_status,
          status: row.call_status, // Legacy field for backward compat
          duration: row.duration_seconds,
          duration_seconds: row.duration_seconds,
          recording_url: row.recording_url,
          intercom_number: row.intercom_number,
          timestamp: row.timestamp,
          received_at: row.received_at,
          created_at: row.created_at,
          vendor_call_id: row.vendor_call_id,
          code: row.code,
          lead_id: row.lead_id,
          lead_name: row.lead_name || null,
          lead_phone: row.lead_phone || null,
          user_id: row.user_id,
          user_name: row.user_name || null,
          notes: row.notes,
        })),
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) {
    logger.error('Get calls error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message, code: 'CALLS_FETCH_ERROR' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/calls/stats  — Call statistics (unified)
//  Auth: JWT required
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userRoles = req.user.roles || [req.user.role];
    const isAdmin = userRoles.includes('super_admin') || userRoles.includes('manager');

    let intercomFilter = '';
    const params = [];
    if (!isAdmin && req.user.intercom_number) {
      intercomFilter = ' AND tcl.intercom_number = $1';
      params.push(req.user.intercom_number);
    }

    const result = await db.query(`
      SELECT
        COUNT(*)::int as total_today,
        COUNT(*) FILTER (WHERE tcl.direction = 'inbound')::int as inbound,
        COUNT(*) FILTER (WHERE tcl.direction = 'outbound')::int as outbound,
        COUNT(*) FILTER (WHERE tcl.call_status = 'missed')::int as missed_today,
        COALESCE(AVG(tcl.duration_seconds) FILTER (WHERE tcl.call_status IN ('completed', 'in-progress') AND tcl.duration_seconds > 0), 0)::int as avg_duration
      FROM telephony_call_logs tcl
      WHERE tcl.created_at::date = CURRENT_DATE${intercomFilter}
    `, params);

    const stats = result.rows[0];
    res.json({
      status: 'success',
      data: {
        totalToday: parseInt(stats.total_today) || 0,
        inbound: parseInt(stats.inbound) || 0,
        outbound: parseInt(stats.outbound) || 0,
        missedToday: parseInt(stats.missed_today) || 0,
        missed_today: parseInt(stats.missed_today) || 0,
        avgDuration: stats.avg_duration || 0,
        avg_duration: stats.avg_duration || 0,
      },
    });
  } catch (err) {
    logger.error('Call stats error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message, code: 'CALL_STATS_ERROR' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/calls/phone/:phone  — Call history for a phone number
//  Auth: JWT required
// ─────────────────────────────────────────────────────────────────────────────
router.get('/phone/:phone', authenticate, async (req, res) => {
  try {
    const phone = req.params.phone.replace(/\D/g, '');
    const result = await db.query(
      `SELECT tcl.*, l.name as lead_name, l.phone as lead_phone
       FROM telephony_call_logs tcl
       LEFT JOIN leads l ON tcl.lead_id = l.id
       WHERE tcl.caller_phone_number = $1
       ORDER BY tcl.created_at DESC
       LIMIT 10`,
      [phone]
    );

    res.json({
      status: 'success',
      data: {
        calls: result.rows.map(row => ({
          id: row.id,
          caller_number: row.caller_phone_number,
          direction: row.direction,
          status: row.call_status,
          duration: row.duration_seconds,
          created_at: row.created_at,
          lead_name: row.lead_name,
          lead_phone: row.lead_phone,
        })),
      },
    });
  } catch (err) {
    logger.error('Call history by phone error', { error: err.message, phone: req.params.phone });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message, code: 'CALL_HISTORY_ERROR' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/calls  — Log a call manually (from SIP or manual entry)
//  Auth: JWT required
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authenticate, validateManualCallLog, async (req, res) => {
  try {
    const { caller_number, callee_number, direction, status, duration, lead_id, notes } = req.body;

    // Auto-lookup lead by caller number
    let resolvedLeadId = lead_id;
    if (!resolvedLeadId && caller_number) {
      const lead = await lookupLead(db, caller_number);
      if (lead) resolvedLeadId = lead.id;
    }

    const result = await db.query(
      `INSERT INTO telephony_call_logs
         (caller_phone_number, call_status, duration_seconds, direction, lead_id, user_id, notes, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [caller_number, status || 'initiated', duration || 0, direction || 'inbound',
       resolvedLeadId, req.user.id, notes || null,
       { manual_entry: true, callee_number: callee_number || null }]
    );

    const call = result.rows[0];

    // Generate code
    if (!call.code) {
      const code = generateCallCode(call.id);
      await db.query('UPDATE telephony_call_logs SET code = $1 WHERE id = $2', [code, call.id]);
      call.code = code;
    }

    // Update lead's last_call_date if linked
    if (resolvedLeadId) {
      await db.query(
        'UPDATE leads SET last_call_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [resolvedLeadId]
      );
    }

    // Notify for missed calls
    if (status === 'missed') {
      const io = req.app.get('io');
      notifyByPermission(io, 'calls:receive_sip_events', {
        type: 'warning',
        title: `Missed call from ${caller_number}${call.lead_id ? ` (${call.lead_name})` : ''}`,
        link: '/calls',
      }).catch(err => logger.error('Missed call notification error', { error: err.message }));
    }

    logger.info('Call logged manually', {
      callId: call.id,
      callerNumber: caller_number,
      direction,
      status,
      leadId: resolvedLeadId,
      userId: req.user.id,
    });

    res.status(201).json({
      status: 'success',
      data: {
        call: {
          id: call.id,
          caller_number: call.caller_phone_number,
          direction: call.direction,
          call_status: call.call_status,
          status: call.call_status,
          duration: call.duration_seconds,
          lead_id: call.lead_id,
          user_id: call.user_id,
          notes: call.notes,
          code: call.code,
          created_at: call.created_at,
        },
      },
    });
  } catch (err) {
    logger.error('Log call error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message, code: 'CALL_LOG_ERROR' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/calls/:id  — Update call status/notes
//  Auth: JWT required
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', authenticate, validateCallUpdate, async (req, res) => {
  try {
    const { call_status, duration_seconds, notes } = req.body;

    // Build dynamic update (id is UUID)
    const updates = ['updated_at = NOW()'];
    const params = [];
    let idx = 1;

    if (call_status) {
      updates.push(`call_status = $${idx++}`);
      params.push(call_status);
    }
    if (duration_seconds !== undefined) {
      updates.push(`duration_seconds = $${idx++}`);
      params.push(duration_seconds);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      params.push(notes);
    }

    params.push(req.params.id);

    const result = await db.query(
      `UPDATE telephony_call_logs SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Call log not found.', code: 'CALL_NOT_FOUND' });
    }

    logger.info('Call updated', { callId: req.params.id, status: call_status, userId: req.user.id });

    res.json({
      status: 'success',
      data: {
        call: {
          id: result.rows[0].id,
          caller_number: result.rows[0].caller_phone_number,
          call_status: result.rows[0].call_status,
          duration: result.rows[0].duration_seconds,
          notes: result.rows[0].notes,
          updated_at: result.rows[0].updated_at,
        },
      },
    });
  } catch (err) {
    logger.error('Update call error', { error: err.message, callId: req.params.id });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message, code: 'CALL_UPDATE_ERROR' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/calls/telephony/stats  — Telephony-specific stats (backward compat)
//  Auth: JWT required
// ─────────────────────────────────────────────────────────────────────────────
router.get('/telephony/stats', authenticate, async (req, res) => {
  try {
    const userRoles = req.user.roles || [req.user.role];
    const isAdmin = userRoles.includes('super_admin') || userRoles.includes('manager');

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

    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    logger.error('Telephony stats error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred', code: 'TELEPHONY_STATS_ERROR' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/calls/telephony  — Telephony-specific list (backward compat)
//  Auth: JWT required
// ─────────────────────────────────────────────────────────────────────────────
router.get('/telephony', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, direction, phone } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const where = [];
    let paramIndex = 1;

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
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) {
    logger.error('Get telephony logs error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'An error occurred', code: 'TELEPHONY_LOGS_ERROR' });
  }
});

module.exports = router;
