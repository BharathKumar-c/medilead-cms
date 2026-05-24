/**
 * Non-destructive migration to add new columns to existing tables.
 * Safe to run against a database with existing data — only adds columns that don't exist.
 */
const db = require('./database');
require('dotenv').config();

const migrateNewFields = async () => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // ── Users table: add new columns ──
    const columns = [
      { name: 'first_name',         type: 'VARCHAR(100)' },
      { name: 'last_name',          type: 'VARCHAR(100)' },
      { name: 'employee_id',        type: 'VARCHAR(50)' },
      { name: 'date_of_birth',      type: 'DATE' },
      { name: 'designation',        type: 'VARCHAR(255)' },
      { name: 'intercom_number',    type: 'VARCHAR(50)' },
      { name: 'allowed_departments', type: 'TEXT[]' },
    ];

    for (const col of columns) {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = '${col.name}'
          ) THEN
            EXECUTE 'ALTER TABLE users ADD COLUMN ${col.name} ${col.type}';
          END IF;
        END $$;
      `);
    }

    // Add unique constraint on employee_id (if column now exists and constraint doesn't)
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'employee_id'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'users' AND constraint_name = 'users_employee_id_key'
        ) THEN
          EXECUTE 'ALTER TABLE users ADD CONSTRAINT users_employee_id_key UNIQUE (employee_id)';
        END IF;
      END $$;
    `);

    // Add unique constraint on intercom_number (if column now exists and constraint doesn't)
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'intercom_number'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'users' AND constraint_name = 'users_intercom_number_key'
        ) THEN
          EXECUTE 'ALTER TABLE users ADD CONSTRAINT users_intercom_number_key UNIQUE (intercom_number)';
        END IF;
      END $$;
    `);

    // ── Telephony call logs table: add intercom_number column (if table exists) ──
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'telephony_call_logs'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'telephony_call_logs' AND column_name = 'intercom_number'
        ) THEN
          EXECUTE 'ALTER TABLE telephony_call_logs ADD COLUMN intercom_number VARCHAR(50)';
        END IF;
      END $$;
    `);

    // ── Add email uniqueness constraint if not present ──
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'users' AND constraint_name = 'users_email_key'
        ) THEN
          EXECUTE 'ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)';
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('✓ New fields migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateNewFields()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrateNewFields;
