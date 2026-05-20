const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validateCallLog, validateCallUpdate, validateSipEvent, validateId, validatePagination } = require('../middleware/validate');
const { notify, notifyManagers } = require('../utils/notify');
const logger = require('../utils/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/calls — list call logs with filters
router.get('/', validatePagination, async (req, res) => {
  try {
    const { user_id, direction, status, limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const where = [];
    let paramIndex = 1;

    if (user_id) {
      where.push(`cl.user_id = $${paramIndex++}`);
      params.push(user_id);
    }
    if (direction) {
      where.push(`cl.direction = $${paramIndex++}`);
      params.push(direction);
    }
    if (status) {
      where.push(`cl.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT cl.*, l.name as lead_name, l.phone as lead_phone, u.name as user_name
       FROM call_logs cl
       LEFT JOIN leads l ON cl.lead_id = l.id
       LEFT JOIN users u ON cl.user_id = u.id
       ${whereClause}
       ORDER BY cl.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM call_logs cl ${whereClause}`,
      params
    );

    res.json({
      status: 'success',
      data: {
        calls: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (err) {
    logger.error('Get calls error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to fetch calls.', code: 'CALLS_FETCH_ERROR' });
  }
});

// GET /api/calls/stats — call statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_today,
        COUNT(*) FILTER (WHERE status = 'missed') as missed_today,
        COUNT(*) FILTER (WHERE direction = 'inbound') as inbound,
        COUNT(*) FILTER (WHERE direction = 'outbound') as outbound,
        AVG(duration) FILTER (WHERE status = 'connected' AND duration > 0) as avg_duration
      FROM call_logs
    `);

    const stats = result.rows[0];
    res.json({
      status: 'success',
      data: {
        totalToday: parseInt(stats.total_today) || 0,
        missedToday: parseInt(stats.missed_today) || 0,
        inbound: parseInt(stats.inbound) || 0,
        outbound: parseInt(stats.outbound) || 0,
        avgDuration: Math.round(parseFloat(stats.avg_duration) || 0),
      },
    });
  } catch (err) {
    logger.error('Call stats error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to fetch call stats.', code: 'CALL_STATS_ERROR' });
  }
});

// GET /api/calls/phone/:phone — get call history for a phone number
router.get('/phone/:phone', authenticate, async (req, res) => {
  try {
    const phone = req.params.phone.replace(/\D/g, '');
    const result = await db.query(
      `SELECT cl.*, l.name as lead_name
       FROM call_logs cl
       LEFT JOIN leads l ON cl.lead_id = l.id
       WHERE cl.caller_number = $1
       ORDER BY cl.created_at DESC
       LIMIT 10`,
      [phone]
    );

    res.json({ status: 'success', data: { calls: result.rows } });
  } catch (err) {
    logger.error('Call history by phone error', { error: err.message, phone: req.params.phone });
    res.status(500).json({ status: 'error', message: 'Failed to fetch call history.', code: 'CALL_HISTORY_ERROR' });
  }
});

// POST /api/calls — log a call (from SIP webhook or manual entry)
router.post('/', validateCallLog, async (req, res) => {
  try {
    const { caller_number, callee_number, direction, status, duration, lead_id, notes } = req.body;

    // Auto-lookup lead by caller number
    let resolvedLeadId = lead_id;
    let leadName = null;

    if (!resolvedLeadId && caller_number) {
      const leadResult = await db.query(
        'SELECT id, name FROM leads WHERE phone = $1 OR alternate_contact = $1 LIMIT 1',
        [caller_number]
      );
      if (leadResult.rows.length > 0) {
        resolvedLeadId = leadResult.rows[0].id;
        leadName = leadResult.rows[0].name;
      }
    }

    const result = await db.query(
      `INSERT INTO call_logs (caller_number, callee_number, direction, status, duration, lead_id, user_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [caller_number, callee_number, direction || 'inbound', status || 'ringing', duration || 0, resolvedLeadId, req.user.id, notes]
    );

    const call = result.rows[0];

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
      await notifyManagers(io, {
        type: 'warning',
        title: `Missed call from ${caller_number}${leadName ? ` (${leadName})` : ''}`,
        link: '/calls',
      });
    }

    logger.info('Call logged', {
      callId: call.id,
      callerNumber: caller_number,
      direction,
      status,
      leadId: resolvedLeadId,
      userId: req.user.id,
    });

    res.status(201).json({ status: 'success', data: { call } });
  } catch (err) {
    logger.error('Log call error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to log call.', code: 'CALL_LOG_ERROR' });
  }
});

// PUT /api/calls/:id — update call status
router.put('/:id', validateId, validateCallUpdate, async (req, res) => {
  try {
    const { status, duration, notes } = req.body;

    const result = await db.query(
      `UPDATE call_logs SET
        status = COALESCE($1, status),
        duration = COALESCE($2, duration),
        notes = COALESCE($3, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [status, duration, notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Call log not found.', code: 'CALL_NOT_FOUND' });
    }

    logger.info('Call updated', { callId: req.params.id, status, userId: req.user.id });

    res.json({ status: 'success', data: { call: result.rows[0] } });
  } catch (err) {
    logger.error('Update call error', { error: err.message, callId: req.params.id });
    res.status(500).json({ status: 'error', message: 'Failed to update call.', code: 'CALL_UPDATE_ERROR' });
  }
});

// POST /api/calls/sip-event — SIP event webhook (for real-time call events)
router.post('/sip-event', validateSipEvent, async (req, res) => {
  try {
    const { event, call_id, caller, callee, status, duration } = req.body;

    logger.info('SIP event received', { event, callId: call_id, caller, callee, status });

    const io = req.app.get('io');

    // Emit real-time call event to targeted rooms (not global broadcast)
    if (io) {
      // Notify users with receive_sip_events permission
      const sipUsers = await db.query(`
        SELECT DISTINCT u.id FROM users u
        INNER JOIN user_roles ur ON u.id = ur.user_id
        INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE p.name = 'calls:receive_sip_events' AND u.is_active = true
      `);
      for (const sipUser of sipUsers.rows) {
        io.to(`user_${sipUser.id}`).emit('call-event', {
          event,
          call_id,
          caller,
          callee,
          status,
          duration,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Determine status and timestamps based on event
    let callStatus, startTime, endTime;
    if (event === 'incoming' || event === 'outgoing') {
      callStatus = 'ringing';
      startTime = 'CURRENT_TIMESTAMP';
    } else if (event === 'answered') {
      callStatus = 'connected';
      startTime = 'CURRENT_TIMESTAMP';
    } else if (event === 'ended') {
      callStatus = 'disconnected';
      endTime = 'CURRENT_TIMESTAMP';
    } else if (event === 'missed') {
      callStatus = 'missed';
      endTime = 'CURRENT_TIMESTAMP';
    }

    // Lookup lead by caller/callee number
    const phoneNumber = event === 'incoming' ? caller : (caller || callee);
    const leadResult = await db.query(
      'SELECT id, name FROM leads WHERE phone = $1 OR alternate_contact = $1 LIMIT 1',
      [phoneNumber]
    );
    const leadId = leadResult.rows.length > 0 ? leadResult.rows[0].id : null;
    const leadName = leadResult.rows.length > 0 ? leadResult.rows[0].name : null;

    // Try to find existing call log by call_id
    let callLog = null;
    if (call_id) {
      const existing = await db.query('SELECT * FROM call_logs WHERE call_id = $1', [call_id]);
      if (existing.rows.length > 0) {
        callLog = existing.rows[0];
      }
    }

    // Predefined recording for answered calls (test environment mirrors live recording)
    const recordingUrl = event === 'answered' ? '/api/recordings/sample-call.wav' : null;

    if (callLog) {
      // Update existing call log
      const updates = ['status = $1'];
      const params = [callStatus];
      let paramIdx = 2;

      if (startTime) { updates.push(`start_time = CURRENT_TIMESTAMP`); }
      if (endTime) { updates.push(`end_time = CURRENT_TIMESTAMP`); }
      if (duration !== undefined && event === 'ended') { updates.push(`duration = $${paramIdx++}`); params.push(duration || 0); }
      if (recordingUrl) { updates.push(`recording_url = $${paramIdx++}`); params.push(recordingUrl); }

      await db.query(
        `UPDATE call_logs SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
        [...params, callLog.id]
      );
      callLog = { ...callLog, status: callStatus, duration: duration || callLog.duration, recording_url: recordingUrl || callLog.recording_url };
    } else {
      // Create new call log entry
      const direction = (event === 'incoming' || event === 'missed') ? 'inbound' : 'outbound';
      const result = await db.query(
        `INSERT INTO call_logs (caller_number, callee_number, direction, status, lead_id, call_id, start_time, end_time, duration, recording_url)
         VALUES ($1, $2, $3, $4, $5, $6, ${startTime || 'NULL'}, ${endTime || 'NULL'}, $7, $8) RETURNING *`,
        [caller || 'unknown', callee || 'unknown', direction, callStatus, leadId, call_id || `sip-${Date.now()}`, duration || 0, recordingUrl]
      );
      callLog = result.rows[0];
    }

    // Handle incoming call popup
    if (io && event === 'incoming') {
      let enrichedLeadInfo = null;

      if (leadId) {
        // Get call stats for this phone
        const statsResult = await db.query(
          `SELECT
             COUNT(*) as total_calls,
             COUNT(*) FILTER (WHERE status = 'missed') as missed_calls
           FROM call_logs
           WHERE caller_number = $1 OR lead_id = $2`,
          [phoneNumber, leadId]
        );

        // Get lead details (alternate contact, UHID)
        const leadDetails = await db.query(
          'SELECT alternate_contact, uhid FROM leads WHERE id = $1',
          [leadId]
        );

        const stats = statsResult.rows[0];
        const details = leadDetails.rows[0] || {};

        enrichedLeadInfo = {
          id: leadId,
          name: leadName,
          uhid: details.uhid || null,
          alternateContact: details.alternate_contact || null,
          callStats: {
            totalCalls: parseInt(stats.total_calls) || 0,
            missedCalls: parseInt(stats.missed_calls) || 0,
          },
        };
      }

      io.emit('incoming-call', {
        call: callLog,
        leadInfo: enrichedLeadInfo,
      });
    }

    // Send notifications for all event types
    const allUsers = await db.query(`
      SELECT DISTINCT u.id FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE p.name = 'notifications:manage' AND u.is_active = true
    `);
    let notificationTitle, notificationType;

    if (event === 'incoming') {
      notificationTitle = `Incoming call from ${caller}${leadName ? ` (${leadName})` : ''}`;
      notificationType = 'info';
    } else if (event === 'answered') {
      notificationTitle = `Call answered: ${caller}${leadName ? ` (${leadName})` : ''}`;
      notificationType = 'success';
    } else if (event === 'ended') {
      notificationTitle = `Call ended: ${caller}${leadName ? ` (${leadName})` : ''} (${duration || 0}s)`;
      notificationType = 'info';
    } else if (event === 'missed') {
      notificationTitle = `Missed call from ${caller}${leadName ? ` (${leadName})` : ''}`;
      notificationType = 'warning';
    }

    if (notificationTitle) {
      for (const u of allUsers.rows) {
        await notify(io, {
          user_id: u.id,
          type: notificationType,
          title: notificationTitle,
          link: '/calls',
        });
      }
    }

    logger.info('SIP event processed', { event, callId: callLog.id, leadId });

    res.json({ status: 'success', message: 'SIP event processed.' });
  } catch (err) {
    logger.error('SIP event error', { error: err.message, body: req.body });
    res.status(500).json({ status: 'error', message: 'Failed to process SIP event.', code: 'SIP_EVENT_ERROR' });
  }
});

module.exports = router;
