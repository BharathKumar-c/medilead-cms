const Notifications = () => {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
      <p className="text-gray-600 mb-8">
        Real-time notification system powered by Socket.IO for instant updates across the application.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Overview</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          MediLead CMS uses a real-time notification system built on Socket.IO. When an event occurs
          in the backend (a new lead is assigned, an appointment is booked, a call is missed), the
          server creates a notification record in the database and simultaneously emits a Socket.IO
          event to the relevant user's room. The frontend receives this event and displays both a
          toast popup and an entry in the notification bell dropdown.
        </p>
      </section>

      {/* How It Works */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">How It Works</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>
              <span className="font-medium text-gray-900">Backend creates notification</span> &mdash;
              An API endpoint or cron job inserts a row into the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">notifications</code> table
              with the target <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">user_id</code>, type, title, and optional link.
            </li>
            <li>
              <span className="font-medium text-gray-900">Socket.IO emits to user room</span> &mdash;
              The server emits a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">'notification'</code> event
              to the Socket.IO room named after the user's ID. Only that user receives the event.
            </li>
            <li>
              <span className="font-medium text-gray-900">Frontend receives and displays</span> &mdash;
              The React app listens for the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">'notification'</code> event,
              updates the bell icon unread count, and shows a toast notification in the bottom-right corner.
            </li>
          </ol>
        </div>
      </section>

      {/* Notification Types */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Notification Types</h2>
        <p className="text-gray-700 mb-4">
          Each notification has a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">type</code> field
          that determines its visual styling and urgency level.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-red-800">urgent</p>
              <p className="text-sm text-red-600">Red &mdash; Critical alerts requiring immediate attention</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-yellow-800">warning</p>
              <p className="text-sm text-yellow-600">Yellow &mdash; Important notices that may need action</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-green-800">success</p>
              <p className="text-sm text-green-600">Green &mdash; Confirmations and successful operations</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-blue-800">info</p>
              <p className="text-sm text-blue-600">Blue &mdash; General information and updates</p>
            </div>
          </div>
        </div>
      </section>

      {/* When Notifications Are Sent */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">When Notifications Are Sent</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Event</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Recipient</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 text-gray-700">New lead assigned</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">info</span></td>
                <td className="px-4 py-3 text-gray-600">Assigned telecaller</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Lead status changed</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">info</span></td>
                <td className="px-4 py-3 text-gray-600">Assigned telecaller</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Appointment booked</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">success</span></td>
                <td className="px-4 py-3 text-gray-600">Booking user</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Appointment cancelled</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">warning</span></td>
                <td className="px-4 py-3 text-gray-600">Booking user</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Appointment rescheduled</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">warning</span></td>
                <td className="px-4 py-3 text-gray-600">Booking user</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Missed call</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">urgent</span></td>
                <td className="px-4 py-3 text-gray-600">Assigned telecaller</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Follow-up reminder</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">warning</span></td>
                <td className="px-4 py-3 text-gray-600">Assigned telecaller</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Notification Center */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Notification Center</h2>
        <p className="text-gray-700 mb-4">
          The bell icon in the header serves as the notification center. It provides a dropdown
          interface for managing all notifications.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-medium text-gray-900">Unread Count Badge</p>
              <p className="text-sm text-gray-600">A red badge on the bell icon shows the number of unread notifications. Hidden when count is zero.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-medium text-gray-900">Dropdown List</p>
              <p className="text-sm text-gray-600">Clicking the bell opens a dropdown showing recent notifications with type indicator, title, timestamp, and clickable links.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">3</span>
            <div>
              <p className="font-medium text-gray-900">Mark as Read</p>
              <p className="text-sm text-gray-600">Individual notifications can be marked as read. A "Mark all as read" button clears the entire unread count.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">4</span>
            <div>
              <p className="font-medium text-gray-900">Delete</p>
              <p className="text-sm text-gray-600">Notifications can be individually deleted from the list.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Toast Notifications */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Toast Notifications</h2>
        <p className="text-gray-700 mb-4">
          When a new notification arrives via Socket.IO, a toast popup appears in the bottom-right
          corner of the screen. Toasts auto-dismiss after a few seconds and include a sound alert.
        </p>
        <div className="bg-gray-900 rounded-lg p-5 text-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-gray-400 text-xs font-mono">Toast Notification Component</span>
          </div>
          <pre className="text-gray-300 font-mono text-xs leading-relaxed overflow-x-auto"><code>{`// Toast appears in bottom-right corner
// Auto-dismisses after 4 seconds
// Plays a Web Audio API chime on arrival

const toastStyles = {
  urgent:  'border-l-4 border-red-500 bg-red-50',
  warning: 'border-l-4 border-yellow-500 bg-yellow-50',
  success: 'border-l-4 border-green-500 bg-green-50',
  info:    'border-l-4 border-blue-500 bg-blue-50',
};

// Sound is generated programmatically using Web Audio API
// No external audio file required
const playChime = () => {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
};`}</code></pre>
        </div>
      </section>

      {/* Follow-up Reminders */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Follow-up Reminders</h2>
        <p className="text-gray-700 mb-4">
          A server-side cron job runs every hour to check for leads that need follow-up attention.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
          <h3 className="font-medium text-yellow-800 mb-2">Reminder Logic</h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-yellow-700">
            <li>Runs every hour via <code className="bg-yellow-100 px-1 py-0.5 rounded text-xs font-mono">node-cron</code></li>
            <li>Queries leads where <code className="bg-yellow-100 px-1 py-0.5 rounded text-xs font-mono">status = 'Follow-up'</code></li>
            <li>Checks if <code className="bg-yellow-100 px-1 py-0.5 rounded text-xs font-mono">last_call_date</code> is older than 3 days</li>
            <li>Sends a <code className="bg-yellow-100 px-1 py-0.5 rounded text-xs font-mono">warning</code> notification to the assigned user</li>
            <li>Notification links directly to the lead for quick access</li>
          </ul>
        </div>
      </section>

      {/* Socket.IO Events */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Socket.IO Events</h2>
        <p className="text-gray-700 mb-4">
          The frontend listens for three primary Socket.IO events for real-time updates.
        </p>
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <code className="bg-gray-900 text-green-400 px-2.5 py-1 rounded text-sm font-mono">'notification'</code>
              <span className="text-xs text-gray-500">User-specific notifications</span>
            </div>
            <p className="text-sm text-gray-600">
              Emitted to a user's private room when a new notification is created. Payload includes
              the full notification object (id, type, title, link, created_at).
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <code className="bg-gray-900 text-green-400 px-2.5 py-1 rounded text-sm font-mono">'call-event'</code>
              <span className="text-xs text-gray-500">Call status updates</span>
            </div>
            <p className="text-sm text-gray-600">
              Broadcast when call status changes (ringing, answered, ended). Used to update the
              call status indicator in the header and log call events in real-time.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <code className="bg-gray-900 text-green-400 px-2.5 py-1 rounded text-sm font-mono">'incoming-call'</code>
              <span className="text-xs text-gray-500">Incoming call popups</span>
            </div>
            <p className="text-sm text-gray-600">
              Emitted when a SIP call arrives. The frontend displays a call popup with caller
              information and auto-looks up the caller's number in the leads database.
            </p>
          </div>
        </div>
      </section>

      {/* Bell Flash */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Bell Flash Animation</h2>
        <p className="text-gray-700 mb-4">
          When a new notification arrives, the bell icon in the header flashes for 3 seconds to
          draw the user's attention. This uses a CSS animation that scales and rotates the bell
          icon briefly.
        </p>
        <div className="bg-gray-900 rounded-lg p-5 text-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-gray-400 text-xs font-mono">CSS Animation</span>
          </div>
          <pre className="text-gray-300 font-mono text-xs leading-relaxed overflow-x-auto"><code>{`@keyframes bell-flash {
  0%, 100% { transform: rotate(0deg); }
  15%      { transform: rotate(15deg); }
  30%      { transform: rotate(-15deg); }
  45%      { transform: rotate(10deg); }
  60%      { transform: rotate(-10deg); }
  75%      { transform: rotate(5deg); }
}

.bell-flash {
  animation: bell-flash 0.8s ease-in-out;
  animation-iteration-count: 3;
}`}</code></pre>
        </div>
      </section>
    </div>
  );
};

export default Notifications;
