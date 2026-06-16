'use strict';

// ── Environment setup ──
process.env.JWT_SECRET = 'test-secret-key-for-vitest';
process.env.NODE_ENV = 'development';
process.env.TELEPHONY_WEBHOOK_SECRET = '';
// VAC_WEBHOOK_SECRET intentionally not set — dev mode allows all

const express = require('express');
const request = require('supertest');
const proxyquire = require('proxyquire');

// ── Helpers ──

const createMockIo = () => {
  const emitFn = vi.fn();
  const toFn = vi.fn().mockReturnValue({ emit: emitFn });
  return { to: toFn, emitFn };
};

function createVacPopupApp(dbMock, io = createMockIo()) {
  const router = proxyquire('../../routes/telephonyCalls', {
    '../config/database': dbMock,
  });

  const app = express();
  app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
  app.set('io', io);
  app.use('/api/calls', router);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/calls/vac/webhook/popup  — VAC Call Popup webhook
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/calls/vac/webhook/popup', () => {
  const VAC_PHONE = '+919876543210';
  const VAC_AGENT_ID = 'AGT-101';

  const LEAD_RECORD = { id: 42, name: 'Priya Sharma', phone: VAC_PHONE, uhid: 'UHID-042' };
  const USER_RECORD = { id: 5, name: 'Dr. Mehta' };

  const validPayload = {
    phone_number: VAC_PHONE,
    user: VAC_AGENT_ID,
    extension: '1001',
  };

  test('1. VAC popup with matching lead → incoming-call popup with enriched leadInfo', async () => {
    const db = { query: vi.fn() };
    const callId = 'vac-popup-001';
    const callRecord = {
      id: callId,
      caller_phone_number: VAC_PHONE,
      call_status: 'ringing',
    };

    db.query
      .mockResolvedValueOnce({ rows: [USER_RECORD] })                           // find CMS user by VAC agent ID
      .mockResolvedValueOnce({ rows: [LEAD_RECORD] })                           // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] })                            // INSERT call log
      .mockResolvedValueOnce({ rowCount: 1 })                                    // UPDATE code
      .mockResolvedValueOnce({ rows: [{ total_calls: 5, missed_calls: 1 }] });  // call stats

    const io = createMockIo();
    const app = createVacPopupApp(db, io);
    const res = await request(app)
      .post('/api/calls/vac/webhook/popup')
      .send(validPayload)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.call_id).toBe(callId);

    // Verify incoming-call popup was emitted
    const incomingCallEmit = io.emitFn.mock.calls.find(
      ([event]) => event === 'incoming-call'
    );
    expect(incomingCallEmit).toBeDefined();

    const popupPayload = incomingCallEmit[1];

    // Call details
    expect(popupPayload.call).toEqual(expect.objectContaining({
      id: callId,
      caller_number: VAC_PHONE,
      direction: 'inbound',
      status: 'ringing',
      intercom_number: VAC_AGENT_ID,
    }));

    // Enriched lead info with call stats
    expect(popupPayload.leadInfo).toEqual(expect.objectContaining({
      id: LEAD_RECORD.id,
      name: LEAD_RECORD.name,
      uhid: LEAD_RECORD.uhid,
      phone: LEAD_RECORD.phone,
      callStats: {
        totalCalls: 5,
        missedCalls: 1,
      },
    }));
  });

  test('2. VAC popup with NO matching lead → leadInfo is null', async () => {
    const db = { query: vi.fn() };
    const UNKNOWN_PHONE = '+911111111111';
    const callId = 'vac-popup-002';
    const callRecord = { id: callId, caller_phone_number: UNKNOWN_PHONE, call_status: 'ringing' };

    db.query
      .mockResolvedValueOnce({ rows: [USER_RECORD] })   // find CMS user
      .mockResolvedValueOnce({ rows: [] })                // lookupLead — no match
      .mockResolvedValueOnce({ rows: [callRecord] })     // INSERT
      .mockResolvedValueOnce({ rowCount: 1 });            // UPDATE code

    const io = createMockIo();
    const app = createVacPopupApp(db, io);
    const res = await request(app)
      .post('/api/calls/vac/webhook/popup')
      .send({ ...validPayload, phone_number: UNKNOWN_PHONE })
      .expect(200);

    expect(res.body.success).toBe(true);

    const incomingCallEmit = io.emitFn.mock.calls.find(
      ([event]) => event === 'incoming-call'
    );
    expect(incomingCallEmit).toBeDefined();
    expect(incomingCallEmit[1].leadInfo).toBeNull();
  });

  test('3. VAC popup → call-event also emitted with lead context', async () => {
    const db = { query: vi.fn() };
    const callId = 'vac-popup-003';
    const callRecord = { id: callId, caller_phone_number: VAC_PHONE, call_status: 'ringing' };

    db.query
      .mockResolvedValueOnce({ rows: [USER_RECORD] })   // find CMS user
      .mockResolvedValueOnce({ rows: [LEAD_RECORD] })   // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] })    // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })            // UPDATE code
      .mockResolvedValueOnce({ rows: [{ total_calls: 0, missed_calls: 0 }] }); // call stats

    const io = createMockIo();
    const app = createVacPopupApp(db, io);
    await request(app)
      .post('/api/calls/vac/webhook/popup')
      .send(validPayload)
      .expect(200);

    const callEventEmit = io.emitFn.mock.calls.find(
      ([event]) => event === 'call-event'
    );
    expect(callEventEmit).toBeDefined();

    const eventPayload = callEventEmit[1];
    expect(eventPayload).toEqual(expect.objectContaining({
      event: 'incoming',
      caller: VAC_PHONE,
      status: 'ringing',
      direction: 'inbound',
      lead_id: LEAD_RECORD.id,
      lead_name: LEAD_RECORD.name,
    }));
  });

  test('4. VAC popup → call log links lead_id from auto-lookup', async () => {
    const db = { query: vi.fn() };
    const callId = 'vac-popup-004';
    const callRecord = { id: callId, caller_phone_number: VAC_PHONE, call_status: 'ringing' };

    db.query
      .mockResolvedValueOnce({ rows: [USER_RECORD] })   // find CMS user
      .mockResolvedValueOnce({ rows: [LEAD_RECORD] })   // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] })    // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })            // UPDATE code
      .mockResolvedValueOnce({ rows: [{ total_calls: 0, missed_calls: 0 }] });

    const io = createMockIo();
    const app = createVacPopupApp(db, io);
    await request(app)
      .post('/api/calls/vac/webhook/popup')
      .send(validPayload)
      .expect(200);

    // Verify INSERT used the resolved lead_id
    const insertQuery = db.query.mock.calls.find(
      ([sql]) => sql.includes('INSERT INTO telephony_call_logs')
    );
    expect(insertQuery).toBeDefined();
    expect(insertQuery[1][4]).toBe(LEAD_RECORD.id); // lead_id = $5
  });

  test('5. VAC popup → notification sent via notifyByPermission', async () => {
    const db = { query: vi.fn() };
    const callId = 'vac-popup-005';
    const callRecord = { id: callId, caller_phone_number: VAC_PHONE, call_status: 'ringing' };

    db.query
      .mockResolvedValueOnce({ rows: [USER_RECORD] })   // find CMS user
      .mockResolvedValueOnce({ rows: [LEAD_RECORD] })   // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] })    // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })            // UPDATE code
      .mockResolvedValueOnce({ rows: [{ total_calls: 0, missed_calls: 0 }] });

    const io = createMockIo();
    const app = createVacPopupApp(db, io);
    await request(app)
      .post('/api/calls/vac/webhook/popup')
      .send(validPayload)
      .expect(200);

    // Total events: call-event + incoming-call = 2
    const allEvents = io.emitFn.mock.calls.map(([event]) => event);
    expect(allEvents).toContain('call-event');
    expect(allEvents).toContain('incoming-call');
    expect(allEvents.length).toBe(2);
  });

  test('6. VAC popup with no user found → fallback broadcast to all permitted users', async () => {
    const db = { query: vi.fn() };
    const callId = 'vac-popup-006';
    const callRecord = { id: callId, caller_phone_number: VAC_PHONE, call_status: 'ringing' };
    const fallbackUser = { id: 99, name: 'Fallback Agent' };

    db.query
      .mockResolvedValueOnce({ rows: [] })                // find CMS user — not found
      .mockResolvedValueOnce({ rows: [LEAD_RECORD] })    // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] })     // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })            // UPDATE code
      .mockResolvedValueOnce({ rows: [{ total_calls: 0, missed_calls: 0 }] }) // call stats
      .mockResolvedValueOnce({ rows: [fallbackUser] });  // getSipUsers fallback broadcast

    const io = createMockIo();
    const app = createVacPopupApp(db, io);
    const res = await request(app)
      .post('/api/calls/vac/webhook/popup')
      .send(validPayload)
      .expect(200);

    expect(res.body.success).toBe(true);

    // Fallback: socket events emitted to all permitted users
    expect(io.emitFn).toHaveBeenCalled();
    expect(io.to).toHaveBeenCalledWith('user_99');
  });

  test('7. VAC popup with missing phone_number → 400', async () => {
    const db = { query: vi.fn() };
    const app = createVacPopupApp(db);

    const res = await request(app)
      .post('/api/calls/vac/webhook/popup')
      .send({ user: VAC_AGENT_ID })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('8. VAC popup with missing user/extension → 400', async () => {
    const db = { query: vi.fn() };
    const app = createVacPopupApp(db);

    const res = await request(app)
      .post('/api/calls/vac/webhook/popup')
      .send({ phone_number: VAC_PHONE })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('9. VAC popup resolves user by intercom_number fallback', async () => {
    const db = { query: vi.fn() };
    const callId = 'vac-popup-009';
    const callRecord = { id: callId, caller_phone_number: VAC_PHONE, call_status: 'ringing' };
    // User found by intercom_number, not vac_agent_id
    const userByIntercom = { id: 7, name: 'Dr. Patel' };

    db.query
      .mockResolvedValueOnce({ rows: [userByIntercom] })  // find CMS user by intercom
      .mockResolvedValueOnce({ rows: [] })                 // lookupLead — no match
      .mockResolvedValueOnce({ rows: [callRecord] })      // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })              // UPDATE code

    const io = createMockIo();
    const app = createVacPopupApp(db, io);
    const res = await request(app)
      .post('/api/calls/vac/webhook/popup')
      .send({ phone_number: VAC_PHONE, user: '101' }) // '101' as intercom_number
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify user lookup was done
    const userLookup = db.query.mock.calls[0];
    expect(userLookup[0]).toContain('vac_agent_id');
    expect(userLookup[0]).toContain('intercom_number');
    expect(userLookup[1]).toContain('101');

    // Socket events emitted to the found user
    expect(io.to).toHaveBeenCalledWith('user_7');
  });

  test('10. VAC popup → callStats enrichment queries for matching lead', async () => {
    const db = { query: vi.fn() };
    const callId = 'vac-popup-010';
    const callRecord = { id: callId, caller_phone_number: VAC_PHONE, call_status: 'ringing' };

    db.query
      .mockResolvedValueOnce({ rows: [USER_RECORD] })   // find CMS user
      .mockResolvedValueOnce({ rows: [LEAD_RECORD] })   // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] })    // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })            // UPDATE code
      .mockResolvedValueOnce({                           // call stats
        rows: [{ total_calls: 12, missed_calls: 3 }],
      });

    const io = createMockIo();
    const app = createVacPopupApp(db, io);
    await request(app)
      .post('/api/calls/vac/webhook/popup')
      .send(validPayload)
      .expect(200);

    // Verify call stats query was executed with correct params
    const statsQuery = db.query.mock.calls.find(
      ([sql]) => sql.includes('COUNT(*)') && sql.includes('call_status')
    );
    expect(statsQuery).toBeDefined();
    expect(statsQuery[1]).toContain(VAC_PHONE);   // phone filter
    expect(statsQuery[1]).toContain(LEAD_RECORD.id); // lead_id filter

    // Verify enriched leadInfo in socket payload
    const incomingCallEmit = io.emitFn.mock.calls.find(
      ([event]) => event === 'incoming-call'
    );
    expect(incomingCallEmit[1].leadInfo.callStats).toEqual({
      totalCalls: 12,
      missedCalls: 3,
    });
  });
});
