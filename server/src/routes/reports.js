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
      db.query(`SELECT COUNT(*) as total FROM telephony_call_logs`),
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
      FROM telephony_call_logs
      GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
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
        AVG(cl.duration_seconds) FILTER (WHERE cl.call_status IN ('in-progress', 'completed')) as avg_call_duration
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
      INNER JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN leads l ON l.assigned_to = u.id
      LEFT JOIN telephony_call_logs cl ON cl.user_id = u.id
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
      db.query(`SELECT call_status as status, COUNT(*) as count FROM telephony_call_logs GROUP BY call_status`),
      db.query(`SELECT direction, COUNT(*) as count FROM telephony_call_logs GROUP BY direction`),
      db.query(`
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
        FROM telephony_call_logs
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `),
      db.query(`SELECT AVG(duration_seconds) FILTER (WHERE call_status IN ('in-progress', 'completed') AND duration_seconds > 0) as avg FROM telephony_call_logs`),
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
      db.query(`SELECT COUNT(*) FROM telephony_call_logs WHERE DATE(created_at) = $1`, [today]),
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
        SELECT l.code, l.name, l.phone, l.email, l.status, l.priority, l.lead_source,
               mb.name as branch, creator.name as created_by, u.name as assigned_to, l.created_at
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        LEFT JOIN users creator ON l.created_by = creator.id
        LEFT JOIN master_branches mb ON l.branch_id = mb.id
        ORDER BY l.created_at DESC
      `);
      data = result.rows;
      filename = 'leads_report.csv';
    } else if (type === 'calls') {
      const result = await db.query(`
        SELECT cl.code, cl.caller_phone_number, cl.callee_phone_number, cl.direction, cl.call_status as status,
               cl.duration_seconds as duration, u.name as agent, cl.created_at
        FROM telephony_call_logs cl
        LEFT JOIN users u ON cl.user_id = u.id
        ORDER BY cl.created_at DESC
      `);
      data = result.rows;
      filename = 'calls_report.csv';
    } else if (type === 'appointments') {
      const result = await db.query(`
        SELECT a.code, a.patient_name, a.phone, a.department, a.provider_name,
               a.appointment_date, a.appointment_time, a.status, a.visit_type,
               a.consultation_mode, a.created_at
        FROM appointments a
        ORDER BY a.appointment_date DESC
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

// ─── EXPORT SYSTEM ────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const EXPORTS_DIR = path.join(__dirname, '..', '..', 'exports');
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });

const escapeCsv = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const buildCsv = (headers, rows) => {
  return [headers.join(','), ...rows.map(r => headers.map(h => escapeCsv(r[h])).join(','))].join('\n');
};

// Date range query builders
const dateFilter = (col, alias) => `${alias ? alias + '.' : ''}${col} >= $1 AND ${alias ? alias + '.' : ''}${col} <= ($2::date + INTERVAL '1 day')`;

const QUERIES = {
  calls: {
    summary: `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE call_status = 'missed') as missed,
        COUNT(*) FILTER (WHERE call_status IN ('in-progress', 'completed')) as answered,
        COUNT(*) FILTER (WHERE direction = 'inbound') as inbound,
        COUNT(*) FILTER (WHERE direction = 'outbound') as outbound
      FROM telephony_call_logs WHERE ${dateFilter('created_at')}
    `,
    data: (from, to) => ({
      text: `
        SELECT cl.code, cl.caller_phone_number, cl.callee_phone_number, cl.direction, cl.call_status as status,
               cl.duration_seconds as duration, u.name as agent, cl.created_at
        FROM telephony_call_logs cl LEFT JOIN users u ON cl.user_id = u.id
        WHERE cl.created_at >= $1 AND cl.created_at <= ($2::date + INTERVAL '1 day')
        ORDER BY cl.created_at DESC
      `,
      values: [from, to],
    }),
    headers: ['Code', 'Caller', 'Callee', 'Direction', 'Status', 'Duration', 'Agent', 'Created At'],
    filePrefix: 'calls',
  },
  leads: {
    summary: `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Follow-up') as followup,
        COUNT(*) FILTER (WHERE status IN ('Appointment Booked', 'Closed')) as completed,
        COUNT(*) FILTER (WHERE status = 'New') as new_leads
      FROM leads WHERE ${dateFilter('created_at')}
    `,
    data: (from, to) => ({
      text: `
        SELECT l.code, l.name, l.phone, l.email, l.status, l.priority, l.lead_source,
               mb.name as branch, creator.name as created_by, u.name as assigned_to, l.created_at
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        LEFT JOIN users creator ON l.created_by = creator.id
        LEFT JOIN master_branches mb ON l.branch_id = mb.id
        WHERE l.created_at >= $1 AND l.created_at <= ($2::date + INTERVAL '1 day')
        ORDER BY l.created_at DESC
      `,
      values: [from, to],
    }),
    headers: ['Code', 'Name', 'Phone', 'Email', 'Status', 'Priority', 'Source', 'Branch', 'Created By', 'Assigned To', 'Created At'],
    filePrefix: 'leads',
  },
  appointments: {
    summary: `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Completed') as completed,
        COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'No Show') as no_show
      FROM appointments WHERE ${dateFilter('created_at')}
    `,
    data: (from, to) => ({
      text: `
        SELECT a.code, a.patient_name, a.phone, a.department, a.provider_name,
               a.appointment_date, a.appointment_time, a.status, a.visit_type,
               a.consultation_mode, a.created_at
        FROM appointments a
        WHERE a.created_at >= $1 AND a.created_at <= ($2::date + INTERVAL '1 day')
        ORDER BY a.created_at DESC
      `,
      values: [from, to],
    }),
    headers: ['Code', 'Patient Name', 'Phone', 'Department', 'Provider', 'Date', 'Time', 'Status', 'Visit Type', 'Mode', 'Created At'],
    filePrefix: 'appointments',
  },
};

