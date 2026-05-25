/**
 * generate-codes.js
 *
 * Standalone migration that:
 * 1. Adds `code` column to `call_logs` and `appointments` tables if missing
 * 2. Generates unique codes for all leads, calls, and appointments that lack them
 *
 * Code format:
 *   Leads:       L{ID}  (e.g. L42)
 *   Calls:       C{ID}  (e.g. C7)
 *   Appointments: A{ID}  (e.g. A15)
 *
 * Usage:
 *   npm run generate-codes
 *   # or directly:
 *   node src/config/generate-codes.js
 */

const db = require('../config/database');
const logger = require('../utils/logger');


/** Add the `code` column to a table if it does not already exist */
const ensureCodeColumn = async (tableName) => {
  const res = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'code'`,
    [tableName]
  );
  if (res.rows.length === 0) {
    logger.info(`Adding \`code\` column to \`${tableName}\`...`);
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN code VARCHAR(50)`);
    logger.info(`  ✓ \`code\` column added to \`${tableName}\``);
  } else {
    logger.info(`  ✓ \`code\` column already exists on \`${tableName}\``);
  }
};

/**
 * Generate codes for all records in a table that have NULL or empty `code`.
 * Uses the record's `id` as the unique suffix: {PREFIX}-{id zero-padded}.
 */
const generateCodesForTable = async (tableName, prefix) => {
  // Find all records missing a code
  const missing = await db.query(
    `SELECT id FROM ${tableName} WHERE code IS NULL OR code = '' ORDER BY id`
  );

  if (missing.rows.length === 0) {
    logger.info(`  ✓ No records in \`${tableName}\` need codes`);
    return 0;
  }

  logger.info(`  Generating codes for ${missing.rows.length} ${tableName}...`);

  // Build batch UPDATE
  let updated = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < missing.rows.length; i += BATCH_SIZE) {
    const batch = missing.rows.slice(i, i + BATCH_SIZE);      const cases = batch
      .map(
        (row, idx) =>
          `WHEN id = ${row.id} THEN '${prefix}${row.id}'`
      )
      .join('\n        ');

    const ids = batch.map((r) => r.id);
    await db.query(`
      UPDATE ${tableName}
      SET code = CASE
        ${cases}
      END
      WHERE id IN (${ids.join(', ')})
    `);

    updated += batch.length;
    logger.info(`    ... ${updated} / ${missing.rows.length}`);
  }

  return updated;
};

const main = async () => {
  console.log('\n═══════════════════════════════════════');
  console.log('  Code Generation Migration');
  console.log('═══════════════════════════════════════\n');

  try {
    // ── 1. Ensure code columns exist ──
    console.log('── Step 1: Ensure code columns exist ──\n');
    await ensureCodeColumn('call_logs');
    await ensureCodeColumn('appointments');
    console.log('');

    // ── 2. Generate codes for leads ──
    console.log('── Step 2: Generate codes for leads ──\n');
    const leadsUpdated = await generateCodesForTable('leads', 'L');
    console.log('');

    // ── 3. Generate codes for call_logs ──
    console.log('── Step 3: Generate codes for call_logs ──\n');
    const callsUpdated = await generateCodesForTable('call_logs', 'C');
    console.log('');

    // ── 4. Generate codes for appointments ──
    console.log('── Step 4: Generate codes for appointments ──\n');
    const apptsUpdated = await generateCodesForTable('appointments', 'A');
    console.log('');

    // ── Summary ──
    console.log('═══════════════════════════════════════');
    console.log('  Migration Complete');
    console.log('═══════════════════════════════════════\n');
    console.log(`  Leads:        ${leadsUpdated} codes generated`);
    console.log(`  Call Logs:    ${callsUpdated} codes generated`);
    console.log(`  Appointments: ${apptsUpdated} codes generated`);
    console.log(`  ─────────────────────────`);
    const total = leadsUpdated + callsUpdated + apptsUpdated;
    console.log(`  Total:        ${total} codes generated\n`);
    process.exit(0);
  } catch (err) {
    console.error('\n  Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

main();
