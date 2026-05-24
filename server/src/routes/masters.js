const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// All master data routes require super_admin
router.use(authenticate, authorize('super_admin'));

// ─── LEAD SOURCES ────────────────────────────────────────────

router.get('/lead-sources', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM master_lead_source ORDER BY name'
    );
    res.json({ status: 'success', data: { items: result.rows } });
  } catch (err) {
    logger.error('List lead sources error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.post('/lead-sources', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required.' });
    }
    const dup = await db.query('SELECT id FROM master_lead_source WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: `"${name.trim()}" already exists.`, code: 'DUPLICATE' });
    }
    const result = await db.query('INSERT INTO master_lead_source (name) VALUES ($1) RETURNING *', [name.trim()]);
    logger.info('Lead source created', { name: name.trim() });
    res.status(201).json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Create lead source error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.put('/lead-sources/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required.' });
    }
    const dup = await db.query('SELECT id FROM master_lead_source WHERE LOWER(name) = LOWER($1) AND id != $2', [name.trim(), req.params.id]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: `"${name.trim()}" already exists.`, code: 'DUPLICATE' });
    }
    const result = await db.query('UPDATE master_lead_source SET name = $1 WHERE id = $2 RETURNING *', [name.trim(), req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lead source not found.' });
    }
    logger.info('Lead source updated', { id: req.params.id, name: name.trim() });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Update lead source error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.delete('/lead-sources/:id', async (req, res) => {
  try {
    const usage = await db.query('SELECT COUNT(*)::int AS count FROM leads WHERE lead_source = (SELECT name FROM master_lead_source WHERE id = $1)', [req.params.id]);
    if (usage.rows[0]?.count > 0) {
      return res.status(409).json({ status: 'error', message: `Cannot delete: this lead source is used by ${usage.rows[0].count} lead(s).`, code: 'IN_USE' });
    }
    const result = await db.query('DELETE FROM master_lead_source WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lead source not found.' });
    }
    logger.info('Lead source deleted', { id: req.params.id });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Delete lead source error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

// ─── PRIORITIES ──────────────────────────────────────────────

router.get('/priorities', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM master_priority ORDER BY name');
    res.json({ status: 'success', data: { items: result.rows } });
  } catch (err) {
    logger.error('List priorities error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.post('/priorities', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required.' });
    }
    const dup = await db.query('SELECT id FROM master_priority WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: `"${name.trim()}" already exists.`, code: 'DUPLICATE' });
    }
    const result = await db.query('INSERT INTO master_priority (name) VALUES ($1) RETURNING *', [name.trim()]);
    logger.info('Priority created', { name: name.trim() });
    res.status(201).json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Create priority error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.put('/priorities/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required.' });
    }
    const dup = await db.query('SELECT id FROM master_priority WHERE LOWER(name) = LOWER($1) AND id != $2', [name.trim(), req.params.id]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: `"${name.trim()}" already exists.`, code: 'DUPLICATE' });
    }
    const result = await db.query('UPDATE master_priority SET name = $1 WHERE id = $2 RETURNING *', [name.trim(), req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Priority not found.' });
    }
    logger.info('Priority updated', { id: req.params.id, name: name.trim() });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Update priority error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.delete('/priorities/:id', async (req, res) => {
  try {
    const usage = await db.query('SELECT COUNT(*)::int AS count FROM leads WHERE priority = (SELECT name FROM master_priority WHERE id = $1)', [req.params.id]);
    if (usage.rows[0]?.count > 0) {
      return res.status(409).json({ status: 'error', message: `Cannot delete: this priority is used by ${usage.rows[0].count} lead(s).`, code: 'IN_USE' });
    }
    const result = await db.query('DELETE FROM master_priority WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Priority not found.' });
    }
    logger.info('Priority deleted', { id: req.params.id });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Delete priority error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

// ─── LEAD STATUSES ───────────────────────────────────────────

router.get('/lead-statuses', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM master_lead_status ORDER BY name');
    res.json({ status: 'success', data: { items: result.rows } });
  } catch (err) {
    logger.error('List lead statuses error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.post('/lead-statuses', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required.' });
    }
    const dup = await db.query('SELECT id FROM master_lead_status WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: `"${name.trim()}" already exists.`, code: 'DUPLICATE' });
    }
    const result = await db.query('INSERT INTO master_lead_status (name) VALUES ($1) RETURNING *', [name.trim()]);
    logger.info('Lead status created', { name: name.trim() });
    res.status(201).json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Create lead status error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.put('/lead-statuses/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required.' });
    }
    const dup = await db.query('SELECT id FROM master_lead_status WHERE LOWER(name) = LOWER($1) AND id != $2', [name.trim(), req.params.id]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: `"${name.trim()}" already exists.`, code: 'DUPLICATE' });
    }
    const result = await db.query('UPDATE master_lead_status SET name = $1 WHERE id = $2 RETURNING *', [name.trim(), req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lead status not found.' });
    }
    logger.info('Lead status updated', { id: req.params.id, name: name.trim() });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Update lead status error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.delete('/lead-statuses/:id', async (req, res) => {
  try {
    const usage = await db.query('SELECT COUNT(*)::int AS count FROM leads WHERE status = (SELECT name FROM master_lead_status WHERE id = $1)', [req.params.id]);
    if (usage.rows[0]?.count > 0) {
      return res.status(409).json({ status: 'error', message: `Cannot delete: this status is used by ${usage.rows[0].count} lead(s).`, code: 'IN_USE' });
    }
    const result = await db.query('DELETE FROM master_lead_status WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lead status not found.' });
    }
    logger.info('Lead status deleted', { id: req.params.id });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Delete lead status error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

// ─── DEPARTMENTS ─────────────────────────────────────────────

router.get('/departments', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.*,
        COALESCE(bd.branch_count, 0)::int AS branch_count,
        COALESCE(doc.doctor_count, 0)::int AS doctor_count
      FROM master_department d
      LEFT JOIN (SELECT department_id, COUNT(*) AS branch_count FROM branch_departments GROUP BY department_id) bd ON bd.department_id = d.id
      LEFT JOIN (SELECT department, COUNT(*) AS doctor_count FROM master_doctors GROUP BY department) doc ON doc.department = d.name
      ORDER BY d.name
    `);
    res.json({ status: 'success', data: { items: result.rows } });
  } catch (err) {
    logger.error('List departments error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.post('/departments', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required.' });
    }
    const dup = await db.query('SELECT id FROM master_department WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: `"${name.trim()}" already exists.`, code: 'DUPLICATE' });
    }
    const result = await db.query('INSERT INTO master_department (name) VALUES ($1) RETURNING *', [name.trim()]);
    logger.info('Department created', { name: name.trim() });
    res.status(201).json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Create department error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.put('/departments/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required.' });
    }
    const dup = await db.query('SELECT id FROM master_department WHERE LOWER(name) = LOWER($1) AND id != $2', [name.trim(), req.params.id]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: `"${name.trim()}" already exists.`, code: 'DUPLICATE' });
    }
    const result = await db.query('UPDATE master_department SET name = $1 WHERE id = $2 RETURNING *', [name.trim(), req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Department not found.' });
    }
    logger.info('Department updated', { id: req.params.id, name: name.trim() });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Update department error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    const branchUsage = await db.query('SELECT COUNT(*)::int AS count FROM branch_departments WHERE department_id = $1', [req.params.id]);
    const dept = await db.query('SELECT name FROM master_department WHERE id = $1', [req.params.id]);
    let doctorCount = 0;
    if (dept.rows.length > 0) {
      const docUsage = await db.query('SELECT COUNT(*)::int AS count FROM master_doctors WHERE department = $1', [dept.rows[0].name]);
      doctorCount = docUsage.rows[0]?.count || 0;
    }
    const branchCount = branchUsage.rows[0]?.count || 0;
    if (branchCount > 0 || doctorCount > 0) {
      const parts = [];
      if (branchCount > 0) parts.push(`${branchCount} branch(es)`);
      if (doctorCount > 0) parts.push(`${doctorCount} doctor(s)`);
      return res.status(409).json({ status: 'error', message: `Cannot delete: this department is assigned to ${parts.join(' and ')}.`, code: 'IN_USE' });
    }
    const result = await db.query('DELETE FROM master_department WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Department not found.' });
    }
    logger.info('Department deleted', { id: req.params.id });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Delete department error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

// ─── BRANCHES ────────────────────────────────────────────────

router.get('/branches', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT b.*,
        COALESCE(dept_count, 0)::int AS department_count
      FROM master_branches b
      LEFT JOIN (SELECT branch_id, COUNT(*) AS dept_count FROM branch_departments GROUP BY branch_id) bd ON bd.branch_id = b.id
      ORDER BY b.name
    `);
    res.json({ status: 'success', data: { items: result.rows } });
  } catch (err) {
    logger.error('List branches error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.post('/branches', async (req, res) => {
  try {
    const { name, address, city, state, phone, email, department_ids } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Branch name is required.' });
    }
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO master_branches (name, address, city, state, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name.trim(), address || '', city || '', state || '', phone || '', email || '']
      );
      const branch = result.rows[0];
      if (department_ids?.length > 0) {
        const values = department_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO branch_departments (branch_id, department_id) VALUES ${values}`,
          [branch.id, ...department_ids]
        );
      }
      await client.query('COMMIT');
      logger.info('Branch created', { id: branch.id, name: branch.name });
      res.status(201).json({ status: 'success', data: { item: branch } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Create branch error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.put('/branches/:id', async (req, res) => {
  try {
    const { name, address, city, state, phone, email, is_active, department_ids } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;
    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name.trim()); }
    if (address !== undefined) { fields.push(`address = $${idx++}`); values.push(address); }
    if (city !== undefined) { fields.push(`city = $${idx++}`); values.push(city); }
    if (state !== undefined) { fields.push(`state = $${idx++}`); values.push(state); }
    if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone); }
    if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      if (fields.length > 0) {
        values.push(req.params.id);
        const result = await client.query(
          `UPDATE master_branches SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
          values
        );
        if (result.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ status: 'error', message: 'Branch not found.' });
        }
      }
      if (department_ids !== undefined) {
        await client.query('DELETE FROM branch_departments WHERE branch_id = $1', [req.params.id]);
        if (department_ids.length > 0) {
          const vals = department_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
          await client.query(
            `INSERT INTO branch_departments (branch_id, department_id) VALUES ${vals}`,
            [req.params.id, ...department_ids]
          );
        }
      }
      await client.query('COMMIT');
      const updated = await db.query('SELECT * FROM master_branches WHERE id = $1', [req.params.id]);
      logger.info('Branch updated', { id: req.params.id });
      res.json({ status: 'success', data: { item: updated.rows[0] } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Update branch error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.delete('/branches/:id', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE master_branches SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Branch not found.' });
    }
    logger.info('Branch deactivated', { id: req.params.id });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Delete branch error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

// ─── BRANCH DEPARTMENTS ──────────────────────────────────────

router.get('/branches/:id/departments', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT department_id FROM branch_departments WHERE branch_id = $1',
      [req.params.id]
    );
    res.json({ status: 'success', data: { department_ids: result.rows.map(r => r.department_id) } });
  } catch (err) {
    logger.error('List branch departments error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

// ─── DOCTORS ─────────────────────────────────────────────────

router.get('/doctors', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM master_doctors ORDER BY name');
    res.json({ status: 'success', data: { items: result.rows } });
  } catch (err) {
    logger.error('List doctors error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.post('/doctors', async (req, res) => {
  try {
    const { name, department, specialty, qualification, phone, email } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Doctor name is required.' });
    }
    const result = await db.query(
      `INSERT INTO master_doctors (name, department, specialty, qualification, phone, email)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name.trim(), department || '', specialty || '', qualification || '', phone || '', email || '']
    );
    logger.info('Doctor created', { id: result.rows[0].id, name: name.trim() });
    res.status(201).json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Create doctor error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.put('/doctors/:id', async (req, res) => {
  try {
    const { name, department, specialty, qualification, phone, email, is_active } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;
    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name.trim()); }
    if (department !== undefined) { fields.push(`department = $${idx++}`); values.push(department); }
    if (specialty !== undefined) { fields.push(`specialty = $${idx++}`); values.push(specialty); }
    if (qualification !== undefined) { fields.push(`qualification = $${idx++}`); values.push(qualification); }
    if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone); }
    if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

    if (fields.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No fields to update.' });
    }
    values.push(req.params.id);
    const result = await db.query(
      `UPDATE master_doctors SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Doctor not found.' });
    }
    logger.info('Doctor updated', { id: req.params.id });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Update doctor error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.delete('/doctors/:id', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE master_doctors SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Doctor not found.' });
    }
    logger.info('Doctor deactivated', { id: req.params.id });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Delete doctor error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

// ─── PINCODES ────────────────────────────────────────────

router.get('/pincodes', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where = `WHERE pincode ILIKE $1 OR area ILIKE $1 OR city ILIKE $1 OR state ILIKE $1`;
    }

    params.push(parseInt(limit));
    params.push(offset);
    const countParams = search ? [`%${search}%`] : [];

    const [result, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM master_pincodes ${where} ORDER BY pincode, area LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      db.query(
        `SELECT COUNT(*) FROM master_pincodes ${where}`,
        countParams
      ),
    ]);

    res.json({
      status: 'success',
      data: {
        items: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        pageSize: parseInt(limit),
      },
    });
  } catch (err) {
    logger.error('List pincodes error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.post('/pincodes', async (req, res) => {
  try {
    const { pincode, area, city, state } = req.body;
    if (!pincode?.trim() || !area?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Pincode and Area are required.' });
    }
    const dup = await db.query(
      'SELECT id FROM master_pincodes WHERE pincode = $1 AND LOWER(area) = LOWER($2)',
      [pincode.trim(), area.trim()]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: `"${area.trim()}" already exists for pincode ${pincode.trim()}.`, code: 'DUPLICATE' });
    }
    const result = await db.query(
      'INSERT INTO master_pincodes (pincode, area, city, state, country) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [pincode.trim(), area.trim(), city?.trim() || '', state?.trim() || '', 'India']
    );
    logger.info('Pincode created', { pincode: pincode.trim(), area: area.trim() });
    res.status(201).json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Create pincode error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.put('/pincodes/:id', async (req, res) => {
  try {
    const { pincode, area, city, state } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;

    if (pincode !== undefined) { fields.push(`pincode = $${idx++}`); values.push(pincode.trim()); }
    if (area !== undefined) { fields.push(`area = $${idx++}`); values.push(area.trim()); }
    if (city !== undefined) { fields.push(`city = $${idx++}`); values.push(city.trim()); }
    if (state !== undefined) { fields.push(`state = $${idx++}`); values.push(state.trim()); }

    if (fields.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No fields to update.' });
    }
    values.push(req.params.id);
    const result = await db.query(
      `UPDATE master_pincodes SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Pincode record not found.' });
    }
    logger.info('Pincode updated', { id: req.params.id });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Update pincode error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

router.delete('/pincodes/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM master_pincodes WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Pincode record not found.' });
    }
    logger.info('Pincode deleted', { id: req.params.id });
    res.json({ status: 'success', data: { item: result.rows[0] } });
  } catch (err) {
    logger.error('Delete pincode error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'An error occurred: ' + err.message });
  }
});

module.exports = router;
