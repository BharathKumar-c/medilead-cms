import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit, Trash2, X, Search, AlertTriangle, RotateCcw, Building2, Stethoscope,
  MapPin,
} from 'lucide-react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import Toast from '../components/Toast';
import api from '../services/api';

let toastId = 0;

const TABS = [
  { key: 'lead-sources', label: 'Lead Sources', entity: 'leadSource' },
  { key: 'lead-statuses', label: 'Lead Statuses', entity: 'leadStatus' },
  { key: 'departments', label: 'Departments', entity: 'department' },
  { key: 'branches', label: 'Branches', entity: 'branch' },
  { key: 'doctors', label: 'Doctors', entity: 'doctor' },
  { key: 'priorities', label: 'Priorities', entity: 'priority' },
  { key: 'pincodes', label: 'Pincodes', entity: 'pincode' },
];

const emptySimple = { name: '' };
const emptyBranch = { name: '', address: '', city: '', state: '', phone: '', email: '' };
const emptyDoctor = { name: '', department: '', specialty: '', qualification: '', phone: '', email: '' };
const emptyPincode = { pincode: '', area: '', city: '', state: '' };

const MasterData = () => {
  const [activeTab, setActiveTab] = useState('lead-sources');
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [branchDeptIds, setBranchDeptIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [serverTotal, setServerTotal] = useState(0);

  const addToast = (type, title, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // ── Load data ──

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      switch (activeTab) {
        case 'lead-sources': res = await api.getMasterLeadSources(); break;
        case 'departments': res = await api.getMasterDepartments(); break;
        case 'branches': res = await api.getMasterBranches(); break;
        case 'doctors': res = await api.getMasterDoctors(); break;
        case 'priorities': res = await api.getMasterPriorities(); break;
        case 'lead-statuses': res = await api.getMasterLeadStatuses(); break;
        case 'pincodes': res = await api.getMasterPincodes({ search: searchTerm, page, limit: pageSize }); break;
        default: return;
      }
      setItems(res.data.items || []);
      if (activeTab === 'pincodes') {
        setServerTotal(res.data.total || 0);
      }
    } catch {
      addToast('error', 'Load Failed', 'Could not fetch data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadItems(); }, [loadItems]);
  // Pincodes use server-side search/pagination — reload on search or page change
  useEffect(() => {
    if (activeTab === 'pincodes') loadItems();
  }, [searchTerm, page, pageSize, activeTab]);

  // Load departments for branch/doctor forms
  useEffect(() => {
    if (activeTab === 'branches' || activeTab === 'doctors') {
      api.getMasterDepartments().then(res => setDepartments(res.data.items || [])).catch(() => {});
    }
  }, [activeTab]);

  // Reset form state on tab change
  useEffect(() => {
    setSearchTerm('');
    setShowForm(false);
    setEditItem(null);
    setDeleteConfirm(null);
    setForm({});
    setBranchDeptIds([]);
    setPage(1);
  }, [activeTab]);

  // Reset page on search
  useEffect(() => { setPage(1); }, [searchTerm]);

  // ── Filtering ──

  const isServerPaginated = activeTab === 'pincodes';

  const filtered = isServerPaginated ? items : items.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(term) ||
      item.city?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term) ||
      item.specialty?.toLowerCase().includes(term) ||
      item.pincode?.toLowerCase().includes(term) ||
      item.area?.toLowerCase().includes(term) ||
      item.state?.toLowerCase().includes(term)
    );
  });

  // ── Pagination ──

  const totalFiltered = isServerPaginated ? serverTotal : filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedItems = isServerPaginated ? items : filtered.slice(startIdx, startIdx + pageSize);
  const showingFrom = totalFiltered === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + pageSize, totalFiltered);

  // ── Form helpers ──

  const getEmptyForm = () => {
    if (activeTab === 'branches') return { ...emptyBranch };
    if (activeTab === 'doctors') return { ...emptyDoctor };
    if (activeTab === 'pincodes') return { ...emptyPincode };
    return { ...emptySimple };
  };

  const openCreate = () => {
    setEditItem(null);
    setForm(getEmptyForm());
    setBranchDeptIds([]);
    setShowForm(true);
  };

  const openEdit = async (item) => {
    setEditItem(item);
    if (activeTab === 'branches') {
      setForm({ name: item.name, address: item.address || '', city: item.city || '', state: item.state || '', phone: item.phone || '', email: item.email || '' });
      try {
        const res = await api.getMasterBranchDepartments(item.id);
        setBranchDeptIds(res.data.department_ids || []);
      } catch { setBranchDeptIds([]); }
    } else if (activeTab === 'doctors') {
      setForm({ name: item.name, department: item.department || '', specialty: item.specialty || '', qualification: item.qualification || '', phone: item.phone || '', email: item.email || '' });
    } else if (activeTab === 'pincodes') {
      setForm({ pincode: item.pincode || '', area: item.area || '', city: item.city || '', state: item.state || '' });
    } else {
      setForm({ name: item.name });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (activeTab === 'pincodes') {
      if (!form.pincode?.trim() || !form.area?.trim()) {
        addToast('error', 'Validation Error', 'Pincode and Area are required.');
        return;
      }
      setSaving(true);
      try {
        if (editItem) {
          await api.updateMasterPincode(editItem.id, form);
          addToast('success', 'Updated', `${form.area} has been updated.`);
        } else {
          await api.createMasterPincode(form);
          addToast('success', 'Created', `${form.area} has been created.`);
        }
        setShowForm(false);
        setEditItem(null);
        setForm({});
        loadItems();
      } catch (err) {
        addToast('error', 'Error', err.message || 'Operation failed.');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!form.name?.trim()) {
      addToast('error', 'Validation Error', 'Name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        switch (activeTab) {
          case 'lead-sources': await api.updateMasterLeadSource(editItem.id, form); break;
          case 'priorities': await api.updateMasterPriority(editItem.id, form); break;
          case 'lead-statuses': await api.updateMasterLeadStatus(editItem.id, form); break;
          case 'departments': await api.updateMasterDepartment(editItem.id, form); break;
          case 'branches': await api.updateMasterBranch(editItem.id, { ...form, department_ids: branchDeptIds }); break;
          case 'doctors': await api.updateMasterDoctor(editItem.id, form); break;
        }
        addToast('success', 'Updated', `${form.name} has been updated.`);
      } else {
        switch (activeTab) {
          case 'lead-sources': await api.createMasterLeadSource(form); break;
          case 'priorities': await api.createMasterPriority(form); break;
          case 'lead-statuses': await api.createMasterLeadStatus(form); break;
          case 'departments': await api.createMasterDepartment(form); break;
          case 'branches': await api.createMasterBranch({ ...form, department_ids: branchDeptIds }); break;
          case 'doctors': await api.createMasterDoctor(form); break;
        }
        addToast('success', 'Created', `${form.name} has been created.`);
      }
      setShowForm(false);
      setEditItem(null);
      setForm({});
      setBranchDeptIds([]);
      loadItems();
    } catch (err) {
      addToast('error', 'Error', err.message || 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      switch (activeTab) {
        case 'lead-sources': await api.deleteMasterLeadSource(deleteConfirm.id); break;
        case 'priorities': await api.deleteMasterPriority(deleteConfirm.id); break;
        case 'lead-statuses': await api.deleteMasterLeadStatus(deleteConfirm.id); break;
        case 'departments': await api.deleteMasterDepartment(deleteConfirm.id); break;
        case 'branches': await api.deleteMasterBranch(deleteConfirm.id); break;
        case 'doctors': await api.deleteMasterDoctor(deleteConfirm.id); break;
        case 'pincodes': await api.deleteMasterPincode(deleteConfirm.id); break;
      }
      addToast('success', 'Deleted', `${deleteConfirm.name} has been removed.`);
      setDeleteConfirm(null);
      loadItems();
    } catch (err) {
      addToast('error', 'Delete Failed', err.message || 'Could not delete.');
    }
  };

  const handleReactivate = async (item) => {
    try {
      if (activeTab === 'branches') {
        await api.updateMasterBranch(item.id, { is_active: true });
      } else if (activeTab === 'doctors') {
        await api.updateMasterDoctor(item.id, { is_active: true });
      }
      addToast('success', 'Reactivated', `${item.name} is now active.`);
      loadItems();
    } catch (err) {
      addToast('error', 'Error', err.message || 'Could not reactivate.');
    }
  };

  // ── Table columns per tab ──

  const renderTableHead = () => {
    switch (activeTab) {
      case 'branches':
        return (
          <tr className="bg-surface-container-high">
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Branch Name</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">City</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">State</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Phone</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Depts</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Status</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Actions</th>
          </tr>
        );
      case 'doctors':
        return (
          <tr className="bg-surface-container-high">
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Doctor Name</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Department</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Specialty</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Phone</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Status</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Actions</th>
          </tr>
        );
      case 'departments':
        return (
          <tr className="bg-surface-container-high">
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Department Name</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Branches</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Doctors</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Actions</th>
          </tr>
        );
      case 'pincodes':
        return (
          <tr className="bg-surface-container-high">
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Pincode</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Area</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">City</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">State</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Actions</th>
          </tr>
        );
      default:
        return (
          <tr className="bg-surface-container-high">
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Name</th>
            <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Actions</th>
          </tr>
        );
    }
  };

  const renderTableRow = (item) => {
    const isActive = item.is_active !== false;
    switch (activeTab) {
      case 'branches':
        return (
          <tr key={item.id} className={`border-t border-outline-variant/50 hover:bg-surface-container/50 transition-colors ${!isActive ? 'opacity-60' : ''}`}>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-on-surface-variant" />
                <span className="font-body-md text-on-surface font-bold">{item.name}</span>
              </div>
            </td>
            <td className="px-4 py-3 font-body-md text-on-surface-variant">{item.city || '—'}</td>
            <td className="px-4 py-3 font-body-md text-on-surface-variant">{item.state || '—'}</td>
            <td className="px-4 py-3 font-body-md text-on-surface-variant">{item.phone || '—'}</td>
            <td className="px-4 py-3 font-body-md text-on-surface-variant">{item.department_count ?? '—'}</td>
            <td className="px-4 py-3">
              <span className={`inline-block px-3 py-1 rounded-full font-caption font-bold text-xs ${isActive ? 'bg-on-tertiary-container/10 text-on-tertiary-container' : 'bg-error/10 text-error'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Edit">
                  <Edit className="w-4 h-4 text-on-surface-variant" />
                </button>
                {isActive ? (
                  <button onClick={() => setDeleteConfirm(item)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Deactivate">
                    <Trash2 className="w-4 h-4 text-on-surface-variant" />
                  </button>
                ) : (
                  <button onClick={() => handleReactivate(item)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Reactivate">
                    <RotateCcw className="w-4 h-4 text-on-surface-variant" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      case 'doctors':
        return (
          <tr key={item.id} className={`border-t border-outline-variant/50 hover:bg-surface-container/50 transition-colors ${!isActive ? 'opacity-60' : ''}`}>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-on-surface-variant" />
                <span className="font-body-md text-on-surface font-bold">{item.name}</span>
              </div>
            </td>
            <td className="px-4 py-3 font-body-md text-on-surface-variant">{item.department || '—'}</td>
            <td className="px-4 py-3 font-body-md text-on-surface-variant">{item.specialty || '—'}</td>
            <td className="px-4 py-3 font-body-md text-on-surface-variant">{item.phone || '—'}</td>
            <td className="px-4 py-3">
              <span className={`inline-block px-3 py-1 rounded-full font-caption font-bold text-xs ${isActive ? 'bg-on-tertiary-container/10 text-on-tertiary-container' : 'bg-error/10 text-error'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Edit">
                  <Edit className="w-4 h-4 text-on-surface-variant" />
                </button>
                {isActive ? (
                  <button onClick={() => setDeleteConfirm(item)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Deactivate">
                    <Trash2 className="w-4 h-4 text-on-surface-variant" />
                  </button>
                ) : (
                  <button onClick={() => handleReactivate(item)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Reactivate">
                    <RotateCcw className="w-4 h-4 text-on-surface-variant" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      case 'departments':
        return (
          <tr key={item.id} className="border-t border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
            <td className="px-4 py-3 font-body-md text-on-surface font-bold">{item.name}</td>
            <td className="px-4 py-3 font-body-md text-on-surface-variant">{item.branch_count ?? 0}</td>
            <td className="px-4 py-3 font-body-md text-on-surface-variant">{item.doctor_count ?? 0}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Edit">
                  <Edit className="w-4 h-4 text-on-surface-variant" />
                </button>
                <button onClick={() => setDeleteConfirm(item)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4 text-on-surface-variant" />
                </button>
              </div>
            </td>
          </tr>
        );
      case 'pincodes':
        return (
          <tr key={item.id} className="border-t border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-on-surface-variant" />
                <span className="font-body-md text-on-surface font-bold">{item.pincode}</span>
              </div>
            </td>
            <td className="px-4 py-3 font-body-md text-on-surface">{item.area}</td>
            <td className="px-4 py-3 font-body-md text-on-surface-variant">{item.city || '—'}</td>
            <td className="px-4 py-3 font-body-md text-on-surface-variant">{item.state || '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Edit">
                  <Edit className="w-4 h-4 text-on-surface-variant" />
                </button>
                <button onClick={() => setDeleteConfirm(item)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4 text-on-surface-variant" />
                </button>
              </div>
            </td>
          </tr>
        );
      default:
        return (
          <tr key={item.id} className="border-t border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
            <td className="px-4 py-3 font-body-md text-on-surface font-bold">{item.name}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Edit">
                  <Edit className="w-4 h-4 text-on-surface-variant" />
                </button>
                <button onClick={() => setDeleteConfirm(item)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4 text-on-surface-variant" />
                </button>
              </div>
            </td>
          </tr>
        );
    }
  };

  // ── Form panel ──

  const renderForm = () => {
    if (!showForm) return null;
    const isSimple = !['branches', 'doctors', 'pincodes'].includes(activeTab);
    const tab = TABS.find(t => t.key === activeTab);
    const tabLabel = tab?.key === 'lead-statuses' ? 'Lead Status' : tab?.key === 'pincodes' ? 'Pincode' : tab?.label.replace(/ies$/, 'y').replace(/s$/, '') || 'Item';

    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => { setShowForm(false); setEditItem(null); }} />
        <div className="ml-auto w-full max-w-lg bg-surface shadow-2xl flex flex-col h-full animate-slide-in relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
            <h2 className="font-h1 text-xl text-on-surface">
              {editItem ? `Edit ${tabLabel}` : `Add ${tabLabel}`}
            </h2>
            <button onClick={() => { setShowForm(false); setEditItem(null); }} className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {activeTab === 'branches' ? (
              <>
                <FormField label="Branch Name" required value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Main Hospital" />
                <FormField label="Address" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="Street address" />
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="City" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} placeholder="City" />
                  <FormField label="State" value={form.state} onChange={v => setForm(f => ({ ...f, state: v }))} placeholder="State" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="Phone number" />
                  <FormField label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="Email" />
                </div>
                {/* Department checkboxes */}
                {departments.length > 0 && (
                  <div>
                    <label className="block font-caption text-on-surface-variant uppercase mb-2">Departments</label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-outline-variant rounded-lg p-3">
                      {departments.map(dept => (
                        <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={branchDeptIds.includes(dept.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBranchDeptIds(prev => [...prev, dept.id]);
                              } else {
                                setBranchDeptIds(prev => prev.filter(id => id !== dept.id));
                              }
                            }}
                            className="rounded border-outline-variant"
                          />
                          <span className="font-body-md text-on-surface">{dept.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : activeTab === 'doctors' ? (
              <>
                <FormField label="Doctor Name" required value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Dr. Rajesh Sharma" />
                <div>
                  <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Department</label>
                  <div className="relative">
                    <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                      className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all appearance-none pr-10">
                      <option value="">Select department</option>
                      {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
                <FormField label="Specialty" value={form.specialty} onChange={v => setForm(f => ({ ...f, specialty: v }))} placeholder="e.g. Interventional Cardiologist" />
                <FormField label="Qualification" value={form.qualification} onChange={v => setForm(f => ({ ...f, qualification: v }))} placeholder="e.g. MBBS, MD, DM Cardiology" />
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="Phone number" />
                  <FormField label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="Email" />
                </div>
              </>
            ) : activeTab === 'pincodes' ? (
              <>
                <FormField label="Pincode" required value={form.pincode} onChange={v => setForm(f => ({ ...f, pincode: v }))} placeholder="e.g. 600017" />
                <FormField label="Area" required value={form.area} onChange={v => setForm(f => ({ ...f, area: v }))} placeholder="e.g. T. Nagar" />
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="City" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} placeholder="City" />
                  <FormField label="State" value={form.state} onChange={v => setForm(f => ({ ...f, state: v }))} placeholder="State" />
                </div>
              </>
            ) : (
              <FormField label="Name" required value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Enter name" />
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant">
            <button onClick={() => { setShowForm(false); setEditItem(null); }}
              className="px-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50">
              {saving ? 'Saving...' : (editItem ? 'Update' : 'Create')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ──

  const activeLabel = TABS.find(t => t.key === activeTab)?.label || '';
  const activeEntity = TABS.find(t => t.key === activeTab)?.entity || 'item';

  return (
    <Layout title="Master Data">
      <div className="p-4 sm:p-6 lg:p-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background">Master Data</h1>
          <p className="font-body-md text-on-surface-variant mt-1">Manage reference data used across the application</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-outline-variant mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearchTerm(''); setPage(1); }}
              className={`px-4 py-2.5 font-body-md font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'text-secondary border-secondary'
                  : 'text-on-surface-variant border-transparent hover:text-on-surface hover:border-outline'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + Add */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input type="text" placeholder={activeTab === 'pincodes' ? 'Search by pincode, area, city, state...' : `Search ${activeLabel.toLowerCase()}...`} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50" />
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add {activeTab === 'lead-statuses' ? 'Lead Status' : activeTab === 'pincodes' ? 'Pincode' : activeLabel.replace(/ies$/, 'y').replace(/s$/, '')}
          </button>
        </div>

        {/* Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>{renderTableHead()}</thead>
              <tbody className="zebra-striping">
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center font-body-md text-on-surface-variant">Loading {activeLabel.toLowerCase()}...</td></tr>
                ) : totalFiltered === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center font-body-md text-on-surface-variant">No {activeLabel.toLowerCase()} found.</td></tr>
                ) : paginatedItems.map(item => renderTableRow(item))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalFiltered > 0 && (
          <Pagination
            currentPage={safePage}
            totalItems={totalFiltered}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}

        {/* Slide-over Form */}
        {renderForm()}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md p-6 text-center z-10">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-error" />
              </div>
              <h3 className="font-h1 text-lg text-on-surface mb-2">
                {['branches', 'doctors'].includes(activeTab) ? 'Deactivate' : 'Delete'} {deleteConfirm.name || `${deleteConfirm.area} (${deleteConfirm.pincode})`}?
              </h3>
              <p className="font-body-md text-on-surface-variant mb-6">
                {['branches', 'doctors'].includes(activeTab)
                  ? `This will deactivate ${deleteConfirm.name}. You can reactivate it later.`
                  : `This action cannot be undone. ${deleteConfirm.name || `${deleteConfirm.area} (${deleteConfirm.pincode})`} will be permanently removed.`
                }
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete}
                  className="px-4 py-2.5 bg-error text-on-error rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
                  {['branches', 'doctors'].includes(activeTab) ? 'Deactivate' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toasts */}
        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
    </Layout>
  );
};

// ── Reusable FormField ──

const FormField = ({ label, required, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
      {label} {required && <span className="text-error text-base font-bold leading-none">*</span>}
    </label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
  </div>
);

export default MasterData;
