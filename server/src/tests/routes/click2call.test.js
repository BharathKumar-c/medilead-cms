'use strict';

// ── Environment setup ──
process.env.JWT_SECRET = 'test-secret-key-for-vitest';
process.env.NODE_ENV = 'development';
process.env.VAC_SERVER_URL = 'http://192.168.10.126';
process.env.VAC_API_TOKEN = 'test-vac-token';
process.env.VAC_TIMEOUT_MS = '5000';

const express = require('express');
const request = require('supertest');
const proxyquire = require('proxyquire');

// ── Helpers ──

const createMockIo = () => {
  const emitFn = vi.fn();
  const toFn = vi.fn().mockReturnValue({ emit: emitFn });
  return { to: toFn, emitFn };
};

function makeCallLogRecord(overrides = {}) {
  return {
    id: overrides.id || 'click2call-test-id',
    caller_phone_number: overrides.caller_phone_number || '9876543210',
    call_status: overrides.call_status || 'initiated',
    direction: overrides.direction || 'outbound',
    intercom_number: overrides.intercom_number || null,
    lead_id: overrides.lead_id || null,
    user_id: overrides.user_id || null,
    code: overrides.code || null,
  };
}

function createClick2CallApp(dbMock, io = createMockIo(), vacClientMock = null) {
  const mocks = {
    '../config/database': dbMock,
    '../middleware/auth': {
      authenticate: (req, res, next) => {
        req.user = {
          id: 1,
          role: 'super_admin',
          email: 'admin@test.com',
          branch_id: 1,
          intercom_number: '101',
          vac_agent_id: '1001',
          is_active: true,
          roles: ['super_admin'],
        };
        next();
      },
    },
  };

  // If vacClientMock is provided, mock the VAC client
  if (vacClientMock) {
    mocks['../services/vacClient'] = vacClientMock;
  }

  const router = proxyquire('../../routes/telephonyCalls', mocks);

  const app = express();
  app.use(express.json());
  app.set('io', io);
  app.use('/api/calls', router);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/calls/vac/click2call — _log_only mode
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/calls/vac/click2call — _log_only mode', () => {
  test('logs call to DB without calling VAC when _log_only is true', async () => {
    const db = { query: vi.fn() };
    const callRecord = makeCallLogRecord();

    db.query
      .mockResolvedValueOnce({ rows: [] })             // lookupLead — no match
      .mockResolvedValueOnce({ rows: [callRecord] })   // INSERT call log
      .mockResolvedValueOnce({ rowCount: 1 });          // UPDATE code

    const app = createClick2CallApp(db);
    const res = await request(app)
      .post('/api/calls/vac/click2call')
      .send({
        phone_number: '9876543210',
        _log_only: true,
        agent_id: '1001',
      })
      .expect(201);

    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Call logged successfully');
    expect(res.body.data.call_status).toBe('initiated');
    expect(res.body.data.direction).toBe('outbound');

    // Verify INSERT was called with correct params
    const insertCall = db.query.mock.calls.find(
      ([sql]) => sql.includes('INSERT INTO telephony_call_logs')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[1][0]).toBe('9876543210');  // phone_number
    expect(insertCall[1][1]).toBe('initiated');    // call_status
    expect(insertCall[1][2]).toBe('outbound');     // direction
    expect(insertCall[1][3]).toBe(1);              // user_id
    expect(insertCall[1][5]).toBe('1001');         // intercom_number = agent_id

    // Verify raw_payload contains log_only flag
    const rawPayload = insertCall[1][6];
    expect(rawPayload.vac_click2call).toBe(true);
    expect(rawPayload.log_only).toBe(true);
    expect(rawPayload.frontend_agent_id).toBe('1001');
  });

  test('does NOT call vacClient.click2Call in _log_only mode', async () => {
    const db = { query: vi.fn() };
    const callRecord = makeCallLogRecord();

    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [callRecord] })
      .mockResolvedValueOnce({ rowCount: 1 });

    // Mock vacClient — should NOT be called in log-only mode
    const vacClientMock = {
      vacClient: {
        isConfigured: vi.fn().mockReturnValue(true),
        click2Call: vi.fn(),  // Should not be called
      },
      VacError: class VacError extends Error {
        constructor(message, code) {
          super(message);
          this.code = code;
        }
      },
    };

    const app = createClick2CallApp(db, createMockIo(), vacClientMock);
    await request(app)
      .post('/api/calls/vac/click2call')
      .send({
        phone_number: '9876543210',
        _log_only: true,
        agent_id: '1001',
      })
      .expect(201);

    // VAC client should NOT have been called
    expect(vacClientMock.vacClient.click2Call).not.toHaveBeenCalled();
  });

  test('resolves agent_id from user profile when not provided in body', async () => {
    const db = { query: vi.fn() };
    const callRecord = makeCallLogRecord();

    db.query
      .mockResolvedValueOnce({ rows: [] })             // lookupLead
      .mockResolvedValueOnce({ rows: [{ vac_agent_id: '1001', intercom_number: '101', name: 'Admin' }] }) // resolveVacAgent
      .mockResolvedValueOnce({ rows: [callRecord] })   // INSERT
      .mockResolvedValueOnce({ rowCount: 1 });          // UPDATE code

    const app = createClick2CallApp(db);
    const res = await request(app)
      .post('/api/calls/vac/click2call')
      .send({
        phone_number: '9876543210',
        _log_only: true,
        // No agent_id in body — should resolve from user profile
      })
      .expect(201);

    expect(res.body.status).toBe('success');

    // Verify the INSERT used the resolved agent_id
    const insertCall = db.query.mock.calls.find(
      ([sql]) => sql.includes('INSERT INTO telephony_call_logs')
    );
    expect(insertCall[1][5]).toBe('1001'); // Resolved from vac_agent_id
  });

  test('updates lead last_call_date when lead is found', async () => {
    const db = { query: vi.fn() };
    const callRecord = makeCallLogRecord({ lead_id: 42 });

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 42, name: 'Alice', phone: '9876543210' }] }) // lookupLead
      .mockResolvedValueOnce({ rows: [callRecord] })   // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })           // UPDATE code
      .mockResolvedValueOnce({ rowCount: 1 });          // UPDATE leads.last_call_date

    const app = createClick2CallApp(db);
    await request(app)
      .post('/api/calls/vac/click2call')
      .send({
        phone_number: '9876543210',
        _log_only: true,
        agent_id: '1001',
      })
      .expect(201);

    // Verify lead last_call_date was updated
    const leadUpdate = db.query.mock.calls.find(
      ([sql]) => sql.includes('UPDATE leads SET last_call_date')
    );
    expect(leadUpdate).toBeDefined();
    expect(leadUpdate[1][0]).toBe(42); // lead_id
  });

  test('returns 400 for missing phone_number', async () => {
    const db = { query: vi.fn() };
    const app = createClick2CallApp(db);

    const res = await request(app)
      .post('/api/calls/vac/click2call')
      .send({ _log_only: true })
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('returns 400 for invalid phone_number format', async () => {
    const db = { query: vi.fn() };
    const app = createClick2CallApp(db);

    const res = await request(app)
      .post('/api/calls/vac/click2call')
      .send({ phone_number: 'abc', _log_only: true })
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('returns 401 without auth token', async () => {
    const db = { query: vi.fn() };
    const router = proxyquire('../../routes/telephonyCalls', {
      '../config/database': db,
      '../middleware/auth': {
        authenticate: (req, res, next) => res.status(401).json({ status: 'error', message: 'Unauthorized' }),
      },
    });

    const app = express();
    app.use(express.json());
    app.use('/api/calls', router);

    const res = await request(app)
      .post('/api/calls/vac/click2call')
      .send({ phone_number: '9876543210', _log_only: true })
      .expect(401);

    expect(res.body.status).toBe('error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/calls/vac/click2call — full VAC call mode
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/calls/vac/click2call — full VAC call mode', () => {
  test('calls vacClient.click2Call and logs call when _log_only is false', async () => {
    const db = { query: vi.fn() };
    const callRecord = makeCallLogRecord();

    db.query
      .mockResolvedValueOnce({ rows: [] })             // lookupLead
      .mockResolvedValueOnce({ rows: [{ vac_agent_id: '1001', intercom_number: '101', name: 'Admin' }] }) // resolveVacAgent
      .mockResolvedValueOnce({ rows: [callRecord] })   // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })           // UPDATE code
      .mockResolvedValueOnce({ rowCount: 1 });          // UPDATE leads.last_call_date

    const vacClientMock = {
      vacClient: {
        isConfigured: vi.fn().mockReturnValue(true),
        click2Call: vi.fn().mockResolvedValue({
          success: true,
          message: 'Call initiated',
          raw: { success: true, message: 'Call initiated' },
        }),
      },
      VacError: class VacError extends Error {
        constructor(message, code) {
          super(message);
          this.code = code;
        }
      },
    };

    const app = createClick2CallApp(db, createMockIo(), vacClientMock);
    const res = await request(app)
      .post('/api/calls/vac/click2call')
      .send({ phone_number: '9876543210' })
      .expect(201);

    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Call initiated successfully');
    expect(res.body.data.vac_message).toBe('Call initiated');

    // VAC client SHOULD have been called
    expect(vacClientMock.vacClient.click2Call).toHaveBeenCalledWith('1001', '9876543210');
  });

  test('returns 503 when VAC is not configured', async () => {
    const db = { query: vi.fn() };
    db.query.mockResolvedValueOnce({ rows: [] }); // lookupLead

    const vacClientMock = {
      vacClient: {
        isConfigured: vi.fn().mockReturnValue(false),
        click2Call: vi.fn(),
      },
      VacError: class VacError extends Error {
        constructor(message, code) {
          super(message);
          this.code = code;
        }
      },
    };

    const app = createClick2CallApp(db, createMockIo(), vacClientMock);
    const res = await request(app)
      .post('/api/calls/vac/click2call')
      .send({ phone_number: '9876543210' })
      .expect(503);

    expect(res.body.code).toBe('VAC_NOT_CONFIGURED');
  });

  test('returns 502 when VAC dial fails', async () => {
    const db = { query: vi.fn() };
    db.query
      .mockResolvedValueOnce({ rows: [] })  // lookupLead
      .mockResolvedValueOnce({ rows: [{ vac_agent_id: '1001', intercom_number: '101', name: 'Admin' }] }); // resolveVacAgent

    const VacErrorClass = class VacError extends Error {
      constructor(message, code) {
        super(message);
        this.code = code;
      }
    };

    const vacClientMock = {
      vacClient: {
        isConfigured: vi.fn().mockReturnValue(true),
        click2Call: vi.fn().mockRejectedValue(
          new VacErrorClass('Dial failed', 'VAC_DIAL_FAILED')
        ),
      },
      VacError: VacErrorClass,
    };

    const app = createClick2CallApp(db, createMockIo(), vacClientMock);
    const res = await request(app)
      .post('/api/calls/vac/click2call')
      .send({ phone_number: '9876543210' })
      .expect(502);

    expect(res.body.code).toBe('VAC_DIAL_FAILED');
  });

  test('emits socket event on successful VAC call', async () => {
    const db = { query: vi.fn() };
    const callRecord = makeCallLogRecord();

    db.query
      .mockResolvedValueOnce({ rows: [] })             // lookupLead
      .mockResolvedValueOnce({ rows: [{ vac_agent_id: '1001', intercom_number: '101', name: 'Admin' }] }) // resolveVacAgent
      .mockResolvedValueOnce({ rows: [callRecord] })   // INSERT
      .mockResolvedValueOnce({ rowCount: 1 })           // UPDATE code
      .mockResolvedValueOnce({ rowCount: 1 });          // UPDATE leads.last_call_date

    const vacClientMock = {
      vacClient: {
        isConfigured: vi.fn().mockReturnValue(true),
        click2Call: vi.fn().mockResolvedValue({
          success: true,
          message: 'Call initiated',
          raw: { success: true },
        }),
      },
      VacError: class VacError extends Error {
        constructor(message, code) {
          super(message);
          this.code = code;
        }
      },
    };

    const io = createMockIo();
    const app = createClick2CallApp(db, io, vacClientMock);
    await request(app)
      .post('/api/calls/vac/click2call')
      .send({ phone_number: '9876543210' })
      .expect(201);

    // Verify socket event was emitted
    expect(io.to).toHaveBeenCalledWith('user_1');
    expect(io.to().emit).toHaveBeenCalledWith('call-event', expect.objectContaining({
      event: 'outgoing',
      caller: '9876543210',
      status: 'initiated',
      direction: 'outbound',
    }));
  });
});
