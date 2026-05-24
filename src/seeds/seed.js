const db = require('../config/database');
const bcrypt = require('bcryptjs');
const createTables = require('../config/migrate');
require('dotenv').config();

const seed = async () => {
  // Refuse to run in production unless explicitly allowed
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_SEED !== 'true'
  ) {
    console.error(
      'Seeding is disabled in production. Set ALLOW_SEED=true to override.',
    );
    return;
  }

  let client;
  try {
    // Create tables first
    await createTables();
    console.log('Tables created, seeding data...');

    client = await db.getClient();
    await client.query('BEGIN');

    // Clear existing data
    await client.query('DELETE FROM department_performance');
    await client.query('DELETE FROM call_metrics');
    await client.query('DELETE FROM activity_log');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM appointments');
    await client.query('DELETE FROM leads');
    await client.query('DELETE FROM master_lead_source');
    await client.query('DELETE FROM master_department');
    await client.query('DELETE FROM master_priority');
    await client.query('DELETE FROM master_lead_status');
    await client.query('DELETE FROM master_doctors');
    await client.query('DELETE FROM users');

    // Reset sequences
    await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await client.query(
      'ALTER SEQUENCE master_lead_source_id_seq RESTART WITH 1',
    );
    await client.query(
      'ALTER SEQUENCE master_department_id_seq RESTART WITH 1',
    );
    await client.query('ALTER SEQUENCE master_priority_id_seq RESTART WITH 1');
    await client.query(
      'ALTER SEQUENCE master_lead_status_id_seq RESTART WITH 1',
    );
    await client.query('ALTER SEQUENCE master_doctors_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE leads_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE appointments_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE notifications_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE activity_log_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE call_metrics_id_seq RESTART WITH 1');
    await client.query(
      'ALTER SEQUENCE department_performance_id_seq RESTART WITH 1',
    );

    // Seed Lead Sources
    await client.query(`
      INSERT INTO master_lead_source (name) VALUES
      ('Referral'),
      ('Walk-in'),
      ('Online Portal'),
      ('Emergency Services'),
      ('Insurance Provider'),
      ('Website Referral'),
      ('In-Clinic Inquiry');
    `);

    // Seed Departments — full master list
    await client.query(`
      INSERT INTO master_department (name) VALUES
      ('OCCUPATIONAL THERAPIST'),
      ('SPEECH THERAPIST'),
      ('CONSULTATION ROOM'),
      ('Stores'),
      ('Pulmonology'),
      ('Psychology'),
      ('Projects'),
      ('Orthopaedics'),
      ('Operations'),
      ('Nutrition & Dietetics'),
      ('Nusing'),
      ('Nursing'),
      ('Nephrology'),
      ('Multi-Organ Transplant'),
      ('Medical Services'),
      ('Intensive Care Unit'),
      ('Information Technology'),
      ('Human Resources'),
      ('Finance & Accounts'),
      ('Emergency Medicine'),
      ('CTVS'),
      ('Critical Care Unit'),
      ('Casualty'),
      ('Cardiology'),
      ('Cardiac - Ananesthesia'),
      ('Aarogya Sri'),
      ('Anesthesia'),
      ('EMR'),
      ('GENERAL'),
      ('PHYSIOTHERAPY'),
      ('Admin Department'),
      ('ORAL MAXILLOFACIAL SURGEON'),
      ('CLOUD PHYSICIAN'),
      ('INTERNATIONAL PATIENT SERVICES'),
      ('HEPATOLOGISTS'),
      ('OPD'),
      ('PSYCHOLOGICAL TEST'),
      ('AYURVEDIC'),
      ('CLINICAL HAEMATOLOGY'),
      ('AYURVEDA'),
      ('CALL CENTRE'),
      ('PERFUSIONIST'),
      ('BLOOD BANK'),
      ('GENERAL PHYSICIAN'),
      ('CENTRE HEAD'),
      ('ENDOSCOPY SCAN'),
      ('PSYCHIATRIST'),
      ('PURCHASE'),
      ('ECG'),
      ('ECHO'),
      ('ICN'),
      ('CMT SECRETARY'),
      ('DISCHARGE SUMMARY'),
      ('MRD'),
      ('STORES DEPARTMENT'),
      ('IT ADMIN'),
      ('INTERNAL AUDIT'),
      ('IVF'),
      ('LABORATORY'),
      ('DIETICIAN'),
      ('OPERATION THEATRE'),
      ('CATH LAB'),
      ('NURSE'),
      ('NEUROLOGY'),
      ('CARDIO'),
      ('PROCESS LAB'),
      ('SICU'),
      ('NICU'),
      ('WARD'),
      ('TRANSPORT'),
      ('TRANSPLANT CMT'),
      ('SECURITY'),
      ('RADIOLOGY'),
      ('QUALITY'),
      ('PHYSIOTHERAPHY'),
      ('PHARMACY'),
      ('OT'),
      ('OP LAB'),
      ('MARKETING'),
      ('MAINTENANCE'),
      ('SUPPORT'),
      ('INSURANCE'),
      ('INFECTION CONTROL'),
      ('ICU'),
      ('HUMAN RESOURCE'),
      ('HOUSEKEEPING'),
      ('FRONT OFFICE'),
      ('ENDOSCOPY'),
      ('ACCOUNTS'),
      ('LIVE BIOTECH'),
      ('CALL CENTER'),
      ('CHAIRMAN OFFICE'),
      ('CEO OFFICE'),
      ('STORE'),
      ('ADMIN INV'),
      ('EMERGENCY'),
      ('DIALYSIS'),
      ('BIOMEDICAL'),
      ('CSSD'),
      ('BILLING'),
      ('ADMIN'),
      ('Support'),
      ('Front Desk');
    `);

    // Seed Doctors
    await client.query(`
      INSERT INTO master_doctors (name, department, specialty, qualification, phone, email) VALUES
      ('Dr. Rajesh Sharma', 'Cardiology', 'Interventional Cardiologist', 'MBBS, MD, DM Cardiology', '9876543201', 'rajesh.sharma@hospital.com'),
      ('Dr. Priya Mehta', 'Cardiology', 'Cardiac Surgeon', 'MBBS, MS, MCh Cardiothoracic', '9876543202', 'priya.mehta@hospital.com'),
      ('Dr. Anil Kumar', 'Neurology', 'Neurologist', 'MBBS, MD, DM Neurology', '9876543203', 'anil.kumar@hospital.com'),
      ('Dr. Sneha Patel', 'Neurology', 'Neuro-Surgeon', 'MBBS, MS, MCh Neurosurgery', '9876543204', 'sneha.patel@hospital.com'),
      ('Dr. Vikram Singh', 'Orthopedics', 'Orthopedic Surgeon', 'MBBS, MS Orthopedics', '9876543205', 'vikram.singh@hospital.com'),
      ('Dr. Neha Gupta', 'Orthopedics', 'Joint Replacement Specialist', 'MBBS, MS, Fellowship Joint Replacement', '9876543206', 'neha.gupta@hospital.com'),
      ('Dr. Suresh Reddy', 'Pediatrics', 'Pediatrician', 'MBBS, MD Pediatrics', '9876543207', 'suresh.reddy@hospital.com'),
      ('Dr. Kavita Joshi', 'Pediatrics', 'Neonatologist', 'MBBS, MD, DM Neonatology', '9876543208', 'kavita.joshi@hospital.com'),
      ('Dr. Amit Verma', 'Dermatology', 'Dermatologist', 'MBBS, MD Dermatology', '9876543209', 'amit.verma@hospital.com'),
      ('Dr. Pooja Nair', 'General Consultation', 'General Physician', 'MBBS, MD Internal Medicine', '9876543210', 'pooja.nair@hospital.com'),
      ('Dr. Mohan Das', 'General Consultation', 'General Practitioner', 'MBBS, DNB Family Medicine', '9876543211', 'mohan.das@hospital.com'),
      ('Dr. Ritu Agarwal', 'Emergency', 'Emergency Medicine', 'MBBS, MD Emergency Medicine', '9876543212', 'ritu.agarwal@hospital.com');
    `);

    // Seed Priorities
    await client.query(`
      INSERT INTO master_priority (name) VALUES
      ('High'),
      ('Medium'),
      ('Low');
    `);

    // Seed Lead Statuses
    await client.query(`
      INSERT INTO master_lead_status (name) VALUES
      ('New'),
      ('Contacted'),
      ('Interested'),
      ('Follow-up'),
      ('Appointment Booked'),
      ('Closed'),
      ('Rejected');
    `);

    // Seed Users — use SEED_ADMIN_PASSWORD env var or generate a random one
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'password123';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `
      INSERT INTO users (name, email, password_hash, role, avatar_url, specialty, department, phone) VALUES
      ('Dr. Bharath', 'barath@gmail.com', $1, 'super_admin', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOJVgByGPGQAOvoTcNGQV_NX_OMcIg3eU1cLQ2-Mj8k8dIjUoTX4t8hAn1ZLFAP-3YgTba0ky7z0LQ9BvsxS7EmBSACsHotr4mDK82M9UUAKdUJd6Ekf43be78zUYxNv8cH8NyZV7MvHbi4dBAVPh2uioqGLFT6av3FaqeybGP8hmIW_3R24NOv5UkC6vijgNoMzXXTKwXlqs2jKUgTHokMdOxv4CTLigSbZLChZ24Q61c0iQMy5VEiu4-MzYjoVjeEEFmCeZcQiE', 'Chief Surgeon', 'Cardiology', '9876543210'),
      ('Dr. Alan Turing', 'alan.turing@medway.health', $1, 'manager', NULL, 'Neurologist', 'Neurology', '9876543211'),
      ('Priya Sharma', 'priya.sharma@medway.health', $1, 'telecaller', NULL, NULL, 'General Consultation', '9876543212');
    `,
      [passwordHash],
    );

    // Seed Leads
    await client.query(`
      INSERT INTO leads (name, initials, uhid, phone, alternate_contact, email, dob, address, pincode, city, state, country, status, lead_source, priority, assigned_to, clinical_remarks, last_call_date) VALUES
      ('James Anderson', 'JA', 'UHID-98231', '+91 98765 43210', '+91 98765 43211', 'james.anderson@email.com', '1992-05-15', '245 MG Road, Connaught Place', '110001', 'New Delhi', 'Delhi', 'India', 'New', 'Website Referral', 'High', 1, 'Patient inquired about orthopedic consultation. Referred by primary care physician.', '2024-10-24 09:15:00'),
      ('Sarah Mitchell', 'SM', 'UHID-11405', '+91 98765 43212', NULL, 'sarah.m@email.com', '1988-08-22', '890 Brigade Road, MG Road', '560001', 'Bangalore', 'Karnataka', 'India', 'Follow-up', 'In-Clinic Inquiry', 'Medium', 2, 'Follow-up for post-surgical recovery. Patient reported improved mobility.', '2024-10-23 14:30:00'),
      ('Robert Lewis', 'RL', 'UHID-44029', '+91 98765 43213', '+91 98765 43214', 'r.lewis@email.com', '1975-12-10', '1200 Anna Salai, T Nagar', '600001', 'Chennai', 'Tamil Nadu', 'India', 'Closed', 'Insurance Provider', 'Low', 3, 'Case closed. Patient successfully referred to cardiology.', '2024-10-20 11:00:00'),
      ('Emily Knight', 'EK', 'UHID-00512', '+91 98765 43215', NULL, 'emily.knight@email.com', '1995-03-28', '55 Park Street, Camac Street', '700001', 'Kolkata', 'West Bengal', 'India', 'New', 'Emergency Dept', 'High', 1, 'Emergency visit follow-up. Requires MRI scheduling.', '2024-10-24 08:45:00'),
      ('David Vance', 'DV', 'UHID-22941', '+91 98765 43216', '+91 98765 43217', 'd.vance@email.com', '1980-07-19', '321 MG Road, Fort', '400001', 'Mumbai', 'Maharashtra', 'India', 'Follow-up', 'Website Referral', 'Medium', 2, 'Second follow-up for dermatology referral.', '2024-10-22 15:20:00'),
      ('Maria Garcia', 'MG', 'UHID-77312', '+91 98765 43218', NULL, 'maria.garcia@email.com', '1990-11-03', '456 Banjara Hills, Road No. 12', '500001', 'Hyderabad', 'Telangana', 'India', 'New', 'Referral', 'Medium', 3, 'New referral for pediatric consultation.', '2024-10-24 10:00:00'),
      ('Thomas Wright', 'TW', 'UHID-55890', '+91 98765 43219', '+91 98765 43220', 't.wright@email.com', '1968-02-14', '789 SG Highway, Navrangpura', '380001', 'Ahmedabad', 'Gujarat', 'India', 'Follow-up', 'Walk-in', 'High', 1, 'Walk-in patient requesting follow-up on blood work.', '2024-10-21 13:45:00'),
      ('Linda Chen', 'LC', 'UHID-33201', '+91 98765 43221', NULL, 'linda.chen@email.com', '1983-09-07', '12 FC Road, Deccan Gymkhana', '411001', 'Pune', 'Maharashtra', 'India', 'New', 'Online Portal', 'Low', 2, 'Online registration for annual physical.', '2024-10-23 16:10:00'),
      ('Michael Brown', 'MB', 'UHID-66140', '+91 98765 43222', '+91 98765 43223', 'm.brown@email.com', '1971-06-30', '560 MI Road, Bapu Nagar', '302001', 'Jaipur', 'Rajasthan', 'India', 'Closed', 'Insurance Provider', 'Low', 3, 'Referral completed. Patient connected with orthopedic specialist.', '2024-10-19 09:30:00'),
      ('Patricia Davis', 'PD', 'UHID-88423', '+91 98765 43224', NULL, 'p.davis@email.com', '1959-01-25', '999 Hazratganj, Mahatma Gandhi Marg', '226001', 'Lucknow', 'Uttar Pradesh', 'India', 'New', 'Emergency Dept', 'High', 1, 'Post-ER follow-up required. Needs 48-hour check-in call.', '2024-10-24 07:30:00'),
      ('Kevin Martinez', 'KM', 'UHID-11908', '+91 98765 43225', '+91 98765 43226', 'k.martinez@email.com', '1987-04-12', '200 MG Road, Camp', '411001', 'Pune', 'Maharashtra', 'India', 'Follow-up', 'Website Referral', 'Medium', 2, 'Follow-up on physical therapy referral.', '2024-10-22 11:15:00'),
      ('Angela White', 'AW', 'UHID-44567', '+91 98765 43227', NULL, 'a.white@email.com', '1994-10-08', '350 Park Street, Ballygunge', '700001', 'Kolkata', 'West Bengal', 'India', 'Closed', 'In-Clinic Inquiry', 'Low', 3, 'Patient inquiry resolved. No further follow-up needed.', '2024-10-20 14:00:00'),
      ('Brian Taylor', 'BT', 'UHID-22034', '+91 98765 43228', '+91 98765 43229', 'b.taylor@email.com', '1976-08-17', '88 CG Road, Paldi', '380001', 'Ahmedabad', 'Gujarat', 'India', 'New', 'Referral', 'High', 1, 'New patient referral from dental clinic. Urgent scheduling.', '2024-10-24 11:30:00'),
      ('Nancy Lee', 'NL', 'UHID-99012', '+91 98765 43230', NULL, 'n.lee@email.com', '1965-12-01', '410 Anna Nagar, 2nd Avenue', '600001', 'Chennai', 'Tamil Nadu', 'India', 'Follow-up', 'Online Portal', 'Medium', 2, 'Follow-up for allergy testing results.', '2024-10-21 10:45:00'),
      ('George Harris', 'GH', 'UHID-67890', '+91 98765 43231', '+91 98765 43232', 'g.harris@email.com', '1952-03-20', '725 MG Road, Shivajinagar', '411001', 'Pune', 'Maharashtra', 'India', 'Closed', 'Walk-in', 'Low', 3, 'Case closed. Annual wellness visit scheduled.', '2024-10-18 15:50:00');
    `);

    // Seed Appointments
    await client.query(`
      INSERT INTO appointments (patient_name, initials, phone, email, department, provider_id, provider_name, appointment_date, appointment_time, status, notes) VALUES
      ('James Wilson', 'JW', '+1 (555) 100-2001', 'james.wilson@email.com', 'Cardiology', 1, 'Dr. Bharath', '2024-10-24', '14:00', 'Scheduled', 'Post-operative follow-up. Bring latest ECG report.'),
      ('Sarah Parker', 'SP', '+1 (555) 100-2002', 'sarah.parker@email.com', 'General Consultation', 2, 'Dr. Alan Turing', '2024-10-24', '15:30', 'Completed', 'Annual wellness check-up completed.'),
      ('Elena Rodriguez', 'ER', '+1 (555) 100-2003', 'elena.rodriguez@email.com', 'Lab Results Review', 3, 'Dr. Maria Montessori', '2024-10-24', '16:00', 'Cancelled', 'Patient requested cancellation due to scheduling conflict.'),
      ('Michael Chen', 'MC', '+1 (555) 100-2004', 'michael.chen@email.com', 'Orthopedics', 1, 'Dr. Bharath', '2024-10-24', '17:00', 'Scheduled', 'Knee evaluation. Patient has prior MRI results.'),
      ('Robert Fox', 'RF', '+1 (555) 100-2005', 'robert.fox@email.com', 'Neurology', 2, 'Dr. Alan Turing', '2024-10-25', '10:00', 'Scheduled', 'Initial consultation for recurring headaches.'),
      ('Jane Cooper', 'JC', '+1 (555) 100-2006', 'jane.cooper@email.com', 'Pediatrics', 3, 'Dr. Maria Montessori', '2024-10-25', '09:15', 'Scheduled', 'Annual vaccination schedule review.'),
      ('Thomas Wright', 'TW', '+1 (555) 100-2007', 'thomas.wright@email.com', 'Cardiology', 1, 'Dr. Bharath', '2024-10-26', '11:00', 'Scheduled', 'Follow-up on cholesterol management.'),
      ('Linda Chen', 'LC', '+1 (555) 100-2008', 'linda.chen@email.com', 'General Consultation', 2, 'Dr. Alan Turing', '2024-10-26', '14:30', 'Scheduled', 'New patient registration and initial check-up.');
    `);

    // Seed Notifications
    await client.query(`
      INSERT INTO notifications (user_id, type, title, link, is_read) VALUES
      (1, 'urgent', 'Urgent: Missed call from Patricia Davis', '/lead-box', false),
      (1, 'info', 'New lead assigned: Brian Taylor', '/lead-box', false),
      (1, 'success', 'Appointment confirmed: James Wilson at 2:00 PM', '/appointments', false),
      (1, 'info', 'Lab results ready for Sarah Mitchell', '/lead-box', true),
      (1, 'warning', 'Overdue response: David Vance - 3 days pending', '/lead-box', true),
      (1, 'success', 'Report exported successfully', '/reports', true);
    `);

    // Seed Activity Log
    await client.query(`
      INSERT INTO activity_log (patient_name, call_type, status, duration, created_at) VALUES
      ('Julianne Moore', 'Inbound Inquiry', 'Answered', '04:22', '2024-10-24 10:45:00'),
      ('Samuel L. Jackson', 'Appointment Follow-up', 'Missed', '--:--', '2024-10-24 10:30:00'),
      ('Emily Blunt', 'General Support', 'Answered', '12:05', '2024-10-24 10:15:00'),
      ('James Anderson', 'New Referral', 'Answered', '06:48', '2024-10-24 10:02:00'),
      ('Sarah Mitchell', 'Lab Results Inquiry', 'Answered', '03:15', '2024-10-24 09:48:00'),
      ('David Vance', 'Insurance Verification', 'Missed', '--:--', '2024-10-24 09:30:00'),
      ('Maria Garcia', 'Pediatric Consult', 'Answered', '08:32', '2024-10-24 09:15:00'),
      ('Thomas Wright', 'Prescription Refill', 'Answered', '02:44', '2024-10-24 09:00:00');
    `);

    // Seed Call Metrics
    await client.query(`
      INSERT INTO call_metrics (metric_date, total_calls, unique_calls, missed_calls, unique_missed, answered_calls, unique_answered) VALUES
      ('2024-05-01', 980, 720, 38, 15, 942, 705),
      ('2024-06-01', 1050, 780, 42, 18, 1008, 762),
      ('2024-07-01', 890, 660, 35, 14, 855, 646),
      ('2024-08-01', 1120, 830, 45, 19, 1075, 811),
      ('2024-09-01', 1200, 890, 48, 20, 1152, 870),
      ('2024-10-01', 1284, 942, 42, 18, 1242, 924);
    `);

    // Seed Department Performance
    await client.query(`
      INSERT INTO department_performance (department, metric_date, calls, leads, appointments, satisfaction) VALUES
      ('Cardiology', '2024-10-01', 312, 78, 64, 94),
      ('General Medicine', '2024-10-01', 248, 62, 52, 91),
      ('Orthopedics', '2024-10-01', 198, 49, 38, 89),
      ('Neurology', '2024-10-01', 176, 44, 36, 93),
      ('Pediatrics', '2024-10-01', 164, 41, 32, 96),
      ('Emergency', '2024-10-01', 186, 38, 26, 87);
    `);

    await client.query('COMMIT');
    console.log('Seed data inserted successfully');
    client.release();
  } catch (err) {
    console.error('Seeding failed:', err);
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      client.release();
    }
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
