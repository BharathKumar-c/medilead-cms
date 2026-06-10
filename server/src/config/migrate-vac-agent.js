'use strict';

/**
 * Migration: Add vac_agent_id column to users table
 * This column stores the VAC Dialer agent ID for Click2Call integration.
 *
 * Run: node server/src/config/migrate-vac-agent.js
 */

const db = require('./database');
require('dotenv').config();

async function migrate() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check if column already exists
    const check = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'vac_agent_id'
    `);

    if (check.rows.length === 0) {
      await client.query(`
        ALTER TABLE users ADD COLUMN vac_agent_id VARCHAR(50) DEFAULT NULL
      `);
      console.log('✓ Added vac_agent_id column to users table');
    } else {
      console.log('✓ vac_agent_id column already exists — skipping');
    }

    // Create index for fast lookup by vac_agent_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_vac_agent_id ON users(vac_agent_id)
      WHERE vac_agent_id IS NOT NULL
    `);
    console.log('✓ Index idx_users_vac_agent_id created');

    await client.query('COMMIT');
    console.log('\nMigration complete: VAC Agent ID');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrate;
