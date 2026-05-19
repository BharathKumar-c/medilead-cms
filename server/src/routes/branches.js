const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/branches — list all active branches
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, address, city, state, phone, email FROM master_branches WHERE is_active = true ORDER BY name'
    );
    res.json({ status: 'success', data: { branches: result.rows } });
  } catch (err) {
    logger.error('Get branches error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to fetch branches.', code: 'BRANCHES_FETCH_ERROR' });
  }
});

// GET /api/branches/:id/departments — departments available at a specific branch
router.get('/:id/departments', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT d.id, d.name
       FROM master_department d
       INNER JOIN branch_departments bd ON d.id = bd.department_id
       WHERE bd.branch_id = $1
       ORDER BY d.name`,
      [req.params.id]
    );
    res.json({ status: 'success', data: { departments: result.rows } });
  } catch (err) {
    logger.error('Get branch departments error', { error: err.message, branchId: req.params.id });
    res.status(500).json({ status: 'error', message: 'Failed to fetch branch departments.', code: 'BRANCH_DEPT_ERROR' });
  }
});

module.exports = router;
