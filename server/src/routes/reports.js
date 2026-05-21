const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticate);

// GET /api/reports/overview — summary cards
router.get('/overview', async (req, res) => {
  try {
    const [calls, leads, appointments] = await Promise.all([
      db.query(`SELECT COUNT(*) as total FROM call_logs`),
      db.query(`SELECT COUNT(*) as total FROM leads`),
      db.query(`SELECT COUNT(*) as total FROM appointments`),
    ]);

    const totalCalls = parseInt(calls.rows[0].total) || 0;
    const totalLeads = parseInt(leads.rows[0].total) || 0;
    const totalAppts = parseInt(appointments.rows[0].total) || 0;

    // Conversion rate
    const closed = await db.query(`SELECT COUNT(*) FROM leads WHERE status = 'Closed'`);
    const conversionRate = totalLeads > 0 ? Math.round((parseInt(closed.rows[0].count) / totalLeads) * 100) : 0;

    res.json({
      status: 'success',
      data: {
        totalCalls,
        totalLeads,
        totalAppointments: totalAppts,
        conversionRate,
        avgResponseTime: '—',
        patientSatisfaction: 0,
      },
    });
  } catch (err) {
    logger.error('Reports overview error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'REPORTS_OVERVIEW_ERROR' });
  }
});

// GET /api/reports/call-volume — monthly call volume
router.get('/call-volume', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        TO_CHAR(created_at, 'Mon') as month,
        COUNT(*) as calls
      FROM call_logs
      GROUP BY TO_CHAR(created_at, 'Mon'), MIN(created_at)
      ORDER BY MIN(created_at)
    `);

    res.json({ status: 'success', data: { callVolume: result.rows } });
  } catch (err) {
    logger.error('Call volume error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'CALL_VOLUME_ERROR' });
  }
});

// GET /api/reports/lead-sources — lead distribution by source
router.get('/lead-sources', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        lead_source as source,
        COUNT(*) as value
      FROM leads
      WHERE lead_source IS NOT NULL
      GROUP BY lead_source
      ORDER BY value DESC
    `);

    // Calculate percentages
    const total = result.rows.reduce((sum, r) => sum + parseInt(r.value), 0);
    const sources = result.rows.map(r => ({
      source: r.source,
      value: parseInt(r.value),
      percentage: total > 0 ? Math.round((parseInt(r.value) / total) * 100) : 0,
    }));

    res.json({ status: 'success', data: { sources } });
  } catch (err) {
    logger.error('Lead sources error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'LEAD_SOURCES_ERROR' });
  }
});

// GET /api/reports/department-performance
router.get('/department-performance', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        department,
        COUNT(*) as appointments,
        COUNT(*) FILTER (WHERE status = 'Completed') as completed,
        COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'No Show') as no_show
      FROM appointments
      GROUP BY department
      ORDER BY appointments DESC
    `);

    const departments = result.rows.map(r => ({
      department: r.department,
      leads: 0,
      appointments: parseInt(r.appointments) || 0,
      conversions: parseInt(r.completed) || 0,
      satisfaction: 0,
    }));

    res.json({ status: 'success', data: { departments } });
  } catch (err) {
    logger.error('Department performance error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'DEPT_PERFORMANCE_ERROR' });
  }
});

// GET /api/reports/provider-leaderboard
router.get('/provider-leaderboard', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.name as provider,
        u.specialty as department,
        COUNT(DISTINCT l.id) as leads,
        COUNT(DISTINCT a.id) as appointments,
        COUNT(DISTINCT CASE WHEN l.status = 'Closed' THEN l.id END) as conversions
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
      INNER JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN leads l ON l.assigned_to = u.id
      LEFT JOIN appointments a ON a.provider_id = u.id
      WHERE p.name = 'leads:view_providers' AND u.is_active = true
      GROUP BY u.id, u.name, u.specialty
      ORDER BY conversions DESC
      LIMIT 10
    `);

    const providers = result.rows.map(r => ({
      provider: r.provider,
      department: r.department || 'General',
      leads: parseInt(r.leads) || 0,
      appointments: parseInt(r.appointments) || 0,
      conversions: parseInt(r.conversions) || 0,
      conversionRate: parseInt(r.leads) > 0 ? Math.round((parseInt(r.conversions) / parseInt(r.leads)) * 100) : 0,
    }));

    res.json({ status: 'success', data: { providers } });
  } catch (err) {
    logger.error('Provider leaderboard error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'PROVIDER_LEADERBOARD_ERROR' });
  }
});

