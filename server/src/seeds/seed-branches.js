const db = require('../config/database');

const seed = async () => {
  try {
    // Check if already seeded (idempotent)
    const existing = await db.query('SELECT COUNT(*) FROM master_branches');
    const count = parseInt(existing.rows[0].count, 10);
    if (count > 0) {
      console.log(`master_branches already has ${count} rows, skipping seed`);
      return;
    }

    await db.query(`
      INSERT INTO master_branches (name, city, state, is_active) VALUES
      ('MEDWAY HOSPITAL - KODAMBAKKAM',    'Chennai',      'Tamil Nadu',      true),
      ('MEDWAY HEART INSTITUTE - KODAMBAKKAM', 'Chennai',   'Tamil Nadu',      true),
      ('MEDWAY INSTITUTE OF PULMONOLOGY - TRUSTPURAM', 'Chennai', 'Tamil Nadu', true),
      ('INVENTORY TEST',                    'Chennai',      'Tamil Nadu',      true),
      ('MEDWAY HOSPITAL - MOGAPPAIR',       'Chennai',      'Tamil Nadu',      true),
      ('MEDWAY BLOOD BANK - TRUSTPURAM',    'Chennai',      'Tamil Nadu',      true),
      ('MEDWAY JSP HOSPITAL - CHENGALPATTU', 'Chengalpattu', 'Tamil Nadu',     true),
      ('MEDWAY HOSPITAL - VILLUPURAM',      'Villupuram',   'Tamil Nadu',      true),
      ('MEDWAY HOSPITAL - KUMBAKONAM',      'Kumbakonam',   'Tamil Nadu',      true),
      ('MEDWAY SANJIVI HOSPITAL - KAKINADA', 'Kakinada',    'Andhra Pradesh',  true),
      ('MEDWAY HOSPITAL - ERODE',           'Erode',        'Tamil Nadu',      true),
      ('MEDWAY CORPORATE OFFICE',           'Chennai',      'Tamil Nadu',      true),
      ('MEDWAY MAIN LAB',                   'Chennai',      'Tamil Nadu',      true)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('13 branches inserted');

    // Add department mappings for hospital branches (not admin/inventory branches)
    await db.query(`
      INSERT INTO branch_departments (branch_id, department_id)
      SELECT b.id, d.id FROM master_branches b, master_department d
      WHERE b.name IN (
        'MEDWAY HOSPITAL - KODAMBAKKAM',
        'MEDWAY HEART INSTITUTE - KODAMBAKKAM',
        'MEDWAY INSTITUTE OF PULMONOLOGY - TRUSTPURAM',
        'MEDWAY HOSPITAL - MOGAPPAIR',
        'MEDWAY JSP HOSPITAL - CHENGALPATTU',
        'MEDWAY HOSPITAL - VILLUPURAM',
        'MEDWAY HOSPITAL - KUMBAKONAM',
        'MEDWAY SANJIVI HOSPITAL - KAKINADA',
        'MEDWAY HOSPITAL - ERODE'
      )
      ON CONFLICT DO NOTHING
    `);
    console.log('Branch-department mappings added');

    const result = await db.query('SELECT id, name, city FROM master_branches ORDER BY id');
    console.log('\nFinal branches:');
    result.rows.forEach(r => console.log('  ' + r.id + ' | ' + r.name + ' | ' + r.city));
  } catch (err) {
    console.error('Seeding failed:', err);
    throw err;
  }
};

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = seed;
