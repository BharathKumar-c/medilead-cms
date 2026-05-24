import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Phone, PhoneMissed, Clock,
  PhoneIncoming, PhoneOutgoing, UserPlus,
  Headphones,
} from 'lucide-react';
import Layout from './Layout';
import Pagination from './Pagination';
import PatientIntakeForm from './PatientIntakeForm';
import AudioPlayerModal from './AudioPlayerModal';
import Toast from './Toast';
import api from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const resolveRecordingUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/api') ? url.slice(4) : url}`;
};

let toastId = 0;
const DEFAULT_PAGE_SIZE = 10;

const formatCallTime = (dateStr) => {
  if (!dateStr) return { display: '—', tooltip: '' };
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  const exact = then.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  if (diffSec < 60) return { display: 'Just now', tooltip: exact };
  if (diffMin < 60) return { display: `${diffMin} min${diffMin > 1 ? 's' : ''} ago`, tooltip: exact };
  if (diffHrs < 24) return { display: `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`, tooltip: exact };
  if (diffDays < 2) return { display: `${diffDays} day${diffDays > 1 ? 's' : ''} ago`, tooltip: exact };
  return { display: exact, tooltip: diffDays <= 7 ? exact : '' };
};

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const statusColors = {
  initiated: 'bg-secondary/10 text-secondary',
  ringing: 'bg-secondary/10 text-secondary',
  'in-progress': 'bg-on-tertiary-container/10 text-on-tertiary-container',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-error/10 text-error',
  missed: 'bg-error/10 text-error',
};

const directionIcons = {
  inbound: <PhoneIncoming className="w-4 h-4 text-secondary" />,
  outbound: <PhoneOutgoing className="w-4 h-4 text-on-tertiary-container" />,
};

