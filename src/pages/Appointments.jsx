import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, X, Calendar,
  Clock, User, Phone, Mail, FileText, AlertTriangle, Check, Ban, MoreHorizontal,
} from 'lucide-react';
import Layout from '../components/Layout';
import AppointmentFormSlideOver from '../components/AppointmentFormSlideOver';
import Toast from '../components/Toast';
import api from '../services/api';

let toastId = 0;

const Appointments = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [appointments, setAppointments] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [todayOverview, setTodayOverview] = useState({ scheduled: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [timeSlots] = useState(['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '' });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const addToast = (type, title, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [currentMonth, currentYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aptRes, todayRes] = await Promise.all([
        api.getAppointments({ limit: 50 }),
        api.getTodayOverview(),
      ]);
      setAppointments(aptRes.data.appointments);
      if (todayRes?.data) {
        setTodayOverview(todayRes.data.todayOverview || {});
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendar = async () => {
    try {
      const res = await api.getCalendarData(currentYear, currentMonth + 1);
      if (res?.data?.appointments) setCalendarData(res.data.appointments);
    } catch (err) {
      console.error('Failed to load calendar:', err);
    }
  };

  const navigateMonth = (dir) => {
    setCurrentMonth(prev => {
      const next = prev + dir;
      if (next > 11) { setCurrentYear(y => y + 1); return 0; }
      if (next < 0) { setCurrentYear(y => y - 1); return 11; }
      return next;
    });
  };

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const calendarDays = [];
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const getStatusStyles = (status) => {
    switch (status) {
      case 'Scheduled': return 'bg-secondary/10 text-secondary border border-secondary/20';
      case 'Confirmed': return 'bg-on-tertiary-container/10 text-on-tertiary-container border border-on-tertiary-container/20';
      case 'Completed': return 'bg-on-tertiary-container/10 text-on-tertiary-container border border-on-tertiary-container/20';
      case 'Cancelled': return 'bg-error/10 text-error border border-error/20';
      case 'No Show': return 'bg-error/10 text-error border border-error/20';
      default: return 'bg-surface-container-high text-on-surface-variant';
    }
  };

  // Reschedule
  const handleReschedule = async () => {
    if (!rescheduleForm.date || !rescheduleForm.time) {
      addToast('error', 'Missing Fields', 'New date and time are required.');
      return;
    }
    try {
      await api.rescheduleAppointment(rescheduleModal.id, {
        appointment_date: rescheduleForm.date,
        appointment_time: rescheduleForm.time,
      });
      addToast('success', 'Rescheduled', `Appointment moved to ${rescheduleForm.date} at ${rescheduleForm.time}.`);
      setRescheduleModal(null);
      setRescheduleForm({ date: '', time: '' });
      loadData();
      loadCalendar();
    } catch (err) {
      addToast('error', 'Reschedule Failed', err.message || 'Could not reschedule.');
    }
  };

  // Cancel
  const handleCancel = async () => {
    if (!cancelConfirm) return;
    try {
      await api.cancelAppointment(cancelConfirm.id, cancelReason);
      addToast('success', 'Cancelled', `Appointment for ${cancelConfirm.patient_name} cancelled.`);
      setCancelConfirm(null);
      setCancelReason('');
      loadData();
      loadCalendar();
    } catch (err) {
      addToast('error', 'Cancel Failed', err.message || 'Could not cancel.');
    }
  };

  // Complete
  const handleComplete = async (apt) => {
    try {
      await api.updateAppointment(apt.id, { status: 'Completed' });
      addToast('success', 'Completed', `Appointment for ${apt.patient_name} marked as completed.`);
      setActionMenuId(null);
      loadData();
      loadCalendar();
    } catch (err) {
      addToast('error', 'Failed', err.message || 'Could not update.');
    }
  };

  // No Show
  const handleNoShow = async (apt) => {
    try {
      await api.markNoShow(apt.id);
      addToast('warning', 'No Show', `${apt.patient_name} marked as no show.`);
      setActionMenuId(null);
      loadData();
      loadCalendar();
    } catch (err) {
      addToast('error', 'Failed', err.message || 'Could not update.');
    }
  };

  // Confirm
  const handleConfirm = async (apt) => {
    try {
      await api.updateAppointment(apt.id, { status: 'Confirmed' });
      addToast('success', 'Confirmed', `Appointment for ${apt.patient_name} confirmed.`);
      setActionMenuId(null);
      loadData();
      loadCalendar();
    } catch (err) {
      addToast('error', 'Failed', err.message || 'Could not update.');
    }
  };

  return (
    <Layout title="Appointments">
      <div className="p-4 sm:p-6 lg:p-10 data-stage">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h1 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background">Appointments</h1>
          <button onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Book Appointment
          </button>
        </div>

        {/* Today Overview Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Scheduled', value: todayOverview.scheduled || 0, border: 'border-t-secondary', color: 'text-secondary' },
            { label: 'Completed', value: todayOverview.completed || 0, border: 'border-t-on-tertiary-container', color: 'text-on-tertiary-container' },
            { label: 'Cancelled', value: todayOverview.cancelled || 0, border: 'border-t-error', color: 'text-error' },
          ].map((card, i) => (
            <div key={i} className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 metric-card-accent ${card.border} shadow-sm`}>
              <span className="font-caption text-on-surface-variant">{card.label}</span>
              <div className={`font-h2 ${card.color}`}>{card.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => navigateMonth(-1)} className="p-2 rounded-lg hover:bg-surface-container transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <h2 className="font-h3 text-on-surface">{monthNames[currentMonth]} {currentYear}</h2>
              <button onClick={() => navigateMonth(1)} className="p-2 rounded-lg hover:bg-surface-container transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {dayNames.map(d => (
                <div key={d} className="text-center font-caption text-on-surface-variant py-2">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                const dateStr = day ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                const dayAppts = dateStr ? (calendarData[dateStr] || []) : [];
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;

                return (
                  <div key={i} className={`min-h-[80px] p-1.5 rounded-lg border transition-colors ${
                    !day ? 'border-transparent' :
                    isToday ? 'border-secondary bg-secondary/5' :
                    dayAppts.length > 0 ? 'border-outline-variant bg-surface-container' :
                    'border-outline-variant/50 hover:bg-surface-container/50'
                  }`}>
                    {day && (
                      <>
                        <span className={`font-body-sm font-bold ${isToday ? 'text-secondary' : 'text-on-surface'}`}>{day}</span>
                        {dayAppts.slice(0, 2).map((apt, j) => (
                          <div key={j} className={`mt-0.5 px-1 py-0.5 rounded text-[10px] font-bold truncate ${
                            apt.status === 'Cancelled' ? 'bg-error/10 text-error' :
                            apt.status === 'Completed' ? 'bg-on-tertiary-container/10 text-on-tertiary-container' :
                            'bg-secondary/10 text-secondary'
                          }`}>
                            {apt.patient_name}
                          </div>
                        ))}
                        {dayAppts.length > 2 && <span className="text-[10px] text-on-surface-variant">+{dayAppts.length - 2} more</span>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Appointments List */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant">
              <h3 className="font-h3 text-on-surface">Upcoming Appointments</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center font-body-md text-on-surface-variant">Loading...</div>
              ) : appointments.length === 0 ? (
                <div className="p-6 text-center font-body-md text-on-surface-variant">No appointments found.</div>
              ) : appointments.slice(0, 10).map(apt => (
                <div key={apt.id} className="px-5 py-3 border-b border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                        <span className="text-white font-bold text-xs">{apt.initials}</span>
                      </div>
                      <div>
                        <p className="font-body-md font-bold text-on-surface">{apt.patient_name}</p>
                        <p className="font-caption text-on-surface-variant">{apt.department} &middot; {apt.appointment_time}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button onClick={() => setActionMenuId(actionMenuId === apt.id ? null : apt.id)}
                        className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-on-surface-variant" />
                      </button>
                      {actionMenuId === apt.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-10 py-1">
                          {apt.status === 'Scheduled' && (
                            <button onClick={() => { handleConfirm(apt); setActionMenuId(null); }} className="w-full text-left px-4 py-2 font-body-md text-on-surface hover:bg-surface-container flex items-center gap-2"><Check className="w-4 h-4 text-on-tertiary-container" /> Confirm</button>
                          )}
                          {(apt.status === 'Scheduled' || apt.status === 'Confirmed') && (
                            <>
                              <button onClick={() => { handleComplete(apt); }} className="w-full text-left px-4 py-2 font-body-md text-on-surface hover:bg-surface-container flex items-center gap-2"><Check className="w-4 h-4 text-on-tertiary-container" /> Mark Complete</button>
                              <button onClick={() => { setRescheduleModal(apt); setActionMenuId(null); }} className="w-full text-left px-4 py-2 font-body-md text-on-surface hover:bg-surface-container flex items-center gap-2"><Calendar className="w-4 h-4 text-secondary" /> Reschedule</button>
                              <button onClick={() => { handleNoShow(apt); }} className="w-full text-left px-4 py-2 font-body-md text-on-surface hover:bg-surface-container flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-on-tertiary-container" /> No Show</button>
                              <button onClick={() => { setCancelConfirm(apt); setActionMenuId(null); }} className="w-full text-left px-4 py-2 font-body-md text-error hover:bg-error/5 flex items-center gap-2"><Ban className="w-4 h-4" /> Cancel</button>
                            </>
                          )}
                          <button onClick={() => { setSelectedAppointment(apt); setActionMenuId(null); }} className="w-full text-left px-4 py-2 font-body-md text-on-surface hover:bg-surface-container flex items-center gap-2"><FileText className="w-4 h-4 text-on-surface-variant" /> View Details</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full font-caption text-[10px] font-bold ${getStatusStyles(apt.status)}`}>{apt.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reschedule Modal */}
        {rescheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setRescheduleModal(null)} />
            <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h3 className="font-h3 text-on-surface mb-1">Reschedule Appointment</h3>
              <p className="font-body-md text-on-surface-variant mb-4">Patient: <strong>{rescheduleModal.patient_name}</strong></p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-caption text-on-surface-variant uppercase mb-1.5">New Date</label>
                  <input type="date" value={rescheduleForm.date} onChange={e => setRescheduleForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                </div>
                <div>
                  <label className="block font-caption text-on-surface-variant uppercase mb-1.5">New Time</label>
                  <div className="relative">
                    <select value={rescheduleForm.time} onChange={e => setRescheduleForm(p => ({ ...p, time: e.target.value }))}
                      className="w-full px-4 py-3 pr-10 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all appearance-none">
                      <option value="">Select time</option>
                      {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setRescheduleModal(null)} className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">Cancel</button>
                <button onClick={handleReschedule} className="px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">Reschedule</button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation */}
        {cancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => { setCancelConfirm(null); setCancelReason(''); }} />
            <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-7 h-7 text-error" /></div>
              <h3 className="font-h3 text-on-surface mb-2 text-center">Cancel Appointment?</h3>
              <p className="font-body-md text-on-surface-variant mb-4 text-center">Patient: <strong>{cancelConfirm.patient_name}</strong></p>
              <div className="mb-4">
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Cancellation Reason</label>
                <textarea rows={2} value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  placeholder="Optional reason for cancellation"
                  className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all resize-none" />
              </div>
              <div className="flex justify-center gap-3">
                <button onClick={() => { setCancelConfirm(null); setCancelReason(''); }} className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">Keep</button>
                <button onClick={handleCancel} className="px-5 py-2.5 bg-error text-on-error rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">Cancel Appointment</button>
              </div>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setSelectedAppointment(null)} />
            <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-h2 text-on-surface">Appointment Details</h3>
                <button onClick={() => setSelectedAppointment(null)} className="p-2 rounded-lg hover:bg-surface-container transition-colors"><X className="w-5 h-5 text-on-surface-variant" /></button>
              </div>
              <div className="space-y-3">
                {[
                  { icon: <User className="w-4 h-4 text-secondary" />, label: 'Patient', value: selectedAppointment.patient_name },
                  { icon: <Phone className="w-4 h-4 text-secondary" />, label: 'Phone', value: selectedAppointment.phone || '—' },
                  { icon: <Mail className="w-4 h-4 text-secondary" />, label: 'Email', value: selectedAppointment.email || '—' },
                  { icon: <FileText className="w-4 h-4 text-secondary" />, label: 'Department', value: selectedAppointment.department },
                  { icon: <User className="w-4 h-4 text-secondary" />, label: 'Provider', value: selectedAppointment.provider_name || '—' },
                  { icon: <Calendar className="w-4 h-4 text-secondary" />, label: 'Date', value: selectedAppointment.appointment_date ? new Date(selectedAppointment.appointment_date).toLocaleDateString('en-IN') : '—' },
                  { icon: <Clock className="w-4 h-4 text-secondary" />, label: 'Time', value: selectedAppointment.appointment_time },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {item.icon}
                    <div>
                      <p className="font-caption text-on-surface-variant uppercase">{item.label}</p>
                      <p className="font-body-md text-on-surface">{item.value}</p>
                    </div>
                  </div>
                ))}
                {selectedAppointment.notes && (
                  <div className="pt-2 border-t border-outline-variant">
                    <p className="font-caption text-on-surface-variant uppercase mb-1">Notes</p>
                    <p className="font-body-md text-on-surface">{selectedAppointment.notes}</p>
                  </div>
                )}
                {selectedAppointment.cancellation_reason && (
                  <div className="pt-2 border-t border-outline-variant">
                    <p className="font-caption text-error uppercase mb-1">Cancellation Reason</p>
                    <p className="font-body-md text-on-surface">{selectedAppointment.cancellation_reason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <Toast toasts={toasts} onRemove={removeToast} />

        <AppointmentFormSlideOver
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={(msg) => {
            addToast('success', 'Appointment Booked', msg);
            loadData();
            loadCalendar();
          }}
          onError={(msg) => addToast('error', 'Booking Failed', msg)}
        />
      </div>
    </Layout>
  );
};

export default Appointments;
