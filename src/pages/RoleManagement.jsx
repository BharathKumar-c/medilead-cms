import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Edit2, Trash2, Users, Lock, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import api from '../services/api';

let toastId = 0;

const RoleManagement = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [form, setForm] = useState({ name: '', display_name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const addToast = useCallback((type, title, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await api.getRoles();
      setRoles(res.data.roles);
    } catch (err) {
      addToast('error', 'Error', 'Failed to load roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleCreate = () => {
    setEditRole(null);
    setForm({ name: '', display_name: '', description: '' });
    setShowForm(true);
  };

  const handleEdit = (role) => {
    setEditRole(role);
    setForm({ name: role.name, display_name: role.display_name, description: role.description || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.display_name.trim()) {
      addToast('error', 'Validation Error', 'Name and display name are required.');
      return;
    }

    setSaving(true);
    try {
      if (editRole) {
        await api.updateRole(editRole.id, { display_name: form.display_name, description: form.description });
        addToast('success', 'Updated', `Role "${form.display_name}" updated successfully.`);
      } else {
        await api.createRole(form);
        addToast('success', 'Created', `Role "${form.display_name}" created successfully.`);
      }
      setShowForm(false);
      loadRoles();
    } catch (err) {
      addToast('error', 'Error', err.message || 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.deleteRole(deleteConfirm.id);
      addToast('success', 'Deleted', `Role "${deleteConfirm.display_name}" deleted.`);
      setDeleteConfirm(null);
      loadRoles();
    } catch (err) {
      addToast('error', 'Error', err.message || 'Failed to delete role.');
    }
  };

  const inputClass = 'w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface text-on-surface focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-colors';

  return (
    <Layout title="Role Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-on-surface">Role Management</h2>
            <p className="text-sm text-on-surface-variant mt-1">Create and manage roles with custom permissions.</p>
          </div>
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors">
            <Plus size={18} /> Create Role
          </button>
        </div>

        {/* Roles Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="text-left px-5 py-3 font-label-caps text-on-surface-variant uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 font-label-caps text-on-surface-variant uppercase tracking-wider">Description</th>
                  <th className="text-left px-5 py-3 font-label-caps text-on-surface-variant uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 font-label-caps text-on-surface-variant uppercase tracking-wider">Permissions</th>
                  <th className="text-left px-5 py-3 font-label-caps text-on-surface-variant uppercase tracking-wider">Users</th>
                  <th className="text-right px-5 py-3 font-label-caps text-on-surface-variant uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="zebra-striping">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-12 text-on-surface-variant">Loading roles...</td></tr>
                ) : roles.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-12 text-on-surface-variant">No roles found.</td></tr>
                ) : roles.map(role => (
                  <tr key={role.id} className="border-t border-outline-variant/50 hover:bg-primary/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center">
                          <Shield size={18} className="text-secondary" />
                        </div>
                        <div>
                          <p className="font-medium text-on-surface">{role.display_name}</p>
                          <p className="text-xs text-on-surface-variant font-mono">{role.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant text-sm max-w-[200px] truncate">
                      {role.description || '—'}
                    </td>
                    <td className="px-5 py-4">
                      {role.is_system ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          <Lock size={12} /> System
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-tertiary/10 text-on-tertiary-container border border-on-tertiary-container/20">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => navigate(`/role-management/${role.id}/permissions`)}
                        className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary transition-colors"
                      >
                        {role.permission_count} permissions <ChevronRight size={14} />
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-on-surface-variant">
                        <Users size={14} /> {role.user_count}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/role-management/${role.id}/permissions`)}
                          className="p-2 rounded-lg hover:bg-secondary/10 text-secondary transition-colors"
                          title="Manage Permissions"
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(role)}
                          className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          title="Edit Role"
                        >
                          <Edit2 size={16} />
                        </button>
                        {!role.is_system && (
                          <button
                            onClick={() => setDeleteConfirm(role)}
                            className="p-2 rounded-lg hover:bg-error/10 text-error transition-colors"
                            title="Delete Role"
                          >
                            <Trash2 size={16} />
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
      </div>

      {/* Role Form Slide-Over */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowForm(false)} />
          <div className="relative ml-auto w-full max-w-lg bg-surface shadow-2xl flex flex-col h-full animate-slide-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
              <h3 className="text-lg font-semibold text-on-surface">{editRole ? 'Edit Role' : 'Create Role'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
                <span className="text-on-surface-variant text-xl">&times;</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Role Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                  placeholder="e.g., custom_nurse"
                  className={inputClass}
                  disabled={!!editRole}
                />
                <p className="text-xs text-on-surface-variant mt-1">Lowercase letters, numbers, and underscores only.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Display Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="e.g., Custom Nurse"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the role's purpose..."
                  rows={3}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant">
              <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-medium">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors font-medium disabled:opacity-50">
                {saving ? 'Saving...' : (editRole ? 'Update Role' : 'Create Role')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-surface rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-on-surface mb-2">Delete Role</h3>
            <p className="text-on-surface-variant mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.display_name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-medium">
                Cancel
              </button>
              <button onClick={handleDelete} className="px-4 py-2.5 rounded-lg bg-error text-on-error hover:bg-error/90 transition-colors font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </Layout>
  );
};

export default RoleManagement;
