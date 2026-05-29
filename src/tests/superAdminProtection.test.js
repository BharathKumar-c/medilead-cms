import { describe, it, expect } from 'vitest';

/**
 * Pure-function re-implementation of the super admin protection logic
 * extracted from UserFormPanel in UserManagement.jsx.
 *
 * The original code computes:
 *
 *   const isEditingSelf = user && currentUser && user.id === currentUser.id;
 *   const superAdmins = (users || []).filter(u => {
 *     const roles = u.roles || [];
 *     return (roles.some(r => r.name === 'super_admin') || u.role === 'super_admin') && u.is_active !== false;
 *   });
 *   const isLastSuperAdmin = isEditingSelf && superAdmins.length <= 1;
 *
 * We test the logic by reimplementing exactly those lines here.
 */

// ── Helper that mirrors the exact logic from UserFormPanel ──
function computeIsLastSuperAdmin({ currentUser, editUser, users }) {
  // Coerce to boolean to match how React treats falsy values in JSX
  const isEditingSelf = Boolean(editUser && currentUser && editUser.id === currentUser.id);
  const superAdmins = (users || []).filter(u => {
    const roles = u.roles || [];
    return (roles.some(r => r.name === 'super_admin') || u.role === 'super_admin') && u.is_active !== false;
  });
  return isEditingSelf && superAdmins.length <= 1;
}

function makeUser(id, { role = 'telecaller', roles = [], is_active = true } = {}) {
  return { id, role, roles, is_active };
}

const currentUser = makeUser(1, { role: 'super_admin', roles: [{ name: 'super_admin' }] });

describe('Super admin role protection logic', () => {
  /* ── Not editing self ──────────────────────────────────── */
  it('returns false when user is not editing their own profile', () => {
    const result = computeIsLastSuperAdmin({
      currentUser,
      editUser: makeUser(2),
      users: [currentUser],
    });
    expect(result).toBe(false);
  });

  /* ── Editing self, multiple super admins exist ──────────── */
  it('returns false when editing self but other super admins exist', () => {
    const otherSuperAdmin = makeUser(2, {
      role: 'super_admin',
      roles: [{ name: 'super_admin' }],
    });
    const result = computeIsLastSuperAdmin({
      currentUser,
      editUser: currentUser,
      users: [currentUser, otherSuperAdmin],
    });
    expect(result).toBe(false);
  });

  /* ── Editing self, last super admin ─────────────────────── */
  it('returns true when editing self and only remaining super admin', () => {
    const result = computeIsLastSuperAdmin({
      currentUser,
      editUser: currentUser,
      users: [currentUser, makeUser(2)],
    });
    expect(result).toBe(true);
  });

  it('returns true when editing self and there are no other active super admins', () => {
    const inactiveSuperAdmin = makeUser(2, {
      role: 'super_admin',
      roles: [{ name: 'super_admin' }],
      is_active: false,
    });
    const result = computeIsLastSuperAdmin({
      currentUser,
      editUser: currentUser,
      users: [currentUser, inactiveSuperAdmin],
    });
    expect(result).toBe(true);
  });

  /* ── Empty / edge cases ─────────────────────────────────── */
  it('returns false when currentUser is null', () => {
    const result = computeIsLastSuperAdmin({
      currentUser: null,
      editUser: makeUser(1, { role: 'super_admin' }),
      users: [],
    });
    expect(result).toBe(false);
  });

  it('returns false when editUser is null (creating new user, not editing)', () => {
    const result = computeIsLastSuperAdmin({
      currentUser,
      editUser: null,
      users: [currentUser],
    });
    expect(result).toBe(false);
  });

  it('returns true when users list is empty (0 super admins <= 1 triggers protection)', () => {
    // Even though the users list is empty (which doesn't happen in practice
    // because the current user is always in the list), the logic treats
    // 0 active super admins as the last remaining, triggering protection.
    const result = computeIsLastSuperAdmin({
      currentUser,
      editUser: currentUser,
      users: [],
    });
    expect(result).toBe(true);
  });

  /* ── Role detection via roles array vs legacy role field ─── */
  it('detects super_admin via legacy role field (roles array empty)', () => {
    const userWithLegacyRole = makeUser(1, { role: 'super_admin', roles: [] });
    const result = computeIsLastSuperAdmin({
      currentUser: userWithLegacyRole,
      editUser: userWithLegacyRole,
      users: [userWithLegacyRole],
    });
    expect(result).toBe(true);
  });

  it('detects super_admin via roles array', () => {
    const userWithRoleObj = makeUser(1, {
      role: 'manager',
      roles: [{ name: 'super_admin' }],
    });
    const result = computeIsLastSuperAdmin({
      currentUser: userWithRoleObj,
      editUser: userWithRoleObj,
      users: [userWithRoleObj],
    });
    expect(result).toBe(true);
  });

  it('ignores inactive users when counting super admins', () => {
    const inactiveSuper = makeUser(2, {
      role: 'super_admin',
      roles: [{ name: 'super_admin' }],
      is_active: false,
    });
    const activeSuper = makeUser(3, {
      role: 'super_admin',
      roles: [{ name: 'super_admin' }],
    });
    // currentUser (id=1) is editing self, inactive super doesn't count,
    // only activeSuper (id=3) counts → total 2 active super admins
    const result = computeIsLastSuperAdmin({
      currentUser,
      editUser: currentUser,
      users: [currentUser, inactiveSuper, activeSuper],
    });
    expect(result).toBe(false);
  });

  it('handles users with missing is_active field (defaults to active)', () => {
    const userWithNoIsActive = { id: 2, role: 'super_admin', roles: [] };
    const result = computeIsLastSuperAdmin({
      currentUser,
      editUser: currentUser,
      users: [currentUser, userWithNoIsActive],
    });
    // userWithNoIsActive has is_active undefined; `undefined !== false` is true, so counts as active
    expect(result).toBe(false);
  });

  /* ── Multiple super admins, one inactive ────────────────── */
  it('correctly counts active super admins when some are inactive', () => {
    const inactiveAdmin = makeUser(2, {
      role: 'super_admin',
      roles: [{ name: 'super_admin' }],
      is_active: false,
    });
    const activeAdmin = makeUser(3, {
      role: 'super_admin',
      roles: [{ name: 'super_admin' }],
    });
    // currentUser (id=1) is editing self. Only 2 active super admins: currentUser + activeAdmin
    const result = computeIsLastSuperAdmin({
      currentUser,
      editUser: currentUser,
      users: [currentUser, inactiveAdmin, activeAdmin],
    });
    expect(result).toBe(false);
  });

  /* ── User objects with no roles prop ─────────────────────── */
  it('handles users with no roles property at all', () => {
    const userWithoutRoles = { id: 2, role: 'manager', is_active: true };
    // Current user is the only super admin
    const result = computeIsLastSuperAdmin({
      currentUser,
      editUser: currentUser,
      users: [currentUser, userWithoutRoles],
    });
    expect(result).toBe(true);
  });
});
