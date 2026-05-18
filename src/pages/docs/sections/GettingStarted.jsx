const GettingStarted = () => {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        Getting Started
      </h1>
      <p className="text-gray-600 mb-8">
        Set up MediLead CMS on your local machine in minutes. This guide covers
        installation, environment configuration, database setup, and running the
        application.
      </p>

      {/* Installation */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Installation</h2>
        <p className="text-gray-700 mb-4">
          Clone the repository and install dependencies for both the frontend
          and backend.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
          <pre className="text-sm text-gray-100 font-mono">
            {`# Clone the repository
git clone https://github.com/your-org/medilead-cms.git
cd medilead-cms

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..`}
          </pre>
        </div>
        <p className="text-gray-700 mb-2">
          Make sure you have the following prerequisites installed:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
          <li>
            <strong>Node.js</strong> v18 or higher
          </li>
          <li>
            <strong>PostgreSQL</strong> v14 or higher
          </li>
          <li>
            <strong>npm</strong> v9 or higher (or yarn/pnpm equivalent)
          </li>
        </ul>
      </section>

      {/* Database Setup */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Database Setup</h2>
        <p className="text-gray-700 mb-4">
          Create a PostgreSQL database and run the seed script to generate
          tables and sample data.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
          <pre className="text-sm text-gray-100 font-mono">
            {`# Connect to PostgreSQL and create the database
psql -U postgres
CREATE DATABASE cms_db;
\\q

# Run the seed script (creates all tables + sample data)
cd server
npm run seed`}
          </pre>
        </div>
        <p className="text-gray-700 mb-2">
          The seed script populates the database with:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>
            <strong>5 users</strong> across all roles (super_admin, manager,
            telecaller, staff)
          </li>
          <li>
            <strong>30 leads</strong> with varied statuses and priorities
          </li>
          <li>
            <strong>10 appointments</strong> with different time slots and types
          </li>
          <li>Master data tables (departments, sources, statuses, etc.)</li>
        </ul>
      </section>

      {/* Environment Configuration */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Environment Configuration
        </h2>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Frontend (.env)
        </h3>
        <p className="text-gray-700 mb-3">
          Create a{' '}
          <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm">
            .env
          </code>{' '}
          file in the project root:
        </p>
        <div className="bg-gray-900 rounded-lg p-4 mb-6 overflow-x-auto">
          <pre className="text-sm text-gray-100 font-mono">
            {`VITE_API_URL=/api`}
          </pre>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Backend (server/.env)
        </h3>
        <p className="text-gray-700 mb-3">
          Create a{' '}
          <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm">
            .env
          </code>{' '}
          file inside the{' '}
          <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm">
            server/
          </code>{' '}
          directory:
        </p>
        <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
          <pre className="text-sm text-gray-100 font-mono">
            {`# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cms_db
DB_USER=postgres
DB_PASSWORD=your_password

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this

# Server
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info`}
          </pre>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-800">
            <strong>Important:</strong> Never commit your{' '}
            <code className="bg-amber-100 px-1 rounded">.env</code> files to
            version control. Use{' '}
            <code className="bg-amber-100 px-1 rounded">.env.example</code> as a
            template for other developers.
          </p>
        </div>
      </section>

      {/* Starting the Application */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Starting the Application
        </h2>
        <p className="text-gray-700 mb-4">
          You need two terminals running simultaneously — one for the backend
          API server and one for the frontend dev server.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">
              Terminal 1 — Backend
            </h4>
            <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
              <pre className="text-sm text-gray-100 font-mono">
                {`cd server
npm run dev`}
              </pre>
            </div>
            <p className="text-xs text-gray-500 mt-2">Runs on port 3001</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">
              Terminal 2 — Frontend
            </h4>
            <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
              <pre className="text-sm text-gray-100 font-mono">
                {`npm run dev`}
              </pre>
            </div>
            <p className="text-xs text-gray-500 mt-2">Runs on port 5173</p>
          </div>
        </div>

        <p className="text-gray-700">
          Open{' '}
          <a
            href="http://localhost:5173"
            className="text-blue-600 hover:underline">
            http://localhost:5173
          </a>{' '}
          in your browser to access the application.
        </p>
      </section>

      {/* Default Login */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Default Login</h2>
        <p className="text-gray-700 mb-4">
          After seeding the database, use the following credentials to log in as
          a super admin:
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">
                Email
              </p>
              <p className="text-sm font-mono text-gray-900">
                bharath@medcloud.health
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">
                Password
              </p>
              <p className="text-sm font-mono text-gray-900">password123</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          Change this password immediately in a production environment.
        </p>
      </section>

      {/* Quick Reference */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Quick Reference
        </h2>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-700">
                  Command
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-700">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2 font-mono text-gray-800">
                  npm run dev
                </td>
                <td className="px-4 py-2 text-gray-600">
                  Start frontend dev server (Vite)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-gray-800">
                  cd server && npm run dev
                </td>
                <td className="px-4 py-2 text-gray-600">
                  Start backend API server (nodemon)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-gray-800">
                  cd server && npm run seed
                </td>
                <td className="px-4 py-2 text-gray-600">
                  Reset database with sample data
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-gray-800">
                  npm run build
                </td>
                <td className="px-4 py-2 text-gray-600">
                  Build frontend for production
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default GettingStarted;
