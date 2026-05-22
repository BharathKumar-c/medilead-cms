import { useState, useEffect } from 'react';
import {
  Phone, UserPlus, Calendar, TrendingUp, Clock, Heart,
  Download, ArrowUpRight, ArrowDownRight, BarChart3,
  Users, Target, Activity,
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

const Reports = () => {
  const [overview, setOverview] = useState({ totalCalls: 0, totalLeads: 0, totalAppointments: 0, conversionRate: 0, avgResponseTime: '—', patientSatisfaction: 0 });
  const [callVolume, setCallVolume] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [deptPerformance, setDeptPerformance] = useState([]);
  const [providerLeaderboard, setProviderLeaderboard] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [conversionFunnel, setConversionFunnel] = useState([]);
  const [callAnalytics, setCallAnalytics] = useState({ byStatus: [], byDirection: [], byHour: [], avgDuration: 0 });
  const [appointmentStats, setAppointmentStats] = useState({ byStatus: [], byDepartment: [], noShowRate: 0 });
  const [dailyActivity, setDailyActivity] = useState({ newLeads: 0, callsToday: 0, appointmentsToday: 0, statusChanges: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAllReports(); }, []);

  const loadAllReports = async () => {
    setLoading(true);
    try {
      const res = await Promise.all([
        api.getReportsOverview().catch(() => null),
        api.getCallVolume().catch(() => null),
        api.getReportLeadSources().catch(() => null),
        api.getDepartmentPerformance().catch(() => null),
        api.getProviderLeaderboard().catch(() => null),
        api.getStatusBreakdown().catch(() => null),
        api.getWeeklyTrend().catch(() => null),
        api.getTelecallerPerformance().catch(() => null),
        api.getConversionFunnel().catch(() => null),
        api.getCallAnalytics().catch(() => null),
        api.getAppointmentStats().catch(() => null),
        api.getDailyActivity().catch(() => null),
      ]);
      if (res[0]?.data) setOverview(res[0].data);
      if (res[1]?.data?.callVolume) setCallVolume(res[1].data.callVolume);
      if (res[2]?.data?.sources) {
        // Map API response: source/value -> source/count/percentage
        const sources = res[2].data.sources.map(s => ({
          source: s.source,
          count: s.value,
          percentage: s.percentage,
        }));
        setLeadSources(sources);
      }
      if (res[3]?.data?.departments) {
        // Map API response: leads -> calls (for chart display)
        const mapped = res[3].data.departments.map(d => ({
          department: d.department,
          calls: d.leads || d.appointments || 0,
          leads: d.leads,
          appointments: d.appointments,
          conversions: d.conversions,
          satisfaction: d.satisfaction,
        }));
        setDeptPerformance(mapped);
      }
      if (res[4]?.data?.providers) {
        // Map API response: provider -> name, department -> specialty
        const mapped = res[4].data.providers.map(p => ({
          name: p.provider,
          specialty: p.department || '—',
          leads: p.leads,
          appointments: p.appointments,
          satisfaction: p.conversionRate || 0,
        }));
        setProviderLeaderboard(mapped);
      }
      if (res[5]?.data?.breakdown) setStatusBreakdown(res[5].data.breakdown);
      if (res[6]?.data?.weeklyTrend) setWeeklyTrend(res[6].data.weeklyTrend);
      if (res[7]?.data?.telecallers) {
        // Map API response to expected format
        const mapped = res[7].data.telecallers.map(t => ({
          name: t.name,
          specialty: t.specialty || 'Telecaller',
          total_leads: t.leads,
          closed_leads: 0,
          active_leads: t.leads,
          total_calls: t.calls,
          missed_calls: 0,
          avg_call_duration: t.avgCallDuration || 0,
          appointments: t.appointments,
        }));
        setTelecallers(mapped);
      }
      if (res[8]?.data?.funnel) {
        // Map API response: stage/count -> status/count/percentage
        const funnel = res[8].data.funnel;
        const maxCount = Math.max(...funnel.map(f => f.count), 1);
        const mapped = funnel.map(f => ({
          status: f.stage,
          count: f.count,
          percentage: Math.round((f.count / maxCount) * 100),
        }));
        setConversionFunnel(mapped);
      }
      if (res[9]?.data?.callAnalytics) setCallAnalytics(res[9].data.callAnalytics);
      if (res[10]?.data?.appointmentStats) {
        // Map API response to expected format
        const stats = res[10].data.appointmentStats;
        const byStatus = stats.byStatus || [];
        const byDepartment = (stats.byDepartment || []).map(d => ({
          department: d.department,
          total: d.count,
          completed: d.completed || 0,
          cancelled: d.cancelled || 0,
          no_show: d.no_show || 0,
        }));
        setAppointmentStats({
          byStatus,
          byDepartment,
          noShowRate: stats.noShowRate || 0,
        });
      }
      if (res[11]?.data?.dailyActivity) setDailyActivity(res[11].data.dailyActivity);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const maxCalls = Math.max(...callVolume.map(d => parseInt(d.calls) || 0), 1);
  const maxWeeklyCalls = Math.max(...weeklyTrend.map(d => parseInt(d.calls) || 0), 1);
  const maxDeptCalls = Math.max(...deptPerformance.map(d => parseInt(d.calls) || 0), 1);

  const handleExport = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Calls', overview.totalCalls],
      ['Total Leads', overview.totalLeads],
      ['Total Appointments', overview.totalAppointments],
      ['Conversion Rate', `${overview.conversionRate}%`],
      ['Patient Satisfaction', `${overview.patientSatisfaction}%`],
      ['', ''],
      ['--- Telecaller Performance ---', ''],
      ['Name', 'Total Leads | Closed | Calls | Missed | Avg Duration (s) | Appointments'],
      ...telecallers.map(t => [t.name, `${t.total_leads} | ${t.closed_leads} | ${t.total_calls} | ${t.missed_calls} | ${t.avg_call_duration} | ${t.appointments}`]),
      ['', ''],
      ['--- Lead Sources ---', ''],
      ...leadSources.map(s => [s.source, `${s.count} (${s.percentage}%)`]),
      ['', ''],
      ['--- Status Breakdown ---', ''],
      ...statusBreakdown.map(s => [s.status, s.count]),
    ];
    const escapeField = (val) => {
      const s = String(val ?? '');
      const escaped = '"' + s.replaceAll('"', '""') + '"';
      return /^[=+\-@]/.test(s) ? '\t' + escaped : escaped;
    };
    const csv = [headers, ...rows].map(r => r.map(escapeField).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'medilead-reports.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Layout title="Reports">
        <div className="p-10 text-center">
          <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body-md text-on-surface-variant">Loading reports...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Reports">
      <div className="p-4 sm:p-6 lg:p-10">
        <div className="max-w-[1440px] mx-auto space-y-6 lg:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h2 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background mb-1">Reports & Analytics</h2>
              <p className="font-body-md text-on-surface-variant">Real-time data from your CRM system.</p>
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container-low transition-all">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {/* Today's Activity */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'New Leads Today', value: dailyActivity.newLeads, icon: <UserPlus className="w-5 h-5 text-secondary" />, border: 'border-t-secondary' },
              { label: 'Calls Today', value: dailyActivity.callsToday, icon: <Phone className="w-5 h-5 text-on-tertiary-container" />, border: 'border-t-on-tertiary-container' },
              { label: 'Appointments Today', value: dailyActivity.appointmentsToday, icon: <Calendar className="w-5 h-5 text-secondary-fixed-dim" />, border: 'border-t-secondary-fixed' },
              { label: 'Status Changes', value: dailyActivity.statusChanges, icon: <Activity className="w-5 h-5 text-on-tertiary-container" />, border: 'border-t-on-tertiary-container' },
            ].map((card, i) => (
              <div key={i} className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 metric-card-accent ${card.border} shadow-sm`}>
                <div className="flex items-center justify-between mb-2"><span className="font-caption text-on-surface-variant">{card.label}</span>{card.icon}</div>
                <div className="font-h2 text-on-surface">{card.value}</div>
              </div>
            ))}
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Calls', value: overview.totalCalls.toLocaleString(), icon: <Phone className="w-5 h-5 text-secondary" />, trend: '+12%', up: true, border: 'border-t-secondary' },
              { label: 'Total Leads', value: overview.totalLeads.toLocaleString(), icon: <UserPlus className="w-5 h-5 text-on-tertiary-container" />, trend: '+8%', up: true, border: 'border-t-on-tertiary-container' },
              { label: 'Conversion Rate', value: `${overview.conversionRate}%`, icon: <Target className="w-5 h-5 text-secondary-fixed-dim" />, trend: '+5%', up: true, border: 'border-t-secondary-fixed' },
              { label: 'Satisfaction', value: `${overview.patientSatisfaction}%`, icon: <Heart className="w-5 h-5 text-error" />, trend: '-2%', up: false, border: 'border-t-error' },
            ].map((card, i) => (
              <div key={i} className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-5 metric-card-accent ${card.border} shadow-sm`}>
                <div className="flex items-center justify-between mb-2"><span className="font-caption text-on-surface-variant">{card.label}</span>{card.icon}</div>
                <div className="flex items-center gap-2"><span className="font-h2 text-on-surface">{card.value}</span>
                  <span className={`flex items-center font-body-sm font-bold ${card.up ? 'text-on-tertiary-container' : 'text-error'}`}>{card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{card.trend}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Lead Conversion Funnel */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
            <h3 className="font-h3 text-on-surface mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-secondary" /> Lead Conversion Funnel</h3>
            <div className="space-y-3">
              {conversionFunnel.map((stage, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="font-body-md text-on-surface w-36 flex-shrink-0">{stage.status}</span>
                  <div className="flex-1 bg-surface-container-high rounded-full h-6 overflow-hidden">
                    <div className="h-full bg-secondary rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(stage.percentage, 5)}%` }}>
                      <span className="font-caption text-white font-bold text-xs">{stage.count}</span>
                    </div>
                  </div>
                  <span className="font-body-md text-on-surface-variant w-12 text-right">{stage.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Call Volume Chart */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
              <h3 className="font-h3 text-on-surface mb-4">Call Volume</h3>
              <div className="flex items-end gap-2 h-48">
                {callVolume.length === 0 ? <p className="font-body-sm text-on-surface-variant">No data</p> : callVolume.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="font-caption text-on-surface-variant">{d.calls}</span>
                    <div className="w-full bg-secondary rounded-t-md transition-all" style={{ height: `${(parseInt(d.calls) / maxCalls) * 160}px` }} />
                    <span className="font-caption text-on-surface-variant">{d.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Trend */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
              <h3 className="font-h3 text-on-surface mb-4">Weekly Trend</h3>
              <div className="flex items-end gap-2 h-48">
                {weeklyTrend.length === 0 ? <p className="font-body-sm text-on-surface-variant">No data</p> : weeklyTrend.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="font-caption text-on-surface-variant">{d.calls}</span>
                    <div className="w-full bg-on-tertiary-container rounded-t-md transition-all" style={{ height: `${(parseInt(d.calls) / maxWeeklyCalls) * 160}px` }} />
                    <span className="font-caption text-on-surface-variant">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lead Sources + Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
              <h3 className="font-h3 text-on-surface mb-4">Lead Sources</h3>
              <div className="space-y-3">
                {leadSources.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-body-md text-on-surface">{s.source || 'Unknown'}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-surface-container-high rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${s.percentage}%` }} />
                      </div>
                      <span className="font-body-md text-on-surface-variant w-16 text-right">{s.count} ({s.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
              <h3 className="font-h3 text-on-surface mb-4">Lead Status Breakdown</h3>
              <div className="space-y-3">
                {statusBreakdown.map((s, i) => {
                  const total = statusBreakdown.reduce((sum, x) => sum + parseInt(x.count), 0);
                  const pct = total > 0 ? Math.round((parseInt(s.count) / total) * 100) : 0;
                  const palette = ['bg-secondary', 'bg-on-tertiary-container', 'bg-secondary-fixed', 'bg-outline-variant', 'bg-error', 'bg-on-primary-fixed-variant'];
                  const colorIdx = s.status ? s.status.charCodeAt(0) % palette.length : 0;
                  const colors = { [s.status]: palette[colorIdx] };
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <span className="font-body-md text-on-surface">{s.status}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-surface-container-high rounded-full h-2 overflow-hidden">
                          <div className={`h-full rounded-full ${colors[s.status] || 'bg-secondary'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-body-md text-on-surface-variant w-12 text-right">{s.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Telecaller Performance */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant">
              <h3 className="font-h3 text-on-surface flex items-center gap-2"><Users className="w-5 h-5 text-secondary" /> Telecaller Performance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-high">
                    <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Telecaller</th>
                    <th className="px-4 py-3 text-center font-label-caps text-on-surface-variant">Total Leads</th>
                    <th className="px-4 py-3 text-center font-label-caps text-on-surface-variant">Closed</th>
                    <th className="px-4 py-3 text-center font-label-caps text-on-surface-variant">Active</th>
                    <th className="px-4 py-3 text-center font-label-caps text-on-surface-variant">Calls</th>
                    <th className="px-4 py-3 text-center font-label-caps text-on-surface-variant">Missed</th>
                    <th className="px-4 py-3 text-center font-label-caps text-on-surface-variant">Avg Duration</th>
                    <th className="px-4 py-3 text-center font-label-caps text-on-surface-variant">Appointments</th>
                  </tr>
                </thead>
                <tbody className="zebra-striping">
                  {telecallers.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center font-body-md text-on-surface-variant">No telecallers found.</td></tr>
                  ) : telecallers.map(t => (
                    <tr key={t.id} className="border-t border-outline-variant/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-xs">
                            {t.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-body-md font-bold text-on-surface">{t.name}</p>
                            <p className="font-caption text-on-surface-variant">{t.specialty || 'Telecaller'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-data-tabular text-on-surface">{t.total_leads}</td>
                      <td className="px-4 py-3 text-center font-data-tabular text-on-tertiary-container font-bold">{t.closed_leads}</td>
                      <td className="px-4 py-3 text-center font-data-tabular text-on-surface">{t.active_leads}</td>
                      <td className="px-4 py-3 text-center font-data-tabular text-on-surface">{t.total_calls}</td>
                      <td className="px-4 py-3 text-center font-data-tabular text-error">{t.missed_calls}</td>
                      <td className="px-4 py-3 text-center font-data-tabular text-on-surface-variant">{Math.floor(t.avg_call_duration / 60)}:{String(t.avg_call_duration % 60).padStart(2, '0')}</td>
                      <td className="px-4 py-3 text-center font-data-tabular text-on-surface">{t.appointments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Call Analytics + Appointment Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
              <h3 className="font-h3 text-on-surface mb-4 flex items-center gap-2"><Phone className="w-5 h-5 text-secondary" /> Call Status Distribution</h3>
              <div className="space-y-3">
                {callAnalytics.byStatus.map((s, i) => {
                  const total = callAnalytics.byStatus.reduce((sum, x) => sum + parseInt(x.count), 0);
                  const pct = total > 0 ? Math.round((parseInt(s.count) / total) * 100) : 0;
                  const colors = { ringing: 'bg-secondary', connected: 'bg-on-tertiary-container', on_hold: 'bg-on-tertiary-container', disconnected: 'bg-outline-variant', missed: 'bg-error', failed: 'bg-error' };
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <span className="font-body-md text-on-surface capitalize">{s.status}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-surface-container-high rounded-full h-2 overflow-hidden">
                          <div className={`h-full rounded-full ${colors[s.status] || 'bg-secondary'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-body-md text-on-surface-variant w-12 text-right">{s.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-outline-variant">
                <p className="font-body-md text-on-surface-variant">Avg call duration: <strong className="text-on-surface">{Math.floor(callAnalytics.avgDuration / 60)}:{String(callAnalytics.avgDuration % 60).padStart(2, '0')}</strong></p>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
              <h3 className="font-h3 text-on-surface mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-secondary" /> Appointment Stats</h3>
              <div className="mb-4">
                <p className="font-body-md text-on-surface-variant">No-Show Rate: <strong className="text-error">{appointmentStats.noShowRate}%</strong></p>
              </div>
              <div className="space-y-3">
                {appointmentStats.byDepartment.map((d, i) => (
                  <div key={i} className="p-3 bg-surface-container rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-body-md font-bold text-on-surface">{d.department}</span>
                      <span className="font-body-md text-on-surface-variant">{d.total} total</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-caption text-on-tertiary-container">{d.completed} completed</span>
                      <span className="font-caption text-error">{d.cancelled} cancelled</span>
                      <span className="font-caption text-error">{d.no_show} no-show</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Department Performance */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
            <h3 className="font-h3 text-on-surface mb-4">Department Performance</h3>
            <div className="flex items-end gap-3 h-48">
              {deptPerformance.length === 0 ? <p className="font-body-sm text-on-surface-variant">No data</p> : deptPerformance.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="font-caption text-on-surface-variant">{d.calls}</span>
                  <div className="w-full bg-secondary rounded-t-md transition-all" style={{ height: `${(parseInt(d.calls) / maxDeptCalls) * 160}px` }} />
                  <span className="font-caption text-on-surface-variant text-center text-[10px]">{d.department}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Provider Leaderboard */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant">
              <h3 className="font-h3 text-on-surface flex items-center gap-2"><TrendingUp className="w-5 h-5 text-secondary" /> Provider Leaderboard</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container-high">
                    <th className="px-4 py-3 text-left font-label-caps text-on-surface-variant">Provider</th>
                    <th className="px-4 py-3 text-center font-label-caps text-on-surface-variant">Leads</th>
                    <th className="px-4 py-3 text-center font-label-caps text-on-surface-variant">Appointments</th>
                    <th className="px-4 py-3 text-center font-label-caps text-on-surface-variant">Satisfaction</th>
                  </tr>
                </thead>
                <tbody className="zebra-striping">
                  {providerLeaderboard.map((p, i) => (
                    <tr key={i} className="border-t border-outline-variant/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-body-md font-bold text-secondary">#{i + 1}</span>
                          <div>
                            <p className="font-body-md font-bold text-on-surface">{p.name}</p>
                            <p className="font-caption text-on-surface-variant">{p.specialty || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-data-tabular text-on-surface">{p.leads}</td>
                      <td className="px-4 py-3 text-center font-data-tabular text-on-surface">{p.appointments}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-data-tabular font-bold ${p.satisfaction >= 80 ? 'text-on-tertiary-container' : p.satisfaction >= 60 ? 'text-on-tertiary-container' : 'text-error'}`}>{p.satisfaction}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;
