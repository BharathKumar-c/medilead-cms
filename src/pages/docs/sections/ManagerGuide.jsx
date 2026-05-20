const ManagerGuide = () => {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Manager Guide</h1>
      <p className="text-gray-600 mb-8">
        Managers oversee team operations — monitoring performance, assigning leads, and ensuring
        the team meets targets. This guide covers your daily responsibilities and tools.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
        <p className="text-gray-700 mb-4">
          As a manager, you have visibility into your team's activities and performance. You can
          assign leads, monitor appointments, and generate reports — but you do not have access
          to system-level settings or user management.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Your Permissions</h4>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>View all leads (not just assigned to you)</li>
            <li>Assign and reassign leads to telecallers</li>
            <li>View all team appointments</li>
            <li>Access all report types</li>
            <li>Monitor call volumes and conversion rates</li>
            <li>Update lead statuses and add notes</li>
          </ul>
        </div>
      </section>

      {/* Dashboard */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Dashboard</h2>
        <p className="text-gray-700 mb-4">
          Your dashboard shows team-level metrics to help you track performance at a glance.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Team Metrics</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Total leads assigned to team</li>
              <li>Leads by status (new, contacted, converted)</li>
              <li>Today's call volume across the team</li>
              <li>Appointments scheduled today</li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Performance Indicators</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Team conversion rate</li>
              <li>Average calls per telecaller</li>
              <li>Lead response time</li>
              <li>Follow-up compliance rate</li>
            </ul>
          </div>
        </div>

        <p className="text-gray-700">
          Use the date range filter to compare performance across different periods — today,
          this week, this month, or a custom range.
        </p>
      </section>

      {/* Lead Management */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Lead Management</h2>
        <p className="text-gray-700 mb-4">
          Navigate to <strong>Leads</strong> from the sidebar to view and manage all leads in the system.
        </p>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Viewing Leads</h3>
        <p className="text-gray-700 mb-3">
          Unlike telecallers who only see their assigned leads, you can view <strong>all leads</strong>
          across the team. Use filters to narrow down:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
          <li><strong>Status</strong> — New, Contacted, Interested, Follow-up, Appointment Booked, Closed, Rejected</li>
          <li><strong>Priority</strong> — High, Medium, Low</li>
          <li><strong>Assigned to</strong> — Filter by specific telecaller</li>
          <li><strong>Source</strong> — Website, referral, walk-in, etc.</li>
          <li><strong>Department</strong> — Cardiology, Orthopedics, General, etc.</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Assigning Leads</h3>
        <ol className="list-decimal list-inside text-gray-700 space-y-2 mb-4">
          <li>Open the lead you want to assign (or select multiple from the list)</li>
          <li>Click the <strong>"Assign"</strong> button or the assignee dropdown</li>
          <li>Select the telecaller from the list</li>
          <li>Confirm the assignment</li>
        </ol>
        <p className="text-gray-700 mb-4">
          The telecaller receives a real-time notification when a lead is assigned to them.
        </p>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Tracking Status Changes</h3>
        <p className="text-gray-700 mb-3">
          Every lead has a full activity history showing:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>When the status changed and by whom</li>
          <li>Notes added during each interaction</li>
          <li>Call logs linked to the lead</li>
          <li>Appointment history</li>
        </ul>
      </section>

      {/* Appointments */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Appointments</h2>
        <p className="text-gray-700 mb-4">
          Navigate to <strong>Appointments</strong> from the sidebar to see all team appointments.
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
          <li><strong>Calendar view</strong> — See appointments by day, week, or month</li>
          <li><strong>List view</strong> — Sortable table with filters for status, doctor, and type</li>
          <li><strong>Status tracking</strong> — Scheduled, confirmed, completed, cancelled, no-show</li>
          <li><strong>Filters</strong> — By telecaller, department, date range, or appointment type</li>
        </ul>
        <p className="text-gray-700">
          You can view any team member's appointment schedule to help with workload balancing
          and coverage planning.
        </p>
      </section>

      {/* Reports */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Reports</h2>
        <p className="text-gray-700 mb-4">
          Navigate to <strong>Reports</strong> from the sidebar. You have access to all report types.
        </p>

        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Telecaller Performance</h4>
            <p className="text-sm text-gray-600 mb-2">
              Compare individual performance metrics — calls made, leads converted, appointments
              booked, and average response time.
            </p>
            <p className="text-xs text-gray-500">
              Use this to identify top performers and those who may need additional support.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Conversion Funnel</h4>
            <p className="text-sm text-gray-600 mb-2">
              Visualize how leads move through the pipeline — from new lead to contacted,
              interested, appointment booked, and finally closed.
            </p>
            <p className="text-xs text-gray-500">
              Identify where leads drop off and optimize the process at each stage.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Department Performance</h4>
            <p className="text-sm text-gray-600 mb-2">
              Compare metrics across departments — lead volume, conversion rates, and
              appointment counts by medical department.
            </p>
            <p className="text-xs text-gray-500">
              Useful for resource allocation and identifying high-demand departments.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Call Analytics</h4>
            <p className="text-sm text-gray-600 mb-2">
              Analyze call patterns — volume by hour, average duration, peak calling times,
              and missed call rates.
            </p>
            <p className="text-xs text-gray-500">
              Optimize staffing schedules based on call volume trends.
            </p>
          </div>
        </div>
      </section>

      {/* Daily Workflow */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Workflow</h2>
        <p className="text-gray-700 mb-4">
          A recommended daily routine for managers to keep the team productive and on track.
        </p>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <h4 className="font-semibold text-gray-800">Morning — Review New Leads</h4>
              <p className="text-sm text-gray-600">
                Check leads that came in overnight. Assign unassigned leads to available telecallers
                based on workload and expertise.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <h4 className="font-semibold text-gray-800">Mid-Morning — Monitor Follow-ups</h4>
              <p className="text-sm text-gray-600">
                Check the lead board for leads in "Follow-up" status. Ensure telecallers are
                reaching out to scheduled follow-ups on time.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <h4 className="font-semibold text-gray-800">Afternoon — Check Reports</h4>
              <p className="text-sm text-gray-600">
                Review the day's call volume and conversion metrics. Identify any bottlenecks
                or telecallers who may need assistance.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">4</div>
            <div>
              <h4 className="font-semibold text-gray-800">End of Day — Team Review</h4>
              <p className="text-sm text-gray-600">
                Export the day's activity report. Note any leads that need escalation or
                reassignment. Plan the next day's priorities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Tips for Managers</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm text-blue-800">
            <strong>Balance workloads:</strong> Distribute leads evenly across telecallers. Avoid
            overloading one person while others have capacity.
          </p>
          <p className="text-sm text-blue-800">
            <strong>Act on high-priority leads fast:</strong> Prioritize "High" leads and ensure they are
            contacted within the first hour of assignment.
          </p>
          <p className="text-sm text-blue-800">
            <strong>Use reports proactively:</strong> Don't wait for problems — check conversion
            funnels weekly to spot trends early.
          </p>
          <p className="text-sm text-blue-800">
            <strong>Coach, don't just monitor:</strong> Use performance data to identify training
            opportunities and help telecallers improve.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ManagerGuide;
