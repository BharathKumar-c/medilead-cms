const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateLogin, validateRegister, validateChangePassword, validateUserUpdate, validateProfileUpdate, validateSettings, validateId } = require('../middleware/validate');
const { passwordResetLimiter } = require('../middleware/rateLimiter');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { sendEmail, buildResetEmail } = require('../utils/email');
const licenseModule = require('../license/licenseModule');

const router = express.Router();

// POST /api/auth/register
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { first_name, last_name, email, password, specialty, phone, department, designation, intercom_number, employee_id, date_of_birth, allowed_departments } = req.body;

    // Build full name from first/last or use provided name
    const name = req.body.name || `${first_name || ''} ${last_name || ''}`.trim();
    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Name is required.', code: 'VALIDATION_ERROR' });
    }

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

    // Check for duplicate employee_id
    if (employee_id) {
      const empCheck = await db.query('SELECT id FROM users WHERE employee_id = $1', [employee_id]);
      if (empCheck.rows.length > 0) {
        return res.status(409).json({ status: 'error', message: 'Employee ID already exists.', code: 'EMPLOYEE_ID_EXISTS' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    // Get default role (staff or telecaller)
    const defaultRole = await db.query("SELECT id, name FROM roles WHERE name = 'staff' AND is_active = true");
    const roleName = defaultRole.rows.length > 0 ? defaultRole.rows[0].name : 'staff';
    const roleId = defaultRole.rows.length > 0 ? defaultRole.rows[0].id : null;

    const result = await db.query(
      `INSERT INTO users (name, first_name, last_name, employee_id, email, password_hash, role, specialty, department, designation, intercom_number, date_of_birth, allowed_departments, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, name, first_name, last_name, employee_id, email, role, specialty, department, designation, intercom_number, date_of_birth, allowed_departments, phone, created_at`,
      [name, first_name || null, last_name || null, employee_id || null, email, passwordHash, roleName, specialty || null, department || null, designation || null, intercom_number || null, date_of_birth || null, allowed_departments || null, phone || null]
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
      `SELECT id, name, first_name, last_name, employee_id, email, role, avatar_url, specialty,
              department, designation, intercom_number, allowed_departments, date_of_birth, phone, user_agent, created_at
       FROM users WHERE id = $1`,
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

// ==================== USER MANAGEMENT (Super Admin / Manager) ====================

// GET /api/auth/users — list all users
router.get('/users', authenticate, authorize('super_admin', 'manager'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, first_name, last_name, employee_id, email, role, avatar_url, specialty,
              department, designation, intercom_number, allowed_departments, date_of_birth,
              phone, user_agent, is_active, created_at
       FROM users ORDER BY created_at DESC`
    );

    // Fetch roles for all users
    const userIds = result.rows.map(u => u.id);
    if (userIds.length > 0) {
      const rolesResult = await db.query(
        `SELECT ur.user_id, r.id, r.name, r.display_name
         FROM user_roles ur
         INNER JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = ANY($1)`,
        [userIds]
      );
      const rolesMap = {};
      for (const row of rolesResult.rows) {
        if (!rolesMap[row.user_id]) rolesMap[row.user_id] = [];
        rolesMap[row.user_id].push({ id: row.id, name: row.name, display_name: row.display_name });
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

// POST /api/auth/users — create user (Super Admin / Manager)
router.post('/users', authenticate, authorize('super_admin', 'manager'), validateRegister, async (req, res) => {
  try {
    const { first_name, last_name, employee_id, name, email, password, role, specialty, phone, department, designation, intercom_number, date_of_birth, allowed_departments, role_ids, user_agent } = req.body;

    // Build full name from first/last or use provided name
    const fullName = name || `${first_name || ''} ${last_name || ''}`.trim();
    if (!fullName) {
      return res.status(400).json({ status: 'error', message: 'Name is required.', code: 'VALIDATION_ERROR' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: 'User with this email already exists.', code: 'USER_EXISTS' });
    }

    // Check for duplicate employee_id
    if (employee_id) {
      const empCheck = await db.query('SELECT id FROM users WHERE employee_id = $1', [employee_id]);
      if (empCheck.rows.length > 0) {
        return res.status(409).json({ status: 'error', message: 'Employee ID already exists.', code: 'EMPLOYEE_ID_EXISTS' });
      }
    }

    // Check for duplicate intercom_number
    if (intercom_number) {
      const icCheck = await db.query('SELECT id FROM users WHERE intercom_number = $1', [intercom_number]);
      if (icCheck.rows.length > 0) {
        return res.status(409).json({ status: 'error', message: 'Intercom number already assigned to another user.', code: 'INTERCOM_EXISTS' });
      }
    }

    // Determine role name for legacy column
    let roleName = role || 'telecaller';
    if (role_ids && role_ids.length > 0) {
      const roleResult = await db.query('SELECT name FROM roles WHERE id = $1', [role_ids[0]]);
      if (roleResult.rows.length > 0) roleName = roleResult.rows[0].name;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name, first_name, last_name, employee_id, email, password_hash, role, specialty, department, designation, intercom_number, date_of_birth, allowed_departments, phone, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, name, first_name, last_name, employee_id, email, role, specialty, department, designation, intercom_number, date_of_birth, allowed_departments, phone, user_agent, is_active, created_at`,
      [fullName, first_name || null, last_name || null, employee_id || null, email, passwordHash, roleName, specialty || null, department || null, designation || null, intercom_number || null, date_of_birth || null, allowed_departments || null, phone || null, user_agent || null]
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

// PUT /api/auth/users/:id — update user (Super Admin / Manager)
router.put('/users/:id', authenticate, authorize('super_admin', 'manager'), validateId, validateUserUpdate, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);

    // Protect last super admin from role change or deactivation
    const changingRole = req.body.role !== undefined || req.body.role_ids !== undefined;
    const deactivating = req.body.is_active === false || req.body.is_active === 'false';

    if (changingRole || deactivating) {
      // Check via user_roles table (not just legacy role column)
      const targetRoles = await db.query(
        `SELECT r.name FROM roles r
         INNER JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1`,
        [targetId]
      );
      const isTargetSuperAdmin = targetRoles.rows.some(r => r.name === 'super_admin');

      if (isTargetSuperAdmin) {
        const superAdminCount = await db.query(
          `SELECT COUNT(*) FROM (
            SELECT ur.user_id FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id AND r.name = 'super_admin'
            INNER JOIN users u ON ur.user_id = u.id
            WHERE u.is_active = true
          ) AS active_super_admins`
        );
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

    // Check for duplicate employee_id (if changing)
    if (req.body.employee_id) {
      const empCheck = await db.query(
        'SELECT id FROM users WHERE employee_id = $1 AND id != $2',
        [req.body.employee_id, targetId]
      );
      if (empCheck.rows.length > 0) {
        return res.status(409).json({ status: 'error', message: 'Employee ID already assigned to another user.', code: 'EMPLOYEE_ID_EXISTS' });
      }
    }

    // Check for duplicate intercom_number (if changing)
    if (req.body.intercom_number) {
      const icCheck = await db.query(
        'SELECT id FROM users WHERE intercom_number = $1 AND id != $2',
        [req.body.intercom_number, targetId]
      );
      if (icCheck.rows.length > 0) {
        return res.status(409).json({ status: 'error', message: 'Intercom number already assigned to another user.', code: 'INTERCOM_EXISTS' });
      }
    }

    // Check for duplicate email (if changing)
    if (req.body.email) {
      const emailCheck = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [req.body.email, targetId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ status: 'error', message: 'Email already in use by another user.', code: 'EMAIL_EXISTS' });
      }
    }

    // Build dynamic UPDATE based on provided fields
    const allowedFields = {
      name: null, first_name: null, last_name: null, employee_id: null,
      email: null, role: null, specialty: null, department: null,
      designation: null, intercom_number: null, date_of_birth: null,
      allowed_departments: null, phone: null, is_active: null,
      user_agent: null,
    };
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const field of Object.keys(allowedFields)) {
      if (req.body[field] !== undefined) {
        if (field === 'role' && req.body.role_ids !== undefined) continue;
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
      params.push(targetId);

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
      const result = await db.query('SELECT * FROM users WHERE id = $1', [targetId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'User not found.', code: 'USER_NOT_FOUND' });
      }
      const { password_hash, ...userData } = result.rows[0];
      user = userData;
    }

    // Update user_roles if role_ids provided
    if (role_ids !== undefined) {
      await db.query('DELETE FROM user_roles WHERE user_id = $1', [targetId]);
      const idsToAssign = role_ids.slice(0, 2);
      for (const roleId of idsToAssign) {
        await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [targetId, roleId]);
      }
    }

    // Fetch assigned roles
    const rolesResult = await db.query(
      `SELECT r.name, r.display_name FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1`,
      [targetId]
    );
    user.roles = rolesResult.rows;

    logger.info('User updated by admin', { adminId: req.user.id, updatedUserId: targetId });

    res.json({ status: 'success', data: { user } });
  } catch (err) {
    logger.error('Update user error', { error: err.message, adminId: req.user.id, targetUserId: req.params.id });
    res.status(500).json({ status: 'error', message: "An error occurred: " + err.message, code: 'USER_UPDATE_ERROR' });
  }
});

// PUT /api/auth/users/:id/password — reset user password (Super Admin / Manager)
router.put('/users/:id/password', authenticate, authorize('super_admin', 'manager'), validateId, async (req, res) => {
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

// DELETE /api/auth/users/:id — deactivate user (Super Admin / Manager, soft delete)
router.delete('/users/:id', authenticate, authorize('super_admin', 'manager'), validateId, async (req, res) => {
  try {
    // Protect last super admin from deactivation
    const targetRoles = await db.query(
      `SELECT r.name FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [req.params.id]
    );
    const isTargetSuperAdmin = targetRoles.rows.some(r => r.name === 'super_admin');

    if (isTargetSuperAdmin) {
      const superAdminCount = await db.query(
        `SELECT COUNT(*) FROM (
          SELECT ur.user_id FROM user_roles ur
          INNER JOIN roles r ON ur.role_id = r.id AND r.name = 'super_admin'
          INNER JOIN users u ON ur.user_id = u.id
          WHERE u.is_active = true
        ) AS active_super_admins`
      );
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

// ==================== FORGOT / RESET PASSWORD ====================

// POST /api/auth/forgot-password — send reset link via email
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.',
        code: 'INVALID_EMAIL',
      });
    }

    // Check if user with this email exists
    const userResult = await db.query(
      'SELECT id, name, email FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    // Always return success to avoid revealing whether an email exists
    if (userResult.rows.length === 0) {
      logger.info('Password reset requested for non-existent email', { email });
      return res.json({
        status: 'success',
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const user = userResult.rows[0];

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Store token in database
    await db.query(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
      [email, token, expiresAt]
    );

    // Build reset link
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    // Send email
    const mail = buildResetEmail({ to: email, link: resetUrl, expiresInMinutes: 60 });
    await sendEmail(mail);

    logger.info('Password reset link sent', { userId: user.id, email });

    res.json({
      status: 'success',
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    logger.error('Forgot password error', { error: err.message, stack: err.stack });
    res.status(500).json({ status: 'error', message: 'Failed to process request.', code: 'FORGOT_PASSWORD_ERROR' });
  }
});

// POST /api/auth/reset-password — reset password using token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Reset token is required.',
        code: 'INVALID_TOKEN',
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters.',
        code: 'INVALID_PASSWORD',
      });
    }

    // Find valid token
    const tokenResult = await db.query(
      `SELECT * FROM password_reset_tokens
       WHERE token = $1 AND used = false AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token. Please request a new password reset.',
        code: 'INVALID_OR_EXPIRED_TOKEN',
      });
    }

    const resetRecord = tokenResult.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    const updateResult = await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 AND is_active = true RETURNING id',
      [passwordHash, resetRecord.email]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User account not found or inactive.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Mark token as used
    await db.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [resetRecord.id]);

    logger.info('Password reset successful', { userId: updateResult.rows[0].id, email: resetRecord.email });

    res.json({
      status: 'success',
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (err) {
    logger.error('Reset password error', { error: err.message, stack: err.stack });
    res.status(500).json({ status: 'error', message: 'Failed to reset password.', code: 'RESET_PASSWORD_ERROR' });
  }
});

module.exports = router;
