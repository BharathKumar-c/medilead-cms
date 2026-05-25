const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validateAppointment, validateAppointmentUpdate, validateReschedule, validateId, validatePagination } = require('../middleware/validate');
const { notify } = require('../utils/notify');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authenticate);

// GET /api/appointments — list with filters
router.get('/', validatePagination, async (req, res) => {
  try {
    const { status, date, provider_id, department, page = 1, limit = 20 } = req.query;

    let where = [];
    let params = [];
    let paramIndex = 1;

    if (status && status !== 'All') {
      where.push(`a.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (date) {
      where.push(`a.appointment_date = $${paramIndex}`);
      params.push(date);
      paramIndex++;
    }

    if (provider_id) {
      where.push(`a.provider_id = $${paramIndex}`);
      params.push(parseInt(provider_id));
      paramIndex++;
    }

    if (department) {
      where.push(`a.department ILIKE $${paramIndex}`);
      params.push(`%${department}%`);
      paramIndex++;
    }

    // If user doesn't have view_all permission, only show their appointments
    const userRoles = req.user.roles || [req.user.role];
    const isSuperAdmin = userRoles.includes('super_admin');
    if (!isSuperAdmin && (!req.user.permissions || !req.user.permissions.includes('appointments:view_all'))) {
      where.push(`a.provider_id = $${paramIndex}`);
      params.push(req.user.id);
      paramIndex++;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await db.query(`SELECT COUNT(*) FROM appointments a ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT a.* FROM appointments a ${whereClause}
       ORDER BY a.appointment_date DESC, a.appointment_time ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      status: 'success',
      data: {
        appointments: result.rows,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (err) {
    logger.error('Get appointments error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'APPOINTMENTS_FETCH_ERROR' });
  }
});

// GET /api/appointments/today — today's overview
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'Scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'Confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'Completed') as completed,
        COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'No Show') as no_show
      FROM appointments WHERE appointment_date = $1
    `, [today]);

    res.json({
      status: 'success',
      data: {
        todayOverview: {
          scheduled: parseInt(result.rows[0].scheduled) || 0,
          confirmed: parseInt(result.rows[0].confirmed) || 0,
          completed: parseInt(result.rows[0].completed) || 0,
          cancelled: parseInt(result.rows[0].cancelled) || 0,
          noShow: parseInt(result.rows[0].no_show) || 0,
        },
      },
    });
  } catch (err) {
    logger.error('Today overview error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'TODAY_OVERVIEW_ERROR' });
  }
});

// GET /api/appointments/calendar — calendar data for a month
router.get('/calendar', async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ status: 'error', message: 'Year and month are required.', code: 'MISSING_PARAMS' });
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const result = await db.query(`
      SELECT id, patient_name, status, appointment_date, appointment_time, department, provider_name
      FROM appointments
      WHERE appointment_date >= $1 AND appointment_date <= $2
      ORDER BY appointment_date, appointment_time
    `, [startDate, endDate]);

    // Organize by date — array of appointment objects per date
    const calendar = {};
    for (const row of result.rows) {
      const date = row.appointment_date.toISOString().split('T')[0];
      if (!calendar[date]) calendar[date] = [];
      calendar[date].push({
        id: row.id,
        patient_name: row.patient_name,
        status: row.status,
        appointment_time: row.appointment_time,
        department: row.department,
        provider_name: row.provider_name,
      });
    }

    res.json({ status: 'success', data: { appointments: calendar } });
  } catch (err) {
    logger.error('Calendar data error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'CALENDAR_ERROR' });
  }
});

// GET /api/appointments/doctors — list doctors by department (optionally filtered by branch)
router.get('/doctors', async (req, res) => {
  try {
    const { department, branch_id } = req.query;
    const params = [];
    const conditions = ['md.is_active = true'];

    let query = `SELECT DISTINCT md.id, md.name, md.department, md.specialty, md.qualification, md.phone, md.email
                 FROM master_doctors md`;

    if (branch_id) {
      params.push(branch_id);
      query += ` INNER JOIN master_department dep ON dep.name = md.department
                 INNER JOIN branch_departments bd ON bd.department_id = dep.id AND bd.branch_id = $${params.length}`;
    }

    if (department) {
      params.push(department);
      conditions.push(`md.department = $${params.length}`);
    }

    query += ` WHERE ${conditions.join(' AND ')} ORDER BY md.name`;
    const result = await db.query(query, params);
    res.json({ status: 'success', data: { doctors: result.rows } });
  } catch (err) {
    logger.error('Get doctors error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'DOCTORS_ERROR' });
  }
});

// GET /api/appointments/slots — available time slots for a doctor on a date
router.get('/slots', async (req, res) => {
  try {
    const { doctor_id, date } = req.query;

    if (!doctor_id || !date) {
      return res.status(400).json({ status: 'error', message: 'doctor_id and date are required.', code: 'MISSING_PARAMS' });
    }

    // Get booked slots for this doctor on this date
    const booked = await db.query(
      `SELECT appointment_time FROM appointments
       WHERE provider_id = $1 AND appointment_date = $2 AND status NOT IN ('Cancelled', 'No Show')`,
      [parseInt(doctor_id), date]
    );
    const bookedTimes = new Set(booked.rows.map(r => {
      const t = r.appointment_time;
      if (typeof t === 'string') return t.substring(0, 5);
      const d = new Date(t);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }));

    // Generate slots from 09:00 to 17:00 in 30-min intervals (skip 12:30-13:00 lunch)
    const slots = [];
    for (let h = 9; h <= 17; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 17 && m > 0) break;
        if (h === 12 && m === 30) continue;
        if (h === 13 && m === 0) continue;
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
        slots.push({
          id: time,
          time: `${displayH}:${String(m).padStart(2, '0')} ${period}`,
          available: !bookedTimes.has(time),
        });
      }
    }

    res.json({ status: 'success', data: { slots } });
  } catch (err) {
    logger.error('Get slots error', { error: err.message });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'SLOTS_ERROR' });
  }
});

// GET /api/appointments/:id — get single appointment
router.get('/:id', validateId, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found.', code: 'APPOINTMENT_NOT_FOUND' });
    }

    res.json({ status: 'success', data: { appointment: result.rows[0] } });
  } catch (err) {
    logger.error('Get appointment error', { error: err.message, appointmentId: req.params.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'APPOINTMENT_FETCH_ERROR' });
  }
});

// POST /api/appointments — create appointment
router.post('/', validateAppointment, async (req, res) => {
  try {
    const { patient_name, phone, email, department, provider_id, provider_name, appointment_date, appointment_time, notes, visit_type, consultation_mode, lead_id } = req.body;

    let providerIdInt = provider_id ? parseInt(provider_id) : null;
    const createdByInt = req.user?.id ? parseInt(req.user.id) : null;

    // Verify provider_id exists in users table (doctor IDs from master_doctors may not match users)
    if (providerIdInt) {
      const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [providerIdInt]);
      if (userCheck.rows.length === 0) providerIdInt = null;
    }
    const initials = patient_name ? patient_name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2) : null;

    // Check for scheduling conflicts
    if (providerIdInt) {
      const conflict = await db.query(
        `SELECT id FROM appointments
         WHERE provider_id = $1 AND appointment_date = $2 AND appointment_time = $3
         AND status NOT IN ('Cancelled', 'No Show')`,
        [providerIdInt, appointment_date, appointment_time]
      );

      if (conflict.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'This time slot is already booked for the selected provider.',
          code: 'SCHEDULING_CONFLICT',
        });
      }
    }

    const result = await db.query(
      `INSERT INTO appointments (patient_name, initials, phone, department, provider_id, provider_name, appointment_date, appointment_time, notes, visit_type, consultation_mode, lead_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [patient_name, initials, phone, department, providerIdInt, provider_name, appointment_date, appointment_time, notes, visit_type || null, consultation_mode || null, lead_id || null, createdByInt]
    );

    const appointment = result.rows[0];

    // Generate appointment code if not already set
    if (!appointment.code) {
      const code = `A${appointment.id}`;
      await db.query('UPDATE appointments SET code = $1 WHERE id = $2', [code, appointment.id]);
      appointment.code = code;
    }

    // Notify provider
    if (providerIdInt && providerIdInt !== createdByInt) {
      const io = req.app.get('io');
      await notify(io, {
        user_id: providerIdInt,
        type: 'info',
        title: `New appointment: ${patient_name} on ${appointment_date} at ${appointment_time}`,
        link: '/appointments',
      });
    }

    logger.info('Appointment created', { appointmentId: appointment.id, patientName: patient_name, createdBy: createdByInt });

    res.status(201).json({ status: 'success', data: { appointment } });
  } catch (err) {
    logger.error('Create appointment error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'APPOINTMENT_CREATE_ERROR' });
  }
});

// PUT /api/appointments/:id — update appointment
router.put('/:id', validateId, validateAppointmentUpdate, async (req, res) => {
  try {
    const { patient_name, phone, email, department, provider_id, provider_name, appointment_date, appointment_time, notes, status } = req.body;

    const existing = await db.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found.', code: 'APPOINTMENT_NOT_FOUND' });
    }

    // Verify provider_id exists in users table
    let validProviderId = provider_id;
    if (provider_id) {
      const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [parseInt(provider_id)]);
      if (userCheck.rows.length === 0) validProviderId = null;
    }

    // Check for scheduling conflicts if date/time/provider changed
    if (validProviderId && appointment_date && appointment_time) {
      const conflict = await db.query(
        `SELECT id FROM appointments
         WHERE provider_id = $1 AND appointment_date = $2 AND appointment_time = $3
         AND status NOT IN ('Cancelled', 'No Show') AND id != $4`,
        [validProviderId, appointment_date, appointment_time, req.params.id]
      );

      if (conflict.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'This time slot is already booked for the selected provider.',
          code: 'SCHEDULING_CONFLICT',
        });
      }
    }

    const result = await db.query(
      `UPDATE appointments SET
        patient_name = COALESCE($1, patient_name),
        phone = COALESCE($2, phone),
        email = COALESCE($3, email),
        department = COALESCE($4, department),
        provider_id = COALESCE($5, provider_id),
        provider_name = COALESCE($6, provider_name),
        appointment_date = COALESCE($7, appointment_date),
        appointment_time = COALESCE($8, appointment_time),
        notes = COALESCE($9, notes),
        status = COALESCE($10, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [patient_name, phone, email, department, validProviderId, provider_name, appointment_date, appointment_time, notes, status, req.params.id]
    );

    const oldStatus = existing.rows[0].status;
    const appointment = result.rows[0];

    // Notify if status changed
    if (status && status !== oldStatus && appointment.provider_id) {
      const io = req.app.get('io');
      await notify(io, {
        user_id: appointment.provider_id,
        type: status === 'Cancelled' ? 'warning' : 'info',
        title: `Appointment ${status.toLowerCase()}: ${appointment.patient_name}`,
        link: '/appointments',
      });
    }

    logger.info('Appointment updated', { appointmentId: appointment.id, updatedBy: req.user.id });

    res.json({ status: 'success', data: { appointment } });
  } catch (err) {
    logger.error('Update appointment error', { error: err.message, appointmentId: req.params.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'APPOINTMENT_UPDATE_ERROR' });
  }
});

// PUT /api/appointments/:id/reschedule — reschedule appointment
router.put('/:id/reschedule', validateId, validateReschedule, async (req, res) => {
  try {
    const { appointment_date, appointment_time } = req.body;

    if (!appointment_date || !appointment_time) {
      return res.status(400).json({ status: 'error', message: 'New date and time are required.', code: 'MISSING_PARAMS' });
    }

    const existing = await db.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found.', code: 'APPOINTMENT_NOT_FOUND' });
    }

    const oldAppointment = existing.rows[0];

    // Check for conflicts
    if (oldAppointment.provider_id) {
      const conflict = await db.query(
        `SELECT id FROM appointments
         WHERE provider_id = $1 AND appointment_date = $2 AND appointment_time = $3
         AND status NOT IN ('Cancelled', 'No Show') AND id != $4`,
        [oldAppointment.provider_id, appointment_date, appointment_time, req.params.id]
      );

      if (conflict.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'This time slot is already booked.',
          code: 'SCHEDULING_CONFLICT',
        });
      }
    }

    const result = await db.query(
      `UPDATE appointments SET
        appointment_date = $1,
        appointment_time = $2,
        status = 'Scheduled',
        notes = COALESCE(notes, '') || E'\n[Rescheduled from ${oldAppointment.appointment_date} ${oldAppointment.appointment_time}]',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [appointment_date, appointment_time, req.params.id]
    );

    // Notify provider
    if (oldAppointment.provider_id) {
      const io = req.app.get('io');
      await notify(io, {
        user_id: oldAppointment.provider_id,
        type: 'warning',
        title: `Appointment rescheduled: ${oldAppointment.patient_name} to ${appointment_date} ${appointment_time}`,
        link: '/appointments',
      });
    }

    logger.info('Appointment rescheduled', {
      appointmentId: req.params.id,
      oldDate: oldAppointment.appointment_date,
      oldTime: oldAppointment.appointment_time,
      newDate: appointment_date,
      newTime: appointment_time,
      rescheduledBy: req.user.id,
    });

    res.json({ status: 'success', data: { appointment: result.rows[0] } });
  } catch (err) {
    logger.error('Reschedule appointment error', { error: err.message, appointmentId: req.params.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'RESCHEDULE_ERROR' });
  }
});

