const db = require('../config/database');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    // Insert roles
    await db.query(`
      INSERT INTO roles (name, display_name, description, is_system) VALUES
      ('super_admin', 'Super Admin', 'Full system access.', true),
      ('manager', 'Manager', 'Manages leads and appointments.', true),
      ('telecaller', 'Telecaller', 'Handles calls and leads.', true)
      ON CONFLICT DO NOTHING
    `);

    // Insert permissions
    await db.query(`
      INSERT INTO permissions (name, display_name, description, module) VALUES
      ('leads:view_all', 'View All Leads', 'See all leads regardless of assignment', 'leads'),
      ('leads:view_assigned', 'View Assigned Leads', 'See only leads assigned to you', 'leads'),
      ('leads:create', 'Create Leads', 'Create new lead records', 'leads'),
      ('leads:update', 'Update Leads', 'Edit lead details and status', 'leads'),
      ('leads:delete', 'Delete Leads', 'Reject or delete lead records', 'leads'),
      ('leads:assign', 'Assign Leads', 'Assign leads to users', 'leads'),
      ('leads:view_providers', 'View Providers', 'Appear in provider dropdowns', 'leads'),
      ('appointments:view_all', 'View All Appointments', 'See all appointments', 'appointments'),
      ('appointments:view_own', 'View Own Appointments', 'See only your appointments', 'appointments'),
      ('appointments:create', 'Create Appointments', 'Book new appointments', 'appointments'),
      ('appointments:update', 'Update Appointments', 'Edit appointment details', 'appointments'),
      ('appointments:cancel', 'Cancel Appointments', 'Cancel scheduled appointments', 'appointments'),
      ('appointments:reschedule', 'Reschedule Appointments', 'Reschedule existing appointments', 'appointments'),
      ('calls:view_all', 'View All Calls', 'See all call logs', 'calls'),
      ('calls:create', 'Log Calls', 'Create new call log entries', 'calls'),
      ('calls:update', 'Update Calls', 'Update call status and notes', 'calls'),
      ('calls:receive_sip_events', 'Receive SIP Events', 'Get notified of incoming/outgoing calls', 'calls'),
      ('reports:view', 'View Reports', 'Access reports and analytics', 'reports'),
      ('reports:export', 'Export Reports', 'Export reports to CSV', 'reports'),
      ('users:view', 'View Users', 'View the user list', 'users'),
      ('users:create', 'Create Users', 'Create new user accounts', 'users'),
      ('users:update', 'Update Users', 'Edit user details', 'users'),
      ('users:deactivate', 'Deactivate Users', 'Deactivate user accounts', 'users'),
      ('users:reset_password', 'Reset Passwords', 'Reset user passwords', 'users'),
      ('roles:view', 'View Roles', 'View roles and permissions', 'roles'),
      ('roles:create', 'Create Roles', 'Create custom roles', 'roles'),
      ('roles:update', 'Update Roles', 'Edit role permissions', 'roles'),
      ('roles:delete', 'Delete Roles', 'Delete custom roles', 'roles'),
      ('dashboard:view', 'View Dashboard', 'Access the main dashboard', 'dashboard'),
      ('notifications:manage', 'Manage Notifications', 'Receive and manage notifications', 'notifications'),
      ('settings:manage', 'Manage Settings', 'Toggle maintenance mode and manage app settings', 'settings')
      ON CONFLICT DO NOTHING
    `);

    // Insert admin user
    const passwordHash = await bcrypt.hash('password123', 10);
    await db.query(
      `INSERT INTO users (name, email, password_hash, role, specialty, department, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [
        'Dr. Bharath',
        'barath@gmail.com',
        passwordHash,
        'super_admin',
        'Chief Surgeon',
        'Cardiology',
        '9876543210',
      ],
    );

    // Role-permission mappings
    await db.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin'
      ON CONFLICT DO NOTHING
    `);
    await db.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'manager' AND p.name IN (
        'leads:view_all','leads:create','leads:update','leads:delete','leads:assign','leads:view_providers',
        'appointments:view_all','appointments:create','appointments:update','appointments:cancel','appointments:reschedule',
        'calls:view_all','calls:create','calls:update','calls:receive_sip_events',
        'reports:view','reports:export','users:view','dashboard:view','notifications:manage'
      ) ON CONFLICT DO NOTHING
    `);
    await db.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'telecaller' AND p.name IN (
        'leads:view_assigned','leads:create','leads:update','leads:view_providers',
        'appointments:view_own','appointments:create','appointments:update','appointments:cancel','appointments:reschedule',
        'calls:view_all','calls:create','calls:update',
        'reports:view','reports:export','dashboard:view','notifications:manage'
      ) ON CONFLICT DO NOTHING
    `);

    // User-role mappings
    await db.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.id, r.id FROM users u, roles r WHERE u.role = r.name
      ON CONFLICT DO NOTHING
    `);

    console.log('Users, roles, permissions seeded successfully');
  } catch (err) {
    console.error('Seeding failed:', err);
    throw err;
  }
};

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seed;
