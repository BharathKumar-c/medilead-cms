# MediLead CMS

Healthcare CRM system with telecaller workflow, SIP calling integration, real-time notifications, and appointment management.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, Vite 8, React Router 7
- **Backend**: Node.js, Express, PostgreSQL, Socket.IO
- **Auth**: JWT with role-based access control
- **Real-time**: Socket.IO for notifications and call events

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd medilead-cms

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Environment Setup

1. Create PostgreSQL database:

```sql
CREATE DATABASE cms_db;
```

2. Configure backend environment:

```bash
cd server
cp .env.example .env
# Edit .env with your database credentials
```

3. Configure frontend environment:

```bash
cp .env.example .env
# Edit .env if needed (default: http://localhost:5000/api)
```

### Database Setup

```bash
cd server

# Run migrations and seed data
npm run seed
```

This creates all required tables and inserts sample data including:

- 5 users (1 super_admin, 1 manager, 3 telecallers)
- 30 sample leads
- 10 sample appointments
- Call metrics and department performance data

### Start Development

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
npm run dev
```

Access the application at `http://localhost:5173`

### Default Login

- **Email**: barath@gmail.com
- **Password**: password123

## Project Structure

```
medilead-cms/
├── src/                    # Frontend source
│   ├── components/         # Reusable components
│   ├── context/            # React contexts (Auth, Theme)
│   ├── data/               # Mock data
│   ├── hooks/              # Custom hooks (useSocket, useSip)
│   ├── pages/              # Page components
│   ├── services/           # API service
│   ├── App.jsx             # Main app with routing
│   └── index.css           # Global styles
├── server/                 # Backend source
│   ├── src/
│   │   ├── config/         # Database and migration
│   │   ├── middleware/      # Auth, validation, rate limiting
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Logger, notifications
│   │   ├── cron/           # Scheduled jobs
│   │   └── seeds/          # Database seeds
│   └── index.js            # Server entry point
└── package.json
```

## User Roles

| Role            | Permissions                                                |
| --------------- | ---------------------------------------------------------- |
| **Super Admin** | Full access, user management, role management, all reports |
| **Manager**     | View all leads/appointments, reports, team management      |
| **Telecaller**  | Own leads/appointments only, call logs                     |

> Custom roles can be created with granular permissions (30+ permissions across modules).

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password
- `GET /api/auth/settings` - Get user settings
- `PUT /api/auth/settings` - Update settings
- `GET /api/auth/users` - List users (Admin)
- `POST /api/auth/users` - Create user (Admin)
- `PUT /api/auth/users/:id` - Update user (Admin)
- `PUT /api/auth/users/:id/password` - Reset password (Admin)
- `DELETE /api/auth/users/:id` - Deactivate user (Admin)

### Leads

- `GET /api/leads` - List leads (with search, filter, pagination)
- `GET /api/leads/metrics` - Lead box metrics
- `GET /api/leads/master-data` - Dropdown data
- `GET /api/leads/uhid/:uhid` - Search by UHID
- `GET /api/leads/:id` - Get single lead
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete (soft) lead
- `GET /api/leads/:id/history` - Lead history

### Appointments

- `GET /api/appointments` - List appointments
- `GET /api/appointments/today` - Today's overview
- `GET /api/appointments/calendar` - Calendar data
- `GET /api/appointments/:id` - Get single appointment
- `POST /api/appointments` - Book appointment
- `PUT /api/appointments/:id` - Update appointment
- `PUT /api/appointments/:id/reschedule` - Reschedule
- `PUT /api/appointments/:id/cancel` - Cancel
- `GET /api/appointments/doctors` - List doctors (filterable by department)
- `GET /api/appointments/slots` - Available time slots for a doctor

### Calls

- `GET /api/calls` - List call logs
- `GET /api/calls/stats` - Call statistics
- `POST /api/calls` - Log call
- `PUT /api/calls/:id` - Update call
- `POST /api/calls/sip-event` - SIP webhook

### Dashboard

- `GET /api/dashboard/metrics` - Overview metrics
- `GET /api/dashboard/activity` - Activity log
- `POST /api/dashboard/activity` - Log activity

### Reports

- `GET /api/reports/overview` - Summary cards
- `GET /api/reports/call-volume` - Monthly call volume
- `GET /api/reports/lead-sources` - Lead sources distribution
- `GET /api/reports/department-performance` - Department stats
- `GET /api/reports/provider-leaderboard` - Top providers
- `GET /api/reports/status-breakdown` - Lead status breakdown
- `GET /api/reports/weekly-trend` - Weekly trends
- `GET /api/reports/telecallers` - Telecaller performance
- `GET /api/reports/conversion-funnel` - Conversion funnel
- `GET /api/reports/call-analytics` - Call analytics
- `GET /api/reports/appointment-stats` - Appointment stats
- `GET /api/reports/daily-activity` - Today's activity
- `GET /api/reports/export` - Export CSV

### Notifications

- `GET /api/notifications` - List notifications
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Roles & Permissions

- `GET /api/roles` - List all roles (Admin)
- `GET /api/roles/permissions/all` - All permissions grouped by module (Admin)
- `GET /api/roles/:id` - Get role with permissions (Admin)
- `POST /api/roles` - Create custom role (Admin)
- `PUT /api/roles/:id` - Update role (Admin)
- `DELETE /api/roles/:id` - Delete custom role (Admin)
- `PUT /api/roles/:id/permissions` - Assign permissions to role (Admin)

### Branches & Departments

- `GET /api/branches` - List active branches
- `GET /api/branches/:id/departments` - Departments at a branch

## Security Features

- JWT authentication with 24h expiry
- Role-based access control
- Rate limiting (100 req/15min general, 5 req/15min auth)
- Input validation with express-validator
- Helmet security headers
- SQL injection prevention (parameterized queries)
- XSS protection (React + Helmet CSP)
- Password hashing with bcrypt
- Request logging and monitoring

## Production Build

```bash
# Build frontend
npm run build

# The dist/ folder contains the production build
```

## Environment Variables

### Frontend (.env)

```
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=MediLead CMS
VITE_APP_ENV=development
VITE_SIP_WS_URL=ws://localhost:8088/ws
VITE_SIP_DOMAIN=medilead.local
```

### Backend (server/.env)

```
PORT=5000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cms_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:5173

# Database Pool
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_IDLE_TIMEOUT=30000
DB_CONNECT_TIMEOUT=5000
DB_STATEMENT_TIMEOUT=30000

# Logging
LOG_LEVEL=info

# SIP (optional)
SIP_SERVER=localhost
SIP_PORT=5060
SIP_WS_URL=ws://localhost:8088/ws
SIP_DOMAIN=medilead.local
```

## License

Proprietary - All rights reserved
