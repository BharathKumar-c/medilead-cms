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
        COUNT(DISTINCT caller_number) FILTER (WHERE status IN ('connected', 'disconnected')) as unique_answered
      FROM call_logs
    `);

    const m = metrics.rows[0];
    const totalCalls = parseInt(m.total_calls) || 0;
    const missedCalls = parseInt(m.missed_calls) || 0;
    const answeredCalls = parseInt(m.answered_calls) || 0;
    const unanswered = totalCalls - answeredCalls;

    // Action required = leads with status New
    const actionResult = await db.query(`SELECT COUNT(*) FROM leads WHERE status = 'New'`);

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
