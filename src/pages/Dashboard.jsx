import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Phone, TrendingUp, PhoneOff, Zap, PhoneIncoming, CircleCheck,
  User, Download, ArrowRight, Clock, Users, UserPlus, Target,
} from 'lucide-react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import api from '../services/api';

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('all');
  const [activityFilter, setActivityFilter] = useState('All');
  const [metrics, setMetrics] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);

  useEffect(() => {
    loadMetrics();
    loadActivity();
  }, [timeRange, activityFilter]);

  useEffect(() => {
    setActivityPage(1);
  }, [activityFilter]);

  const loadMetrics = async () => {
    try {
      const metricsRes = await api.getDashboardMetrics(timeRange);
      setMetrics(metricsRes.data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      const filter = activityFilter === 'All' ? '' : activityFilter;
      const res = await api.getActivityLog(filter, timeRange);
      setActivity(res.data.activity);
    } catch (err) {
      console.error('Failed to load activity:', err);
    }
  };

  const handleExportCSV = async () => {
    try {
      const filter = activityFilter === 'All' ? '' : activityFilter;
      const blob = await api.exportActivityLog(filter, timeRange);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-log-${timeRange}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const m = metrics || {};

  const rangeLabel = timeRange === 'today' ? 'Today' : timeRange === 'month' ? 'This Month' : 'All Time';

  return (
    <Layout title="Dashboard">
      <div className="data-stage p-4 sm:p-6 lg:p-10">
        <header className="mb-6 lg:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background">
              Clinical Performance Overview
            </h2>
            <p className="font-body-md sm:font-body-lg text-on-surface-variant">
              Real-time call analytics and patient lead management.
            </p>
          </div>
          {/* Time Range Button Group */}
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            {RANGES.map((r, i) => (
              <button
                key={r.key}
                onClick={() => setTimeRange(r.key)}
                className={`px-4 py-2 font-body-md font-bold transition-all ${
                  timeRange === r.key
                    ? 'bg-secondary text-on-secondary'
                    : 'text-on-surface-variant hover:bg-surface-container'
                } ${i > 0 ? 'border-l border-outline-variant' : ''}`}>
                {r.label}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Total Calls */}
          <div onClick={() => navigate('/reports')} className="sm:col-span-2 lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6 shadow-sm metric-card-accent border-t-secondary cursor-pointer hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-surface-container-low rounded-lg text-secondary"><Phone className="w-5 h-5" /></div>
              <span className="text-caption text-on-surface-variant font-bold">{rangeLabel}</span>
            </div>
            <h3 className="font-label-caps text-outline mb-1 uppercase tracking-widest">Number of All Calls</h3>
            <div className="flex items-end gap-4">
              <div><p className="font-h1 text-on-surface">{m.totalCalls?.total?.toLocaleString()}</p><p className="font-caption text-on-surface-variant">Total Calls</p></div>
              <div className="border-l border-outline-variant pl-4"><p className="font-h3 text-on-surface">{m.totalCalls?.unique?.toLocaleString()}</p><p className="font-caption text-on-surface-variant">Unique Calls</p></div>
            </div>
          </div>

          {/* Missed Calls */}
          <div onClick={() => navigate('/lead-box')} className="sm:col-span-2 lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6 shadow-sm metric-card-accent border-t-error cursor-pointer hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-error-container rounded-lg text-error"><PhoneOff className="w-5 h-5" /></div>
              <div className="text-error flex items-center text-caption font-bold">{m.missedCalls?.status}</div>
            </div>
            <h3 className="font-label-caps text-outline mb-1 uppercase tracking-widest">Missed Calls</h3>
            <div className="flex items-end gap-4">
              <div><p className="font-h1 text-error">{m.missedCalls?.total}</p><p className="font-caption text-on-surface-variant">Total Missed</p></div>
              <div className="border-l border-outline-variant pl-4"><p className="font-h3 text-on-surface">{m.missedCalls?.unique}</p><p className="font-caption text-on-surface-variant">Unique Missed</p></div>
            </div>
          </div>

          {/* Action Required */}
          <div className="sm:col-span-2 lg:col-span-4 bg-primary-container border border-outline-variant rounded-xl p-4 sm:p-6 shadow-sm metric-card-accent border-t-secondary relative">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-secondary rounded-lg text-white"><Zap className="w-5 h-5" /></div>
              <span className="px-2 py-1 bg-on-tertiary-container/20 text-on-tertiary-container rounded-full text-caption font-bold">{m.actionRequired?.label}</span>
            </div>
            <h3 className="font-label-caps text-on-primary-container mb-1 uppercase tracking-widest">Action to be Taken</h3>
            <p className="font-h1 text-surface-bright">{m.actionRequired?.count}</p>
            <p className="font-body-md text-on-primary-container">Unique Leads needing attention</p>
            <Link to="/lead-box" className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-surface-container-lowest text-secondary font-bold rounded-lg hover:bg-surface-container-high transition-all">
              View Lead Box <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Answered Efficiency */}
          <div onClick={() => navigate('/reports')} className="sm:col-span-2 lg:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6 shadow-sm metric-card-accent border-t-on-tertiary-container cursor-pointer hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-surface-container-low rounded-xl text-on-tertiary-container"><PhoneIncoming className="w-5 h-5" /></div>
              <div><h3 className="font-label-caps text-outline uppercase tracking-widest">Answered Efficiency</h3><p className="font-body-md text-on-surface-variant">Clinical response rate within 15s</p></div>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-surface p-4 rounded-lg border border-outline-variant/30"><p className="font-h1 text-on-surface">{m.answered?.total?.toLocaleString()}</p><p className="font-body-md font-bold text-on-tertiary-container flex items-center"><CircleCheck className="mr-1 w-4 h-4" />Total Answered</p></div>
              <div className="bg-surface p-4 rounded-lg border border-outline-variant/30"><p className="font-h1 text-on-surface">{m.answered?.unique?.toLocaleString()}</p><p className="font-body-md font-bold text-secondary flex items-center"><User className="mr-1 w-4 h-4" />Unique Answered</p></div>
            </div>
          </div>

          {/* Unanswered Tracker */}
          <div onClick={() => navigate('/reports')} className="sm:col-span-2 lg:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6 shadow-sm metric-card-accent border-t-outline cursor-pointer hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-surface-container-low rounded-xl text-on-surface-variant"><PhoneIncoming className="w-5 h-5" style={{ transform: 'rotate(180deg)' }} /></div>
              <div><h3 className="font-label-caps text-outline uppercase tracking-widest">Unanswered Tracker</h3><p className="font-body-md text-on-surface-variant">Calls with zero pickup</p></div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-h1 text-on-surface">{m.unanswered?.count}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-32 h-2 bg-surface-container-high rounded-full overflow-hidden"><div className="bg-outline h-full" style={{ width: `${m.unanswered?.percentage}%` }}></div></div>
                  <span className="font-caption text-outline">{m.unanswered?.percentage}% of total volume</span>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Leads */}
          <div onClick={() => navigate('/lead-box')} className="sm:col-span-2 lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6 shadow-sm metric-card-accent border-t-primary cursor-pointer hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary"><Users className="w-5 h-5" /></div>
            </div>
            <h3 className="font-label-caps text-outline mb-1 uppercase tracking-widest">Overall Leads</h3>
            <p className="font-h1 text-on-surface">{m.overallLeads?.total?.toLocaleString()}</p>
            <p className="font-body-md text-on-surface-variant">{rangeLabel === 'All Time' ? 'All leads in the system' : `Leads ${rangeLabel.toLowerCase()}`}</p>
          </div>

          {/* New Leads Today */}
          <div onClick={() => navigate('/lead-box')} className="sm:col-span-2 lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6 shadow-sm metric-card-accent border-t-tertiary cursor-pointer hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-tertiary/10 rounded-lg text-tertiary"><UserPlus className="w-5 h-5" /></div>
            </div>
            <h3 className="font-label-caps text-outline mb-1 uppercase tracking-widest">New Leads Today</h3>
            <p className="font-h1 text-on-surface">{m.newLeadsToday?.total}</p>
            <p className="font-body-md text-on-surface-variant">Leads created today</p>
          </div>

          {/* Total Leads */}
          <div onClick={() => navigate('/lead-box')} className="sm:col-span-2 lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6 shadow-sm metric-card-accent border-t-secondary cursor-pointer hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-secondary/10 rounded-lg text-secondary"><Target className="w-5 h-5" /></div>
            </div>
            <h3 className="font-label-caps text-outline mb-1 uppercase tracking-widest">Total Leads</h3>
            <div className="flex items-end gap-4">
              <div>
                <p className="font-h1 text-on-surface">{m.totalLeads?.total?.toLocaleString()}</p>
                <p className="font-caption text-on-surface-variant">Cumulative Count</p>
              </div>
              <div className="border-l border-outline-variant pl-4">
                <p className="font-h3 text-error">{m.totalLeads?.highPriority}</p>
                <p className="font-caption text-on-surface-variant">High Priority</p>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="sm:col-span-2 lg:col-span-12 mt-4 sm:mt-8">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 sm:px-6 py-4 bg-surface-container-low border-b border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-4">
                  <h3 className="font-h3 text-on-surface">Recent Activity Log</h3>
                  <div className="flex gap-1 bg-surface-container rounded-lg p-1">
                    {['All', 'Answered', 'Missed'].map((filter) => (
                      <button key={filter} onClick={() => setActivityFilter(filter)} className={`px-3 py-1 rounded-md text-caption font-bold transition-all ${activityFilter === filter ? 'bg-white shadow-sm text-secondary' : 'text-on-surface-variant'}`}>
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleExportCSV} className="text-secondary font-bold font-body-md flex items-center gap-1 hover:underline">
                  Export CSV <Download className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-surface">
                      <th className="font-label-caps text-outline px-6 py-4">Call Code</th>
                      <th className="font-label-caps text-outline px-6 py-4">Caller</th>
                      <th className="font-label-caps text-outline px-6 py-4">Patient Name</th>
                      <th className="font-label-caps text-outline px-6 py-4">Direction</th>
                      <th className="font-label-caps text-outline px-6 py-4">Status</th>
                      <th className="font-label-caps text-outline px-6 py-4">Duration</th>
                      <th className="font-label-caps text-outline px-6 py-4">Agent</th>
                      <th className="font-label-caps text-outline px-6 py-4">Time</th>
                    </tr>
                  </thead>
                  <tbody className="font-data-tabular text-data-tabular">
                    {activity.length === 0 ? (
                      <tr><td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant">No activity matching filter.</td></tr>
                    ) : (
                      activity.map((row, index) => {
                        const isMissed = row.status === 'missed';
                        const isInbound = row.direction === 'inbound';
                        return (
                          <tr key={row.id} className={`border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors ${index % 2 === 1 ? 'bg-surface-container-lowest/30' : ''}`}>
                            <td className="px-6 py-4 text-secondary font-bold">{row.code || '—'}</td>
                            <td className="px-6 py-4 text-on-surface-variant">{row.caller_number || '—'}</td>
                            <td className="px-6 py-4 text-on-surface font-bold">{row.lead_name || '—'}</td>
                            <td className="px-6 py-4 text-on-surface-variant capitalize">{row.direction || '—'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-caption font-bold border ${
                                isMissed
                                  ? 'bg-error-container text-error border-error/20'
                                  : 'bg-on-tertiary-container/10 text-on-tertiary-container border-on-tertiary-container/20'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-on-surface-variant">
                              {row.duration ? `${Math.floor(row.duration / 60)}:${String(row.duration % 60).padStart(2, '0')}` : '—'}
                            </td>
                            <td className="px-6 py-4 text-on-surface-variant">{row.agent_name || '—'}</td>
                            <td className="px-6 py-4 text-on-surface-variant">
                              <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(row.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={activityPage}
                totalItems={activity.length}
                pageSize={activityPageSize}
                onPageChange={setActivityPage}
                onPageSizeChange={setActivityPageSize}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
