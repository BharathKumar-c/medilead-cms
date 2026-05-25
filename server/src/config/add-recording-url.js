const db = require('./database');
require('dotenv').config();

const addRecordingUrl = async () => {
  try {
    await db.query(`
      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_url TEXT;
    `);
    console.log('recording_url column added to call_logs table');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }
};

// Run if called directly
if (require.main === module) {
  addRecordingUrl()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = addRecordingUrl;
