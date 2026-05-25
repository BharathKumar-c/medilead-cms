/**
 * migrate-unify-calls.js
 *
 * Adds new columns to telephony_call_logs to make it the unified call table.
 * All operations are additive (ALTER TABLE ADD COLUMN IF NOT EXISTS).
 *
 * Run with: node src/config/migrate-unify-calls.js
 */
require('dotenv').config();
const db = require('./database');
const logger = require('../utils/logger');

const migrateUnifyCalls = async () => {
  logger.info('Starting call unification migration...');

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Add lead_id column (link to leads table)
    await client.query(`
      ALTER TABLE telephony_call_logs
      ADD COLUMN IF NOT EXISTS lead_id INTEGER REFERENCES leads(id);
    `);
    logger.info('✓ Added lead_id column');

    // 2. Add user_id column (link to users table — the agent who handled the call)
    await client.query(`
      ALTER TABLE telephony_call_logs
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
    `);
    logger.info('✓ Added user_id column');

    // 3. Add notes column
    await client.query(`
      ALTER TABLE telephony_call_logs
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
    logger.info('✓ Added notes column');

    // 4. Add code column (display code like C123)
    await client.query(`
      ALTER TABLE telephony_call_logs
      ADD COLUMN IF NOT EXISTS code VARCHAR(50);
    `);
    logger.info('✓ Added code column');

    // 5. Add updated_at column for tracking updates
    await client.query(`
      ALTER TABLE telephony_call_logs
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);
    logger.info('✓ Added updated_at column');

    // 6. Create indexes for the new columns
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_telephony_call_logs_lead_id ON telephony_call_logs(lead_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_telephony_call_logs_user_id ON telephony_call_logs(user_id);
    `);
    logger.info('✓ Created indexes on lead_id and user_id');

    await client.query('COMMIT');
    logger.info('Call unification migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Call unification migration failed', { error: err.message, stack: err.stack });
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateUnifyCalls()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateUnifyCalls;
