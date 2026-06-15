const db = require('./database');
require('dotenv').config();

/**
 * Migration: Create follow_ups table for scheduled follow-up reminders.
 * Run: node server/src/config/migrate-follow-ups.js
 */
const migrate = async () => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Create follow_ups table
    await client.query(`
      CREATE TABLE IF NOT EXISTS follow_ups (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        assigned_to INTEGER NOT NULL REFERENCES users(id),
        scheduled_at TIMESTAMP NOT NULL,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'missed')),
        created_by INTEGER REFERENCES users(id),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for efficient queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON follow_ups(lead_id);
      CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON follow_ups(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_at ON follow_ups(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
    `);

    // Add a column to notifications for follow_up_id reference (optional)
    // We don't need this since the `link` field already handles navigation

    await client.query('COMMIT');
    console.log('Follow-ups migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Follow-ups migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrate;
