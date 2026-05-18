const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateLogin, validateRegister, validateChangePassword, validateUserUpdate, validateProfileUpdate, validateSettings, validateId } = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/auth/register
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { name, email, password, role, specialty, phone } = req.body;

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

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, specialty, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, specialty, phone, created_at`,
      [name, email, passwordHash, role || 'staff', specialty, phone]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logger.info('User registered successfully', { userId: user.id, email: user.email, role: user.role });

    res.status(201).json({
      status: 'success',
      data: { user, token },
    });
  } catch (err) {
    logger.error('Register error', { error: err.message, stack: err.stack });
    res.status(500).json({ status: 'error', message: 'Registration failed.', code: 'REGISTRATION_ERROR' });
  }
});

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
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

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const { password_hash, ...userData } = user;

    logger.info('User logged in successfully', { userId: user.id, email: user.email, role: user.role });

    res.json({
      status: 'success',
      data: { user: userData, token },
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

    res.json({
      status: 'success',
      data: { user: result.rows[0] },
    });
  } catch (err) {
    logger.error('Get profile error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to fetch profile.', code: 'PROFILE_ERROR' });
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
    res.status(500).json({ status: 'error', message: 'Failed to update profile.', code: 'PROFILE_UPDATE_ERROR' });
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
    res.status(500).json({ status: 'error', message: 'Failed to change password.', code: 'PASSWORD_CHANGE_ERROR' });
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
    res.status(500).json({ status: 'error', message: 'Failed to fetch settings.', code: 'SETTINGS_ERROR' });
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
    res.status(500).json({ status: 'error', message: 'Failed to update settings.', code: 'SETTINGS_UPDATE_ERROR' });
  }
});

// ==================== USER MANAGEMENT (Super Admin only) ====================

// GET /api/auth/users — list all users
router.get('/users', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, avatar_url, specialty, phone, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ status: 'success', data: { users: result.rows } });
  } catch (err) {
    logger.error('List users error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to fetch users.', code: 'USERS_LIST_ERROR' });
  }
});

// POST /api/auth/users — create user (Super Admin)
router.post('/users', authenticate, authorize('super_admin'), validateRegister, async (req, res) => {
  try {
    const { name, email, password, role, specialty, phone } = req.body;

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: 'User with this email already exists.', code: 'USER_EXISTS' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, specialty, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, specialty, phone, is_active, created_at`,
      [name, email, passwordHash, role || 'telecaller', specialty, phone]
    );

    logger.info('User created by admin', { adminId: req.user.id, newUserId: result.rows[0].id, role });

    res.status(201).json({ status: 'success', data: { user: result.rows[0] } });
  } catch (err) {
    logger.error('Create user error', { error: err.message, adminId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to create user.', code: 'USER_CREATE_ERROR' });
  }
});

// PUT /api/auth/users/:id — update user (Super Admin)
router.put('/users/:id', authenticate, authorize('super_admin'), validateId, validateUserUpdate, async (req, res) => {
  try {
    const { name, email, role, specialty, phone, is_active } = req.body;

    const result = await db.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        specialty = COALESCE($4, specialty),
        phone = COALESCE($5, phone),
        is_active = COALESCE($6, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, name, email, role, specialty, phone, is_active, created_at`,
      [name, email, role, specialty, phone, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.', code: 'USER_NOT_FOUND' });
    }

    logger.info('User updated by admin', { adminId: req.user.id, updatedUserId: req.params.id });

    res.json({ status: 'success', data: { user: result.rows[0] } });
  } catch (err) {
    logger.error('Update user error', { error: err.message, adminId: req.user.id, targetUserId: req.params.id });
    res.status(500).json({ status: 'error', message: 'Failed to update user.', code: 'USER_UPDATE_ERROR' });
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
    res.status(500).json({ status: 'error', message: 'Failed to reset password.', code: 'PASSWORD_RESET_ERROR' });
  }
});

// DELETE /api/auth/users/:id — deactivate user (Super Admin, soft delete)
router.delete('/users/:id', authenticate, authorize('super_admin'), validateId, async (req, res) => {
  try {
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
    res.status(500).json({ status: 'error', message: 'Failed to deactivate user.', code: 'USER_DEACTIVATE_ERROR' });
  }
});

module.exports = router;
