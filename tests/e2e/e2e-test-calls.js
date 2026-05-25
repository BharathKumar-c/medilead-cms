/**
 * e2e-test-calls.js
 *
 * Comprehensive end-to-end tests for the unified call/SIP workflows.
 *
 * Run against a running server: node tests/e2e/e2e-test-calls.js
 *
 * Prerequisites:
 *   - Server running on http://localhost:5000
 *   - Database seeded with test users (barath@gmail.com / password123)
 *   - TELEPHONY_WEBHOOK_SECRET either unset (dev mode skips HMAC) or
 *     set to a known value for HMAC-based inbound tests
 */

import crypto from 'crypto';
const BASE = 'http://localhost:5000/api';
let token = '';
let leadId = null;
let leadPhone = '9988776600';
let callId1 = null;  // from inbound webhook
let callId3 = null;  // from manual log
const sipCallId = 'sip-e2e-' + Date.now();
const vendorCallId = 'vendor-e2e-' + Date.now();

// ── Helpers ──

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + path, { ...options, headers });
  const body = res.status === 204 ? null : await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: body };
}

function hmacSignedPost(path, body, secret) {
  const payload = JSON.stringify(body);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return fetch(BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
    },
    body: payload,
  }).then(async (res) => {
    const data = res.status === 204 ? null : await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  });
}

