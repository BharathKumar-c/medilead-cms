const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/settings/maintenance — public, no auth required
// Returns the current maintenance mode status
router.get('/maintenance', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT value FROM system_settings WHERE key = 'maintenance_mode'`
    );
    const enabled = result.rows.length > 0 && result.rows[0].value === 'true';

    let message = '';
    if (enabled) {
      const msgResult = await db.query(
        `SELECT value FROM system_settings WHERE key = 'maintenance_message'`
      );
      message = msgResult.rows.length > 0
        ? msgResult.rows[0].value
        : 'The application is currently undergoing maintenance. Please check back shortly.';
    }

    res.json({ enabled, message });
  } catch (err) {
    logger.error('Error fetching maintenance mode', { error: err.message });
    // If the table doesn't exist yet, treat as maintenance disabled
    if (err.code === '42P01') {
      return res.json({ enabled: false, message: '' });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch maintenance status',
    });
  }
});

// PUT /api/settings/maintenance — super admin only
// Toggle maintenance mode on/off
router.put('/maintenance', authenticate, authorize('settings:manage'), async (req, res) => {
  try {
    const { enabled, message } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'enabled must be a boolean (true/false)',
      });
    }

    // Upsert maintenance_mode setting
    await db.query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ('maintenance_mode', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [enabled ? 'true' : 'false']
    );

    // If a custom message was provided, store it
    if (message && typeof message === 'string' && message.trim()) {
      await db.query(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES ('maintenance_message', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [message.trim()]
      );
    }

    logger.info(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} by user ${req.user.id}`);

    res.json({
      success: true,
      enabled,
      message: enabled
        ? (message?.trim() || 'The application is currently undergoing maintenance. Please check back shortly.')
        : '',
    });
  } catch (err) {
    logger.error('Error toggling maintenance mode', { error: err.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update maintenance status',
    });
  }
});

module.exports = router;
