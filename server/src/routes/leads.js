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
    const { search, status, priority, page = 1, limit = 100, sort = 'created_at', order = 'DESC', view } = req.query;

    let where = [];
    let params = [];
    let paramIndex = 1;

    const today = new Date().toISOString().split('T')[0];

    // View filters: today, my, all
    if (view === 'today') {
      where.push(`DATE(l.created_at) = $${paramIndex}`);
      params.push(today);
      paramIndex++;
    } else if (view === 'my') {
      where.push(`DATE(l.created_at) = $${paramIndex}`);
      params.push(today);
      paramIndex++;
      where.push(`l.created_by = $${paramIndex}`);
      params.push(req.user.id);
      paramIndex++;
    }
    // view === 'all' or no view: no extra filter — show ALL leads

    if (search) {
      where.push(`(l.name ILIKE $${paramIndex} OR l.code ILIKE $${paramIndex} OR l.uhid ILIKE $${paramIndex} OR l.email ILIKE $${paramIndex} OR l.phone ILIKE $${paramIndex} OR l.city ILIKE $${paramIndex} OR l.state ILIKE $${paramIndex})`);
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

    if (req.query.branch_id) {
      where.push(`l.branch_id = $${paramIndex}`);
      params.push(req.query.branch_id);
      paramIndex++;
    }

    // No permission-based created_by filter — each view ('today'/'my'/'all') already
    // defines its own scope. 'today' shows all leads created today, 'my' shows the
    // user's leads from today, and 'all' shows every lead in the system.

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // Sort: by the requested column, with priority as secondary sort
    const priorityOrder = `CASE l.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 ELSE 4 END`;
    const allowedSorts = ['created_at', 'name', 'last_call_date', 'status', 'priority'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const orderByClause = sort === 'priority'
      ? `l.priority ${sortOrder}`
      : `l.${sortColumn} ${sortOrder}, ${priorityOrder}, l.created_at DESC`;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM leads l ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const result = await db.query(
      `SELECT l.*, u.name as assigned_to_name, mb.name as branch_name,
              creator.name as created_by_name, assigner.name as assigned_by_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       LEFT JOIN users creator ON l.created_by = creator.id
       LEFT JOIN users assigner ON l.assigned_by = assigner.id
       LEFT JOIN master_branches mb ON l.branch_id = mb.id
       ${whereClause}
       ORDER BY ${orderByClause}
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
    res.status(500).json({ status: 'error', message: `Failed to fetch leads: ${err.message}`, code: 'LEADS_FETCH_ERROR' });
  }
});

// ── Status category constants ──
// Terminal statuses: leads that require no further action
const TERMINAL_STATUSES = ['Closed', 'Rejected', 'Appointment Booked'];
// Conversion indicators: successful outcomes
const CONVERSION_STATUSES = ['Appointment Booked', 'Closed'];

// GET /api/leads/metrics — summary metrics for lead box
//
// Query params:
//   range: 'today' | 'month' | 'all' (default: 'all')
//     today — only leads created today
//     month — only leads created this month
//     all   — all leads (no date filter)
//
// Status categories:
//   Terminal (no action needed): 'Closed', 'Rejected', 'Appointment Booked'
//   Conversion indicators:       'Appointment Booked', 'Closed'
//   Active (needs action):       'New', 'Contacted', 'Interested', 'Follow-up' + legacy enquiry types
//
// Overdue thresholds (using lead_status_history table + automated timestamp fallbacks):
//   - 'New' leads: entered 'New' status 2+ days ago without any status change
//   - Other active leads: current status unchanged for 3+ days
//   - Falls back to created_at / last_call_date for legacy leads without history entries
router.get('/metrics', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { range = 'all' } = req.query;

    // Build date condition based on range
    let dateCondition = '';
    let dateParams = [];
    if (range === 'today') {
      dateCondition = 'AND DATE(l.created_at) = $1';
      dateParams = [today];
    } else if (range === 'month') {
      dateCondition = 'AND l.created_at >= $1';
      dateParams = [new Date().toISOString().slice(0, 7) + '-01']; // first day of current month
    }
    // range === 'all': no date filter

    // For queries on leads table directly (not aliased as l)
    let simpleDateCondition = '';
    let simpleDateParams = [];
    if (range === 'today') {
      simpleDateCondition = 'WHERE DATE(created_at) = $1';
      simpleDateParams = [today];
    } else if (range === 'month') {
      simpleDateCondition = 'WHERE created_at >= $1';
      simpleDateParams = [new Date().toISOString().slice(0, 7) + '-01'];
    }

    const [newToday, followUp, converted, overdue, total] = await Promise.all([
      // (1) New Leads Today — all leads created today (always today, regardless of range)
      db.query(`SELECT COUNT(*) FROM leads WHERE DATE(created_at) = $1`, [today]),

      // (2) Follow-up Leads — active leads needing action, filtered by date range
      db.query(`SELECT COUNT(*) FROM leads l WHERE l.status NOT IN ('Closed', 'Rejected', 'Appointment Booked') ${range !== 'all' ? dateCondition.replace('l.created_at', 'l.created_at') : ''}`, dateParams),

      // (3) Conversion Rate — successful outcomes, filtered by date range
      db.query(`SELECT COUNT(*) FROM leads WHERE status IN ('Appointment Booked', 'Closed')${simpleDateCondition ? ' ' + simpleDateCondition : ''}`, simpleDateParams),

      // (4) Overdue Responses — stale active leads, filtered by date range
      db.query(`
        SELECT COUNT(*) FROM leads l
        WHERE l.status NOT IN ('Closed', 'Rejected', 'Appointment Booked')
        ${range !== 'all' ? dateCondition.replace('l.created_at', 'l.created_at') : ''}
        AND (
          -- 'New' leads: status unchanged for 2+ days
          (l.status = 'New'
           AND COALESCE(
             (SELECT MAX(lsh.changed_at) FROM lead_status_history lsh WHERE lsh.lead_id = l.id),
             l.created_at
           ) < NOW() - INTERVAL '2 days')
          OR
          -- Other active leads: status unchanged for 3+ days
          (l.status != 'New'
           AND COALESCE(
             (SELECT MAX(lsh.changed_at) FROM lead_status_history lsh WHERE lsh.lead_id = l.id),
             l.last_call_date,
             l.created_at
           ) < NOW() - INTERVAL '3 days')
        )
      `, dateParams),

      // Total leads for conversion rate calculation, filtered by date range
      db.query(`SELECT COUNT(*) FROM leads${simpleDateCondition ? ' ' + simpleDateCondition : ''}`, simpleDateParams),
    ]);

    const totalLeads = parseInt(total.rows[0].count) || 1;
    const convertedCount = parseInt(converted.rows[0].count);
    const conversionRate = Math.round((convertedCount / totalLeads) * 100);

    res.json({
      status: 'success',
      data: {
        newLeadsToday: parseInt(newToday.rows[0].count),
        totalLeads: totalLeads,
        alreadyLeads: parseInt(followUp.rows[0].count),
        conversionRate: `${conversionRate}%`,
        overdueResponses: parseInt(overdue.rows[0].count),
      },
    });
  } catch (err) {
    logger.error('Lead metrics error', { error: err.message });
    res.status(500).json({ status: 'error', message: `Failed to fetch lead metrics: ${err.message}`, code: 'METRICS_ERROR' });
  }
});

// PUT /api/leads/:id/assign — assign lead to another agent
router.put('/:id/assign', async (req, res) => {
  try {
    const { assigned_to } = req.body;
    if (!assigned_to) {
      return res.status(400).json({ status: 'error', message: 'assigned_to is required' });
    }
    const result = await db.query(
      `UPDATE leads SET assigned_to = $1, assigned_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [assigned_to, req.user.id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lead not found' });
    }
    // Log to lead history
    await db.query(
      `INSERT INTO lead_history (lead_id, action, new_value, changed_by) VALUES ($1, 'assigned', $2, $3)`,
      [req.params.id, `Assigned to user #${assigned_to}`, req.user.id]
    );
    // Notify assigned user
    const io = req.app.get('io');
    if (io && assigned_to) {
      await notify(io, {
        user_id: assigned_to,
        type: 'info',
        title: `Lead ${result.rows[0].code || result.rows[0].name} assigned to you`,
        link: '/lead-box',
      });
    }
    res.json({ status: 'success', data: { lead: result.rows[0] } });
  } catch (err) {
    logger.error('Assign lead error', { error: err.message });
    res.status(500).json({ status: 'error', message: `Failed to assign lead: ${err.message}` });
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
    res.status(500).json({ status: 'error', message: `Failed to fetch master data: ${err.message}`, code: 'MASTER_DATA_ERROR' });
  }
});

