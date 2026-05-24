const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticate);

// Helper: build date WHERE clause based on range
const rangeClause = (range, alias = '', dateCol = 'created_at') => {
  const col = alias ? `${alias}.${dateCol}` : dateCol;
  if (range === 'today') return `AND DATE(${col}) = CURRENT_DATE`;
  if (range === 'month') return `AND ${col} >= DATE_TRUNC('month', CURRENT_DATE)`;
  return ''; // 'all' — no filter
};

// GET /api/dashboard/metrics — overview cards (calls + leads)
router.get('/metrics', async (req, res) => {
  try {
    const range = req.query.range || 'all';
    // telephony_call_logs uses received_at as its timestamp column
    const callWhere = rangeClause(range, '', 'received_at');
    const leadWhere = rangeClause(range, 'l', 'created_at');

    // Call metrics from telephony_call_logs (vendor webhook data)
    const metrics = await db.query(`
      SELECT
        COUNT(*)::int as total_calls,
        COUNT(DISTINCT caller_phone_number)::int as unique_calls,
        COUNT(*) FILTER (WHERE call_status = 'missed')::int as missed_calls,
        COUNT(DISTINCT caller_phone_number) FILTER (WHERE call_status = 'missed')::int as unique_missed,
        COUNT(*) FILTER (WHERE call_status IN ('in-progress', 'completed'))::int as answered_calls,
        COUNT(DISTINCT caller_phone_number) FILTER (WHERE call_status IN ('in-progress', 'completed'))::int as unique_answered
      FROM telephony_call_logs
      WHERE 1=1 ${callWhere}
    `);

    const m = metrics.rows[0];
    const totalCalls = parseInt(m.total_calls) || 0;
    const missedCalls = parseInt(m.missed_calls) || 0;
    const answeredCalls = parseInt(m.answered_calls) || 0;
    const unanswered = totalCalls - answeredCalls;

    // Action required = leads with status New in the range
    const actionResult = await db.query(
      `SELECT COUNT(*) FROM leads l WHERE l.status = 'New' ${leadWhere}`
    );

    // Lead metrics
    const leadMetrics = await db.query(`
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE DATE(l.created_at) = CURRENT_DATE) as leads_today,
        COUNT(*) FILTER (WHERE l.status = 'New') as new_leads,
        COUNT(*) FILTER (WHERE l.priority = 'High') as high_priority
      FROM leads l
      WHERE 1=1 ${leadWhere}
    `);
    const lm = leadMetrics.rows[0];

    res.json({
      status: 'success',
      data: {
        totalCalls: {
          total: totalCalls,
          unique: parseInt(m.unique_calls) || 0,
        },
        missedCalls: {
          total: missedCalls,
          unique: parseInt(m.unique_missed) || 0,
          status: missedCalls > 0 ? 'High Volume' : 'Normal',
        },
        actionRequired: {
          count: parseInt(actionResult.rows[0].count),
          label: 'Urgent',
        },
        answered: {
          total: answeredCalls,
          unique: parseInt(m.unique_answered) || 0,
        },
        unanswered: {
          count: unanswered,
          percentage: totalCalls > 0 ? Math.round((unanswered / totalCalls) * 100) : 0,
        },
        overallLeads: {
          total: parseInt(lm.total_leads) || 0,
        },
        newLeadsToday: {
          total: parseInt(lm.leads_today) || 0,
        },
        totalLeads: {
          total: parseInt(lm.total_leads) || 0,
          highPriority: parseInt(lm.high_priority) || 0,
          newStatus: parseInt(lm.new_leads) || 0,
        },
      },
    });
  } catch (err) {
    logger.error('Dashboard metrics error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to fetch dashboard metrics.', code: 'DASHBOARD_METRICS_ERROR' });
  }
});

// GET /api/dashboard/activity — recent activity from telephony_call_logs + leads
router.get('/activity', async (req, res) => {
  try {
    const { type, range, limit = 20 } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (range === 'today') {
      where += ` AND DATE(t.received_at) = CURRENT_DATE`;
    } else if (range === 'month') {
      where += ` AND t.received_at >= DATE_TRUNC('month', CURRENT_DATE)`;
    }

    if (type && type !== 'All') {
      if (type === 'Answered') {
        where += ` AND t.call_status IN ('in-progress', 'completed')`;
      } else if (type === 'Missed') {
        where += ` AND t.call_status = 'missed'`;
      }
    }

    params.push(parseInt(limit));

    const result = await db.query(
      `SELECT t.id, t.vendor_call_id as code, t.caller_phone_number as caller_number,
              t.direction, t.call_status as status,
              t.duration_seconds as duration, t.received_at as created_at,
              l.name as lead_name, l.code as lead_code
       FROM telephony_call_logs t
       LEFT JOIN leads l ON t.caller_phone_number = l.phone OR t.caller_phone_number = l.alternate_contact
       ${where}
       ORDER BY t.received_at DESC
       LIMIT $${paramIdx}`,
      params
    );

    res.json({
      status: 'success',
      data: { activity: result.rows },
    });
  } catch (err) {
    logger.error('Dashboard activity error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to fetch activity log.', code: 'ACTIVITY_ERROR' });
  }
});

// GET /api/dashboard/activity/export — CSV export of activity log
router.get('/activity/export', async (req, res) => {
  try {
    const { type, range } = req.query;

    let where = 'WHERE 1=1';
    if (range === 'today') {
      where += ` AND DATE(t.received_at) = CURRENT_DATE`;
    } else if (range === 'month') {
      where += ` AND t.received_at >= DATE_TRUNC('month', CURRENT_DATE)`;
    }

    if (type && type !== 'All') {
      if (type === 'Answered') {
        where += ` AND t.call_status IN ('in-progress', 'completed')`;
      } else if (type === 'Missed') {
        where += ` AND t.call_status = 'missed'`;
      }
    }

    const result = await db.query(
      `SELECT t.vendor_call_id as "Call Code", t.caller_phone_number as "Caller Number",
              t.direction as "Direction", t.call_status as "Status",
              t.duration_seconds as "Duration (s)",
              l.name as "Patient Name", l.code as "Lead Code",
              TO_CHAR(t.received_at, 'DD Mon YYYY HH24:MI') as "Date & Time"
       FROM telephony_call_logs t
       LEFT JOIN leads l ON t.caller_phone_number = l.phone OR t.caller_phone_number = l.alternate_contact
       ${where}
       ORDER BY t.received_at DESC`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No data to export' });
    }

    const headers = Object.keys(result.rows[0]);
    const escapeCsv = (val) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const csv = [
      headers.join(','),
      ...result.rows.map(row => headers.map(h => escapeCsv(row[h])).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=activity-log-${range || 'all'}.csv`);
    res.send(csv);
  } catch (err) {
    logger.error('Activity export error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to export activity log.' });
  }
});

// POST /api/dashboard/activity — log an activity
router.post('/activity', async (req, res) => {
  try {
    const { action, details, patient_name, call_type, status, duration } = req.body;

    const result = await db.query(
      `INSERT INTO activity_log (provider_id, patient_name, call_type, status, duration)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, patient_name || details, call_type, status, duration]
    );

    logger.info('Activity logged', { action, userId: req.user.id });

    res.status(201).json({ status: 'success', data: { activity: result.rows[0] } });
  } catch (err) {
    logger.error('Log activity error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to log activity.', code: 'ACTIVITY_LOG_ERROR' });
  }
});

module.exports = router;
