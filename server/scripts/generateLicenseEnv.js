#!/usr/bin/env node

/**
 * Generate License Environment Variables
 *
 * CLI tool to generate valid LICENSE_EXPIRY, LICENSE_HMAC_SECRET,
 * LICENSE_EXPIRY_HMAC, and LICENSE_UNLOCK_HASH values for .env.
 *
 * Usage:
 *   node scripts/generateLicenseEnv.js [--expiry 2027-12-31] [--unlock-key mySecretKey]
 *
 * Outputs the env lines to stdout. Redirect to append to .env:
 *   node scripts/generateLicenseEnv.js --expiry 2027-12-31 >> .env
 *
 * @module generateLicenseEnv
 */

'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ─── Parse CLI args ───
const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}

const expiryArg = getArg('--expiry');
const unlockKeyArg = getArg('--unlock-key');

if (!expiryArg) {
  console.error('Usage: node scripts/generateLicenseEnv.js --expiry YYYY-MM-DD [--unlock-key <key>]');
  console.error('');
  console.error('Options:');
  console.error('  --expiry <YYYY-MM-DD>     License expiry date (required)');
  console.error('  --unlock-key <string>     Emergency unlock key (optional; generates bcrypt hash)');
  process.exit(1);
}

// ─── Validate expiry date ───
const expiryDate = new Date(expiryArg + 'T23:59:59.999Z');
if (isNaN(expiryDate.getTime())) {
  console.error('Error: Invalid date format. Use YYYY-MM-DD.');
  process.exit(1);
}

const isoDate = expiryArg; // Keep as YYYY-MM-DD

// ─── Generate HMAC secret (64-char hex = 32 bytes) ───
const hmacSecret = crypto.randomBytes(32).toString('hex');

// ─── Compute HMAC of the expiry date ───
const hmacDigest = crypto
  .createHmac('sha256', Buffer.from(hmacSecret, 'hex'))
  .update(isoDate, 'utf8')
  .digest('hex');

// ─── Generate unlock hash if unlock key provided ───
let unlockHashLine = '';
if (unlockKeyArg) {
  const BCRYPT_COST = 12;
  const unlockHash = bcrypt.hashSync(unlockKeyArg, BCRYPT_COST);
  unlockHashLine = `\nLICENSE_UNLOCK_HASH="${unlockHash}"`;
}

// ─── Output ───
console.log('# ─── License Enforcement ───');
console.log(`LICENSE_EXPIRY="${isoDate}"`);
console.log(`LICENSE_HMAC_SECRET="${hmacSecret}"`);
console.log(`LICENSE_EXPIRY_HMAC="${hmacDigest}"`);
console.log('LICENSE_GRACE_DAYS=3');
if (unlockHashLine) {
  console.log(unlockHashLine.trimEnd());
}
console.log('UNLOCK_ALLOWED_IPS="127.0.0.1"');
console.error('');
console.error('License env values generated successfully.');
console.error('Append the output above to your .env file.');
