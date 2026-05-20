const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/roles/permissions/all — list all available permissions grouped by module
// IMPORTANT: This route MUST be defined before /:id to avoid Express treating "permissions" as an id
router.get('/permissions/all', authenticate, authorize('roles:view'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM permissions ORDER BY module, name');

    // Group by module
    const grouped = {};
    for (const perm of result.rows) {
      if (!grouped[perm.module]) grouped[perm.module] = [];
      grouped[perm.module].push(perm);
    }

    res.json({ status: 'success', data: { permissions: result.rows, grouped } });
  } catch (err) {
    logger.error('List permissions error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to list permissions.' });
  }
});

// GET /api/roles — list all roles with permission counts
router.get('/', authenticate, authorize('roles:view'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.*,
        COALESCE(pc.permission_count, 0)::int AS permission_count,
        COALESCE(uc.user_count, 0)::int AS user_count
      FROM roles r
      LEFT JOIN (SELECT role_id, COUNT(*) AS permission_count FROM role_permissions GROUP BY role_id) pc ON pc.role_id = r.id
      LEFT JOIN (SELECT role_id, COUNT(*) AS user_count FROM user_roles GROUP BY role_id) uc ON uc.role_id = r.id
      WHERE r.is_active = true
      ORDER BY r.is_system DESC, r.name ASC
    `);
    res.json({ status: 'success', data: { roles: result.rows } });
  } catch (err) {
    logger.error('List roles error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to list roles.' });
  }
});

// GET /api/roles/:id — get role with its permissions
router.get('/:id', authenticate, authorize('roles:view'), async (req, res) => {
  try {
    const roleResult = await db.query('SELECT * FROM roles WHERE id = $1', [req.params.id]);
    if (roleResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Role not found.' });
    }

    const permsResult = await db.query(`
      SELECT p.* FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.module, p.name
    `, [req.params.id]);

    const role = roleResult.rows[0];
    role.permissions = permsResult.rows;

    res.json({ status: 'success', data: { role } });
  } catch (err) {
    logger.error('Get role error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to get role.' });
  }
});

// POST /api/roles — create custom role
router.post('/', authenticate, authorize('roles:create'), async (req, res) => {
  try {
    const { name, display_name, description } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({ status: 'error', message: 'Name and display name are required.' });
    }

    // Validate name format (snake_case)
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return res.status(400).json({ status: 'error', message: 'Name must be snake_case (lowercase letters, numbers, underscores).' });
    }

    // Check for duplicate name
    const existing = await db.query('SELECT id FROM roles WHERE name = $1', [name]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: 'A role with this name already exists.' });
    }

    const result = await db.query(
      `INSERT INTO roles (name, display_name, description, is_system)
       VALUES ($1, $2, $3, false)
       RETURNING *`,
      [name, display_name, description || null]
    );

    logger.info('Role created', { roleId: result.rows[0].id, name, createdBy: req.user.id });
    res.status(201).json({ status: 'success', data: { role: result.rows[0] } });
  } catch (err) {
    logger.error('Create role error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to create role.' });
  }
});

// PUT /api/roles/:id — update role name/description
router.put('/:id', authenticate, authorize('roles:update'), async (req, res) => {
  try {
    const { display_name, description } = req.body;

    const roleCheck = await db.query('SELECT * FROM roles WHERE id = $1', [req.params.id]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Role not found.' });
    }

    const result = await db.query(
      `UPDATE roles SET
        display_name = COALESCE($1, display_name),
        description = COALESCE($2, description),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [display_name, description, req.params.id]
    );

    logger.info('Role updated', { roleId: req.params.id, updatedBy: req.user.id });
    res.json({ status: 'success', data: { role: result.rows[0] } });
  } catch (err) {
    logger.error('Update role error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to update role.' });
  }
});

// DELETE /api/roles/:id — delete custom role (not system roles)
router.delete('/:id', authenticate, authorize('roles:delete'), async (req, res) => {
  try {
    const roleCheck = await db.query('SELECT * FROM roles WHERE id = $1', [req.params.id]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Role not found.' });
    }

    if (roleCheck.rows[0].is_system) {
      return res.status(400).json({ status: 'error', message: 'Cannot delete system roles.' });
    }

    // Check if role has assigned users
    const userCount = await db.query('SELECT COUNT(*) FROM user_roles WHERE role_id = $1', [req.params.id]);
    if (parseInt(userCount.rows[0].count) > 0) {
      return res.status(400).json({ status: 'error', message: 'Cannot delete role with assigned users. Reassign users first.' });
    }

    await db.query('DELETE FROM roles WHERE id = $1', [req.params.id]);

    logger.info('Role deleted', { roleId: req.params.id, deletedBy: req.user.id });
    res.json({ status: 'success', message: 'Role deleted.' });
  } catch (err) {
    logger.error('Delete role error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to delete role.' });
  }
});

// GET /api/roles/:id/permissions — get permissions for a role
router.get('/:id/permissions', authenticate, authorize('roles:view'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.* FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.module, p.name
    `, [req.params.id]);

    res.json({ status: 'success', data: { permissions: result.rows } });
  } catch (err) {
    logger.error('Get role permissions error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to get role permissions.' });
  }
});

// PUT /api/roles/:id/permissions — set permissions for a role (replace all)
router.put('/:id/permissions', authenticate, authorize('roles:update'), async (req, res) => {
  try {
    const { permission_ids } = req.body;

    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({ status: 'error', message: 'permission_ids must be an array.' });
    }

    const roleCheck = await db.query('SELECT * FROM roles WHERE id = $1', [req.params.id]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Role not found.' });
    }

    // Protect system roles from permission changes
    if (roleCheck.rows[0].is_system) {
      return res.status(400).json({ status: 'error', message: 'Cannot modify permissions of system roles.' });
    }

    // Replace all permissions in a transaction
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [req.params.id]);

      if (permission_ids.length > 0) {
        const values = permission_ids.map((pid, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
          [req.params.id, ...permission_ids]
        );
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // Return updated permissions
    const result = await db.query(`
      SELECT p.* FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.module, p.name
    `, [req.params.id]);

    logger.info('Role permissions updated', { roleId: req.params.id, count: permission_ids.length, updatedBy: req.user.id });
    res.json({ status: 'success', data: { permissions: result.rows } });
  } catch (err) {
    logger.error('Set role permissions error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Failed to set role permissions.' });
  }
});

module.exports = router;
