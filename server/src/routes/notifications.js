const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validateNotification, validateId } = require('../middleware/validate');
const { notificationLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticate);

// GET /api/notifications — list user's notifications
router.get('/', async (req, res) => {
  try {
    const { unread_only, limit = 50 } = req.query;

    let where = 'WHERE user_id = $1';
    if (unread_only === 'true') {
      where += ' AND is_read = false';
    }

    const result = await db.query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $2`,
      [req.user.id, parseInt(limit)]
    );

    const unreadCount = await db.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );

    res.json({
      status: 'success',
      data: {
        notifications: result.rows,
        unreadCount: parseInt(unreadCount.rows[0].count),
      },
    });
  } catch (err) {
    logger.error('Get notifications error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to fetch notifications.', code: 'NOTIFICATIONS_FETCH_ERROR' });
  }
});

// POST /api/notifications — create notification
router.post('/', notificationLimiter, validateNotification, async (req, res) => {
  try {
    const { type, title, link, user_id } = req.body;

    const targetUserId = user_id || req.user.id;

    const result = await db.query(
      `INSERT INTO notifications (user_id, type, title, link) VALUES ($1, $2, $3, $4) RETURNING *`,
      [targetUserId, type || 'info', title, link]
    );

    const notification = result.rows[0];

    // Emit via Socket.IO for real-time delivery
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${targetUserId}`).emit('notification', notification);
    }

    logger.info('Notification created', {
      notificationId: notification.id,
      targetUserId,
      type,
      title,
      createdBy: req.user.id,
    });

    res.status(201).json({ status: 'success', data: { notification } });
  } catch (err) {
    logger.error('Create notification error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to create notification.', code: 'NOTIFICATION_CREATE_ERROR' });
  }
});

// PUT /api/notifications/:id/read — mark single as read
router.put('/:id/read', validateId, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Notification not found.', code: 'NOTIFICATION_NOT_FOUND' });
    }

    res.json({ status: 'success', message: 'Notification marked as read.' });
  } catch (err) {
    logger.error('Mark notification read error', { error: err.message, notificationId: req.params.id });
    res.status(500).json({ status: 'error', message: 'Failed to mark notification as read.', code: 'NOTIFICATION_READ_ERROR' });
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );

    logger.info('All notifications marked as read', { userId: req.user.id });

    res.json({ status: 'success', message: 'All notifications marked as read.' });
  } catch (err) {
    logger.error('Mark all notifications read error', { error: err.message, userId: req.user.id });
    res.status(500).json({ status: 'error', message: 'Failed to mark all notifications as read.', code: 'NOTIFICATIONS_READ_ALL_ERROR' });
  }
});

// DELETE /api/notifications/:id — delete notification
router.delete('/:id', validateId, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Notification not found.', code: 'NOTIFICATION_NOT_FOUND' });
    }

    logger.info('Notification deleted', { notificationId: req.params.id, userId: req.user.id });

    res.json({ status: 'success', message: 'Notification deleted.' });
  } catch (err) {
    logger.error('Delete notification error', { error: err.message, notificationId: req.params.id });
    res.status(500).json({ status: 'error', message: 'Failed to delete notification.', code: 'NOTIFICATION_DELETE_ERROR' });
  }
});

module.exports = router;
