// Documentation content data for search indexing and navigation
export const docsNavigation = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'Rocket',
    children: [
      {id: 'installation', title: 'Installation & Setup'},
      {id: 'environment', title: 'Environment Configuration'},
      {id: 'first-login', title: 'First Login'},
    ],
  },
  {
    id: 'roles',
    title: 'User Roles',
    icon: 'Users',
    children: [
      {id: 'super-admin', title: 'Super Admin Guide'},
      {id: 'manager', title: 'Manager Guide'},
      {id: 'telecaller', title: 'Telecaller Guide'},
    ],
  },
  {
    id: 'features',
    title: 'Features',
    icon: 'LayoutDashboard',
    children: [
      {id: 'lead-management', title: 'Lead Management'},
      {id: 'appointments', title: 'Appointments'},
      {id: 'sip-integration', title: 'SIP Integration'},
      {id: 'reports', title: 'Reports & Analytics'},
      {id: 'notifications', title: 'Notifications'},
    ],
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    icon: 'Code',
    children: [
      {id: 'api-auth', title: 'Authentication API'},
      {id: 'api-leads', title: 'Leads API'},
      {id: 'api-appointments', title: 'Appointments API'},
      {id: 'api-calls', title: 'Calls API'},
      {id: 'api-dashboard', title: 'Dashboard API'},
      {id: 'api-reports', title: 'Reports API'},
      {id: 'api-notifications', title: 'Notifications API'},
      {id: 'api-roles', title: 'Roles & Permissions API'},
      {id: 'api-branches', title: 'Branches API'},
    ],
  },
  {
    id: 'technical',
    title: 'Technical',
    icon: 'Settings',
    children: [
      {id: 'database-schema', title: 'Database Schema'},
      {id: 'security', title: 'Security & Auth'},
    ],
  },
];

