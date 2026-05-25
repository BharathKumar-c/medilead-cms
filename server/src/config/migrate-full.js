/**
 * migrate-full.js — Unified Migration Orchestrator
 *
 * Runs ALL migrations and seed operations in the correct order.
 * Designed to be SAFE to run against an existing client database:
 * - Uses CREATE TABLE IF NOT EXISTS (no DROP TABLE)
 * - Uses ALTER TABLE ADD COLUMN IF NOT EXISTS (additive only)
 * - Uses INSERT ... ON CONFLICT DO NOTHING (never overwrites existing data)
 * - All existing client data (leads, appointments, calls, etc.) is preserved
 *
 * Usage:
 *   npm run migrate:full
 *   # or
 *   node src/config/migrate-full.js
 */
require('dotenv').config();
const db = require('./database');

// ── Migration modules ──
const migrateNewFields = require('./migrate-new-fields');
const createPincodesTable = require('./migrate-pincodes');
const addBranchIdColumn = require('./add-branch-id');
const addRecordingUrl = require('./add-recording-url');
const migrateStatusConstraint = require('./migrate-status-constraint');
const createLeadStatusHistory = require('./migrate-lead-status-history');

// ── Seed modules ──
const seedDepartments = require('../seeds/seed-departments');
const seedBranches = require('../seeds/seed-branches');
const seedPincodes = require('../seeds/seed-pincodes');

