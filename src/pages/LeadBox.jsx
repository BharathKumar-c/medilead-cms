import {useState, useMemo, useEffect, useRef, useCallback} from 'react';
import {
  Filter,
  Edit,
  X,
  UserPlus,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  CircleCheck,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Mail,
  MapPin,
  FileText,
  User,
  Clock,
  ChevronDown,
  CalendarDays,
  Users,
  UserCircle,
  List,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import {leadBoxMetrics as defaultMetrics, pincodeData} from '../data/mockData';
import api from '../services/api';
import Toast from '../components/Toast';

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '—';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
  if (diffDays <= 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return then.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DEFAULT_PAGE_SIZE = 10;

const mapLead = (l) => ({
  id: l.id,
  code: l.code || '',
  name: l.name,
  initials: (
    l.initials ||
    l.name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
  ).toUpperCase(),
  uhid: l.uhid,
  lastCallDate: l.last_call_date,
  status: l.status,
  leadSource: l.lead_source,
  phone: l.phone || '',
  gender: l.gender || '',
  area: l.area || '',
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
  branchId: l.branch_id || '',
  branchName: l.branch_name || '',
  assignedTo: l.assigned_to_name || '',
  assignedToId: l.assigned_to || '',
  assignedBy: l.assigned_by_name || '',
  createdByName: l.created_by_name || '',
  createdAt: l.created_at,
  followUpDate: l.follow_up_date || '',
  createdBy: l.created_by || '',
});

let toastId = 0;

const LeadBox = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [statuses, setStatuses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalItems, setTotalItems] = useState(0);
  const [viewMode, setViewMode] = useState('all'); // 'today' | 'my' | 'all'
  const [viewLead, setViewLead] = useState(null);
  const [editLead, setEditLead] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [assignLead, setAssignLead] = useState(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [dateRange, setDateRange] = useState('all'); // 'today' | 'month' | 'all'
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const filterRef = useRef(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, {id, type, title, message}]);
  };
  const removeToast = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // Debounce search term: only trigger API calls 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const page = currentPage;
      const limit = pageSize;
      const params = {page, limit, view: viewMode};
      if (debouncedSearchTerm) {
        params.search = debouncedSearchTerm;
      }
      if (statusFilter !== 'All') {
        params.status = statusFilter;
      }

      const [leadsRes, metricsRes] = await Promise.all([
        api.getLeads(params),
        api.getLeadMetrics({range: dateRange}),
      ]);
      if (leadsRes.data) {
        setLeads(leadsRes.data.leads.map(mapLead));
        setTotalItems(leadsRes.data.pagination?.total ?? leadsRes.data.leads.length);
      }
      if (metricsRes?.data) setMetrics(metricsRes.data);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, debouncedSearchTerm, statusFilter, currentPage, pageSize, dateRange]);

  // Fetch leads when any filter/page/view/search changes
  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Also fetch master data on mount
  useEffect(() => {
    api
      .getLeadStatuses()
      .then((res) => {
        if (res?.data?.statuses) setStatuses(res.data.statuses);
      })
      .catch(() => {});
    const isAdmin =
      user?.roles?.includes('super_admin') ||
      user?.role === 'super_admin' ||
      user?.roles?.includes('manager') ||
      user?.role === 'manager';
    if (isAdmin) {
      api
        .getUsers()
        .then((res) => {
          if (res?.data?.users) setUsers(res.data.users);
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable ref for loadLeads to avoid re-registering the event listener
  const loadLeadsRef = useRef(loadLeads);
  loadLeadsRef.current = loadLeads;

  // Listen for leadCreated events to refresh the list
  useEffect(() => {
    const handler = () => loadLeadsRef.current();
    window.addEventListener('leadCreated', handler);
    return () => window.removeEventListener('leadCreated', handler);
  }, []);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
        setFilterSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pagination calculations — all filtering is now server-side
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const displayLeads = leads;

  const handleView = (lead) => setViewLead(lead);
  const handleEdit = (lead) => setEditLead(lead);
  const handleDelete = (lead) => setDeleteConfirm(lead);

  const confirmDelete = async () => {
    try {
      await api.deleteLead(deleteConfirm.id);
      setDeleteConfirm(null);
      addToast(
        'success',
        'Lead Deleted',
        `${deleteConfirm.name} has been removed.`,
      );
      if (displayLeads.length === 1 && currentPage > 1)
        setCurrentPage((p) => p - 1);
      loadLeads();
    } catch (err) {
      addToast(
        'error',
        'Delete Failed',
        err.message || 'Could not delete lead.',
      );
    }
  };

  const handleAssign = async () => {
    if (!assignUserId || !assignLead) return;
    try {
      await api.assignLead(assignLead.id, parseInt(assignUserId));
      const agentName =
        users.find((u) => u.id === parseInt(assignUserId))?.name || 'agent';
      addToast(
        'success',
        'Lead Assigned',
        `${assignLead.name} assigned to ${agentName}.`,
      );
      setAssignLead(null);
      setAssignUserId('');
      loadLeads();
    } catch (err) {
      addToast(
        'error',
        'Assign Failed',
        err.message || 'Could not assign lead.',
      );
    }
  };

  const statusColors = {
    New: 'bg-secondary/10 text-secondary border border-secondary/20',
    Contacted:
      'bg-on-tertiary-container/10 text-on-tertiary-container border border-on-tertiary-container/20',
    Interested:
      'bg-secondary-fixed/10 text-secondary border border-secondary-fixed/20',
    'Follow-up':
      'bg-on-tertiary-container/10 text-on-tertiary-container border border-on-tertiary-container/20',
    'Appointment Booked':
      'bg-on-tertiary-container/10 text-on-tertiary-container border border-on-tertiary-container/20',
    Closed:
      'bg-surface-container-high text-on-surface-variant border border-outline-variant',
    Rejected: 'bg-error/10 text-error border border-error/20',
  };
  const avatarColors = {
    New: 'bg-secondary text-white',
    Contacted: 'bg-on-tertiary-container text-white',
    Interested: 'bg-secondary text-white',
    'Follow-up': 'bg-on-tertiary-container text-white',
    'Appointment Booked': 'bg-on-tertiary-container text-white',
    Closed: 'bg-outline-variant text-on-surface-variant',
    Rejected: 'bg-error text-white',
  };
  const priorityColors = {
    High: 'text-error font-bold',
    Medium: 'text-on-tertiary-container font-bold',
    Low: 'text-on-surface-variant',
  };

  return (
    <Layout title="Lead Box">
      <div className="p-4 sm:p-6 lg:p-10 data-stage">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h1 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background">
            Lead Box
          </h1>
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            {[
              {key: 'today', label: 'Today'},
              {key: 'month', label: 'This Month'},
              {key: 'all', label: 'All'},
            ].map((btn, i) => (
              <button
                key={btn.key}
                onClick={() => {
                  setDateRange(btn.key);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 font-body-md font-bold transition-all ${
                  dateRange === btn.key
                    ? 'bg-secondary text-on-secondary'
                    : 'text-on-surface-variant hover:bg-surface-container'
                } ${i > 0 ? 'border-l border-outline-variant' : ''}`}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            {
              label:
                dateRange === 'today'
                  ? 'New Leads Today'
                  : dateRange === 'month'
                    ? 'New Leads (This Month)'
                    : 'New Leads Today',
              value: metrics.newLeadsToday ?? 0,
              border: 'border-t-secondary',
              icon: <UserPlus className="w-5 h-5 text-secondary" />,
            },
            {
              label:
                dateRange === 'today'
                  ? 'Overall (Today)'
                  : dateRange === 'month'
                    ? 'Overall (This Month)'
                    : 'Overall Leads',
              value: metrics.totalLeads ?? 0,
              border: 'border-t-primary',
              icon: <List className="w-5 h-5 text-primary" />,
            },
            {
              label:
                dateRange === 'today'
                  ? 'Follow-ups (Today)'
                  : dateRange === 'month'
                    ? 'Follow-ups (This Month)'
                    : 'Follow-up Leads',
              value: metrics.alreadyLeads ?? 0,
              border: 'border-t-on-tertiary-container',
              icon: <Phone className="w-5 h-5 text-on-tertiary-container" />,
            },
            {
              label:
                dateRange === 'today'
                  ? "Today's Conversion"
                  : dateRange === 'month'
                    ? "Month's Conversion"
                    : 'Conversion Rate',
              value: metrics.conversionRate ?? '0%',
              border: 'border-t-secondary-fixed',
              icon: (
                <CircleCheck className="w-5 h-5 text-secondary-fixed-dim" />
              ),
            },
          ].map((card, i) => (
            <div
              key={i}
              className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-5 metric-card-accent ${card.border} shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-caption text-on-surface-variant">
                  {card.label}
                </span>
                {card.icon}
              </div>
              <div className="font-h2 text-on-surface">{card.value}</div>
            </div>
          ))}
        </div>

        {/* View Mode Buttons + Search & Filter Bar */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                key: 'today',
                label: 'Today Leads',
                icon: <CalendarDays className="w-4 h-4" />,
              },
              {
                key: 'my',
                label: 'My Leads',
                icon: <UserCircle className="w-4 h-4" />,
              },
              {
                key: 'all',
                label: 'All Leads',
                icon: <List className="w-4 h-4" />,
              },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => {
                  setViewMode(btn.key);
                  setStatusFilter('All');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body-md font-bold transition-all ${
                  viewMode === btn.key
                    ? 'bg-secondary text-on-secondary shadow-sm'
                    : 'border border-outline-variant text-on-surface bg-surface-container-lowest hover:bg-surface-container'
                }`}>
                {btn.icon} {btn.label}
              </button>
            ))}
            <span className="font-caption text-on-surface-variant ml-1">
              {totalItems} lead{totalItems !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search by name, UHID, code, email, phone, city, or state..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50"
              />
            </div>
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => {
                  setFilterOpen(!filterOpen);
                  setFilterSearch('');
                }}
                className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest hover:bg-surface-container transition-all w-full sm:w-auto justify-between">
                <Filter className="w-4 h-4" /> {statusFilter}{' '}
                <ChevronDown className="w-4 h-4" />
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-10 py-1">
                  <div className="px-3 py-2 border-b border-outline-variant">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
                      <input
                        type="text"
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        placeholder="Search status..."
                        className="w-full pl-8 pr-3 py-1.5 border border-outline-variant rounded-lg font-body-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary transition-all"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {['All', ...statuses]
                      .filter((s) =>
                        s.toLowerCase().includes(filterSearch.toLowerCase()),
                      )
                      .map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setStatusFilter(s);
                            setCurrentPage(1);
                            setFilterOpen(false);
                            setFilterSearch('');
                          }}
                          className={`block w-full text-left px-4 py-2 font-body-md hover:bg-surface-container transition-colors ${statusFilter === s ? 'text-secondary font-bold' : 'text-on-surface'}`}>
                          {s}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="px-3 py-3 text-center font-label-caps text-on-surface-variant w-12">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">
                    Lead Code
                  </th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">
                    Patient Name
                  </th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">
                    Branch
                  </th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">
                    Created By
                  </th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="zebra-striping">
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-12 text-center font-body-md text-on-surface-variant">
                      Loading leads...
                    </td>
                  </tr>
                ) : displayLeads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-12 text-center font-body-md text-on-surface-variant">
                      No leads found.
                    </td>
                  </tr>
                ) : (
                  displayLeads.map((lead, idx) => (
                    <tr
                      key={lead.id}
                      onClick={() => handleView(lead)}
                      className="border-t border-outline-variant/50 hover:bg-surface-container/50 transition-colors cursor-pointer">
                      <td
                      className="px-3 py-3 text-center font-data-tabular text-on-surface-variant text-sm">
                        {(safePage - 1) * pageSize + idx + 1}

                      </td>
                      <td className="px-4 py-3">
                        <span className="font-data-tabular text-sm font-bold text-secondary">
                          {lead.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-body-md text-on-surface font-bold">
                          {lead.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-data-tabular text-on-surface-variant">
                        {lead.phone || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-3 py-1 rounded-full font-caption font-bold text-xs ${statusColors[lead.status]}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            priorityColors[lead.priority] ||
                            'font-caption text-on-surface-variant'
                          }>
                          {lead.priority || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-body-md text-on-surface-variant">
                        {lead.branchName || '—'}
                      </td>
                      <td className="px-4 py-3 font-body-md text-on-surface-variant">
                        {lead.createdByName || '—'}
                      </td>
                      <td className="px-4 py-3 font-body-md text-on-surface-variant">
                        {lead.assignedTo || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(lead); }}
                            className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                            title="Edit">
                            <Edit className="w-4 h-4 text-on-surface-variant" />
                          </button>
                          <button
                            onClick={() => {
                              setAssignLead(lead);
                              setAssignUserId(String(lead.assignedToId || ''));
                            }}
                            className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                            title="Assign Agent">
                            <User className="w-4 h-4 text-on-surface-variant" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={safePage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* View Modal */}
        {viewLead && (
          <ViewLeadModal
            lead={viewLead}
            statusColors={statusColors}
            priorityColors={priorityColors}
            onClose={() => setViewLead(null)}
          />
        )}

        {/* Edit Slide-in Panel */}
        {editLead && (
          <EditPanel
            lead={editLead}
            onClose={() => setEditLead(null)}
            onSave={() => {
              setEditLead(null);
              loadLeads();
            }}
            onError={(msg) => addToast('error', 'Update Failed', msg)}
            onSuccess={(msg) => addToast('success', 'Lead Updated', msg)}
          />
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setDeleteConfirm(null)}
            />
            <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-error" />
              </div>
              <h3 className="font-h3 text-on-surface mb-2">Delete Lead?</h3>
              <p className="font-body-md text-on-surface-variant mb-6">
                Are you sure you want to delete{' '}
                <strong>{deleteConfirm.name}</strong>? This action cannot be
                undone.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-5 py-2.5 bg-error text-on-error rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Agent Popup */}
        {assignLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
              onClick={() => {
                setAssignLead(null);
                setAssignUserId('');
              }}
            />
            <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-h1 text-lg text-on-surface">
                  Assign Agent
                </h3>
                <button
                  onClick={() => {
                    setAssignLead(null);
                    setAssignUserId('');
                  }}
                  className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
                  <X className="w-5 h-5 text-on-surface-variant" />
                </button>
              </div>
              <p className="font-body-md text-on-surface-variant mb-4">
                Assign <strong>{assignLead.name}</strong> ({assignLead.code}) to
                an agent:
              </p>
              <div className="mb-6">
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5 inline-flex items-center gap-1 leading-none">
                  Select Agent{' '}
                  <span className="text-error text-base font-bold leading-none">
                    *
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all appearance-none pr-10">
                    <option value="">Select an agent</option>
                    {users
                      .filter((u) => u.is_active !== false)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setAssignLead(null);
                    setAssignUserId('');
                  }}
                  className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!assignUserId}
                  className="px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  Assign
                </button>
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
const EditPanel = ({lead, onClose, onSave, onError, onSuccess}) => {
  const [formData, setFormData] = useState({
    uhid: lead.uhid || '',
    name: lead.name || '',
    dob: lead.dob ? lead.dob.split('T')[0] : '',
    age: '',
    gender: lead.gender || '',
    contactNumber: lead.phone || '',
    alternateContact: lead.alternateContact || '',
    email: lead.email || '',
    pincode: lead.pincode || '',
    area: lead.area || '',
    city: lead.city || '',
    state: lead.state || '',
    country: lead.country || 'India',
    address: lead.address || '',
    branchId: lead.branchId || '',
    leadSource: lead.leadSource || '',
    status: lead.status || 'New',
    priority: lead.priority || 'Medium',
    remarks: lead.clinicalRemarks || '',
  });
  const [errors, setErrors] = useState({});
  const [areas, setAreas] = useState([]);
  const [uhidLoading, setUhidLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leadSources, setLeadSources] = useState([]);
  const [branches, setBranches] = useState([]);
  const [priorities, setPriorities] = useState(['High', 'Medium', 'Low']);
  const [statuses, setStatuses] = useState(['Appointment Booked']);
  const uhidTimerRef = useRef(null);
  const pincodeTimerRef = useRef(null);

  useEffect(() => {
    api
      .getLeadSources()
      .then((res) => {
        if (res?.data) {
          if (res.data.sources) setLeadSources(res.data.sources);
          if (res.data.priorities) setPriorities(res.data.priorities);
          if (res.data.statuses) setStatuses(res.data.statuses);
        }
      })
      .catch(() => {});
    api
      .getBranches()
      .then((res) => {
        if (res?.data?.branches) setBranches(res.data.branches);
      })
      .catch(() => {});
    if (formData.dob) {
      const age = calculateAge(formData.dob);
      if (age) {
        setFormData((prev) => ({...prev, age: String(age)}));
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearError = (field) =>
    setErrors((prev) => {
      const next = {...prev};
      delete next[field];
      return next;
    });
  const setField = (field, value) => {
    setFormData((prev) => ({...prev, [field]: value}));
    clearError(field);
  };

  const calculateAge = (dob) => {
    if (!dob || dob.length < 10) return;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    )
      age--;
    return age > 0 ? age : '';
  };

  const handleDobChange = (e) => {
    const dob = e.target.value;
    clearError('dob');
    const age = calculateAge(dob);
    setFormData((prev) => ({...prev, dob, age: age ? String(age) : ''}));
  };

  const handleAgeChange = (e) => {
    const ageStr = e.target.value.replace(/\D/g, '').slice(0, 3);
    clearError('age');
    if (ageStr) {
      const ageNum = parseInt(ageStr, 10);
      const birthYear = new Date().getFullYear() - ageNum;
      const dobFromAge = `${birthYear}-01-01`;
      setFormData((prev) => ({...prev, age: ageStr, dob: dobFromAge}));
    } else {
      setFormData((prev) => ({...prev, age: '', dob: ''}));
    }
  };

  const handleUhidChange = (e) => {
    const uhid = e.target.value;
    setFormData((prev) => ({...prev, uhid}));
    clearError('uhid');
    if (uhidTimerRef.current) clearTimeout(uhidTimerRef.current);
    if (uhid.length >= 4) {
      uhidTimerRef.current = setTimeout(async () => {
        setUhidLoading(true);
        try {
          const res = await api.getLeadByUhid(uhid);
          if (res?.data?.patient) {
            const p = res.data.patient;
            setFormData((prev) => ({
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
        } catch {
        } finally {
          setUhidLoading(false);
        }
      }, 2000);
    }
  };

  const handlePincodeChange = (e) => {
    const pincode = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({
      ...prev,
      pincode,
      area: '',
      city: '',
      state: '',
      country: 'India',
    }));
    setAreas([]);
    clearError('pincode');
    if (pincodeTimerRef.current) clearTimeout(pincodeTimerRef.current);
    if (pincode.length === 6) {
      pincodeTimerRef.current = setTimeout(async () => {
        setPincodeLoading(true);
        try {
          const resp = await api.lookupPincode(pincode);
          const d = resp?.data;
          if (d?.areas?.length > 0) {
            setAreas(d.areas);
            setFormData((prev) => ({
              ...prev,
              area: d.areas.length === 1 ? d.areas[0] : '',
              city: d.city || '',
              state: d.state || '',
              country: d.country || 'India',
            }));
          } else {
            applyPincodeFallback(pincode);
          }
        } catch {
          applyPincodeFallback(pincode);
        } finally {
          setPincodeLoading(false);
        }
      }, 500);
    }
  };

  const applyPincodeFallback = (pincode) => {
    const local = pincodeData[pincode];
    if (local) {
      const areas = local.areas || [local.city];
      setAreas(areas);
      setFormData((prev) => ({
        ...prev,
        area: areas.length === 1 ? areas[0] : '',
        city: local.city || '',
        state: local.state || '',
        country: local.country || 'India',
      }));
    }
  };

  const validate = () => {
    const errs = {};
    // Patient Name: mandatory, min 2 chars, only valid name characters
    if (!formData.name.trim()) errs.name = 'Patient name is required';
    else if (formData.name.trim().length < 2)
      errs.name = 'Name must be at least 2 characters';
    else if (!/^[a-zA-Z\s.'-]+$/.test(formData.name.trim()))
      errs.name = 'Name contains invalid characters';
    // Phone: mandatory, 10 digits
    if (!formData.contactNumber.trim())
      errs.contactNumber = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.contactNumber.replace(/\s/g, '')))
      errs.contactNumber = 'Enter a valid 10-digit phone number';
    // Branch: mandatory
    if (!formData.branchId) errs.branchId = 'Branch is required';
    // Remarks: mandatory, min 2 chars
    if (!formData.remarks.trim()) errs.remarks = 'Remarks are required';
    else if (formData.remarks.trim().length < 2)
      errs.remarks = 'Remarks must be at least 2 characters';
    // Optional fields - validate format only if provided
    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    )
      errs.email = 'Enter a valid email address';
    if (formData.dob && new Date(formData.dob) > new Date())
      errs.dob = 'Date of birth cannot be in the future';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      const el = document.querySelector(`[data-field="${firstKey}"]`);
      if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
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
        gender: formData.gender,
        address: formData.address,
        area: formData.area || null,
        pincode: formData.pincode,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        lead_source: formData.leadSource,
        branch_id: formData.branchId || null,
        status: formData.status,
        priority: formData.priority,
        clinical_remarks: formData.remarks,
      });
      if (onSuccess) onSuccess(`${formData.name} has been updated.`);
      onSave();
    } catch (err) {
      if (onError) onError(err.message || 'Failed to update lead.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (field) =>
    `w-full px-4 py-3 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 transition-all placeholder:text-on-surface-variant/50 ${
      errors[field]
        ? 'border-error focus:border-error focus:ring-error/20'
        : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
    }`;
  const readOnlyClass =
    'w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container focus:outline-none';
  const ErrorMsg = ({field}) =>
    errors[field] ? (
      <p className="font-caption text-error mt-1">{errors[field]}</p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative ml-auto w-full max-w-2xl bg-surface shadow-2xl flex flex-col h-full animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="font-h2 text-on-surface">Edit Lead</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container transition-colors">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* UHID */}
          <div data-field="uhid">
            <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
              UHID (UNIVERSAL ID)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter UHID"
                value={formData.uhid}
                onChange={handleUhidChange}
                className={fieldClass('uhid')}
              />
              {uhidLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <ErrorMsg field="uhid" />
          </div>

          {/* Patient Name */}
          <div data-field="name">
            <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
              Patient Name <span className="text-error text-base font-bold leading-none">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter full name"
              value={formData.name}
              onChange={(e) => setField('name', e.target.value)}
              className={fieldClass('name')}
            />
            <ErrorMsg field="name" />
          </div>

          {/* Branch */}
          <SearchableSelect
            label="Branch"
            required
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            value={formData.branchId}
            onChange={(val) => setField('branchId', val)}
            placeholder="Select Branch"
            error={errors.branchId}
          />

          {/* DOB + Age */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-field="dob">
              <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={handleDobChange}
                className={fieldClass('dob')}
              />
              <ErrorMsg field="dob" />
            </div>
            <div data-field="age">
              <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                Age
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 35"
                value={formData.age}
                onChange={handleAgeChange}
                className={fieldClass('age')}
                maxLength={3}
              />
              <ErrorMsg field="age" />
            </div>
          </div>

          {/* Gender */}
          <SearchableSelect
            label="Gender"
            options={['Male', 'Female', 'Other']}
            value={formData.gender}
            onChange={(val) => setField('gender', val)}
            placeholder="Select gender"
            error={errors.gender}
          />

          {/* Lead Source + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SearchableSelect
              label="Lead Source"
              options={leadSources}
              value={formData.leadSource}
              onChange={(val) => setField('leadSource', val)}
              placeholder="Select lead source"
              error={errors.leadSource}
            />
            <SearchableSelect
              label="Priority"
              options={priorities}
              value={formData.priority}
              onChange={(val) => setField('priority', val)}
              placeholder="Select priority"
            />
          </div>

          {/* Status */}
          <SearchableSelect
            label="Status"
            required
            options={statuses}
            value={formData.status}
            onChange={(val) => setField('status', val)}
            placeholder="Select status"
            error={errors.status}
          />

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-field="contactNumber">
              <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                Phone Number <span className="text-error text-base font-bold leading-none">*</span>
              </label>
              <input
                type="tel"
                placeholder="9876543210"
                maxLength={10}
                value={formData.contactNumber}
                onChange={(e) =>
                  setField('contactNumber', e.target.value.replace(/\D/g, ''))
                }
                className={fieldClass('contactNumber')}
              />
              <ErrorMsg field="contactNumber" />
            </div>
            <div>
              <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                Alternate Number
              </label>
              <input
                type="tel"
                placeholder="9876543210"
                maxLength={10}
                value={formData.alternateContact}
                onChange={(e) =>
                  setField(
                    'alternateContact',
                    e.target.value.replace(/\D/g, ''),
                  )
                }
                className={fieldClass('alternateContact')}
              />
            </div>
          </div>

          {/* Email */}
          <div data-field="email">
            <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
              Email ID
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={(e) => setField('email', e.target.value)}
              className={fieldClass('email')}
            />
            <ErrorMsg field="email" />
          </div>

          {/* Address */}
          <div className="bg-surface-container rounded-xl p-5 space-y-4">
            <h3 className="font-h3 text-on-surface flex items-center gap-2 mb-1">
              <svg
                className="w-5 h-5 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Address Details
            </h3>
            {/* Row 1: Pincode + Area */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div data-field="pincode">
                <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                  Pincode
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="110001"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={handlePincodeChange}
                    className={fieldClass('pincode')}
                  />
                  {pincodeLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <ErrorMsg field="pincode" />
              </div>
              <div className="sm:col-span-3">
                <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                  Area
                </label>
                {areas.length > 1 ? (
                  <SearchableSelect
                    options={areas}
                    value={formData.area}
                    onChange={(val) => setField('area', val)}
                    placeholder="Select area"
                  />
                ) : (
                  <input
                    type="text"
                    value={formData.area}
                    readOnly
                    className={readOnlyClass}
                    placeholder="Auto-fills"
                  />
                )}
              </div>
            </div>

            {/* Row 2: City + State + Country */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div data-field="city">
                <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  readOnly
                  className={readOnlyClass}
                  placeholder="Auto-fills"
                />
                <ErrorMsg field="city" />
              </div>
              <div data-field="state">
                <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  readOnly
                  className={readOnlyClass}
                  placeholder="Auto-fills"
                />
                <ErrorMsg field="state" />
              </div>
              <div>
                <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  readOnly
                  className={readOnlyClass}
                  placeholder="Auto-fills"
                />
              </div>
            </div>

            {/* Row 3: Residential Address */}
            <div data-field="address">
              <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                Residential Address
              </label>
              <input
                type="text"
                placeholder="Flat/House No., Building Name, Street"
                value={formData.address}
                onChange={(e) => setField('address', e.target.value)}
                className={fieldClass('address')}
              />
              <ErrorMsg field="address" />
            </div>
          </div>

          {/* Remarks */}
          <div data-field="remarks">
            <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
              Remarks <span className="text-error text-base font-bold leading-none">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Add any relevant clinical notes or remarks"
              value={formData.remarks}
              onChange={(e) => setField('remarks', e.target.value)}
              className={fieldClass('remarks') + ' resize-none'}
            />
            <ErrorMsg field="remarks" />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">
            Discard Changes
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// View Lead Slide-Over Panel
const ViewLeadModal = ({lead, statusColors, priorityColors, onClose}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [callHistory, setCallHistory] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(true);

  useEffect(() => {
    api
      .getLeadHistory(lead.id)
      .then((res) => {
        if (res?.data?.history) setHistory(res.data.history);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
    if (lead.phone) {
      api
        .getCallHistoryByPhone(lead.phone)
        .then((res) => {
          if (res?.data?.calls) setCallHistory(res.data.calls);
        })
        .catch(() => {})
        .finally(() => setLoadingCalls(false));
    } else {
      setLoadingCalls(false);
    }
  }, [lead.id, lead.phone]);

  const actionLabels = {
    created: 'Lead Created',
    assigned: 'Lead Assigned',
    status_changed: 'Status Changed',
    priority_changed: 'Priority Changed',
    reassigned: 'Reassigned',
    notes_updated: 'Notes Updated',
    auto_assigned: 'Auto-Assigned',
  };

  const Row = ({label, value}) => (
    <div className="flex items-baseline gap-2 py-1.5">
      <span className="w-28 flex-shrink-0 font-caption text-on-surface-variant uppercase text-xs tracking-wide">
        {label}
      </span>
      <span className="font-body-md text-on-surface">{value || '—'}</span>
    </div>
  );

  const priorityColor =
    priorityColors[lead.priority] || 'text-on-surface-variant';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-surface shadow-2xl flex flex-col h-full animate-slide-in z-10 overflow-hidden">
        {/* ─── Header ─── */}
        <div className="flex items-start justify-between px-8 py-6 border-b border-outline-variant bg-surface-container-lowest">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-data-tabular text-xs font-bold px-2 py-0.5 rounded bg-secondary/10 text-secondary">
                {lead.code}
              </span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full font-caption font-bold text-xs ${statusColors[lead.status] || ''}`}>
                {lead.status}
              </span>
            </div>
            <h2 className="font-h1 text-2xl text-on-surface truncate">
              {lead.name}
            </h2>
            <p className="font-body-sm text-on-surface-variant mt-0.5">
              {lead.branchName || 'No branch'} ·{' '}
              {lead.createdByName ? `Created by ${lead.createdByName}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container-high transition-colors flex-shrink-0 ml-4">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* ─── Key Info Bar ─── */}
        <div className="px-8 py-4 bg-surface-container-lowest border-b border-outline-variant">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-secondary" />
              <span className="font-data-tabular text-on-surface font-bold">
                {lead.phone || '—'}
              </span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-on-surface-variant" />
                <span className="font-body-md text-on-surface-variant">
                  {lead.email}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-caption text-on-surface-variant uppercase text-xs">
                Priority
              </span>
              <span className={`font-body-md font-bold ${priorityColor}`}>
                {lead.priority || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-caption text-on-surface-variant uppercase text-xs">
                Source
              </span>
              <span className="font-body-md text-on-surface">
                {lead.leadSource || '—'}
              </span>
            </div>
            {lead.assignedTo && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-on-surface-variant" />
                <span className="font-body-md text-on-surface-variant">
                  {lead.assignedTo}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex px-8 border-b border-outline-variant gap-6">
          {[
            {key: 'details', label: 'Details'},
            {key: 'activity', label: `Activity (${history.length})`},
            {key: 'calls', label: `Calls (${callHistory.length})`},
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 font-body-md font-bold transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'border-secondary text-secondary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="px-8 py-6">
              {/* Two-column layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-body-md text-on-surface font-bold mb-2 pb-1.5 border-b border-outline-variant">
                      Contact
                    </h3>
                    <Row label="Phone" value={lead.phone} />
                    <Row label="Alt Phone" value={lead.alternateContact} />
                    <Row label="Email" value={lead.email} />
                  </div>
                  <div>
                    <h3 className="font-body-md text-on-surface font-bold mb-2 pb-1.5 border-b border-outline-variant">
                      Patient
                    </h3>
                    <Row label="UHID" value={lead.uhid} />
                    <Row label="Gender" value={lead.gender} />
                    <Row
                      label="DOB"
                      value={
                        lead.dob
                          ? new Date(lead.dob).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'
                      }
                    />
                  </div>
                  <div>
                    <h3 className="font-body-md text-on-surface font-bold mb-2 pb-1.5 border-b border-outline-variant">
                      Address
                    </h3>
                    <Row label="Address" value={lead.address} />
                    <Row label="Area" value={lead.area} />
                    <Row label="City" value={lead.city} />
                    <Row label="State" value={lead.state} />
                    <Row label="Pincode" value={lead.pincode} />
                    <Row label="Country" value={lead.country} />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-body-md text-on-surface font-bold mb-2 pb-1.5 border-b border-outline-variant">
                      Lead
                    </h3>
                    <Row label="Status" value={lead.status} />
                    <Row label="Priority" value={lead.priority} />
                    <Row label="Source" value={lead.leadSource} />
                    <Row label="Branch" value={lead.branchName} />
                  </div>
                  <div>
                    <h3 className="font-body-md text-on-surface font-bold mb-2 pb-1.5 border-b border-outline-variant">
                      Assignment
                    </h3>
                    <Row label="Created By" value={lead.createdByName} />
                    <Row label="Assigned To" value={lead.assignedTo} />
                    <Row
                      label="Created"
                      value={formatRelativeTime(lead.createdAt)}
                    />
                    <Row
                      label="Last Call"
                      value={formatRelativeTime(lead.lastCallDate)}
                    />
                  </div>
                  {lead.clinicalRemarks && (
                    <div>
                      <h3 className="font-body-md text-on-surface font-bold mb-2 pb-1.5 border-b border-outline-variant">
                        Remarks
                      </h3>
                      <p className="font-body-md text-on-surface-variant leading-relaxed bg-surface-container rounded-lg p-3">
                        {lead.clinicalRemarks}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="px-8 py-6">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-16">
                  <Clock className="w-10 h-10 text-on-surface-variant/30 mx-auto mb-3" />
                  <p className="font-body-md text-on-surface-variant">
                    No activity recorded yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {history.map((h, i) => (
                    <div key={h.id} className="relative flex gap-4 pb-6">
                      {i < history.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-outline-variant" />
                      )}
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-6 h-6 rounded-full bg-secondary/10 border-2 border-secondary flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-secondary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="font-body-md text-on-surface font-bold">
                          {actionLabels[h.action] || h.action}
                        </p>
                        {h.old_value && h.new_value && (
                          <p className="font-body-sm text-on-surface-variant mt-0.5">
                            <span className="line-through opacity-50">
                              {h.old_value}
                            </span>
                            <span className="mx-1.5 text-on-surface-variant">
                              →
                            </span>
                            <span className="font-bold text-on-surface">
                              {h.new_value}
                            </span>
                          </p>
                        )}
                        {h.new_value && !h.old_value && (
                          <p className="font-body-sm text-on-surface-variant mt-0.5">
                            {h.new_value}
                          </p>
                        )}
                        <p className="font-caption text-on-surface-variant/50 mt-1">
                          {h.changed_by_name && `${h.changed_by_name} · `}
                          {formatRelativeTime(h.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'calls' && (
            <div className="px-8 py-6">
              {loadingCalls ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : callHistory.length === 0 ? (
                <div className="text-center py-16">
                  <Phone className="w-10 h-10 text-on-surface-variant/30 mx-auto mb-3" />
                  <p className="font-body-md text-on-surface-variant">
                    No calls recorded yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {callHistory.map((ch) => {
                    const isMissed =
                      ch.status === 'missed' || ch.status === 'no-answer';
                    const isInbound = ch.direction === 'inbound';
                    return (
                      <div
                        key={ch.id}
                        className="flex items-start gap-4 p-4 bg-surface-container rounded-lg">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isMissed
                              ? 'bg-error/10'
                              : isInbound
                                ? 'bg-tertiary/10'
                                : 'bg-secondary/10'
                          }`}>
                          {isMissed ? (
                            <PhoneMissed className="w-4 h-4 text-error" />
                          ) : isInbound ? (
                            <PhoneIncoming className="w-4 h-4 text-tertiary" />
                          ) : (
                            <PhoneOutgoing className="w-4 h-4 text-secondary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-body-md text-on-surface font-bold">
                              {isInbound ? 'Incoming' : 'Outgoing'}
                              {isMissed && ' (Missed)'}
                            </p>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                isMissed
                                  ? 'bg-error/10 text-error'
                                  : 'bg-secondary/10 text-secondary'
                              }`}>
                              {ch.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-on-surface-variant">
                            {ch.duration > 0 && (
                              <span className="font-data-tabular text-xs">
                                {Math.floor(ch.duration / 60)}:
                                {String(ch.duration % 60).padStart(2, '0')}
                              </span>
                            )}
                            {ch.user_name && (
                              <span className="font-body-sm">
                                Agent: {ch.user_name}
                              </span>
                            )}
                            <span className="font-caption text-on-surface-variant/50 ml-auto">
                              {formatRelativeTime(ch.created_at)}
                            </span>
                          </div>
                          {ch.notes && (
                            <p className="font-body-sm text-on-surface-variant mt-2 bg-surface-container-lowest rounded px-3 py-2">
                              {ch.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadBox;
