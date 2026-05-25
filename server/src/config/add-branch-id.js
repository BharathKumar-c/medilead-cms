const db = require('./database');
require('dotenv').config();

const addBranchIdColumn = async () => {
  const client = await db.getClient();
  try {
    // Check if branch_id column already exists
    const check = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'leads' AND column_name = 'branch_id'
    `);

    if (check.rows.length > 0) {
      console.log('branch_id column already exists on leads table. Skipping.');
      return;
    }

    console.log('Adding branch_id column to leads table...');
    await client.query('BEGIN');
    await client.query('ALTER TABLE leads ADD COLUMN branch_id INTEGER REFERENCES master_branches(id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON leads(branch_id)');
    await client.query('COMMIT');
    console.log('Done. branch_id column added successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  addBranchIdColumn().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = addBranchIdColumn;