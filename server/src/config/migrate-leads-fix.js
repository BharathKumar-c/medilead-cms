/**
 * Migration to add missing columns to the leads table
 * 
 * The leads table is missing several columns that the application code references:
 * - code: lead code/identifier
 * - gender: patient gender
 * - assigned_by: who assigned the lead
 * - created_by: who created the lead (causing 500 error on GET)
 * - follow_up_date: follow-up scheduling
 */
const db = require('./database');

const migrateLeadsFix = async () => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check which columns exist and add missing ones
    const columnsResult = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'`
    );
    const existingColumns = new Set(columnsResult.rows.map(r => r.column_name));

    const columnsToAdd = [];

    if (!existingColumns.has('code')) {
      columnsToAdd.push(`ADD COLUMN IF NOT EXISTS code VARCHAR(50)`);
    }
    if (!existingColumns.has('gender')) {
      columnsToAdd.push(`ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`);
    }
    if (!existingColumns.has('assigned_by')) {
      columnsToAdd.push(`ADD COLUMN IF NOT EXISTS assigned_by INTEGER REFERENCES users(id)`);
    }
    if (!existingColumns.has('created_by')) {
      columnsToAdd.push(`ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)`);
    }
    if (!existingColumns.has('follow_up_date')) {
      columnsToAdd.push(`ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP`);
    }

    if (columnsToAdd.length > 0) {
      const alterSQL = `ALTER TABLE leads ${columnsToAdd.join(', ')}`;
      console.log(`Adding ${columnsToAdd.length} missing column(s) to leads table...`);
      console.log(`SQL: ${alterSQL}`);
      await client.query(alterSQL);
      console.log('Columns added successfully.');
    } else {
      console.log('All columns already exist. No changes needed.');
    }

    await client.query('COMMIT');
    console.log('Migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateLeadsFix()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateLeadsFix;
