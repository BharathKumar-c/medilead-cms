const db = require('../config/database');
const { notify } = require('../utils/notify');

/**
 * Check for due follow-ups and send targeted notifications.
 * Runs every 5 minutes via setInterval.
 */
function startFollowUpReminderCron(io) {
  const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  const check = async () => {
    try {
      // Find follow-ups that are due (scheduled_at <= now) and still pending
      // and haven't been notified in the last hour
      const dueFollowUps = await db.query(`
        SELECT f.id, f.lead_id, f.assigned_to, f.scheduled_at, f.notes,
               l.name as lead_name, l.code as lead_code, l.phone as lead_phone
        FROM follow_ups f
        INNER JOIN leads l ON f.lead_id = l.id
        WHERE f.status = 'pending'
          AND f.scheduled_at <= NOW()
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = f.assigned_to
              AND n.title LIKE '%Follow-up reminder:%' || l.name || '%'
              AND n.created_at > NOW() - INTERVAL '1 hour'
          )
        LIMIT 20
      `);

      for (const fu of dueFollowUps.rows) {
        if (fu.assigned_to) {
          const scheduledTime = new Date(fu.scheduled_at).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });

          await notify(io, {
            user_id: fu.assigned_to,
            type: 'warning',
            title: `Follow-up reminder: ${fu.lead_name} (${fu.lead_code}) — scheduled for ${scheduledTime}`,
            link: `/lead-box?viewLead=${fu.lead_id}`,
          });

          // Mark the follow-up as missed if it's past due by more than 2 hours
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
          if (new Date(fu.scheduled_at) < twoHoursAgo) {
            await db.query(
              `UPDATE follow_ups SET status = 'missed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
              [fu.id]
            );
          }
        }
      }

      if (dueFollowUps.rows.length > 0) {
        console.log(`Follow-up reminders sent: ${dueFollowUps.rows.length} due follow-ups`);
      }
    } catch (err) {
      // If the follow_ups table doesn't exist yet (migration not run), silently skip
      if (err.code === '42P01') {
        return; // relation does not exist — skip until migration runs
      }
      console.error('Follow-up reminder check error:', err.message);
    }
  };

  // Run immediately on start, then every 5 minutes
  check();
  setInterval(check, CHECK_INTERVAL);
  console.log('Follow-up reminder cron started (every 5 minutes)');
}

module.exports = { startFollowUpReminderCron };