export const searchableContent = [
  // Getting Started
  {
    id: 'installation',
    section: 'Getting Started',
    title: 'Installation & Setup',
    keywords: 'install setup npm node postgres database clone repository',
    content:
      'Clone the repository, install dependencies with npm install, configure PostgreSQL database, run migrations and seed data.',
  },
  {
    id: 'environment',
    section: 'Getting Started',
    title: 'Environment Configuration',
    keywords: 'env environment config cors jwt secret database pool',
    content:
      'Configure .env files for frontend and backend. Set database credentials, JWT secret, CORS origin, and pool settings.',
  },
  {
    id: 'first-login',
    section: 'Getting Started',
    title: 'First Login',
    keywords: 'login credentials default user first login password change',
    content:
      'Default login email: barath@gmail.com. Check your seed output or admin for the password. Change password after first login.',
  },

  // Roles
  {
    id: 'super-admin',
    section: 'User Roles',
    title: 'Super Admin Guide',
    keywords:
      'admin user management create delete role permission system settings',
    content:
      'Full system access. Manage users, view all leads and appointments, access all reports, configure system settings.',
  },
  {
    id: 'manager',
    section: 'User Roles',
    title: 'Manager Guide',
    keywords:
      'manager team oversight reports assignment telecaller performance',
    content:
      'View team performance, assign leads to telecallers, access reports and analytics, manage appointments.',
  },
  {
    id: 'telecaller',
    section: 'User Roles',
    title: 'Telecaller Guide',
    keywords:
      'telecaller call lead follow-up appointment booking daily workflow',
    content:
      'Daily workflow: view assigned leads, make calls, update lead status, book appointments, log call notes.',
  },

  // Features
  {
    id: 'lead-management',
    section: 'Features',
    title: 'Lead Management',
    keywords:
      'lead create edit delete search filter status priority assignment duplicate uhid',
    content:
      'Create and manage patient leads. Track statuses: New, Contacted, Interested, Follow-up, Appointment Booked, Closed, Rejected. Auto-assign to telecallers.',
  },
  {
    id: 'appointments',
    section: 'Features',
    title: 'Appointments',
    keywords:
      'appointment book reschedule cancel calendar doctor department schedule reminder',
    content:
      'Book, reschedule, and cancel appointments. Calendar view, department/provider filtering, automated reminders.',
  },
  {
    id: 'sip-integration',
    section: 'Features',
    title: 'SIP Integration',
    keywords:
      'sip call incoming outgoing asterisk freepbx zoiper webhook voip softphone',
    content:
      'SIP calling integration with Asterisk/FreePBX. Incoming call popups, auto lead lookup, call logging, real-time events.',
  },
  {
    id: 'reports',
    section: 'Features',
    title: 'Reports & Analytics',
    keywords:
      'report analytics dashboard chart export csv telecaller performance conversion funnel',
    content:
      'Analytics dashboard with call volume, lead conversion, department performance, telecaller leaderboard, CSV export.',
  },
  {
    id: 'notifications',
    section: 'Features',
    title: 'Notifications',
    keywords:
      'notification real-time socket alert follow-up reminder missed call',
    content:
      'Real-time notifications via Socket.IO. Follow-up reminders, missed call alerts, lead assignment notifications.',
  },

  // API
  {
    id: 'api-auth',
    section: 'API Reference',
    title: 'Authentication API',
    keywords: 'auth login register profile password settings users jwt token',
    content:
      'POST /api/auth/login, POST /api/auth/register, GET /api/auth/me, PUT /api/auth/profile, PUT /api/auth/password, user management endpoints.',
  },
  {
    id: 'api-leads',
    section: 'API Reference',
    title: 'Leads API',
    keywords:
      'leads create update delete search filter metrics master-data uhid history providers departments',
    content:
      'Full CRUD for leads with search, filter, pagination. Metrics, master data, UHID lookup, lead history.',
  },
  {
    id: 'api-appointments',
    section: 'API Reference',
    title: 'Appointments API',
    keywords:
      'appointments book reschedule cancel calendar today departments providers',
    content:
      'Book, update, reschedule, cancel appointments. Calendar data, today overview, department and provider lists.',
  },
  {
    id: 'api-calls',
    section: 'API Reference',
    title: 'Calls API',
    keywords: 'calls log stats sip-event webhook incoming outgoing',
    content:
      'Log calls, get call statistics, SIP event webhook for real-time call handling.',
  },
  {
    id: 'api-dashboard',
    section: 'API Reference',
    title: 'Dashboard API',
    keywords: 'dashboard metrics activity log',
    content: 'Dashboard metrics, activity log retrieval and creation.',
  },
  {
    id: 'api-reports',
    section: 'API Reference',
    title: 'Reports API',
    keywords:
      'reports overview call-volume lead-sources department performance telecaller conversion funnel export',
    content:
      '12 report endpoints: overview, call volume, lead sources, department performance, provider leaderboard, status breakdown, weekly trend, telecallers, conversion funnel, call analytics, appointment stats, daily activity, CSV export.',
  },
  {
    id: 'api-notifications',
    section: 'API Reference',
    title: 'Notifications API',
    keywords: 'notifications list create mark-read delete unread',
    content:
      'List, create, mark as read, mark all as read, delete notifications.',
  },

  // Technical
  {
    id: 'api-roles',
    section: 'API Reference',
    title: 'Roles & Permissions API',
    keywords:
      'roles permissions rbac custom role create update delete assign user management',
    content:
      'Full CRUD for roles and permissions. Create custom roles, assign permissions, manage role-based access control.',
  },
  {
    id: 'api-branches',
    section: 'API Reference',
    title: 'Branches API',
    keywords: 'branches departments multi-branch hospital location',
    content:
      'List branches and departments. Multi-branch architecture for hospital networks.',
  },
  {
    id: 'database-schema',
    section: 'Technical',
    title: 'Database Schema',
    keywords:
      'database tables schema postgres sql users leads appointments call_logs notifications',
    content:
      '13 database tables: users, leads, lead_history, appointments, call_logs, notifications, activity_log, call_metrics, department_performance, master_lead_source, master_department, master_priority, master_lead_status.',
  },
  {
    id: 'security',
    section: 'Technical',
    title: 'Security & Auth',
    keywords:
      'security jwt authentication authorization rate-limit helmet validation bcrypt xss injection',
    content:
      'JWT authentication, role-based access control, rate limiting, input validation, helmet security headers, bcrypt password hashing, SQL injection prevention.',
  },
];

