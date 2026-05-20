const TelecallerGuide = () => {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Telecaller Guide</h1>
      <p className="text-gray-600 mb-8">
        As a telecaller, you are the front line of patient engagement. This guide covers your
        daily operations — managing assigned leads, making calls, booking appointments, and
        tracking your performance.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
        <p className="text-gray-700 mb-4">
          Your role focuses on contacting leads, understanding their needs, and guiding them
          toward booking an appointment. You work with leads assigned to you by your manager.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">What You Can Do</h4>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>View and manage your assigned leads</li>
            <li>Update lead statuses and add notes</li>
            <li>Make and receive calls through the SIP integration</li>
            <li>Book appointments for patients</li>
            <li>View your personal performance metrics</li>
            <li>Access your appointment schedule</li>
          </ul>
        </div>
      </section>

      {/* Dashboard */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Dashboard</h2>
        <p className="text-gray-700 mb-4">
          Your personal dashboard shows metrics relevant to your daily work.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">--</p>
            <p className="text-sm text-gray-600">Calls Today</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">--</p>
            <p className="text-sm text-gray-600">Leads Assigned</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">--</p>
            <p className="text-sm text-gray-600">Appointments Today</p>
          </div>
        </div>

        <p className="text-gray-700">
          The dashboard updates in real-time as you make calls and update lead statuses throughout
          the day.
        </p>
      </section>

      {/* Lead Box */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Lead Box</h2>
        <p className="text-gray-700 mb-4">
          Navigate to <strong>Lead Box</strong> from the sidebar. This is your primary workspace
          for managing assigned leads.
        </p>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Viewing Leads</h3>
        <p className="text-gray-700 mb-3">
          You only see leads assigned to you. Each lead card shows:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
          <li><strong>Patient name</strong> and contact number</li>
          <li><strong>Status</strong> — Current stage in the pipeline</li>
          <li><strong>Priority</strong> — High, Medium, or Low</li>
          <li><strong>Source</strong> — Where the lead came from</li>
          <li><strong>Department</strong> — Medical department of interest</li>
          <li><strong>Last activity</strong> — When the lead was last contacted</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Search and Filter</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
          <li><strong>Search</strong> — Type a name, phone number, or UHID to find a specific lead</li>
          <li><strong>Status filter</strong> — Show only leads in a specific status</li>
          <li><strong>Priority filter</strong> — Focus on hot leads first</li>
          <li><strong>Sort</strong> — By last activity, priority, or creation date</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Updating a Lead</h3>
        <ol className="list-decimal list-inside text-gray-700 space-y-2 mb-4">
          <li>Click on a lead to open the detail view</li>
          <li>Update the <strong>status</strong> dropdown to reflect the current stage</li>
          <li>Add <strong>notes</strong> about the conversation or next steps</li>
          <li>Click <strong>"Save"</strong> to update the record</li>
        </ol>
        <p className="text-gray-700">
          Every status change and note is logged in the lead's activity history for audit purposes.
        </p>
      </section>

      {/* Making Calls */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Making Calls</h2>
        <p className="text-gray-700 mb-4">
          MediLead CMS integrates with your phone system via SIP. Calls can be initiated directly
          from the application.
        </p>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Incoming Calls</h3>
        <ol className="list-decimal list-inside text-gray-700 space-y-2 mb-4">
          <li>When a call comes in, a <strong>call popup</strong> appears automatically</li>
          <li>The system looks up the caller's phone number against your lead database</li>
          <li>If a match is found, the lead's details are displayed immediately</li>
          <li>If no match exists, you can create a new lead on the spot</li>
          <li>After the call ends, the duration and outcome are logged automatically</li>
        </ol>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Outgoing Calls</h3>
        <ol className="list-decimal list-inside text-gray-700 space-y-2 mb-4">
          <li>Open the lead you want to call</li>
          <li>Click the <strong>phone icon</strong> next to the contact number</li>
          <li>The call is initiated through your SIP connection</li>
          <li>After the call, update the lead status and add notes</li>
        </ol>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Call Logging</h3>
        <p className="text-gray-700">
          Every call is automatically logged with:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>Call direction (inbound/outbound)</li>
          <li>Duration</li>
          <li>Timestamp</li>
          <li>Linked lead (if matched)</li>
          <li>Outcome (if manually tagged)</li>
        </ul>
      </section>

      {/* Appointments */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Appointments</h2>
        <p className="text-gray-700 mb-4">
          Navigate to <strong>Appointments</strong> from the sidebar to view your schedule and
          book new appointments.
        </p>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Booking an Appointment</h3>
        <ol className="list-decimal list-inside text-gray-700 space-y-2 mb-4">
          <li>Open the lead you want to book for</li>
          <li>Click <strong>"Book Appointment"</strong></li>
          <li>Select the <strong>department</strong> and <strong>doctor</strong></li>
          <li>Choose a <strong>date and time slot</strong></li>
          <li>Select the <strong>appointment type</strong> (consultation, follow-up, procedure, etc.)</li>
          <li>Add any <strong>notes</strong> for the doctor</li>
          <li>Click <strong>"Confirm Booking"</strong></li>
        </ol>
        <p className="text-gray-700 mb-4">
          The lead status automatically updates to "Appointment Booked" when you confirm.
        </p>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Viewing Your Schedule</h3>
        <p className="text-gray-700">
          Your appointment view shows all appointments you have booked. Use the calendar to see
          today's schedule, upcoming appointments, and past records. Filter by status to focus on
          confirmed, pending, or completed appointments.
        </p>
      </section>

      {/* Lead Statuses */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Lead Statuses</h2>
        <p className="text-gray-700 mb-4">
          Every lead moves through a pipeline of statuses. Understanding these stages is critical
          to your workflow.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="inline-block bg-gray-100 text-gray-800 text-xs font-medium px-3 py-1.5 rounded-full">New</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full">Contacted</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-3 py-1.5 rounded-full">Interested</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-medium px-3 py-1.5 rounded-full">Follow-up</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="inline-block bg-purple-100 text-purple-800 text-xs font-medium px-3 py-1.5 rounded-full">Appointment Booked</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-medium px-3 py-1.5 rounded-full">Closed</span>
          <span className="text-gray-400">/</span>
          <span className="inline-block bg-red-100 text-red-800 text-xs font-medium px-3 py-1.5 rounded-full">Rejected</span>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700">When to Use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2">
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded">New</span>
                </td>
                <td className="px-4 py-2 text-gray-600">Freshly assigned lead, no contact attempted yet</td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">Contacted</span>
                </td>
                <td className="px-4 py-2 text-gray-600">First call made — patient reached or voicemail left</td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">Interested</span>
                </td>
                <td className="px-4 py-2 text-gray-600">Patient expressed interest in a service or consultation</td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded">Follow-up</span>
                </td>
                <td className="px-4 py-2 text-gray-600">Patient needs time to decide; schedule a callback</td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <span className="inline-block bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded">Appointment Booked</span>
                </td>
                <td className="px-4 py-2 text-gray-600">Patient has a confirmed appointment date and time</td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded">Closed</span>
                </td>
                <td className="px-4 py-2 text-gray-600">Patient attended appointment; lead successfully converted</td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <span className="inline-block bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">Rejected</span>
                </td>
                <td className="px-4 py-2 text-gray-600">Patient declined, wrong number, or not eligible</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Daily Workflow */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Workflow</h2>
        <p className="text-gray-700 mb-4">
          A recommended daily routine to stay organized and maximize your conversions.
        </p>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <h4 className="font-semibold text-gray-800">Start of Day — Check Dashboard</h4>
              <p className="text-sm text-gray-600">
                Review your dashboard for new leads assigned overnight and today's appointment
                schedule. Prioritize hot leads for immediate follow-up.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <h4 className="font-semibold text-gray-800">Morning Block — New Lead Outreach</h4>
              <p className="text-sm text-gray-600">
                Work through your new leads. Call each one, update the status based on the
                outcome, and add notes about the conversation.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <h4 className="font-semibold text-gray-800">Midday — Follow-up Calls</h4>
              <p className="text-sm text-gray-600">
                Check leads in "Follow-up" status that are due for a callback today. Reconnect
                with patients who needed time to decide.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">4</div>
            <div>
              <h4 className="font-semibold text-gray-800">Afternoon — Book Appointments</h4>
              <p className="text-sm text-gray-600">
                For interested patients, book their appointments. Confirm the date, time, and
                department. Update the lead status to "Appointment Booked."
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">5</div>
            <div>
              <h4 className="font-semibold text-gray-800">End of Day — Log and Review</h4>
              <p className="text-sm text-gray-600">
                Ensure all calls are logged and lead statuses are up to date. Add notes for any
                leads that need follow-up tomorrow. Review your daily metrics on the dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Tips for Telecallers</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm text-blue-800">
            <strong>Always add notes:</strong> Even a one-line note about the call outcome helps
            you and your team pick up where you left off on follow-ups.
          </p>
          <p className="text-sm text-blue-800">
            <strong>Update statuses promptly:</strong> Keep the pipeline accurate. A stale status
            means missed opportunities or duplicate effort.
          </p>
          <p className="text-sm text-blue-800">
            <strong>Call high-priority leads first:</strong> Prioritize by "High" priority. These patients
            are most likely to convert if contacted quickly.
          </p>
          <p className="text-sm text-blue-800">
            <strong>Use the call popup:</strong> When a call comes in, let the system identify the
            patient. It saves time and gives you context before you speak.
          </p>
          <p className="text-sm text-blue-800">
            <strong>Don't reject too early:</strong> If a patient says "not now," move to follow-up
            instead of rejected. Circumstances change.
          </p>
        </div>
      </section>
    </div>
  );
};

export default TelecallerGuide;
