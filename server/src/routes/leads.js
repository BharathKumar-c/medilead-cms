const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validateLead, validateLeadUpdate, validateId, validateLeadQuery } = require('../middleware/validate');
const { notify, notifyManagers } = require('../utils/notify');
const logger = require('../utils/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/leads — list with search, filter, pagination
router.get('/', validateLeadQuery, async (req, res) => {
  try {
    const { search, status, priority, page = 1, limit = 10, sort = 'created_at', order = 'DESC' } = req.query;

    let where = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      where.push(`(l.name ILIKE $${paramIndex} OR l.uhid ILIKE $${paramIndex} OR l.email ILIKE $${paramIndex} OR l.phone ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status && status !== 'All') {
      where.push(`l.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      where.push(`l.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    // If user doesn't have view_all permission, only show their leads
    const userRoles = req.user.roles || [req.user.role];
    const isSuperAdmin = userRoles.includes('super_admin');
    if (!isSuperAdmin && (!req.user.permissions || !req.user.permissions.includes('leads:view_all'))) {
      where.push(`l.assigned_to = $${paramIndex}`);
      params.push(req.user.id);
      paramIndex++;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const allowedSorts = ['created_at', 'name', 'last_call_date', 'status', 'priority'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM leads l ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const result = await db.query(
      `SELECT l.*, u.name as assigned_to_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       ${whereClause}
       ORDER BY l.${sortColumn} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      status: 'success',
      data: {
        leads: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    logger.error('Get leads error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to fetch leads.', code: 'LEADS_FETCH_ERROR' });
  }
});

// GET /api/leads/metrics — summary metrics for lead box
router.get('/metrics', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [newToday, pending, closed, overdue] = await Promise.all([
      db.query("SELECT COUNT(*) FROM leads WHERE status = 'New' AND DATE(created_at) = $1", [today]),
      db.query("SELECT COUNT(*) FROM leads WHERE status IN ('New', 'Follow-up', 'Contacted')"),
      db.query("SELECT COUNT(*) FROM leads WHERE status = 'Closed'"),
      db.query("SELECT COUNT(*) FROM leads WHERE status = 'Follow-up' AND last_call_date < NOW() - INTERVAL '3 days'"),
    ]);

    const total = parseInt(pending.rows[0].count) + parseInt(closed.rows[0].count);
    const conversionRate = total > 0 ? Math.round((parseInt(closed.rows[0].count) / total) * 100) : 0;

    res.json({
      status: 'success',
      data: {
        newLeadsToday: { count: parseInt(newToday.rows[0].count), trend: '+12%' },
        pendingFollowups: parseInt(pending.rows[0].count),
        conversionRate: `${conversionRate}%`,
        overdueResponses: parseInt(overdue.rows[0].count),
      },
    });
  } catch (err) {
    logger.error('Lead metrics error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to fetch lead metrics.', code: 'METRICS_ERROR' });
  }
});

// GET /api/leads/master-data — dropdown data (sources, priorities, statuses)
router.get('/master-data', async (req, res) => {
  try {
    const [sources, priorities, statuses] = await Promise.all([
      db.query('SELECT name FROM master_lead_source ORDER BY name'),
      db.query('SELECT name FROM master_priority ORDER BY name'),
      db.query('SELECT name FROM master_lead_status ORDER BY name'),
    ]);

    res.json({
      status: 'success',
      data: {
        sources: sources.rows.map(r => r.name),
        priorities: priorities.rows.map(r => r.name),
        statuses: statuses.rows.map(r => r.name),
      },
    });
  } catch (err) {
    logger.error('Master data error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to fetch master data.', code: 'MASTER_DATA_ERROR' });
  }
});

// GET /api/leads/uhid/:uhid — search by UHID (for auto-fill)
router.get('/uhid/:uhid', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, uhid, phone, alternate_contact, email, dob, address, pincode, city, state, country
       FROM leads WHERE uhid = $1`,
      [req.params.uhid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No patient found with this UHID.', code: 'UHID_NOT_FOUND' });
    }

    res.json({ status: 'success', data: { patient: result.rows[0] } });
  } catch (err) {
    logger.error('UHID lookup error', { error: err.message, uhid: req.params.uhid });
    res.status(500).json({ status: 'error', message: 'Failed to look up UHID.', code: 'UHID_LOOKUP_ERROR' });
  }
});

// GET /api/leads/providers — list providers for dropdown
router.get('/providers', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT u.id, u.name, u.specialty
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE p.name = 'leads:view_providers' AND u.is_active = true
      ORDER BY u.name
    `);
    res.json({ status: 'success', data: { providers: result.rows } });
  } catch (err) {
    logger.error('Get providers error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to fetch providers.', code: 'PROVIDERS_ERROR' });
  }
});

