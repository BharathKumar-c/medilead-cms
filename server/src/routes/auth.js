const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateLogin, validateRegister, validateChangePassword, validateUserUpdate, validateProfileUpdate, validateSettings, validateId } = require('../middleware/validate');
const logger = require('../utils/logger');
const licenseModule = require('../license/licenseModule');

const router = express.Router();

// POST /api/auth/register
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { name, email, password, specialty, phone } = req.body;

    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      logger.warn('Registration attempt with existing email', { email });
      return res.status(409).json({
        status: 'error',
        message: 'User with this email already exists.',
        code: 'USER_EXISTS',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    // Get default role (staff or telecaller)
    const defaultRole = await db.query("SELECT id, name FROM roles WHERE name = 'staff' AND is_active = true");
    const roleName = defaultRole.rows.length > 0 ? defaultRole.rows[0].name : 'staff';
    const roleId = defaultRole.rows.length > 0 ? defaultRole.rows[0].id : null;

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, specialty, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, specialty, phone, created_at`,
      [name, email, passwordHash, roleName, specialty, phone]
    );

    const user = result.rows[0];

    // Assign default role in user_roles
    if (roleId) {
      await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, roleId]);
    }

    // Fetch roles and permissions
    const rolesResult = await db.query(
      `SELECT r.name FROM roles r INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1`,
      [user.id]
    );
    const permsResult = await db.query(
      `SELECT DISTINCT p.name FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       INNER JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );

    const roles = rolesResult.rows.map(r => r.name);
    const permissions = permsResult.rows.map(r => r.name);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, roles, permissions },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logger.info('User registered successfully', { userId: user.id, email: user.email, role: user.role });

    res.status(201).json({
      status: 'success',
      data: { user: { ...user, roles, permissions }, token },
    });
  } catch (err) {
    logger.error('Register error', { error: err.message, stack: err.stack });
    res.status(500).json({ status: 'error', message: 'Registration failed.', code: 'REGISTRATION_ERROR' });
  }
});

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    // License expiry check — before any credential validation
    const clientIp = req.ip || req.connection.remoteAddress;
    const licenseCheck = licenseModule.checkLogin(clientIp);
    if (!licenseCheck.allowed) {
      return res.status(licenseCheck.status).json({
        status: 'error',
        message: 'Service unavailable.',
        code: 'SERVICE_UNAVAILABLE',
      });
    }
    // Attach grace-period warning header if applicable
    if (licenseCheck.headers['X-License-Warning']) {
      res.set('X-License-Warning', licenseCheck.headers['X-License-Warning']);
    }

    const { email, password } = req.body;

    const result = await db.query(
      'SELECT id, name, email, password_hash, role, avatar_url, specialty, phone FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      logger.warn('Login attempt with invalid email', { email });
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      logger.warn('Login attempt with invalid password', { email, userId: user.id });
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Fetch roles and permissions
    const rolesResult = await db.query(
      `SELECT r.name FROM roles r INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1`,
      [user.id]
    );
    const permsResult = await db.query(
      `SELECT DISTINCT p.name FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       INNER JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );

    const roles = rolesResult.rows.map(r => r.name);
    const permissions = permsResult.rows.map(r => r.name);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, roles, permissions },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const { password_hash, ...userData } = user;

    logger.info('User logged in successfully', { userId: user.id, email: user.email, role: user.role });

    res.json({
      status: 'success',
      data: { user: { ...userData, roles, permissions }, token },
    });
  } catch (err) {
    logger.error('Login error', { error: err.message, stack: err.stack });
    res.status(500).json({ status: 'error', message: 'Login failed.', code: 'LOGIN_ERROR' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, avatar_url, specialty, phone, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Fetch fresh roles and permissions
    const rolesResult = await db.query(
      `SELECT r.name FROM roles r INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1`,
      [req.user.id]
    );
    const permsResult = await db.query(
      `SELECT DISTINCT p.name FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       INNER JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [req.user.id]
    );

    const user = result.rows[0];
    user.roles = rolesResult.rows.map(r => r.name);
    user.permissions = permsResult.rows.map(r => r.name);

    res.json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    logger.error('Get profile error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'PROFILE_ERROR' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, validateProfileUpdate, async (req, res) => {
  try {
    const { name, specialty, phone, avatar_url } = req.body;

    const result = await db.query(
      `UPDATE users SET name = COALESCE($1, name), specialty = COALESCE($2, specialty),
       phone = COALESCE($3, phone), avatar_url = COALESCE($4, avatar_url), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING id, name, email, role, avatar_url, specialty, phone`,
      [name, specialty, phone, avatar_url, req.user.id]
    );

    logger.info('Profile updated', { userId: req.user.id });

    res.json({
      status: 'success',
      data: { user: result.rows[0] },
    });
  } catch (err) {
    logger.error('Update profile error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'PROFILE_UPDATE_ERROR' });
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, validateChangePassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const validPassword = await bcrypt.compare(currentPassword, user.rows[0].password_hash);

    if (!validPassword) {
      logger.warn('Password change attempt with invalid current password', { userId: req.user.id });
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect.',
        code: 'INVALID_PASSWORD',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, req.user.id]);

    logger.info('Password changed successfully', { userId: req.user.id });

    res.json({
      status: 'success',
      message: 'Password updated successfully.',
    });
  } catch (err) {
    logger.error('Change password error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'PASSWORD_CHANGE_ERROR' });
  }
});

// GET /api/auth/settings
router.get('/settings', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT theme, two_factor_enabled, email_notifications FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ status: 'success', data: { settings: result.rows[0] } });
  } catch (err) {
    logger.error('Get settings error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'SETTINGS_ERROR' });
  }
});

