'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  Environment setup — must run before any imports
// ─────────────────────────────────────────────────────────────────────────────
process.env.JWT_SECRET = 'test-secret-key-for-vitest';
process.env.NODE_ENV = 'development';
process.env.TELEPHONY_WEBHOOK_SECRET = '';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const proxyquire = require('proxyquire');

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAuthToken(overrides = {}) {
  return jwt.sign(
    { id: overrides.id || 1, role: overrides.role || 'super_admin', email: overrides.email || 'admin@test.com', branch_id: overrides.branch_id || 1 },
    process.env.JWT_SECRET,
    { algorithm: 'HS256' }
  );
}

const createMockIo = () => ({ to: vi.fn().mockReturnValue({ emit: vi.fn() }) });

function makeDbCallRecord(overrides = {}) {
  return {
    id: overrides.id || '550e8400-e29b-41d4-a716-446655440000',
    caller_phone_number: overrides.caller_phone_number || '+919876543210',
    call_status: overrides.call_status || 'ringing',
    timestamp: overrides.timestamp || new Date().toISOString(),
    direction: overrides.direction || 'inbound',
    duration_seconds: overrides.duration_seconds != null ? overrides.duration_seconds : 0,
    intercom_number: overrides.intercom_number || null,
    lead_id: overrides.lead_id || null,
    vendor_call_id: overrides.vendor_call_id || null,
    recording_url: overrides.recording_url || null,
    code: overrides.code || null,
    user_id: overrides.user_id || null,
    notes: overrides.notes || null,
    received_at: overrides.received_at || new Date(),
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || null,
    raw_payload: overrides.raw_payload || null,
  };
}

function createApp(dbMock, io = createMockIo()) {
  // proxyquire injects the db mock into the route module
  // Route does: const { authenticate } = require('../middleware/auth')
  // So mock must export an object with `authenticate` property
  const router = proxyquire('../../routes/telephonyCalls', {
    '../config/database': dbMock,
    '../middleware/auth': {
      authenticate: (req, res, next) => {
        req.user = { id: 1, role: 'super_admin', email: 'admin@test.com', branch_id: 1, intercom_number: '101', department: 'Cardiology', is_active: true, roles: ['super_admin'] };
        next();
      },
    },
  });

  const app = express();
  app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
  app.set('io', io);
  app.use('/api/calls', router);
  return app;
}

function createUnauthenticatedApp(dbMock, io = createMockIo()) {
  const router = proxyquire('../../routes/telephonyCalls', {
    '../config/database': dbMock,
    '../middleware/auth': {
      authenticate: (req, res, next) => res.status(401).json({ status: 'error', message: 'Authentication required' }),
    },
  });

  const app = express();
  app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
  app.set('io', io);
  app.use('/api/calls', router);
  return app;
}

function createInboundApp(dbMock, io = createMockIo()) {
  // For the inbound webhook (HMAC-based, no JWT auth needed).
  // The inbound route does NOT use authenticate middleware, so we skip mocking it.
  const router = proxyquire('../../routes/telephonyCalls', {
    '../config/database': dbMock,
  });

  const app = express();
  app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
  app.set('io', io);
  app.use('/api/calls', router);
  return app;
}

