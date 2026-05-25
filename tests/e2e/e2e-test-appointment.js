const BASE = 'http://localhost:5000/api';
let token = '';
let appointmentId = null;

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function test(name, ok, detail = '') {
  console.log((ok ? '  \u2705 PASS' : '  \u274c FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''));
  return ok;
}

(async () => {
  console.log('=== APPOINTMENT FORM E2E TESTS ===\n');

  // 1. Login
  const login = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'barath@gmail.com', password: 'password123' }),
  });
  token = login.data?.data?.token || '';
  test('Login', login.ok && !!token, 'Token obtained: ' + (token ? 'yes' : 'no'));

  // 2. Get departments
  const depts = await api('/masters/departments');
  const deptId = depts.data?.data?.departments?.[0]?.id || depts.data?.data?.departments?.[0]?.name;
  test('Get Departments', depts.ok, 'First dept: ' + (deptId || 'none'));

  // 3. Get doctors
  const docs = await api('/masters/doctors');
  const doctorId = docs.data?.data?.doctors?.[0]?.id;
  test('Get Doctors', docs.ok, 'First doctor ID: ' + (doctorId || 'none'));

  // 4. BOOK APPOINTMENT
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  const book = await api('/appointments', {
    method: 'POST',
    body: JSON.stringify({
      patient_name: 'E2E Test Appointment Patient',
      phone: '9876543211',
      email: 'appt_test@email.com',
      department: deptId || 'General Medicine',
      provider_id: doctorId || null,
      provider_name: '',
      appointment_date: dateStr,
      appointment_time: '10:00',
      visit_type: 'First consultation',
      consultation_mode: 'In-person',
      notes: 'E2E test appointment — auto-created',
    }),
  });
  appointmentId = book.data?.data?.appointment?.id || book.data?.data?.id || book.data?.appointment?.id;
  test('BOOK APPOINTMENT', book.ok && !!appointmentId, 'Appt ID: ' + appointmentId + ' | Status: ' + (book.data?.data?.appointment?.status || book.data?.appointment?.status || 'Scheduled'));
  if (!appointmentId) {
    console.log('\n  \u274c Cannot proceed without appointment ID. Response:', JSON.stringify(book.data).substring(0, 300));
    process.exit(1);
  }

  // 5. GET APPOINTMENT DETAILS
  const detail = await api('/appointments/' + appointmentId);
  const apt = detail.data?.data?.appointment || detail.data?.appointment || {};
  test('GET APPOINTMENT DETAILS', detail.ok, 'Patient: ' + (apt.patient_name || 'N/A') + ', Status: ' + (apt.status || 'N/A'));

  // 6. UPDATE APPOINTMENT (Confirm)
  const confirm = await api('/appointments/' + appointmentId, {
    method: 'PUT',
    body: JSON.stringify({ status: 'Confirmed' }),
  });
  test('CONFIRM APPOINTMENT', confirm.ok, 'Status set to Confirmed');

  // 7. RESCHEDULE APPOINTMENT
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const newDate = dayAfter.toISOString().split('T')[0];
  const reschedule = await api('/appointments/' + appointmentId + '/reschedule', {
    method: 'PUT',
    body: JSON.stringify({ appointment_date: newDate, appointment_time: '11:00' }),
  });
  test('RESCHEDULE APPOINTMENT', reschedule.ok, 'Rescheduled to ' + newDate + ' at 11:00');

  // 8. MARK NO SHOW
  const noShow = await api('/appointments/' + appointmentId + '/no-show', {
    method: 'PUT',
  });
  test('MARK NO SHOW', noShow.ok);

  // 9. CANCEL APPOINTMENT
  const cancel = await api('/appointments/' + appointmentId + '/cancel', {
    method: 'PUT',
    body: JSON.stringify({ reason: 'E2E test cancellation' }),
  });
  test('CANCEL APPOINTMENT', cancel.ok, 'Reason: E2E test cancellation');

  // 10. GET TODAY OVERVIEW
  const overview = await api('/appointments/today');
  test('GET TODAY OVERVIEW', overview.ok, 'Data received: ' + (overview.data?.data?.todayOverview ? 'yes' : 'no'));

  // 11. GET CALENDAR DATA
  const now = new Date();
  const cal = await api('/appointments/calendar?year=' + now.getFullYear() + '&month=' + (now.getMonth() + 1));
  test('GET CALENDAR DATA', cal.ok);

  console.log('\n=== APPOINTMENT FORM TESTS COMPLETE ===\n');
  process.exit(0);
})().catch(e => {
  console.error('\n  \u274c TEST ERROR: ' + e.message);
  process.exit(1);
});
