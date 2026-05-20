const db = require('../config/database');
const { notify, notifyManagers } = require('../utils/notify');

/**
 * Check for overdue follow-ups and send reminders
 * Run every hour via setInterval
 */
function startFollowUpReminders(io) {
  const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

  const check = async () => {
    try {
      // Find leads with status 'Follow-up' that haven't been contacted in 3+ days
      const overdue = await db.query(`
        SELECT l.id, l.name, l.phone, l.assigned_to, l.last_call_date
        FROM leads l
        WHERE l.status = 'Follow-up'
          AND l.last_call_date < NOW() - INTERVAL '3 days'
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = l.assigned_to
              AND n.title LIKE '%' || l.name || '%'
              AND n.created_at > NOW() - INTERVAL '1 day'
          )
        LIMIT 20
      `);

      for (const lead of overdue.rows) {
        if (lead.assigned_to) {
          try {
            await notify(io, {
              user_id: lead.assigned_to,
              type: 'warning',
              title: `Follow-up overdue: ${lead.name} — last contacted ${Math.floor((Date.now() - new Date(lead.last_call_date)) / 86400000)} days ago`,
              link: '/lead-box',
            });
          } catch (err) {
            console.error('Failed to send overdue notification:', err.message);
          }
        }
      }

      // Find leads with status 'New' created 2+ days ago (not yet contacted)
      const staleNew = await db.query(`
        SELECT l.id, l.name, l.assigned_to, l.created_at
        FROM leads l
        WHERE l.status = 'New'
          AND l.created_at < NOW() - INTERVAL '2 days'
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = l.assigned_to
              AND n.title LIKE '%' || l.name || '%'
              AND n.created_at > NOW() - INTERVAL '1 day'
          )
        LIMIT 20
      `);

      for (const lead of staleNew.rows) {
        if (lead.assigned_to) {
          try {
            await notify(io, {
              user_id: lead.assigned_to,
              type: 'urgent',
              title: `New lead untouched for 2+ days: ${lead.name}`,
              link: '/lead-box',
            });
          } catch (err) {
            console.error('Failed to send stale lead notification:', err.message);
          }
        }
      }

      // Find appointments tomorrow that aren't confirmed
      // Use local date components to avoid UTC timezone issues
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

      const unconfirmed = await db.query(`
        SELECT a.id, a.patient_name, a.provider_id, a.appointment_date, a.appointment_time
        FROM appointments a
        WHERE a.appointment_date = $1
          AND a.status = 'Scheduled'
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = a.provider_id
              AND n.title LIKE '%' || a.patient_name || '%'
              AND n.title LIKE '%appointment%'
              AND n.created_at > NOW() - INTERVAL '1 day'
          )
      `, [tomorrowStr]);

      for (const apt of unconfirmed.rows) {
        if (apt.provider_id) {
          try {
            await notify(io, {
              user_id: apt.provider_id,
              type: 'info',
              title: `Reminder: ${apt.patient_name} has an appointment tomorrow at ${apt.appointment_time}`,
              link: '/appointments',
            });
          } catch (err) {
            console.error('Failed to send appointment reminder:', err.message);
          }
        }
      }

      if (overdue.rows.length > 0 || staleNew.rows.length > 0 || unconfirmed.rows.length > 0) {
        console.log(`Reminders sent: ${overdue.rows.length} overdue follow-ups, ${staleNew.rows.length} stale new leads, ${unconfirmed.rows.length} appointment reminders`);
      }
    } catch (err) {
      console.error('Reminder check error:', err);
    }
  };

  // Run immediately on start, then every hour
  check();
  setInterval(check, CHECK_INTERVAL);
  console.log('Follow-up reminder cron started (every 1 hour)');
}

module.exports = { startFollowUpReminders };
