/**
 * migrate-lead-status-history.js
 *
 * Non-destructive migration to create the lead_status_history table.
 * This table tracks each status change for lead box metrics (especially overdue responses).
 *
 * Schema:
 *   lead_id       — FK to leads(id), cascade on delete
 *   previous_status — status before the change (null for initial creation)
 *   new_status      — status after the change
 *   changed_by      — FK to users(id), who performed the change
 *   changed_at      — timestamp of the change
 *
 * Safe to run against existing databases — uses CREATE TABLE IF NOT EXISTS.
 */

const db = require('./database');
require('dotenv').config();

const createLeadStatusHistoryTable = async () => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_status_history (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        changed_by INTEGER REFERENCES users(id),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for efficient lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id);
      CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_at ON lead_status_history(changed_at);
      CREATE INDEX IF NOT EXISTS idx_lead_status_history_new_status ON lead_status_history(new_status);
    `);

    await client.query('COMMIT');
    console.log('✓ lead_status_history table created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating lead_status_history table:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  createLeadStatusHistoryTable()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = createLeadStatusHistoryTable;