// GET /api/leads/departments — list departments for dropdown (optionally filtered by branch)
router.get('/departments', async (req, res) => {
  try {
    const { branch_id } = req.query;
    let query, params;

    if (branch_id) {
      query = `SELECT d.id, d.name FROM master_department d
               INNER JOIN branch_departments bd ON d.id = bd.department_id
               WHERE bd.branch_id = $1 ORDER BY d.name`;
      params = [branch_id];
    } else {
      query = 'SELECT id, name FROM master_department ORDER BY name';
      params = [];
    }

    const result = await db.query(query, params);
    res.json({ status: 'success', data: { departments: result.rows } });
  } catch (err) {
    logger.error('Get departments error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to fetch departments.', code: 'DEPARTMENTS_ERROR' });
  }
});

// GET /api/leads/:id — get single lead
router.get('/:id', validateId, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT l.*, u.name as assigned_to_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lead not found.', code: 'LEAD_NOT_FOUND' });
    }

    res.json({ status: 'success', data: { lead: result.rows[0] } });
  } catch (err) {
    logger.error('Get lead error', { error: err.message, leadId: req.params.id });
    res.status(500).json({ status: 'error', message: 'Failed to fetch lead.', code: 'LEAD_FETCH_ERROR' });
  }
});

// POST /api/leads — create new lead
router.post('/', validateLead, async (req, res) => {
  try {
    const {
      name, uhid, phone, alternate_contact, email, dob, address,
      pincode, city, state, country, lead_source, status, priority, clinical_remarks,
    } = req.body;

    // Generate initials from name
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    // Check for duplicate phone number
    if (phone) {
      const existing = await db.query('SELECT id, name, phone FROM leads WHERE phone = $1', [phone]);
      if (existing.rows.length > 0) {
        logger.warn('Duplicate lead attempt', { phone, existingLeadId: existing.rows[0].id });
        return res.status(409).json({
          status: 'error',
          message: `A lead with phone number ${phone} already exists (${existing.rows[0].name}).`,
          code: 'DUPLICATE_PHONE',
          existingLead: existing.rows[0],
        });
      }
    }

    // Auto-assign to a telecaller (round-robin)
    let assignedTo = req.body.assigned_to || null;
    if (!assignedTo) {
      const telecallers = await db.query(
        "SELECT id FROM users WHERE role = 'telecaller' AND is_active = true ORDER BY id"
      );
      if (telecallers.rows.length > 0) {
        // Simple round-robin: assign to telecaller with fewest active leads
        const leastBusy = await db.query(`
          SELECT u.id, COUNT(l.id) as lead_count
          FROM users u
          LEFT JOIN leads l ON l.assigned_to = u.id AND l.status NOT IN ('Closed', 'Rejected')
          WHERE u.role = 'telecaller' AND u.is_active = true
          GROUP BY u.id
          ORDER BY lead_count ASC
          LIMIT 1
        `);
        if (leastBusy.rows.length > 0) {
          assignedTo = leastBusy.rows[0].id;
        }
      }
    }

    const result = await db.query(
      `INSERT INTO leads (name, initials, uhid, phone, alternate_contact, email, dob, address,
        pincode, city, state, country, lead_source, status, priority, assigned_to, clinical_remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [name, initials, uhid, phone, alternate_contact, email, dob, address,
        pincode, city, state, country, lead_source, status || 'New', priority || 'Medium', assignedTo, clinical_remarks]
    );

    const lead = result.rows[0];

    // Log to lead history
    await db.query(
      `INSERT INTO lead_history (lead_id, action, new_value, changed_by)
       VALUES ($1, 'created', 'Lead created', $2)`,
      [lead.id, req.user.id]
    );

    // Notify assigned user
    if (assignedTo && assignedTo !== req.user.id) {
      const io = req.app.get('io');
      await notify(io, {
        user_id: assignedTo,
        type: 'info',
        title: `New lead assigned: ${name}`,
        link: '/lead-box',
      });
    }

    logger.info('Lead created', { leadId: lead.id, name, createdBy: req.user.id, assignedTo });

    res.status(201).json({ status: 'success', data: { lead } });
  } catch (err) {
    logger.error('Create lead error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to create lead.', code: 'LEAD_CREATE_ERROR' });
  }
});

// PUT /api/leads/:id — update lead
router.put('/:id', validateId, validateLeadUpdate, async (req, res) => {
  try {
    const {
      name, uhid, phone, alternate_contact, email, dob, address,
      pincode, city, state, country, lead_source, status, priority, assigned_to, clinical_remarks,
    } = req.body;

    // Check if lead exists
    const existing = await db.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lead not found.', code: 'LEAD_NOT_FOUND' });
    }

    const oldLead = existing.rows[0];

    // Check for duplicate phone if phone is being changed
    if (phone && phone !== oldLead.phone) {
      const duplicate = await db.query('SELECT id, name FROM leads WHERE phone = $1 AND id != $2', [phone, req.params.id]);
      if (duplicate.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: `Phone number ${phone} is already used by ${duplicate.rows[0].name}.`,
          code: 'DUPLICATE_PHONE',
        });
      }
    }

    const result = await db.query(
      `UPDATE leads SET
        name = COALESCE($1, name),
        uhid = COALESCE($2, uhid),
        phone = COALESCE($3, phone),
        alternate_contact = COALESCE($4, alternate_contact),
        email = COALESCE($5, email),
        dob = COALESCE($6, dob),
        address = COALESCE($7, address),
        pincode = COALESCE($8, pincode),
        city = COALESCE($9, city),
        state = COALESCE($10, state),
        country = COALESCE($11, country),
        lead_source = COALESCE($12, lead_source),
        status = COALESCE($13, status),
        priority = COALESCE($14, priority),
        assigned_to = COALESCE($15, assigned_to),
        clinical_remarks = COALESCE($16, clinical_remarks),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $17
       RETURNING *`,
      [name, uhid, phone, alternate_contact, email, dob, address,
        pincode, city, state, country, lead_source, status, priority, assigned_to, clinical_remarks, req.params.id]
    );

    const lead = result.rows[0];

    // Track changes in lead history
    const changes = [];
    if (status && status !== oldLead.status) {
      changes.push({ field: 'status', oldValue: oldLead.status, newValue: status });
    }
    if (priority && priority !== oldLead.priority) {
      changes.push({ field: 'priority', oldValue: oldLead.priority, newValue: priority });
    }
    if (assigned_to && assigned_to !== oldLead.assigned_to) {
      changes.push({ field: 'assigned_to', oldValue: oldLead.assigned_to, newValue: assigned_to });
    }

    for (const change of changes) {
      await db.query(
        `INSERT INTO lead_history (lead_id, action, old_value, new_value, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [lead.id, change.field, change.oldValue, change.newValue, req.user.id]
      );
    }

    // Notify if status changed
    if (status && status !== oldLead.status) {
      const io = req.app.get('io');
      if (status === 'Follow-up' && lead.assigned_to) {
        await notify(io, {
          user_id: lead.assigned_to,
          type: 'info',
          title: `Lead ${name} moved to Follow-up`,
          link: '/lead-box',
        });
      }
    }

    logger.info('Lead updated', { leadId: lead.id, updatedBy: req.user.id, changes: changes.map(c => c.field) });

    res.json({ status: 'success', data: { lead } });
  } catch (err) {
    logger.error('Update lead error', { error: err.message, leadId: req.params.id, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to update lead.', code: 'LEAD_UPDATE_ERROR' });
  }
});

// DELETE /api/leads/:id — soft delete (set status to Rejected)
router.delete('/:id', validateId, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE leads SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lead not found.', code: 'LEAD_NOT_FOUND' });
    }

    // Log to history
    await db.query(
      `INSERT INTO lead_history (lead_id, action, new_value, changed_by)
       VALUES ($1, 'status', 'Rejected', $2)`,
      [req.params.id, req.user.id]
    );

    logger.info('Lead deleted (soft)', { leadId: req.params.id, deletedBy: req.user.id });

    res.json({ status: 'success', message: `Lead ${result.rows[0].name} has been rejected.` });
  } catch (err) {
    logger.error('Delete lead error', { error: err.message, leadId: req.params.id, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to delete lead.', code: 'LEAD_DELETE_ERROR' });
  }
});

// GET /api/leads/:id/history — get lead history
router.get('/:id/history', validateId, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT lh.*, u.name as changed_by_name
       FROM lead_history lh
       LEFT JOIN users u ON lh.changed_by = u.id
       WHERE lh.lead_id = $1
       ORDER BY lh.created_at DESC`,
      [req.params.id]
    );

    res.json({ status: 'success', data: { history: result.rows } });
  } catch (err) {
    logger.error('Get lead history error', { error: err.message, leadId: req.params.id });
    res.status(500).json({ status: 'error', message: 'Failed to fetch lead history.', code: 'HISTORY_ERROR' });
  }
});

module.exports = router;
