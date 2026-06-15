/**
 * Migration: Add master_salutation table and salutation column to leads
 *
 * Run: node server/src/config/migrate-salutation.js
 */
const db = require('./database');

async function migrate() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Create master_salutation table
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_salutation (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default salutations
    await client.query(`
      INSERT INTO master_salutation (name) VALUES ('Mr.'), ('Mrs.'), ('Miss'), ('Master'), ('Dr.'), ('Ms.')
      ON CONFLICT DO NOTHING;
    `);

    // Add salutation column to leads table
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'leads' AND column_name = 'salutation'
    `);

    if (colCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE leads ADD COLUMN salutation VARCHAR(50);
      `);
      console.log('Added salutation column to leads table.');
    } else {
      console.log('Salutation column already exists in leads table.');
    }

    await client.query('COMMIT');
    console.log('Migration complete: master_salutation table created and seeded.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