function createNonAdminApp(dbMock, io = createMockIo()) {
  // Non-admin/manager user with intercom_number — tests intercom-based filtering
  const router = proxyquire('../../routes/telephonyCalls', {
    '../config/database': dbMock,
    '../middleware/auth': {
      authenticate: (req, res, next) => {
        req.user = { id: 2, role: 'telecaller', email: 'caller@test.com', branch_id: 1, intercom_number: '101', department: 'Cardiology', is_active: true, roles: ['telecaller'] };
        next();
      },
    },
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
//  POST /api/calls/inbound  — telephony vendor webhook
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/calls/inbound', () => {
  // Use a fixed suffix so tests can share validPayload without collisions
  const uid = Date.now();
  const validPayload = {
    caller_phone_number: '+919876543210',
    call_status: 'ringing',
    timestamp: '2025-06-01T12:00:00.000Z',
    vendor_call_id: 'vendor-test-001-' + uid,
    duration_seconds: 0,
    direction: 'inbound',
    intercom_number: '101',
  };

  const mockDb = () => ({ query: vi.fn() });

  test('creates a call log and returns 201', async () => {
    const db = mockDb();
    const callRecord = makeDbCallRecord({ caller_phone_number: '+919876543210', call_status: 'ringing', intercom_number: '101', vendor_call_id: validPayload.vendor_call_id });

    db.query
      .mockResolvedValueOnce({ rows: [] })        // lookupLead (no match)
      .mockResolvedValueOnce({ rows: [callRecord] }) // INSERT RETURNING
      .mockResolvedValueOnce({ rowCount: 1 })      // UPDATE code
      .mockResolvedValueOnce({ rows: [{ id: 2 }] }); // getSipUsers

    const app = createInboundApp(db);
    const res = await request(app)
      .post('/api/calls/inbound')
      .send(validPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(callRecord.id);
    expect(res.body.data.call_status).toBe('ringing');

    const insertCall = db.query.mock.calls.find(
      ([sql]) => sql.includes('INSERT INTO telephony_call_logs')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[1][0]).toBe('+919876543210');
    expect(insertCall[1][8]).toBeNull(); // lead_id ($9)
  });

  test('returns 409 for duplicate vendor_call_id', async () => {
    const db = mockDb();
    const duplicateError = new Error('duplicate key value violates unique constraint');
    duplicateError.code = '23505';
    duplicateError.constraint = 'telephony_call_logs_vendor_call_id_key';

    db.query
      .mockResolvedValueOnce({ rows: [] })         // lookupLead (no match)
      .mockRejectedValueOnce(duplicateError);       // INSERT fails – unique violation

    const app = createInboundApp(db);
    const res = await request(app)
      .post('/api/calls/inbound')
      .send({ ...validPayload, vendor_call_id: 'already-exists' })
      .expect(409);

    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Duplicate call event');
  });

  test('auto-links lead when caller phone matches existing lead', async () => {
    const db = mockDb();
    const callRecord = makeDbCallRecord({ caller_phone_number: '+919876543210', lead_id: 42, code: null });

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 42, name: 'Alice', phone: '+919876543210', uhid: 'UHID001' }] }) // lookupLead finds match
      .mockResolvedValueOnce({ rows: [callRecord] })   // INSERT RETURNING
      .mockResolvedValueOnce({ rowCount: 1 })          // UPDATE code
      .mockResolvedValueOnce({ rows: [{ id: 2 }] });   // getSipUsers

    const app = createInboundApp(db);
    const res = await request(app)
      .post('/api/calls/inbound')
      .send(validPayload)
      .expect(201);

    expect(res.body.success).toBe(true);

    const insertCall = db.query.mock.calls.find(
      ([sql]) => sql.includes('INSERT INTO telephony_call_logs')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[1][8]).toBe(42); // lead_id ($9)
  });

  test('emits socket events for incoming call', async () => {
    const db = mockDb();
    const io = createMockIo();
    const callRecord = makeDbCallRecord({ caller_phone_number: '+919876543210', call_status: 'ringing', intercom_number: '101', code: null });

    db.query
      .mockResolvedValueOnce({ rows: [] })           // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] })  // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })         // UPDATE code
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });  // getSipUsers

    const app = createInboundApp(db, io);
    await request(app)
      .post('/api/calls/inbound')
      .send(validPayload)
      .expect(201);

    // Should have emitted to user_1 room
    expect(io.to).toHaveBeenCalledWith('user_1');
    // call-event payload
    expect(io.to().emit).toHaveBeenCalledWith('call-event', expect.objectContaining({
      event: 'incoming',
      caller: '+919876543210',
    }));
    // incoming-call popup
    expect(io.to().emit).toHaveBeenCalledWith('incoming-call', expect.objectContaining({
      call: expect.objectContaining({
        caller_number: '+919876543210',
        direction: 'inbound',
        intercom_number: '101',
      }),
    }));
  });

  test('returns 400 for missing caller_phone_number', async () => {
    const db = mockDb();
    const app = createInboundApp(db);
    const { caller_phone_number, ...badPayload } = validPayload;

    const res = await request(app)
      .post('/api/calls/inbound')
      .send(badPayload)
      .expect(400);

    expect(res.body.status).toBe('error');
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.errors.some(e => e.field === 'caller_phone_number')).toBe(true);
  });

  test('returns 400 for invalid call_status', async () => {
    const db = mockDb();
    const app = createInboundApp(db);

    const res = await request(app)
      .post('/api/calls/inbound')
      .send({ ...validPayload, call_status: 'invalid_status' })
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('returns 400 for missing timestamp', async () => {
    const db = mockDb();
    const app = createInboundApp(db);
    const { timestamp, ...badPayload } = validPayload;

    const res = await request(app)
      .post('/api/calls/inbound')
      .send(badPayload)
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.errors.some(e => e.field === 'timestamp')).toBe(true);
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    const app = createInboundApp(db);
    db.query.mockRejectedValue(new Error('Connection lost'));

    const res = await request(app)
      .post('/api/calls/inbound')
      .send(validPayload)
      .expect(500);

    expect(res.body.status).toBe('error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/calls/sip-event  — SIP event webhook  (authenticated)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/calls/sip-event', () => {
  const mockDb = () => ({ query: vi.fn() });

  test('creates a new call log on incoming event', async () => {
    const db = mockDb();
    const callId = 'sip-create-' + Date.now();
    const callRecord = makeDbCallRecord({ vendor_call_id: callId, code: null });

    db.query
      .mockResolvedValueOnce({ rows: [] })           // lookupLead
      .mockResolvedValueOnce({ rows: [] })            // findExisting (call_id is set)
      .mockResolvedValueOnce({ rows: [callRecord] })  // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })         // UPDATE code
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });  // getSipUsers

    const app = createApp(db);
    const res = await request(app)
      .post('/api/calls/sip-event')
      .send({ event: 'incoming', caller: '9876543210', callee: '1234567890', call_id: callId })
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('SIP event processed.');
  });

  test('updates existing call on answered event', async () => {
    const db = mockDb();
    const existingCall = makeDbCallRecord({ vendor_call_id: 'sip-test-001', lead_id: null });

    db.query
      .mockResolvedValueOnce({ rows: [] })            // lookupLead
      .mockResolvedValueOnce({ rows: [existingCall] }) // findExisting
      .mockResolvedValueOnce({ rowCount: 1 })          // UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });   // getSipUsers

    const app = createApp(db);
    const res = await request(app)
      .post('/api/calls/sip-event')
      .send({ event: 'answered', call_id: 'sip-test-001', caller: '9876543210', duration: 45 })
      .expect(200);

    expect(res.body.status).toBe('success');

    const updateCall = db.query.mock.calls.find(
      ([sql]) => sql.includes('UPDATE telephony_call_logs SET')
    );
    expect(updateCall).toBeDefined();
    expect(updateCall[1][0]).toBe('in-progress');
  });

  test('returns 401 without auth token when auth bypass is disabled', async () => {
    const db = mockDb();
    const app = createUnauthenticatedApp(db);

    const res = await request(app)
      .post('/api/calls/sip-event')
      .send({ event: 'incoming', caller: '9876543210' })
      .expect(401);

    expect(res.body.status).toBe('error');
  });

  test('returns 400 for missing event type', async () => {
    const db = mockDb();
    const app = createApp(db);

    const res = await request(app)
      .post('/api/calls/sip-event')
      .send({ caller: '9876543210' })
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.errors.some(e => e.field === 'event')).toBe(true);
  });

  test('returns 400 for invalid event type', async () => {
    const db = mockDb();
    const app = createApp(db);

    const res = await request(app)
      .post('/api/calls/sip-event')
      .send({ event: 'unknown_event', caller: '9876543210' })
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Database connection failed'));

    const app = createApp(db);
    const res = await request(app)
      .post('/api/calls/sip-event')
      .send({ event: 'incoming', caller: '9876543210', call_id: 'sip-db-error' })
      .expect(500);

    expect(res.body.status).toBe('error');
    expect(res.body.code).toBe('SIP_EVENT_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/calls  — list call logs  (authenticated)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/calls', () => {
  const mockDb = () => ({ query: vi.fn() });

  test('returns empty list when no calls exist', async () => {
    const db = mockDb();
    db.query
      .mockResolvedValueOnce({ rows: [] })              // data query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // count query

    const app = createApp(db);
    const res = await request(app)
      .get('/api/calls')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.calls).toEqual([]);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.page).toBe(1);
  });

  test('returns paginated calls with lead and user info', async () => {
    const db = mockDb();
    const callRows = [
      { id: 'c1', caller_phone_number: '+911111111111', call_status: 'completed', duration_seconds: 30, direction: 'inbound', recording_url: null, timestamp: null, received_at: null, created_at: new Date(), vendor_call_id: null, code: 'CABCD1234', lead_id: 1, lead_name: 'Alice', lead_phone: '+911111111111', user_id: 1, user_name: 'Dr. Smith', notes: null, intercom_number: null },
      { id: 'c2', caller_phone_number: '+912222222222', call_status: 'missed', duration_seconds: 0, direction: 'outbound', recording_url: null, timestamp: null, received_at: null, created_at: new Date(), vendor_call_id: 'v-002', code: 'CEFGH5678', lead_id: null, lead_name: null, lead_phone: null, user_id: null, user_name: null, notes: null, intercom_number: null },
    ];

    db.query
      .mockResolvedValueOnce({ rows: callRows })         // data query
      .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // count query

    const app = createApp(db);
    const res = await request(app)
      .get('/api/calls?limit=10&page=1')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.calls).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.calls[0].id).toBe('c1');
    expect(res.body.data.calls[0].call_status).toBe('completed');
    expect(res.body.data.calls[0].status).toBe('completed');
    expect(res.body.data.calls[0].lead_name).toBe('Alice');
    expect(res.body.data.calls[0].user_name).toBe('Dr. Smith');
    expect(res.body.data.calls[1].call_status).toBe('missed');
  });

  test('filters by call status', async () => {
    const db = mockDb();
    db.query
      .mockResolvedValueOnce({ rows: [] })               // data query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // count query

    const app = createApp(db);
    await request(app)
      .get('/api/calls?status=missed')
      .expect(200);

    // data query is call index 0 (no auth queries needed since we bypass auth)
    expect(db.query.mock.calls[0][0]).toContain('tcl.call_status =');
    expect(db.query.mock.calls[0][1]).toContain('missed');
  });

  test('filters by direction', async () => {
    const db = mockDb();
    db.query
      .mockResolvedValueOnce({ rows: [] })               // data query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // count query

    const app = createApp(db);
    await request(app)
      .get('/api/calls?direction=inbound')
      .expect(200);

    expect(db.query.mock.calls[0][0]).toContain('tcl.direction =');
    expect(db.query.mock.calls[0][1]).toContain('inbound');
  });

  test('returns 401 without auth token', async () => {
    const db = mockDb();
    const app = createUnauthenticatedApp(db);

    const res = await request(app)
      .get('/api/calls')
      .expect(401);

    expect(res.body.status).toBe('error');
  });

  describe('intercom filtering (non-admin user)', () => {
    test('applies intercom_number filter for non-admin users', async () => {
      const db = mockDb();
      db.query
        .mockResolvedValueOnce({ rows: [] })               // data query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // count query

      const app = createNonAdminApp(db);
      const res = await request(app)
        .get('/api/calls')
        .expect(200);

      expect(res.body.data.calls).toEqual([]);
      // Verify intercom filter was applied to the data query
      expect(db.query.mock.calls[0][0]).toContain('tcl.intercom_number =');
      expect(db.query.mock.calls[0][1]).toContain('101');
    });

    test('returns only calls matching the user intercom_number', async () => {
      const db = mockDb();
      const callRows = [{
        id: 'c-ic-1', caller_phone_number: '+911111111111', call_status: 'completed',
        duration_seconds: 30, direction: 'inbound', recording_url: null,
        timestamp: null, received_at: null, created_at: new Date(),
        vendor_call_id: null, code: 'CIC01', lead_id: null,
        lead_name: null, lead_phone: null, user_id: null, user_name: null,
        notes: null, intercom_number: '101',
      }];

      db.query
        .mockResolvedValueOnce({ rows: callRows })          // data query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });  // count query

      const app = createNonAdminApp(db);
      const res = await request(app)
        .get('/api/calls')
        .expect(200);

      expect(res.body.data.calls).toHaveLength(1);
      expect(res.body.data.calls[0].intercom_number).toBe('101');
      expect(res.body.data.calls[0].id).toBe('c-ic-1');
    });

    test('admin users bypass intercom filter', async () => {
      const db = mockDb();
      const callRows = [{
        id: 'c-admin-all', caller_phone_number: '+912222222222', call_status: 'missed',
        duration_seconds: 0, direction: 'inbound', recording_url: null,
        timestamp: null, received_at: null, created_at: new Date(),
        vendor_call_id: null, code: 'CADM01', lead_id: null,
        lead_name: null, lead_phone: null, user_id: null, user_name: null,
        notes: null, intercom_number: '999',
      }];

      db.query
        .mockResolvedValueOnce({ rows: callRows })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const app = createApp(db); // createApp sets roles: ['super_admin']
      const res = await request(app)
        .get('/api/calls')
        .expect(200);

      expect(res.body.data.calls).toHaveLength(1);
      // Admin should see calls from all intercoms, including '999'
      expect(res.body.data.calls[0].intercom_number).toBe('999');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/calls/stats  — call statistics  (authenticated)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/calls/stats', () => {
  const mockDb = () => ({ query: vi.fn() });

  test('returns aggregated call stats', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [{ total_today: 10, inbound: 7, outbound: 3, missed_today: 2, avg_duration: 45 }],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/calls/stats')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.totalToday).toBe(10);
    expect(res.body.data.inbound).toBe(7);
    expect(res.body.data.outbound).toBe(3);
    expect(res.body.data.missedToday).toBe(2);
    expect(res.body.data.avgDuration).toBe(45);
  });

  test('returns zero stats when no calls today', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [{ total_today: 0, inbound: 0, outbound: 0, missed_today: 0, avg_duration: 0 }],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/calls/stats')
      .expect(200);

    expect(res.body.data.totalToday).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/calls/phone/:phone  — call history by phone  (authenticated)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/calls/phone/:phone', () => {
  const mockDb = () => ({ query: vi.fn() });

  test('returns call history for a phone number', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 'c1', caller_phone_number: '9876543210', direction: 'inbound', call_status: 'completed', duration_seconds: 45, created_at: new Date(), lead_name: 'Alice', lead_phone: '9876543210' },
        { id: 'c2', caller_phone_number: '9876543210', direction: 'outbound', call_status: 'missed', duration_seconds: 0, created_at: new Date(), lead_name: null, lead_phone: null },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/calls/phone/9876543210')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.calls).toHaveLength(2);
    expect(res.body.data.calls[0].status).toBe('completed');
    expect(res.body.data.calls[0].lead_name).toBe('Alice');
  });

  test('returns empty array for unknown number', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/calls/phone/0000000000')
      .expect(200);

    expect(res.body.data.calls).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/calls  — manual call logging  (authenticated)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/calls', () => {
  const mockDb = () => ({ query: vi.fn() });
  const validManualLog = { caller_number: '9876543210', direction: 'inbound' };

  test('creates a manual call log', async () => {
    const db = mockDb();
    const callRecord = makeDbCallRecord({ caller_phone_number: '9876543210', call_status: 'initiated', direction: 'inbound', code: null, user_id: 1 });

    db.query
      .mockResolvedValueOnce({ rows: [] })       // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] }) // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })     // UPDATE code
      .mockResolvedValueOnce({ rowCount: 1 });    // UPDATE leads.last_call_date

    const app = createApp(db);
    const res = await request(app)
      .post('/api/calls')
      .send(validManualLog)
      .expect(201);

    expect(res.body.status).toBe('success');
    expect(res.body.data.call.caller_number).toBe('9876543210');
    expect(res.body.data.call.call_status).toBe('initiated');
    expect(res.body.data.call.user_id).toBe(1);
  });

  test('returns 400 for missing caller_number', async () => {
    const db = mockDb();
    const app = createApp(db);

    const res = await request(app)
      .post('/api/calls')
      .send({ direction: 'inbound' })
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('returns 401 without auth token', async () => {
    const db = mockDb();
    const app = createUnauthenticatedApp(db);

    const res = await request(app)
      .post('/api/calls')
      .send(validManualLog)
      .expect(401);

    expect(res.body.status).toBe('error');
  });

  test('auto-links lead from caller number', async () => {
    const db = mockDb();
    const callRecord = makeDbCallRecord({ caller_phone_number: '9876543210', lead_id: 55, user_id: 1, code: null });

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 55, name: 'Bob', phone: '9876543210', uhid: 'UHID055' }] }) // lookupLead finds match
      .mockResolvedValueOnce({ rows: [callRecord] })                                                     // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })                                                             // UPDATE code
      .mockResolvedValueOnce({ rowCount: 1 });                                                            // UPDATE leads.last_call_date

    const app = createApp(db);
    const res = await request(app)
      .post('/api/calls')
      .send(validManualLog)
      .expect(201);

    expect(res.body.status).toBe('success');

    // Verify lead_id was set in the INSERT query ($5 = resolvedLeadId)
    const insertCall = db.query.mock.calls.find(
      ([sql]) => sql.includes('INSERT INTO telephony_call_logs')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[1][4]).toBe(55);

    // Verify leads.last_call_date was updated
    const lastCallDateUpdate = db.query.mock.calls.find(
      ([sql]) => sql.includes('UPDATE leads SET last_call_date')
    );
    expect(lastCallDateUpdate).toBeDefined();
    expect(lastCallDateUpdate[1][0]).toBe(55);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/calls/:id  — update call  (authenticated)
// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/calls/:id', () => {
  const mockDb = () => ({ query: vi.fn() });
  const callId = '550e8400-e29b-41d4-a716-446655440000';

  test('updates call status and returns updated record', async () => {
    const db = mockDb();
    const updatedCall = makeDbCallRecord({ id: callId, call_status: 'completed', duration_seconds: 60, notes: 'Patient confirmed' });

    db.query.mockResolvedValueOnce({ rows: [updatedCall] }); // UPDATE RETURNING

    const app = createApp(db);
    const res = await request(app)
      .put(`/api/calls/${callId}`)
      .send({ call_status: 'completed', duration_seconds: 60, notes: 'Patient confirmed' })
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.call.call_status).toBe('completed');
    expect(res.body.data.call.notes).toBe('Patient confirmed');
  });

  test('returns 404 when call not found', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] }); // UPDATE returns empty

    const app = createApp(db);
    const res = await request(app)
      .put(`/api/calls/${callId}`)
      .send({ call_status: 'completed' })
      .expect(404);

    expect(res.body.status).toBe('error');
    expect(res.body.code).toBe('CALL_NOT_FOUND');
  });

  test('returns 400 for invalid status', async () => {
    const db = mockDb();
    const app = createApp(db);

    const res = await request(app)
      .put(`/api/calls/${callId}`)
      .send({ call_status: 'unknown_status' })
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/calls/telephony  — backward compat list  (authenticated)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/calls/telephony', () => {
  const mockDb = () => ({ query: vi.fn() });

  test('returns paginated telephony call logs with masked numbers', async () => {
    const db = mockDb();
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 't1', caller_phone_number: '+911234567890', call_status: 'completed',
          duration_seconds: 30, direction: 'inbound', recording_url: null,
          timestamp: null, received_at: null, vendor_call_id: null,
          created_at: new Date(), lead_name: 'Alice', lead_phone: '+911234567890', lead_id: 1,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/calls/telephony')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.calls).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.calls[0].call_status).toBe('completed');
    expect(res.body.data.calls[0].caller_phone_number).toContain('*');
  });

  test('filters by phone number', async () => {
    const db = mockDb();
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const app = createApp(db);
    await request(app)
      .get('/api/calls/telephony?phone=9876')
      .expect(200);

    expect(db.query.mock.calls[0][0]).toContain('ILIKE');
    expect(db.query.mock.calls[0][1]).toContain('%9876%');
  });

  test('filters by status', async () => {
    const db = mockDb();
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const app = createApp(db);
    await request(app)
      .get('/api/calls/telephony?status=missed')
      .expect(200);

    expect(db.query.mock.calls[0][0]).toContain('t.call_status');
    expect(db.query.mock.calls[0][1]).toContain('missed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/calls/telephony/stats  — backward compat stats  (authenticated)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/calls/telephony/stats', () => {
  const mockDb = () => ({ query: vi.fn() });

  test('returns telephony stats', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [{ total_today: 5, inbound: 3, outbound: 2, missed_today: 1, avg_duration: 30 }],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/calls/telephony/stats')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.total_today).toBe(5);
    expect(res.body.data.inbound).toBe(3);
  });
});
