const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Create a notification and emit it via Socket.IO
 * @param {object} io - Socket.IO instance
 * @param {object} options
 * @param {number} options.user_id - Target user
 * @param {string} options.type - 'urgent' | 'warning' | 'success' | 'info'
 * @param {string} options.title - Notification text
 * @param {string} [options.link] - Optional navigation link
 */
async function notify(io, { user_id, type = 'info', title, link = null }) {
  const result = await db.query(
    `INSERT INTO notifications (user_id, type, title, link) VALUES ($1, $2, $3, $4) RETURNING *`,
    [user_id, type, title, link]
  );
  const notification = result.rows[0];

  if (io) {
    io.to(`user_${user_id}`).emit('notification', notification);
  }

  return notification;
}

/**
 * Notify all users with a specific role
 */
async function notifyRole(io, role, { type, title, link }) {
  const users = await db.query('SELECT id FROM users WHERE role = $1 AND is_active = true', [role]);
  for (const user of users.rows) {
    await notify(io, { user_id: user.id, type, title, link });
  }
}

/**
 * Notify all super_admins and managers
 */
async function notifyManagers(io, { type, title, link }) {
  const users = await db.query("SELECT id FROM users WHERE role IN ('super_admin', 'manager') AND is_active = true");
  for (const user of users.rows) {
    await notify(io, { user_id: user.id, type, title, link });
  }
}

module.exports = { notify, notifyRole, notifyManagers };
