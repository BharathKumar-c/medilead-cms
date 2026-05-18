const Appointments = () => {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Appointments</h1>
      <p className="text-gray-600 mb-8">
        Schedule, manage, and track patient appointments with calendar views, conflict detection, and status workflows.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Overview</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Appointments module handles the complete scheduling lifecycle — booking new appointments,
          rescheduling when needed, cancellations with reason tracking, and daily overview dashboards.
          Built-in conflict detection prevents double-booking providers, and all status changes trigger
          real-time notifications.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800 font-medium mb-1">Key Capabilities</p>
          <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
            <li>Book appointments with patient, department, provider, date, and time</li>
            <li>Conflict detection to prevent double-booking</li>
            <li>Monthly calendar view with color-coded status counts</li>
            <li>Today overview cards for quick status summary</li>
            <li>Reschedule and cancel with full audit trail</li>
            <li>Filter by status, date, provider, and department</li>
          </ul>
        </div>
      </section>

      {/* Booking */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Booking an Appointment</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Appointments are booked by selecting a patient, choosing a department and provider, then
          picking an available date and time slot. The system performs real-time conflict detection
          to ensure the provider is available at the requested time.
        </p>
        <h3 className="text-lg font-medium text-gray-800 mb-2">Booking Fields</h3>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Field</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Type</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Required</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="px-4 py-2 text-gray-800">Patient Name</td><td className="px-4 py-2 text-gray-600">Text</td><td className="px-4 py-2 text-gray-600">Yes</td><td className="px-4 py-2 text-gray-600">Patient's full name</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Phone</td><td className="px-4 py-2 text-gray-600">Text</td><td className="px-4 py-2 text-gray-600">Yes</td><td className="px-4 py-2 text-gray-600">10-digit contact number</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Department</td><td className="px-4 py-2 text-gray-600">Dropdown</td><td className="px-4 py-2 text-gray-600">Yes</td><td className="px-4 py-2 text-gray-600">From master_department table</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Provider</td><td className="px-4 py-2 text-gray-600">Dropdown</td><td className="px-4 py-2 text-gray-600">Yes</td><td className="px-4 py-2 text-gray-600">Users with appropriate roles</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Date</td><td className="px-4 py-2 text-gray-600">Date</td><td className="px-4 py-2 text-gray-600">Yes</td><td className="px-4 py-2 text-gray-600">Appointment date (today or future)</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Time</td><td className="px-4 py-2 text-gray-600">Time</td><td className="px-4 py-2 text-gray-600">Yes</td><td className="px-4 py-2 text-gray-600">HH:MM format, conflict-checked</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Notes</td><td className="px-4 py-2 text-gray-600">Textarea</td><td className="px-4 py-2 text-gray-600">No</td><td className="px-4 py-2 text-gray-600">Reason for visit or special instructions</td></tr>
            </tbody>
          </table>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`POST /api/appointments
{
  "patient_name": "Ravi Kumar",
  "phone": "9876543210",
  "department": "Orthopaedics",
  "provider_id": 5,
  "appointment_date": "2026-05-20",
  "appointment_time": "10:30",
  "notes": "Follow-up for knee consultation"
}`}</code></pre>
        </div>
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Conflict Detection:</strong> If the selected provider already has an appointment
            at the requested date and time, the API returns a <code className="bg-yellow-100 px-1 rounded">409 Conflict</code> error
            with the conflicting appointment details. The user must choose a different time slot.
          </p>
        </div>
      </section>

      {/* Calendar View */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Calendar View</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The monthly calendar provides a visual overview of all appointments. Each day cell shows
          appointment counts color-coded by status, making it easy to spot busy days and availability at a glance.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { status: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
            { status: 'Confirmed', color: 'bg-green-100 text-green-800' },
            { status: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
            { status: 'Cancelled', color: 'bg-red-100 text-red-800' },
          ].map(s => (
            <div key={s.status} className={`px-3 py-2 rounded-lg text-sm font-medium ${s.color}`}>
              {s.status}
            </div>
          ))}
        </div>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/appointments/calendar?year=2026&month=5

// Response — one entry per day with counts
[
  { "date": "2026-05-01", "scheduled": 3, "confirmed": 2, "completed": 5, "cancelled": 1 },
  { "date": "2026-05-02", "scheduled": 1, "confirmed": 4, "completed": 3, "cancelled": 0 },
  // ...
]`}</code></pre>
        </div>
      </section>

      {/* Today Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Today Overview</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Today Overview provides a quick summary of the day's appointment status through
          summary cards displayed at the top of the appointments page.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Scheduled', color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { label: 'Confirmed', color: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'Completed', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { label: 'Cancelled', color: 'bg-red-50 border-red-200 text-red-700' },
            { label: 'No Show', color: 'bg-orange-50 border-orange-200 text-orange-700' },
          ].map(card => (
            <div key={card.label} className={`p-3 rounded-lg border text-center ${card.color}`}>
              <p className="text-2xl font-bold">--</p>
              <p className="text-xs font-medium">{card.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/appointments/today

// Response
{
  "scheduled": 8,
  "confirmed": 5,
  "completed": 3,
  "cancelled": 1,
  "no_show": 0
}`}</code></pre>
        </div>
      </section>

      {/* Rescheduling */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Rescheduling</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Appointments can be rescheduled by selecting a new date and time. The system runs the same
          conflict detection as booking to ensure the provider is available. On successful rescheduling,
          a notification is sent to the provider.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`PUT /api/appointments/42/reschedule
{
  "appointment_date": "2026-05-22",
  "appointment_time": "14:00"
}`}</code></pre>
        </div>
      </section>

      {/* Cancellation */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Cancellation</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Cancellations require a reason, which is stored for audit purposes. The appointment status
          is updated to "Cancelled" and a notification is sent to the assigned provider and relevant
          team members.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`PUT /api/appointments/42/cancel
{
  "reason": "Patient requested reschedule due to travel conflict"
}`}</code></pre>
        </div>
      </section>

      {/* Status Flow */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Status Flow</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Appointments follow a defined status lifecycle from scheduling to completion or cancellation.
        </p>
        <div className="space-y-3 mb-4">
          {[
            { status: 'Scheduled', desc: 'Appointment has been booked. Awaiting confirmation.', color: 'bg-blue-100 text-blue-800' },
            { status: 'Confirmed', desc: 'Patient or provider has confirmed the appointment.', color: 'bg-green-100 text-green-800' },
            { status: 'Completed', desc: 'Patient attended. Appointment fulfilled.', color: 'bg-emerald-100 text-emerald-800' },
            { status: 'Cancelled', desc: 'Cancelled by patient or provider. Reason recorded.', color: 'bg-red-100 text-red-800' },
            { status: 'No Show', desc: 'Patient did not attend the scheduled appointment.', color: 'bg-orange-100 text-orange-800' },
          ].map((s, i) => (
            <div key={s.status} className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s.color}`}>
                {i + 1}
              </span>
              <div>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${s.color} mr-2`}>
                  {s.status}
                </span>
                <span className="text-sm text-gray-700">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`// Status transitions
Scheduled  -->  Confirmed  -->  Completed
     |               |
     v               v
Cancelled        Cancelled     No Show`}</code></pre>
        </div>
      </section>

      {/* Filtering */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Filtering</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The appointments list supports multiple filters that can be combined:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
          <li><strong>Status:</strong> Filter by Scheduled, Confirmed, Completed, Cancelled, or No Show</li>
          <li><strong>Date:</strong> Filter by specific date or date range</li>
          <li><strong>Provider:</strong> Show appointments for a specific doctor or provider</li>
          <li><strong>Department:</strong> Filter by department (Orthopaedics, Cardiology, etc.)</li>
        </ul>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/appointments?status=Scheduled&date=2026-05-20&provider_id=5&department=Orthopaedics&page=1&limit=20`}</code></pre>
        </div>
      </section>

      {/* Providers & Departments */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Providers and Departments</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Providers are system users with appropriate roles (typically doctors or specialists). Departments
          are managed via the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">master_department</code> database table.
          Both lists are fetched via dedicated API endpoints used to populate booking form dropdowns.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`// Fetch providers for dropdown
GET /api/appointments/providers
// Response: [{ "id": 5, "name": "Dr. Rajesh Gupta", "specialty": "Orthopaedics" }, ...]

// Fetch departments for dropdown
GET /api/appointments/departments
// Response: [{ "id": 1, "name": "Orthopaedics" }, { "id": 2, "name": "Cardiology" }, ...]`}</code></pre>
        </div>
      </section>
    </div>
  );
};

export default Appointments;
