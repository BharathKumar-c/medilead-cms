import { useState, useEffect } from 'react';
import {
  UserPlus, Edit, Trash2, X, Shield, Eye, EyeOff, Save, Search,
  AlertTriangle,
} from 'lucide-react';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import api from '../services/api';

let toastId = 0;

const roleLabels = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  telecaller: 'Telecaller',
};

const roleColors = {
  super_admin: 'bg-error/10 text-error border border-error/20',
  manager: 'bg-secondary/10 text-secondary border border-secondary/20',
  telecaller: 'bg-on-tertiary-container/10 text-on-tertiary-container border border-on-tertiary-container/20',
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.data.users);
    } catch (err) {
      addToast('error', 'Load Failed', 'Could not fetch users.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setEditUser(null);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setShowForm(true);
  };

  const handleDelete = async () => {
    try {
      await api.deactivateUser(deleteConfirm.id);
      setDeleteConfirm(null);
      addToast('success', 'User Deactivated', `${deleteConfirm.name} has been deactivated.`);
      loadUsers();
    } catch (err) {
      addToast('error', 'Deactivation Failed', err.message || 'Could not deactivate user.');
    }
  };

  return (
    <Layout title="User Management">
      <div className="p-4 sm:p-6 lg:p-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background">User Management</h1>
            <p className="font-body-md text-on-surface-variant mt-1">Manage system users and their roles</p>
          </div>
          <button onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input type="text" placeholder="Search by name, email, or role..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50" />
        </div>

        {/* Users Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">User</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Email</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Role</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody className="zebra-striping">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center font-body-md text-on-surface-variant">Loading users...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center font-body-md text-on-surface-variant">No users found.</td></tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-xs">
                          {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-body-md text-on-surface font-bold">{user.name}</p>
                          {user.specialty && <p className="font-caption text-on-surface-variant">{user.specialty}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? user.roles.map(role => (
                          <span key={role.name || role.id} className={`inline-block px-2.5 py-0.5 rounded-full font-caption font-bold text-xs ${roleColors[role.name] || 'bg-outline/10 text-on-surface-variant border border-outline-variant'}`}>
                            {role.display_name || roleLabels[role.name] || role.name}
                          </span>
                        )) : (
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-caption font-bold text-xs ${roleColors[user.role]}`}>
                            {roleLabels[user.role] || user.role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-3 py-1 rounded-full font-caption font-bold text-xs ${user.is_active ? 'bg-on-tertiary-container/10 text-on-tertiary-container' : 'bg-error/10 text-error'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(user)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Edit">
                          <Edit className="w-4 h-4 text-on-surface-variant" />
                        </button>
                        <button onClick={() => setResetPasswordUser(user)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Reset Password">
                          <Shield className="w-4 h-4 text-on-surface-variant" />
                        </button>
                        {user.is_active && (
                          <button onClick={() => setDeleteConfirm(user)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Deactivate">
                            <Trash2 className="w-4 h-4 text-on-surface-variant" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Form Panel */}
        {showForm && (
          <UserFormPanel
            user={editUser}
            onClose={() => { setShowForm(false); setEditUser(null); }}
            onSave={() => { setShowForm(false); setEditUser(null); loadUsers(); }}
            onError={(msg) => addToast('error', 'Error', msg)}
            onSuccess={(msg) => addToast('success', 'Success', msg)}
          />
        )}

        {/* Reset Password Modal */}
        {resetPasswordUser && (
          <ResetPasswordModal
            user={resetPasswordUser}
            onClose={() => setResetPasswordUser(null)}
            onSuccess={(msg) => { setResetPasswordUser(null); addToast('success', 'Password Reset', msg); }}
            onError={(msg) => addToast('error', 'Reset Failed', msg)}
          />
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-7 h-7 text-error" /></div>
              <h3 className="font-h3 text-on-surface mb-2">Deactivate User?</h3>
              <p className="font-body-md text-on-surface-variant mb-6">Are you sure you want to deactivate <strong>{deleteConfirm.name}</strong>? They will no longer be able to log in.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">Cancel</button>
                <button onClick={handleDelete} className="px-5 py-2.5 bg-error text-on-error rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">Deactivate</button>
              </div>
            </div>
          </div>
        )}

        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
    </Layout>
  );
};

