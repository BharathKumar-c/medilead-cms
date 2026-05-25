const BASE = 'http://localhost:5000/api';
let token = '';
let leadId = null;

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
  console.log('=== LEAD FORM E2E TESTS ===\n');

  // 1. Login
  const login = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'barath@gmail.com', password: 'password123' }),
  });
  token = login.data?.data?.token || '';
  test('Login', login.ok && !!token, 'Token obtained: ' + (token ? 'yes' : 'no'));

  // 2. Get branches
  const branches = await api('/branches');
  const branchId = branches.data?.data?.branches?.[0]?.id;
  test('Get Branches', branches.ok, 'First branch ID: ' + (branchId || 'none'));

  // 3. Get lead sources
  const sources = await api('/leads/master-data');
  test('Get Lead Sources', sources.ok);

  // 4. Get users (for assignment)
  const users = await api('/auth/users');
  const agent = users.data?.data?.users?.find(u => u.role === 'telecaller' || u.role === 'agent');
  test('Get Users', users.ok, 'Found agent: ' + (agent?.name || 'none'));

  // 5. CREATE LEAD
  const create = await api('/leads', {
    method: 'POST',
    body: JSON.stringify({
      name: 'E2E Test Patient Alpha',
      phone: '9876543210',
      email: 'alpha@test.com',
      branch_id: branchId || null,
      lead_source: 'Phone',
      status: 'New',
      priority: 'Medium',
      pincode: '110001',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      address: '123 Test Street',
      clinical_remarks: 'E2E test lead created via API',
      gender: 'Male',
      dob: '1990-06-15',
    }),
  });
  leadId = create.data?.data?.lead?.id || create.data?.lead?.id;
  test('CREATE LEAD', create.ok && !!leadId, 'Lead ID: ' + leadId + ', Code: ' + (create.data?.data?.lead?.code || create.data?.lead?.code || 'N/A'));
  if (!leadId) {
    console.log('\n  \u274c Cannot proceed without lead ID. Response:', JSON.stringify(create.data).substring(0, 300));
    process.exit(1);
  }

  // 6. GET LEAD DETAILS
  const detail = await api('/leads/' + leadId);
  const leadName = detail.data?.data?.lead?.name || detail.data?.lead?.name || '';
  test('GET LEAD DETAILS', detail.ok && leadName.includes('E2E'), 'Name: ' + leadName);

  // 7. UPDATE LEAD
  const update = await api('/leads/' + leadId, {
    method: 'PUT',
    body: JSON.stringify({
      name: 'E2E Test Patient Alpha (Updated)',
      priority: 'High',
      clinical_remarks: 'Updated remarks via E2E test',
    }),
  });
  test('UPDATE LEAD', update.ok, 'Name updated with "(Updated)" suffix');

  // 8. ASSIGN LEAD
  if (agent) {
    const assign = await api('/leads/' + leadId + '/assign', {
      method: 'PUT',
      body: JSON.stringify({ assigned_to: agent.id }),
    });
    test('ASSIGN LEAD', assign.ok, 'Assigned to: ' + agent.name);
  } else {
    console.log('  \u23ed\ufe0f SKIP | Assign Lead | No agent found');
  }

  // 9. GET LEAD HISTORY
  const hist = await api('/leads/' + leadId + '/history');
  const histCount = hist.data?.data?.history?.length || 0;
  test('GET LEAD HISTORY', hist.ok && histCount > 0, 'History entries: ' + histCount);

  // 10. VERIFY UPDATE PERSISTED
  const recheck = await api('/leads/' + leadId);
  const updatedName = recheck.data?.data?.lead?.name || recheck.data?.lead?.name || '';
  const updatedPriority = recheck.data?.data?.lead?.priority || recheck.data?.lead?.priority || '';
  test('VERIFY UPDATE PERSISTED', updatedName.includes('Updated') && updatedPriority === 'High', 'Name: ' + updatedName + ', Priority: ' + updatedPriority);

  console.log('\n=== LEAD FORM TESTS COMPLETE ===\n');
  process.exit(0);
})().catch(e => {
  console.error('\n  \u274c TEST ERROR: ' + e.message);
  process.exit(1);
});