// ──────────────────────────────────────────────
// Safe table creation (no DROP — uses CREATE TABLE IF NOT EXISTS)
// ──────────────────────────────────────────────
const createTablesSafe = async () => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        employee_id VARCHAR(50) UNIQUE,
        date_of_birth DATE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'staff',
        avatar_url TEXT,
        specialty VARCHAR(255),
        department VARCHAR(100),
        designation VARCHAR(255),
        intercom_number VARCHAR(50) UNIQUE,
        allowed_departments TEXT[],
        phone VARCHAR(50),
        theme VARCHAR(20) DEFAULT 'light',
        two_factor_enabled BOOLEAN DEFAULT false,
        email_notifications BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(150) NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(150) NOT NULL,
        description TEXT,
        module VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Role-Permissions junction
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, permission_id)
      );
    `);

    // User-Roles junction
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id)
      );
    `);

    // Lead Sources master
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_lead_source (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // Departments master
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_department (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // Branches master
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        phone VARCHAR(50),
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // Branch-Departments junction
    await client.query(`
      CREATE TABLE IF NOT EXISTS branch_departments (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES master_branches(id) ON DELETE CASCADE,
        department_id INTEGER NOT NULL REFERENCES master_department(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(branch_id, department_id)
      );
    `);

    // Priorities master
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_priority (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    // Lead Statuses master
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_lead_status (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    // Doctors master
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_doctors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        department VARCHAR(100) NOT NULL,
        specialty VARCHAR(255),
        qualification VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Pincodes master (also created by migrate-pincodes.js, but here for completeness)
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_pincodes (
        id SERIAL PRIMARY KEY,
        pincode VARCHAR(10) NOT NULL,
        area VARCHAR(255) NOT NULL,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (pincode, area)
      );
    `);

    // Leads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        initials VARCHAR(10),
        code VARCHAR(50),
        uhid VARCHAR(50),
        phone VARCHAR(50),
        alternate_contact VARCHAR(50),
        email VARCHAR(255),
        dob DATE,
        gender VARCHAR(20),
        address TEXT,
        area VARCHAR(100),
        pincode VARCHAR(10),
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Interested', 'Follow-up', 'Complaint Enquiry', 'Location Enquiry', 'Medical Certificate', 'Dial a Doctor', 'Appointment Cancel', 'Ambulance Service Enquiry', 'Biomedical', 'IT', 'CGHS and Ex-Service Scheme', 'CM Scheme & PM Scheme', 'Admission and Room Details Enquiry', 'Purchase', 'Lab & Diagnostic', 'Accounts', 'Medical Record Documents', 'Blood Bank', 'ER', 'Marketing', 'Job Vacancy', 'Pharmacy', 'Billing & Payment', 'Insurance', 'Doctors Enquiry', 'MHC Package', 'Dialysis Enquiry', 'Scan & X-Ray', 'Internship', 'Appointment Booked', 'Closed', 'Rejected')),
        lead_source VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
        assigned_to INTEGER REFERENCES users(id),
        assigned_by INTEGER REFERENCES users(id),
        branch_id INTEGER REFERENCES master_branches(id),
        clinical_remarks TEXT,
        created_by INTEGER REFERENCES users(id),
        follow_up_date TIMESTAMP,
        last_call_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Lead UHIDs junction
    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_uhids (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        uhid VARCHAR(50) NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lead_id, uhid)
      );
    `);

    // Lead Status History (tracks status transitions for metrics)
    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_status_history (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        changed_by INTEGER REFERENCES users(id),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Lead History (audit trail)
    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_history (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Call Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS call_logs (
        id SERIAL PRIMARY KEY,
        call_id VARCHAR(100) UNIQUE,
        caller_number VARCHAR(50) NOT NULL,
        callee_number VARCHAR(50),
        direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
        status VARCHAR(20) DEFAULT 'ringing' CHECK (status IN ('ringing', 'connected', 'on_hold', 'disconnected', 'missed', 'failed')),
        lead_id INTEGER REFERENCES leads(id),
        user_id INTEGER REFERENCES users(id),
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        duration INTEGER DEFAULT 0,
        notes TEXT,
        recording_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Telephony Vendor Call Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS telephony_call_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_call_id VARCHAR(100) UNIQUE,
        caller_phone_number VARCHAR(50) NOT NULL,
        call_status VARCHAR(20) NOT NULL DEFAULT 'initiated'
          CHECK (call_status IN ('initiated','ringing','in-progress','completed','failed','missed')),
        duration_seconds INTEGER DEFAULT 0,
        direction VARCHAR(10) DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
        recording_url TEXT,
        intercom_number VARCHAR(50),
        timestamp TIMESTAMPTZ,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        raw_payload JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Appointments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_name VARCHAR(255) NOT NULL,
        initials VARCHAR(10),
        phone VARCHAR(50),
        email VARCHAR(255),
        department VARCHAR(100) NOT NULL,
        provider_id INTEGER REFERENCES users(id),
        provider_name VARCHAR(255),
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        status VARCHAR(20) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No Show')),
        cancellation_reason TEXT,
        notes TEXT,
        visit_type VARCHAR(50),
        consultation_mode VARCHAR(50),
        lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('urgent', 'warning', 'success', 'info')),
        title VARCHAR(500) NOT NULL,
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Activity log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        patient_name VARCHAR(255) NOT NULL,
        call_type VARCHAR(100),
        status VARCHAR(20) CHECK (status IN ('Answered', 'Missed')),
        duration VARCHAR(20),
        provider_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Call metrics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS call_metrics (
        id SERIAL PRIMARY KEY,
        metric_date DATE NOT NULL,
        total_calls INTEGER DEFAULT 0,
        unique_calls INTEGER DEFAULT 0,
        missed_calls INTEGER DEFAULT 0,
        unique_missed INTEGER DEFAULT 0,
        answered_calls INTEGER DEFAULT 0,
        unique_answered INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Department performance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS department_performance (
        id SERIAL PRIMARY KEY,
        department VARCHAR(100) NOT NULL,
        metric_date DATE NOT NULL,
        calls INTEGER DEFAULT 0,
        leads INTEGER DEFAULT 0,
        appointments INTEGER DEFAULT 0,
        satisfaction INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Password Reset Tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // System settings table (key-value store for app-wide settings like maintenance mode)
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Report exports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_exports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        report_type VARCHAR(50) NOT NULL,
        date_from DATE NOT NULL,
        date_to DATE NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        file_path TEXT,
        row_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);

    // Create indexes (IF NOT EXISTS)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_master_pincodes_pincode ON master_pincodes(pincode);
      CREATE INDEX IF NOT EXISTS idx_master_pincodes_city ON master_pincodes(city);
      CREATE INDEX IF NOT EXISTS idx_master_pincodes_state ON master_pincodes(state);
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
      CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_leads_uhid ON leads(uhid);
      CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
      CREATE INDEX IF NOT EXISTS idx_leads_alternate_contact ON leads(alternate_contact);
      CREATE INDEX IF NOT EXISTS idx_call_logs_caller_number ON call_logs(caller_number);
      CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON call_logs(lead_id);
      CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id);
      CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_at ON lead_status_history(changed_at);
      CREATE INDEX IF NOT EXISTS idx_lead_status_history_new_status ON lead_status_history(new_status);
      CREATE INDEX IF NOT EXISTS idx_lead_uhids_uhid ON lead_uhids(uhid);
      CREATE INDEX IF NOT EXISTS idx_lead_uhids_lead_id ON lead_uhids(lead_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
      CREATE INDEX IF NOT EXISTS idx_appointments_provider ON appointments(provider_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
      CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_branch_departments_branch ON branch_departments(branch_id);
      CREATE INDEX IF NOT EXISTS idx_branch_departments_dept ON branch_departments(department_id);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
      CREATE INDEX IF NOT EXISTS idx_telephony_call_logs_phone ON telephony_call_logs(caller_phone_number);
      CREATE INDEX IF NOT EXISTS idx_telephony_call_logs_status ON telephony_call_logs(call_status);
      CREATE INDEX IF NOT EXISTS idx_telephony_call_logs_timestamp ON telephony_call_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_telephony_call_logs_vendor_call_id ON telephony_call_logs(vendor_call_id);
      CREATE INDEX IF NOT EXISTS idx_telephony_call_logs_created ON telephony_call_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_report_exports_user ON report_exports(user_id);
      CREATE INDEX IF NOT EXISTS idx_report_exports_status ON report_exports(status);
    `);

    await client.query('COMMIT');
    // Ensure branch_id column exists on leads (may be missing if table was created by a prior run without it)
    await client.query(`
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES master_branches(id);
    `);
    // Create index on branch_id (safe here since ALTER TABLE runs first)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON leads(branch_id);
    `);

    console.log('All tables created/verified successfully (CREATE TABLE IF NOT EXISTS, no DROP)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', err);
    throw err;
  } finally {
    client.release();
  }
};

// ──────────────────────────────────────────────
// Master data seed helpers (inline — copied from seed.js, but non-destructive)
// ──────────────────────────────────────────────
const seedLeadSources = async () => {
  await db.query(`
    INSERT INTO master_lead_source (name)
    SELECT name FROM (VALUES
      ('Doctor Referral'),
      ('Near By'),
      ('Advertisement Media'),
      ('Google'),
      ('Practo'),
      ('Just Dial'),
      ('Friends & Relatives'),
      ('Instagram'),
      ('Websites'),
      ('Call'),
      ('Facebook'),
      ('Advertisement Newspaper')
    ) AS v(name)
    WHERE NOT EXISTS (SELECT 1 FROM master_lead_source WHERE name = v.name);
  `);
  console.log('✓ Lead sources seeded');
};

const seedDoctors = async () => {
  await db.query(`
    INSERT INTO master_doctors (name, department, specialty, qualification, phone, email)
    SELECT name, department, specialty, qualification, phone, email FROM (VALUES
      ('Dr. Rajesh Sharma',  'Cardiology'::VARCHAR,          'Interventional Cardiologist'::VARCHAR,      'MBBS, MD, DM Cardiology'::VARCHAR,              '9876543201'::VARCHAR, 'rajesh.sharma@hospital.com'::VARCHAR),
      ('Dr. Priya Mehta',    'Cardiology'::VARCHAR,          'Cardiac Surgeon'::VARCHAR,                  'MBBS, MS, MCh Cardiothoracic'::VARCHAR,         '9876543202'::VARCHAR, 'priya.mehta@hospital.com'::VARCHAR),
      ('Dr. Anil Kumar',     'Neurology'::VARCHAR,           'Neurologist'::VARCHAR,                      'MBBS, MD, DM Neurology'::VARCHAR,              '9876543203'::VARCHAR, 'anil.kumar@hospital.com'::VARCHAR),
      ('Dr. Sneha Patel',    'Neurology'::VARCHAR,           'Neuro-Surgeon'::VARCHAR,                    'MBBS, MS, MCh Neurosurgery'::VARCHAR,          '9876543204'::VARCHAR, 'sneha.patel@hospital.com'::VARCHAR),
      ('Dr. Vikram Singh',   'Orthopedics'::VARCHAR,         'Orthopedic Surgeon'::VARCHAR,               'MBBS, MS Orthopedics'::VARCHAR,                '9876543205'::VARCHAR, 'vikram.singh@hospital.com'::VARCHAR),
      ('Dr. Neha Gupta',     'Orthopedics'::VARCHAR,         'Joint Replacement Specialist'::VARCHAR,     'MBBS, MS, Fellowship Joint Replacement'::VARCHAR, '9876543206'::VARCHAR, 'neha.gupta@hospital.com'::VARCHAR),
      ('Dr. Suresh Reddy',   'Pediatrics'::VARCHAR,          'Pediatrician'::VARCHAR,                     'MBBS, MD Pediatrics'::VARCHAR,                 '9876543207'::VARCHAR, 'suresh.reddy@hospital.com'::VARCHAR),
      ('Dr. Kavita Joshi',   'Pediatrics'::VARCHAR,          'Neonatologist'::VARCHAR,                    'MBBS, MD, DM Neonatology'::VARCHAR,            '9876543208'::VARCHAR, 'kavita.joshi@hospital.com'::VARCHAR),
      ('Dr. Amit Verma',     'Dermatology'::VARCHAR,         'Dermatologist'::VARCHAR,                    'MBBS, MD Dermatology'::VARCHAR,                '9876543209'::VARCHAR, 'amit.verma@hospital.com'::VARCHAR),
      ('Dr. Pooja Nair',     'General Consultation'::VARCHAR,'General Physician'::VARCHAR,                'MBBS, MD Internal Medicine'::VARCHAR,          '9876543210'::VARCHAR, 'pooja.nair@hospital.com'::VARCHAR),
      ('Dr. Mohan Das',      'General Consultation'::VARCHAR,'General Practitioner'::VARCHAR,             'MBBS, DNB Family Medicine'::VARCHAR,           '9876543211'::VARCHAR, 'mohan.das@hospital.com'::VARCHAR),
      ('Dr. Ritu Agarwal',   'Emergency'::VARCHAR,           'Emergency Medicine'::VARCHAR,               'MBBS, MD Emergency Medicine'::VARCHAR,         '9876543212'::VARCHAR, 'ritu.agarwal@hospital.com'::VARCHAR)
    ) AS v(name, department, specialty, qualification, phone, email)
    WHERE NOT EXISTS (SELECT 1 FROM master_doctors WHERE name = v.name);
  `);
  console.log('✓ Doctors seeded');
};

const seedPriorities = async () => {
  await db.query(`
    INSERT INTO master_priority (name)
    SELECT name FROM (VALUES
      ('High'),
      ('Medium'),
      ('Low')
    ) AS v(name)
    WHERE NOT EXISTS (SELECT 1 FROM master_priority WHERE name = v.name);
  `);
  console.log('✓ Priorities seeded');
};

const seedLeadStatuses = async () => {
  await db.query(`
    INSERT INTO master_lead_status (name)
    SELECT name FROM (VALUES
      -- Modern lead pipeline statuses
      ('New'),
      ('Contacted'),
      ('Interested'),
      ('Follow-up'),
      ('Closed'),
      ('Rejected'),
      -- Legacy enquiry types (existing data)
      ('Complaint Enquiry'),
      ('Location Enquiry'),
      ('Medical Certificate'),
      ('Dial a Doctor'),
      ('Appointment Cancel'),
      ('Ambulance Service Enquiry'),
      ('Biomedical'),
      ('IT'),
      ('CGHS and Ex-Service Scheme'),
      ('CM Scheme & PM Scheme'),
      ('Admission and Room Details Enquiry'),
      ('Purchase'),
      ('Lab & Diagnostic'),
      ('Accounts'),
      ('Medical Record Documents'),
      ('Blood Bank'),
      ('ER'),
      ('Marketing'),
      ('Job Vacancy'),
      ('Pharmacy'),
      ('Billing & Payment'),
      ('Insurance'),
      ('Doctors Enquiry'),
      ('MHC Package'),
      ('Dialysis Enquiry'),
      ('Scan & X-Ray'),
      ('Internship'),
      ('Appointment Booked')
    ) AS v(name)
    WHERE NOT EXISTS (SELECT 1 FROM master_lead_status WHERE name = v.name);
  `);
  console.log('✓ Lead statuses seeded');
};

const seedRBAC = async () => {
  const bcrypt = require('bcryptjs');

  // Roles
  await db.query(`
    INSERT INTO roles (name, display_name, description, is_system)
    SELECT name, display_name, description, is_system FROM (VALUES
      ('super_admin', 'Super Admin', 'Full system access. Can manage users, roles, and all settings.', true::boolean),
      ('manager',     'Manager',     'Manages leads, appointments, and views reports. Can view all data.', true::boolean),
      ('telecaller',  'Telecaller',  'Handles calls, manages assigned leads and own appointments.', true::boolean)
    ) AS v(name, display_name, description, is_system)
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = v.name);
  `);
  console.log('✓ Roles seeded');

  // Permissions
  await db.query(`
    INSERT INTO permissions (name, display_name, description, module)
    SELECT name, display_name, description, module FROM (VALUES
      ('leads:view_all'::VARCHAR,       'View All Leads'::VARCHAR,       'See all leads regardless of assignment'::VARCHAR,                'leads'::VARCHAR),
      ('leads:view_assigned'::VARCHAR,  'View Assigned Leads'::VARCHAR,  'See only leads assigned to you'::VARCHAR,                        'leads'::VARCHAR),
      ('leads:create'::VARCHAR,         'Create Leads'::VARCHAR,         'Create new lead records'::VARCHAR,                               'leads'::VARCHAR),
      ('leads:update'::VARCHAR,         'Update Leads'::VARCHAR,         'Edit lead details and status'::VARCHAR,                          'leads'::VARCHAR),
      ('leads:delete'::VARCHAR,         'Delete Leads'::VARCHAR,         'Reject or delete lead records'::VARCHAR,                         'leads'::VARCHAR),
      ('leads:assign'::VARCHAR,         'Assign Leads'::VARCHAR,         'Assign leads to users'::VARCHAR,                                 'leads'::VARCHAR),
      ('leads:view_providers'::VARCHAR, 'View Providers'::VARCHAR,       'Appear in provider dropdowns'::VARCHAR,                          'leads'::VARCHAR),
      ('appointments:view_all'::VARCHAR,   'View All Appointments'::VARCHAR,    'See all appointments'::VARCHAR,                         'appointments'::VARCHAR),
      ('appointments:view_own'::VARCHAR,   'View Own Appointments'::VARCHAR,    'See only your appointments'::VARCHAR,                   'appointments'::VARCHAR),
      ('appointments:create'::VARCHAR,     'Create Appointments'::VARCHAR,      'Book new appointments'::VARCHAR,                         'appointments'::VARCHAR),
      ('appointments:update'::VARCHAR,     'Update Appointments'::VARCHAR,      'Edit appointment details'::VARCHAR,                      'appointments'::VARCHAR),
      ('appointments:cancel'::VARCHAR,     'Cancel Appointments'::VARCHAR,      'Cancel scheduled appointments'::VARCHAR,                 'appointments'::VARCHAR),
      ('appointments:reschedule'::VARCHAR, 'Reschedule Appointments'::VARCHAR,  'Reschedule existing appointments'::VARCHAR,              'appointments'::VARCHAR),
      ('calls:view_all'::VARCHAR,          'View All Calls'::VARCHAR,           'See all call logs'::VARCHAR,                             'calls'::VARCHAR),
      ('calls:create'::VARCHAR,            'Log Calls'::VARCHAR,                'Create new call log entries'::VARCHAR,                    'calls'::VARCHAR),
      ('calls:update'::VARCHAR,            'Update Calls'::VARCHAR,             'Update call status and notes'::VARCHAR,                   'calls'::VARCHAR),
      ('calls:receive_sip_events'::VARCHAR,'Receive SIP Events'::VARCHAR,       'Get notified of incoming/outgoing calls'::VARCHAR,        'calls'::VARCHAR),
      ('reports:view'::VARCHAR,   'View Reports'::VARCHAR,   'Access reports and analytics'::VARCHAR,  'reports'::VARCHAR),
      ('reports:export'::VARCHAR, 'Export Reports'::VARCHAR, 'Export reports to CSV'::VARCHAR,          'reports'::VARCHAR),
      ('users:view'::VARCHAR,          'View Users'::VARCHAR,          'View the user list'::VARCHAR,               'users'::VARCHAR),
      ('users:create'::VARCHAR,        'Create Users'::VARCHAR,        'Create new user accounts'::VARCHAR,          'users'::VARCHAR),
      ('users:update'::VARCHAR,        'Update Users'::VARCHAR,        'Edit user details'::VARCHAR,                'users'::VARCHAR),
      ('users:deactivate'::VARCHAR,    'Deactivate Users'::VARCHAR,    'Deactivate user accounts'::VARCHAR,          'users'::VARCHAR),
      ('users:reset_password'::VARCHAR,'Reset Passwords'::VARCHAR,     'Reset user passwords'::VARCHAR,              'users'::VARCHAR),
      ('roles:view'::VARCHAR,   'View Roles'::VARCHAR,   'View roles and permissions'::VARCHAR,   'roles'::VARCHAR),
      ('roles:create'::VARCHAR, 'Create Roles'::VARCHAR, 'Create custom roles'::VARCHAR,          'roles'::VARCHAR),
      ('roles:update'::VARCHAR, 'Update Roles'::VARCHAR, 'Edit role permissions'::VARCHAR,        'roles'::VARCHAR),
      ('roles:delete'::VARCHAR, 'Delete Roles'::VARCHAR, 'Delete custom roles'::VARCHAR,          'roles'::VARCHAR),
      ('dashboard:view'::VARCHAR, 'View Dashboard'::VARCHAR, 'Access the main dashboard'::VARCHAR, 'dashboard'::VARCHAR),
      ('notifications:manage'::VARCHAR, 'Manage Notifications'::VARCHAR, 'Receive and manage notifications'::VARCHAR, 'notifications'::VARCHAR),
      ('settings:manage'::VARCHAR,     'Manage Settings'::VARCHAR,     'Toggle maintenance mode and manage app settings'::VARCHAR, 'settings'::VARCHAR)
    ) AS v(name, display_name, description, module)
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = v.name);
  `);
  console.log('✓ Permissions seeded');

  // Role-Permission mappings — Super Admin gets ALL
  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name = 'super_admin'
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions rp
        WHERE rp.role_id = r.id AND rp.permission_id = p.id
      );
  `);
  // Manager permissions
  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name = 'manager' AND p.name IN (
      'leads:view_all','leads:create','leads:update','leads:delete','leads:assign','leads:view_providers',
      'appointments:view_all','appointments:create','appointments:update','appointments:cancel','appointments:reschedule',
      'calls:view_all','calls:create','calls:update','calls:receive_sip_events',
      'reports:view','reports:export','users:view','dashboard:view','notifications:manage'
    )
    AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
    );
  `);
  // Telecaller permissions
  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name = 'telecaller' AND p.name IN (
      'leads:view_assigned','leads:create','leads:update','leads:view_providers',
      'appointments:view_own','appointments:create','appointments:update','appointments:cancel','appointments:reschedule',
      'calls:view_all','calls:create','calls:update',
      'reports:view','reports:export','dashboard:view','notifications:manage'
    )
    AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
    );
  `);    console.log('✓ Role-permission mappings seeded');

  // Default system settings
  await db.query(`
    INSERT INTO system_settings (key, value)
    SELECT * FROM (VALUES
      ('maintenance_mode', 'false'),
      ('maintenance_message', 'The application is currently undergoing maintenance. Please check back shortly.')
    ) AS v(key, value)
    WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = v.key);
  `);
  console.log('✓ System settings seeded');

  // Seed default users
  const passwordHash = await bcrypt.hash('password123', 10);

  // Super Admin
  const saExists = await db.query('SELECT 1 FROM users WHERE email = $1', ['barath@gmail.com']);
  if (saExists.rows.length === 0) {
    await db.query(
      `INSERT INTO users (name, first_name, last_name, employee_id, email, password_hash, role, avatar_url, specialty, department, designation, intercom_number, date_of_birth, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        'Dr. Bharath',
        'Bharath',
        null,
        'EMP-001',
        'barath@gmail.com',
        passwordHash,
        'super_admin',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCOJVgByGPGQAOvoTcNGQV_NX_OMcIg3eU1cLQ2-Mj8k8dIjUoTX4t8hAn1ZLFAP-3YgTba0ky7z0LQ9BvsxS7EmBSACsHotr4mDK82M9UUAKdUJd6Ekf43be78zUYxNv8cH8NyZV7MvHbi4dBAVPh2uioqGLFT6av3FaqeybGP8hmIW_3R24NOv5UkC6vijgNoMzXXTKwXlqs2jKUgTHokMdOxv4CTLigSbZLChZ24Q61c0iQMy5VEiu4-MzYjoVjeEEFmCeZcQiE',
        'Chief Surgeon',
        'Cardiology',
        'Senior Surgeon',
        '101',
        '1990-01-15',
        '9876543210',
      ],
    );
  }

  // Manager
  const mgrExists = await db.query('SELECT 1 FROM users WHERE email = $1', ['manager@medilead.app']);
  if (mgrExists.rows.length === 0) {
    await db.query(
      `INSERT INTO users (name, first_name, last_name, employee_id, email, password_hash, role, designation, intercom_number, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'Manager User',
        'Manager',
        'User',
        'EMP-002',
        'manager@medilead.app',
        passwordHash,
        'manager',
        'Team Lead',
        '102',
        '9876543211',
      ],
    );
  }

  // Telecaller
  const tcExists = await db.query('SELECT 1 FROM users WHERE email = $1', ['telecaller@medilead.app']);
  if (tcExists.rows.length === 0) {
    await db.query(
      `INSERT INTO users (name, first_name, last_name, employee_id, email, password_hash, role, department, intercom_number, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'Telecaller Agent',
        'Telecaller',
        'Agent',
        'EMP-003',
        'telecaller@medilead.app',
        passwordHash,
        'telecaller',
        'Cardiology',
        '103',
        '9876543212',
      ],
    );
  }
  console.log('✓ Default users seeded');

  // User-Role mappings
  await db.query(`
    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id FROM users u, roles r
    WHERE u.role = r.name
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = u.id AND ur.role_id = r.id
      );
  `);
  console.log('✓ User-role mappings seeded');
};

