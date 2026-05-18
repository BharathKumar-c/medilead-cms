const SIPIntegration = () => {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">SIP Integration</h1>
      <p className="text-gray-600 mb-8">
        VoIP calling integration for inbound and outbound calls with real-time event handling, call popups, and automatic lead lookup.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Overview</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          MediLead CMS integrates with SIP (Session Initiation Protocol) infrastructure to enable
          VoIP calling directly from the browser. Telecallers can receive incoming calls with automatic
          lead lookup, make outbound calls with a single click, and have all call activity logged
          automatically in the database.
        </p>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-800 font-medium mb-1">Key Capabilities</p>
          <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
            <li>Inbound and outbound VoIP calling via SIP.js</li>
            <li>Incoming call popup with automatic lead lookup by phone number</li>
            <li>Outbound click-to-call from any phone number in the system</li>
            <li>Real-time call event broadcasting via Socket.IO</li>
            <li>Full call logging with duration, status, and direction</li>
            <li>Webhook endpoint for Asterisk/FreePBX event integration</li>
          </ul>
        </div>
      </section>

      {/* Architecture */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Architecture</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The SIP integration follows a multi-layer architecture connecting the telephony server
          to the frontend application:
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`┌──────────────────────┐
│  Asterisk / FreePBX  │   SIP server handling telephony
│    (SIP Server)      │
└──────────┬───────────┘
           │  WebSocket (SIP over WS)
           v
┌──────────────────────┐
│    SIP.js Client     │   Frontend SIP library (useSip hook)
│  (Browser / React)   │
└──────────┬───────────┘
           │  HTTP API + Socket.IO
           v
┌──────────────────────┐
│   MediLead CMS API   │   Node/Express backend
│   (REST + Socket.IO) │
└──────────┬───────────┘
           │
           v
┌──────────────────────┐
│   PostgreSQL DB      │   Call logs, leads, notifications
└──────────────────────┘`}</code></pre>
        </div>
      </section>

      {/* Components */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Components</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The SIP integration is built from three main components:
        </p>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">useSip</code> Hook
            </h4>
            <p className="text-sm text-gray-700">
              Custom React hook wrapping the SIP.js User Agent. Manages SIP registration, session
              handling (incoming/outgoing), connection state, and call lifecycle events. Exposes
              methods like <code className="bg-gray-100 px-1 rounded">call(number)</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">answer()</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">hangup()</code>, and{' '}
              <code className="bg-gray-100 px-1 rounded">hold()</code>.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">CallPopup</code> Component
            </h4>
            <p className="text-sm text-gray-700">
              Renders the incoming call notification popup. Displays caller information, auto-looked-up
              lead details (if the caller's phone matches a known lead), and Accept/Reject action buttons.
              Appears as a floating overlay when a call arrives.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">Call Logs (Database)</h4>
            <p className="text-sm text-gray-700">
              The <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">call_logs</code> table
              stores every call event — caller/callee numbers, direction, status, duration, linked lead ID,
              SIP call ID, and notes. Powers the call history and reporting modules.
            </p>
          </div>
        </div>
      </section>

      {/* Incoming Call Flow */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Incoming Call Flow</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          When an inbound call arrives, the system follows this sequence:
        </p>
        <div className="space-y-3">
          {[
            { step: '1', title: 'SIP server receives call', desc: 'Asterisk/FreePBX receives the inbound call on the configured DID/trunk.' },
            { step: '2', title: 'WebSocket event', desc: 'SIP server sends an INVITE over the WebSocket connection to the browser.' },
            { step: '3', title: 'Frontend shows popup', desc: 'The useSip hook detects the incoming session and triggers the CallPopup component.' },
            { step: '4', title: 'Auto-lookup lead', desc: 'The system searches for a lead matching the caller\'s phone number via the API.' },
            { step: '5', title: 'Display lead details', desc: 'If found, the popup shows the lead\'s name, UHID, status, and last activity.' },
            { step: '6', title: 'Accept or Reject', desc: 'The telecaller clicks Accept (connects call) or Reject (sends to voicemail/ends).' },
            { step: '7', title: 'Call connected', desc: 'Audio streams between the caller and telecaller via WebRTC.' },
            { step: '8', title: 'Call ends', desc: 'Either party hangs up. Duration is calculated and the call log is stored.' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold">
                {s.step}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{s.title}</p>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Outgoing Call Flow */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Outgoing Call Flow</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Outbound calls are initiated by clicking a call button next to any phone number in the
          application (lead details, Lead Box table, etc.).
        </p>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Click call button', desc: 'User clicks the phone icon next to a number. SIP.js initiates an INVITE.' },
            { step: '2', title: 'Status: Ringing', desc: 'Call status updates to "Ringing" in the UI. SIP server routes the call to the PSTN.' },
            { step: '3', title: 'Status: Connected', desc: 'When the callee answers, WebRTC audio streams are established.' },
            { step: '4', title: 'Status: Disconnected', desc: 'Call ends. Duration is calculated from connection to disconnection.' },
            { step: '5', title: 'Log stored', desc: 'Call details (numbers, direction, status, duration, lead link) saved to call_logs.' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">
                {s.step}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{s.title}</p>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Webhook Events */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Webhook Events</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The backend exposes a webhook endpoint for the SIP server (Asterisk/FreePBX) to report
          call events. This ensures call data is captured even if the browser disconnects.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`POST /api/calls/sip-event

// Payload
{
  "event": "incoming",     // incoming | outgoing | answered | ended | missed
  "call_id": "sip-abc123", // Unique SIP call identifier
  "caller": "9876543210",  // Caller phone number
  "callee": "1800123456",  // Callee phone number (your DID)
  "status": "ringing",     // Current call status
  "duration": 0            // Duration in seconds (0 for new calls)
}`}</code></pre>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Event</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Description</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">When Triggered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="px-4 py-2 font-mono text-purple-700">incoming</td><td className="px-4 py-2 text-gray-600">New inbound call received</td><td className="px-4 py-2 text-gray-600">SIP server receives INVITE</td></tr>
              <tr><td className="px-4 py-2 font-mono text-purple-700">outgoing</td><td className="px-4 py-2 text-gray-600">New outbound call initiated</td><td className="px-4 py-2 text-gray-600">User clicks call button</td></tr>
              <tr><td className="px-4 py-2 font-mono text-purple-700">answered</td><td className="px-4 py-2 text-gray-600">Call was answered</td><td className="px-4 py-2 text-gray-600">Callee picks up (200 OK)</td></tr>
              <tr><td className="px-4 py-2 font-mono text-purple-700">ended</td><td className="px-4 py-2 text-gray-600">Call terminated normally</td><td className="px-4 py-2 text-gray-600">Either party hangs up (BYE)</td></tr>
              <tr><td className="px-4 py-2 font-mono text-purple-700">missed</td><td className="px-4 py-2 text-gray-600">Call was not answered</td><td className="px-4 py-2 text-gray-600">Timeout or caller hung up before answer</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Real-time Updates */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Real-time Updates</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Call events are broadcast in real-time to managers and admins via Socket.IO. This enables
          live call monitoring dashboards and instant notifications for missed calls.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`// Socket.IO events emitted by the server
socket.on('call:incoming', (data) => {
  // data: { call_id, caller, callee, lead_name, lead_status }
});

socket.on('call:answered', (data) => {
  // data: { call_id, answered_by }
});

socket.on('call:ended', (data) => {
  // data: { call_id, duration, status }
});

socket.on('call:missed', (data) => {
  // data: { call_id, caller, missed_by }
});`}</code></pre>
        </div>
      </section>

      {/* Local Testing */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Local Testing with Zoiper</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          You can test the SIP integration locally using Zoiper, a free softphone application.
        </p>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Install Zoiper', desc: 'Download and install Zoiper 5 from zoiper.com. Available for Windows, macOS, and Linux.' },
            { step: '2', title: 'Configure SIP account', desc: 'Create a SIP account in Zoiper with the credentials from your Asterisk/FreePBX server (username, password, domain/hostname).' },
            { step: '3', title: 'Register with Asterisk', desc: 'Zoiper registers with the SIP server. Verify registration shows "Registered" in Zoiper and on the Asterisk CLI.' },
            { step: '4', title: 'Make test calls', desc: 'Call from Zoiper to another extension or DID to test inbound. Call from the CMS to Zoiper to test outbound.' },
            { step: '5', title: 'Verify webhook events', desc: 'Check that POST /api/calls/sip-event receives events. Monitor server logs for incoming payloads.' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-xs font-bold">
                {s.step}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{s.title}</p>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call Statuses */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Call Statuses</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Calls progress through these statuses during their lifecycle:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { status: 'Ringing', desc: 'Call is ringing on the callee\'s end. Awaiting answer.', color: 'bg-yellow-100 text-yellow-800' },
            { status: 'Connected', desc: 'Call is active. Audio streams are established between parties.', color: 'bg-green-100 text-green-800' },
            { status: 'Hold', desc: 'Call is on hold. Audio is paused (hold music may play).', color: 'bg-blue-100 text-blue-800' },
            { status: 'Disconnected', desc: 'Call has ended normally. Duration has been recorded.', color: 'bg-gray-100 text-gray-800' },
            { status: 'Missed', desc: 'Call was not answered before timeout or caller hung up.', color: 'bg-red-100 text-red-800' },
          ].map(s => (
            <div key={s.status} className={`p-3 rounded-lg ${s.color}`}>
              <p className="font-medium text-sm">{s.status}</p>
              <p className="text-xs mt-1 opacity-80">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Troubleshooting</h2>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Connection Issues</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Verify the WebSocket URL in <code className="bg-gray-100 px-1 rounded">.env</code> points to your SIP server</li>
              <li>Check that the SIP server's WebSocket transport is enabled (wss:// on port 443 or 8089)</li>
              <li>Ensure firewall rules allow WebSocket traffic between the browser and SIP server</li>
              <li>Check browser console for SIP.js registration errors</li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Audio Problems</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Grant microphone permissions when the browser prompts</li>
              <li>Check that SRTP (encrypted RTP) is properly configured if using TLS</li>
              <li>Verify NAT traversal settings — STUN/TURN servers may be required for remote users</li>
              <li>Test with headphones to eliminate echo/feedback</li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Registration Failures</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Verify SIP credentials (username, password) match the Asterisk/FreePBX configuration</li>
              <li>Check that the SIP domain resolves correctly from the browser's network</li>
              <li>Ensure the SIP extension is not already registered from another device</li>
              <li>Review Asterisk CLI (<code className="bg-gray-100 px-1 rounded">sip set debug on</code>) for detailed SIP message traces</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SIPIntegration;