const CallLogsTable = () => {
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({ totalToday: 0, missedToday: 0, avgDuration: 0, inbound: 0, outbound: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [prefilledPhone, setPrefilledPhone] = useState('');
  const [toasts, setToasts] = useState([]);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const loadRequestId = useRef(0);

  const addToast = useCallback((type, title, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleCallUpdate = () => loadData();
    window.addEventListener('call-update', handleCallUpdate);
    return () => window.removeEventListener('call-update', handleCallUpdate);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const loadData = async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    try {
      const [callsRes, statsRes] = await Promise.all([
        api.getTelephonyCallLogs({ limit: 100 }),
        api.getTelephonyCallStats(),
      ]);
      if (requestId !== loadRequestId.current) return;
      if (callsRes?.data?.calls) setCalls(callsRes.data.calls);
      if (statsRes?.data) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load telephony call data:', err);
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  };

  const filteredCalls = calls.filter(c => {
    if (filter === 'missed') return c.call_status === 'missed';
    if (filter === 'inbound') return c.direction === 'inbound';
    if (filter === 'outbound') return c.direction === 'outbound';
    if (filter === 'completed') return c.call_status === 'completed';
    if (filter === 'failed') return c.call_status === 'failed';
    if (filter === 'in-progress') return c.call_status === 'in-progress';
    if (filter === 'ringing') return c.call_status === 'ringing';
    return true;
  });

  const paginatedCalls = filteredCalls.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredCalls.length / pageSize);

  const handleCall = (phoneNumber) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleCreateLead = (phoneNumber) => {
    setPrefilledPhone(phoneNumber);
    setIsFormOpen(true);
  };

  const handlePlayRecording = (call) => {
    setSelectedCall(call);
    setPlayerOpen(true);
  };

  return (
    <Layout title="Calls">
      <div className="p-4 sm:p-6 lg:p-10">
        <h1 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background mb-6">Calls</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Total Calls Today', value: stats.total_today || 0, icon: <Phone className="w-5 h-5 text-secondary" />, border: 'border-t-secondary' },
            { label: 'Inbound', value: stats.inbound || 0, icon: <PhoneIncoming className="w-5 h-5 text-on-tertiary-container" />, border: 'border-t-on-tertiary-container' },
            { label: 'Outbound', value: stats.outbound || 0, icon: <PhoneOutgoing className="w-5 h-5 text-secondary-fixed-dim" />, border: 'border-t-secondary-fixed' },
            { label: 'Missed Calls', value: stats.missed_today || 0, icon: <PhoneMissed className="w-5 h-5 text-error" />, border: 'border-t-error' },
            { label: 'Avg Duration', value: formatDuration(stats.avg_duration), icon: <Clock className="w-5 h-5 text-on-tertiary-container" />, border: 'border-t-on-tertiary-container' },
          ].map((card, i) => (
            <div key={i} className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 metric-card-accent ${card.border} shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-caption text-on-surface-variant">{card.label}</span>
                {card.icon}
              </div>
              <div className="font-h2 text-on-surface">{card.value}</div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {[
            { key: 'all', label: 'All Calls' },
            { key: 'missed', label: 'Missed' },
            { key: 'inbound', label: 'Inbound' },
            { key: 'outbound', label: 'Outbound' },
            { key: 'completed', label: 'Completed' },
            { key: 'failed', label: 'Failed' },
            { key: 'in-progress', label: 'In Progress' },
            { key: 'ringing', label: 'Ringing' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg font-body-md font-bold transition-all whitespace-nowrap ${
                filter === tab.key ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Call Logs Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Direction</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Caller</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Patient</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Duration</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Time</th>
                  <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody className="zebra-striping">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center font-body-md text-on-surface-variant">Loading call logs...</td></tr>
                ) : filteredCalls.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center font-body-md text-on-surface-variant">No calls found.</td></tr>
                ) : paginatedCalls.map((call) => (
                  <tr key={call.id} className="border-t border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {directionIcons[call.direction] || <Phone className="w-4 h-4 text-on-surface-variant" />}
                        <span className="font-body-md text-on-surface capitalize">{call.direction || 'inbound'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-data-tabular text-on-surface">{call.caller_number || call.caller_phone_number}</td>
                    <td className="px-4 py-3">
                      {call.lead_name ? (
                        <div>
                          <p className="font-body-md font-bold text-on-surface">{call.lead_name}</p>
                          <p className="font-caption text-on-surface-variant">{call.lead_phone}</p>
                        </div>
                      ) : (
                        <span className="font-body-md text-on-surface-variant">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-3 py-1 rounded-full font-caption font-bold text-xs ${statusColors[call.call_status] || 'bg-surface-container-high text-on-surface-variant'}`}>
                        {call.call_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-data-tabular text-on-surface-variant">{formatDuration(call.duration)}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const t = formatCallTime(call.timestamp || call.received_at || call.created_at);
                        return (
                          <span
                            className="font-body-md text-on-surface-variant"
                            title={t.tooltip || undefined}
                            style={t.tooltip ? { cursor: 'default', borderBottom: '1px dotted' } : undefined}>
                            {t.display}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCall(call.caller_number || call.caller_phone_number)}
                          className="p-2 bg-on-tertiary-container/10 rounded-lg text-on-tertiary-container hover:bg-on-tertiary-container/20 transition-colors"
                          title={`Call ${call.caller_number || call.caller_phone_number}`}
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        {!call.lead_id && (
                          <button
                            onClick={() => handleCreateLead(call.caller_number || call.caller_phone_number)}
                            className="flex items-center gap-1 px-3 py-2 bg-secondary/10 rounded-lg text-secondary hover:bg-secondary/20 transition-colors font-caption font-bold"
                            title="Create lead for this caller"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">Create Lead</span>
                          </button>
                        )}
                        {call.recording_url && (
                          <button
                            onClick={() => handlePlayRecording(call)}
                            className="p-2 bg-surface-container-high rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                            title="Play recording"
                          >
                            <Headphones className="w-4 h-4" />
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
            totalItems={filteredCalls.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      <PatientIntakeForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setPrefilledPhone(''); }}
        prefillPhone={prefilledPhone}
        onSuccess={(msg) => {
          addToast('success', 'Lead Created', msg);
          loadData();
        }}
        onError={(msg) => addToast('error', 'Error', msg)}
      />

      <Toast toasts={toasts} onRemove={removeToast} />

      <AudioPlayerModal
        isOpen={playerOpen}
        onClose={() => { setPlayerOpen(false); setSelectedCall(null); }}
        recordingUrl={resolveRecordingUrl(selectedCall?.recording_url)}
        callInfo={selectedCall ? {
          caller_number: selectedCall.caller_number || selectedCall.caller_phone_number,
          lead_name: selectedCall.lead_name,
          direction: selectedCall.direction,
          duration: selectedCall.duration,
          created_at: selectedCall.created_at,
        } : null}
      />
    </Layout>
  );
};

export default CallLogsTable;
