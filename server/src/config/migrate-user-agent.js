/**
 * Non-destructive migration to add `user_agent` column to the users table.
 * Safe to run against a database with existing data.
 */
const db = require('./database');
require('dotenv').config();

const migrateUserAgent = async () => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'user_agent'
        ) THEN
          EXECUTE 'ALTER TABLE users ADD COLUMN user_agent VARCHAR(255)';
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('✓ user_agent column added to users table');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateUserAgent()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrateUserAgent;