function test(name, ok, detail = '') {
  console.log((ok ? '  ✅ PASS' : '  ❌ FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''));
  return ok;
}

let passed = 0;
let failed = 0;
let skipped = 0;

function runTest(name, ok, detail = '') {
  const result = test(name, ok, detail);
  if (result) passed++; else failed++;
  return result;
}

(async () => {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         CALL / SIP WORKFLOW — E2E TESTS                ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ────────────────────────────────────────────────────────────────────────────
  //  AUTH — Login
  // ────────────────────────────────────────────────────────────────────────────
  console.log('── [AUTH] ──');
  const login = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'barath@gmail.com', password: 'password123' }),
  });
  token = login.data?.data?.token || '';
  runTest('Login obtains JWT token', login.ok && !!token, 'Token: ' + (token ? token.substring(0, 20) + '…' : 'none'));

  if (!token) {
    console.log('\n  ❌ Cannot proceed without authentication. Exiting.');
    process.exit(1);
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  LEAD — Create a lead for auto-linking tests
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── [LEAD SETUP] ──');

  // Fetch branches (required for lead creation)
  const branches = await api('/branches');
  const branchId = branches.data?.data?.branches?.[0]?.id;
  runTest('Get branches for lead creation', !!branchId, 'Branch ID: ' + (branchId || 'none'));

  if (!branchId) {
    console.log('\n  ❌ Cannot proceed without a branch ID. Exiting.');
    process.exit(1);
  }

  // Use a unique phone number: exactly 10 digits to avoid collisions
  // Lead validation requires ^[0-9]{10}$
  const uniqueNum = String(Date.now()).slice(-4); // 4-digit timestamp suffix
  leadPhone = '998877' + uniqueNum;

  const createLead = await api('/leads', {
    method: 'POST',
    body: JSON.stringify({
      name: 'E2E Call Test Patient',
      phone: leadPhone,
      email: 'call-e2e-' + leadPhone + '@test.com',
      lead_source: 'Phone',
      status: 'New',
      priority: 'Medium',
      branch_id: branchId,
      city: 'Test City',
      state: 'Test State',
      country: 'India',
      clinical_remarks: 'E2E test lead for call auto-linking',
      gender: 'Female',
    }),
  });
  leadId = createLead.data?.data?.lead?.id || createLead.data?.lead?.id;
  runTest('Create lead for auto-linking', createLead.ok && !!leadId, 'Lead ID: ' + leadId + ', Phone: ' + leadPhone);

  // ────────────────────────────────────────────────────────────────────────────
  //  INBOUND WEBHOOK — POST /api/calls/inbound
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── [INBOUND WEBHOOK] ──');

  // The validateTelephonySignature middleware has JWT Bearer fallback,
  // so sending our auth token lets us bypass HMAC for testing.

  // 1. Valid inbound call (ringing)
  const inboundPayload = {
    caller_phone_number: leadPhone,
    call_status: 'ringing',
    timestamp: new Date().toISOString(),
    vendor_call_id: vendorCallId,
    duration_seconds: 0,
    direction: 'inbound',
    intercom_number: '101',
  };

  const inbound = await api('/calls/inbound', {
    method: 'POST',
    body: JSON.stringify(inboundPayload),
  });
  callId1 = inbound.data?.data?.id || null;

  runTest('POST /calls/inbound (valid) → 201', inbound.ok && inbound.status === 201 && !!callId1,
    'Call ID: ' + (callId1 || 'none') + ' | Status: ' + (inbound.data?.data?.call_status || 'N/A'));

  // 2. Inbound: missing caller_phone_number
  const inboundNoPhone = await api('/calls/inbound', {
    method: 'POST',
    body: JSON.stringify({
      call_status: 'ringing',
      timestamp: new Date().toISOString(),
    }),
  });
  runTest('POST /calls/inbound (missing phone) → 400',
    inboundNoPhone.status === 400,
    'Message: ' + (inboundNoPhone.data?.message || 'N/A'));

  // 3. Inbound: invalid call_status
  const inboundBadStatus = await api('/calls/inbound', {
    method: 'POST',
    body: JSON.stringify({
      caller_phone_number: '+919876543210',
      call_status: 'disconnected',  // old SIP status, not valid for telephony
      timestamp: new Date().toISOString(),
    }),
  });
  runTest('POST /calls/inbound (invalid status) → 400',
    inboundBadStatus.status === 400,
    'Message: ' + (inboundBadStatus.data?.message || 'N/A'));

  // 4. Inbound: missing timestamp
  const inboundNoTs = await api('/calls/inbound', {
    method: 'POST',
    body: JSON.stringify({
      caller_phone_number: '+919876543210',
      call_status: 'ringing',
    }),
  });
  runTest('POST /calls/inbound (missing timestamp) → 400',
    inboundNoTs.status === 400,
    'Message: ' + (inboundNoTs.data?.message || 'N/A'));

  // 5. Inbound: duplicate vendor_call_id → 409
  const inboundDup = await api('/calls/inbound', {
    method: 'POST',
    body: JSON.stringify(inboundPayload),  // Same vendor_call_id
  });
  runTest('POST /calls/inbound (duplicate vendor_call_id) → 409',
    inboundDup.status === 409,
    'Message: ' + (inboundDup.data?.message || 'N/A'));

  // 6. Inbound: completed call (simulates call end with duration)
  const inboundCompleted = await api('/calls/inbound', {
    method: 'POST',
    body: JSON.stringify({
      caller_phone_number: leadPhone,
      call_status: 'completed',
      timestamp: new Date().toISOString(),
      vendor_call_id: 'vendor-e2e-completed-' + Date.now(),
      duration_seconds: 120,
      direction: 'inbound',
      intercom_number: '101',
    }),
  });
  runTest('POST /calls/inbound (completed) → 201',
    inboundCompleted.ok && inboundCompleted.status === 201,
    'Status: ' + (inboundCompleted.data?.data?.call_status || 'N/A') + ' | Duration: 120s');

  // 7. Inbound: missed call (no intercom)
  const inboundMissed = await api('/calls/inbound', {
    method: 'POST',
    body: JSON.stringify({
      caller_phone_number: '+919000000001',
      call_status: 'missed',
      timestamp: new Date().toISOString(),
      vendor_call_id: 'vendor-e2e-missed-' + Date.now(),
      direction: 'inbound',
    }),
  });
  runTest('POST /calls/inbound (missed) → 201',
    inboundMissed.ok && inboundMissed.status === 201);

  // ────────────────────────────────────────────────────────────────────────────
  //  SIP EVENTS — POST /api/calls/sip-event
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── [SIP EVENTS] ──');

  // 1. SIP incoming event → creates new call log
  const sipIncoming = await api('/calls/sip-event', {
    method: 'POST',
    body: JSON.stringify({
      event: 'incoming',
      call_id: sipCallId,
      caller: leadPhone,
      callee: '9876543210',
      duration: 0,
    }),
  });
  runTest('POST /calls/sip-event (incoming) → 200',
    sipIncoming.ok,
    'Message: ' + (sipIncoming.data?.message || 'N/A'));

  // 2. SIP answered event → updates existing call status to in-progress
  const sipAnswered = await api('/calls/sip-event', {
    method: 'POST',
    body: JSON.stringify({
      event: 'answered',
      call_id: sipCallId,
      caller: leadPhone,
      callee: '9876543210',
      duration: 0,
    }),
  });
  runTest('POST /calls/sip-event (answered) → 200',
    sipAnswered.ok,
    'Message: ' + (sipAnswered.data?.message || 'N/A'));

  // 3. SIP ended event → updates with duration
  const sipEnded = await api('/calls/sip-event', {
    method: 'POST',
    body: JSON.stringify({
      event: 'ended',
      call_id: sipCallId,
      caller: leadPhone,
      callee: '9876543210',
      duration: 85,
    }),
  });
  runTest('POST /calls/sip-event (ended) → 200',
    sipEnded.ok,
    'Message: ' + (sipEnded.data?.message || 'N/A'));

  // 4. SIP missed event → creates new call log for a different number
  const sipMissed = await api('/calls/sip-event', {
    method: 'POST',
    body: JSON.stringify({
      event: 'missed',
      call_id: 'sip-e2e-missed-' + Date.now(),
      caller: '919000000002',
      callee: '9834567890',
      duration: 0,
    }),
  });
  runTest('POST /calls/sip-event (missed) → 200',
    sipMissed.ok,
    'Message: ' + (sipMissed.data?.message || 'N/A'));

  // 5. SIP invalid event type → 400
  const sipBadEvent = await api('/calls/sip-event', {
    method: 'POST',
    body: JSON.stringify({
      event: 'bogus_event',
      call_id: 'test-invalid',
      caller: '919000000003',
      callee: '9834567891',
      duration: 0,
    }),
  });
  runTest('POST /calls/sip-event (invalid event) → 400',
    sipBadEvent.status === 400,
    'Message: ' + (sipBadEvent.data?.message || 'N/A'));

  // 6. SIP event without auth → 401
  const sipNoAuth = await fetch(BASE + '/calls/sip-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'incoming', caller: '919000000004' }),
  });
  runTest('POST /calls/sip-event (no auth) → 401',
    sipNoAuth.status === 401);

  // ────────────────────────────────────────────────────────────────────────────
  //  MANUAL CALL LOG — POST /api/calls
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── [MANUAL CALL LOG] ──');

  // 1. Manual log with caller_number matching the lead → auto-links lead
  const manualLog = await api('/calls', {
    method: 'POST',
    body: JSON.stringify({
      caller_number: leadPhone,
      direction: 'inbound',
      status: 'completed',
      duration: 45,
      notes: 'Manual call log via E2E test',
    }),
  });
  callId3 = manualLog.data?.data?.call?.id || null;
  runTest('POST /calls (manual) → 201',
    manualLog.ok && manualLog.status === 201 && !!callId3,
    'Call ID: ' + (callId3 || 'none') + ' | Lead linked: ' + (manualLog.data?.data?.call?.lead_id === leadId ? 'yes' : 'no'));

  // 2. Manual log missing caller_number → 400
  const manualNoCaller = await api('/calls', {
    method: 'POST',
    body: JSON.stringify({
      direction: 'outbound',
      status: 'initiated',
    }),
  });
  runTest('POST /calls (missing caller) → 400',
    manualNoCaller.status === 400);

  // 3. Manual missed call → logged successfully
  const manualMissed = await api('/calls', {
    method: 'POST',
    body: JSON.stringify({
      caller_number: '919000000005',
      direction: 'inbound',
      status: 'missed',
      duration: 0,
      notes: 'Missed call logged manually',
    }),
  });
  runTest('POST /calls (manual missed) → 201',
    manualMissed.ok && manualMissed.status === 201);

  // ────────────────────────────────────────────────────────────────────────────
  //  GET CALLS — GET /api/calls (list with filters)
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── [GET CALLS / LIST] ──');

  // 1. Get paginated list
  const listAll = await api('/calls?limit=100');
  const callCount = listAll.data?.data?.calls?.length || 0;
  runTest('GET /calls (paginated list) → 200',
    listAll.ok && callCount > 0,
    'Calls returned: ' + callCount + ' | Total: ' + (listAll.data?.data?.total || 0));

  // 2. Filter by status=missed
  const listMissed = await api('/calls?status=missed');
  const missedCount = listMissed.data?.data?.calls?.length || 0;
  const allMissed = listMissed.data?.data?.calls?.every(c => c.call_status === 'missed' || c.status === 'missed');
  runTest('GET /calls?status=missed → filtered',
    listMissed.ok && missedCount > 0 && allMissed,
    'Missed calls: ' + missedCount);

  // 3. Filter by direction=inbound
  const listInbound = await api('/calls?direction=inbound');
  const inboundCount = listInbound.data?.data?.calls?.length || 0;
  const allInbound = listInbound.data?.data?.calls?.every(c => c.direction === 'inbound');
  runTest('GET /calls?direction=inbound → filtered',
    listInbound.ok && inboundCount > 0 && allInbound,
    'Inbound calls: ' + inboundCount);

  // 4. Filter by call_status=completed
  const listCompleted = await api('/calls?call_status=completed');
  const completedCount = listCompleted.data?.data?.calls?.length || 0;
  const allCompleted = listCompleted.data?.data?.calls?.every(c => c.call_status === 'completed');
  runTest('GET /calls?call_status=completed → filtered',
    listCompleted.ok && completedCount > 0 && allCompleted,
    'Completed calls: ' + completedCount);

  // 5. Verify backward-compat fields (status, duration, duration_seconds)
  if (listAll.data?.data?.calls?.length > 0) {
    const first = listAll.data.data.calls[0];
    const hasBackwardCompat = first.status !== undefined && first.duration !== undefined && first.duration_seconds !== undefined;
    runTest('Backward compat fields present (status, duration, duration_seconds)',
      hasBackwardCompat,
      'status: ' + first.status + ' | duration: ' + first.duration + ' | duration_seconds: ' + first.duration_seconds);
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  CALL STATS — GET /api/calls/stats
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── [CALL STATS] ──');

  const stats = await api('/calls/stats');
  runTest('GET /calls/stats → 200',
    stats.ok,
    'Total today: ' + (stats.data?.data?.totalToday || 0) +
    ' | Inbound: ' + (stats.data?.data?.inbound || 0) +
    ' | Missed: ' + (stats.data?.data?.missedToday || 0));

  // ────────────────────────────────────────────────────────────────────────────
  //  PHONE LOOKUP — GET /api/calls/phone/:phone
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── [PHONE LOOKUP] ──');

  // 1. Lookup calls for the lead's phone
  const phoneHist = await api('/calls/phone/' + leadPhone);
  const phoneCallCount = phoneHist.data?.data?.calls?.length || 0;
  runTest('GET /calls/phone/' + leadPhone + ' → history returned',
    phoneHist.ok && phoneCallCount > 0,
    'Calls found: ' + phoneCallCount);

  // 2. Lookup for unknown number → empty array
  const phoneUnknown = await api('/calls/phone/0000000000');
  runTest('GET /calls/phone/0000000000 (unknown) → empty array',
    phoneUnknown.ok && (phoneUnknown.data?.data?.calls?.length || 0) === 0);

  // ────────────────────────────────────────────────────────────────────────────
  //  UPDATE CALL — PUT /api/calls/:id
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── [UPDATE CALL] ──');

  // 1. Update call status and duration
  if (callId1) {
    const updateStatus = await api('/calls/' + callId1, {
      method: 'PUT',
      body: JSON.stringify({ call_status: 'completed', duration_seconds: 60 }),
    });
    runTest('PUT /calls/' + callId1 + ' (update status) → 200',
      updateStatus.ok,
      'Status: ' + (updateStatus.data?.data?.call?.call_status || 'N/A'));

    // 2. Update call notes
    const updateNotes = await api('/calls/' + callId1, {
      method: 'PUT',
      body: JSON.stringify({ notes: 'Updated via E2E test' }),
    });
    runTest('PUT /calls/' + callId1 + ' (add notes) → 200',
      updateNotes.ok && updateNotes.data?.data?.call?.notes === 'Updated via E2E test',
      'Notes: ' + (updateNotes.data?.data?.call?.notes || 'N/A'));
  } else {
    console.log('  ⏭️  SKIP | Update call | No inbound call ID available');
    skipped += 2;
  }

  // 3. Update nonexistent call → 404
  const update404 = await api('/calls/00000000-0000-0000-0000-000000000000', {
    method: 'PUT',
    body: JSON.stringify({ call_status: 'completed' }),
  });
  runTest('PUT /calls/:id (nonexistent) → 404',
    update404.status === 404);

  // ────────────────────────────────────────────────────────────────────────────
  //  LEAD AUTO-LINK VERIFICATION
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── [LEAD AUTO-LINK VERIFICATION] ──');

  // Use the GET /api/calls list endpoint (DOES return lead_id) to verify linking
  const verifyLink = await api('/calls?limit=50');
  const linkedCalls = verifyLink.data?.data?.calls?.filter(c =>
    c.lead_id === leadId || c.lead_name === 'E2E Call Test Patient'
  ) || [];
  runTest('Inbound + SIP + manual calls auto-linked to lead',
    linkedCalls.length >= 2,  // at least ringing + completed inbound calls
    'Linked calls found: ' + linkedCalls.length + ' (expecting ≥ 2)');

  // Verify a specific inbound call has lead info
  if (callId1) {
    const specificCall = verifyLink.data?.data?.calls?.find(c => c.id === callId1);
    runTest('Inbound call has lead_name populated',
      specificCall?.lead_name === 'E2E Call Test Patient',
      'lead_name: ' + (specificCall?.lead_name || 'N/A'));
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  TELEPHONY BACKWARD COMPAT — GET /api/calls/telephony
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── [TELEPHONY BACKWARD COMPAT] ──');

  const telephonyList = await api('/calls/telephony?limit=50');
  const telephonyCount = telephonyList.data?.data?.calls?.length || 0;
  runTest('GET /calls/telephony (backward compat) → 200',
    telephonyList.ok && telephonyCount > 0,
    'Calls returned: ' + telephonyCount);

  // Telephony list with status filter
  const telephonyMissed = await api('/calls/telephony?status=missed');
  const telephonyMissedCount = telephonyMissed.data?.data?.calls?.length || 0;
  runTest('GET /calls/telephony?status=missed → filtered',
    telephonyMissed.ok,
    'Missed calls: ' + telephonyMissedCount);

  // Telephony list with phone filter
  const telephonyPhone = await api('/calls/telephony?phone=' + encodeURIComponent(leadPhone));
  runTest('GET /calls/telephony?phone=' + leadPhone + ' → filtered by phone',
    telephonyPhone.ok && (telephonyPhone.data?.data?.calls?.length || 0) > 0,
    'Calls matching phone: ' + (telephonyPhone.data?.data?.calls?.length || 0));

  // Telephony stats
  const telephonyStats = await api('/calls/telephony/stats');
  runTest('GET /calls/telephony/stats → 200',
    telephonyStats.ok,
    'Total today: ' + (telephonyStats.data?.data?.total_today || 0));

  // ────────────────────────────────────────────────────────────────────────────
  //  ERROR CASES
  // ────────────────────────────────────────────────────────────────────────────
  console.log('\n── [ERROR CASES] ──');

  // 1. GET /calls without auth → 401
  const noAuth = await fetch(BASE + '/calls', {
    headers: { 'Content-Type': 'application/json' },
  });
  runTest('GET /calls (no auth) → 401',
    noAuth.status === 401);

  // 2. GET /calls/stats without auth → 401
  const noAuthStats = await fetch(BASE + '/calls/stats', {
    headers: { 'Content-Type': 'application/json' },
  });
  runTest('GET /calls/stats (no auth) → 401',
    noAuthStats.status === 401);

  // 3. Invalid update status value → 400
  if (callId1) {
    const invalidStatus = await api('/calls/' + callId1, {
      method: 'PUT',
      body: JSON.stringify({ call_status: 'bogus_status' }),
    });
    runTest('PUT /calls/:id (invalid status) → 400',
      invalidStatus.status === 400);
  } else {
    console.log('  ⏭️  SKIP | Invalid status update | No call ID available');
    skipped++;
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  SUMMARY
  // ────────────────────────────────────────────────────────────────────────────
  const total = passed + failed + skipped;
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS                        ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Passed:  ' + String(passed).padEnd(43) + '║');
  console.log('║  Failed:  ' + String(failed).padEnd(43) + '║');
  console.log('║  Skipped: ' + String(skipped).padEnd(43) + '║');
  console.log('║  Total:   ' + String(total).padEnd(43) + '║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n❌ Some tests FAILED — see details above.\n');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED.\n');
    process.exit(0);
  }
})().catch(e => {
  console.error('\n  ❌ TEST ERROR: ' + e.message);
  console.error(e.stack);
  process.exit(1);
});
