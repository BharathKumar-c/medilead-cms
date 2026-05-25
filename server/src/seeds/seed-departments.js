const db = require('../config/database');
require('dotenv').config();

const departments = [
  'OCCUPATIONAL THERAPIST',
  'SPEECH THERAPIST',
  'CONSULTATION ROOM',
  'Stores',
  'Pulmonology',
  'Psychology',
  'Projects',
  'Orthopaedics',
  'Operations',
  'Nutrition & Dietetics',
  'Nusing',
  'Nursing',
  'Nephrology',
  'Multi-Organ Transplant',
  'Medical Services',
  'Intensive Care Unit',
  'Information Technology',
  'Human Resources',
  'Finance & Accounts',
  'Emergency Medicine',
  'CTVS',
  'Critical Care Unit',
  'Casualty',
  'Cardiology',
  'Cardiac - Ananesthesia',
  'Aarogya Sri',
  'Anesthesia',
  'EMR',
  'GENERAL',
  'PHYSIOTHERAPY',
  'Admin Department',
  'ORAL MAXILLOFACIAL SURGEON',
  'CLOUD PHYSICIAN',
  'INTERNATIONAL PATIENT SERVICES',
  'HEPATOLOGISTS',
  'OPD',
  'PSYCHOLOGICAL TEST',
  'AYURVEDIC',
  'CLINICAL HAEMATOLOGY',
  'AYURVEDA',
  'CALL CENTRE',
  'PERFUSIONIST',
  'BLOOD BANK',
  'GENERAL PHYSICIAN',
  'CENTRE HEAD',
  'ENDOSCOPY SCAN',
  'PSYCHIATRIST',
  'PURCHASE',
  'ECG',
  'ECHO',
  'ICN',
  'CMT SECRETARY',
  'DISCHARGE SUMMARY',
  'MRD',
  'STORES DEPARTMENT',
  'IT ADMIN',
  'INTERNAL AUDIT',
  'IVF',
  'LABORATORY',
  'DIETICIAN',
  'OPERATION THEATRE',
  'CATH LAB',
  'NURSE',
  'NEUROLOGY',
  'CARDIO',
  'PROCESS LAB',
  'SICU',
  'NICU',
  'WARD',
  'TRANSPORT',
  'TRANSPLANT CMT',
  'SECURITY',
  'RADIOLOGY',
  'QUALITY',
  'PHYSIOTHERAPHY',
  'PHARMACY',
  'OT',
  'OP LAB',
  'MARKETING',
  'MAINTENANCE',
  'SUPPORT',
  'INSURANCE',
  'INFECTION CONTROL',
  'ICU',
  'HUMAN RESOURCE',
  'HOUSEKEEPING',
  'FRONT OFFICE',
  'ENDOSCOPY',
  'ACCOUNTS',
  'LIVE BIOTECH',
  'CALL CENTER',
  'CHAIRMAN OFFICE',
  'CEO OFFICE',
  'STORE',
  'ADMIN INV',
  'EMERGENCY',
  'DIALYSIS',
  'BIOMEDICAL',
  'CSSD',
  'BILLING',
  'ADMIN',
  'Support',
  'Front Desk',
];

const seedDepartments = async (parentClient) => {
  const client = parentClient || await db.getClient();
  const shouldOwnTx = !parentClient;

  try {
    // Deduplicate, trim, and filter empty names
    const values = departments
      .filter((dept, idx, arr) => arr.indexOf(dept) === idx)
      .map((dept) => dept.trim())
      .filter((dept) => dept.length > 0);

    if (shouldOwnTx) {
      await client.query('BEGIN');
    }

    // Bulk INSERT with ON CONFLICT — only adds new departments, never deletes existing ones
    const placeholders = values.map((_, i) => `($${i + 1})`).join(', ');
    await client.query(
      `INSERT INTO master_department (name) VALUES ${placeholders} ON CONFLICT (name) DO NOTHING`,
      values
    );

    if (shouldOwnTx) {
      await client.query('COMMIT');
    }
    console.log(`✓ Department Master seeded: ${values.length} departments ensured (ON CONFLICT DO NOTHING)`);
  } catch (err) {
    if (shouldOwnTx) {
      await client.query('ROLLBACK');
    }
    console.error('Department seeding failed:', err);
    throw err;
  } finally {
    if (shouldOwnTx) {
      client.release();
    }
  }
};

if (require.main === module) {
  seedDepartments()
    .then(() => {
      console.log('Seed complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

module.exports = seedDepartments;
