const SuperAdminGuide = () => {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Super Admin Guide</h1>
      <p className="text-gray-600 mb-8">
        The super admin role has unrestricted access to the entire system — user management,
        all data visibility, and full configuration control. This guide covers everything a
        super admin can do.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
        <p className="text-gray-700 mb-4">
          As a super admin, you are the top-level administrator of MediLead CMS. Your account
          has full system access with no restrictions on data visibility or operations.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Key Capabilities</h4>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>Full access to all leads, appointments, and call logs across all users</li>
            <li>Create, update, and deactivate user accounts</li>
            <li>Assign and change user roles</li>
            <li>View system-wide dashboards and analytics</li>
            <li>Export data and generate comprehensive reports</li>
            <li>Configure system settings and preferences</li>
          </ul>
        </div>
      </section>

      {/* User Management */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">User Management</h2>
        <p className="text-gray-700 mb-4">
          Navigate to <strong>Settings &gt; User Management</strong> to manage all user accounts
          in the system.
        </p>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Available Roles</h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-700">Role</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2">
                  <span className="inline-block bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">super_admin</span>
                </td>
                <td className="px-4 py-2 text-gray-600">Full system access, user management, all data visibility</td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">manager</span>
                </td>
                <td className="px-4 py-2 text-gray-600">Team oversight, lead assignment, reports, performance monitoring</td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">telecaller</span>
                </td>
                <td className="px-4 py-2 text-gray-600">Daily operations — handle assigned leads, make calls, book appointments</td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded">staff</span>
                </td>
                <td className="px-4 py-2 text-gray-600">Limited access — view assigned tasks and basic operations</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Creating a New User</h3>
        <ol className="list-decimal list-inside text-gray-700 space-y-2 mb-4">
          <li>Go to <strong>Settings &gt; User Management</strong></li>
          <li>Click the <strong>"Add User"</strong> button in the top-right corner</li>
          <li>Fill in the required fields: full name, email, phone number</li>
          <li>Select the appropriate role from the dropdown</li>
          <li>Set an initial password (the user can change it later)</li>
          <li>Click <strong>"Create User"</strong> to save</li>
        </ol>
        <p className="text-gray-700 mb-4">The equivalent API call:</p>
        <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
          <pre className="text-sm text-gray-100 font-mono">
{`POST /api/auth/users
Content-Type: application/json
Authorization: Bearer <your-token>

{
  "name": "John Doe",
  "email": "john.doe@company.com",
  "phone": "9876543210",
  "role": "telecaller",
  "password": "initialPassword123"
}`}
          </pre>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Other User Operations</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
          <li><strong>Update user details</strong> — Edit name, phone, or department assignment</li>
          <li><strong>Reset password</strong> — Set a new temporary password for any user</li>
          <li><strong>Change role</strong> — Promote or demote users between roles</li>
          <li><strong>Deactivate account</strong> — Disable login without deleting data</li>
        </ul>
      </section>

      {/* System Access */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Access</h2>
        <p className="text-gray-700 mb-4">
          Unlike other roles, a super admin sees <strong>all data</strong> in the system — not
          just records assigned to them.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Leads</h4>
            <p className="text-sm text-gray-600">
              View and manage all leads across the organization. Filter by status, priority,
              assigned user, or department. Reassign leads between telecallers.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Appointments</h4>
            <p className="text-sm text-gray-600">
              See all scheduled appointments. Filter by date, doctor, type, or status.
              Override or cancel any appointment.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Reports</h4>
            <p className="text-sm text-gray-600">
              Access every report type — telecaller performance, conversion funnels,
              department analytics, and call volume reports.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Call Logs</h4>
            <p className="text-sm text-gray-600">
              View all call activity across the system. See who called whom, call duration,
              outcomes, and recordings if available.
            </p>
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Dashboard</h2>
        <p className="text-gray-700 mb-4">
          The admin dashboard shows system-wide metrics aggregated across all users and teams.
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
          <li><strong>Total leads</strong> — New, contacted, converted, and rejected counts</li>
          <li><strong>Appointment overview</strong> — Today's schedule, upcoming, and completed</li>
          <li><strong>Team activity</strong> — Calls made by each telecaller, response times</li>
          <li><strong>Conversion rates</strong> — Lead-to-appointment and appointment-to-closed ratios</li>
          <li><strong>Call analytics</strong> — Volume trends, peak hours, average duration</li>
        </ul>
      </section>

      {/* Settings */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Settings</h2>
        <p className="text-gray-700 mb-4">
          Access settings from the avatar dropdown in the top-right corner.
        </p>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Appearance</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
          <li><strong>Theme</strong> — Light, dark, or system (follows OS preference)</li>
          <li><strong>Sidebar</strong> — Collapse or expand by default</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Account Security</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
          <li><strong>Two-factor authentication (2FA)</strong> — Enable or disable TOTP-based 2FA</li>
          <li><strong>Change password</strong> — Update your account password</li>
          <li><strong>Active sessions</strong> — View and revoke active login sessions</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Notifications</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li><strong>Email notifications</strong> — Toggle alerts for new leads, appointments, and system events</li>
          <li><strong>In-app notifications</strong> — Real-time alerts via Socket.IO</li>
        </ul>
      </section>

      {/* Workflows */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Common Workflows</h2>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Creating a New User</h3>
        <ol className="list-decimal list-inside text-gray-700 space-y-1 mb-6">
          <li>Navigate to <strong>Settings &gt; User Management</strong></li>
          <li>Click <strong>"Add User"</strong></li>
          <li>Enter name, email, phone, and select a role</li>
          <li>Set an initial password and click <strong>"Create User"</strong></li>
          <li>Share the credentials securely with the new user</li>
        </ol>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Viewing Team Performance</h3>
        <ol className="list-decimal list-inside text-gray-700 space-y-1 mb-6">
          <li>Go to <strong>Reports</strong> from the sidebar</li>
          <li>Select <strong>"Telecaller Performance"</strong> report</li>
          <li>Set the date range (today, this week, this month, or custom)</li>
          <li>Review call counts, conversion rates, and response times per user</li>
          <li>Click on any telecaller row to drill down into their activity</li>
        </ol>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Exporting Data</h3>
        <ol className="list-decimal list-inside text-gray-700 space-y-1">
          <li>Navigate to the data view you want to export (Leads, Appointments, Reports)</li>
          <li>Apply any filters to narrow down the dataset</li>
          <li>Click the <strong>"Export"</strong> button in the toolbar</li>
          <li>Choose the format (CSV or Excel)</li>
          <li>The file downloads automatically with the filtered data</li>
        </ol>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Tips for Super Admins</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm text-blue-800">
            <strong>Audit regularly:</strong> Review user activity and call logs weekly to ensure
            data integrity and identify training needs.
          </p>
          <p className="text-sm text-blue-800">
            <strong>Use lead assignment wisely:</strong> Distribute leads evenly among telecallers
            to prevent burnout and maximize coverage.
          </p>
          <p className="text-sm text-blue-800">
            <strong>Monitor dashboards daily:</strong> Check conversion funnels and call volumes
            to catch issues early.
          </p>
          <p className="text-sm text-blue-800">
            <strong>Secure credentials:</strong> Enforce strong passwords and encourage 2FA for
            all users with access to sensitive data.
          </p>
        </div>
      </section>
    </div>
  );
};

export default SuperAdminGuide;
