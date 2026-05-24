const db = require('./database');

const createPincodesTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS master_pincodes (
        id SERIAL PRIMARY KEY,
        pincode VARCHAR(10) NOT NULL,
        area VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        country VARCHAR(100) DEFAULT 'India',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pincode, area)
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_master_pincodes_pincode ON master_pincodes(pincode);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_master_pincodes_city ON master_pincodes(city);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_master_pincodes_state ON master_pincodes(state);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_master_pincodes_active ON master_pincodes(is_active);
    `);

    console.log('master_pincodes table created/verified');
  } catch (err) {
    console.error('Error creating master_pincodes table:', err);
    throw err;
  }
};

if (require.main === module) {
  createPincodesTable()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = createPincodesTable;