export const apiEndpoints = {
  auth: [
    {
      method: 'POST',
      path: '/api/auth/login',
      auth: 'Public',
      description: 'Authenticate user and get JWT token',
      body: {email: 'string', password: 'string'},
    },
    {
      method: 'POST',
      path: '/api/auth/register',
      auth: 'Public',
      description:
        'Register a new user account (role is server-assigned to "staff")',
      body: {
        name: 'string',
        email: 'string',
        password: 'string',
        specialty: 'string',
        phone: 'string',
      },
    },
    {
      method: 'GET',
      path: '/api/auth/me',
      auth: 'Required',
      description: 'Get current user profile',
    },
    {
      method: 'PUT',
      path: '/api/auth/profile',
      auth: 'Required',
      description: 'Update current user profile',
      body: {
        name: 'string',
        specialty: 'string',
        phone: 'string',
        avatar_url: 'string',
      },
    },
    {
      method: 'PUT',
      path: '/api/auth/password',
      auth: 'Required',
      description: 'Change current user password',
      body: {currentPassword: 'string', newPassword: 'string'},
    },
    {
      method: 'GET',
      path: '/api/auth/settings',
      auth: 'Required',
      description: 'Get user settings (theme, 2FA, notifications)',
    },
    {
      method: 'PUT',
      path: '/api/auth/settings',
      auth: 'Required',
      description: 'Update user settings',
      body: {
        theme: 'light|dark|system',
        two_factor_enabled: 'boolean',
        email_notifications: 'boolean',
      },
    },
    {
      method: 'GET',
      path: '/api/auth/users',
      auth: 'Super Admin',
      description: 'List all users',
    },
    {
      method: 'POST',
      path: '/api/auth/users',
      auth: 'Super Admin',
      description: 'Create a new user',
      body: {
        name: 'string',
        email: 'string',
        password: 'string',
        role: 'string',
        specialty: 'string',
        phone: 'string',
      },
    },
    {
      method: 'PUT',
      path: '/api/auth/users/:id',
      auth: 'Super Admin',
      description: 'Update a user',
      body: {
        name: 'string',
        email: 'string',
        role: 'string',
        specialty: 'string',
        phone: 'string',
        is_active: 'boolean',
      },
    },
    {
      method: 'PUT',
      path: '/api/auth/users/:id/password',
      auth: 'Super Admin',
      description: 'Reset a user password',
      body: {newPassword: 'string'},
    },
    {
      method: 'DELETE',
      path: '/api/auth/users/:id',
      auth: 'Super Admin',
      description: 'Deactivate a user (soft delete)',
    },
  ],
  leads: [
    {
      method: 'GET',
      path: '/api/leads',
      auth: 'Required',
      description: 'List leads with search, filter, pagination',
      params: 'search, status, priority, page, limit, sort, order',
    },
    {
      method: 'GET',
      path: '/api/leads/metrics',
      auth: 'Required',
      description:
        'Get lead box metrics (new today, pending, conversion rate, overdue)',
    },
    {
      method: 'GET',
      path: '/api/leads/master-data',
      auth: 'Required',
      description: 'Get dropdown data (sources, priorities, statuses)',
    },
    {
      method: 'GET',
      path: '/api/leads/uhid/:uhid',
      auth: 'Required',
      description: 'Search patient by UHID',
    },
    {
      method: 'GET',
      path: '/api/leads/:id',
      auth: 'Required',
      description: 'Get single lead details',
    },
    {
      method: 'POST',
      path: '/api/leads',
      auth: 'Required',
      description: 'Create a new lead',
      body: {
        name: 'string',
        phone: 'string',
        email: 'string',
        uhid: 'string',
        dob: 'date',
        address: 'string',
        pincode: 'string',
        city: 'string',
        state: 'string',
        lead_source: 'string',
        status: 'string',
        priority: 'string',
        clinical_remarks: 'string',
      },
    },
    {
      method: 'PUT',
      path: '/api/leads/:id',
      auth: 'Required',
      description: 'Update a lead',
      body: '(all fields optional)',
    },
    {
      method: 'DELETE',
      path: '/api/leads/:id',
      auth: 'Required',
      description: 'Delete a lead (soft delete — sets status to Rejected)',
    },
    {
      method: 'GET',
      path: '/api/leads/:id/history',
      auth: 'Required',
      description: 'Get lead change history',
    },
    {
      method: 'GET',
      path: '/api/leads/providers',
      auth: 'Required',
      description: 'List providers for dropdown',
    },
    {
      method: 'GET',
      path: '/api/leads/departments',
      auth: 'Required',
      description: 'List departments for dropdown',
    },
  ],
  appointments: [
    {
      method: 'GET',
      path: '/api/appointments',
      auth: 'Required',
      description: 'List appointments with filters',
      params: 'status, date, provider_id, department, page, limit',
    },
    {
      method: 'GET',
      path: '/api/appointments/today',
      auth: 'Required',
      description:
        'Get today appointment overview (scheduled, confirmed, completed, cancelled, no-show)',
    },
    {
      method: 'GET',
      path: '/api/appointments/calendar',
      auth: 'Required',
      description: 'Get calendar data for a month',
      params: 'year, month',
    },
    {
      method: 'GET',
      path: '/api/appointments/:id',
      auth: 'Required',
      description: 'Get single appointment details',
    },
    {
      method: 'POST',
      path: '/api/appointments',
      auth: 'Required',
      description: 'Book a new appointment',
      body: {
        patient_name: 'string',
        phone: 'string',
        department: 'string',
        provider_id: 'integer',
        appointment_date: 'date',
        appointment_time: 'HH:MM',
        notes: 'string',
      },
    },
    {
      method: 'PUT',
      path: '/api/appointments/:id',
      auth: 'Required',
      description: 'Update an appointment',
      body: '(all fields optional)',
    },
    {
      method: 'PUT',
      path: '/api/appointments/:id/reschedule',
      auth: 'Required',
      description: 'Reschedule an appointment',
      body: {appointment_date: 'date', appointment_time: 'HH:MM'},
    },
    {
      method: 'PUT',
      path: '/api/appointments/:id/cancel',
      auth: 'Required',
      description: 'Cancel an appointment',
      body: {reason: 'string'},
    },
    {
      method: 'GET',
      path: '/api/appointments/departments',
      auth: 'Required',
      description: 'List departments for dropdown',
    },
    {
      method: 'GET',
      path: '/api/appointments/providers',
      auth: 'Required',
      description: 'List providers for dropdown',
    },
    {
      method: 'GET',
      path: '/api/appointments/doctors',
      auth: 'Required',
      description: 'List doctors, filterable by department',
      params: 'department',
    },
    {
      method: 'GET',
      path: '/api/appointments/slots',
      auth: 'Required',
      description:
        'Get available time slots for a doctor on a date (30-min intervals)',
      params: 'doctor_id, date',
    },
  ],
  calls: [
    {
      method: 'GET',
      path: '/api/calls',
      auth: 'Required',
      description: 'List call logs with filters',
      params: 'user_id, direction, status, page, limit',
    },
    {
      method: 'GET',
      path: '/api/calls/stats',
      auth: 'Required',
      description:
        'Get call statistics (total today, missed, inbound, outbound, avg duration)',
    },
    {
      method: 'POST',
      path: '/api/calls',
      auth: 'Required',
      description: 'Log a call manually',
      body: {
        caller_number: 'string',
        callee_number: 'string',
        direction: 'inbound|outbound',
        status: 'string',
        duration: 'integer',
        lead_id: 'integer',
      },
    },
    {
      method: 'PUT',
      path: '/api/calls/:id',
      auth: 'Required',
      description: 'Update call status',
      body: {status: 'string', duration: 'integer', notes: 'string'},
    },
    {
      method: 'POST',
      path: '/api/calls/sip-event',
      auth: 'Required',
      description: 'SIP event webhook for real-time call handling',
      body: {
        event: 'incoming|outgoing|answered|ended|missed',
        call_id: 'string',
        caller: 'string',
        callee: 'string',
        status: 'string',
        duration: 'integer',
      },
    },
  ],
  dashboard: [
    {
      method: 'GET',
      path: '/api/dashboard/metrics',
      auth: 'Required',
      description:
        'Get dashboard overview metrics (total calls, missed, action required, answered, unanswered)',
    },
    {
      method: 'GET',
      path: '/api/dashboard/activity',
      auth: 'Required',
      description: 'Get activity log',
      params: 'type, limit',
    },
    {
      method: 'POST',
      path: '/api/dashboard/activity',
      auth: 'Required',
      description: 'Log an activity',
      body: {
        action: 'string',
        details: 'string',
        patient_name: 'string',
        call_type: 'string',
        status: 'string',
        duration: 'string',
      },
    },
  ],
  reports: [
    {
      method: 'GET',
      path: '/api/reports/overview',
      auth: 'Required',
      description:
        'Get summary cards (total calls, leads, appointments, conversion rate, satisfaction)',
    },
    {
      method: 'GET',
      path: '/api/reports/call-volume',
      auth: 'Required',
      description: 'Get monthly call volume data',
    },
    {
      method: 'GET',
      path: '/api/reports/lead-sources',
      auth: 'Required',
      description: 'Get lead distribution by source',
    },
    {
      method: 'GET',
      path: '/api/reports/department-performance',
      auth: 'Required',
      description: 'Get department performance stats',
    },
    {
      method: 'GET',
      path: '/api/reports/provider-leaderboard',
      auth: 'Required',
      description: 'Get top providers by conversions',
    },
    {
      method: 'GET',
      path: '/api/reports/status-breakdown',
      auth: 'Required',
      description: 'Get lead status breakdown',
    },
    {
      method: 'GET',
      path: '/api/reports/weekly-trend',
      auth: 'Required',
      description: 'Get weekly lead/call trend',
    },
    {
      method: 'GET',
      path: '/api/reports/telecallers',
      auth: 'Required',
      description: 'Get telecaller performance stats',
    },
    {
      method: 'GET',
      path: '/api/reports/conversion-funnel',
      auth: 'Required',
      description:
        'Get conversion funnel (New → Contacted → Interested → Appointment → Closed)',
    },
    {
      method: 'GET',
      path: '/api/reports/call-analytics',
      auth: 'Required',
      description: 'Get detailed call analytics (by status, direction, hour)',
    },
    {
      method: 'GET',
      path: '/api/reports/appointment-stats',
      auth: 'Required',
      description:
        'Get appointment statistics (by status, department, no-show rate)',
    },
    {
      method: 'GET',
      path: '/api/reports/daily-activity',
      auth: 'Required',
      description: 'Get today activity summary',
    },
    {
      method: 'GET',
      path: '/api/reports/export',
      auth: 'Required',
      description: 'Export data as CSV',
      params: 'type (leads|calls|appointments)',
    },
  ],
  notifications: [
    {
      method: 'GET',
      path: '/api/notifications',
      auth: 'Required',
      description: 'List user notifications',
      params: 'unread_only, limit',
    },
    {
      method: 'POST',
      path: '/api/notifications',
      auth: 'Required',
      description: 'Create a notification',
      body: {
        title: 'string',
        type: 'urgent|warning|success|info',
        link: 'string',
        user_id: 'integer',
      },
    },
    {
      method: 'PUT',
      path: '/api/notifications/:id/read',
      auth: 'Required',
      description: 'Mark a notification as read',
    },
    {
      method: 'PUT',
      path: '/api/notifications/read-all',
      auth: 'Required',
      description: 'Mark all notifications as read',
    },
    {
      method: 'DELETE',
      path: '/api/notifications/:id',
      auth: 'Required',
      description: 'Delete a notification',
    },
  ],
  roles: [
    {
      method: 'GET',
      path: '/api/roles',
      auth: 'Super Admin',
      description: 'List all roles with permission and user counts',
    },
    {
      method: 'GET',
      path: '/api/roles/permissions/all',
      auth: 'Super Admin',
      description: 'Get all permissions grouped by module',
    },
    {
      method: 'GET',
      path: '/api/roles/:id',
      auth: 'Super Admin',
      description: 'Get single role with its permissions',
    },
    {
      method: 'POST',
      path: '/api/roles',
      auth: 'Super Admin',
      description: 'Create a custom role',
      body: {name: 'string', display_name: 'string', description: 'string'},
    },
    {
      method: 'PUT',
      path: '/api/roles/:id',
      auth: 'Super Admin',
      description: 'Update a role display name or description',
      body: {display_name: 'string', description: 'string'},
    },
    {
      method: 'DELETE',
      path: '/api/roles/:id',
      auth: 'Super Admin',
      description:
        'Delete a custom role (blocks system roles and roles with users)',
    },
    {
      method: 'PUT',
      path: '/api/roles/:id/permissions',
      auth: 'Super Admin',
      description: 'Replace all permissions for a role (transactional)',
      body: {permission_ids: 'integer[]'},
    },
  ],
  branches: [
    {
      method: 'GET',
      path: '/api/branches',
      auth: 'Required',
      description: 'List all active branches',
    },
    {
      method: 'GET',
      path: '/api/branches/:id/departments',
      auth: 'Required',
      description: 'Get departments available at a specific branch',
    },
  ],
};