// GET /api/leads/pincode/:pincode — DB-first pincode lookup with external API fallback
router.get('/pincode/:pincode', async (req, res) => {
  try {
    const pincode = req.params.pincode.replace(/\D/g, '');
    if (pincode.length !== 6) {
      return res.status(400).json({ status: 'error', message: 'Invalid pincode', code: 'INVALID_PINCODE' });
    }

    // 1. Query master_pincodes table first
    const dbResult = await db.query(
      'SELECT area, city, state, country FROM master_pincodes WHERE pincode = $1 ORDER BY area',
      [pincode]
    );

    if (dbResult.rows.length > 0) {
      const first = dbResult.rows[0];
      const areas = [...new Set(dbResult.rows.map(r => r.area))];
      return res.json({
        status: 'success',
        data: {
          areas,
          city: first.city || '',
          state: first.state || '',
          country: first.country || 'India',
        },
      });
    }

    // 2. Try external API if no local data
    try {
      const resp = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await resp.json();

      if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const postOffices = data[0].PostOffice;
        const po = postOffices[0];
        const areaNames = [...new Set(postOffices.map((p) => p.Name))];
        const city = po.District || po.Block || po.Name || '';
        const state = po.State || '';

        // Cache results into master_pincodes for future lookups
        for (const area of areaNames) {
          try {
            await db.query(
              'INSERT INTO master_pincodes (pincode, area, city, state, country) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
              [pincode, area, city, state, 'India']
            );
          } catch (_) { /* ignore insert errors */ }
        }

        return res.json({
          status: 'success',
          data: { areas: areaNames, city, state, country: 'India' },
        });
      }
    } catch (err) {
      logger.warn('External pincode API unreachable, using fallback data', {
        error: err.message,
        pincode,
      });
    }

    res.json({ status: 'success', data: { areas: [], city: '', state: '', country: 'India' } });
  } catch (err) {
    logger.error('Pincode lookup error', { error: err.message, pincode: req.params.pincode });
    res.status(500).json({ status: 'error', message: 'Failed to look up pincode', code: 'PINCODE_LOOKUP_ERROR' });
  }
});

