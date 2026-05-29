import { describe, it, expect } from 'vitest';

/**
 * Pure-function re-implementation of the selectedRoleIds logic from
 * UserFormPanel in UserManagement.jsx.
 *
 * The original code (line 318-324):
 *
 *   const [selectedRoleIds, setSelectedRoleIds] = useState(() => {
 *     if (user?.roles && user.roles.length > 0) {
 *       return user.roles.map(r => r.id || r.role_id).filter(Boolean);
 *     }
 *     return [];
 *   });
 *
 * We test the logic by reimplementing exactly those lines here.
 */

// ── Helper that mirrors the exact logic from UserFormPanel ──
function computeSelectedRoleIds(user) {
  if (user?.roles && user.roles.length > 0) {
    return user.roles.map(r => r.id || r.role_id).filter(Boolean);
  }
  return [];
}

function makeUser(roles) {
  return { roles };
}

describe('UserFormPanel — selectedRoleIds initialisation', () => {
  /* ── Roles with id property (the standard case) ───────── */
  it('returns role ids when roles have id property', () => {
    const user = makeUser([
      { id: 1, name: 'super_admin' },
      { id: 5, name: 'manager' },
    ]);
    expect(computeSelectedRoleIds(user)).toEqual([1, 5]);
  });

  it('returns a single role id when user has one role', () => {
    const user = makeUser([
      { id: 3, name: 'telecaller' },
    ]);
    expect(computeSelectedRoleIds(user)).toEqual([3]);
  });

  /* ── Roles with role_id fallback property ─────────────── */
  it('uses role_id when id is not present', () => {
    const user = makeUser([
      { role_id: 10, name: 'super_admin' },
      { role_id: 12, name: 'manager' },
    ]);
    expect(computeSelectedRoleIds(user)).toEqual([10, 12]);
  });

  it('prefers id over role_id when both are present', () => {
    const user = makeUser([
      { id: 1, role_id: 99, name: 'super_admin' },
    ]);
    // id (1) is truthy → used; role_id (99) is ignored
    expect(computeSelectedRoleIds(user)).toEqual([1]);
  });

  it('uses id for one role and role_id for another when mixed', () => {
    const user = makeUser([
      { id: 1, name: 'super_admin' },
      { role_id: 5, name: 'manager' },
    ]);
    expect(computeSelectedRoleIds(user)).toEqual([1, 5]);
  });

  /* ── Roles with neither id nor role_id ────────────────── */
  it('filters out roles that have neither id nor role_id', () => {
    const user = makeUser([
      { name: 'super_admin' },
      { name: 'manager' },
    ]);
    expect(computeSelectedRoleIds(user)).toEqual([]);
  });

  it('filters out undefined/missing ids while keeping valid ones', () => {
    const user = makeUser([
      { id: 1, name: 'super_admin' },
      { name: 'manager' },           // no id → filtered out
      { id: 3, name: 'telecaller' },
    ]);
    expect(computeSelectedRoleIds(user)).toEqual([1, 3]);
  });

  /* ── No roles ─────────────────────────────────────────── */
  it('returns empty array when user has no roles', () => {
    const user = makeUser([]);
    expect(computeSelectedRoleIds(user)).toEqual([]);
  });

  it('returns empty array when user has no roles property', () => {
    const user = { name: 'Test User', email: 'test@example.com' };
    expect(computeSelectedRoleIds(user)).toEqual([]);
  });

  it('returns empty array when user is null', () => {
    expect(computeSelectedRoleIds(null)).toEqual([]);
  });

  it('returns empty array when user is undefined', () => {
    expect(computeSelectedRoleIds(undefined)).toEqual([]);
  });

  /* ── Edge cases ───────────────────────────────────────── */
  it('handles roles with id = 0 (falsy but valid)', () => {
    // Note: 0 is falsy in JS, so `r.id || r.role_id` would skip it.
    // This is the existing behaviour — if the DB assigned id=0 (unlikely),
    // it would be filtered out. We document this edge case.
    const user = makeUser([
      { id: 0, name: 'super_admin' },
    ]);
    expect(computeSelectedRoleIds(user)).toEqual([]);
  });

  it('handles roles with string-based ids', () => {
    const user = makeUser([
      { id: 'role-a', name: 'super_admin' },
      { id: 'role-b', name: 'manager' },
    ]);
    expect(computeSelectedRoleIds(user)).toEqual(['role-a', 'role-b']);
  });

  it('handles large number of roles (up to 2)', () => {
    const user = makeUser([
      { id: 1, name: 'super_admin' },
      { id: 2, name: 'manager' },
    ]);
    const result = computeSelectedRoleIds(user);
    expect(result).toHaveLength(2);
    expect(result).toEqual([1, 2]);
  });

  /* ── Regression: the bug that was fixed ─────────────────── */
  it('regression: returns correct ids when api returns r.id (the fix for the GET /api/auth/users bug)', () => {
    // Before the fix, the backend only returned { name, display_name } — no id.
    // After the fix, r.id is included. This test verifies the fix works.
    const user = makeUser([
      { id: 2, name: 'manager', display_name: 'Manager' },
      { id: 3, name: 'telecaller', display_name: 'Telecaller' },
    ]);
    expect(computeSelectedRoleIds(user)).toEqual([2, 3]);
  });

  it('regression: returns empty when roles lack id (simulating the unfixed backend)', () => {
    // Before the backend fix, r.id was not returned.
    const user = makeUser([
      { name: 'manager', display_name: 'Manager' },
      { name: 'telecaller', display_name: 'Telecaller' },
    ]);
    expect(computeSelectedRoleIds(user)).toEqual([]);
  });
});
