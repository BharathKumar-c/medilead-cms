import { useState } from 'react';

const methodColors = {
  GET: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  POST: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  PUT: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
};

const endpoints = [
  {
    method: 'POST', path: '/api/calls/inbound', auth: 'HMAC / JWT',
    summary: 'Telephony vendor webhook — record an inbound call from your provider',
    statuses: { 201: 'Call logged', 400: 'Validation error', 409: 'Duplicate vendor_call_id', 500: 'Server error' },
    body: {
      caller_phone_number: 'string (required, E.164 format, e.g. +919876543210)',
      call_status: 'string (required, one of: initiated, ringing, in-progress, completed, failed, missed)',
      timestamp: 'ISO8601 (required, e.g. 2026-05-24T10:45:00Z)',
      vendor_call_id: 'string (optional, max 100 chars — used for dedup, returns 409 on duplicate)',
      duration_seconds: 'integer (optional, non-negative)',
      direction: 'string (optional, inbound or outbound, defaults to inbound)',
      recording_url: 'string (optional, max 500 chars)',
      intercom_number: 'string (optional, max 50 chars — routes events to specific agent)',
    },
    response: {
      success: true,
      message: 'Call log recorded successfully',
      data: { id: 'uuid', caller_phone_number: 'masked', call_status: 'completed', timestamp: 'ISO8601' },
    },
    note: 'Auth via HMAC-SHA256 signature in X-Webhook-Signature header, or JWT Bearer fallback. Auto-looks up lead by caller_phone_number. Emits Socket.IO events (call-event + incoming-call) and notifications.',
  },
  {
    method: 'POST', path: '/api/calls/sip-event', auth: 'JWT Required',
    summary: 'SIP event webhook — process SIP server events (incoming, answered, ended, missed, etc.)',
    statuses: { 200: 'Event processed', 400: 'Validation error', 401: 'Unauthorized', 500: 'Server error' },
    body: {
      event: 'string (required, one of: incoming, outgoing, answered, ended, missed, hold, unhold, failed)',
      call_id: 'string (optional, max 100 chars — used to update existing call if present)',
      caller: 'string (optional, 10-15 digits)',
      callee: 'string (optional, 10-15 digits)',
      duration: 'integer (optional, non-negative — applied on ended/answered events)',
    },
    response: { status: 'success', message: 'SIP event processed.' },
    note: 'Auto-maps events to call_status. Updates existing call if vendor_call_id matches, otherwise creates new. Auto-links lead by phone number. Emits Socket.IO events with enriched lead info (call stats for incoming popup).',
  },
  {
    method: 'GET', path: '/api/calls', auth: 'JWT Required',
    summary: 'List call logs with pagination and filters',
    statuses: { 200: 'Calls returned', 401: 'Unauthorized', 500: 'Server error' },
    params: 'user_id, direction (inbound|outbound), status or call_status, page (default 1), limit (default 50)',
    response: {
      status: 'success',
      data: {
        calls: [{ id: 'uuid', caller_number: 'string', direction: 'string', call_status: 'string', status: 'string (backward compat)', duration: 'number', duration_seconds: 'number', recording_url: 'string|null', intercom_number: 'string|null', timestamp: 'ISO8601', received_at: 'ISO8601', created_at: 'ISO8601', vendor_call_id: 'string', code: 'string', lead_id: 'number|null', lead_name: 'string|null', lead_phone: 'string|null', user_id: 'number|null', user_name: 'string|null', notes: 'string|null' }],
        total: 'number',
        page: 'number',
        totalPages: 'number',
      },
    },
    note: 'Non-admin users see only calls matching their intercom_number. Supports both `status` and `call_status` query params for backward compatibility.',
  },
  {
    method: 'GET', path: '/api/calls/stats', auth: 'JWT Required',
    summary: 'Get call statistics for today',
    statuses: { 200: 'Stats returned', 401: 'Unauthorized', 500: 'Server error' },
    response: {
      status: 'success',
      data: { totalToday: 'number', inbound: 'number', outbound: 'number', missedToday: 'number', missed_today: 'number (backward compat)', avgDuration: 'number', avg_duration: 'number (backward compat)' },
    },
    note: 'Non-admin users see only stats scoped to their intercom_number. Returns both camelCase and snake_case fields for backward compat.',
  },
  {
    method: 'GET', path: '/api/calls/phone/:phone', auth: 'JWT Required',
    summary: 'Get call history for a specific phone number (last 10 calls)',
    statuses: { 200: 'History returned', 401: 'Unauthorized', 500: 'Server error' },
    response: {
      status: 'success',
      data: { calls: [{ id: 'uuid', caller_number: 'string', direction: 'string', status: 'string', duration: 'number', created_at: 'ISO8601', lead_name: 'string|null', lead_phone: 'string|null' }] },
    },
    note: 'Digits-only normalization applied to the phone parameter. Includes lead name/phone via LEFT JOIN.',
  },
  {
    method: 'POST', path: '/api/calls', auth: 'JWT Required',
    summary: 'Log a call manually (from manual entry or SIP integration)',
    statuses: { 201: 'Call logged', 400: 'Validation error', 401: 'Unauthorized', 500: 'Server error' },
    body: {
      caller_number: 'string (required, 10-15 digits)',
      callee_number: 'string (optional, 10-15 digits)',
      direction: 'string (optional, inbound or outbound, defaults to inbound)',
      status: 'string (optional, defaults to initiated)',
      duration: 'integer (optional, defaults to 0)',
      lead_id: 'integer (optional — skips auto-lookup if provided)',
      notes: 'string (optional, max 2000 chars)',
    },
    response: {
      status: 'success',
      data: { call: { id: 'uuid', caller_number: 'string', direction: 'string', call_status: 'string', status: 'string (backward compat)', duration: 'number', lead_id: 'number|null', user_id: 'number', notes: 'string|null', code: 'string', created_at: 'ISO8601' } },
    },
    note: 'Auto-links lead by caller_number if lead_id not provided. Updates lead.last_call_date. Sends missed-call notification for missed status.',
  },
  {
    method: 'PUT', path: '/api/calls/:id', auth: 'JWT Required',
    summary: 'Update call status, duration, or notes',
    statuses: { 200: 'Call updated', 400: 'Validation error', 401: 'Unauthorized', 404: 'Call not found', 500: 'Server error' },
    body: {
      call_status: 'string (optional, one of: initiated, ringing, in-progress, completed, failed, missed)',
      duration_seconds: 'integer (optional, non-negative)',
      notes: 'string (optional, max 2000 chars)',
    },
    response: {
      status: 'success',
      data: { call: { id: 'uuid', caller_number: 'string', call_status: 'string', duration: 'number', notes: 'string|null', updated_at: 'ISO8601' } },
    },
    note: 'UUID-based ID. Dynamic UPDATE — only provided fields are changed.',
  },
  {
    method: 'GET', path: '/api/calls/telephony', auth: 'JWT Required',
    summary: 'Telephony-specific backward-compatible list endpoint',
    statuses: { 200: 'Calls returned', 401: 'Unauthorized', 500: 'Server error' },
    params: 'page (default 1), limit (default 50), status, direction, phone (ILIKE search)',
    response: {
      status: 'success',
      data: { calls: [{ id: 'uuid', caller_number: 'string', caller_phone_number: 'string (masked)', call_status: 'string', duration: 'number', direction: 'string', recording_url: 'string|null', timestamp: 'ISO8601', received_at: 'ISO8601', vendor_call_id: 'string', created_at: 'ISO8601', lead_name: 'string|null', lead_phone: 'string|null', lead_id: 'number|null' }], total: 'number', page: 'number', totalPages: 'number' },
    },
    note: 'Same data as GET /api/calls with added phone masking. Non-admin users see only their intercom calls.',
  },
  {
    method: 'GET', path: '/api/calls/telephony/stats', auth: 'JWT Required',
    summary: 'Telephony-specific backward-compatible stats endpoint',
    statuses: { 200: 'Stats returned', 401: 'Unauthorized', 500: 'Server error' },
    response: { status: 'success', data: { total_today: 'number', inbound: 'number', outbound: 'number', missed_today: 'number', avg_duration: 'number' } },
    note: 'Uses received_at instead of created_at. Snake_case response only (backward compat).',
  },
];