// GET /api/reports/export/summary — preview metrics for type + date range
router.get('/export/summary', async (req, res) => {
  try {
    const { type, from, to } = req.query;
    if (!type || !QUERIES[type]) return res.status(400).json({ status: 'error', message: 'Invalid type' });
    if (!from || !to) return res.status(400).json({ status: 'error', message: 'from and to dates required' });

    const result = await db.query(QUERIES[type].summary, [from, to]);
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    logger.error('Export summary error', { error: err.message });
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Generate CSV for a job (used by both sync and async paths)
const generateExportCsv = async (jobId, reportType, dateFrom, dateTo) => {
  const q = QUERIES[reportType];
  const CHUNK_SIZE = 1000;
  let offset = 0;
  let totalRows = 0;
  let headersWritten = false;
  const filePath = path.join(EXPORTS_DIR, `export_${jobId}_${Date.now()}.csv`);
  const writeStream = fs.createWriteStream(filePath);

  try {
    await db.query('UPDATE report_exports SET status = $1 WHERE id = $2', ['processing', jobId]);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const baseQuery = q.data(dateFrom, dateTo);
      const chunkQuery = `${baseQuery.text} LIMIT ${CHUNK_SIZE} OFFSET ${offset}`;
      const result = await db.query(chunkQuery, baseQuery.values);

      if (result.rows.length === 0) break;

      if (!headersWritten) {
        writeStream.write(q.headers.join(',') + '\n');
        headersWritten = true;
      }

      for (const row of result.rows) {
        writeStream.write(q.headers.map(h => {
          const key = h.replace(/ /g, '_').toLowerCase();
          // Map header labels to row keys
          const keyMap = {
            'code': 'code', 'caller': 'caller_number', 'callee': 'callee_number',
            'direction': 'direction', 'status': 'status', 'duration': 'duration',
            'agent': 'agent', 'created_at': 'created_at', 'name': 'name',
            'phone': 'phone', 'email': 'email', 'priority': 'priority',
            'source': 'lead_source', 'branch': 'branch', 'created_by': 'created_by',
            'assigned_to': 'assigned_to', 'patient_name': 'patient_name',
            'department': 'department', 'provider': 'provider_name',
            'date': 'appointment_date', 'time': 'appointment_time',
            'visit_type': 'visit_type', 'mode': 'consultation_mode',
          };
          const rowKey = keyMap[key] || key;
          return escapeCsv(row[rowKey]);
        }).join(',') + '\n');
      }

      totalRows += result.rows.length;
      if (result.rows.length < CHUNK_SIZE) break;
      offset += CHUNK_SIZE;
    }

    writeStream.end();
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    await db.query(
      'UPDATE report_exports SET status = $1, file_path = $2, row_count = $3, completed_at = NOW() WHERE id = $4',
      ['completed', filePath, totalRows, jobId]
    );
    logger.info('Export completed', { jobId, reportType, totalRows });
  } catch (err) {
    writeStream.destroy();
    await db.query('UPDATE report_exports SET status = $1 WHERE id = $2', ['failed', jobId]);
    logger.error('Export failed', { jobId, error: err.message });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};

// POST /api/reports/export — create export job
router.post('/export', async (req, res) => {
  try {
    const { report_type, date_from, date_to, description } = req.body;
    if (!report_type || !QUERIES[report_type]) {
      return res.status(400).json({ status: 'error', message: 'Invalid report type' });
    }
    if (!date_from || !date_to) {
      return res.status(400).json({ status: 'error', message: 'Date range required' });
    }

    const from = new Date(date_from);
    const to = new Date(date_to);
    const diffDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
    const isImmediate = diffDays <= 31;

    const result = await db.query(
      `INSERT INTO report_exports (user_id, report_type, date_from, date_to, description, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, report_type, date_from, date_to, description || '', isImmediate ? 'processing' : 'pending']
    );
    const job = result.rows[0];

    if (isImmediate) {
      // Generate CSV synchronously
      await generateExportCsv(job.id, report_type, date_from, date_to);
      const updated = await db.query('SELECT * FROM report_exports WHERE id = $1', [job.id]);
      const completedJob = updated.rows[0];
      return res.json({
        status: 'success',
        data: { job: { id: completedJob.id, status: completedJob.status, row_count: completedJob.row_count, isImmediate: true } },
      });
    }

    // Background job — start processing, return immediately
    setImmediate(() => generateExportCsv(job.id, report_type, date_from, date_to));

    res.json({
      status: 'success',
      data: { job: { id: job.id, status: 'pending', isImmediate: false } },
    });
  } catch (err) {
    logger.error('Create export error', { error: err.message });
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/reports/export/jobs — list user's export jobs
router.get('/export/jobs', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, report_type, date_from, date_to, description, status, row_count, created_at, completed_at
       FROM report_exports WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ status: 'success', data: { jobs: result.rows } });
  } catch (err) {
    logger.error('List export jobs error', { error: err.message });
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/reports/export/check/:id — poll job status
router.get('/export/check/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, status, row_count, created_at, completed_at FROM report_exports WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Job not found' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    logger.error('Check export status error', { error: err.message });
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/reports/export/download/:id — download completed CSV
router.get('/export/download/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM report_exports WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Job not found' });
    const job = result.rows[0];
    if (job.status !== 'completed' || !job.file_path) {
      return res.status(400).json({ status: 'error', message: 'Export not ready for download' });
    }
    if (!fs.existsSync(job.file_path)) {
      return res.status(404).json({ status: 'error', message: 'Export file has expired or was deleted' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${QUERIES[job.report_type]?.filePrefix || 'report'}_${job.date_from}_${job.date_to}.csv`);
    res.sendFile(job.file_path);
  } catch (err) {
    logger.error('Download export error', { error: err.message });
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Auto-cleanup: delete completed exports older than 7 days
const cleanupOldExports = async () => {
  try {
    const result = await db.query(
      "SELECT id, file_path FROM report_exports WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '7 days'"
    );
    for (const job of result.rows) {
      if (job.file_path && fs.existsSync(job.file_path)) {
        try { fs.unlinkSync(job.file_path); } catch (_) { /* ignore */ }
      }
    }
    await db.query("DELETE FROM report_exports WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '7 days'");
    if (result.rows.length > 0) logger.info('Cleaned up old exports', { count: result.rows.length });
  } catch (err) {
    logger.warn('Export cleanup failed', { error: err.message });
  }
};
// Run cleanup on startup
cleanupOldExports();

// GET /api/reports/branch-leads — lead counts grouped by branch
router.get('/branch-leads', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COALESCE(mb.name, 'Unassigned') as branch,
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE l.status IN ('Appointment Booked', 'Closed')) as closed_leads,
        COUNT(*) FILTER (WHERE l.status NOT IN ('Closed', 'Rejected')) as active_leads,
        COUNT(*) FILTER (WHERE l.status = 'Rejected') as rejected_leads
      FROM leads l
      LEFT JOIN master_branches mb ON l.branch_id = mb.id
      GROUP BY mb.name
      ORDER BY total_leads DESC
    `);

    const branches = result.rows.map(r => {
      const total = parseInt(r.total_leads) || 0;
      const closed = parseInt(r.closed_leads) || 0;
      return {
        branch: r.branch,
        totalLeads: total,
        closedLeads: closed,
        activeLeads: parseInt(r.active_leads) || 0,
        rejectedLeads: parseInt(r.rejected_leads) || 0,
        conversionRate: total > 0 ? Math.round((closed / total) * 100) : 0,
      };
    });

    res.json({ status: 'success', data: { branches } });
  } catch (err) {
    logger.error('Branch leads report error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'BRANCH_LEADS_ERROR' });
  }
});

module.exports = router;
