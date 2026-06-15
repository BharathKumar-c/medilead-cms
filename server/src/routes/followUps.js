const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validateId } = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticate);

// GET /api/follow-ups — list follow-ups with filters
router.get('/', async (req, res) => {
  try {
    const { status, view, page = 1, limit = 50 } = req.query;

    let where = [];
    let params = [];
    let paramIndex = 1;

    // View filters
    if (view === 'my') {
      // All follow-ups assigned to the logged-in user
      where.push(`f.assigned_to = $${paramIndex}`);
      params.push(req.user.id);
      paramIndex++;
    } else if (view === 'today') {
      // Follow-ups scheduled for today
      where.push(`DATE(f.scheduled_at) = CURRENT_DATE`);
    } else if (view === 'my-today') {
      // Today's follow-ups assigned to the logged-in user
      where.push(`DATE(f.scheduled_at) = CURRENT_DATE`);
      where.push(`f.assigned_to = $${paramIndex}`);
      params.push(req.user.id);
      paramIndex++;
    }
    // view === 'all' or no view: show all follow-ups

    // Status filter
    if (status) {
      where.push(`f.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM follow_ups f ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await db.query(
      `SELECT f.*, l.name as lead_name, l.code as lead_code, l.phone as lead_phone,
              l.status as lead_status, l.priority as lead_priority,
              u.name as assigned_to_name, creator.name as created_by_name
       FROM follow_ups f
       LEFT JOIN leads l ON f.lead_id = l.id
       LEFT JOIN users u ON f.assigned_to = u.id
       LEFT JOIN users creator ON f.created_by = creator.id
       ${whereClause}
       ORDER BY f.scheduled_at ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      status: 'success',
      data: {
        followUps: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    logger.error('Get follow-ups error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: `Failed to fetch follow-ups: ${err.message}`, code: 'FOLLOWUPS_FETCH_ERROR' });
  }
});

// GET /api/follow-ups/lead/:leadId — get follow-ups for a specific lead
router.get('/lead/:leadId', validateId, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT f.*, u.name as assigned_to_name, creator.name as created_by_name
       FROM follow_ups f
       LEFT JOIN users u ON f.assigned_to = u.id
       LEFT JOIN users creator ON f.created_by = creator.id
       WHERE f.lead_id = $1
       ORDER BY f.scheduled_at DESC`,
      [req.params.leadId]
    );

    res.json({ status: 'success', data: { followUps: result.rows } });
  } catch (err) {
    logger.error('Get lead follow-ups error', { error: err.message, leadId: req.params.leadId });
    res.status(500).json({ status: 'error', message: `Failed to fetch follow-ups: ${err.message}`, code: 'FOLLOWUPS_FETCH_ERROR' });
  }
});

// GET /api/follow-ups/counts — get counts for the different views
router.get('/counts', async (req, res) => {
  try {
    const [allPending, myPending, todayPending, myTodayPending] = await Promise.all([
      // All pending follow-ups
      db.query(`SELECT COUNT(*) FROM follow_ups WHERE status = 'pending'`),
      // My pending follow-ups
      db.query(`SELECT COUNT(*) FROM follow_ups WHERE status = 'pending' AND assigned_to = $1`, [req.user.id]),
      // Today's follow-ups
      db.query(`SELECT COUNT(*) FROM follow_ups WHERE status = 'pending' AND DATE(scheduled_at) = CURRENT_DATE`),
      // My today's follow-ups
      db.query(`SELECT COUNT(*) FROM follow_ups WHERE status = 'pending' AND DATE(scheduled_at) = CURRENT_DATE AND assigned_to = $1`, [req.user.id]),
    ]);

    res.json({
      status: 'success',
      data: {
        all: parseInt(allPending.rows[0].count),
        my: parseInt(myPending.rows[0].count),
        today: parseInt(todayPending.rows[0].count),
        myToday: parseInt(myTodayPending.rows[0].count),
      },
    });
  } catch (err) {
    logger.error('Get follow-up counts error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: `Failed to fetch follow-up counts: ${err.message}`, code: 'FOLLOWUPS_COUNTS_ERROR' });
  }
});

// POST /api/follow-ups — create a new follow-up
router.post('/', async (req, res) => {
  try {
    const { lead_id, scheduled_at, notes } = req.body;
    // assigned_to defaults to the current user (the one scheduling the follow-up)
    const assigned_to = req.body.assigned_to || req.user.id;

    if (!lead_id || !scheduled_at) {
      return res.status(400).json({
        status: 'error',
        message: 'lead_id and scheduled_at are required.',
        code: 'VALIDATION_ERROR',
      });
    }

    // Validate the lead exists
    const leadCheck = await db.query('SELECT id, name, code FROM leads WHERE id = $1', [lead_id]);
    if (leadCheck.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lead not found.', code: 'LEAD_NOT_FOUND' });
    }

    // Validate the assigned user exists
    const userCheck = await db.query('SELECT id, name FROM users WHERE id = $1 AND is_active = true', [assigned_to]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Assigned user not found.', code: 'USER_NOT_FOUND' });
    }

    // Validate scheduled_at is in the future
    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Follow-up must be scheduled for a future date and time.',
        code: 'VALIDATION_ERROR',
      });
    }

    const result = await db.query(
      `INSERT INTO follow_ups (lead_id, assigned_to, scheduled_at, notes, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [lead_id, assigned_to, scheduledDate, notes || null, req.user.id]
    );

    const followUp = result.rows[0];

    // Update the lead's follow_up_date column as well
    await db.query(
      `UPDATE leads SET follow_up_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [scheduledDate, lead_id]
    );

    // Notify the assigned user
    const io = req.app.get('io');
    if (io && assigned_to) {
      const { notify } = require('../utils/notify');
      await notify(io, {
        user_id: assigned_to,
        type: 'info',
        title: `Follow-up scheduled: ${leadCheck.rows[0].name} (${leadCheck.rows[0].code}) — ${scheduledDate.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
        link: `/lead-box?viewLead=${lead_id}`,
      });
    }

    logger.info('Follow-up created', { followUpId: followUp.id, leadId: lead_id, assignedTo: assigned_to });

    res.status(201).json({ status: 'success', data: { followUp } });
  } catch (err) {
    logger.error('Create follow-up error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: `Failed to create follow-up: ${err.message}`, code: 'FOLLOWUP_CREATE_ERROR' });
  }
});

// PUT /api/follow-ups/:id — update a follow-up (reschedule, change notes)
router.put('/:id', validateId, async (req, res) => {
  try {
    const { scheduled_at, notes, status } = req.body;

    const existing = await db.query('SELECT * FROM follow_ups WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Follow-up not found.', code: 'FOLLOWUP_NOT_FOUND' });
    }

    const followUp = existing.rows[0];

    // Only the assigned user, creator, or admin can update
    const isAdmin = req.user.role === 'super_admin' || req.user.role === 'manager';
    if (followUp.assigned_to !== req.user.id && followUp.created_by !== req.user.id && !isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to update this follow-up.', code: 'FORBIDDEN' });
    }

    const updates = [];
    const updateParams = [];
    let paramIndex = 1;

    if (scheduled_at !== undefined) {
      const scheduledDate = new Date(scheduled_at);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          status: 'error',
          message: 'Follow-up must be scheduled for a future date and time.',
          code: 'VALIDATION_ERROR',
        });
      }
      updates.push(`scheduled_at = $${paramIndex}`);
      updateParams.push(scheduledDate);
      paramIndex++;

      // Also update the lead's follow_up_date
      await db.query(
        `UPDATE leads SET follow_up_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [scheduledDate, followUp.lead_id]
      );
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      updateParams.push(notes);
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      updateParams.push(status);
      paramIndex++;

      if (status === 'completed') {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No fields to update.', code: 'NO_CHANGES' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE follow_ups SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      [...updateParams, req.params.id]
    );

    logger.info('Follow-up updated', { followUpId: req.params.id, updates: Object.keys(req.body) });

    res.json({ status: 'success', data: { followUp: result.rows[0] } });
  } catch (err) {
    logger.error('Update follow-up error', { error: err.message, followUpId: req.params.id });
    res.status(500).json({ status: 'error', message: `Failed to update follow-up: ${err.message}`, code: 'FOLLOWUP_UPDATE_ERROR' });
  }
});

// PUT /api/follow-ups/:id/complete — mark a follow-up as completed
router.put('/:id/complete', validateId, async (req, res) => {
  try {
    const existing = await db.query('SELECT * FROM follow_ups WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Follow-up not found.', code: 'FOLLOWUP_NOT_FOUND' });
    }

    const followUp = existing.rows[0];
    if (followUp.status === 'completed') {
      return res.status(400).json({ status: 'error', message: 'Follow-up is already completed.', code: 'ALREADY_COMPLETED' });
    }

    const result = await db.query(
      `UPDATE follow_ups SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    // Optionally update lead status if the user wants
    if (req.body.lead_status) {
      await db.query(
        `UPDATE leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [req.body.lead_status, followUp.lead_id]
      );
    }

    logger.info('Follow-up completed', { followUpId: req.params.id });

    res.json({ status: 'success', data: { followUp: result.rows[0] } });
  } catch (err) {
    logger.error('Complete follow-up error', { error: err.message, followUpId: req.params.id });
    res.status(500).json({ status: 'error', message: `Failed to complete follow-up: ${err.message}`, code: 'FOLLOWUP_COMPLETE_ERROR' });
  }
});

// DELETE /api/follow-ups/:id — cancel/delete a follow-up
router.delete('/:id', validateId, async (req, res) => {
  try {
    const existing = await db.query('SELECT * FROM follow_ups WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Follow-up not found.', code: 'FOLLOWUP_NOT_FOUND' });
    }

    await db.query(
      `UPDATE follow_ups SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [req.params.id]
    );

    // Clear the lead's follow_up_date if this was the pending follow-up
    const followUp = existing.rows[0];
    if (followUp.status === 'pending') {
      // Check if there are other pending follow-ups for this lead
      const otherPending = await db.query(
        `SELECT COUNT(*) FROM follow_ups WHERE lead_id = $1 AND status = 'pending' AND id != $2`,
        [followUp.lead_id, req.params.id]
      );
      if (parseInt(otherPending.rows[0].count) === 0) {
        await db.query(
          `UPDATE leads SET follow_up_date = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [followUp.lead_id]
        );
      }
    }

    logger.info('Follow-up cancelled', { followUpId: req.params.id });

    res.json({ status: 'success', message: 'Follow-up cancelled.' });
  } catch (err) {
    logger.error('Delete follow-up error', { error: err.message, followUpId: req.params.id });
    res.status(500).json({ status: 'error', message: `Failed to cancel follow-up: ${err.message}`, code: 'FOLLOWUP_DELETE_ERROR' });
  }
});

module.exports = router;
