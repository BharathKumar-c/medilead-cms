const db = require('../config/database');

const seed = async () => {
  try {
    // ── Insert any new branches (idempotent — WHERE NOT EXISTS skips existing) ──
    // Uses WHERE NOT EXISTS to avoid depending on a UNIQUE constraint on name
    await db.query(`
      INSERT INTO master_branches (name, city, state, is_active)
      SELECT name, city, state, is_active
      FROM (VALUES
        ('MEDWAY HOSPITAL - KODAMBAKKAM',    'Chennai',      'Tamil Nadu',      true::boolean),
        ('MEDWAY HEART INSTITUTE - KODAMBAKKAM', 'Chennai',   'Tamil Nadu',      true::boolean),
        ('MEDWAY INSTITUTE OF PULMONOLOGY - TRUSTPURAM', 'Chennai', 'Tamil Nadu', true::boolean),
        ('INVENTORY TEST',                    'Chennai',      'Tamil Nadu',      true::boolean),
        ('MEDWAY HOSPITAL - MOGAPPAIR',       'Chennai',      'Tamil Nadu',      true::boolean),
        ('MEDWAY BLOOD BANK - TRUSTPURAM',    'Chennai',      'Tamil Nadu',      true::boolean),
        ('MEDWAY JSP HOSPITAL - CHENGALPATTU', 'Chengalpattu', 'Tamil Nadu',     true::boolean),
        ('MEDWAY HOSPITAL - VILLUPURAM',      'Villupuram',   'Tamil Nadu',      true::boolean),
        ('MEDWAY HOSPITAL - KUMBAKONAM',      'Kumbakonam',   'Tamil Nadu',      true::boolean),
        ('MEDWAY SANJIVI HOSPITAL - KAKINADA', 'Kakinada',    'Andhra Pradesh',  true::boolean),
        ('MEDWAY HOSPITAL - ERODE',           'Erode',        'Tamil Nadu',      true::boolean),
        ('MEDWAY CORPORATE OFFICE',           'Chennai',      'Tamil Nadu',      true::boolean),
        ('MEDWAY MAIN LAB',                   'Chennai',      'Tamil Nadu',      true::boolean)
      ) AS v(name, city, state, is_active)
      WHERE NOT EXISTS (
        SELECT 1 FROM master_branches WHERE name = v.name
      )
    `);

    // ── Add branch-department mappings for hospital branches ──
    // Only adds missing mappings (WHERE NOT EXISTS — no UNIQUE constraint dependency)
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
      AND NOT EXISTS (
        SELECT 1 FROM branch_departments bd
        WHERE bd.branch_id = b.id AND bd.department_id = d.id
      )
    `);

    const result = await db.query('SELECT id, name, city FROM master_branches ORDER BY id');
    console.log(`\n${result.rowCount} branches in master_branches:`);
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