const callStatuses = [
  { status: 'Initiated', desc: 'Call event has been received, call is being set up', color: 'bg-gray-100 text-gray-800' },
  { status: 'Ringing', desc: 'Call is ringing on the recipient\'s end, awaiting answer', color: 'bg-yellow-100 text-yellow-800' },
  { status: 'In Progress', desc: 'Call has been answered, audio is flowing between parties', color: 'bg-green-100 text-green-800' },
  { status: 'Completed', desc: 'Call ended normally, duration has been recorded', color: 'bg-blue-100 text-blue-800' },
  { status: 'Failed', desc: 'Call could not be completed due to a system error', color: 'bg-red-100 text-red-800' },
  { status: 'Missed', desc: 'Call was not answered before the caller hung up or timed out', color: 'bg-red-100 text-red-800' },
];

const sipEventMap = [
  { event: 'incoming', mappedStatus: 'ringing', direction: 'inbound', description: 'New inbound call received from SIP server' },
  { event: 'outgoing', mappedStatus: 'ringing', direction: 'outbound', description: 'Outbound call initiated from the CMS' },
  { event: 'answered', mappedStatus: 'in-progress', direction: '—', description: 'Call was answered (200 OK received)' },
  { event: 'ended', mappedStatus: 'completed', direction: '—', description: 'Call terminated normally (BYE received)' },
  { event: 'missed', mappedStatus: 'missed', direction: 'inbound', description: 'Call was not answered before timeout' },
  { event: 'failed', mappedStatus: 'failed', direction: '—', description: 'Call failed due to network or server error' },
  { event: 'hold', mappedStatus: 'in-progress', direction: '—', description: 'Call placed on hold' },
  { event: 'unhold', mappedStatus: 'in-progress', direction: '—', description: 'Call resumed from hold' },
];

