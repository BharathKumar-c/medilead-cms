require('dotenv').config();
const db = require('./src/config/database');
db.query("SELECT id, name, email, role, intercom_number FROM users WHERE email = $1", ['barath@gmail.com'])
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(); })
  .catch(e => { console.error(e.message); process.exit(1); });