export const rolePermissions = {
  'Super Admin': {
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    permissions: [
      'Full access to all features',
      'Create, update, and delete users',
      'Reset user passwords',
      'Activate/deactivate user accounts',
      'View all leads across all telecallers',
      'View all appointments',
      'Access all reports and analytics',
      'Export data (leads, calls, appointments)',
      'Manage system settings',
    ],
  },
  Manager: {
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    permissions: [
      'View all leads across all telecallers',
      'View all appointments',
      'Access all reports and analytics',
      'Export data',
      'Assign leads to telecallers',
      'Monitor team performance',
      'View dashboard metrics',
    ],
  },
  Telecaller: {
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    permissions: [
      'View only assigned leads',
      'Create and update leads',
      'Book appointments',
      'View own call logs',
      'View own dashboard metrics',
      'Receive notifications',
      'Update lead status and notes',
    ],
  },
};

export const databaseTables = [
  {
    name: 'users',
    description:
      'System users with roles (super_admin, manager, telecaller, staff)',
    fields: [
      'id',
      'name',
      'email',
      'password_hash',
      'role',
      'avatar_url',
      'specialty',
      'phone',
      'is_active',
      'theme',
      'two_factor_enabled',
      'email_notifications',
    ],
  },
  {
    name: 'leads',
    description: 'Patient leads with contact info and status tracking',
    fields: [
      'id',
      'name',
      'initials',
      'uhid',
      'phone',
      'alternate_contact',
      'email',
      'dob',
      'address',
      'pincode',
      'city',
      'state',
      'country',
      'lead_source',
      'status',
      'priority',
      'assigned_to',
      'clinical_remarks',
      'last_call_date',
    ],
  },
  {
    name: 'lead_history',
    description: 'Audit trail for all lead changes',
    fields: ['id', 'lead_id', 'action', 'old_value', 'new_value', 'changed_by'],
  },
  {
    name: 'appointments',
    description: 'Patient appointments with scheduling info',
    fields: [
      'id',
      'patient_name',
      'phone',
      'department',
      'provider_id',
      'provider_name',
      'appointment_date',
      'appointment_time',
      'status',
      'notes',
      'created_by',
    ],
  },
  {
    name: 'call_logs',
    description: 'Inbound and outbound call records',
    fields: [
      'id',
      'caller_number',
      'callee_number',
      'direction',
      'status',
      'duration',
      'lead_id',
      'user_id',
      'sip_call_id',
      'notes',
    ],
  },
  {
    name: 'notifications',
    description: 'User notifications with read status',
    fields: ['id', 'user_id', 'type', 'title', 'link', 'is_read'],
  },
  {
    name: 'activity_log',
    description: 'System activity tracking',
    fields: [
      'id',
      'user_id',
      'action',
      'details',
      'patient_name',
      'call_type',
      'status',
      'duration',
    ],
  },
  {
    name: 'call_metrics',
    description: 'Aggregated call statistics by date',
    fields: [
      'id',
      'metric_date',
      'total_calls',
      'unique_calls',
      'missed_calls',
      'unique_missed',
      'answered_calls',
      'unique_answered',
    ],
  },
  {
    name: 'department_performance',
    description: 'Department performance metrics',
    fields: [
      'id',
      'department',
      'leads_handled',
      'appointments_booked',
      'conversions',
      'satisfaction',
    ],
  },
  {
    name: 'master_lead_source',
    description: 'Lead source dropdown options',
    fields: ['id', 'name'],
  },
  {
    name: 'master_department',
    description: 'Department dropdown options',
    fields: ['id', 'name'],
  },
  {
    name: 'master_priority',
    description: 'Priority level options',
    fields: ['id', 'name'],
  },
  {
    name: 'master_lead_status',
    description: 'Lead status options',
    fields: ['id', 'name'],
  },
  {
    name: 'roles',
    description: 'RBAC roles (system and custom)',
    fields: [
      'id',
      'name',
      'display_name',
      'description',
      'is_system',
      'is_active',
    ],
  },
  {
    name: 'permissions',
    description: 'RBAC permissions grouped by module',
    fields: ['id', 'name', 'display_name', 'description', 'module'],
  },
  {
    name: 'role_permissions',
    description: 'Role-to-permission junction table',
    fields: ['id', 'role_id', 'permission_id'],
  },
  {
    name: 'user_roles',
    description: 'User-to-role junction table (max 2 roles per user)',
    fields: ['id', 'user_id', 'role_id'],
  },
  {
    name: 'master_branches',
    description: 'Hospital branch locations',
    fields: [
      'id',
      'name',
      'address',
      'city',
      'state',
      'phone',
      'email',
      'is_active',
    ],
  },
  {
    name: 'branch_departments',
    description: 'Branch-to-department junction table',
    fields: ['id', 'branch_id', 'department_id'],
  },
  {
    name: 'master_doctors',
    description: 'Doctor directory with specialties',
    fields: [
      'id',
      'name',
      'department',
      'specialty',
      'qualification',
      'phone',
      'email',
      'is_active',
    ],
  },
  {
    name: 'lead_uhids',
    description: 'Multiple UHIDs per lead (junction table)',
    fields: ['id', 'lead_id', 'uhid'],
  },
];