// ──────────────────────────────────────────────
// Main orchestrator
// ──────────────────────────────────────────────
const migrateFull = async () => {
  const startTime = Date.now();
  console.log('═══════════════════════════════════════════════');
  console.log('  MediLead CMS — Full Migration & Seed');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // ── Phase 1: Schema Migrations ──
    console.log('── Phase 1: Schema Migrations ──\n');

    console.log('[1/9] Creating tables (safe — no DROP)...');
    await createTablesSafe();
    console.log('');

    console.log('[2/9] Migrating new fields...');
    await migrateNewFields();
    console.log('');

    console.log('[3/9] Creating pincodes table...');
    await createPincodesTable();
    console.log('');

    console.log('[4/9] Adding branch_id column...');
    await addBranchIdColumn();
    console.log('');

    console.log('[5/9] Adding recording_url column...');
    await addRecordingUrl();
    console.log('');

    console.log('[6/9] Fixing leads status CHECK constraint...');
    await migrateStatusConstraint();
    console.log('');

    console.log('[6b/9] Creating lead_status_history table...');
    await createLeadStatusHistory();
    console.log('');

    // ── Phase 2: Master Data Seeding ──
    console.log('── Phase 2: Master Data Seeding ──\n');

    console.log('[7/9] Seeding departments (incremental)...');
    await seedDepartments();
    console.log('');

    console.log('[8/9] Seeding branches & branch-department mappings...');
    await seedBranches();
    console.log('');

    console.log('Seeding lead sources...');
    await seedLeadSources();

    console.log('Seeding doctors...');
    await seedDoctors();

    console.log('Seeding priorities...');
    await seedPriorities();

    console.log('Seeding lead statuses...');
    await seedLeadStatuses();

    console.log('');

    // ── Phase 3: Pincodes & RBAC ──
    console.log('── Phase 3: Pincodes & RBAC ──\n');

    console.log('[9/9] Seeding pincodes (incremental from CSV)...');
    await seedPincodes();
    console.log('');

    console.log('Seeding RBAC (roles, permissions, users)...');
    await seedRBAC();
    console.log('');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('═══════════════════════════════════════════════');
    console.log(`  ✓ Full migration & seed complete (${duration}s)`);
    console.log('  All existing client data preserved.');
    console.log('═══════════════════════════════════════════════');
  } catch (err) {
    console.error('\n✗ Migration failed:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  migrateFull()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateFull;
