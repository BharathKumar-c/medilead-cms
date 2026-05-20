const db = require('../config/database');

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
 * Notify all users with a specific permission
 */
async function notifyByPermission(io, permission, { type, title, link }) {
  const users = await db.query(`
    SELECT DISTINCT u.id FROM users u
    INNER JOIN user_roles ur ON u.id = ur.user_id
    INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
    INNER JOIN permissions p ON rp.permission_id = p.id
    WHERE p.name = $1 AND u.is_active = true
  `, [permission]);
  for (const user of users.rows) {
    await notify(io, { user_id: user.id, type, title, link });
  }
}

/**
 * Notify all super_admins and managers (legacy helper, now uses permissions)
 */
async function notifyManagers(io, { type, title, link }) {
  await notifyByPermission(io, 'calls:receive_sip_events', { type, title, link });
}

module.exports = { notify, notifyByPermission, notifyManagers };
