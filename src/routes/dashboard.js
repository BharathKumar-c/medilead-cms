const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard/metrics — overview cards
router.get('/metrics', async (req, res) => {
  try {
    // Read from call_logs (real-time data) instead of call_metrics (pre-seeded)
    const metrics = await db.query(`
      SELECT
        COUNT(*) as total_calls,
        COUNT(DISTINCT caller_number) as unique_calls,
        COUNT(*) FILTER (WHERE status = 'missed') as missed_calls,
        COUNT(DISTINCT caller_number) FILTER (WHERE status = 'missed') as unique_missed,
        COUNT(*) FILTER (WHERE status IN ('connected', 'disconnected')) as answered_calls,
        COUNT(DISTINCT caller_number) FILTER (WHERE status IN ('connected', 'disconnected')) as unique_answered,
        COUNT(*) FILTER (WHERE direction = 'outbound' AND status IN ('missed', 'failed')) as unanswered_outbound
      FROM call_logs
    `);

    const m = metrics.rows[0];
    const totalCalls = parseInt(m.total_calls) || 0;
    const missedCalls = parseInt(m.missed_calls) || 0;
    const answeredCalls = parseInt(m.answered_calls) || 0;
    const unansweredOutbound = parseInt(m.unanswered_outbound) || 0;

    // Action to be taken: total calls + leads generated from calls
    const actionResult = await db.query(`
      SELECT
        COUNT(*) as total_calls,
        COUNT(DISTINCT l.id) as leads_from_calls
      FROM call_logs cl
      LEFT JOIN leads l ON (cl.caller_number = l.phone OR cl.caller_number = l.alternate_contact)
    `);

    // Lead metrics
    const leadMetrics = await db.query(`
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as leads_today,
        COUNT(*) FILTER (WHERE priority = 'High') as high_priority,
        COUNT(*) FILTER (WHERE status = 'Follow-up') as follow_ups
      FROM leads
    `);
    const lm = leadMetrics.rows[0];

    res.json({
      status: 'success',
      data: {
        totalCalls: {
          total: totalCalls,
          unique: parseInt(m.unique_calls) || 0,
          trend: '+12.4%',
        },
        missedCalls: {
          total: missedCalls,
          unique: parseInt(m.unique_missed) || 0,
          status: missedCalls > 0 ? 'High Volume' : 'Normal',
        },
        actionRequired: {
          totalCalls: parseInt(actionResult.rows[0].total_calls) || 0,
          leadsFromCalls: parseInt(actionResult.rows[0].leads_from_calls) || 0,
        },
        answered: {
          total: answeredCalls,
          unique: parseInt(m.unique_answered) || 0,
        },
        unanswered: {
          count: unansweredOutbound,
          percentage: totalCalls > 0 ? Math.round((unansweredOutbound / totalCalls) * 100) : 0,
        },
        newLeadsToday: {
          total: parseInt(lm.leads_today) || 0,
        },
        totalLeads: {
          total: parseInt(lm.total_leads) || 0,
          highPriority: parseInt(lm.high_priority) || 0,
        },
        followUps: {
          total: parseInt(lm.follow_ups) || 0,
        },
      },
    });
  } catch (err) {
    logger.error('Dashboard metrics error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to fetch dashboard metrics.', code: 'DASHBOARD_METRICS_ERROR' });
  }
});

// GET /api/dashboard/activity — recent activity log
router.get('/activity', async (req, res) => {
  try {
    const { type, limit = 20 } = req.query;

    let where = '';
    const params = [];

    if (type && type !== 'All') {
      where = 'WHERE al.action = $1';
      params.push(type);
    }

    const result = await db.query(
      `SELECT al.*, u.name as user_name
       FROM activity_log al
       LEFT JOIN users u ON al.provider_id = u.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit)]
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
