# MediLead CMS (Medway CMS Health Platform)

## What This Application Is

A **hospital CRM / lead management system** built for hospital call centers. It manages patient inquiries (leads), telecaller operations, call logging via SIP/telephony integration, appointment scheduling, and analytics. Built by **JIREH Technologies**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React (JSX), Tailwind CSS, Lucide icons |
| Backend | Node.js + Express |
| Database | PostgreSQL (raw SQL via `pg` pool, no ORM) |
| Real-time | Socket.IO (notifications, incoming call alerts) |
| Auth | JWT tokens, RBAC with permissions |
| Telephony | SIP integration + vendor webhook for call events |

---

## Architecture

- **Frontend** (root `/src`): Vite React SPA with React Router, context-based auth/theme/license, and a single Layout component wrapping all authenticated pages.
- **Backend** (`/server/src`): Express API server with route-based modular architecture, PostgreSQL connection pool, JWT auth middleware, and Socket.IO for real-time events.

---

## Pages / Routes

### Public (no login needed)

| Route | Purpose |
|-------|---------|
| `/login` | Login page |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Reset password via token |
| `/docs`, `/docs/*` | Documentation pages |

### Protected (any authenticated user)

| Route | Purpose |
|-------|---------|
| `/` | Main Dashboard — metrics, activity log, department performance |
| `/lead-box` | Lead management — list, filter, assign, update patient leads |
| `/vendor-call-logs` | Call logs table — all telephony call records |
| `/calls` | Telecaller Dashboard — SIP softphone, active calls, call controls |
| `/appointments` | Appointment list & management |
| `/appointments/new` | Book a new appointment |
| `/reports` | Analytics & reports with export (CSV) |
| `/profile-settings` | Edit user profile |
| `/account-settings` | Account settings (password, 2FA) |
| `/appearance` | Theme/dark mode toggle |
| `/help` | Help & support page |
| `/privacy` | Legal/privacy policy |
| `/license-management` | View license status |

### Admin Only (super_admin)

| Route | Purpose |
|-------|---------|
| `/user-management` | Create, edit, deactivate users |
| `/role-management` | Create/edit roles |
| `/role-management/:id/permissions` | Assign granular permissions to a role |
| `/master-data` | Manage lookup data (departments, lead sources, doctors, branches, priorities, statuses, pincodes) |
| `/sip-test` | SIP telephony test panel |

---

## Sidebar

There is **one sidebar** with two display modes:

1. **Desktop** — fixed left sidebar, collapsible (72px collapsed / 256px expanded)
2. **Mobile** — overlay slide-in drawer

### Navigation Items (all users)

1. Dashboard
2. Lead Box
3. Calls
4. Appointments
5. Reports

### Admin-only items (conditionally shown for super_admin)

6. User Management
7. Role Management
8. Master Data

### Bottom section

- Help & Support link
- Logout button

---

## Header

Sticky top bar with:

- Hamburger menu (mobile) / collapse toggle (desktop)
- Page title
- "New Patient" button (opens a slide-over intake form)
- Notification bell (real-time via Socket.IO)
- User avatar/menu

---

## User Roles & Permissions

| Role | Access |
|------|--------|
| `super_admin` | Everything — user/role/permission management, master data, SIP test |
| `manager` | User management, all standard features |
| `telecaller` | Standard features — leads, calls, appointments |
| `staff` | Basic access (default for new users) |

The system uses **granular RBAC**: permissions are module-based (e.g., `roles:view`, `leads:edit`, `appointments:view_all`), assigned to roles via a junction table, and checked both on the backend (middleware) and frontend (conditional rendering).

---

## Database (PostgreSQL — 25 tables)

### Core tables

- `users` — system users with auth credentials and profile
- `leads` — patient leads/inquiries with full lifecycle tracking
- `appointments` — scheduled patient appointments
- `call_logs` — SIP call records (legacy)
- `telephony_call_logs` — vendor telephony call records (current)
- `notifications` — user-targeted notifications
- `activity_log` — call activity records
- `lead_history` — audit trail for lead changes

### Master/lookup tables

- `master_department` — hospital departments
- `master_lead_source` — lead sources (website, walk-in, referral, etc.)
- `master_priority` — priority levels (High, Medium, Low)
- `master_lead_status` — lead statuses
- `master_doctors` — doctor registry
- `master_branches` — hospital branch locations
- `master_pincodes` — pincode/area lookup

### RBAC tables

- `roles` — role definitions (system and custom)
- `permissions` — granular permissions by module
- `role_permissions` — role ↔ permission junction
- `user_roles` — user ↔ role junction

### Analytics tables

- `call_metrics` — daily call statistics
- `department_performance` — department-level KPIs

---

## Key Features

1. **Lead Management** — full lifecycle: create patient leads, assign to telecallers, track status (New → Contacted → Interested → Appointment Booked → Closed/Rejected), audit trail via lead_history.

2. **SIP Telephony** — incoming/outgoing calls via SIP, vendor webhook integration, call popups with ringtone, call recording storage.

3. **Appointment Scheduling** — book, reschedule, cancel appointments with slot availability.

4. **Real-time Notifications** — Socket.IO-powered notifications and incoming call alerts.

5. **Reports & Export** — analytics dashboards, CSV export.

6. **License System** — time-limited license with expiry page and activation via IP-whitelisted internal endpoint.

7. **Maintenance Mode** — banner + settings toggle.

8. **Dark/Light Theme** — user-configurable appearance.

---

## Backend API Routes

| Mount Path | Description |
|---|---|
| `/api/auth` | Authentication, user management, password reset |
| `/api/leads` | Lead CRUD, search, metrics |
| `/api/appointments` | Appointment CRUD, calendar, slots |
| `/api/dashboard` | Dashboard metrics, activity log |
| `/api/reports` | Report generation/export |
| `/api/notifications` | User notifications |
| `/api/calls` | Call logs, SIP events, telephony webhook |
| `/api/branches` | Branch management |
| `/api/roles` | Role & permission CRUD |
| `/api/masters` | Master data (sources, priorities, statuses, departments, doctors, pincodes, branches) |
| `/api/settings` | App settings (maintenance mode) |
| `/api/license` | License status & management |
| `/internal/license/unlock` | License activation (IP-whitelisted) |
| `/api/health` | Health check endpoint |

---

## Folder Structure

```
medilead-cms/
├── src/                    # Frontend (Vite React)
│   ├── components/         # Reusable UI components (Layout, Header, CallPopup, etc.)
│   ├── context/            # React contexts (Auth, Theme, License)
│   ├── hooks/              # Custom hooks (useSocket, etc.)
│   ├── pages/              # Page components (Dashboard, LeadBox, etc.)
│   ├── services/           # API service layer
│   └── config/             # Frontend config (migrate.js for DB schema)
├── server/                 # Backend (Node.js Express)
│   └── src/
│       ├── config/         # Database connection, app config
│       ├── cron/           # Background jobs (follow-up reminders)
│       ├── license/        # License validation module
│       ├── middleware/     # Auth, rate limiter, license guard
│       ├── routes/         # Express route handlers
│       └── utils/          # Logger, email, helpers
├── document/               # Project documentation
├── package.json            # Frontend dependencies & scripts
└── vite.config.js          # Vite configuration
```

---

*Last updated: June 2026*
