'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  Environment setup — must run before any imports
// ─────────────────────────────────────────────────────────────────────────────
process.env.JWT_SECRET = 'test-secret-key-for-vitest';
process.env.NODE_ENV = 'development';

const express = require('express');
const request = require('supertest');
const proxyquire = require('proxyquire');

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createApp(dbMock) {
  const router = proxyquire('../../routes/dashboard', {
    '../config/database': dbMock,
    '../middleware/auth': {
      authenticate: (req, res, next) => {
        req.user = { id: 1, role: 'super_admin', email: 'admin@test.com', branch_id: 1, intercom_number: '101', department: 'Cardiology', is_active: true, roles: ['super_admin'] };
        next();
      },
    },
  });

  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', router);
  return app;
}

function createUnauthenticatedApp(dbMock) {
  const router = proxyquire('../../routes/dashboard', {
    '../config/database': dbMock,
    '../middleware/auth': {
      authenticate: (req, res, next) => res.status(401).json({ status: 'error', message: 'Authentication required' }),
    },
  });

  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', router);
  return app;
}

function mockDb() {
  return { query: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/dashboard/metrics — overview cards (calls + leads)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/dashboard/metrics', () => {
  test('returns aggregated metrics with default range', async () => {
    const db = mockDb();
    // 3 queries: call metrics, action result, lead metrics
    const callMetricsRow = {
      total_calls: 100, unique_calls: 60,
      missed_calls: 20, unique_missed: 15,
      answered_calls: 70, unique_answered: 45,
      unanswered_outbound: 5,
    };
    db.query
      .mockResolvedValueOnce({ rows: [callMetricsRow] })  // call metrics
      .mockResolvedValueOnce({ rows: [{ total_calls: 100, leads_from_calls: 25 }] }) // action required
      .mockResolvedValueOnce({ rows: [{ total_leads: 80, leads_today: 3, new_leads: 15, high_priority: 8, follow_ups: 10 }] }); // lead metrics

    const app = createApp(db);
    const res = await request(app)
      .get('/api/dashboard/metrics')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.totalCalls.total).toBe(100);
    expect(res.body.data.totalCalls.unique).toBe(60);
    expect(res.body.data.missedCalls.total).toBe(20);
    expect(res.body.data.missedCalls.status).toBe('High Volume');
    expect(res.body.data.answered.total).toBe(70);
    expect(res.body.data.answered.unique).toBe(45);
    expect(res.body.data.actionRequired.totalCalls).toBe(100);
    expect(res.body.data.actionRequired.leadsFromCalls).toBe(25);
    expect(res.body.data.newLeadsToday.total).toBe(3);
    expect(res.body.data.totalLeads.total).toBe(80);
    expect(res.body.data.totalLeads.highPriority).toBe(8);
    expect(res.body.data.followUps.total).toBe(10);
  });

  test('returns Normal missed status when no missed calls', async () => {
    const db = mockDb();
    db.query
      .mockResolvedValueOnce({
        rows: [{
          total_calls: 50, unique_calls: 30,
          missed_calls: 0, unique_missed: 0,
          answered_calls: 40, unique_answered: 25,
          unanswered_outbound: 0,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ total_calls: 50, leads_from_calls: 10 }] })
      .mockResolvedValueOnce({ rows: [{ total_leads: 40, leads_today: 0, new_leads: 5, high_priority: 2, follow_ups: 3 }] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/dashboard/metrics')
      .expect(200);

    expect(res.body.data.missedCalls.status).toBe('Normal');
    expect(res.body.data.missedCalls.total).toBe(0);
  });

  test('accepts range query parameter', async () => {
    const db = mockDb();
    db.query
      .mockResolvedValueOnce({
        rows: [{
          total_calls: 10, unique_calls: 8,
          missed_calls: 2, unique_missed: 2,
          answered_calls: 7, unique_answered: 6,
          unanswered_outbound: 1,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ total_calls: 10, leads_from_calls: 3 }] })
      .mockResolvedValueOnce({ rows: [{ total_leads: 20, leads_today: 2, new_leads: 4, high_priority: 1, follow_ups: 5 }] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/dashboard/metrics?range=today')
      .expect(200);

    expect(res.body.status).toBe('success');
    // Verify range filter was applied — query should contain CURRENT_DATE
    expect(db.query.mock.calls[0][0]).toContain('CURRENT_DATE');
  });

  test('returns 401 without auth', async () => {
    const db = mockDb();
    const app = createUnauthenticatedApp(db);
    const res = await request(app)
      .get('/api/dashboard/metrics')
      .expect(401);
    expect(res.body.status).toBe('error');
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Connection lost'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/dashboard/metrics')
      .expect(500);
    expect(res.body.code).toBe('DASHBOARD_METRICS_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/dashboard/activity — recent activity with filters
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/dashboard/activity', () => {
  test('returns recent activity log', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 'act1', code: 'v-call-001', caller_number: '+911234567890', direction: 'inbound', status: 'missed', duration: 0, created_at: new Date(), lead_name: null, lead_code: null },
        { id: 'act2', code: 'v-call-002', caller_number: '+919876543210', direction: 'inbound', status: 'completed', duration: 120, created_at: new Date(), lead_name: 'Alice', lead_code: 'L001' },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/dashboard/activity')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.activity).toHaveLength(2);
    expect(res.body.data.activity[0].status).toBe('missed');
    expect(res.body.data.activity[0].caller_number).toBe('+911234567890');
    expect(res.body.data.activity[1].lead_name).toBe('Alice');
  });

  test('filters by type=Answered', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp(db);
    await request(app)
      .get('/api/dashboard/activity?type=Answered')
      .expect(200);

    // Verify query contains the answered filter
    expect(db.query.mock.calls[0][0]).toContain("'in-progress', 'completed'");
  });

  test('filters by type=Missed', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp(db);
    await request(app)
      .get('/api/dashboard/activity?type=Missed')
      .expect(200);

    expect(db.query.mock.calls[0][0]).toContain("call_status = 'missed'");
  });

  test('filters by range=today', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp(db);
    await request(app)
      .get('/api/dashboard/activity?range=today')
      .expect(200);

    expect(db.query.mock.calls[0][0]).toContain('CURRENT_DATE');
  });

  test('filters by range=month', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp(db);
    await request(app)
      .get('/api/dashboard/activity?range=month')
      .expect(200);

    expect(db.query.mock.calls[0][0]).toContain('DATE_TRUNC');
  });

  test('returns empty array when no activity', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/dashboard/activity')
      .expect(200);

    expect(res.body.data.activity).toEqual([]);
  });

  test('returns 401 without auth', async () => {
    const db = mockDb();
    const app = createUnauthenticatedApp(db);
    const res = await request(app)
      .get('/api/dashboard/activity')
      .expect(401);
    expect(res.body.status).toBe('error');
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/dashboard/activity')
      .expect(500);
    expect(res.body.code).toBe('ACTIVITY_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/dashboard/activity/export — CSV export of activity log
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/dashboard/activity/export', () => {
  test('exports activity as CSV', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [{
        'Call Code': 'v-001',
        'Caller Number': '+911234567890',
        'Direction': 'inbound',
        'Status': 'missed',
        'Duration (s)': 0,
        'Patient Name': 'Alice',
        'Lead Code': 'L001',
        'Date & Time': '01 Jun 2025 10:30',
      }],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/dashboard/activity/export')
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Call Code,Caller Number');
    expect(res.text).toContain('v-001,+911234567890');
  });

  test('returns 404 when no data to export', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/dashboard/activity/export')
      .expect(404);

    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('No data to export');
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/dashboard/activity/export')
      .expect(500);
    expect(res.body.status).toBe('error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/dashboard/activity — log an activity
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/dashboard/activity', () => {
  test('logs an activity and returns 201', async () => {
    const db = mockDb();
    const activityRecord = {
      id: 1,
      provider_id: 1,
      patient_name: 'Alice',
      call_type: 'Missed Call',
      status: 'completed',
      duration: 45,
    };
    db.query.mockResolvedValueOnce({ rows: [activityRecord] });

    const app = createApp(db);
    const res = await request(app)
      .post('/api/dashboard/activity')
      .send({
        action: 'Missed Call',
        patient_name: 'Alice',
        call_type: 'Missed Call',
        status: 'completed',
        duration: 45,
      })
      .expect(201);

    expect(res.body.status).toBe('success');
    expect(res.body.data.activity.patient_name).toBe('Alice');
    expect(res.body.data.activity.call_type).toBe('Missed Call');
    expect(res.body.data.activity.duration).toBe(45);
  });

  test('logs activity with minimal fields', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [{ id: 2, provider_id: 1, patient_name: null, call_type: null, status: null, duration: null }],
    });

    const app = createApp(db);
    const res = await request(app)
      .post('/api/dashboard/activity')
      .send({ action: 'Call Logged' })
      .expect(201);

    expect(res.body.status).toBe('success');
    expect(res.body.data.activity.id).toBe(2);
  });

  test('returns 401 without auth', async () => {
    const db = mockDb();
    const app = createUnauthenticatedApp(db);
    const res = await request(app)
      .post('/api/dashboard/activity')
      .send({ action: 'Test' })
      .expect(401);
    expect(res.body.status).toBe('error');
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Insert failed'));
    const app = createApp(db);
    const res = await request(app)
      .post('/api/dashboard/activity')
      .send({ action: 'Test' })
      .expect(500);
    expect(res.body.code).toBe('ACTIVITY_LOG_ERROR');
  });
});
