import { databaseTables } from '../../../data/docs';

const relationships = [
  { from: 'users.id', to: 'leads.assigned_to', description: 'User assigned to handle a lead' },
  { from: 'users.id', to: 'appointments.provider_id', description: 'User as appointment provider' },
  { from: 'leads.id', to: 'call_logs.lead_id', description: 'Lead associated with a call' },
  { from: 'leads.id', to: 'lead_history.lead_id', description: 'Lead change history records' },
  { from: 'users.id', to: 'notifications.user_id', description: 'Notifications targeted to a user' },
  { from: 'users.id', to: 'activity_log.user_id', description: 'User who performed an activity' },
  { from: 'users.id', to: 'call_logs.user_id', description: 'User who made/received a call' },
  { from: 'users.id', to: 'appointments.created_by', description: 'User who created an appointment' },
];

const masterTables = ['master_lead_source', 'master_department', 'master_priority', 'master_lead_status'];

const DatabaseSchema = () => {
  const userTables = databaseTables.filter(t => !masterTables.includes(t.name));
  const masters = databaseTables.filter(t => masterTables.includes(t.name));

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Database Schema</h1>
      <p className="text-gray-600 mb-8">
        PostgreSQL database with {databaseTables.length} tables powering the MediLead CMS application.
        All tables use auto-incrementing integer primary keys and include created_at/updated_at timestamps.
      </p>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-center">
          <p className="text-blue-700 text-lg font-bold">{databaseTables.length}</p>
          <p className="text-blue-600 text-xs font-medium">Total Tables</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
          <p className="text-green-700 text-lg font-bold">{userTables.length}</p>
          <p className="text-green-600 text-xs font-medium">Core Tables</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-center">
          <p className="text-purple-700 text-lg font-bold">{masters.length}</p>
          <p className="text-purple-600 text-xs font-medium">Master Tables</p>
        </div>
      </div>

      {/* Core Tables */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Core Tables</h2>
        <div className="space-y-4">
          {userTables.map(table => (
            <div key={table.name} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <code className="bg-gray-900 text-green-400 px-3 py-1 rounded text-sm font-mono">{table.name}</code>
                  <span className="text-sm text-gray-600">{table.description}</span>
                </div>
              </div>
              <div className="px-5 py-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fields</h4>
                <div className="flex flex-wrap gap-2">
                  {table.fields.map(field => (
                    <span
                      key={field}
                      className={`px-2.5 py-1 rounded text-xs font-mono border ${
                        field === 'id'
                          ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                          : field.includes('_id')
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                    >
                      {field}
                      {field === 'id' && <span className="ml-1 text-yellow-500">PK</span>}
                      {field.includes('_id') && field !== 'id' && <span className="ml-1 text-blue-400">FK</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Master Tables */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Master Tables</h2>
        <p className="text-gray-700 mb-4">
          Dropdown options throughout the application are backed by master tables with a{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">master_</code> prefix.
          These are fetched via the API and used to populate form selects and filter dropdowns.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {masters.map(table => (
            <div key={table.name} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <code className="text-purple-800 font-mono text-sm font-medium">{table.name}</code>
              <p className="text-sm text-purple-600 mt-1">{table.description}</p>
              <div className="flex gap-2 mt-2">
                {table.fields.map(field => (
                  <span key={field} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-mono">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Relationships */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Table Relationships</h2>
        <p className="text-gray-700 mb-4">
          Foreign key relationships connect the core tables. All relationships use integer IDs with
          cascade rules for data integrity.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">From</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">To</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {relationships.map((rel, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-800">{rel.from}</code>
                  </td>
                  <td className="px-4 py-3">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-800">{rel.to}</code>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{rel.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ER Diagram (text) */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Entity Relationship Overview</h2>
        <div className="bg-gray-900 rounded-lg p-5 text-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-gray-400 text-xs font-mono">Entity Relationships</span>
          </div>
          <pre className="text-gray-300 font-mono text-xs leading-relaxed overflow-x-auto"><code>{`users (1) ──────── (N) leads            [assigned_to]
users (1) ──────── (N) appointments     [provider_id, created_by]
users (1) ──────── (N) call_logs        [user_id]
users (1) ──────── (N) notifications    [user_id]
users (1) ──────── (N) activity_log     [user_id]

leads (1) ──────── (N) call_logs        [lead_id]
leads (1) ──────── (N) lead_history     [lead_id]

master_lead_source ──── leads.lead_source (dropdown)
master_department  ──── appointments.department (dropdown)
master_priority    ──── leads.priority (dropdown)
master_lead_status ──── leads.status (dropdown)`}</code></pre>
        </div>
      </section>

      {/* Field Legend */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Field Legend</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-2.5 py-1 rounded text-xs font-mono">id PK</span>
            <span className="text-sm text-gray-600">Primary Key</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded text-xs font-mono">*_id FK</span>
            <span className="text-sm text-gray-600">Foreign Key</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-gray-50 border border-gray-200 text-gray-700 px-2.5 py-1 rounded text-xs font-mono">field</span>
            <span className="text-sm text-gray-600">Regular Column</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DatabaseSchema;