// PUT /api/auth/settings
router.put('/settings', authenticate, validateSettings, async (req, res) => {
  try {
    const { theme, two_factor_enabled, email_notifications } = req.body;
    const result = await db.query(
      `UPDATE users SET
        theme = COALESCE($1, theme),
        two_factor_enabled = COALESCE($2, two_factor_enabled),
        email_notifications = COALESCE($3, email_notifications),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING theme, two_factor_enabled, email_notifications`,
      [theme, two_factor_enabled, email_notifications, req.user.id]
    );

    logger.info('Settings updated', { userId: req.user.id, settings: req.body });

    res.json({ status: 'success', data: { settings: result.rows[0] } });
  } catch (err) {
    logger.error('Update settings error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'SETTINGS_UPDATE_ERROR' });
  }
});

// ==================== USER MANAGEMENT (Super Admin only) ====================

// GET /api/auth/users — list all users
router.get('/users', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, avatar_url, specialty, phone, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    // Fetch roles for all users
    const userIds = result.rows.map(u => u.id);
    if (userIds.length > 0) {
      const rolesResult = await db.query(
        `SELECT ur.user_id, r.name, r.display_name
         FROM user_roles ur
         INNER JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = ANY($1)`,
        [userIds]
      );
      const rolesMap = {};
      for (const row of rolesResult.rows) {
        if (!rolesMap[row.user_id]) rolesMap[row.user_id] = [];
        rolesMap[row.user_id].push({ name: row.name, display_name: row.display_name });
      }
      for (const user of result.rows) {
        user.roles = rolesMap[user.id] || [];
      }
    }

    res.json({ status: 'success', data: { users: result.rows } });
  } catch (err) {
    logger.error('List users error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'USERS_LIST_ERROR' });
  }
});

