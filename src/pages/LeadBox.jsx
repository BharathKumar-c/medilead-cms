import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Filter, Download, Eye, Edit, Trash2, X, UserPlus, Phone,
  CircleCheck, AlertTriangle, Search, ChevronLeft, ChevronRight,
  Calendar, Mail, MapPin, FileText, User, Clock, ChevronDown,
} from 'lucide-react';
import Layout from '../components/Layout';
import { leadBoxMetrics as defaultMetrics, pincodeData } from '../data/mockData';
import api from '../services/api';
import Toast from '../components/Toast';

const ITEMS_PER_PAGE = 5;

const mapLead = (l) => ({
  id: l.id,
  name: l.name,
  initials: l.initials,
  uhid: l.uhid,
  lastCallDate: l.last_call_date,
  status: l.status,
  leadSource: l.lead_source,
  phone: l.phone || '',
  alternateContact: l.alternate_contact || '',
  email: l.email || '',
  dob: l.dob,
  address: l.address,
  pincode: l.pincode,
  city: l.city,
  state: l.state,
  country: l.country,
  clinicalRemarks: l.clinical_remarks,
  priority: l.priority,
  assignedTo: l.assigned_to_name || '',
  createdAt: l.created_at,
});

let toastId = 0;

const LeadBox = () => {
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewLead, setViewLead] = useState(null);
  const [editLead, setEditLead] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => { loadLeads(); }, []);

  useEffect(() => {
    const handler = () => loadLeads();
    window.addEventListener('leadCreated', handler);
    return () => window.removeEventListener('leadCreated', handler);
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const [leadsRes, metricsRes] = await Promise.all([
        api.getLeads({ limit: 100 }),
        api.getLeadMetrics(),
      ]);
      setLeads(leadsRes.data.leads.map(mapLead));
      if (metricsRes?.data) setMetrics(metricsRes.data);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.uhid || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm);
      const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLeads = filteredLeads.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const startItem = filteredLeads.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(safePage * ITEMS_PER_PAGE, filteredLeads.length);

  const handleView = (lead) => setViewLead(lead);
  const handleEdit = (lead) => setEditLead(lead);
  const handleDelete = (lead) => setDeleteConfirm(lead);

  const confirmDelete = async () => {
    try {
      await api.deleteLead(deleteConfirm.id);
      setDeleteConfirm(null);
      addToast('success', 'Lead Deleted', `${deleteConfirm.name} has been removed.`);
      if (paginatedLeads.length === 1 && currentPage > 1) setCurrentPage(p => p - 1);
      loadLeads();
    } catch (err) {
      addToast('error', 'Delete Failed', err.message || 'Could not delete lead.');
    }
  };

  const handleExport = () => {
    const headers = ['Patient Name', 'UHID', 'Last Call', 'Status', 'Lead Source', 'Phone', 'Email'];
    const rows = filteredLeads.map(l => [l.name, l.uhid, l.lastCallDate, l.status, l.leadSource, l.phone, l.email]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => {
      const s = String(c ?? '');
      const safe = /^[=+\-@\t]/.test(s) ? `\t${s}` : s;
      return `"${safe.replaceAll('"', '""')}"`;
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'leads-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const statusColors = {
    'New': 'bg-secondary/10 text-secondary border border-secondary/20',
    'Contacted': 'bg-on-tertiary-container/10 text-on-tertiary-container border border-on-tertiary-container/20',
    'Interested': 'bg-secondary-fixed/10 text-secondary border border-secondary-fixed/20',
    'Follow-up': 'bg-on-tertiary-container/10 text-on-tertiary-container border border-on-tertiary-container/20',
    'Appointment Booked': 'bg-on-tertiary-container/10 text-on-tertiary-container border border-on-tertiary-container/20',
    'Closed': 'bg-surface-container-high text-on-surface-variant border border-outline-variant',
    'Rejected': 'bg-error/10 text-error border border-error/20',
  };
  const avatarColors = {
    'New': 'bg-secondary text-white',
    'Contacted': 'bg-on-tertiary-container text-white',
    'Interested': 'bg-secondary text-white',
    'Follow-up': 'bg-on-tertiary-container text-white',
    'Appointment Booked': 'bg-on-tertiary-container text-white',
    'Closed': 'bg-outline-variant text-on-surface-variant',
    'Rejected': 'bg-error text-white',
  };
  const priorityColors = {
    'High': 'text-error font-bold',
    'Medium': 'text-on-tertiary-container font-bold',
    'Low': 'text-on-surface-variant',
  };

  return (
    <Layout title="Lead Box">
      <div className="p-4 sm:p-6 lg:p-10 data-stage">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h1 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background">Lead Box</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all text-sm">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'New Leads Today', value: metrics.newLeadsToday?.count ?? metrics.newLeadsToday ?? 0, trend: metrics.newLeadsToday?.trend, border: 'border-t-secondary', icon: <UserPlus className="w-5 h-5 text-secondary" /> },
            { label: 'Pending Follow-ups', value: metrics.pendingFollowups, border: 'border-t-on-tertiary-container', icon: <Phone className="w-5 h-5 text-on-tertiary-container" /> },
            { label: 'Conversion Rate', value: metrics.conversionRate, border: 'border-t-secondary-fixed', icon: <CircleCheck className="w-5 h-5 text-secondary-fixed-dim" /> },
            { label: 'Overdue Responses', value: metrics.overdueResponses, border: 'border-t-error', icon: <AlertTriangle className="w-5 h-5 text-error" /> },
          ].map((card, i) => (
            <div key={i} className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-5 metric-card-accent ${card.border} shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-caption text-on-surface-variant">{card.label}</span>
                {card.icon}
              </div>
              <div className="font-h2 text-on-surface">{card.value}</div>
              {card.trend && <span className="font-caption text-on-tertiary-container">{card.trend}</span>}
            </div>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input type="text" placeholder="Search by name, UHID, email, or phone..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50" />
          </div>
          <div className="relative">
            <button onClick={() => setFilterOpen(!filterOpen)} className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest hover:bg-surface-container transition-all w-full sm:w-auto justify-between">
              <Filter className="w-4 h-4" /> {statusFilter} <ChevronDown className="w-4 h-4" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-10 py-1">
                {['All', 'New', 'Contacted', 'Interested', 'Follow-up', 'Appointment Booked', 'Closed', 'Rejected'].map(s => (
                  <button key={s} onClick={() => { setStatusFilter(s); setCurrentPage(1); setFilterOpen(false); }} className={`block w-full text-left px-4 py-2 font-body-md hover:bg-surface-container transition-colors ${statusFilter === s ? 'text-secondary font-bold' : 'text-on-surface'}`}>{s}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Patient Name</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">UHID</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Last Call</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Lead Source</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody className="zebra-striping">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center font-body-md text-on-surface-variant">Loading leads...</td></tr>
                ) : paginatedLeads.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center font-body-md text-on-surface-variant">No leads found.</td></tr>
                ) : paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="border-t border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-body-md font-bold text-xs ${avatarColors[lead.status]}`}>{lead.initials}</div>
                        <span className="font-body-md text-on-surface font-bold">{lead.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-data-tabular text-on-surface">{lead.uhid || '—'}</td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant">
                      {lead.lastCallDate ? new Date(lead.lastCallDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-3 py-1 rounded-full font-caption font-bold text-xs ${statusColors[lead.status]}`}>{lead.status}</span>
                    </td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant">{lead.leadSource || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleView(lead)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="View"><Eye className="w-4 h-4 text-on-surface-variant" /></button>
                        <button onClick={() => handleEdit(lead)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Edit"><Edit className="w-4 h-4 text-on-surface-variant" /></button>
                        <button onClick={() => handleDelete(lead)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="Delete"><Trash2 className="w-4 h-4 text-on-surface-variant" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-outline-variant gap-3">
            <span className="font-caption text-on-surface-variant">Showing {startItem}-{endItem} of {filteredLeads.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="p-2 rounded-lg hover:bg-surface-container transition-colors disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 rounded-lg font-body-md transition-all ${safePage === p ? 'bg-secondary text-white' : 'hover:bg-surface-container text-on-surface'}`}>{p}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="p-2 rounded-lg hover:bg-surface-container transition-colors disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* View Modal */}
        {viewLead && (
          <ViewLeadModal
            lead={viewLead}
            avatarColors={avatarColors}
            priorityColors={priorityColors}
            onClose={() => setViewLead(null)}
          />
        )}

        {/* Edit Slide-in Panel */}
        {editLead && (
          <EditPanel
            lead={editLead}
            onClose={() => setEditLead(null)}
            onSave={() => { setEditLead(null); loadLeads(); }}
            onError={(msg) => addToast('error', 'Update Failed', msg)}
            onSuccess={(msg) => addToast('success', 'Lead Updated', msg)}
          />
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-7 h-7 text-error" /></div>
              <h3 className="font-h3 text-on-surface mb-2">Delete Lead?</h3>
              <p className="font-body-md text-on-surface-variant mb-6">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">Cancel</button>
                <button onClick={confirmDelete} className="px-5 py-2.5 bg-error text-on-error rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">Delete</button>
              </div>
            </div>
          </div>
        )}

        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
    </Layout>
  );
};

// Edit Panel — slide-in from right, same structure as PatientIntakeForm
const EditPanel = ({ lead, onClose, onSave, onError, onSuccess }) => {
  const [formData, setFormData] = useState({
    uhid: lead.uhid || '',
    name: lead.name || '',
    dob: lead.dob ? lead.dob.split('T')[0] : '',
    age: '',
    contactNumber: lead.phone || '',
    alternateContact: lead.alternateContact || '',
    email: lead.email || '',
    pincode: lead.pincode || '',
    city: lead.city || '',
    state: lead.state || '',
    country: lead.country || 'India',
    address: lead.address || '',
    leadSource: lead.leadSource || '',
    status: lead.status || 'New',
    priority: lead.priority || 'Medium',
    remarks: lead.clinicalRemarks || '',
  });
  const [errors, setErrors] = useState({});
  const [uhidLoading, setUhidLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leadSources, setLeadSources] = useState([]);
  const [priorities, setPriorities] = useState(['High', 'Medium', 'Low']);
  const [statuses, setStatuses] = useState(['New', 'Contacted', 'Interested', 'Follow-up', 'Appointment Booked', 'Closed', 'Rejected']);
  const uhidTimerRef = useRef(null);
  const pincodeTimerRef = useRef(null);

  useEffect(() => {
    api.getLeadSources().then(res => {
      if (res?.data) {
        if (res.data.sources) setLeadSources(res.data.sources);
        if (res.data.priorities) setPriorities(res.data.priorities);
        if (res.data.statuses) setStatuses(res.data.statuses);
      }
    }).catch(() => {});
    if (formData.dob) calculateAge(formData.dob);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearError = (field) => setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  const setField = (field, value) => { setFormData(prev => ({ ...prev, [field]: value })); clearError(field); };

  const calculateAge = (dob) => {
    if (!dob || dob.length < 10) return;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    setFormData(prev => ({ ...prev, age: age > 0 ? `${age} YRS` : '' }));
  };

  const handleDobChange = (e) => {
    const dob = e.target.value;
    setFormData(prev => ({ ...prev, dob, age: '' }));
    clearError('dob');
    if (dob.length === 10) calculateAge(dob);
  };

  const handleUhidChange = (e) => {
    const uhid = e.target.value;
    setFormData(prev => ({ ...prev, uhid }));
    clearError('uhid');
    if (uhidTimerRef.current) clearTimeout(uhidTimerRef.current);
    if (uhid.length >= 4) {
      uhidTimerRef.current = setTimeout(async () => {
        setUhidLoading(true);
        try {
          const res = await api.getLeadByUhid(uhid);
          if (res?.data?.patient) {
            const p = res.data.patient;
            setFormData(prev => ({
              ...prev,
              name: p.name || prev.name,
              dob: p.dob ? p.dob.split('T')[0] : prev.dob,
              contactNumber: p.phone || prev.contactNumber,
              alternateContact: p.alternate_contact || prev.alternateContact,
              email: p.email || prev.email,
              pincode: p.pincode || prev.pincode,
              city: p.city || prev.city,
              state: p.state || prev.state,
              country: p.country || prev.country,
              address: p.address || prev.address,
            }));
            if (p.dob) calculateAge(p.dob.split('T')[0]);
          }
        } catch {} finally { setUhidLoading(false); }
      }, 2000);
    }
  };

  const handlePincodeChange = (e) => {
    const pincode = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, pincode, city: '', state: '', country: 'India' }));
    clearError('pincode');
    if (pincodeTimerRef.current) clearTimeout(pincodeTimerRef.current);
    if (pincode.length === 6) {
      pincodeTimerRef.current = setTimeout(async () => {
        setPincodeLoading(true);
        try {
          const resp = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
          const data = await resp.json();
          if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
            const po = data[0].PostOffice[0];
            setFormData(prev => ({ ...prev, city: po.District || po.Block || po.Name || '', state: po.State || '', country: 'India' }));
          } else {
            const local = pincodeData[pincode];
            if (local) setFormData(prev => ({ ...prev, city: local.city, state: local.state, country: local.country }));
          }
        } catch {
          const local = pincodeData[pincode];
          if (local) setFormData(prev => ({ ...prev, city: local.city, state: local.state, country: local.country }));
        } finally { setPincodeLoading(false); }
      }, 500);
    }
  };

  const validate = () => {
    const errs = {};
    // UHID is optional
    if (!formData.name.trim()) errs.name = 'Patient name is required';
    if (!formData.contactNumber.trim()) errs.contactNumber = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.contactNumber.replace(/\s/g, ''))) errs.contactNumber = 'Enter a valid 10-digit phone number';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Enter a valid email address';
    if (!formData.dob) errs.dob = 'Date of birth is required';
    else if (new Date(formData.dob) > new Date()) errs.dob = 'Date of birth cannot be in the future';
    if (!formData.leadSource) errs.leadSource = 'Lead source is required';
    if (!formData.address.trim()) errs.address = 'Address is required';
    if (!formData.pincode.trim()) errs.pincode = 'Pincode is required';
    if (!formData.city.trim()) errs.city = 'City is required';
    if (!formData.state.trim()) errs.state = 'State is required';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      const el = document.querySelector(`[data-edit-field="${firstKey}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    try {
      await api.updateLead(lead.id, {
        name: formData.name,
        uhid: formData.uhid,
        phone: formData.contactNumber,
        alternate_contact: formData.alternateContact,
        email: formData.email,
        dob: formData.dob,
        address: formData.address,
        pincode: formData.pincode,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        lead_source: formData.leadSource,
        status: formData.status,
        priority: formData.priority,
        clinical_remarks: formData.remarks,
      });
      if (onSuccess) onSuccess(`${formData.name} has been updated.`);
      onSave();
    } catch (err) {
      if (onError) onError(err.message || 'Failed to update lead.');
    } finally { setSubmitting(false); }
  };

  const fieldClass = (field) =>
    `w-full px-4 py-3 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 transition-all placeholder:text-on-surface-variant/50 ${
      errors[field] ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
    }`;
  const selectClass = (field) =>
    `w-full px-4 py-3 pr-10 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 transition-all appearance-none ${
      errors[field] ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
    }`;
  const readOnlyClass = 'w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container focus:outline-none';
  const ErrorMsg = ({ field }) => errors[field] ? <p className="font-caption text-error mt-1">{errors[field]}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-surface shadow-2xl flex flex-col h-full animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="font-h2 text-on-surface">Edit Lead</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container transition-colors"><X className="w-5 h-5 text-on-surface-variant" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* UHID */}
          <div data-edit-field="uhid">
            <label className="block font-caption text-on-surface-variant uppercase mb-1.5">UHID (UNIVERSAL ID)</label>
            <div className="relative">
              <input type="text" placeholder="Enter UHID" value={formData.uhid} onChange={handleUhidChange} className={fieldClass('uhid')} />
              {uhidLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" /></div>}
            </div>
            <ErrorMsg field="uhid" />
          </div>

          {/* Patient Name */}
          <div data-edit-field="name">
            <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Patient Name <span className="text-error">*</span></label>
            <input type="text" placeholder="Enter full name" value={formData.name} onChange={(e) => setField('name', e.target.value)} className={fieldClass('name')} />
            <ErrorMsg field="name" />
          </div>

          {/* DOB + Age + Lead Source */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div data-edit-field="dob">
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Date of Birth <span className="text-error">*</span></label>
              <input type="date" value={formData.dob} onChange={handleDobChange} className={fieldClass('dob')} />
              {formData.age && <p className="font-caption text-secondary mt-1 font-bold">{formData.age}</p>}
              <ErrorMsg field="dob" />
            </div>
            <div data-edit-field="leadSource">
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Lead Source <span className="text-error">*</span></label>
              <div className="relative">
                <select value={formData.leadSource} onChange={(e) => setField('leadSource', e.target.value)} className={selectClass('leadSource')}>
                  <option value="">Select lead source</option>
                  {leadSources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              </div>
              <ErrorMsg field="leadSource" />
            </div>
            <div>
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Priority</label>
              <div className="relative">
                <select value={formData.priority} onChange={(e) => setField('priority', e.target.value)} className={selectClass('priority')}>
                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Status</label>
            <div className="relative w-full sm:w-1/3">
              <select value={formData.status} onChange={(e) => setField('status', e.target.value)} className={selectClass('status')}>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-edit-field="contactNumber">
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Phone Number <span className="text-error">*</span></label>
              <input type="tel" placeholder="9876543210" maxLength={10} value={formData.contactNumber} onChange={(e) => setField('contactNumber', e.target.value.replace(/\D/g, ''))} className={fieldClass('contactNumber')} />
              <ErrorMsg field="contactNumber" />
            </div>
            <div>
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Alternate Number</label>
              <input type="tel" placeholder="9876543210" maxLength={10} value={formData.alternateContact} onChange={(e) => setField('alternateContact', e.target.value.replace(/\D/g, ''))} className={fieldClass('alternateContact')} />
            </div>
          </div>

          {/* Email */}
          <div data-edit-field="email">
            <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Email ID <span className="text-error">*</span></label>
            <input type="email" placeholder="example@email.com" value={formData.email} onChange={(e) => setField('email', e.target.value)} className={fieldClass('email')} />
            <ErrorMsg field="email" />
          </div>

          {/* Address */}
          <div className="bg-surface-container rounded-xl p-5 space-y-4">
            <h3 className="font-h3 text-on-surface flex items-center gap-2">
              <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Address Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div data-edit-field="pincode">
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Pincode <span className="text-error">*</span></label>
                <div className="relative">
                  <input type="text" placeholder="110001" maxLength={6} value={formData.pincode} onChange={handlePincodeChange} className={fieldClass('pincode')} />
                  {pincodeLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" /></div>}
                </div>
                <ErrorMsg field="pincode" />
              </div>
              <div data-edit-field="city">
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">City <span className="text-error">*</span></label>
                <input type="text" value={formData.city} readOnly className={readOnlyClass} placeholder="Auto-fills" />
                <ErrorMsg field="city" />
              </div>
              <div data-edit-field="state">
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">State <span className="text-error">*</span></label>
                <input type="text" value={formData.state} readOnly className={readOnlyClass} placeholder="Auto-fills" />
                <ErrorMsg field="state" />
              </div>
              <div>
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Country</label>
                <input type="text" value={formData.country} readOnly className={readOnlyClass} placeholder="Auto-fills" />
              </div>
            </div>
            <div data-edit-field="address">
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Residential Address <span className="text-error">*</span></label>
              <input type="text" placeholder="Flat/House No., Building Name, Street" value={formData.address} onChange={(e) => setField('address', e.target.value)} className={fieldClass('address')} />
              <ErrorMsg field="address" />
            </div>
          </div>

          {/* Clinical Remarks */}
          <div>
            <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Clinical Remarks</label>
            <textarea rows={3} placeholder="Add any relevant clinical notes or remarks" value={formData.remarks} onChange={(e) => setField('remarks', e.target.value)} className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50 resize-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
          <button onClick={onClose} className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">Discard Changes</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// View Lead Modal with History
const ViewLeadModal = ({ lead, avatarColors, priorityColors, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    api.getLeadHistory(lead.id).then(res => {
      if (res?.data?.history) setHistory(res.data.history);
    }).catch(() => {}).finally(() => setLoadingHistory(false));
  }, [lead.id]);

  const actionLabels = {
    created: 'Lead Created',
    status_changed: 'Status Changed',
    priority_changed: 'Priority Changed',
    reassigned: 'Reassigned',
    notes_updated: 'Notes Updated',
    auto_assigned: 'Auto-Assigned',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <h3 className="font-h2 text-on-surface">Patient Details</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container transition-colors"><X className="w-5 h-5 text-on-surface-variant" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-h3 ${avatarColors[lead.status]}`}>{lead.initials}</div>
            <div>
              <p className="font-h3 text-on-surface">{lead.name}</p>
              <p className="font-body-md text-on-surface-variant">{lead.uhid || 'No UHID'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: <Phone className="w-4 h-4 text-secondary" />, label: 'Phone', value: lead.phone },
              { icon: <Phone className="w-4 h-4 text-secondary" />, label: 'Alternate', value: lead.alternateContact || '—' },
              { icon: <Mail className="w-4 h-4 text-secondary" />, label: 'Email', value: lead.email },
              { icon: <Calendar className="w-4 h-4 text-secondary" />, label: 'DOB', value: lead.dob ? new Date(lead.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
              { icon: <MapPin className="w-4 h-4 text-secondary" />, label: 'Address', value: [lead.address, lead.city, lead.state, lead.country].filter(Boolean).join(', ') || '—' },
              { icon: <User className="w-4 h-4 text-secondary" />, label: 'Assigned To', value: lead.assignedTo || '—' },
              { icon: <FileText className="w-4 h-4 text-secondary" />, label: 'Lead Source', value: lead.leadSource || '—' },
              { icon: <AlertTriangle className="w-4 h-4 text-secondary" />, label: 'Priority', value: <span className={priorityColors[lead.priority]}>{lead.priority}</span> },
              { icon: <Clock className="w-4 h-4 text-secondary" />, label: 'Created', value: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                {item.icon}
                <div>
                  <p className="font-caption text-on-surface-variant uppercase">{item.label}</p>
                  <p className="font-body-md text-on-surface">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
          {lead.clinicalRemarks && (
            <div>
              <p className="font-caption text-on-surface-variant uppercase mb-1">Clinical Remarks</p>
              <p className="font-body-md text-on-surface bg-surface-container rounded-lg p-3">{lead.clinicalRemarks}</p>
            </div>
          )}

          {/* Lead History */}
          <div className="border-t border-outline-variant pt-4">
            <h4 className="font-h3 text-on-surface mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-secondary" /> Activity History
            </h4>
            {loadingHistory ? (
              <p className="font-body-sm text-on-surface-variant">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="font-body-sm text-on-surface-variant">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 p-3 bg-surface-container rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-secondary mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-body-md text-on-surface font-bold">{actionLabels[h.action] || h.action}</p>
                      {h.old_value && h.new_value && (
                        <p className="font-body-sm text-on-surface-variant mt-0.5">
                          <span className="line-through">{h.old_value}</span> → <span className="font-bold">{h.new_value}</span>
                        </p>
                      )}
                      {h.new_value && !h.old_value && (
                        <p className="font-body-sm text-on-surface-variant mt-0.5">{h.new_value}</p>
                      )}
                      <p className="font-caption text-on-surface-variant mt-1">
                        {h.changed_by_name && `by ${h.changed_by_name} • `}
                        {new Date(h.created_at).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadBox;
