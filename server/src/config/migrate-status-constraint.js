/**
 * migrate-status-constraint.js
 *
 * Non-destructive migration to fix the leads.status CHECK constraint.
 * Drops the old unnamed CHECK constraint and adds a named one that includes
 * all 34 valid statuses (modern pipeline + legacy enquiry types).
 *
 * Safe to run against existing databases — uses DO $$ blocks with existence checks.
 */

const db = require('./database');
require('dotenv').config();

const ALL_STATUSES = [
  // Modern pipeline
  'New', 'Contacted', 'Interested', 'Follow-up', 'Appointment Booked', 'Closed', 'Rejected',
  // Legacy enquiry types
  'Complaint Enquiry', 'Location Enquiry', 'Medical Certificate', 'Dial a Doctor',
  'Appointment Cancel', 'Ambulance Service Enquiry', 'Biomedical', 'IT',
  'CGHS and Ex-Service Scheme', 'CM Scheme & PM Scheme', 'Admission and Room Details Enquiry',
  'Purchase', 'Lab & Diagnostic', 'Accounts', 'Medical Record Documents', 'Blood Bank',
  'ER', 'Marketing', 'Job Vacancy', 'Pharmacy', 'Billing & Payment', 'Insurance',
  'Doctors Enquiry', 'MHC Package', 'Dialysis Enquiry', 'Scan & X-Ray', 'Internship',
];

const migrateStatusConstraint = async () => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Drop any existing CHECK constraint on leads that references the status column
    // PostgreSQL stores IN (...) as = ANY(ARRAY[...]), so match on the column name
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
            AND con.conname LIKE '%status%'
        LOOP
          EXECUTE 'ALTER TABLE leads DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
      END $$;
    `);

    // Add the new named constraint with all valid statuses
    const statusList = ALL_STATUSES.map((s) => `'${s}'`).join(', ');
    await client.query(`
      ALTER TABLE leads
      ADD CONSTRAINT leads_status_check
      CHECK (status IN (${statusList}));
    `);

    await client.query('COMMIT');
    console.log('✓ leads.status CHECK constraint updated with all 34 statuses');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating leads.status CHECK constraint:', err);
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