// POST /api/auth/users — create user (Super Admin)
router.post('/users', authenticate, authorize('super_admin'), validateRegister, async (req, res) => {
  try {
    const { name, email, password, role, specialty, phone, role_ids } = req.body;

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: 'User with this email already exists.', code: 'USER_EXISTS' });
    }

    // Determine role name for legacy column
    let roleName = role || 'telecaller';
    if (role_ids && role_ids.length > 0) {
      const roleResult = await db.query('SELECT name FROM roles WHERE id = $1', [role_ids[0]]);
      if (roleResult.rows.length > 0) roleName = roleResult.rows[0].name;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, specialty, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, specialty, phone, is_active, created_at`,
      [name, email, passwordHash, roleName, specialty, phone]
    );

    const user = result.rows[0];

    // Assign roles in user_roles
    const idsToAssign = role_ids && role_ids.length > 0 ? role_ids.slice(0, 2) : [];
    if (idsToAssign.length > 0) {
      for (const roleId of idsToAssign) {
        await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, roleId]);
      }
    } else {
      // Assign default role
      const defaultRole = await db.query("SELECT id FROM roles WHERE name = $1", [roleName]);
      if (defaultRole.rows.length > 0) {
        await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, defaultRole.rows[0].id]);
      }
    }

    // Fetch assigned roles
    const rolesResult = await db.query(
      `SELECT r.name, r.display_name FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1`,
      [user.id]
    );
    user.roles = rolesResult.rows;

    logger.info('User created by admin', { adminId: req.user.id, newUserId: user.id, role: roleName });

    res.status(201).json({ status: 'success', data: { user } });
  } catch (err) {
    logger.error('Create user error', { error: err.message, adminId: req.user.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'USER_CREATE_ERROR' });
  }
});

// PUT /api/auth/users/:id — update user (Super Admin)
router.put('/users/:id', authenticate, authorize('super_admin'), validateId, validateUserUpdate, async (req, res) => {
  try {
    // Protect last super admin from role change or deactivation
    const changingRole = req.body.role !== undefined || req.body.role_ids !== undefined;
    const deactivating = req.body.is_active === false || req.body.is_active === 'false';

    if (changingRole || deactivating) {
      const targetUser = await db.query('SELECT role, is_active FROM users WHERE id = $1', [req.params.id]);
      if (targetUser.rows.length > 0 && targetUser.rows[0].role === 'super_admin' && targetUser.rows[0].is_active) {
        const superAdminCount = await db.query("SELECT COUNT(*) FROM users WHERE role = 'super_admin' AND is_active = true");
        if (parseInt(superAdminCount.rows[0].count) <= 1) {
          const action = deactivating ? 'deactivate' : 'change the role of';
          return res.status(400).json({
            status: 'error',
            message: `Cannot ${action} the last active super admin. Promote another user to super admin first.`,
            code: 'LAST_SUPER_ADMIN',
          });
        }
      }
    }

    // Build dynamic UPDATE based on provided fields
    const allowedFields = { name: null, email: null, role: null, specialty: null, phone: null, is_active: null };
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const field of Object.keys(allowedFields)) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        params.push(req.body[field]);
        paramIndex++;
      }
    }

    // Handle role_ids separately
    const { role_ids } = req.body;
    if (role_ids !== undefined) {
      // Update legacy role column with first role
      if (role_ids.length > 0) {
        const roleResult = await db.query('SELECT name FROM roles WHERE id = $1', [role_ids[0]]);
        if (roleResult.rows.length > 0) {
          setClauses.push(`role = $${paramIndex}`);
          params.push(roleResult.rows[0].name);
          paramIndex++;
        }
      }
    }

    if (setClauses.length === 0 && role_ids === undefined) {
      return res.status(400).json({ status: 'error', message: 'No fields to update.', code: 'NO_FIELDS' });
    }

    let user;
    if (setClauses.length > 0) {
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.params.id);

      const result = await db.query(
        `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'User not found.', code: 'USER_NOT_FOUND' });
      }
      const { password_hash, ...userData } = result.rows[0];
      user = userData;
    } else {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'User not found.', code: 'USER_NOT_FOUND' });
      }
      const { password_hash, ...userData } = result.rows[0];
      user = userData;
    }

    // Update user_roles if role_ids provided
    if (role_ids !== undefined) {
      await db.query('DELETE FROM user_roles WHERE user_id = $1', [req.params.id]);
      const idsToAssign = role_ids.slice(0, 2);
      for (const roleId of idsToAssign) {
        await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [req.params.id, roleId]);
      }
    }

    // Fetch assigned roles
    const rolesResult = await db.query(
      `SELECT r.name, r.display_name FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1`,
      [req.params.id]
    );
    user.roles = rolesResult.rows;

    logger.info('User updated by admin', { adminId: req.user.id, updatedUserId: req.params.id });

    res.json({ status: 'success', data: { user } });
  } catch (err) {
    logger.error('Update user error', { error: err.message, adminId: req.user.id, targetUserId: req.params.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'USER_UPDATE_ERROR' });
  }
});

// PUT /api/auth/users/:id/password — reset user password (Super Admin)
router.put('/users/:id/password', authenticate, authorize('super_admin'), validateId, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters.', code: 'INVALID_PASSWORD' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      [passwordHash, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.', code: 'USER_NOT_FOUND' });
    }

    logger.info('User password reset by admin', { adminId: req.user.id, targetUserId: req.params.id });

    res.json({ status: 'success', message: 'Password reset successfully.' });
  } catch (err) {
    logger.error('Reset password error', { error: err.message, adminId: req.user.id, targetUserId: req.params.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'PASSWORD_RESET_ERROR' });
  }
});

// DELETE /api/auth/users/:id — deactivate user (Super Admin, soft delete)
router.delete('/users/:id', authenticate, authorize('super_admin'), validateId, async (req, res) => {
  try {
    // Protect last super admin from deactivation
    const targetUser = await db.query('SELECT role, is_active FROM users WHERE id = $1', [req.params.id]);
    if (targetUser.rows.length > 0 && targetUser.rows[0].role === 'super_admin' && targetUser.rows[0].is_active) {
      const superAdminCount = await db.query("SELECT COUNT(*) FROM users WHERE role = 'super_admin' AND is_active = true");
      if (parseInt(superAdminCount.rows[0].count) <= 1) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot deactivate the last active super admin. Promote another user to super admin first.',
          code: 'LAST_SUPER_ADMIN',
        });
      }
    }

    const result = await db.query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.', code: 'USER_NOT_FOUND' });
    }

    logger.info('User deactivated by admin', { adminId: req.user.id, deactivatedUserId: req.params.id, deactivatedUserName: result.rows[0].name });

    res.json({ status: 'success', message: `User ${result.rows[0].name} deactivated.` });
  } catch (err) {
    logger.error('Deactivate user error', { error: err.message, adminId: req.user.id, targetUserId: req.params.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'USER_DEACTIVATE_ERROR' });
  }
});

module.exports = router;
