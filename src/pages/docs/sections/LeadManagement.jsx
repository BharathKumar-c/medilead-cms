const LeadManagement = () => {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Lead Management</h1>
      <p className="text-gray-600 mb-8">
        Complete lifecycle management for patient leads — from creation through conversion or closure.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Overview</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Lead management is the core module of MediLead CMS. It covers the entire patient lead lifecycle —
          creation via the Patient Intake Form, duplicate detection, auto-assignment to telecallers,
          status progression, and full audit history. Every action on a lead is tracked for accountability
          and reporting.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium mb-1">Key Capabilities</p>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Create leads with comprehensive patient data</li>
            <li>Duplicate detection via phone number</li>
            <li>Round-robin auto-assignment to telecallers</li>
            <li>7-stage status workflow with full history</li>
            <li>Search, filter, sort, and paginate the Lead Box</li>
            <li>UHID-based patient lookup with auto-fill</li>
          </ul>
        </div>
      </section>

      {/* Creating Leads */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Creating Leads</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          New leads are created through the <strong>Patient Intake Form</strong>, accessible via the
          "New" button in the header. The form captures all relevant patient and lead information.
        </p>
        <h3 className="text-lg font-medium text-gray-800 mb-2">Form Fields</h3>
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
              <tr><td className="px-4 py-2 text-gray-800">Name</td><td className="px-4 py-2 text-gray-600">Text</td><td className="px-4 py-2 text-gray-600">Yes</td><td className="px-4 py-2 text-gray-600">Full-width layout</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">UHID</td><td className="px-4 py-2 text-gray-600">Text</td><td className="px-4 py-2 text-gray-600">No</td><td className="px-4 py-2 text-gray-600">Unique Health ID; triggers auto-fill if exists</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Phone</td><td className="px-4 py-2 text-gray-600">Text</td><td className="px-4 py-2 text-gray-600">Yes</td><td className="px-4 py-2 text-gray-600">10 digits only, validated on input</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Email</td><td className="px-4 py-2 text-gray-600">Email</td><td className="px-4 py-2 text-gray-600">No</td><td className="px-4 py-2 text-gray-600">Optional contact email</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Date of Birth</td><td className="px-4 py-2 text-gray-600">Date</td><td className="px-4 py-2 text-gray-600">No</td><td className="px-4 py-2 text-gray-600">Age displayed as text below the field</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Address</td><td className="px-4 py-2 text-gray-600">Text</td><td className="px-4 py-2 text-gray-600">No</td><td className="px-4 py-2 text-gray-600">Street address</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Pincode</td><td className="px-4 py-2 text-gray-600">Text</td><td className="px-4 py-2 text-gray-600">No</td><td className="px-4 py-2 text-gray-600">Auto-fills city and state via PIN code API</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">City / State</td><td className="px-4 py-2 text-gray-600">Text</td><td className="px-4 py-2 text-gray-600">No</td><td className="px-4 py-2 text-gray-600">Auto-populated from pincode</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Lead Source</td><td className="px-4 py-2 text-gray-600">Dropdown</td><td className="px-4 py-2 text-gray-600">Yes</td><td className="px-4 py-2 text-gray-600">From master_lead_source table</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Status</td><td className="px-4 py-2 text-gray-600">Dropdown</td><td className="px-4 py-2 text-gray-600">Yes</td><td className="px-4 py-2 text-gray-600">From master_lead_status table</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Priority</td><td className="px-4 py-2 text-gray-600">Dropdown</td><td className="px-4 py-2 text-gray-600">Yes</td><td className="px-4 py-2 text-gray-600">From master_priority table</td></tr>
              <tr><td className="px-4 py-2 text-gray-800">Clinical Remarks</td><td className="px-4 py-2 text-gray-600">Textarea</td><td className="px-4 py-2 text-gray-600">No</td><td className="px-4 py-2 text-gray-600">Notes about patient condition or enquiry</td></tr>
            </tbody>
          </table>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`POST /api/leads
{
  "name": "Priya Sharma",
  "uhid": "UH-2026-0042",
  "phone": "9876543210",
  "email": "priya.sharma@email.com",
  "dob": "1990-03-15",
  "address": "42 MG Road",
  "pincode": "560001",
  "city": "Bangalore",
  "state": "Karnataka",
  "lead_source": "Website",
  "status": "New",
  "priority": "High",
  "clinical_remarks": "Enquiry for orthopaedic consultation"
}`}</code></pre>
        </div>
      </section>

      {/* Duplicate Detection */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Duplicate Detection</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          When creating a new lead, the system checks for an existing lead with the same phone number.
          If a duplicate is found, a warning is displayed with the existing lead's details — name, UHID,
          status, and assigned telecaller. The user can choose to proceed (creating a new lead) or
          navigate to the existing one.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Duplicate detection is phone-number-based. If the same patient
            enquires through different channels, the telecaller should update the existing lead rather
            than creating a new one.
          </p>
        </div>
      </section>

      {/* Auto-Assignment */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Auto-Assignment</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          New leads are automatically assigned to telecallers using a <strong>round-robin</strong> algorithm
          that targets the least-busy telecaller. The assignment logic considers:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
          <li>Number of currently active leads assigned to each telecaller</li>
          <li>Only active (non-deactivated) users with the telecaller role</li>
          <li>Even distribution across the team to prevent overload</li>
        </ul>
        <p className="text-gray-700 leading-relaxed">
          Managers and Super Admins can manually reassign leads from the Lead Box or the lead detail view.
          Reassignment is recorded in the lead history.
        </p>
      </section>

      {/* Lead Statuses */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Lead Status Flow</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Leads progress through a 7-stage lifecycle. Every status change is logged in the lead history
          with the old value, new value, timestamp, and the user who made the change.
        </p>
        <div className="space-y-3">
          {[
            { status: 'New', desc: 'Just created via the intake form. Awaiting first contact.', color: 'bg-blue-100 text-blue-800' },
            { status: 'Contacted', desc: 'Telecaller has reached out to the patient (call, message, or email).', color: 'bg-indigo-100 text-indigo-800' },
            { status: 'Interested', desc: 'Patient is showing interest in services. Requires follow-up.', color: 'bg-purple-100 text-purple-800' },
            { status: 'Follow-up', desc: 'Needs additional contact or information before progressing.', color: 'bg-yellow-100 text-yellow-800' },
            { status: 'Appointment Booked', desc: 'Patient has scheduled an appointment. Lead tied to an appointment record.', color: 'bg-green-100 text-green-800' },
            { status: 'Closed', desc: 'Lead has been resolved — patient attended appointment, service delivered, or converted.', color: 'bg-emerald-100 text-emerald-800' },
            { status: 'Rejected', desc: 'Lead is not viable — wrong number, not interested, or invalid data.', color: 'bg-red-100 text-red-800' },
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
        <div className="mt-4 bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`// Status transitions (typical flow)
New  -->  Contacted  -->  Interested  -->  Follow-up  -->  Appointment Booked  -->  Closed
                                                                        |
                                                                        v
                                                                   Rejected (from any stage)`}</code></pre>
        </div>
      </section>

      {/* Lead Box */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Lead Box</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Lead Box is the primary table view for managing all leads. It provides a comprehensive
          interface for daily operations.
        </p>
        <h3 className="text-lg font-medium text-gray-800 mb-2">Features</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
          <li><strong>Search:</strong> Full-text search across name, UHID, phone, and email fields</li>
          <li><strong>Filters:</strong> Filter by status and priority using dropdown selectors</li>
          <li><strong>Pagination:</strong> Server-side pagination for efficient handling of large datasets</li>
          <li><strong>Sorting:</strong> Click column headers to sort by name, date, status, or priority</li>
          <li><strong>Metrics bar:</strong> Summary cards showing new today, pending follow-ups, conversion rate, and overdue leads</li>
          <li><strong>Quick actions:</strong> Edit, view history, and call directly from the table row</li>
        </ul>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/leads?search=priya&status=New&priority=High&page=1&limit=20&sort=created_at&order=desc`}</code></pre>
        </div>
      </section>

      {/* Lead History */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Lead History</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Every change to a lead is recorded in the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">lead_history</code> table.
          The history tracks:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
          <li><strong>Status changes:</strong> e.g., "New" to "Contacted"</li>
          <li><strong>Assignments:</strong> Reassignment from one telecaller to another</li>
          <li><strong>Field updates:</strong> Any modification to name, phone, email, priority, etc.</li>
          <li><strong>Timestamps:</strong> When each change occurred</li>
          <li><strong>User attribution:</strong> Which user made the change</li>
        </ul>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/leads/42/history

// Response
[
  {
    "action": "status_change",
    "old_value": "New",
    "new_value": "Contacted",
    "changed_by": "Anita Desai",
    "created_at": "2026-05-15T10:30:00Z"
  },
  {
    "action": "assignment",
    "old_value": "Unassigned",
    "new_value": "Anita Desai",
    "changed_by": "System (auto-assign)",
    "created_at": "2026-05-15T09:00:00Z"
  }
]`}</code></pre>
        </div>
      </section>

      {/* UHID Lookup */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">UHID Lookup</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Unique Health ID (UHID) field enables quick patient identification. When a UHID is entered
          in the intake form, the system searches for an existing patient with that UHID and auto-fills
          all known fields — name, phone, email, DOB, address, city, and state.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          This prevents re-entering data for returning patients and ensures data consistency across
          multiple lead records for the same patient.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/leads/uhid/UH-2026-0042

// Response — auto-fills the intake form
{
  "name": "Priya Sharma",
  "phone": "9876543210",
  "email": "priya.sharma@email.com",
  "dob": "1990-03-15",
  "address": "42 MG Road",
  "pincode": "560001",
  "city": "Bangalore",
  "state": "Karnataka"
}`}</code></pre>
        </div>
      </section>

      {/* Master Data */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Master Data</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          All dropdown options (lead sources, priorities, statuses) are fetched from dedicated database
          master tables. This allows administrators to manage options without code changes.
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Table</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Purpose</th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Example Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2 font-mono text-gray-800">master_lead_source</td>
                <td className="px-4 py-2 text-gray-600">Where the lead came from</td>
                <td className="px-4 py-2 text-gray-600">Website, Referral, Social Media, Walk-in, Google Ads</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-gray-800">master_priority</td>
                <td className="px-4 py-2 text-gray-600">Urgency level</td>
                <td className="px-4 py-2 text-gray-600">High, Medium, Low</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-gray-800">master_lead_status</td>
                <td className="px-4 py-2 text-gray-600">Lead lifecycle stage</td>
                <td className="px-4 py-2 text-gray-600">New, Contacted, Interested, Follow-up, etc.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300"><code>{`GET /api/leads/master-data

// Returns all dropdown options in a single request
{
  "sources": ["Website", "Referral", "Social Media", "Walk-in", "Google Ads"],
  "priorities": ["High", "Medium", "Low"],
  "statuses": ["New", "Contacted", "Interested", "Follow-up", "Appointment Booked", "Closed", "Rejected"]
}`}</code></pre>
        </div>
      </section>
    </div>
  );
};

export default LeadManagement;
