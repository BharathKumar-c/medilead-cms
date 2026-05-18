const Security = () => {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Security & Authentication</h1>
      <p className="text-gray-600 mb-8">
        MediLead CMS implements multiple layers of security including JWT authentication, role-based
        access control, rate limiting, input validation, and security headers.
      </p>

      {/* Authentication */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Authentication</h2>
        <p className="text-gray-700 mb-4">
          The application uses JSON Web Tokens (JWT) for stateless authentication. Tokens are issued
          on login and must be included in all authenticated requests.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">Token Format</p>
              <p className="text-sm text-gray-600">JWT signed with HS256 algorithm, containing user ID, email, and role in the payload.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">Expiry</p>
              <p className="text-sm text-gray-600">Tokens expire after 24 hours. Users must re-authenticate after expiry.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">Header Format</p>
              <code className="block bg-gray-900 text-green-400 px-3 py-2 rounded text-xs font-mono mt-1">
                Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
              </code>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">Token Storage</p>
              <p className="text-sm text-gray-600">Frontend stores the token in localStorage and attaches it to every API request via an Axios interceptor.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Authorization */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Authorization</h2>
        <p className="text-gray-700 mb-4">
          Role-based access control (RBAC) restricts what each user can do. The server checks the
          user's role from the JWT payload before processing any request.
        </p>

        {/* Roles & Permissions Matrix */}
        <h3 className="text-lg font-medium text-gray-900 mb-3">Roles & Permissions Matrix</h3>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Capability</th>
                  <th className="text-center px-4 py-3 font-semibold text-purple-700">
                    <span className="bg-purple-100 px-2 py-0.5 rounded text-xs">Super Admin</span>
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-blue-700">
                    <span className="bg-blue-100 px-2 py-0.5 rounded text-xs">Manager</span>
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-green-700">
                    <span className="bg-green-100 px-2 py-0.5 rounded text-xs">Telecaller</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { action: 'Manage users (create, edit, delete)', admin: true, manager: false, telecaller: false },
                  { action: 'Reset user passwords', admin: true, manager: false, telecaller: false },
                  { action: 'View all leads', admin: true, manager: true, telecaller: false },
                  { action: 'View own leads only', admin: true, manager: true, telecaller: true },
                  { action: 'Create and update leads', admin: true, manager: true, telecaller: true },
                  { action: 'Delete leads', admin: true, manager: false, telecaller: false },
                  { action: 'View all appointments', admin: true, manager: true, telecaller: false },
                  { action: 'Book appointments', admin: true, manager: true, telecaller: true },
                  { action: 'Access reports & analytics', admin: true, manager: true, telecaller: false },
                  { action: 'Export data (CSV)', admin: true, manager: true, telecaller: false },
                  { action: 'View own call logs', admin: true, manager: true, telecaller: true },
                  { action: 'View all call logs', admin: true, manager: true, telecaller: false },
                  { action: 'Receive notifications', admin: true, manager: true, telecaller: true },
                  { action: 'System settings', admin: true, manager: false, telecaller: false },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">{row.action}</td>
                    <td className="px-4 py-2.5 text-center">
                      {row.admin
                        ? <span className="text-green-600 font-medium">&#10003;</span>
                        : <span className="text-gray-300">&mdash;</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.manager
                        ? <span className="text-green-600 font-medium">&#10003;</span>
                        : <span className="text-gray-300">&mdash;</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.telecaller
                        ? <span className="text-green-600 font-medium">&#10003;</span>
                        : <span className="text-gray-300">&mdash;</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Rate Limiting */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Rate Limiting</h2>
        <p className="text-gray-700 mb-4">
          Rate limiting is applied using <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">express-rate-limit</code> to
          prevent abuse and brute-force attacks.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Endpoint Group</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Production Limit</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Development Limit</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Window</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 text-gray-700">General API</td>
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">100 requests</code></td>
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">1000 requests</code></td>
                <td className="px-4 py-3 text-gray-600">15 minutes</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Auth endpoints</td>
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">5 requests</code></td>
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">5 requests</code></td>
                <td className="px-4 py-3 text-gray-600">15 minutes</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Notifications</td>
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">10 requests</code></td>
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">10 requests</code></td>
                <td className="px-4 py-3 text-gray-600">1 minute</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          When the rate limit is exceeded, the API returns <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">429 Too Many Requests</code>.
        </p>
      </section>

      {/* Input Validation */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Input Validation</h2>
        <p className="text-gray-700 mb-4">
          All POST and PUT endpoints use <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">express-validator</code> for
          server-side validation. Invalid requests return <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">400</code> with
          detailed error messages.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-medium text-gray-900 mb-3">Validation Rules</h3>
          <div className="space-y-2">
            {[
              { rule: 'Field type checks', detail: 'Strings, integers, booleans, dates validated per field' },
              { rule: 'Length limits', detail: 'Name max 100 chars, email max 255, password min 6' },
              { rule: 'Email format', detail: 'Must be valid email format (user@domain.tld)' },
              { rule: 'Phone format', detail: 'Exactly 10 digits, non-digit characters stripped on input' },
              { rule: 'PIN code format', detail: 'Exactly 6 digits for Indian postal codes' },
              { rule: 'Required fields', detail: 'Missing required fields return specific error messages' },
              { rule: 'Enum values', detail: 'Status, priority, role must match allowed values' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-gray-900 text-sm">{item.rule}</span>
                  <span className="text-sm text-gray-600"> &mdash; {item.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Headers */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Security Headers</h2>
        <p className="text-gray-700 mb-4">
          The <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">helmet</code> middleware sets
          standard security headers on all responses.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Header</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-800">Content-Security-Policy</code></td>
                <td className="px-4 py-3 text-gray-600">Restricts which scripts, styles, and resources can be loaded</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-800">Strict-Transport-Security</code></td>
                <td className="px-4 py-3 text-gray-600">Forces HTTPS connections (HSTS)</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-800">X-Frame-Options</code></td>
                <td className="px-4 py-3 text-gray-600">Prevents clickjacking by blocking iframe embedding</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-800">X-Content-Type-Options</code></td>
                <td className="px-4 py-3 text-gray-600">Prevents MIME-type sniffing (set to nosniff)</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-800">X-XSS-Protection</code></td>
                <td className="px-4 py-3 text-gray-600">Enables browser XSS filtering</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Password Security */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Password Security</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">Hashing Algorithm</p>
              <p className="text-sm text-gray-600">bcrypt with 10 salt rounds. Passwords are never stored in plain text.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">Complexity Requirements</p>
              <p className="text-sm text-gray-600">Minimum 6 characters, must include at least one uppercase letter, one lowercase letter, and one number.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">Password Reset</p>
              <p className="text-sm text-gray-600">Super Admins can reset any user's password. Users can change their own password via profile settings (requires current password).</p>
            </div>
          </div>
        </div>
      </section>

      {/* SQL Injection Prevention */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">SQL Injection Prevention</h2>
        <p className="text-gray-700 mb-4">
          All database queries use parameterized queries with positional parameters. No user input
          is ever concatenated into SQL strings.
        </p>
        <div className="bg-gray-900 rounded-lg p-5 text-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-gray-400 text-xs font-mono">Parameterized Query Example</span>
          </div>
          <pre className="text-gray-300 font-mono text-xs leading-relaxed"><code>{`// Safe — parameterized query
const result = await pool.query(
  'SELECT * FROM leads WHERE status = $1 AND assigned_to = $2',
  [status, userId]
);

// NEVER done — string concatenation (vulnerable)
// const result = await pool.query(
//   \`SELECT * FROM leads WHERE status = '\${status}'\`
// );`}</code></pre>
        </div>
      </section>

      {/* XSS Protection */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">XSS Protection</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">React Auto-Escaping</p>
              <p className="text-sm text-gray-600">React automatically escapes all rendered content in JSX. User-supplied data displayed via <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{'{variable}'}</code> is safe by default.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">Content Security Policy</p>
              <p className="text-sm text-gray-600">Helmet's CSP header restricts script sources, preventing inline script injection from executing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Request Logging */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Request Logging</h2>
        <p className="text-gray-700 mb-4">
          All requests are logged using <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">winston</code> with
          file rotation for log management.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">Log Rotation</p>
              <p className="text-sm text-gray-600">Maximum 5 MB per file, up to 5 files retained. Older logs are automatically deleted.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">Slow Query Detection</p>
              <p className="text-sm text-gray-600">Requests taking longer than 1000ms are flagged with a warning in the logs.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">Log Levels</p>
              <p className="text-sm text-gray-600">error, warn, info, http, debug &mdash; configurable via environment variable.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Error Handling */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Error Handling</h2>
        <p className="text-gray-700 mb-4">
          Error responses are sanitized in production to prevent information leakage.
        </p>
        <div className="bg-gray-900 rounded-lg p-5 text-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-gray-400 text-xs font-mono">Production vs Development Errors</span>
          </div>
          <pre className="text-gray-300 font-mono text-xs leading-relaxed"><code>{`// Production — safe, no stack traces
{
  "error": "Something went wrong",
  "code": "INTERNAL_ERROR"
}

// Development — includes stack trace for debugging
{
  "error": "relation \"leads\" does not exist",
  "code": "INTERNAL_ERROR",
  "stack": "Error: relation \"leads\" does not exist\\n    at ..."
}`}</code></pre>
        </div>
      </section>
    </div>
  );
};

export default Security;
