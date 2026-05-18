const Reports = () => {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Reports &amp; Analytics</h1>
      <p className="text-gray-600 mb-8">
        Comprehensive analytics with 12 report endpoints, visual dashboards, and CSV export capabilities.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Overview</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Reports module provides a centralized analytics dashboard covering call volume, lead
          conversion, department performance, telecaller productivity, and appointment statistics.
          Data is served by 12 dedicated API endpoints, each optimized for its specific use case.
          All report data can be exported as CSV files for offline analysis.
        </p>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-800 font-medium mb-1">Report Endpoints</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2">
            {[
              'Overview (summary cards)',
              'Call Volume (monthly chart)',
              'Lead Sources (distribution)',
              'Department Performance',
              'Provider Leaderboard',
              'Status Breakdown',
              'Weekly Trend',
              'Telecaller Performance',
              'Conversion Funnel',
              'Call Analytics',
              'Appointment Stats',
              'Daily Activity',
            ].map(endpoint => (
              <p key={endpoint} className="text-sm text-orange-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                {endpoint}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Summary Cards</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The top-level overview displays key metrics as summary cards, giving an at-a-glance view of
          overall system performance.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Total Calls', color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { label: 'Total Leads', color: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'Total Appointments', color: 'bg-purple-50 border-purple-200 text-purple-700' },
            { label: 'Conversion Rate', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { label: 'Avg Response Time', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
            { label: 'Patient Satisfaction', color: 'bg-pink-50 border-pink-200 text-pink-700' },
          ].map(card => (
            <div key={card.label} className={`p-3 rounded-lg border text-center ${card.color}`}>
              <p className="text-2xl font-bold">--</p>
              <p className="text-xs font-medium">{card.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/reports/overview

// Response
{
  "total_calls": 1247,
  "total_leads": 856,
  "total_appointments": 423,
  "conversion_rate": 34.2,
  "avg_response_time": "2.4 hours",
  "patient_satisfaction": 4.3
}`}</code></pre>
        </div>
      </section>

      {/* Call Volume */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Call Volume</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Monthly call volume data is used to render a bar or line chart showing call trends over time.
          Data includes inbound, outbound, missed, and answered call counts per month.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/reports/call-volume

// Response — monthly data points
[
  { "month": "2026-01", "inbound": 120, "outbound": 200, "missed": 15, "answered": 305 },
  { "month": "2026-02", "inbound": 135, "outbound": 210, "missed": 12, "answered": 333 },
  { "month": "2026-03", "inbound": 142, "outbound": 195, "missed": 18, "answered": 319 },
  // ...
]`}</code></pre>
        </div>
      </section>

      {/* Lead Sources */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Lead Sources</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Shows the distribution of leads by their source channel, with counts and percentages.
          Useful for understanding which marketing channels are most effective.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/reports/lead-sources

// Response
[
  { "source": "Website",      "count": 312, "percentage": 36.4 },
  { "source": "Referral",     "count": 198, "percentage": 23.1 },
  { "source": "Social Media", "count": 145, "percentage": 16.9 },
  { "source": "Google Ads",   "count": 112, "percentage": 13.1 },
  { "source": "Walk-in",      "count": 89,  "percentage": 10.4 }
]`}</code></pre>
        </div>
      </section>

      {/* Department Performance */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Department Performance</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Performance metrics broken down by department, showing how each department is performing
          across leads, appointments, and patient satisfaction.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/reports/department-performance

// Response
[
  {
    "department": "Orthopaedics",
    "leads_handled": 145,
    "appointments_booked": 89,
    "conversions": 67,
    "satisfaction": 4.5
  },
  {
    "department": "Cardiology",
    "leads_handled": 120,
    "appointments_booked": 78,
    "conversions": 52,
    "satisfaction": 4.2
  }
  // ...
]`}</code></pre>
        </div>
      </section>

      {/* Provider Leaderboard */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Provider Leaderboard</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Top providers ranked by their conversion performance. Shows the number of conversions
          and the conversion rate (conversions / leads handled) for each provider.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/reports/provider-leaderboard

// Response
[
  { "provider": "Dr. Rajesh Gupta",   "conversions": 45, "leads": 98,  "conversion_rate": 45.9 },
  { "provider": "Dr. Meena Patel",    "conversions": 38, "leads": 82,  "conversion_rate": 46.3 },
  { "provider": "Dr. Arun Kumar",     "conversions": 35, "leads": 91,  "conversion_rate": 38.5 },
  { "provider": "Dr. Sunita Reddy",   "conversions": 31, "leads": 76,  "conversion_rate": 40.8 }
]`}</code></pre>
        </div>
      </section>

      {/* Status Breakdown */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Status Breakdown</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Distribution of leads across all status stages, with counts and percentages. Useful for
          identifying bottlenecks in the lead pipeline.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/reports/status-breakdown

// Response
[
  { "status": "New",                "count": 120, "percentage": 14.0 },
  { "status": "Contacted",          "count": 198, "percentage": 23.1 },
  { "status": "Interested",         "count": 156, "percentage": 18.2 },
  { "status": "Follow-up",          "count": 134, "percentage": 15.7 },
  { "status": "Appointment Booked", "count": 98,  "percentage": 11.4 },
  { "status": "Closed",             "count": 112, "percentage": 13.1 },
  { "status": "Rejected",           "count": 38,  "percentage": 4.4 }
]`}</code></pre>
        </div>
      </section>

      {/* Weekly Trend */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Weekly Trend</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Seven-day trend data showing daily lead creation and call volumes. Useful for identifying
          weekly patterns and day-of-week performance.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/reports/weekly-trend

// Response — last 7 days
[
  { "date": "2026-05-11", "leads": 12, "calls": 45 },
  { "date": "2026-05-12", "leads": 18, "calls": 52 },
  { "date": "2026-05-13", "leads": 15, "calls": 48 },
  { "date": "2026-05-14", "leads": 22, "calls": 61 },
  { "date": "2026-05-15", "leads": 19, "calls": 55 },
  { "date": "2026-05-16", "leads": 8,  "calls": 28 },
  { "date": "2026-05-17", "leads": 5,  "calls": 15 }
]`}</code></pre>
        </div>
      </section>

      {/* Telecaller Performance */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Telecaller Performance</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Individual performance statistics for each telecaller, covering their lead activity,
          call metrics, and appointment booking rates.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/reports/telecallers

// Response
[
  {
    "name": "Anita Desai",
    "leads_assigned": 45,
    "calls_made": 189,
    "appointments_booked": 23,
    "avg_call_duration": "4:32"
  },
  {
    "name": "Vikram Singh",
    "leads_assigned": 38,
    "calls_made": 156,
    "appointments_booked": 18,
    "avg_call_duration": "3:58"
  }
  // ...
]`}</code></pre>
        </div>
      </section>

      {/* Conversion Funnel */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Conversion Funnel</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The conversion funnel tracks how leads progress through the pipeline, from initial creation
          to final closure. Each stage shows the count and drop-off rate.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/reports/conversion-funnel

// Response — funnel stages
[
  { "stage": "New Leads",           "count": 856, "percentage": 100.0 },
  { "stage": "Contacted",           "count": 634, "percentage": 74.1 },
  { "stage": "Interested",          "count": 412, "percentage": 48.1 },
  { "stage": "Appointment Booked",  "count": 298, "percentage": 34.8 },
  { "stage": "Closed",              "count": 187, "percentage": 21.8 }
]`}</code></pre>
        </div>
        <div className="mt-4 bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`// Visual representation
New Leads        ████████████████████████████████████████  856 (100%)
Contacted        ██████████████████████████████            634 ( 74%)
Interested       ████████████████████                      412 ( 48%)
Appointment      ██████████████                            298 ( 35%)
Closed           █████████                                 187 ( 22%)`}</code></pre>
        </div>
      </section>

      {/* Call Analytics */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Call Analytics</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Detailed call analytics broken down by multiple dimensions for comprehensive telephony insights.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/reports/call-analytics

// Response
{
  "by_status": {
    "answered": 945,
    "missed": 87,
    "busy": 34,
    "failed": 12
  },
  "by_direction": {
    "inbound": 412,
    "outbound": 666
  },
  "by_hour": [
    { "hour": "09:00", "calls": 45 },
    { "hour": "10:00", "calls": 68 },
    { "hour": "11:00", "calls": 72 },
    { "hour": "12:00", "calls": 55 },
    // ... 24 hours
  ],
  "avg_duration": "4:15"
}`}</code></pre>
        </div>
      </section>

      {/* Appointment Stats */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Appointment Statistics</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Appointment data analyzed by status, department, and no-show rates to identify scheduling
          patterns and areas for improvement.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/reports/appointment-stats

// Response
{
  "by_status": {
    "scheduled": 45,
    "confirmed": 32,
    "completed": 287,
    "cancelled": 38,
    "no_show": 21
  },
  "by_department": [
    { "department": "Orthopaedics", "total": 98, "completed": 82 },
    { "department": "Cardiology",   "total": 76, "completed": 64 },
    { "department": "Neurology",    "total": 54, "completed": 41 }
  ],
  "no_show_rate": 5.0
}`}</code></pre>
        </div>
      </section>

      {/* Daily Activity */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Daily Activity</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          A snapshot of today's operational activity — new leads created, calls made, appointments
          scheduled, and status changes. Useful for daily standup reviews.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/reports/daily-activity

// Response
{
  "new_leads": 12,
  "calls_made": 48,
  "appointments_today": 8,
  "status_changes": 34
}`}</code></pre>
        </div>
      </section>

      {/* CSV Export */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">CSV Export</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          All report data can be exported as CSV files for offline analysis, reporting, or import into
          external tools like Excel or Google Sheets. Three export types are supported:
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Export Type</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Endpoint</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Includes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2 text-gray-800 font-medium">Leads</td>
                <td className="px-4 py-2 font-mono text-gray-600">GET /api/reports/export?type=leads</td>
                <td className="px-4 py-2 text-gray-600">Name, UHID, phone, email, source, status, priority, assigned to, created date</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-800 font-medium">Calls</td>
                <td className="px-4 py-2 font-mono text-gray-600">GET /api/reports/export?type=calls</td>
                <td className="px-4 py-2 text-gray-600">Caller, callee, direction, status, duration, linked lead, timestamp</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-800 font-medium">Appointments</td>
                <td className="px-4 py-2 font-mono text-gray-600">GET /api/reports/export?type=appointments</td>
                <td className="px-4 py-2 text-gray-600">Patient name, phone, department, provider, date, time, status</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`// Export leads as CSV
GET /api/reports/export?type=leads

// Response headers
Content-Type: text/csv
Content-Disposition: attachment; filename="leads-export-2026-05-17.csv"

// CSV content
Name,UHID,Phone,Email,Source,Status,Priority,Assigned To,Created
Priya Sharma,UH-2026-0042,9876543210,priya@email.com,Website,New,High,Anita Desai,2026-05-15
Ravi Kumar,,9123456780,ravi@email.com,Referral,Contacted,Medium,Vikram Singh,2026-05-14`}</code></pre>
        </div>
      </section>
    </div>
  );
};

export default Reports;