// GET /api/reports/status-breakdown — lead status breakdown
router.get('/status-breakdown', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT status, COUNT(*) as count
      FROM leads
      GROUP BY status
      ORDER BY count DESC
    `);

    const total = result.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
    const breakdown = result.rows.map(r => ({
      status: r.status,
      count: parseInt(r.count),
      percentage: total > 0 ? Math.round((parseInt(r.count) / total) * 100) : 0,
    }));

    res.json({ status: 'success', data: { breakdown } });
  } catch (err) {
    logger.error('Status breakdown error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'STATUS_BREAKDOWN_ERROR' });
  }
});

// GET /api/reports/weekly-trend — weekly lead/call trend
router.get('/weekly-trend', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        TO_CHAR(created_at, 'Dy') as day,
        COUNT(*) as leads,
        0 as calls
      FROM leads
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'Dy'), EXTRACT(DOW FROM created_at)
      ORDER BY EXTRACT(DOW FROM created_at)
    `);

    res.json({ status: 'success', data: { weeklyTrend: result.rows } });
  } catch (err) {
    logger.error('Weekly trend error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'WEEKLY_TREND_ERROR' });
  }
});

// GET /api/reports/telecallers — telecaller performance
router.get('/telecallers', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.name,
        COUNT(DISTINCT l.id) as leads,
        COUNT(DISTINCT cl.id) as calls,
        COUNT(DISTINCT a.id) as appointments,
        AVG(cl.duration) FILTER (WHERE cl.status = 'connected') as avg_call_duration
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
      INNER JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN leads l ON l.assigned_to = u.id
      LEFT JOIN call_logs cl ON cl.user_id = u.id
      LEFT JOIN appointments a ON a.provider_id = u.id
      WHERE p.name = 'leads:view_assigned' AND u.is_active = true
      GROUP BY u.id, u.name
      ORDER BY leads DESC
    `);

    const telecallers = result.rows.map(r => ({
      name: r.name,
      leads: parseInt(r.leads) || 0,
      calls: parseInt(r.calls) || 0,
      appointments: parseInt(r.appointments) || 0,
      avgCallDuration: Math.round(parseFloat(r.avg_call_duration) || 0),
    }));

    res.json({ status: 'success', data: { telecallers } });
  } catch (err) {
    logger.error('Telecallers error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'TELECALLERS_ERROR' });
  }
});

// GET /api/reports/conversion-funnel
router.get('/conversion-funnel', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('Contacted', 'Interested', 'Follow-up', 'Appointment Booked', 'Closed')) as contacted,
        COUNT(*) FILTER (WHERE status IN ('Interested', 'Follow-up', 'Appointment Booked', 'Closed')) as interested,
        COUNT(*) FILTER (WHERE status IN ('Appointment Booked', 'Closed')) as appointment_booked,
        COUNT(*) FILTER (WHERE status = 'Closed') as closed
      FROM leads
    `);

    const r = result.rows[0];
    const funnel = [
      { stage: 'New Leads', count: parseInt(r.total) },
      { stage: 'Contacted', count: parseInt(r.contacted) },
      { stage: 'Interested', count: parseInt(r.interested) },
      { stage: 'Appointment Booked', count: parseInt(r.appointment_booked) },
      { stage: 'Closed', count: parseInt(r.closed) },
    ];

    res.json({ status: 'success', data: { funnel } });
  } catch (err) {
    logger.error('Conversion funnel error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'CONVERSION_FUNNEL_ERROR' });
  }
});

