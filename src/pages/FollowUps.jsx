import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, Search, Filter, ChevronDown, User, CircleCheck, X, Edit,
  AlertTriangle, CalendarDays, Users, List,
} from 'lucide-react';
import Layout from '../components/Layout';
import FollowUpModal from '../components/FollowUpModal';
import Toast from '../components/Toast';
import api from '../services/api';

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
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays <= 7) return `${diffDays}d ago`;
  return then.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

let toastId = 0;

const FollowUps = () => {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ all: 0, my: 0, today: 0, myToday: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(20);
  const [viewMode, setViewMode] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: pageSize, view: viewMode };
      if (statusFilter !== 'all') params.status = statusFilter;
      const [fuRes, countsRes] = await Promise.all([
        api.getFollowUps(params),
        api.getFollowUpCounts(),
      ]);
      if (fuRes?.data) {
        let items = fuRes.data.followUps || [];
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          items = items.filter((fu) =>
            fu.lead_name?.toLowerCase().includes(q) ||
            fu.lead_code?.toLowerCase().includes(q) ||
            fu.lead_phone?.includes(q)
          );
        }
        setFollowUps(items);
        setTotalItems(fuRes.data.pagination?.total ?? items.length);
      }
      if (countsRes?.data) setCounts(countsRes.data);
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, statusFilter, currentPage, pageSize, debouncedSearch]);

  useEffect(() => { loadFollowUps(); }, [loadFollowUps]);

  const handleCompleteFollowUp = async (fu) => {
    try {
      await api.completeFollowUp(fu.id);
      setFollowUps((prev) => prev.map((f) =>
        f.id === fu.id ? { ...f, status: 'completed', completed_at: new Date().toISOString() } : f
      ));
      addToast('success', 'Completed', `Follow-up for ${fu.lead_name} marked as completed.`);
    } catch (err) {
      addToast('error', 'Error', err.message || 'Failed to complete follow-up.');
    }
  };

  const handleCancelFollowUp = async (fu) => {
    try {
      await api.cancelFollowUp(fu.id);
      setFollowUps((prev) => prev.map((f) => f.id === fu.id ? { ...f, status: 'cancelled' } : f));
      addToast('success', 'Cancelled', `Follow-up for ${fu.lead_name} has been cancelled.`);
    } catch (err) {
      addToast('error', 'Error', err.message || 'Failed to cancel follow-up.');
    }
  };

  const handleReschedule = (fu) => {
    setRescheduleModal({
      id: fu.id, leadId: fu.lead_id, leadName: fu.lead_name,
      leadCode: fu.lead_code, scheduled_at: fu.scheduled_at,
    });
  };

  const statusStyles = {
    pending: 'bg-secondary/10 text-secondary border border-secondary/20',
    completed: 'bg-on-tertiary-container/10 text-on-tertiary-container border border-on-tertiary-container/20',
    cancelled: 'bg-surface-container-high text-on-surface-variant border border-outline-variant',
    missed: 'bg-error/10 text-error border border-error/20',
  };

  const totalPagesCalc = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPagesCalc);

  return (
    <Layout title="Follow-Ups">
      <div className="p-4 sm:p-6 lg:p-10 data-stage">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background">
              Follow-Ups
            </h1>
            <p className="font-body-sm text-on-surface-variant mt-1">
              Manage and schedule follow-ups for your leads
            </p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'All Pending', value: counts.all ?? 0, border: 'border-t-secondary', icon: <List className="w-5 h-5 text-secondary" /> },
            { label: 'My Pending', value: counts.my ?? 0, border: 'border-t-on-tertiary-container', icon: <User className="w-5 h-5 text-on-tertiary-container" /> },
            { label: "Today's Due", value: counts.today ?? 0, border: 'border-t-on-tertiary-container', icon: <CalendarDays className="w-5 h-5 text-on-tertiary-container" /> },
            { label: "My Today's Due", value: counts.myToday ?? 0, border: 'border-t-secondary-fixed', icon: <Users className="w-5 h-5 text-secondary-fixed-dim" /> },
          ].map((card, i) => (
            <div key={i} className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-5 metric-card-accent ${card.border} shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-caption text-on-surface-variant">{card.label}</span>
                {card.icon}
              </div>
              <div className="font-h2 text-on-surface">{card.value}</div>
            </div>
          ))}
        </div>

        {/* View Mode + Search + Filter */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'all', label: 'All Follow-Ups', icon: <List className="w-4 h-4" /> },
              { key: 'my', label: 'My Follow-Ups', icon: <User className="w-4 h-4" /> },
              { key: 'today', label: "Today's Follow-Ups", icon: <CalendarDays className="w-4 h-4" /> },
              { key: 'my-today', label: "My Today's", icon: <Clock className="w-4 h-4" /> },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => { setViewMode(btn.key); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body-md font-bold transition-all ${
                  viewMode === btn.key
                    ? 'bg-secondary text-on-secondary shadow-sm'
                    : 'border border-outline-variant text-on-surface bg-surface-container-lowest hover:bg-surface-container'
                }`}
              >
                {btn.icon} {btn.label}
              </button>
            ))}
            <span className="font-caption text-on-surface-variant ml-1">
              {totalItems} follow-up{totalItems !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search by lead name, code, or phone..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest hover:bg-surface-container transition-all w-full sm:w-auto justify-between"
              >
                <Filter className="w-4 h-4" />{' '}
                {statusFilter === 'all' ? 'All Statuses' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}{' '}
                <ChevronDown className="w-4 h-4" />
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-20 py-1">
                    {['all', 'pending', 'completed', 'cancelled', 'missed'].map((s) => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setCurrentPage(1); setFilterOpen(false); }}
                        className={`block w-full text-left px-4 py-2 font-body-md hover:bg-surface-container transition-colors ${
                          statusFilter === s ? 'text-secondary font-bold' : 'text-on-surface'
                        }`}
                      >
                        {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant w-12">#</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Lead</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Scheduled</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Assigned To</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Created</th>
                  <th className="px-4 py-3 text-center font-label-caps text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody className="zebra-striping">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center font-body-md text-on-surface-variant">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                        Loading follow-ups...
                      </div>
                    </td>
                  </tr>
                ) : followUps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center font-body-md text-on-surface-variant">
                      <Calendar className="w-10 h-10 text-on-surface-variant/30 mx-auto mb-3" />
                      No follow-ups found.
                    </td>
                  </tr>
                ) : (
                  followUps.map((fu, idx) => {
                    const isPending = fu.status === 'pending';
                    const scheduledDate = new Date(fu.scheduled_at);
                    const isOverdue = isPending && scheduledDate < new Date();
                    return (
                      <tr key={fu.id} className="border-t border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                        <td className="px-4 py-3 text-center font-data-tabular text-on-surface-variant text-sm">
                          {(safePage - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-body-md text-on-surface font-bold">{fu.lead_name || '—'}</p>
                            <p className="font-caption text-on-surface-variant">
                              {fu.lead_code || ''} {fu.lead_phone ? `· ${fu.lead_phone}` : ''}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isOverdue && <AlertTriangle className="w-4 h-4 text-error flex-shrink-0" />}
                            <span className={`font-body-md ${isOverdue ? 'text-error font-bold' : 'text-on-surface'}`}>
                              {formatDate(fu.scheduled_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-body-md text-on-surface-variant">{fu.assigned_to_name || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-3 py-1 rounded-full font-caption font-bold text-xs ${statusStyles[fu.status] || ''}`}>
                            {isOverdue && isPending ? 'Overdue' : fu.status.charAt(0).toUpperCase() + fu.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-caption text-on-surface-variant">{formatRelativeTime(fu.created_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isPending && (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleReschedule(fu)} className="p-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors" title="Reschedule">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleCompleteFollowUp(fu)} className="p-1.5 rounded-lg bg-on-tertiary-container/10 text-on-tertiary-container hover:bg-on-tertiary-container/20 transition-colors" title="Mark Completed">
                                <CircleCheck className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleCancelFollowUp(fu)} className="p-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors" title="Cancel">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPagesCalc > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant bg-surface-container-lowest">
              <span className="font-caption text-on-surface-variant">
                Page {safePage} of {totalPagesCalc}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 border border-outline-variant rounded-lg font-body-sm text-on-surface hover:bg-surface-container transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPagesCalc, p + 1))}
                  disabled={currentPage >= totalPagesCalc}
                  className="px-3 py-1.5 border border-outline-variant rounded-lg font-body-sm text-on-surface hover:bg-surface-container transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {rescheduleModal && (
          <FollowUpModal
            isOpen={!!rescheduleModal}
            onClose={() => setRescheduleModal(null)}
            editFollowUp={rescheduleModal}
            onSuccess={(msg) => { addToast('success', 'Rescheduled', msg); loadFollowUps(); }}
            onError={(msg) => addToast('error', 'Error', msg)}
          />
        )}
        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
    </Layout>
  );
};

export default FollowUps;
