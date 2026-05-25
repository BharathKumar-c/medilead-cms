const db = require('./database');
require('dotenv').config();

const createTables = async () => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Enable pgcrypto for gen_random_uuid()
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // Drop existing tables in order (respect foreign keys)
    await client.query(`
      DROP TABLE IF EXISTS department_performance CASCADE;
      DROP TABLE IF EXISTS telephony_call_logs CASCADE;
      DROP TABLE IF EXISTS call_metrics CASCADE;
      DROP TABLE IF EXISTS activity_log CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS call_logs CASCADE;
      DROP TABLE IF EXISTS lead_status_history CASCADE;
      DROP TABLE IF EXISTS lead_history CASCADE;
      DROP TABLE IF EXISTS lead_uhids CASCADE;
      DROP TABLE IF EXISTS appointments CASCADE;
      DROP TABLE IF EXISTS leads CASCADE;
      DROP TABLE IF EXISTS branch_departments CASCADE;
      DROP TABLE IF EXISTS master_branches CASCADE;
      DROP TABLE IF EXISTS master_lead_source CASCADE;
      DROP TABLE IF EXISTS master_department CASCADE;
      DROP TABLE IF EXISTS master_priority CASCADE;
      DROP TABLE IF EXISTS master_lead_status CASCADE;
      DROP TABLE IF EXISTS master_doctors CASCADE;
      DROP TABLE IF EXISTS user_roles CASCADE;
      DROP TABLE IF EXISTS role_permissions CASCADE;
      DROP TABLE IF EXISTS permissions CASCADE;
      DROP TABLE IF EXISTS roles CASCADE;
      DROP TABLE IF EXISTS report_exports CASCADE;
      DROP TABLE IF EXISTS system_settings CASCADE;
      DROP TABLE IF EXISTS password_reset_tokens CASCADE;
      DROP TABLE IF EXISTS master_pincodes CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Users table
    await client.query(`
      CREATE TABLE users (
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

    // Roles table (RBAC)
    await client.query(`
      CREATE TABLE roles (
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

    // Permissions table (RBAC)
    await client.query(`
      CREATE TABLE permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(150) NOT NULL,
        description TEXT,
        module VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Role-Permissions junction table
    await client.query(`
      CREATE TABLE role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, permission_id)
      );
    `);

    // User-Roles junction table (max 2 roles per user enforced in application)
    await client.query(`
      CREATE TABLE user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id)
      );
    `);

    // Lead Sources master table
    await client.query(`
      CREATE TABLE master_lead_source (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // Departments master table
    await client.query(`
      CREATE TABLE master_department (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // Branches master table
    await client.query(`
      CREATE TABLE master_branches (
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

    // Branch-Departments junction table
    await client.query(`
      CREATE TABLE branch_departments (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES master_branches(id) ON DELETE CASCADE,
        department_id INTEGER NOT NULL REFERENCES master_department(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(branch_id, department_id)
      );
    `);

    // Priorities master table
    await client.query(`
      CREATE TABLE master_priority (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    // Lead Statuses master table
    await client.query(`
      CREATE TABLE master_lead_status (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    // Doctors master table
    await client.query(`
      CREATE TABLE master_doctors (
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

    // Pincodes master table
    await client.query(`
      CREATE TABLE master_pincodes (
        id SERIAL PRIMARY KEY,
        pincode VARCHAR(10) NOT NULL,
        area VARCHAR(200) NOT NULL,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (pincode, area)
      );
    `);

    // Leads table
    await client.query(`
      CREATE TABLE leads (
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
        status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Interested', 'Follow-up', 'Closed', 'Rejected', 'Complaint Enquiry', 'Location Enquiry', 'Medical Certificate', 'Dial a Doctor', 'Appointment Cancel', 'Ambulance Service Enquiry', 'Biomedical', 'IT', 'CGHS and Ex-Service Scheme', 'CM Scheme & PM Scheme', 'Admission and Room Details Enquiry', 'Purchase', 'Lab & Diagnostic', 'Accounts', 'Medical Record Documents', 'Blood Bank', 'ER', 'Marketing', 'Job Vacancy', 'Pharmacy', 'Billing & Payment', 'Insurance', 'Doctors Enquiry', 'MHC Package', 'Dialysis Enquiry', 'Scan & X-Ray', 'Internship', 'Appointment Booked')),
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

    // Lead UHIDs junction table (multiple UHIDs per lead)
    await client.query(`
      CREATE TABLE lead_uhids (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        uhid VARCHAR(50) NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lead_id, uhid)
      );
    `);

    // Lead Status History table (tracks status transitions for metrics)
    await client.query(`
      CREATE TABLE lead_status_history (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        changed_by INTEGER REFERENCES users(id),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Lead History table (audit trail)
    await client.query(`
      CREATE TABLE lead_history (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Call Logs table (SIP integration)
    await client.query(`
      CREATE TABLE call_logs (
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

    // Telephony Vendor Call Logs table (external webhook)
    await client.query(`
      CREATE TABLE telephony_call_logs (
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
      CREATE TABLE appointments (
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
      CREATE TABLE notifications (
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
      CREATE TABLE activity_log (
        id SERIAL PRIMARY KEY,
        patient_name VARCHAR(255) NOT NULL,
        call_type VARCHAR(100),
        status VARCHAR(20) CHECK (status IN ('Answered', 'Missed')),
        duration VARCHAR(20),
        provider_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Call metrics table (for reports)
    await client.query(`
      CREATE TABLE call_metrics (
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
      CREATE TABLE department_performance (
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
      CREATE TABLE password_reset_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_master_pincodes_pincode ON master_pincodes(pincode);
      CREATE INDEX IF NOT EXISTS idx_master_pincodes_city ON master_pincodes(city);
      CREATE INDEX IF NOT EXISTS idx_master_pincodes_state ON master_pincodes(state);
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
      CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON leads(branch_id);
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
    `);

    // System settings table (key-value store for app-wide settings like maintenance mode)
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default system settings if not present
    await client.query(`
      INSERT INTO system_settings (key, value)
      SELECT * FROM (VALUES
        ('maintenance_mode', 'false'),
        ('maintenance_message', 'The application is currently undergoing maintenance. Please check back shortly.')
      ) AS v(key, value)
      WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = v.key);
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
      CREATE INDEX IF NOT EXISTS idx_report_exports_user ON report_exports(user_id);
      CREATE INDEX IF NOT EXISTS idx_report_exports_status ON report_exports(status);
    `);

    await client.query('COMMIT');
    console.log('All tables created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = createTables;