const socketEvents = [
  {
    event: 'call-event',
    description: 'Broadcast to agents and managers when any call event occurs',
    payload: { event: 'string', call_id: 'uuid', caller: 'string', callee: 'string', status: 'string', duration: 'number', timestamp: 'ISO8601', direction: 'string', intercom_number: 'string|null', lead_id: 'number|null', lead_name: 'string|null' },
  },
  {
    event: 'incoming-call',
    description: 'Sent when a new incoming call arrives (ringing/initiated) — triggers the call popup UI',
    payload: { call: { id: 'uuid', caller_number: 'string', direction: 'string', status: 'string', duration: 'number', intercom_number: 'string|null' }, leadInfo: { id: 'number|null', name: 'string|null', phone: 'string|null', uhid: 'string|null', callStats: { totalCalls: 'number', missedCalls: 'number' } } | null },
  },
];

const SIPIntegration = () => {
  const [expandedEndpoint, setExpandedEndpoint] = useState(null);

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">SIP & Calls API</h1>
      <p className="text-gray-600 mb-8">
        Unified call management API for telephony integration, SIP event handling, manual call logging,
        and real-time call monitoring via Socket.IO events.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Overview</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Calls API provides a unified interface for managing call data from multiple sources:
          telephony vendor webhooks, SIP server events, and manual user entries. All calls are stored
          in the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">telephony_call_logs</code> table
          and support real-time broadcasting via Socket.IO.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Endpoints', value: '9', color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { label: 'Auth Methods', value: 'HMAC + JWT', color: 'bg-purple-50 text-purple-700 border-purple-200' },
            { label: 'Call Statuses', value: '6', color: 'bg-green-50 text-green-700 border-green-200' },
          ].map(s => (
            <div key={s.label} className={`${s.color} border rounded-lg px-4 py-3 text-center`}>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-purple-800 font-medium mb-1">Key Capabilities</p>
          <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
            <li>Telephony vendor webhook with HMAC-SHA256 signature verification</li>
            <li>SIP event processing with automatic call lifecycle management</li>
            <li>Automatic lead lookup by phone number on all inbound events</li>
            <li>Real-time Socket.IO events for call popups and live monitoring</li>
            <li>Intercom-based call routing — events delivered only to the assigned agent</li>
            <li>Rich call statistics with non-admin scoping</li>
            <li>Backward-compatible legacy endpoints for existing integrations</li>
          </ul>
        </div>
      </section>

      {/* Authentication */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Authentication</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Calls API supports two authentication methods depending on the endpoint:
        </p>
        <div className="space-y-3">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST /api/calls/inbound</span>
              HMAC-SHA256 Signature
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              The inbound webhook endpoint authenticates via an HMAC-SHA256 signature sent in the
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono mx-1">X-Webhook-Signature</code> header.
            </p>
            <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
              <pre className="text-xs text-gray-300 font-mono"><code>{`// Generate the signature (Node.js example)
const crypto = require('crypto');
const body = JSON.stringify(payload);
const secret = process.env.TELEPHONY_WEBHOOK_SECRET;
const signature = crypto.createHmac('sha256', secret)
  .update(body)
  .digest('hex');

// Send with the request
fetch('https://your-server.com/api/calls/inbound', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': signature,
  },
  body: body,
});`}</code></pre>
            </div>
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2">
              <p className="text-xs text-amber-800">
                <strong>Fallback:</strong> In development mode (<code className="bg-amber-100 px-1 rounded">NODE_ENV=development</code>),
                the HMAC check is skipped. In production, you can also authenticate via JWT Bearer token
                as an alternative.
              </p>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">All Other Endpoints</span>
              JWT Bearer Token
            </h4>
            <p className="text-sm text-gray-700">
              All other calls endpoints require a valid JWT token in the
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono mx-1">Authorization</code> header.
              Obtain a token via <code className="bg-gray-100 px-1 rounded text-sm font-mono">POST /api/auth/login</code>.
            </p>
            <div className="bg-gray-900 rounded-lg p-3 mt-2 overflow-x-auto">
              <pre className="text-xs text-gray-300 font-mono"><code>{`Authorization: Bearer <your-jwt-token>`}</code></pre>
            </div>
          </div>
        </div>
      </section>

      {/* Intercom-based Routing */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Intercom-based Call Routing</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The system supports routing calls to specific agents using the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">intercom_number</code> field.
          This is critical for ensuring incoming call popups and socket events are delivered to the correct agent.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border border-green-200 bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800">
              With intercom_number: <code className="bg-green-100 px-1 rounded">"1002"</code>
            </p>
            <p className="text-xs text-green-700 mt-1">
              Only Agent B (assigned intercom 1002) receives the call popup and socket events.
              Lead info and call stats are pre-fetched for the popup.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-800">
              Without intercom_number
            </p>
            <p className="text-xs text-gray-600 mt-1">
              All users with <code className="bg-gray-100 px-1 rounded">calls:receive_sip_events</code> permission
              receive the event (fallback broadcast).
            </p>
          </div>
        </div>
      </section>

      {/* Call Statuses */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Call Statuses</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Calls progress through these statuses during their lifecycle. The status field is
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono mx-1">call_status</code> in the database
          and response payloads, with <code className="bg-gray-100 px-1 rounded text-sm font-mono">status</code> available
          as a backward-compatible alias.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {callStatuses.map(s => (
            <div key={s.status} className={`${s.color} p-3 rounded-lg border border-transparent`}>
              <p className="font-medium text-sm">{s.status}</p>
              <p className="text-xs mt-1 opacity-80">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SIP Event Mapping */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">SIP Event to Status Mapping</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          When using the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">POST /api/calls/sip-event</code> endpoint,
          the event type is automatically mapped to the appropriate call status and direction.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Event</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Mapped Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Direction</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sipEventMap.map(row => (
                <tr key={row.event} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-purple-700">{row.event}</td>
                  <td className="px-4 py-2"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{row.mappedStatus}</span></td>
                  <td className="px-4 py-2 text-gray-600">{row.direction}</td>
                  <td className="px-4 py-2 text-gray-600">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* API Endpoints */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">API Endpoints</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          9 endpoints covering webhook reception, SIP event processing, manual logging, call listing,
          statistics, phone lookup, status updates, and backward-compatible legacy endpoints.
        </p>

        <div className="space-y-3">
          {endpoints.map((ep, i) => {
            const colors = methodColors[ep.method] || methodColors.GET;
            const isExpanded = expandedEndpoint === i;

            return (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedEndpoint(isExpanded ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className={`${colors.bg} ${colors.text} px-2.5 py-0.5 rounded text-xs font-bold font-mono flex-shrink-0`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-gray-800 flex-1">{ep.path}</code>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex-shrink-0">{ep.auth}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div className="px-4 pb-3">
                  <p className="text-sm text-gray-600 ml-[76px]">{ep.summary}</p>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
                    {/* Request Body */}
                    {ep.body && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Request Body</h4>
                        <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                          <pre className="text-xs text-gray-300 font-mono"><code>{JSON.stringify(ep.body, null, 2)}</code></pre>
                        </div>
                      </div>
                    )}

                    {/* Query Params */}
                    {ep.params && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Query Parameters</h4>
                        <div className="flex flex-wrap gap-2">
                          {ep.params.split(', ').map(param => (
                            <code key={param} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs font-mono text-gray-700">
                              {param}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response */}
                    {ep.response && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Response</h4>
                        <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                          <pre className="text-xs text-gray-300 font-mono"><code>{JSON.stringify(ep.response, null, 2)}</code></pre>
                        </div>
                      </div>
                    )}

                    {/* Status Codes */}
                    {ep.statuses && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status Codes</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(ep.statuses).map(([code, desc]) => (
                            <span key={code} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs font-mono text-gray-700">
                              <span className="font-bold">{code}</span>: {desc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {ep.note && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                          <strong>Note:</strong> {ep.note}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Socket.IO Events */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Real-time Socket.IO Events</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Call events are broadcast in real-time via Socket.IO. The server emits two types of events
          that are received by agents and managers. Events are routed to specific users based on
          intercom_number when provided.
        </p>

        {socketEvents.map(se => (
          <div key={se.event} className="border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-1">
              <code className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-sm font-mono">{se.event}</code>
            </h4>
            <p className="text-sm text-gray-700 mb-3">{se.description}</p>
            <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
              <pre className="text-xs text-gray-300 font-mono"><code>{JSON.stringify(se.payload, null, 2)}</code></pre>
            </div>
          </div>
        ))}
      </section>

      {/* Notifications */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Notification Triggers</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The system generates real-time notifications for various call events, delivered to users with
          the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">calls:receive_sip_events</code> permission.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Event</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Title Format</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Source Endpoint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50"><td className="px-4 py-2 font-mono text-sm">completed</td><td className="px-4 py-2"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">info</span></td><td className="px-4 py-2 text-gray-600">Call completed from {'{number}'} (name)</td><td className="px-4 py-2 text-gray-600 font-mono text-xs">/inbound</td></tr>
              <tr className="hover:bg-gray-50"><td className="px-4 py-2 font-mono text-sm">missed</td><td className="px-4 py-2"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">warning</span></td><td className="px-4 py-2 text-gray-600">Missed call from {'{number}'} (name)</td><td className="px-4 py-2 text-gray-600 font-mono text-xs">/inbound, /sip-event, POST /calls</td></tr>
              <tr className="hover:bg-gray-50"><td className="px-4 py-2 font-mono text-sm">incoming</td><td className="px-4 py-2"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">info</span></td><td className="px-4 py-2 text-gray-600">Incoming call from {'{number}'} (name)</td><td className="px-4 py-2 text-gray-600 font-mono text-xs">/inbound, /sip-event</td></tr>
              <tr className="hover:bg-gray-50"><td className="px-4 py-2 font-mono text-sm">answered</td><td className="px-4 py-2"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">success</span></td><td className="px-4 py-2 text-gray-600">Call answered: {'{number}'} (name)</td><td className="px-4 py-2 text-gray-600 font-mono text-xs">/sip-event</td></tr>
              <tr className="hover:bg-gray-50"><td className="px-4 py-2 font-mono text-sm">ended</td><td className="px-4 py-2"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">info</span></td><td className="px-4 py-2 text-gray-600">Call ended: {'{number}'} (name) ({'{duration}'}s)</td><td className="px-4 py-2 text-gray-600 font-mono text-xs">/sip-event</td></tr>
              <tr className="hover:bg-gray-50"><td className="px-4 py-2 font-mono text-sm">ringing/initiated</td><td className="px-4 py-2"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">info</span></td><td className="px-4 py-2 text-gray-600">Incoming call from {'{number}'} (name)</td><td className="px-4 py-2 text-gray-600 font-mono text-xs">/inbound</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Lead Auto-Linking */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Lead Auto-Linking</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          When a call is received or logged, the system automatically looks up a lead by the caller's
          phone number. If found, the call is linked to that lead, enabling rich context in the UI.
        </p>
        <div className="space-y-3">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">How it works</h4>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Call arrives via webhook, SIP event, or manual entry</li>
              <li>System queries <code className="bg-gray-100 px-1 rounded">leads</code> table by <code className="bg-gray-100 px-1 rounded">phone</code> or <code className="bg-gray-100 px-1 rounded">alternate_contact</code></li>
              <li>If a lead matches, <code className="bg-gray-100 px-1 rounded">lead_id</code> is set on the call record</li>
              <li>Lead info (<code className="bg-gray-100 px-1 rounded">name</code>, <code className="bg-gray-100 px-1 rounded">phone</code>) is included in responses and socket events</li>
              <li>For SIP incoming events, enriched lead info includes call stats (total+missed count)</li>
              <li>Manual call logs also update <code className="bg-gray-100 px-1 rounded">leads.last_call_date</code></li>
            </ol>
          </div>
        </div>
      </section>

      {/* Error Handling */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Error Handling</h2>
        <p className="text-gray-700 mb-4">All endpoints return consistent error responses in the following format:</p>
        <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
          <pre className="text-sm text-gray-300 font-mono"><code>{`{
  "status": "error",
  "message": "Human-readable error message",
  "code": "ERROR_CODE"    // Optional — machine-readable error code
}`}</code></pre>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Error Code</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50"><td className="px-4 py-2"><code className="text-xs font-mono">400</code></td><td className="px-4 py-2 font-mono text-xs text-gray-700">—</td><td className="px-4 py-2 text-gray-600">Validation error — missing or invalid required fields</td></tr>
              <tr className="hover:bg-gray-50"><td className="px-4 py-2"><code className="text-xs font-mono">401</code></td><td className="px-4 py-2 font-mono text-xs text-gray-700">—</td><td className="px-4 py-2 text-gray-600">Missing or invalid JWT token / HMAC signature</td></tr>
              <tr className="hover:bg-gray-50"><td className="px-4 py-2"><code className="text-xs font-mono">404</code></td><td className="px-4 py-2 font-mono text-xs text-gray-700">CALL_NOT_FOUND</td><td className="px-4 py-2 text-gray-600">Call log not found (PUT /calls/:id)</td></tr>
              <tr className="hover:bg-gray-50"><td className="px-4 py-2"><code className="text-xs font-mono">409</code></td><td className="px-4 py-2 font-mono text-xs text-gray-700">—</td><td className="px-4 py-2 text-gray-600">Duplicate vendor_call_id (POST /calls/inbound)</td></tr>
              <tr className="hover:bg-gray-50"><td className="px-4 py-2"><code className="text-xs font-mono">500</code></td><td className="px-4 py-2">CALLS_FETCH_ERROR, CALL_STATS_ERROR, CALL_HISTORY_ERROR, CALL_LOG_ERROR, CALL_UPDATE_ERROR, SIP_EVENT_ERROR, TELEPHONY_LOGS_ERROR, TELEPHONY_STATS_ERROR</td><td className="px-4 py-2 text-gray-600">Internal server error — check server logs for details</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Testing */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Testing</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Calls API includes comprehensive test coverage:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">Unit Tests</h4>
            <p className="text-xs text-gray-600 mb-2">37 vitest tests with proxyquire-based CJS mocking</p>
            <div className="bg-gray-900 rounded p-2 overflow-x-auto">
              <pre className="text-xs text-gray-300 font-mono"><code>{`cd server
npx vitest run`}</code></pre>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">E2E Tests</h4>
            <p className="text-xs text-gray-600 mb-2">39 scenario tests against the running server</p>
            <div className="bg-gray-900 rounded p-2 overflow-x-auto">
              <pre className="text-xs text-gray-300 font-mono"><code>{`# Ensure server is running
node tests/e2e/e2e-test-calls.js`}</code></pre>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">Postman Collection</h4>
            <p className="text-xs text-gray-600 mb-2">API requests for all call endpoints</p>
            <div className="bg-gray-900 rounded p-2 overflow-x-auto">
              <pre className="text-xs text-gray-300 font-mono"><code>{`# Import in Postman
server/postman-telephony-webhook.json`}</code></pre>
            </div>
          </div>
        </div>
      </section>

      {/* Postman Setup */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Postman Setup Guide</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          A complete Postman collection is available at <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">server/postman-telephony-webhook.json</code>.
        </p>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Import Collection', desc: 'Open Postman → File → Import → Upload the telephony-webhook JSON file.' },
            { step: '2', title: 'Set Environment Variables', desc: 'The collection uses {{baseUrl}} (default: http://localhost:5000), {{webhookSecret}} (HMAC signing key), and {{authToken}} (auto-populated via Login request).' },
            { step: '3', title: 'Run Login First', desc: 'Execute the "Login" request under the Auth folder. The JWT token is automatically saved to {{authToken}} via Postman test scripts.' },
            { step: '4', title: 'Test Webhooks', desc: 'Run the webhook requests — each auto-generates the HMAC signature using CryptoJS in the Pre-request Script.' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold">{s.step}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{s.title}</p>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800">
            <strong>Tip:</strong> The collection includes HMAC-signed webhook requests, validation error tests,
            duplicate detection, SIP event lifecycle (incoming → answered → ended), manual logging,
            call listing with filters, statistics, phone lookup, and update operations.
          </p>
        </div>
      </section>
    </div>
  );
};

export default SIPIntegration;
