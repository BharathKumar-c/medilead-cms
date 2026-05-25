const fs = require('fs');
const path = require('path');
const db = require('../config/database');

// Simple CSV line parser (handles quoted fields)
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

const seedPincodes = async () => {
  try {
    // Read CSV file
    const csvPath = path.join(__dirname, '..', 'data', 'pincodes.csv');
    if (!fs.existsSync(csvPath)) {
      console.log('CSV file not found at:', csvPath);
      console.log('Skipping pincode seeding (no CSV available)');
      return;
    }

    const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(l => l.trim());
    const header = parseCsvLine(lines[0]);
    // Support multiple CSV formats:
    // - Old format: PostOfficeName, Pincode, DistrictsName, City, State
    // - New format: CircleName, RegionName, DivisionName, OfficeName, Pincode, OfficeType, Delivery, District, StateName, Lat, Lng
    const postOfficeIdx = header.findIndex(h => h.includes('OfficeName') || h.includes('PostOffice'));
    const pincodeIdx = header.findIndex(h => h.includes('Pincode'));
    const cityIdx = header.findIndex(h => h.includes('City') || h.includes('District'));
    const stateIdx = header.findIndex(h => h.includes('StateName') || h.includes('State'));

    console.log(`Found ${lines.length - 1} data rows in CSV`);
    console.log(`Header columns detected — Area: ${header[postOfficeIdx] || '?'}, Pincode: ${header[pincodeIdx] || '?'}, City: ${header[cityIdx] || '?'}, State: ${header[stateIdx] || '?'}`);

    // Bulk insert in batches of 500 — ON CONFLICT skips existing records
    const batchSize = 500;
    let inserted = 0;

    for (let i = 1; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize);
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const line of batch) {
        const fields = parseCsvLine(line);
        const area = fields[postOfficeIdx];
        const pincode = fields[pincodeIdx];
        const city = fields[cityIdx];
        const state = fields[stateIdx];

        if (!area || !pincode) continue;

        values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
        params.push(pincode, area, city || '', state || '', 'India');
      }

      if (values.length > 0) {
        await db.query(
          `INSERT INTO master_pincodes (pincode, area, city, state, country) VALUES ${values.join(', ')} ON CONFLICT (pincode, area) DO NOTHING`,
          params
        );
        inserted += values.length;
      }

      if (inserted % 5000 === 0 || i + batchSize >= lines.length) {
        console.log(`Processed ${inserted} records...`);
      }
    }

    const total = await db.query('SELECT COUNT(*) FROM master_pincodes');
    console.log(`Seeded pincode data: ${inserted} new records inserted, ${total.rows[0].count} total in master_pincodes`);
  } catch (err) {
    console.error('Error seeding pincode data:', err);
    throw err;
  }
};

if (require.main === module) {
  seedPincodes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = seedPincodes;
