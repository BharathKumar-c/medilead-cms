const db = require('../config/database');
const bcrypt = require('bcryptjs');
const createTables = require('../config/migrate');
const seedPincodes = require('./seed-pincodes');
const seedDepartments = require('./seed-departments');
require('dotenv').config();

const seed = async () => {
  try {
    // Create tables first
    await createTables();
    console.log('Tables created, seeding data...');

    const client = await db.getClient();
    await client.query('BEGIN');

    // Clear existing data (in correct foreign-key order)
    await client.query('DELETE FROM department_performance');
    await client.query('DELETE FROM call_metrics');
    await client.query('DELETE FROM activity_log');
    await client.query('DELETE FROM call_logs');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM lead_history');
    await client.query('DELETE FROM lead_uhids');
    await client.query('DELETE FROM appointments');
    await client.query('DELETE FROM leads');
    await client.query('DELETE FROM branch_departments');
    await client.query('DELETE FROM master_pincodes');
    await client.query('DELETE FROM master_branches');
    await client.query('DELETE FROM master_lead_source');
    await client.query('DELETE FROM master_department');
    await client.query('DELETE FROM master_priority');
    await client.query('DELETE FROM master_lead_status');
    await client.query('DELETE FROM master_doctors');
    await client.query('DELETE FROM user_roles');
    await client.query('DELETE FROM role_permissions');
    await client.query('DELETE FROM permissions');
    await client.query('DELETE FROM roles');
    await client.query('DELETE FROM users');

    // Reset sequences
    await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE roles_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE permissions_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE role_permissions_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE user_roles_id_seq RESTART WITH 1');
    await client.query(
      'ALTER SEQUENCE master_lead_source_id_seq RESTART WITH 1',
    );
    await client.query(
      'ALTER SEQUENCE master_department_id_seq RESTART WITH 1',
    );
    await client.query('ALTER SEQUENCE master_branches_id_seq RESTART WITH 1');
    await client.query(
      'ALTER SEQUENCE branch_departments_id_seq RESTART WITH 1',
    );
    await client.query('ALTER SEQUENCE master_priority_id_seq RESTART WITH 1');
    await client.query(
      'ALTER SEQUENCE master_lead_status_id_seq RESTART WITH 1',
    );
    await client.query('ALTER SEQUENCE master_doctors_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE leads_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE lead_uhids_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE lead_history_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE appointments_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE call_logs_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE notifications_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE activity_log_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE call_metrics_id_seq RESTART WITH 1');
    await client.query(
      'ALTER SEQUENCE department_performance_id_seq RESTART WITH 1',
    );
    await client.query('ALTER SEQUENCE master_pincodes_id_seq RESTART WITH 1');

    // ──────────────────────────────────────────────
    // Seed Lead Sources
    // ──────────────────────────────────────────────
    await client.query(`
      INSERT INTO master_lead_source (name) VALUES
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
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('Lead sources seeded');

    // ──────────────────────────────────────────────
    // Seed Departments — delegate to dedicated seed module
    // ──────────────────────────────────────────────
    await seedDepartments(client);
    console.log('Departments seeded via seed-departments');

    // ──────────────────────────────────────────────
    // Seed Branches (13 real Medway branches)
    // ──────────────────────────────────────────────
    await client.query(`
      INSERT INTO master_branches (name, city, state, is_active) VALUES
      ('MEDWAY HOSPITAL - KODAMBAKKAM',                'Chennai',      'Tamil Nadu',      true),
      ('MEDWAY HEART INSTITUTE - KODAMBAKKAM',         'Chennai',      'Tamil Nadu',      true),
      ('MEDWAY INSTITUTE OF PULMONOLOGY - TRUSTPURAM', 'Chennai',      'Tamil Nadu',      true),
      ('INVENTORY TEST',                               'Chennai',      'Tamil Nadu',      true),
      ('MEDWAY HOSPITAL - MOGAPPAIR',                  'Chennai',      'Tamil Nadu',      true),
      ('MEDWAY BLOOD BANK - TRUSTPURAM',               'Chennai',      'Tamil Nadu',      true),
      ('MEDWAY JSP HOSPITAL - CHENGALPATTU',           'Chengalpattu', 'Tamil Nadu',      true),
      ('MEDWAY HOSPITAL - VILLUPURAM',                 'Villupuram',   'Tamil Nadu',      true),
      ('MEDWAY HOSPITAL - KUMBAKONAM',                 'Kumbakonam',   'Tamil Nadu',      true),
      ('MEDWAY SANJIVI HOSPITAL - KAKINADA',           'Kakinada',     'Andhra Pradesh',  true),
      ('MEDWAY HOSPITAL - ERODE',                      'Erode',        'Tamil Nadu',      true),
      ('MEDWAY CORPORATE OFFICE',                      'Chennai',      'Tamil Nadu',      true),
      ('MEDWAY MAIN LAB',                              'Chennai',      'Tamil Nadu',      true)
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('13 branches seeded');

    // ──────────────────────────────────────────────
    // Seed Branch-Departments (hospital branches only)
    // ──────────────────────────────────────────────
    await client.query(`
      INSERT INTO branch_departments (branch_id, department_id)
      SELECT b.id, d.id FROM master_branches b, master_department d
      WHERE b.name IN (
        'MEDWAY HOSPITAL - KODAMBAKKAM',
        'MEDWAY HEART INSTITUTE - KODAMBAKKAM',
        'MEDWAY INSTITUTE OF PULMONOLOGY - TRUSTPURAM',
        'MEDWAY HOSPITAL - MOGAPPAIR',
        'MEDWAY JSP HOSPITAL - CHENGALPATTU',
        'MEDWAY HOSPITAL - VILLUPURAM',
        'MEDWAY HOSPITAL - KUMBAKONAM',
        'MEDWAY SANJIVI HOSPITAL - KAKINADA',
        'MEDWAY HOSPITAL - ERODE'
      )
      ON CONFLICT DO NOTHING;
    `);
    console.log('Branch-department mappings added');

    // ──────────────────────────────────────────────
    // Seed Doctors
    // ──────────────────────────────────────────────
    await client.query(`
      INSERT INTO master_doctors (name, department, specialty, qualification, phone, email) VALUES
      ('Dr. Rajesh Sharma',  'Cardiology',          'Interventional Cardiologist',      'MBBS, MD, DM Cardiology',              '9876543201', 'rajesh.sharma@hospital.com'),
      ('Dr. Priya Mehta',    'Cardiology',          'Cardiac Surgeon',                  'MBBS, MS, MCh Cardiothoracic',         '9876543202', 'priya.mehta@hospital.com'),
      ('Dr. Anil Kumar',     'Neurology',           'Neurologist',                      'MBBS, MD, DM Neurology',              '9876543203', 'anil.kumar@hospital.com'),
      ('Dr. Sneha Patel',    'Neurology',           'Neuro-Surgeon',                    'MBBS, MS, MCh Neurosurgery',          '9876543204', 'sneha.patel@hospital.com'),
      ('Dr. Vikram Singh',   'Orthopedics',         'Orthopedic Surgeon',               'MBBS, MS Orthopedics',                '9876543205', 'vikram.singh@hospital.com'),
      ('Dr. Neha Gupta',     'Orthopedics',         'Joint Replacement Specialist',     'MBBS, MS, Fellowship Joint Replacement', '9876543206', 'neha.gupta@hospital.com'),
      ('Dr. Suresh Reddy',   'Pediatrics',          'Pediatrician',                     'MBBS, MD Pediatrics',                 '9876543207', 'suresh.reddy@hospital.com'),
      ('Dr. Kavita Joshi',   'Pediatrics',          'Neonatologist',                    'MBBS, MD, DM Neonatology',            '9876543208', 'kavita.joshi@hospital.com'),
      ('Dr. Amit Verma',     'Dermatology',         'Dermatologist',                    'MBBS, MD Dermatology',                '9876543209', 'amit.verma@hospital.com'),
      ('Dr. Pooja Nair',     'General Consultation','General Physician',                'MBBS, MD Internal Medicine',          '9876543210', 'pooja.nair@hospital.com'),
      ('Dr. Mohan Das',      'General Consultation','General Practitioner',             'MBBS, DNB Family Medicine',           '9876543211', 'mohan.das@hospital.com'),
      ('Dr. Ritu Agarwal',   'Emergency',           'Emergency Medicine',               'MBBS, MD Emergency Medicine',         '9876543212', 'ritu.agarwal@hospital.com')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('Doctors seeded');

    // ──────────────────────────────────────────────
    // Seed Priorities
    // ──────────────────────────────────────────────
    await client.query(`
      INSERT INTO master_priority (name) VALUES
      ('High'),
      ('Medium'),
      ('Low')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('Priorities seeded');

    // ──────────────────────────────────────────────
    // Seed Lead Statuses
    // ──────────────────────────────────────────────
    await client.query(`
      INSERT INTO master_lead_status (name) VALUES
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
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('Lead statuses seeded');

    // ──────────────────────────────────────────────
    // Seed Pincodes (from CSV)
    // ──────────────────────────────────────────────
    // We commit the master-table transaction first, then seed pincodes
    // (pincode seeding runs its own batch inserts)
    await client.query('COMMIT');
    client.release();

    await seedPincodes();

    // ──────────────────────────────────────────────
    // Seed Super Admin User
    // ──────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('password123', 10);
    await db.query(
      `INSERT INTO users (name, first_name, last_name, employee_id, email, password_hash, role, avatar_url, specialty, department, designation, intercom_number, date_of_birth, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (email) DO NOTHING`,
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

    // Seed a Manager user
    await db.query(
      `INSERT INTO users (name, first_name, last_name, employee_id, email, password_hash, role, designation, intercom_number, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO NOTHING`,
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

    // Seed a Telecaller user
    await db.query(
      `INSERT INTO users (name, first_name, last_name, employee_id, email, password_hash, role, department, intercom_number, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO NOTHING`,
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
    console.log('Users seeded');

    // ──────────────────────────────────────────────
    // Seed Roles (RBAC)
    // ──────────────────────────────────────────────
    await db.query(`
      INSERT INTO roles (name, display_name, description, is_system) VALUES
      ('super_admin', 'Super Admin', 'Full system access. Can manage users, roles, and all settings.', true),
      ('manager',     'Manager',     'Manages leads, appointments, and views reports. Can view all data.', true),
      ('telecaller',  'Telecaller',  'Handles calls, manages assigned leads and own appointments.', true)
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('Roles seeded');

    // ──────────────────────────────────────────────
    // Seed Permissions (RBAC)
    // ──────────────────────────────────────────────
    await db.query(`
      INSERT INTO permissions (name, display_name, description, module) VALUES
      -- Leads
      ('leads:view_all',       'View All Leads',       'See all leads regardless of assignment',                'leads'),
      ('leads:view_assigned',  'View Assigned Leads',  'See only leads assigned to you',                        'leads'),
      ('leads:create',         'Create Leads',         'Create new lead records',                               'leads'),
      ('leads:update',         'Update Leads',         'Edit lead details and status',                          'leads'),
      ('leads:delete',         'Delete Leads',         'Reject or delete lead records',                         'leads'),
      ('leads:assign',         'Assign Leads',         'Assign leads to users',                                 'leads'),
      ('leads:view_providers', 'View Providers',       'Appear in provider dropdowns',                          'leads'),
      -- Appointments
      ('appointments:view_all',   'View All Appointments',    'See all appointments',                         'appointments'),
      ('appointments:view_own',   'View Own Appointments',    'See only your appointments',                   'appointments'),
      ('appointments:create',     'Create Appointments',      'Book new appointments',                         'appointments'),
      ('appointments:update',     'Update Appointments',      'Edit appointment details',                      'appointments'),
      ('appointments:cancel',     'Cancel Appointments',      'Cancel scheduled appointments',                 'appointments'),
      ('appointments:reschedule', 'Reschedule Appointments',  'Reschedule existing appointments',              'appointments'),
      -- Calls
      ('calls:view_all',          'View All Calls',           'See all call logs',                             'calls'),
      ('calls:create',            'Log Calls',                'Create new call log entries',                    'calls'),
      ('calls:update',            'Update Calls',             'Update call status and notes',                   'calls'),
      ('calls:receive_sip_events','Receive SIP Events',       'Get notified of incoming/outgoing calls',        'calls'),
      -- Reports
      ('reports:view',   'View Reports',   'Access reports and analytics',  'reports'),
      ('reports:export', 'Export Reports', 'Export reports to CSV',          'reports'),
      -- Users
      ('users:view',          'View Users',          'View the user list',               'users'),
      ('users:create',        'Create Users',        'Create new user accounts',          'users'),
      ('users:update',        'Update Users',        'Edit user details',                'users'),
      ('users:deactivate',    'Deactivate Users',    'Deactivate user accounts',          'users'),
      ('users:reset_password','Reset Passwords',     'Reset user passwords',              'users'),
      -- Roles
      ('roles:view',   'View Roles',   'View roles and permissions',   'roles'),
      ('roles:create', 'Create Roles', 'Create custom roles',          'roles'),
      ('roles:update', 'Update Roles', 'Edit role permissions',        'roles'),
      ('roles:delete', 'Delete Roles', 'Delete custom roles',          'roles'),
      -- Dashboard
      ('dashboard:view', 'View Dashboard', 'Access the main dashboard', 'dashboard'),
      -- Notifications
      ('notifications:manage', 'Manage Notifications', 'Receive and manage notifications', 'notifications')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('Permissions seeded');

    // ──────────────────────────────────────────────
    // Seed Role-Permission Mappings
    // ──────────────────────────────────────────────
    // Super Admin gets ALL permissions
    await db.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin'
      ON CONFLICT DO NOTHING;
    `);

    // Manager permissions
    await db.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'manager' AND p.name IN (
        'leads:view_all', 'leads:create', 'leads:update', 'leads:delete', 'leads:assign', 'leads:view_providers',
        'appointments:view_all', 'appointments:create', 'appointments:update', 'appointments:cancel', 'appointments:reschedule',
        'calls:view_all', 'calls:create', 'calls:update', 'calls:receive_sip_events',
        'reports:view', 'reports:export',
        'users:view',
        'dashboard:view',
        'notifications:manage'
      )
      ON CONFLICT DO NOTHING;
    `);

    // Telecaller permissions
    await db.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'telecaller' AND p.name IN (
        'leads:view_assigned', 'leads:create', 'leads:update', 'leads:view_providers',
        'appointments:view_own', 'appointments:create', 'appointments:update', 'appointments:cancel', 'appointments:reschedule',
        'calls:view_all', 'calls:create', 'calls:update',
        'reports:view', 'reports:export',
        'dashboard:view',
        'notifications:manage'
      )
      ON CONFLICT DO NOTHING;
    `);
    console.log('Role-permission mappings seeded');

    // ──────────────────────────────────────────────
    // Seed User-Role Mappings
    // ──────────────────────────────────────────────
    await db.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.id, r.id FROM users u, roles r WHERE u.role = r.name
      ON CONFLICT DO NOTHING;
    `);
    console.log('User-role mappings seeded');

    console.log('\n✓ All seed data inserted successfully');
  } catch (err) {
    console.error('Seeding failed:', err);
    throw err;
  }
};

if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seed complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

module.exports = seed;
