'use strict';

/**
 * VAC Dialer API Client
 *
 * Thin HTTP client for the VAC On-Premise Dialer API.
 * Uses native fetch (Node 18+) — no external dependencies.
 *
 * All VAC Dialer endpoints use GET method with query params.
 * Auth: Bearer token in Authorization header.
 *
 * Reference: VAC Premises API Postman Collection
 * Endpoint pattern: {VAC_SERVER_URL}/VAC/API/api.php?operation=X&agent=Y&...
 */

const logger = require('../utils/logger');

class VacClient {
  constructor() {
    this.serverUrl = process.env.VAC_SERVER_URL; // e.g. http://192.168.10.100
    this.token = process.env.VAC_API_TOKEN;      // Bearer token for VAC auth
    this.timeout = parseInt(process.env.VAC_TIMEOUT_MS) || 10000;
  }

  /**
   * Check if VAC integration is configured
   */
  isConfigured() {
    return !!(this.serverUrl && this.token);
  }

  /**
   * Make a GET request to the VAC Dialer API
   * @param {Object} params - Query parameters for the API call
   * @returns {Object} { success, message, output, raw }
   */
  async _request(params) {
    if (!this.isConfigured()) {
      throw new VacError('VAC integration not configured. Set VAC_SERVER_URL and VAC_API_TOKEN in .env', 'VAC_NOT_CONFIGURED');
    }

    const url = new URL('/VAC/API/api.php', this.serverUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }

    logger.info('VAC API request', { url: url.toString(), params });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // VAC API returns text/html content type but JSON body
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { success: response.ok, message: text, output: text };
      }

      logger.info('VAC API response', {
        status: response.status,
        success: data.success,
        message: data.message?.trim(),
      });

      if (!response.ok) {
        throw new VacError(
          data.message || `VAC API returned HTTP ${response.status}`,
          'VAC_HTTP_ERROR',
          response.status,
          data
        );
      }

      return {
        success: data.success !== false,
        message: (data.message || '').trim(),
        output: (data.output || '').trim(),
        raw: data,
      };
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof VacError) throw err;

      if (err.name === 'AbortError') {
        throw new VacError('VAC API request timed out', 'VAC_TIMEOUT');
      }

      // Network errors (ECONNREFUSED, ENOTFOUND, etc.)
      throw new VacError(
        `Cannot reach VAC server: ${err.message}`,
        'VAC_UNREACHABLE'
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Dialer Operations
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Click2Call — Initiate an outbound call from agent to phone number
   * @param {string} agent - VAC agent ID (e.g. "1001")
   * @param {string} phoneNumber - Customer phone number
   */
  async click2Call(agent, phoneNumber) {
    const result = await this._request({
      operation: 'dial',
      agent,
      phone_number: phoneNumber,
    });

    // Check for common VAC errors
    if (!result.success) {
      if (result.message.includes('not logged in')) {
        throw new VacError(
          'Agent is not logged into the VAC Dialer. Please log in first.',
          'VAC_AGENT_NOT_LOGGED_IN'
        );
      }
      throw new VacError(result.message || 'Click2Call failed', 'VAC_DIAL_FAILED');
    }

    return result;
  }

  /**
   * Hangup — End the current call and set disposition
   * @param {string} agent - VAC agent ID
   * @param {string} dispo - Disposition code (e.g. "A", "B", "NI")
   */
  async hangup(agent, dispo = 'A') {
    return this._request({
      module: 'dialer',
      operation: 'Hangup',
      agent,
      dispo,
    });
  }

  /**
   * Disposition — Set call disposition without hanging up
   * @param {string} agent - VAC agent ID
   * @param {string} dispo - Disposition code
   */
  async disposition(agent, dispo) {
    return this._request({
      module: 'dialer',
      operation: 'Dispo',
      agent,
      dispo,
    });
  }

  /**
   * Calls In Queue — Check how many calls are waiting
   * @param {string} agent - VAC agent ID
   */
  async callsInQueue(agent) {
    return this._request({
      module: 'dialer',
      operation: 'Calls_In_Queue',
      agent,
    });
  }

  /**
   * Park Call — Put the current call on hold
   * @param {string} agent - VAC agent ID
   */
  async parkCall(agent) {
    return this._request({
      module: 'dialer',
      operation: 'Park',
      agent,
    });
  }

  /**
   * Grab Call — Retrieve a parked call
   * @param {string} agent - VAC agent ID
   */
  async grabCall(agent) {
    return this._request({
      module: 'dialer',
      operation: 'Grab',
      agent,
    });
  }

  /**
   * Blind Transfer — Transfer call without consulting
   * @param {string} agent - VAC agent ID
   * @param {string} transferTo - Target extension/number
   */
  async blindTransfer(agent, transferTo) {
    return this._request({
      module: 'dialer',
      operation: 'BTxer',
      agent,
      txer_to: transferTo,
    });
  }

  /**
   * Attended Transfer — Transfer with consultation
   * @param {string} agent - VAC agent ID
   * @param {string} transferTo - Target extension/number
   */
  async attendedTransfer(agent, transferTo) {
    return this._request({
      module: 'dialer',
      operation: 'ATxer',
      agent,
      txer_to: transferTo,
    });
  }

  /**
   * Hangup Transfer — Disconnect the 3rd party line
   * @param {string} agent - VAC agent ID
   */
  async hangupTransfer(agent) {
    return this._request({
      module: 'dialer',
      operation: 'HangUpTxer',
      agent,
    });
  }

  /**
   * Hangup Both — Disconnect the entire conference
   * @param {string} agent - VAC agent ID
   */
  async hangupBoth(agent) {
    return this._request({
      module: 'dialer',
      operation: 'HangUpBoth',
      agent,
    });
  }

  /**
   * Leave 3-Way — Agent leaves the conference, customer + 3rd party continue
   * @param {string} agent - VAC agent ID
   */
  async leave3Way(agent) {
    return this._request({
      module: 'dialer',
      operation: 'Leave3Way',
      agent,
    });
  }

  /**
   * Add Lead — Push a phone number into VAC's auto-dialer queue
   * @param {string} agent - VAC agent ID
   * @param {string} phoneNumber - Customer phone number
   * @param {string} listId - VAC list ID (default "301")
   * @param {string} source - Lead source label (default "CMS")
   */
  async addLead(agent, phoneNumber, listId = '301', source = 'CMS') {
    return this._request({
      module: 'dialer',
      operation: 'addLead',
      agent,
      phone_number: phoneNumber,
      list_id: listId,
      source,
    });
  }

  /**
   * Storage API — Get storage/usage info (admin)
   */
  async getStorage() {
    return this._request({
      operation: 'storageapi',
    });
  }
}

/**
 * Custom error class for VAC API errors
 */
class VacError extends Error {
  constructor(message, code = 'VAC_ERROR', httpStatus = null, data = null) {
    super(message);
    this.name = 'VacError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.data = data;
  }
}

// Export singleton instance
const vacClient = new VacClient();
module.exports = { vacClient, VacError };
