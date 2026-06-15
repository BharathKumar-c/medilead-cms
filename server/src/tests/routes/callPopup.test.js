'use strict';

// ── Environment setup ──
process.env.JWT_SECRET = 'test-secret-key-for-vitest';
process.env.NODE_ENV = 'development';
process.env.TELEPHONY_WEBHOOK_SECRET = '';

const express = require('express');
const request = require('supertest');
const proxyquire = require('proxyquire');

// ── Helpers ──

const createMockIo = () => {
  const emitFn = vi.fn();
  const toFn = vi.fn().mockReturnValue({ emit: emitFn });
  return { to: toFn, emitFn };
};

function createInboundApp(dbMock, io = createMockIo()) {
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
//  Incoming Call Popup — End-to-End Flow
// ─────────────────────────────────────────────────────────────────────────────
describe('Incoming Call Popup — Lead Match Flow', () => {
  const LEAD_PHONE = '+919876543210';
  const LEAD_RECORD = { id: 42, name: 'Priya Sharma', phone: LEAD_PHONE, uhid: 'UHID-042' };

  const vendorPayload = {
    caller_phone_number: LEAD_PHONE,
    call_status: 'ringing',
    timestamp: '2026-06-15T10:30:00.000Z',
    vendor_call_id: 'popup-test-' + Date.now(),
    duration_seconds: 0,
    direction: 'inbound',
    intercom_number: '101',
  };

  test('1. Inbound webhook with matching lead → call log links lead_id', async () => {
    const db = { query: vi.fn() };
    const callId = 'popup-call-001';
    const callRecord = {
      id: callId,
      caller_phone_number: LEAD_PHONE,
      call_status: 'ringing',
      intercom_number: '101',
      lead_id: LEAD_RECORD.id,
      code: null,
    };

    db.query
      .mockResolvedValueOnce({ rows: [LEAD_RECORD] })   // lookupLead — finds match
      .mockResolvedValueOnce({ rows: [callRecord] })     // INSERT call log
      .mockResolvedValueOnce({ rowCount: 1 })             // UPDATE code
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });     // getSipUsers

    const io = createMockIo();
    const app = createInboundApp(db, io);
    const res = await request(app)
      .post('/api/calls/inbound')
      .send(vendorPayload)
      .expect(201);

    expect(res.body.success).toBe(true);

    // Verify lead lookup was called with the caller phone
    const lookupQuery = db.query.mock.calls.find(
      ([sql]) => sql.includes('FROM leads WHERE phone')
    );
    expect(lookupQuery).toBeDefined();
    expect(lookupQuery[1]).toContain(LEAD_PHONE);

    // Verify INSERT used the resolved lead_id
    const insertQuery = db.query.mock.calls.find(
      ([sql]) => sql.includes('INSERT INTO telephony_call_logs')
    );
    expect(insertQuery).toBeDefined();
    expect(insertQuery[1][8]).toBe(LEAD_RECORD.id); // lead_id = $9
  });

  test('2. Socket emits "incoming-call" popup with leadInfo populated', async () => {
    const db = { query: vi.fn() };
    const callId = 'popup-call-002';
    const callRecord = {
      id: callId,
      caller_phone_number: LEAD_PHONE,
      call_status: 'ringing',
      intercom_number: '101',
      lead_id: LEAD_RECORD.id,
      code: null,
    };

    db.query
      .mockResolvedValueOnce({ rows: [LEAD_RECORD] })   // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] })     // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })             // UPDATE code
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });     // getSipUsers

    const io = createMockIo();
    const app = createInboundApp(db, io);
    await request(app)
      .post('/api/calls/inbound')
      .send(vendorPayload)
      .expect(201);

    // Verify incoming-call event was emitted
    expect(io.to).toHaveBeenCalledWith('user_1');

    const incomingCallEmit = io.emitFn.mock.calls.find(
      ([event]) => event === 'incoming-call'
    );
    expect(incomingCallEmit).toBeDefined();

    const popupPayload = incomingCallEmit[1];

    // Call details
    expect(popupPayload.call).toEqual(expect.objectContaining({
      id: callId,
      caller_number: LEAD_PHONE,
      direction: 'inbound',
      status: 'ringing',
      intercom_number: '101',
    }));

    // Lead info is populated (this is the key popup data)
    expect(popupPayload.leadInfo).toEqual({
      id: LEAD_RECORD.id,
      name: LEAD_RECORD.name,
      phone: LEAD_RECORD.phone,
    });
  });

  test('3. Socket also emits "call-event" with lead context', async () => {
    const db = { query: vi.fn() };
    const callId = 'popup-call-003';
    const callRecord = {
      id: callId,
      caller_phone_number: LEAD_PHONE,
      call_status: 'ringing',
      intercom_number: '101',
      lead_id: LEAD_RECORD.id,
      code: null,
    };

    db.query
      .mockResolvedValueOnce({ rows: [LEAD_RECORD] })   // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] })     // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })             // UPDATE code
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });     // getSipUsers

    const io = createMockIo();
    const app = createInboundApp(db, io);
    await request(app)
      .post('/api/calls/inbound')
      .send(vendorPayload)
      .expect(201);

    const callEventEmit = io.emitFn.mock.calls.find(
      ([event]) => event === 'call-event'
    );
    expect(callEventEmit).toBeDefined();

    const eventPayload = callEventEmit[1];
    expect(eventPayload).toEqual(expect.objectContaining({
      event: 'incoming',
      caller: LEAD_PHONE,
      status: 'ringing',
      direction: 'inbound',
      lead_id: LEAD_RECORD.id,
      lead_name: LEAD_RECORD.name,
    }));
  });

  test('4. Inbound webhook with NO matching lead → leadInfo is null', async () => {
    const db = { query: vi.fn() };
    const UNKNOWN_PHONE = '+911111111111';
    const callId = 'popup-call-004';
    const callRecord = {
      id: callId,
      caller_phone_number: UNKNOWN_PHONE,
      call_status: 'ringing',
      intercom_number: '101',
      lead_id: null,
      code: null,
    };

    db.query
      .mockResolvedValueOnce({ rows: [] })               // lookupLead — no match
      .mockResolvedValueOnce({ rows: [callRecord] })     // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })             // UPDATE code
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });     // getSipUsers

    const io = createMockIo();
    const app = createInboundApp(db, io);
    await request(app)
      .post('/api/calls/inbound')
      .send({ ...vendorPayload, caller_phone_number: UNKNOWN_PHONE, vendor_call_id: 'popup-test-unknown-' + Date.now() })
      .expect(201);

    const incomingCallEmit = io.emitFn.mock.calls.find(
      ([event]) => event === 'incoming-call'
    );
    expect(incomingCallEmit).toBeDefined();
    expect(incomingCallEmit[1].leadInfo).toBeNull();
  });

  test('5. Call status "completed" → no popup event (only "ended")', async () => {
    const db = { query: vi.fn() };
    const callId = 'popup-call-005';
    const callRecord = {
      id: callId,
      caller_phone_number: LEAD_PHONE,
      call_status: 'completed',
      intercom_number: '101',
      lead_id: LEAD_RECORD.id,
      code: null,
    };

    db.query
      .mockResolvedValueOnce({ rows: [LEAD_RECORD] })   // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] })     // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })             // UPDATE code
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });     // getSipUsers

    const io = createMockIo();
    const app = createInboundApp(db, io);
    await request(app)
      .post('/api/calls/inbound')
      .send({ ...vendorPayload, call_status: 'completed', duration_seconds: 120, vendor_call_id: 'popup-test-completed-' + Date.now() })
      .expect(201);

    // Should NOT emit incoming-call popup for completed calls
    const incomingCallEmit = io.emitFn.mock.calls.find(
      ([event]) => event === 'incoming-call'
    );
    expect(incomingCallEmit).toBeUndefined();

    // Should still emit call-event with "ended" status
    const callEventEmit = io.emitFn.mock.calls.find(
      ([event]) => event === 'call-event'
    );
    expect(callEventEmit).toBeDefined();
    expect(callEventEmit[1].event).toBe('ended');
  });

  test('6. Only "ringing" status triggers incoming-call popup', async () => {
    const db = { query: vi.fn() };
    const callId = 'popup-call-006';
    const callRecord = {
      id: callId,
      caller_phone_number: LEAD_PHONE,
      call_status: 'ringing',
      intercom_number: '101',
      lead_id: LEAD_RECORD.id,
      code: null,
    };

    db.query
      .mockResolvedValueOnce({ rows: [LEAD_RECORD] })   // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] })     // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })             // UPDATE code
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });     // getSipUsers

    const io = createMockIo();
    const app = createInboundApp(db, io);
    await request(app)
      .post('/api/calls/inbound')
      .send(vendorPayload)
      .expect(201);

    // Total socket events: call-event + incoming-call = 2
    const allEvents = io.emitFn.mock.calls.map(([event]) => event);
    expect(allEvents).toContain('call-event');
    expect(allEvents).toContain('incoming-call');
    expect(allEvents.length).toBe(2);
  });

  test('7. Duplicate vendor_call_id → 409, no popup emitted', async () => {
    const db = { query: vi.fn() };
    const duplicateError = new Error('duplicate key value violates unique constraint');
    duplicateError.code = '23505';
    duplicateError.constraint = 'telephony_call_logs_vendor_call_id_key';

    db.query
      .mockResolvedValueOnce({ rows: [LEAD_RECORD] })   // lookupLead
      .mockRejectedValueOnce(duplicateError);             // INSERT fails

    const io = createMockIo();
    const app = createInboundApp(db, io);
    const res = await request(app)
      .post('/api/calls/inbound')
      .send({ ...vendorPayload, vendor_call_id: 'duplicate-id' })
      .expect(409);

    expect(res.body.message).toBe('Duplicate call event');

    // No socket events should be emitted
    expect(io.emitFn).not.toHaveBeenCalled();
  });
});
