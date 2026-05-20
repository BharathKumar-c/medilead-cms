import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Check, ChevronDown, ChevronUp } from 'lucide-react';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import api from '../services/api';

let toastId = 0;

const moduleLabels = {
  leads: 'Lead Management',
  appointments: 'Appointment Management',
  calls: 'Call Management',
  reports: 'Reports & Analytics',
  users: 'User Management',
  roles: 'Role Management',
  dashboard: 'Dashboard',
  notifications: 'Notifications',
};

const PermissionAssignment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [allPermissions, setAllPermissions] = useState({});
  const [selectedPerms, setSelectedPerms] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, title, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [roleRes, permsRes] = await Promise.all([
          api.getRole(id),
          api.getAllPermissions(),
        ]);
        setRole(roleRes.data.role);
        setAllPermissions(permsRes.data.grouped);
        setSelectedPerms(new Set(roleRes.data.role.permissions.map(p => p.id)));
        // Expand all modules by default
        setExpandedModules(new Set(Object.keys(permsRes.data.grouped)));
      } catch (err) {
        addToast('error', 'Error', 'Failed to load permissions.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const toggleModule = (module) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const togglePermission = (permId) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleAllModule = (module) => {
    const modulePerms = allPermissions[module] || [];
    const allSelected = modulePerms.every(p => selectedPerms.has(p.id));

    setSelectedPerms(prev => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.setRolePermissions(id, Array.from(selectedPerms));
      addToast('success', 'Saved', `Permissions updated for "${role.display_name}".`);
    } catch (err) {
      addToast('error', 'Error', err.message || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Permission Assignment">
        <div className="flex items-center justify-center py-20">
          <p className="text-on-surface-variant">Loading permissions...</p>
        </div>
      </Layout>
    );
  }

  if (!role) {
    return (
      <Layout title="Permission Assignment">
        <div className="text-center py-20">
          <p className="text-on-surface-variant">Role not found.</p>
          <button onClick={() => navigate('/role-management')} className="mt-4 text-secondary hover:underline">
            Back to Role Management
          </button>
        </div>
      </Layout>
    );
  }

  const modules = Object.keys(allPermissions);

  return (
    <Layout title={`Permissions: ${role.display_name}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/role-management')} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors">
            <ArrowLeft size={20} className="text-on-surface" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Shield size={20} className="text-secondary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-on-surface">{role.display_name}</h2>
                <p className="text-sm text-on-surface-variant font-mono">{role.name}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-on-surface-variant">
              <span className="font-semibold text-on-surface">{selectedPerms.size}</span> of {Object.values(allPermissions).flat().length} permissions selected
            </p>
            <button
              onClick={handleSave}
              disabled={saving || role.is_system}
              className="mt-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>

        {role.is_system && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <p className="text-sm text-primary">
              <strong>System Role:</strong> Permissions for built-in roles are managed automatically and cannot be modified.
            </p>
          </div>
        )}

        {/* Permission Groups */}
        <div className="space-y-3">
          {modules.map(module => {
            const modulePerms = allPermissions[module] || [];
            const selectedCount = modulePerms.filter(p => selectedPerms.has(p.id)).length;
            const allSelected = modulePerms.every(p => selectedPerms.has(p.id));
            const isExpanded = expandedModules.has(module);

            return (
              <div key={module} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                {/* Module Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-surface-container-high cursor-pointer" onClick={() => toggleModule(module)}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAllModule(module); }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        allSelected ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant'
                      }`}
                      disabled={role.is_system}
                    >
                      {allSelected && <Check size={14} />}
                    </button>
                    <div>
                      <h3 className="font-semibold text-on-surface">{moduleLabels[module] || module}</h3>
                      <p className="text-xs text-on-surface-variant">{selectedCount} of {modulePerms.length} selected</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-on-surface-variant" /> : <ChevronDown size={18} className="text-on-surface-variant" />}
                </div>

                {/* Permissions List */}
                {isExpanded && (
                  <div className="divide-y divide-outline-variant/30">
                    {modulePerms.map(perm => (
                      <label
                        key={perm.id}
                        className={`flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-primary/5 transition-colors ${role.is_system ? 'opacity-60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPerms.has(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          disabled={role.is_system}
                          className="mt-0.5 w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-on-surface text-sm">{perm.display_name}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">{perm.description}</p>
                          <p className="text-xs text-on-surface-variant/60 font-mono mt-0.5">{perm.name}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Toasts */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
};

export default PermissionAssignment;