// GET /api/reports/call-analytics — detailed call analytics
router.get('/call-analytics', async (req, res) => {
  try {
    const [byStatus, byDirection, byHour, avgDuration] = await Promise.all([
      db.query(`SELECT status, COUNT(*) as count FROM call_logs GROUP BY status`),
      db.query(`SELECT direction, COUNT(*) as count FROM call_logs GROUP BY direction`),
      db.query(`
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
        FROM call_logs
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `),
      db.query(`SELECT AVG(duration) FILTER (WHERE status = 'connected' AND duration > 0) as avg FROM call_logs`),
    ]);

    res.json({
      status: 'success',
      data: {
        callAnalytics: {
          byStatus: byStatus.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
          byDirection: byDirection.rows.map(r => ({ direction: r.direction, count: parseInt(r.count) })),
          byHour: byHour.rows.map(r => ({ hour: parseInt(r.hour), count: parseInt(r.count) })),
          avgDuration: Math.round(parseFloat(avgDuration.rows[0].avg) || 0),
        },
      },
    });
  } catch (err) {
    logger.error('Call analytics error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'CALL_ANALYTICS_ERROR' });
  }
});

// GET /api/reports/appointment-stats — appointment statistics
router.get('/appointment-stats', async (req, res) => {
  try {
    const [byStatus, byDepartment, noShowRate] = await Promise.all([
      db.query(`SELECT status, COUNT(*) as count FROM appointments GROUP BY status`),
      db.query(`SELECT department, COUNT(*) as count FROM appointments GROUP BY department`),
      db.query(`SELECT COUNT(*) FILTER (WHERE status = 'No Show') * 100.0 / NULLIF(COUNT(*), 0) as rate FROM appointments`),
    ]);

    res.json({
      status: 'success',
      data: {
        appointmentStats: {
          byStatus: byStatus.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
          byDepartment: byDepartment.rows.map(r => ({ department: r.department, count: parseInt(r.count) })),
          noShowRate: Math.round(parseFloat(noShowRate.rows[0].rate) || 0),
        },
      },
    });
  } catch (err) {
    logger.error('Appointment stats error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'APPOINTMENT_STATS_ERROR' });
  }
});

// GET /api/reports/daily-activity — today's summary
router.get('/daily-activity', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [newLeads, callsToday, appointmentsToday, statusChanges] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM leads WHERE DATE(created_at) = $1`, [today]),
      db.query(`SELECT COUNT(*) FROM call_logs WHERE DATE(created_at) = $1`, [today]),
      db.query(`SELECT COUNT(*) FROM appointments WHERE appointment_date = $1`, [today]),
      db.query(`SELECT COUNT(*) FROM lead_history WHERE DATE(created_at) = $1 AND action = 'status'`, [today]),
    ]);

    res.json({
      status: 'success',
      data: {
        dailyActivity: {
          newLeads: parseInt(newLeads.rows[0].count) || 0,
          callsToday: parseInt(callsToday.rows[0].count) || 0,
          appointmentsToday: parseInt(appointmentsToday.rows[0].count) || 0,
          statusChanges: parseInt(statusChanges.rows[0].count) || 0,
        },
      },
    });
  } catch (err) {
    logger.error('Daily activity error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'DAILY_ACTIVITY_ERROR' });
  }
});

// GET /api/reports/export — export CSV
router.get('/export', async (req, res) => {
  try {
    const { type } = req.query;

    let data = [];
    let filename = 'report.csv';

    if (type === 'leads') {
      const result = await db.query(`
        SELECT l.name, l.phone, l.email, l.status, l.priority, l.lead_source,
               l.created_at, u.name as assigned_to
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        ORDER BY l.created_at DESC
      `);
      data = result.rows;
      filename = 'leads_report.csv';
    } else if (type === 'calls') {
      const result = await db.query(`
        SELECT cl.caller_number, cl.callee_number, cl.direction, cl.status,
               cl.duration, cl.created_at, u.name as user_name
        FROM call_logs cl
        LEFT JOIN users u ON cl.user_id = u.id
        ORDER BY cl.created_at DESC
      `);
      data = result.rows;
      filename = 'calls_report.csv';
    } else if (type === 'appointments') {
      const result = await db.query(`
        SELECT patient_name, phone, department, provider_name,
               appointment_date, appointment_time, status, created_at
        FROM appointments
        ORDER BY appointment_date DESC
      `);
      data = result.rows;
      filename = 'appointments_report.csv';
    } else {
      return res.status(400).json({ status: 'error', message: 'Invalid export type.', code: 'INVALID_EXPORT_TYPE' });
    }

    if (data.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No data to export.', code: 'NO_DATA' });
    }

    // Generate CSV
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        // Escape commas and quotes
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? '';
      }).join(','))
    ].join('\n');

    logger.info('Report exported', { type, rowCount: data.length, userId: req.user.id });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (err) {
    logger.error('Export error', { error: err.message, type: req.query.type });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'EXPORT_ERROR' });
  }
});

module.exports = router;
