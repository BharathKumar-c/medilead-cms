import { useState } from 'react';
import { apiEndpoints } from '../../../data/docs';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const methodColors = {
  GET: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  POST: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  PUT: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  DELETE: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

const sectionMeta = {
  auth: { title: 'Authentication', description: 'User login, registration, profile management, and user administration.' },
  leads: { title: 'Leads', description: 'Full CRUD for patient leads with search, filtering, pagination, and history tracking.' },
  appointments: { title: 'Appointments', description: 'Booking, rescheduling, cancellation, and calendar management.' },
  calls: { title: 'Calls', description: 'Call logging, statistics, and SIP integration webhooks.' },
  dashboard: { title: 'Dashboard', description: 'Overview metrics and activity logging.' },
  reports: { title: 'Reports', description: 'Analytics, charts, data export, and performance metrics.' },
  notifications: { title: 'Notifications', description: 'Real-time notification management.' },
};

const EndpointCard = ({ endpoint }) => {
  const [expanded, setExpanded] = useState(false);
  const colors = methodColors[endpoint.method] || methodColors.GET;
  const hasDetails = endpoint.body || endpoint.params;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className={`${colors.bg} ${colors.text} px-2.5 py-0.5 rounded text-xs font-bold font-mono flex-shrink-0`}>
          {endpoint.method}
        </span>
        <code className="text-sm font-mono text-gray-800 flex-1 truncate">{endpoint.path}</code>
        <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
          endpoint.auth === 'Public'
            ? 'bg-gray-100 text-gray-600'
            : endpoint.auth === 'Super Admin'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-green-100 text-green-700'
        }`}>
          {endpoint.auth}
        </span>
        {hasDetails && (
          <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      <div className="px-4 pb-3">
        <p className="text-sm text-gray-600 ml-[76px]">{endpoint.description}</p>
      </div>

      {expanded && hasDetails && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          {endpoint.body && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Request Body</h4>
              <pre className="bg-gray-900 text-gray-300 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                <code>{typeof endpoint.body === 'object'
                  ? JSON.stringify(endpoint.body, null, 2)
                  : endpoint.body
                }</code>
              </pre>
            </div>
          )}
          {endpoint.params && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Query Parameters</h4>
              <div className="flex flex-wrap gap-2">
                {endpoint.params.split(', ').map(param => (
                  <code key={param} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs font-mono text-gray-700">
                    {param}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const APIReference = () => {
  const totalEndpoints = Object.values(apiEndpoints).reduce((sum, group) => sum + group.length, 0);

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">API Reference</h1>
      <p className="text-gray-600 mb-8">
        Complete reference for all {totalEndpoints} REST API endpoints across {Object.keys(apiEndpoints).length} resource groups.
        All endpoints return JSON and require a Bearer token unless marked as Public.
      </p>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Object.entries(methodColors).map(([method, colors]) => {
          const count = Object.values(apiEndpoints).flat().filter(e => e.method === method).length;
          return (
            <div key={method} className={`${colors.bg} border ${colors.border} rounded-lg px-4 py-3 text-center`}>
              <p className={`${colors.text} text-lg font-bold`}>{count}</p>
              <p className={`${colors.text} text-xs font-medium`}>{method}</p>
            </div>
          );
        })}
      </div>

      {/* Base URL */}
      <div className="bg-gray-900 rounded-lg p-4 mb-8">
        <p className="text-xs text-gray-400 mb-1">Base URL</p>
        <code className="text-green-400 font-mono text-sm">{API_BASE_URL}</code>
        <p className="text-xs text-gray-400 mt-3 mb-1">Authentication Header</p>
        <code className="text-green-400 font-mono text-sm">Authorization: Bearer &lt;your-jwt-token&gt;</code>
      </div>

      {/* API Groups */}
      {Object.entries(apiEndpoints).map(([key, endpoints]) => {
        const meta = sectionMeta[key] || { title: key, description: '' };
        return (
          <section key={key} className="mb-10" id={`api-${key}`}>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{meta.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{meta.description}</p>
              <p className="text-xs text-gray-400 mt-1">{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Summary Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-20">Method</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Endpoint</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-28">Auth</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {endpoints.map((endpoint, i) => {
                    const colors = methodColors[endpoint.method] || methodColors.GET;
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <span className={`${colors.bg} ${colors.text} px-2 py-0.5 rounded text-xs font-bold font-mono`}>
                            {endpoint.method}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <code className="text-xs font-mono text-gray-800">{endpoint.path}</code>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs ${
                            endpoint.auth === 'Public'
                              ? 'text-gray-500'
                              : endpoint.auth === 'Super Admin'
                                ? 'text-purple-600'
                                : 'text-green-600'
                          }`}>
                            {endpoint.auth}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{endpoint.description}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Detailed Cards */}
            <div className="space-y-2">
              {endpoints.map((endpoint, i) => (
                <EndpointCard key={i} endpoint={endpoint} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Error Responses */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Error Responses</h2>
        <p className="text-gray-700 mb-4">
          All error responses follow a consistent JSON format.
        </p>
        <div className="bg-gray-900 rounded-lg p-5 text-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-gray-400 text-xs font-mono">Error Response Format</span>
          </div>
          <pre className="text-gray-300 font-mono text-xs leading-relaxed"><code>{`{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": []  // Optional validation errors
}`}</code></pre>
        </div>
        <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="px-4 py-2.5"><code className="text-xs font-mono text-gray-800">400</code></td><td className="px-4 py-2.5 text-gray-600">Bad request / validation error</td></tr>
              <tr><td className="px-4 py-2.5"><code className="text-xs font-mono text-gray-800">401</code></td><td className="px-4 py-2.5 text-gray-600">Missing or invalid JWT token</td></tr>
              <tr><td className="px-4 py-2.5"><code className="text-xs font-mono text-gray-800">403</code></td><td className="px-4 py-2.5 text-gray-600">Insufficient permissions (role check failed)</td></tr>
              <tr><td className="px-4 py-2.5"><code className="text-xs font-mono text-gray-800">404</code></td><td className="px-4 py-2.5 text-gray-600">Resource not found</td></tr>
              <tr><td className="px-4 py-2.5"><code className="text-xs font-mono text-gray-800">409</code></td><td className="px-4 py-2.5 text-gray-600">Conflict (duplicate email, UHID, etc.)</td></tr>
              <tr><td className="px-4 py-2.5"><code className="text-xs font-mono text-gray-800">429</code></td><td className="px-4 py-2.5 text-gray-600">Rate limit exceeded</td></tr>
              <tr><td className="px-4 py-2.5"><code className="text-xs font-mono text-gray-800">500</code></td><td className="px-4 py-2.5 text-gray-600">Internal server error</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default APIReference;
