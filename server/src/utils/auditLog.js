/**
 * Audit Log Utility
 *
 * Append-only internal logger for license security events.
 * Writes to server/logs/license-audit.log using fs.appendFile (never overwrites).
 * Each entry is a JSON line with timestamp, event type, and metadata.
 *
 * @module auditLog
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'license-audit.log');

/**
 * Append a JSON audit entry to the license audit log.
 * Creates the log directory if it does not exist.
 * Never throws — silently swallows write errors to avoid crashing the server.
 *
 * @param {string} eventType - Category of event (e.g. 'STARTUP', 'EXPIRED', 'UNLOCK', 'TAMPER')
 * @param {object} [meta={}] - Additional key/value context (IP, reason, etc.)
 */
function auditLog(eventType, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    ...meta,
  };
  const line = JSON.stringify(entry) + '\n';

  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (_err) {
    // Silently fail — audit log must never crash the server
  }
}

module.exports = auditLog;