// Password requirements config
const passwordRules = [
  { test: (v) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v) => /[a-z]/.test(v), label: 'One lowercase letter' },
  { test: (v) => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: (v) => /\d/.test(v), label: 'One number' },
];

// Reusable field wrapper with error highlighting
const FormField = ({ label, required, error, children }) => (
  <div>
    <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
      {label} {required && <span className="text-error">*</span>}
    </label>
    <div className={error ? 'ring-2 ring-error rounded-lg' : ''}>
      {children}
    </div>
    {error && <p className="mt-1.5 text-sm text-error flex items-center gap-1">{error}</p>}
  </div>
);

// User Form Panel (Create/Edit)
const UserFormPanel = ({ user, onClose, onSave, onError, onSuccess }) => {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'telecaller',
    specialty: user?.specialty || '',
    phone: user?.phone || '',
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState(() => {
    if (user?.roles && user.roles.length > 0) {
      return user.roles.map(r => r.id || r.role_id).filter(Boolean);
    }
    return [];
  });
  const [availableRoles, setAvailableRoles] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const passwordRef = { current: null };

  // Fetch available roles
  useEffect(() => {
    api.getRoles().then(res => {
      setAvailableRoles(res.data.roles);
    }).catch(() => {});
  }, []);

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear field error when user types
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const handleSave = async () => {
    // Client-side validation
    const errors = {};
    if (!form.name.trim()) errors.name = 'Full name is required.';
    if (!form.email.trim()) errors.email = 'Email is required.';
    if (!user && !form.password) errors.password = 'Password is required.';
    if (!user && form.password) {
      const failedRule = passwordRules.find(r => !r.test(form.password));
      if (failedRule) errors.password = failedRule.label;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      if (user) {
        await api.updateUser(user.id, {
          name: form.name,
          email: form.email,
          role: form.role,
          specialty: form.specialty || null,
          phone: form.phone || null,
          role_ids: selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
        });
        onSuccess(`${form.name} has been updated.`);
      } else {
        await api.createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          specialty: form.specialty || null,
          phone: form.phone || null,
          role_ids: selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
        });
        onSuccess(`${form.name} has been created.`);
      }
      onSave();
    } catch (err) {
      // Parse field-level errors from API validation
      if (err.errors && Array.isArray(err.errors)) {
        const apiErrors = {};
        for (const e of err.errors) {
          apiErrors[e.field] = e.message;
        }
        setFieldErrors(apiErrors);
        onError('Please fix the highlighted fields.');
      } else {
        onError(err.message || 'Failed to save user.');
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50 ${fieldErrors[field] ? 'border-error' : 'border-outline-variant'}`;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-surface shadow-2xl flex flex-col h-full animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="font-h2 text-on-surface">{user ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container transition-colors"><X className="w-5 h-5 text-on-surface-variant" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <FormField label="Full Name" required error={fieldErrors.name}>
            <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)}
              className={inputClass('name')} />
          </FormField>

          <FormField label="Email" required error={fieldErrors.email}>
            <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)}
              className={inputClass('email')} />
          </FormField>

          {!user && (
            <FormField label="Password" required error={fieldErrors.password}>
              <div className="relative">
                <input
                  ref={(el) => { passwordRef.current = el; }}
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  onFocus={() => setShowPasswordRules(true)}
                  onBlur={() => setTimeout(() => setShowPasswordRules(false), 200)}
                  placeholder="Min 8 characters"
                  className={`${inputClass('password')} pr-12`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface transition-colors">
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {/* Password requirements tooltip */}
              {showPasswordRules && (
                <div className="mt-2 p-3 bg-surface-container border border-outline-variant rounded-lg">
                  <p className="font-caption text-on-surface-variant mb-2">Password must contain:</p>
                  <ul className="space-y-1">
                    {passwordRules.map((rule, i) => {
                      const passed = rule.test(form.password);
                      return (
                        <li key={i} className={`flex items-center gap-2 text-sm ${passed ? 'text-on-tertiary-container' : 'text-on-surface-variant'}`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${passed ? 'bg-on-tertiary-container text-white' : 'bg-outline-variant text-on-surface-variant'}`}>
                            {passed ? '\u2713' : ''}
                          </span>
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </FormField>
          )}

          <FormField label="Roles" error={fieldErrors.role}>
            <div className="space-y-2">
              <p className="text-xs text-on-surface-variant">Select up to 2 roles for this user.</p>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-outline-variant rounded-lg p-3">
                {availableRoles.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">Loading roles...</p>
                ) : availableRoles.map(role => {
                  const isSelected = selectedRoleIds.includes(role.id);
                  const isDisabled = !isSelected && selectedRoleIds.length >= 2;
                  return (
                    <label
                      key={role.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={() => {
                          setSelectedRoleIds(prev => {
                            if (prev.includes(role.id)) return prev.filter(id => id !== role.id);
                            if (prev.length >= 2) return prev;
                            return [...prev, role.id];
                          });
                          // Also update legacy role field with first selected role
                          if (!isSelected) {
                            setField('role', role.name);
                          }
                        }}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20"
                      />
                      <div>
                        <p className="text-sm font-medium text-on-surface">{role.display_name}</p>
                        <p className="text-xs text-on-surface-variant font-mono">{role.name}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </FormField>

          <FormField label="Specialty" error={fieldErrors.specialty}>
            <input type="text" value={form.specialty} onChange={(e) => setField('specialty', e.target.value)}
              placeholder="e.g. Cardiology"
              className={inputClass('specialty')} />
          </FormField>

          <FormField label="Phone" error={fieldErrors.phone}>
            <input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210" maxLength={10}
              className={inputClass('phone')} />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
          <button onClick={onClose} className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : (user ? 'Save Changes' : 'Create User')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Reset Password Modal
const ResetPasswordModal = ({ user, onClose, onSuccess, onError }) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [showPasswordRules, setShowPasswordRules] = useState(false);

  const handleReset = async () => {
    if (!newPassword) {
      setFieldError('Password is required.');
      return;
    }
    const failedRule = passwordRules.find(rule => !rule.test(newPassword));
    if (failedRule) {
      setFieldError(failedRule.label + '.');
      return;
    }

    setSaving(true);
    setFieldError('');
    try {
      await api.resetUserPassword(user.id, newPassword);
      onSuccess(`Password reset for ${user.name}.`);
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        setFieldError(err.errors[0].message);
      } else {
        setFieldError(err.message || 'Failed to reset password.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="font-h3 text-on-surface mb-2">Reset Password</h3>
        <p className="font-body-md text-on-surface-variant mb-4">Set a new password for <strong>{user.name}</strong>.</p>

        <div className="relative mb-2">
          <input
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setFieldError(''); }}
            onFocus={() => setShowPasswordRules(true)}
            onBlur={() => setTimeout(() => setShowPasswordRules(false), 200)}
            placeholder="Enter new password"
            autoFocus
            className={`w-full px-4 py-3 pr-12 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50 ${fieldError ? 'border-error' : 'border-outline-variant'}`}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface transition-colors">
            {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
          </button>
        </div>

        {/* Password requirements tooltip */}
        {showPasswordRules && (
          <div className="mb-3 p-3 bg-surface-container border border-outline-variant rounded-lg">
            <p className="font-caption text-on-surface-variant mb-2">Password must contain:</p>
            <ul className="space-y-1">
              {passwordRules.map((rule, i) => {
                const passed = rule.test(newPassword);
                return (
                  <li key={i} className={`flex items-center gap-2 text-sm ${passed ? 'text-on-tertiary-container' : 'text-on-surface-variant'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${passed ? 'bg-on-tertiary-container text-white' : 'bg-outline-variant text-on-surface-variant'}`}>
                      {passed ? '\u2713' : ''}
                    </span>
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {fieldError && <p className="mb-3 text-sm text-error">{fieldError}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">Cancel</button>
          <button onClick={handleReset} disabled={saving}
            className="px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50">
            {saving ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
