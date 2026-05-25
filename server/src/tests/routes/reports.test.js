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
  const router = proxyquire('../../routes/reports', {
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
  app.use('/api/reports', router);
  return app;
}

function createUnauthenticatedApp(dbMock) {
  const router = proxyquire('../../routes/reports', {
    '../config/database': dbMock,
    '../middleware/auth': {
      authenticate: (req, res, next) => res.status(401).json({ status: 'error', message: 'Authentication required' }),
    },
  });

  const app = express();
  app.use(express.json());
  app.use('/api/reports', router);
  return app;
}

function mockDb() {
  const db = { query: vi.fn() };
  // Pre-consume cleanupOldExports queries that run at module load
  // cleanupOldExports does: SELECT (find old exports) + DELETE (cleanup) - even when rows is empty
  db.query.mockResolvedValueOnce({ rows: [] }); // SELECT
  db.query.mockResolvedValueOnce();              // DELETE (result not used)
  return db;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/overview — summary cards
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/overview', () => {
  test('returns summary overview with aggregated counts', async () => {
    const db = mockDb();
    // 4 queries: calls count, leads count, appointments count, closed leads count
    db.query
      .mockResolvedValueOnce({ rows: [{ total: 150 }] })   // totalCalls
      .mockResolvedValueOnce({ rows: [{ total: 80 }] })    // totalLeads
      .mockResolvedValueOnce({ rows: [{ total: 45 }] })    // totalAppts
      .mockResolvedValueOnce({ rows: [{ count: '20' }] }); // closed leads

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/overview')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.totalCalls).toBe(150);
    expect(res.body.data.totalLeads).toBe(80);
    expect(res.body.data.totalAppointments).toBe(45);
    expect(res.body.data.conversionRate).toBe(25); // 20/80 * 100
  });

  test('returns zero conversion rate when no leads', async () => {
    const db = mockDb();
    db.query
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/overview')
      .expect(200);

    expect(res.body.data.conversionRate).toBe(0);
  });

  test('returns 401 without auth', async () => {
    const db = mockDb();
    const app = createUnauthenticatedApp(db);
    const res = await request(app)
      .get('/api/reports/overview')
      .expect(401);
    expect(res.body.status).toBe('error');
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Connection lost'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/overview')
      .expect(500);
    expect(res.body.code).toBe('REPORTS_OVERVIEW_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/call-volume — monthly call volume
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/call-volume', () => {
  test('returns monthly call volume data', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { month: 'Jan', calls: 100 },
        { month: 'Feb', calls: 120 },
        { month: 'Mar', calls: 90 },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/call-volume')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.callVolume).toHaveLength(3);
    expect(res.body.data.callVolume[0].month).toBe('Jan');
    expect(res.body.data.callVolume[1].calls).toBe(120);
  });

  test('returns empty array when no calls', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/call-volume')
      .expect(200);

    expect(res.body.data.callVolume).toEqual([]);
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('DB fail'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/call-volume')
      .expect(500);
    expect(res.body.code).toBe('CALL_VOLUME_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/lead-sources — lead distribution by source
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/lead-sources', () => {
  test('returns lead sources with percentages', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { source: 'Phone', value: 50 },
        { source: 'Website', value: 30 },
        { source: 'Referral', value: 20 },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/lead-sources')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.sources).toHaveLength(3);
    // 50/100 = 50%, 30/100 = 30%, 20/100 = 20%
    expect(res.body.data.sources[0].percentage).toBe(50);
    expect(res.body.data.sources[1].source).toBe('Website');
  });

  test('returns empty array when no leads', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/lead-sources')
      .expect(200);
    expect(res.body.data.sources).toEqual([]);
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/lead-sources')
      .expect(500);
    expect(res.body.code).toBe('LEAD_SOURCES_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/department-performance
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/department-performance', () => {
  test('returns department performance data', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { department: 'Cardiology', appointments: 30, completed: 20, cancelled: 5, no_show: 2 },
        { department: 'Neurology', appointments: 20, completed: 15, cancelled: 3, no_show: 1 },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/department-performance')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.departments).toHaveLength(2);
    expect(res.body.data.departments[0].department).toBe('Cardiology');
    expect(res.body.data.departments[0].appointments).toBe(30);
    expect(res.body.data.departments[0].conversions).toBe(20);
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/department-performance')
      .expect(500);
    expect(res.body.code).toBe('DEPT_PERFORMANCE_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/provider-leaderboard
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/provider-leaderboard', () => {
  test('returns provider leaderboard with conversion rates', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { provider: 'Dr. Smith', department: 'Cardiology', leads: 20, appointments: 15, conversions: 10 },
        { provider: 'Dr. Jones', department: 'Neurology', leads: 10, appointments: 8, conversions: 5 },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/provider-leaderboard')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.providers).toHaveLength(2);
    expect(res.body.data.providers[0].provider).toBe('Dr. Smith');
    expect(res.body.data.providers[0].conversionRate).toBe(50); // 10/20 * 100
    expect(res.body.data.providers[1].conversionRate).toBe(50); // 5/10 * 100
  });

  test('returns empty array when no providers', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/provider-leaderboard')
      .expect(200);
    expect(res.body.data.providers).toEqual([]);
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/provider-leaderboard')
      .expect(500);
    expect(res.body.code).toBe('PROVIDER_LEADERBOARD_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/status-breakdown — lead status breakdown
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/status-breakdown', () => {
  test('returns lead status breakdown with percentages', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { status: 'New', count: 40 },
        { status: 'Follow-up', count: 25 },
        { status: 'Closed', count: 15 },
        { status: 'Rejected', count: 10 },
        { status: 'Contacted', count: 10 },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/status-breakdown')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.breakdown).toHaveLength(5);
    expect(res.body.data.breakdown[0].status).toBe('New');
    expect(res.body.data.breakdown[0].count).toBe(40);
    expect(res.body.data.breakdown[0].percentage).toBe(40); // 40/100
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/status-breakdown')
      .expect(500);
    expect(res.body.code).toBe('STATUS_BREAKDOWN_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/weekly-trend
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/weekly-trend', () => {
  test('returns weekly trend data', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { day: 'Mon', leads: 5, calls: 0 },
        { day: 'Tue', leads: 8, calls: 0 },
        { day: 'Wed', leads: 3, calls: 0 },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/weekly-trend')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.weeklyTrend).toHaveLength(3);
    expect(res.body.data.weeklyTrend[0].day).toBe('Mon');
    expect(res.body.data.weeklyTrend[1].leads).toBe(8);
  });

  test('returns empty array when no data', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/weekly-trend')
      .expect(200);
    expect(res.body.data.weeklyTrend).toEqual([]);
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/weekly-trend')
      .expect(500);
    expect(res.body.code).toBe('WEEKLY_TREND_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/telecallers — telecaller performance
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/telecallers', () => {
  test('returns telecaller performance data', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { name: 'Alice', leads: 25, calls: 100, appointments: 10, avg_call_duration: '120' },
        { name: 'Bob', leads: 15, calls: 80, appointments: 5, avg_call_duration: '90' },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/telecallers')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.telecallers).toHaveLength(2);
    expect(res.body.data.telecallers[0].name).toBe('Alice');
    expect(res.body.data.telecallers[0].calls).toBe(100);
    expect(res.body.data.telecallers[0].avgCallDuration).toBe(120);
  });

  test('returns empty array when no telecallers', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/telecallers')
      .expect(200);
    expect(res.body.data.telecallers).toEqual([]);
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/telecallers')
      .expect(500);
    expect(res.body.code).toBe('TELECALLERS_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/conversion-funnel
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/conversion-funnel', () => {
  test('returns conversion funnel stages', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [{ total: 100, contacted: 60, interested: 35, appointment_booked: 20, closed: 10 }],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/conversion-funnel')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.funnel).toHaveLength(5);
    expect(res.body.data.funnel[0].stage).toBe('New Leads');
    expect(res.body.data.funnel[0].count).toBe(100);
    expect(res.body.data.funnel[4].stage).toBe('Closed');
    expect(res.body.data.funnel[4].count).toBe(10);
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/conversion-funnel')
      .expect(500);
    expect(res.body.code).toBe('CONVERSION_FUNNEL_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/call-analytics — detailed call analytics
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/call-analytics', () => {
  test('returns call analytics with byStatus, byDirection, byHour, avgDuration', async () => {
    const db = mockDb();
    // 4 queries in parallel
    db.query
      .mockResolvedValueOnce({
        rows: [
          { status: 'completed', count: 80 },
          { status: 'missed', count: 20 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { direction: 'inbound', count: 70 },
          { direction: 'outbound', count: 30 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { hour: 9, count: 15 },
          { hour: 10, count: 25 },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ avg: '45.5' }] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/call-analytics')
      .expect(200);

    expect(res.body.status).toBe('success');
    const analytics = res.body.data.callAnalytics;
    expect(analytics.byStatus).toHaveLength(2);
    expect(analytics.byDirection).toHaveLength(2);
    expect(analytics.byHour).toHaveLength(2);
    expect(analytics.avgDuration).toBe(46); // rounded from 45.5
  });

  test('returns zero avg duration when no calls with duration', async () => {
    const db = mockDb();
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ avg: null }] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/call-analytics')
      .expect(200);

    expect(res.body.data.callAnalytics.avgDuration).toBe(0);
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/call-analytics')
      .expect(500);
    expect(res.body.code).toBe('CALL_ANALYTICS_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/appointment-stats
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/appointment-stats', () => {
  test('returns appointment statistics', async () => {
    const db = mockDb();
    // 3 queries in parallel
    db.query
      .mockResolvedValueOnce({
        rows: [
          { status: 'Completed', count: 40 },
          { status: 'Scheduled', count: 20 },
          { status: 'Cancelled', count: 5 },
          { status: 'No Show', count: 3 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { department: 'Cardiology', count: 30 },
          { department: 'Neurology', count: 20 },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ rate: '4.2' }] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/appointment-stats')
      .expect(200);

    expect(res.body.status).toBe('success');
    const stats = res.body.data.appointmentStats;
    expect(stats.byStatus).toHaveLength(4);
    expect(stats.byDepartment).toHaveLength(2);
    expect(stats.noShowRate).toBe(4);
  });

  test('returns zero noShowRate when no appointments', async () => {
    const db = mockDb();
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ rate: null }] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/appointment-stats')
      .expect(200);

    expect(res.body.data.appointmentStats.noShowRate).toBe(0);
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/appointment-stats')
      .expect(500);
    expect(res.body.code).toBe('APPOINTMENT_STATS_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/daily-activity — today's summary
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/daily-activity', () => {
  test('returns daily activity summary', async () => {
    const db = mockDb();
    // 4 queries in parallel
    db.query
      .mockResolvedValueOnce({ rows: [{ count: 5 }] })   // newLeads
      .mockResolvedValueOnce({ rows: [{ count: 20 }] })  // callsToday
      .mockResolvedValueOnce({ rows: [{ count: 8 }] })   // appointmentsToday
      .mockResolvedValueOnce({ rows: [{ count: 12 }] }); // statusChanges

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/daily-activity')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.dailyActivity.newLeads).toBe(5);
    expect(res.body.data.dailyActivity.callsToday).toBe(20);
    expect(res.body.data.dailyActivity.appointmentsToday).toBe(8);
    expect(res.body.data.dailyActivity.statusChanges).toBe(12);
  });

  test('returns zeros when no activity today', async () => {
    const db = mockDb();
    db.query
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/daily-activity')
      .expect(200);

    expect(res.body.data.dailyActivity.newLeads).toBe(0);
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/daily-activity')
      .expect(500);
    expect(res.body.code).toBe('DAILY_ACTIVITY_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/export — CSV export of leads/calls/appointments
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/export', () => {
  test('exports leads as CSV', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { code: 'L001', name: 'Alice', phone: '9876543210', email: 'alice@test.com', status: 'New', priority: 'High', lead_source: 'Phone', branch: 'Main', created_by: 'Admin', assigned_to: 'Dr. Smith', created_at: '2025-06-01' },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export?type=leads')
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('code,name,phone,email');
    expect(res.text).toContain('L001,Alice');
  });

  test('exports calls as CSV', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { code: 'C001', caller_phone_number: '+911234567890', callee_phone_number: '9876543210', direction: 'inbound', status: 'missed', duration: 0, agent: 'Alice', created_at: '2025-06-01' },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export?type=calls')
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('code,caller_phone_number');
    expect(res.text).toContain('C001,+911234567890');
  });

  test('exports appointments as CSV', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { code: 'A001', patient_name: 'Bob', phone: '9876543210', department: 'Cardiology', provider_name: 'Dr. Smith', appointment_date: '2025-06-15', appointment_time: '10:00', status: 'Scheduled', visit_type: 'Consultation', consultation_mode: 'In-person', created_at: '2025-06-01' },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export?type=appointments')
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('code,patient_name,phone');
    expect(res.text).toContain('A001,Bob');
  });

  test('returns 400 for invalid export type', async () => {
    const db = mockDb();
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export?type=invalid')
      .expect(400);
    expect(res.body.code).toBe('INVALID_EXPORT_TYPE');
  });

  test('returns 404 when no data to export', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export?type=leads')
      .expect(404);
    expect(res.body.code).toBe('NO_DATA');
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export?type=leads')
      .expect(500);
    expect(res.body.code).toBe('EXPORT_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/branch-leads
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/branch-leads', () => {
  test('returns branch lead distribution', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { branch: 'Main', total_leads: 50, closed_leads: 20, active_leads: 25, rejected_leads: 5 },
        { branch: 'Downtown', total_leads: 30, closed_leads: 10, active_leads: 15, rejected_leads: 5 },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/branch-leads')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.branches).toHaveLength(2);
    expect(res.body.data.branches[0].branch).toBe('Main');
    expect(res.body.data.branches[0].totalLeads).toBe(50);
    expect(res.body.data.branches[0].conversionRate).toBe(40); // 20/50 * 100
  });

  test('returns empty array when no branches', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/branch-leads')
      .expect(200);
    expect(res.body.data.branches).toEqual([]);
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/branch-leads')
      .expect(500);
    expect(res.body.code).toBe('BRANCH_LEADS_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/export/summary — preview metrics
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/export/summary', () => {
  test('returns export summary for a type and date range', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [{ total: 100, missed: 10, answered: 90, inbound: 60, outbound: 40 }],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export/summary?type=calls&from=2025-01-01&to=2025-01-31')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.total).toBe(100);
    expect(res.body.data.missed).toBe(10);
  });

  test('returns 400 for invalid type', async () => {
    const db = mockDb();
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export/summary?type=invalid&from=2025-01-01&to=2025-01-31')
      .expect(400);
    expect(res.body.status).toBe('error');
  });

  test('returns 400 for missing dates', async () => {
    const db = mockDb();
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export/summary?type=calls')
      .expect(400);
    expect(res.body.status).toBe('error');
  });

  test('returns 500 on DB error', async () => {
    const db = mockDb();
    db.query.mockRejectedValue(new Error('Query failed'));
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export/summary?type=calls&from=2025-01-01&to=2025-01-31')
      .expect(500);
    expect(res.body.message).toContain('Query failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/reports/export — create export job
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/reports/export', () => {
  test('creates export job for calls within 31 day range', async () => {
    const db = mockDb();
    // Job record returned by INSERT
    const jobRecord = { id: 1, status: 'processing', report_type: 'calls', date_from: '2025-06-01', date_to: '2025-06-15', row_count: null };
    // generateExportCsv internal queries:
    // UPDATE status='processing', SELECT chunk, UPDATE status='completed'
    // Then route does: SELECT * FROM report_exports WHERE id = $1
    db.query
      .mockResolvedValueOnce({ rows: [jobRecord] })        // INSERT RETURNING
      .mockResolvedValueOnce()                               // UPDATE status='processing'
      .mockResolvedValueOnce({ rows: [] })                   // SELECT chunk (empty → break)
      .mockResolvedValueOnce()                               // UPDATE status='completed'
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'completed', row_count: 0 }] }); // SELECT after completion

    const app = createApp(db);
    const res = await request(app)
      .post('/api/reports/export')
      .send({ report_type: 'calls', date_from: '2025-06-01', date_to: '2025-06-15' })
      .expect(200);

    expect(res.body.status).toBe('success');
  });

  test('creates export job for leads within 31 day range', async () => {
    const db = mockDb();
    const jobRecord = { id: 2, status: 'completed', report_type: 'leads', date_from: '2025-06-01', date_to: '2025-06-15', row_count: 0 };

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 2, status: 'processing' }] })  // INSERT
      .mockResolvedValueOnce()                                                 // UPDATE status='processing'
      .mockResolvedValueOnce({ rows: [] })                                     // SELECT chunk (empty)
      .mockResolvedValueOnce()                                                 // UPDATE status='completed'
      .mockResolvedValueOnce({ rows: [jobRecord] });                            // SELECT * after completion

    const app = createApp(db);
    const res = await request(app)
      .post('/api/reports/export')
      .send({ report_type: 'leads', date_from: '2025-06-01', date_to: '2025-06-15' })
      .expect(200);

    expect(res.body.status).toBe('success');
  });

  test('returns 400 for invalid report type', async () => {
    const db = mockDb();
    const app = createApp(db);
    const res = await request(app)
      .post('/api/reports/export')
      .send({ report_type: 'invalid', date_from: '2025-01-01', date_to: '2025-01-31' })
      .expect(400);
    expect(res.body.status).toBe('error');
  });

  test('returns 400 for missing date range', async () => {
    const db = mockDb();
    const app = createApp(db);
    const res = await request(app)
      .post('/api/reports/export')
      .send({ report_type: 'calls' })
      .expect(400);
    expect(res.body.status).toBe('error');
  });

  test('returns 401 without auth', async () => {
    const db = mockDb();
    const app = createUnauthenticatedApp(db);
    const res = await request(app)
      .post('/api/reports/export')
      .send({ report_type: 'calls', date_from: '2025-01-01', date_to: '2025-01-31' })
      .expect(401);
    expect(res.body.status).toBe('error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/export/jobs — list user's export jobs
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/export/jobs', () => {
  test('returns list of export jobs', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 1, report_type: 'calls', date_from: '2025-06-01', date_to: '2025-06-15', description: '', status: 'completed', row_count: 50, created_at: new Date(), completed_at: new Date() },
        { id: 2, report_type: 'leads', date_from: '2025-06-01', date_to: '2025-06-30', description: '', status: 'processing', row_count: null, created_at: new Date(), completed_at: null },
      ],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export/jobs')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.jobs).toHaveLength(2);
    expect(res.body.data.jobs[0].report_type).toBe('calls');
    expect(res.body.data.jobs[1].status).toBe('processing');
  });

  test('returns empty array when no jobs', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });
    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export/jobs')
      .expect(200);
    expect(res.body.data.jobs).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/export/check/:id — poll job status
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/export/check/:id', () => {
  test('returns job status for existing job', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, status: 'completed', row_count: 50, created_at: new Date(), completed_at: new Date() }],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export/check/1')
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.row_count).toBe(50);
  });

  test('returns 404 for non-existent job', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export/check/999')
      .expect(404);

    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Job not found');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/reports/export/download/:id — download CSV
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/export/download/:id', () => {
  test('returns 400 when export not ready', async () => {
    const db = mockDb();
    // Job exists but status is 'processing' and no file_path
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, status: 'processing', file_path: null }],
    });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export/download/1')
      .expect(400);

    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Export not ready for download');
  });

  test('returns 404 for non-existent job', async () => {
    const db = mockDb();
    db.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp(db);
    const res = await request(app)
      .get('/api/reports/export/download/999')
      .expect(404);

    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Job not found');
  });
});
