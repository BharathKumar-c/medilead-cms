import {useState, useEffect, useRef} from 'react';
import {
  X, Phone, UserPlus, Calendar, Download, Loader2,
  Clock, CheckCircle, AlertCircle, FileText, ChevronDown,
} from 'lucide-react';
import api from '../services/api';

const REPORT_TYPES = [
  {
    key: 'calls',
    label: 'Call Logs',
    icon: Phone,
    color: 'bg-secondary/10 text-secondary border-secondary/20',
    activeColor: 'border-secondary bg-secondary/5',
    desc: 'Total calls, missed, answered, inbound, outbound',
  },
  {
    key: 'leads',
    label: 'Leads',
    icon: UserPlus,
    color: 'bg-tertiary/10 text-tertiary border-tertiary/20',
    activeColor: 'border-tertiary bg-tertiary/5',
    desc: 'Total leads, follow-ups, completed, new',
  },
  {
    key: 'appointments',
    label: 'Appointments',
    icon: Calendar,
    color: 'bg-primary/10 text-primary border-primary/20',
    activeColor: 'border-primary bg-primary/5',
    desc: 'Total appointments, completed, cancelled, no-show',
  },
];

const SUMMARY_LABELS = {
  calls: { total: 'Total Calls', missed: 'Missed', answered: 'Answered', inbound: 'Inbound', outbound: 'Outbound' },
  leads: { total: 'Total Leads', followup: 'Follow-up', completed: 'Completed', new_leads: 'New Leads' },
  appointments: { total: 'Total Appointments', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show' },
};

const STATUS_ICONS = {
  pending: <Clock className="w-4 h-4 text-on-tertiary-container" />,
  processing: <Loader2 className="w-4 h-4 text-secondary animate-spin" />,
  completed: <CheckCircle className="w-4 h-4 text-on-secondary-container" />,
  failed: <AlertCircle className="w-4 h-4 text-error" />,
};

const STATUS_COLORS = {
  pending: 'bg-on-tertiary-container/10 text-on-tertiary-container',
  processing: 'bg-secondary/10 text-secondary',
  completed: 'bg-on-secondary-container/10 text-on-secondary-container',
  failed: 'bg-error/10 text-error',
};

const ExportPanel = ({ isOpen, onClose }) => {
  const [reportType, setReportType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [description, setDescription] = useState('');
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const pollRef = useRef(null);

  // Load jobs on open
  useEffect(() => {
    if (isOpen) loadJobs();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOpen]);

  // Auto-fetch summary when type + dates are set
  useEffect(() => {
    if (reportType && dateFrom && dateTo) {
      setLoadingSummary(true);
      api.getExportSummary(reportType, dateFrom, dateTo)
        .then(res => { if (res?.data) setSummary(res.data); })
        .catch(() => setSummary(null))
        .finally(() => setLoadingSummary(false));
    } else {
      setSummary(null);
    }
  }, [reportType, dateFrom, dateTo]);

  // Poll for pending/processing jobs
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'pending' || j.status === 'processing');
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(loadJobs, 5000);
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [jobs]);

  const loadJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await api.getExportJobs();
      if (res?.data?.jobs) setJobs(res.data.jobs);
    } catch {} finally { setLoadingJobs(false); }
  };

  const isLongRange = () => {
    if (!dateFrom || !dateTo) return false;
    const days = Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24));
    return days > 31;
  };

  const handleExport = async () => {
    if (!reportType || !dateFrom || !dateTo) return;
    setExporting(true);
    try {
      const res = await api.createExport({
        report_type: reportType,
        date_from: dateFrom,
        date_to: dateTo,
        description,
      });

      if (res?.data?.job) {
        if (res.data.job.isImmediate) {
          // Immediate download — fetch the file
          const blob = await api.downloadExport(res.data.job.id);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${reportType}_${dateFrom}_${dateTo}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // Background job — refresh list
          loadJobs();
        }
      }
      // Reset form
      setReportType('');
      setDateFrom('');
      setDateTo('');
      setDescription('');
      setSummary(null);
    } catch (err) {
      console.error('Export error:', err);
    } finally { setExporting(false); }
  };

  const handleDownload = async (jobId) => {
    try {
      const blob = await api.downloadExport(jobId);
      const job = jobs.find(j => j.id === jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job?.report_type || 'report'}_${job?.date_from || ''}_${job?.date_to || ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const canExport = reportType && dateFrom && dateTo && description.trim().length >= 2;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface shadow-2xl flex flex-col h-full animate-slide-in z-10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-lowest">
          <div>
            <h2 className="font-h1 text-xl text-on-surface">Export Report</h2>
            <p className="font-body-sm text-on-surface-variant mt-0.5">Select data type and date range to export</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Step 1: Select Data Type */}
          <div>
            <h3 className="font-body-md text-on-surface font-bold mb-3">1. Select Data Type</h3>
            <div className="grid grid-cols-3 gap-3">
              {REPORT_TYPES.map((rt) => {
                const Icon = rt.icon;
                const selected = reportType === rt.key;
                return (
                  <button
                    key={rt.key}
                    onClick={() => setReportType(rt.key)}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      selected ? rt.activeColor + ' shadow-sm' : 'border-outline-variant hover:border-outline'
                    }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${rt.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className={`font-body-md font-bold ${selected ? 'text-on-surface' : 'text-on-surface-variant'}`}>{rt.label}</p>
                    <p className="font-caption text-on-surface-variant/60 mt-0.5 text-xs leading-tight">{rt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Date Range */}
          {reportType && (
            <div>
              <h3 className="font-body-md text-on-surface font-bold mb-3">2. Date Range</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-caption text-on-surface-variant uppercase mb-1.5 inline-flex items-center gap-1 leading-none">
                    From
                  </label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                </div>
                <div>
                  <label className="block font-caption text-on-surface-variant uppercase mb-1.5 inline-flex items-center gap-1 leading-none">
                    To
                  </label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                </div>
              </div>

              {/* Long range notice */}
              {isLongRange() && (
                <div className="mt-3 p-3 bg-on-tertiary-container/10 border border-on-tertiary-container/20 rounded-lg flex items-start gap-2">
                  <Clock className="w-4 h-4 text-on-tertiary-container flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-body-sm text-on-surface font-bold">Background Processing</p>
                    <p className="font-caption text-on-surface-variant">Date range exceeds 1 month. The export will be processed in the background. You can download it once ready.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Description */}
          {reportType && dateFrom && dateTo && (
            <div>
              <h3 className="font-body-md text-on-surface font-bold mb-3">3. Description</h3>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this export (min 2 characters)..."
                rows={2}
                className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50 resize-none"
              />
            </div>
          )}

          {/* Summary Preview */}
          {reportType && dateFrom && dateTo && (
            <div>
              <h3 className="font-body-md text-on-surface font-bold mb-3">Summary Preview</h3>
              {loadingSummary ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                </div>
              ) : summary ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(SUMMARY_LABELS[reportType] || {}).map(([key, label]) => (
                    <div key={key} className="bg-surface-container rounded-lg p-3 text-center">
                      <p className="font-caption text-on-surface-variant uppercase text-xs">{label}</p>
                      <p className="font-h3 text-on-surface mt-1">{summary[key] ?? 0}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body-sm text-on-surface-variant">No data found for this date range.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={!canExport || exporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {exporting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
              ) : isLongRange() ? (
                <><Clock className="w-4 h-4" /> Submit Request</>
              ) : (
                <><Download className="w-4 h-4" /> Download CSV</>
              )}
            </button>
          </div>
        </div>

        {/* Job History */}
        {jobs.length > 0 && (
          <div className="border-t border-outline-variant bg-surface-container-lowest">
            <div className="px-6 py-3 border-b border-outline-variant">
              <h3 className="font-body-md text-on-surface font-bold">Export History</h3>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between px-6 py-3 border-b border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-body-sm text-on-surface font-bold truncate">
                        {job.report_type.charAt(0).toUpperCase() + job.report_type.slice(1)} — {job.description || 'No description'}
                      </p>
                      <p className="font-caption text-on-surface-variant/60">
                        {job.date_from} to {job.date_to}
                        {job.row_count > 0 && ` · ${job.row_count} rows`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[job.status] || ''}`}>
                      {STATUS_ICONS[job.status]}
                      {job.status}
                    </span>
                    {job.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(job.id)}
                        className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                        title="Download">
                        <Download className="w-4 h-4 text-secondary" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportPanel;
