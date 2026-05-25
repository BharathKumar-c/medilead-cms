/**
 * migrate-call-logs-data.js
 *
 * Step-by-step historical data migration:
 * 1. Export all call_logs data into a staging table
 * 2. Transform SIP statuses to telephony_call_logs statuses
 * 3. Import into telephony_call_logs
 * 4. Validate data integrity
 * 5. Report results
 *
 * Run with: node src/config/migrate-call-logs-data.js
 */
require('dotenv').config();
const db = require('./database');
const logger = require('../utils/logger');

// ── Status mapping: SIP call_logs status → telephony_call_logs status ──
const STATUS_MAP = {
  'ringing':       'ringing',
  'connected':     'in-progress',
  'on_hold':       'in-progress',
  'disconnected':  'completed',
  'missed':        'missed',
  'failed':        'failed',
};

// ── Direction mapping ──
const DIRECTION_MAP = {
  'inbound':  'inbound',
  'outbound': 'outbound',
};

const migrateCallLogsData = async () => {
  logger.info('Starting call_logs → telephony_call_logs data migration...');
  logger.info('Step 1: Export call_logs to staging...');

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Step 1: Create staging table and copy data
    await client.query(`
      CREATE TABLE IF NOT EXISTS telephony_call_logs_staging (
        source_id INTEGER PRIMARY KEY,
        call_id VARCHAR(100),
        caller_phone_number VARCHAR(50),
        callee_number VARCHAR(50),
        direction VARCHAR(10),
        call_status VARCHAR(50),
        duration_seconds INTEGER,
        lead_id INTEGER,
        user_id INTEGER,
        notes TEXT,
        recording_url TEXT,
        timestamp TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Clear staging for idempotency
    await client.query('DELETE FROM telephony_call_logs_staging');

    // Insert data from call_logs with status transformation
    const insertResult = await client.query(`
      INSERT INTO telephony_call_logs_staging (
        source_id, call_id, caller_phone_number, callee_number, direction,
        call_status, duration_seconds, lead_id, user_id, notes,
        recording_url, timestamp, created_at
      )
      SELECT
        cl.id,
        cl.call_id,
        COALESCE(cl.caller_number, 'unknown'),
        cl.callee_number,
        cl.direction,
        CASE cl.status
          WHEN 'ringing' THEN 'ringing'
          WHEN 'connected' THEN 'in-progress'
          WHEN 'on_hold' THEN 'in-progress'
          WHEN 'disconnected' THEN 'completed'
          WHEN 'missed' THEN 'missed'
          WHEN 'failed' THEN 'failed'
          ELSE 'initiated'
        END,
        COALESCE(cl.duration, 0),
        cl.lead_id,
        cl.user_id,
        cl.notes,
        cl.recording_url,
        COALESCE(cl.start_time, cl.created_at),
        cl.created_at
      FROM call_logs cl
      WHERE NOT EXISTS (
        -- Avoid duplicates by checking if vendor_call_id matches
        SELECT 1 FROM telephony_call_logs tcl
        WHERE tcl.vendor_call_id = cl.call_id OR
              (tcl.caller_phone_number = COALESCE(cl.caller_number, 'unknown')
               AND tcl.timestamp = COALESCE(cl.start_time, cl.created_at))
      )
    `);

    const stagedCount = insertResult.rowCount;
    logger.info(`  → ${stagedCount} records staged`);

    // Step 2: Transform — generate codes for staged records
    logger.info('Step 2: Generating call codes...');
    await client.query(`
      UPDATE telephony_call_logs_staging
      SET call_status = 'initiated'
      WHERE call_status IS NULL OR call_status NOT IN ('initiated','ringing','in-progress','completed','failed','missed')
    `);

    // Step 3: Import into telephony_call_logs
    logger.info('Step 3: Importing into telephony_call_logs...');
    const importResult = await client.query(`
      INSERT INTO telephony_call_logs (
        vendor_call_id,
        caller_phone_number,
        call_status,
        duration_seconds,
        direction,
        recording_url,
        intercom_number,
        timestamp,
        received_at,
        raw_payload,
        lead_id,
        user_id,
        notes,
        created_at,
        updated_at
      )
      SELECT
        CASE WHEN s.call_id IS NOT NULL THEN s.call_id ELSE 'migrated-' || s.source_id END,
        s.caller_phone_number,
        s.call_status,
        s.duration_seconds,
        s.direction,
        s.recording_url,
        NULL,
        s.timestamp,
        s.created_at,
        jsonb_build_object(
          'migrated_from', 'call_logs',
          'source_id', s.source_id,
          'callee_number', s.callee_number
        ),
        s.lead_id,
        s.user_id,
        s.notes,
        s.created_at,
        NOW()
      FROM telephony_call_logs_staging s
      ON CONFLICT (vendor_call_id) DO NOTHING
      RETURNING id, vendor_call_id, caller_phone_number
    `);

    const importedCount = importResult.rows.length;
    logger.info(`  → ${importedCount} records imported into telephony_call_logs`);

    // Step 4: Generate codes for imported records that don't have one
    logger.info('Step 4: Generating display codes...');
    // We generate codes like TC-{uuid_prefix} for imported telephony records
    await client.query(`
      UPDATE telephony_call_logs
      SET code = 'TC-' || SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)
      WHERE code IS NULL
    `);

    // Link leads by phone number for records without lead_id
    logger.info('Step 5: Auto-linking leads by phone number...');
    const linkResult = await client.query(`
      UPDATE telephony_call_logs tcl
      SET lead_id = l.id
      FROM leads l
      WHERE tcl.lead_id IS NULL
        AND (l.phone = tcl.caller_phone_number OR l.alternate_contact = tcl.caller_phone_number)
        AND l.status != 'Rejected'
    `);
    logger.info(`  → ${linkResult.rowCount} leads auto-linked`);

    await client.query('COMMIT');
    logger.info('═══════════════════════════════════════════════');
    logger.info('  Data Migration Summary:');
    logger.info(`  Records staged:          ${stagedCount}`);
    logger.info(`  Records imported:        ${importedCount}`);
    logger.info(`  Leads auto-linked:       ${linkResult.rowCount}`);
    logger.info('═══════════════════════════════════════════════');

    // Step 6: Validation
    logger.info('Validating data integrity...');
    const validation = await client.query(`
      SELECT
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE call_status IS NULL) as null_status,
        COUNT(*) FILTER (WHERE caller_phone_number IS NULL) as null_caller,
        COUNT(*) FILTER (WHERE lead_id IS NOT NULL) as with_lead,
        COUNT(*) FILTER (WHERE user_id IS NOT NULL) as with_agent
      FROM telephony_call_logs
    `);
    const v = validation.rows[0];
    logger.info('  Current telephony_call_logs state:');
    logger.info(`    Total records:  ${v.total_records}`);
    logger.info(`    With lead:      ${v.with_lead}`);
    logger.info(`    With agent:     ${v.with_agent}`);
    logger.info(`    Null status:    ${v.null_status}`);
    logger.info(`    Null caller:    ${v.null_caller}`);

    // Warn about any null statuses
    if (parseInt(v.null_status) > 0) {
      logger.warn(`  ⚠ ${v.null_status} records have null status — running fix...`);
      await db.query(`
        UPDATE telephony_call_logs SET call_status = 'initiated' WHERE call_status IS NULL
      `);
      logger.info('  ✓ Fixed null statuses');
    }

    logger.info('Data migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Data migration failed', { error: err.message, stack: err.stack });
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateCallLogsData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateCallLogsData;