// GET /api/leads/uhid/:uhid — search by UHID (for auto-fill)
router.get('/uhid/:uhid', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, uhid, phone, alternate_contact, email, dob, address, area, pincode, city, state, country
       FROM leads WHERE uhid = $1`,
      [req.params.uhid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No patient found with this UHID.', code: 'UHID_NOT_FOUND' });
    }

    res.json({ status: 'success', data: { patient: result.rows[0] } });
  } catch (err) {
    logger.error('UHID lookup error', { error: err.message, uhid: req.params.uhid });
    res.status(500).json({ status: 'error', message: `Failed to look up UHID: ${err.message}`, code: 'UHID_LOOKUP_ERROR' });
  }
});

// GET /api/leads/phone/:phone — look up leads by phone with call stats
router.get('/phone/:phone', authenticate, async (req, res) => {
  try {
    const phone = req.params.phone.replace(/\D/g, '');

    // Find leads by primary or alternate phone
    const leadsResult = await db.query(
      `SELECT l.id, l.name, l.initials, l.uhid, l.phone, l.alternate_contact, l.email,
              l.dob, l.address, l.area, l.pincode, l.city, l.state, l.country,
              l.status, l.priority, l.lead_source, l.assigned_to, l.branch_id, l.last_call_date,
              l.created_at, u.name as assigned_to_name, mb.name as branch_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       LEFT JOIN master_branches mb ON l.branch_id = mb.id
       WHERE l.phone = $1 OR l.alternate_contact = $1
       ORDER BY l.created_at DESC`,
      [phone]
    );

    // Get call stats for this phone
    const statsResult = await db.query(
      `SELECT
         COUNT(*) as total_calls,
         COUNT(*) FILTER (WHERE status = 'missed') as missed_calls,
         MAX(created_at) as last_call_at
       FROM call_logs
       WHERE caller_number = $1`,
      [phone]
    );

    // Get UHIDs for matched leads
    let uhids = [];
    if (leadsResult.rows.length > 0) {
      const leadIds = leadsResult.rows.map(l => l.id);
      const uhidsResult = await db.query(
        `SELECT DISTINCT uhid FROM lead_uhids WHERE lead_id = ANY($1)
         UNION
         SELECT DISTINCT uhid FROM leads WHERE id = ANY($1) AND uhid IS NOT NULL`,
        [leadIds]
      );
      uhids = uhidsResult.rows.map(r => r.uhid).filter(Boolean);
    }

    const stats = statsResult.rows[0];
    res.json({
      status: 'success',
      data: {
        leads: leadsResult.rows,
        callStats: {
          totalCalls: parseInt(stats.total_calls) || 0,
          missedCalls: parseInt(stats.missed_calls) || 0,
          lastCallAt: stats.last_call_at,
        },
        uhids,
      },
    });
  } catch (err) {
    logger.error('Phone lookup error', { error: err.message, phone: req.params.phone });
    res.status(500).json({ status: 'error', message: `Failed to look up phone: ${err.message}`, code: 'PHONE_LOOKUP_ERROR' });
  }
});

// GET /api/leads/uhids-by-phone/:phone — get all UHIDs for a phone number
router.get('/uhids-by-phone/:phone', authenticate, async (req, res) => {
  try {
    const phone = req.params.phone.replace(/\D/g, '');

    // Find lead IDs for this phone
    const leadsResult = await db.query(
      `SELECT id FROM leads WHERE phone = $1 OR alternate_contact = $1`,
      [phone]
    );

    if (leadsResult.rows.length === 0) {
      return res.json({ status: 'success', data: { uhids: [] } });
    }

    const leadIds = leadsResult.rows.map(l => l.id);

    // Get UHIDs from junction table and leads table
    const uhidsResult = await db.query(
      `SELECT DISTINCT uhid FROM lead_uhids WHERE lead_id = ANY($1)
       UNION
       SELECT DISTINCT uhid FROM leads WHERE id = ANY($1) AND uhid IS NOT NULL`,
      [leadIds]
    );

    res.json({ status: 'success', data: { uhids: uhidsResult.rows.map(r => r.uhid) } });
  } catch (err) {
    logger.error('UHIDs by phone error', { error: err.message, phone: req.params.phone });
    res.status(500).json({ status: 'error', message: `Failed to fetch UHIDs: ${err.message}`, code: 'UHIDS_LOOKUP_ERROR' });
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
    res.status(500).json({ status: 'error', message: `Failed to fetch providers: ${err.message}`, code: 'PROVIDERS_ERROR' });
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
    res.status(500).json({ status: 'error', message: `Failed to fetch departments: ${err.message}`, code: 'DEPARTMENTS_ERROR' });
  }
});

// GET /api/leads/:id — get single lead
router.get('/:id', validateId, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT l.*, u.name as assigned_to_name, mb.name as branch_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       LEFT JOIN master_branches mb ON l.branch_id = mb.id
       WHERE l.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lead not found.', code: 'LEAD_NOT_FOUND' });
    }

    res.json({ status: 'success', data: { lead: result.rows[0] } });
  } catch (err) {
    logger.error('Get lead error', { error: err.message, leadId: req.params.id });
    res.status(500).json({ status: 'error', message: `Failed to fetch lead: ${err.message}`, code: 'LEAD_FETCH_ERROR' });
  }
});

// POST /api/leads — create new lead
router.post('/', validateLead, async (req, res) => {
  try {
    const {
      name, uhid, phone, alternate_contact, email, dob, gender, address, area,
      pincode, city, state, country, lead_source, status, priority, clinical_remarks,
    } = req.body;
    const branch_id = req.body.branch_id || null;

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

    const follow_up_date = req.body.follow_up_date || null;

    const result = await db.query(
      `INSERT INTO leads (name, initials, uhid, phone, alternate_contact, email, dob, gender, address, area,
        pincode, city, state, country, lead_source, status, priority, assigned_to, branch_id, clinical_remarks,
        created_by, follow_up_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       RETURNING *`,
      [name, initials, uhid, phone, alternate_contact, email, dob || null, gender || null, address, area || null,
        pincode, city, state, country, lead_source, status || 'New', priority || 'Medium', assignedTo, branch_id, clinical_remarks,
        req.user.id, follow_up_date]
    );

    const lead = result.rows[0];

    // Generate lead code if not already set (auto-increment from ID)
    if (!lead.code) {
      const code = `L${lead.id}`;
      await db.query('UPDATE leads SET code = $1 WHERE id = $2', [code, lead.id]);
      lead.code = code;
    }

    // Log initial status to lead_status_history (safe — won't fail the request)
    try {
      await db.query(
        `INSERT INTO lead_status_history (lead_id, previous_status, new_status, changed_by, changed_at)
         VALUES ($1, NULL, $2, $3, CURRENT_TIMESTAMP)`,
        [lead.id, lead.status, req.user.id]
      );
    } catch (historyErr) {
      logger.warn('Failed to log initial lead_status_history', { leadId: lead.id, error: historyErr.message });
    }

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
    res.status(500).json({ status: 'error', message: `Failed to create lead: ${err.message}`, code: 'LEAD_CREATE_ERROR' });
  }
});

// PUT /api/leads/:id — update lead
router.put('/:id', validateId, validateLeadUpdate, async (req, res) => {
  try {
    const {
      name, uhid, phone, alternate_contact, email, dob, gender, address, area,
      pincode, city, state, country, lead_source, status, priority, assigned_to, clinical_remarks, follow_up_date,
    } = req.body;
    const branch_id = req.body.branch_id || null;

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
        gender = COALESCE($7, gender),
        address = COALESCE($8, address),
        area = COALESCE($9, area),
        pincode = COALESCE($10, pincode),
        city = COALESCE($11, city),
        state = COALESCE($12, state),
        country = COALESCE($13, country),
        lead_source = COALESCE($14, lead_source),
        status = COALESCE($15, status),
        priority = COALESCE($16, priority),
        assigned_to = COALESCE($17, assigned_to),
        branch_id = COALESCE($18, branch_id),
        clinical_remarks = COALESCE($19, clinical_remarks),
        follow_up_date = COALESCE($20, follow_up_date),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $21
       RETURNING *`,
      [name, uhid, phone, alternate_contact, email, dob || null, gender || null, address, area,
        pincode, city, state, country, lead_source, status, priority, assigned_to, branch_id, clinical_remarks,
        follow_up_date || null, req.params.id]
    );

    const lead = result.rows[0];

    // Track changes in lead history
    const changes = [];
    if (status && status !== oldLead.status) {
      changes.push({ field: 'status', oldValue: oldLead.status, newValue: status });

      // Log status transition to lead_status_history (safe — won't fail the request)
      try {
        await db.query(
          `INSERT INTO lead_status_history (lead_id, previous_status, new_status, changed_by, changed_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [lead.id, oldLead.status, status, req.user.id]
        );
      } catch (historyErr) {
        logger.warn('Failed to log lead_status_history', { leadId: lead.id, oldStatus: oldLead.status, newStatus: status, error: historyErr.message });
      }
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
    res.status(500).json({ status: 'error', message: `Failed to update lead: ${err.message}`, code: 'LEAD_UPDATE_ERROR' });
  }
});

// DELETE /api/leads/:id — soft delete (set status to Rejected)
router.delete('/:id', validateId, async (req, res) => {
  try {
    // Capture old status BEFORE the update
    const oldLeadForDelete = await db.query('SELECT status FROM leads WHERE id = $1', [req.params.id]);
    if (oldLeadForDelete.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lead not found.', code: 'LEAD_NOT_FOUND' });
    }
    const previousStatus = oldLeadForDelete.rows[0].status;

    const result = await db.query(
      `UPDATE leads SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name`,
      [req.params.id]
    );

    // Log status transition to lead_status_history (safe — won't fail the request)
    try {
      await db.query(
        `INSERT INTO lead_status_history (lead_id, previous_status, new_status, changed_by, changed_at)
         VALUES ($1, $2, 'Rejected', $3, CURRENT_TIMESTAMP)`,
        [req.params.id, previousStatus, req.user.id]
      );
    } catch (historyErr) {
      logger.warn('Failed to log lead_status_history on delete', { leadId: req.params.id, error: historyErr.message });
    }

    // Log to lead_history
    await db.query(
      `INSERT INTO lead_history (lead_id, action, new_value, changed_by)
       VALUES ($1, 'status', 'Rejected', $2)`,
      [req.params.id, req.user.id]
    );

    logger.info('Lead deleted (soft)', { leadId: req.params.id, deletedBy: req.user.id });

    res.json({ status: 'success', message: `Lead ${result.rows[0].name} has been rejected.` });
  } catch (err) {
    logger.error('Delete lead error', { error: err.message, leadId: req.params.id, userId: req.user.id });
    res.status(500).json({ status: 'error', message: `Failed to delete lead: ${err.message}`, code: 'LEAD_DELETE_ERROR' });
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
    res.status(500).json({ status: 'error', message: `Failed to fetch lead history: ${err.message}`, code: 'HISTORY_ERROR' });
  }
});

module.exports = router;
