/**
 * migrate-status-constraint.js
 *
 * Migration to remove the leads.status CHECK constraint.
 * Status validation is now handled dynamically in the middleware by querying
 * the master_lead_status table, so the DB-level constraint is no longer needed
 * and prevents newly-added statuses from being used.
 *
 * Safe to run against existing databases — uses DO $$ blocks with existence checks.
 */

const db = require('./database');
require('dotenv').config();

const migrateStatusConstraint = async () => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Drop any existing CHECK constraint on leads that references the status column
    await client.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = 'leads'
            AND con.contype = 'c'
            AND pg_get_constraintdef(con.oid) ~* 'status'
        LOOP
          EXECUTE 'ALTER TABLE leads DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('✓ leads.status CHECK constraint removed — validation is now dynamic via master_lead_status table');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error removing leads.status CHECK constraint:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateStatusConstraint()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrateStatusConstraint;
