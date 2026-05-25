import { useState, useEffect } from 'react';
import {
  UserPlus, Edit, Trash2, X, Shield, Eye, EyeOff, Save, Search,
  AlertTriangle, ChevronDown, Phone,
} from 'lucide-react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
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
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  useEffect(() => { loadUsers(); loadDepartments(); }, []);

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

  const loadDepartments = async () => {
    try {
      const res = await api.getMasterDepartments();
      setDepartments(res.data?.items || []);
    } catch {
      // Silently fail — departments are optional for display
    }
  };

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.intercom_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalFilteredUsers = filteredUsers.length;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            <h1 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background">User & Agent Management</h1>
            <p className="font-body-md text-on-surface-variant mt-1">Manage system users, agents, and intercom assignments</p>
          </div>
          <button onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
            <UserPlus className="w-4 h-4" /> Add User / Agent
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input type="text" placeholder="Search by name, email, employee ID, intercom, or role..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50" />
        </div>

        {/* Users Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">ID</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Emp ID</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Name</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Email</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Intercom</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Department</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Role</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody className="zebra-striping">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center font-body-md text-on-surface-variant">Loading users...</td></tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center font-body-md text-on-surface-variant">No users found.</td></tr>
                ) : paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-t border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 py-3 font-data-tabular text-on-surface-variant">#{user.id}</td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant">{user.employee_id || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-xs">
                          {(user.name || '').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-body-md text-on-surface font-bold">{user.name}</p>
                          {(user.designation || user.specialty) && <p className="font-caption text-on-surface-variant">{user.designation || user.specialty}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant">{user.email}</td>
                    <td className="px-4 py-3">
                      {user.intercom_number ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-caption font-bold text-xs">
                          <Phone className="w-3 h-3" /> {user.intercom_number}
                        </span>
                      ) : (
                        <span className="font-body-md text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant">{user.department || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? user.roles.map((role, i) => (
                          <span key={role.name || role.id || i} className={`inline-block px-2.5 py-0.5 rounded-full font-caption font-bold text-xs ${roleColors[role.name] || 'bg-outline/10 text-on-surface-variant border border-outline-variant'}`}>
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

          <Pagination
            currentPage={currentPage}
            totalItems={totalFilteredUsers}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>

        {/* Create/Edit Form Panel */}
        {showForm && (
          <UserFormPanel
            user={editUser}
            departments={departments}
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

const inputClass = (field, fieldErrors) =>
  `w-full px-4 py-3 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50 ${fieldErrors[field] ? 'border-error' : 'border-outline-variant'}`;

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

const MultiCheckboxSelect = ({ options, selected, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-3 border rounded-lg font-body-md text-left flex items-center justify-between bg-surface-container-lowest transition-all ${open ? 'border-secondary ring-2 ring-secondary/20' : 'border-outline-variant'}`}
      >
        <span className={selected.length === 0 ? 'text-on-surface-variant/50' : 'text-on-surface'}>
          {selected.length === 0 ? (placeholder || 'Select...') : `${selected.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-4 py-3 text-sm text-on-surface-variant">No options available</p>
          ) : options.map((opt) => {
            const label = typeof opt === 'string' ? opt : (opt.name || opt.label || opt);
            const val = typeof opt === 'string' ? opt : (opt.name || opt.value || opt);
            const isSelected = selected.includes(val);
            return (
              <label key={val} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    if (isSelected) {
                      onChange(selected.filter(s => s !== val));
                    } else {
                      onChange([...selected, val]);
                    }
                  }}
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-on-surface">{label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

// User Form Panel (Create/Edit)
const UserFormPanel = ({ user, departments, onClose, onSave, onError, onSuccess }) => {
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    employee_id: user?.employee_id || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'telecaller',
    specialty: user?.specialty || '',
    department: user?.department || '',
    designation: user?.designation || '',
    intercom_number: user?.intercom_number || '',
    date_of_birth: user?.date_of_birth ? user.date_of_birth.slice(0, 10) : '',
    phone: user?.phone || '',
    is_active: user?.is_active !== undefined ? user.is_active : true,
  });
  const [allowedDepartments, setAllowedDepartments] = useState(() => {
    if (user?.allowed_departments) {
      return Array.isArray(user.allowed_departments) ? user.allowed_departments : [];
    }
    // For existing users without allowed_departments, default to their primary department
    return user?.department ? [user.department] : [];
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

  const depOptions = departments.map(d => d.name || d);

  // Fetch available roles
  useEffect(() => {
    api.getRoles().then(res => {
      setAvailableRoles(res.data.roles);
    }).catch(() => {});
  }, []);

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const handleSave = async () => {
    const errors = {};
    if (!form.first_name.trim()) errors.first_name = 'First name is required.';
    if (!form.last_name.trim()) errors.last_name = 'Last name is required.';
    if (!form.department.trim()) errors.department = 'Department is required.';
    if (!form.designation.trim()) errors.designation = 'Designation is required.';
    if (allowedDepartments.length === 0) errors.allowedDepartments = 'At least one allowed department is required.';
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
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        employee_id: form.employee_id || null,
        email: form.email,
        role: form.role,
        specialty: form.specialty || null,
        department: form.department || null,
        designation: form.designation || null,
        intercom_number: form.intercom_number || null,
        date_of_birth: form.date_of_birth || null,
        allowed_departments: allowedDepartments.length > 0 ? allowedDepartments : null,
        phone: form.phone || null,
        role_ids: selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
      };

      if (user) {
        // Include is_active only when editing
        payload.is_active = form.is_active;
      }

      if (user) {
        await api.updateUser(user.id, payload);
        onSuccess(`${form.first_name} ${form.last_name} has been updated.`);
      } else {
        payload.password = form.password;
        await api.createUser(payload);
        onSuccess(`${form.first_name} ${form.last_name} has been created.`);
      }
      onSave();
    } catch (err) {
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

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-xl bg-surface shadow-2xl flex flex-col h-full animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="font-h2 text-on-surface">{user ? 'Edit User / Agent' : 'Add New User / Agent'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container transition-colors"><X className="w-5 h-5 text-on-surface-variant" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Row: User ID (display only for edit) */}
          {user && (
            <FormField label="User ID">
              <div className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-high/50">
                #{user.id}
              </div>
            </FormField>
          )}

          {/* Row: Employee ID */}
          <FormField label="Employee ID" error={fieldErrors.employee_id}>
            <input type="text" value={form.employee_id} onChange={(e) => setField('employee_id', e.target.value)}
              placeholder="e.g. EMP-001"
              className={inputClass('employee_id', fieldErrors)} />
          </FormField>

          {/* Row: First Name + Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required error={fieldErrors.first_name}>
              <input type="text" value={form.first_name} onChange={(e) => setField('first_name', e.target.value)}
                className={inputClass('first_name', fieldErrors)} />
            </FormField>
            <FormField label="Last Name" required error={fieldErrors.last_name}>
              <input type="text" value={form.last_name} onChange={(e) => setField('last_name', e.target.value)}
                className={inputClass('last_name', fieldErrors)} />
            </FormField>
          </div>

          {/* Row: Date of Birth */}
          <FormField label="Date of Birth" error={fieldErrors.date_of_birth}>
            <input type="date" value={form.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)}
              className={inputClass('date_of_birth', fieldErrors)} />
          </FormField>

          {/* Row: Email */}
          <FormField label="Email Address" required error={fieldErrors.email}>
            <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)}
              className={inputClass('email', fieldErrors)} />
          </FormField>

          {/* Row: Password (only for create) */}
          {!user && (
            <FormField label="Password" required error={fieldErrors.password}>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  onFocus={() => setShowPasswordRules(true)}
                  onBlur={() => setTimeout(() => setShowPasswordRules(false), 200)}
                  placeholder="Min 8 characters"
                  className={`${inputClass('password', fieldErrors)} pr-12`}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface transition-colors">
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
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

          {/* Row: Mobile Number */}
          <FormField label="Mobile Number" error={fieldErrors.phone}>
            <input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210" maxLength={10}
              className={inputClass('phone', fieldErrors)} />
          </FormField>

          {/* Row: Intercom Number */}
          <FormField label="Intercom Number" error={fieldErrors.intercom_number}>
            <input type="text" value={form.intercom_number} onChange={(e) => setField('intercom_number', e.target.value)}
              placeholder="e.g. 101, 102, 201"
              className={inputClass('intercom_number', fieldErrors)} />
            <p className="mt-1.5 text-xs text-on-surface-variant">Calls will be routed based on this intercom number. Each agent must have a unique intercom.</p>
          </FormField>

          {/* Row: Department */}
          <FormField label="Department" error={fieldErrors.department}>
            <div className="relative">
              <select value={form.department} onChange={(e) => setField('department', e.target.value)}
                className={`${inputClass('department', fieldErrors)} appearance-none pr-10`}>
                <option value="">Select department...</option>
                {depOptions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            </div>
          </FormField>

          {/* Row: Designation */}
          <FormField label="Designation" required error={fieldErrors.designation}>
            <input type="text" value={form.designation} onChange={(e) => setField('designation', e.target.value)}
              placeholder="e.g. Senior Telecaller, Team Lead"
              className={inputClass('designation', fieldErrors)} />
          </FormField>

          {/* Row: Allowed Departments */}
          <FormField label="Allowed Department(s)" required error={fieldErrors.allowedDepartments}>
            <MultiCheckboxSelect
              options={depOptions}
              selected={allowedDepartments}
              onChange={setAllowedDepartments}
              placeholder="Select allowed departments..."
            />
            <p className="mt-1.5 text-xs text-on-surface-variant">Select the department(s) this agent can access for lead assignment and call routing.</p>
          </FormField>

          {/* Row: Roles */}
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

          {/* Row: Status Toggle (for edit only) */}
          {user && (
            <FormField label="Status">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-secondary/20 ${
                    form.is_active !== false ? 'bg-on-tertiary-container' : 'bg-outline-variant'
                  }`}
                  role="switch"
                  aria-checked={form.is_active !== false}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      form.is_active !== false ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`font-body-md font-bold ${form.is_active !== false ? 'text-on-tertiary-container' : 'text-error'}`}>
                  {form.is_active !== false ? 'Active' : 'Inactive'}
                </span>
                <span className="font-body-md text-on-surface-variant text-sm">Toggle to activate or deactivate this user.</span>
              </div>
            </FormField>
          )}
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