// PUT /api/appointments/:id/no-show — mark as no show
router.put('/:id/no-show', validateId, async (req, res) => {
  try {
    const existing = await db.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found.', code: 'APPOINTMENT_NOT_FOUND' });
    }

    if (existing.rows[0].status === 'Cancelled') {
      return res.status(400).json({ status: 'error', message: 'Cannot mark a cancelled appointment as no show.', code: 'ALREADY_CANCELLED' });
    }

    if (existing.rows[0].status === 'No Show') {
      return res.status(400).json({ status: 'error', message: 'Appointment is already marked as No Show.', code: 'ALREADY_NO_SHOW' });
    }

    const result = await db.query(
      `UPDATE appointments SET
        status = 'No Show',
        notes = COALESCE(notes, '') || E'\n[Marked as No Show]',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    // Notify provider
    if (existing.rows[0].provider_id) {
      const io = req.app.get('io');
      await notify(io, {
        user_id: existing.rows[0].provider_id,
        type: 'warning',
        title: `Patient did not show: ${existing.rows[0].patient_name}`,
        link: '/appointments',
      });
    }

    logger.info('Appointment marked no show', {
      appointmentId: req.params.id,
      patientName: existing.rows[0].patient_name,
      updatedBy: req.user.id,
    });

    res.json({ status: 'success', data: { appointment: result.rows[0] } });
  } catch (err) {
    logger.error('No show error', { error: err.message, appointmentId: req.params.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'NO_SHOW_ERROR' });
  }
});

// PUT /api/appointments/:id/cancel — cancel appointment
router.put('/:id/cancel', validateId, async (req, res) => {
  try {
    const { reason } = req.body;

    const existing = await db.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found.', code: 'APPOINTMENT_NOT_FOUND' });
    }

    if (existing.rows[0].status === 'Cancelled') {
      return res.status(400).json({ status: 'error', message: 'Appointment is already cancelled.', code: 'ALREADY_CANCELLED' });
    }

    const result = await db.query(
      `UPDATE appointments SET
        status = 'Cancelled',
        cancellation_reason = $2,
        notes = COALESCE(notes, '') || E'\n[Cancelled: ${reason || 'No reason provided'}]',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [req.params.id, reason || null]
    );

    // Notify provider
    if (existing.rows[0].provider_id) {
      const io = req.app.get('io');
      await notify(io, {
        user_id: existing.rows[0].provider_id,
        type: 'warning',
        title: `Appointment cancelled: ${existing.rows[0].patient_name}`,
        link: '/appointments',
      });
    }

    logger.info('Appointment cancelled', {
      appointmentId: req.params.id,
      patientName: existing.rows[0].patient_name,
      reason,
      cancelledBy: req.user.id,
    });

    res.json({ status: 'success', data: { appointment: result.rows[0] } });
  } catch (err) {
    logger.error('Cancel appointment error', { error: err.message, appointmentId: req.params.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'CANCEL_ERROR' });
  }
});

module.exports = router;
