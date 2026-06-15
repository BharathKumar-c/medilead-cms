import { useState, useEffect } from 'react';
import { Calendar, Clock, X, Check, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ErrorMsg = ({ field, errors }) =>
  errors[field] ? (
    <p className="font-caption text-error mt-1">{errors[field]}</p>
  ) : null;

const FollowUpModal = ({ isOpen, onClose, lead, editFollowUp, onSuccess, onError }) => {
  const { user } = useAuth();
  const isEditMode = !!editFollowUp;
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    if (isEditMode && editFollowUp && editFollowUp.scheduled_at) {
      const dt = new Date(editFollowUp.scheduled_at);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const hh = String(dt.getHours()).padStart(2, '0');
      const min = String(dt.getMinutes()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      setTime(`${hh}:${min}`);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
      setTime('10:00');
    }
    setErrors({});
  }, [isOpen, isEditMode, editFollowUp]);

  const validate = () => {
    const errs = {};
    if (!date) errs.date = 'Date is required';
    if (!time) errs.time = 'Time is required';
    if (date && time) {
      const scheduled = new Date(`${date}T${time}`);
      if (scheduled <= new Date()) {
        errs.datetime = 'Follow-up must be scheduled for a future date and time';
      }
    }
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      if (isEditMode) {
        await api.updateFollowUp(editFollowUp.id, { scheduled_at: scheduledAt });
        const displayDate = new Date(scheduledAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        if (onSuccess) onSuccess(`Follow-up rescheduled for ${displayDate}`);
      } else {
        await api.createFollowUp({
          lead_id: lead.id,
          assigned_to: user.id,
          scheduled_at: scheduledAt,
          notes: null,
        });
        const displayDate = new Date(scheduledAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        if (onSuccess) onSuccess(`Follow-up scheduled for ${lead.name} on ${displayDate}`);
      }
      onClose();
    } catch (err) {
      if (onError) onError(err.message || 'Failed to schedule follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const leadName = isEditMode ? editFollowUp.leadName : lead?.name;
  const leadCode = isEditMode ? editFollowUp.leadCode : lead?.code;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-on-tertiary-container/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-on-tertiary-container" />
            </div>
            <div>
              <h3 className="font-h3 text-on-surface">
                {isEditMode ? 'Reschedule Follow-Up' : 'Schedule Follow-Up'}
              </h3>
              <p className="font-caption text-on-surface-variant">
                {leadCode ? `${leadCode} — ` : ''}{leadName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {errors.datetime && (
            <div className="flex items-center gap-2 px-3 py-2 bg-error/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-error flex-shrink-0" />
              <p className="font-body-sm text-error">{errors.datetime}</p>
            </div>
          )}

          <div>
            <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
              <Calendar className="w-3.5 h-3.5" />
              Date <span className="text-error text-base font-bold leading-none">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setErrors((prev) => ({ ...prev, date: undefined, datetime: undefined }));
              }}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-4 py-3 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 transition-all ${
                errors.date ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
              }`}
            />
            <ErrorMsg field="date" errors={errors} />
          </div>

          <div>
            <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
              <Clock className="w-3.5 h-3.5" />
              Time <span className="text-error text-base font-bold leading-none">*</span>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setErrors((prev) => ({ ...prev, time: undefined, datetime: undefined }));
              }}
              className={`w-full px-4 py-3 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 transition-all ${
                errors.time ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
              }`}
            />
            <ErrorMsg field="time" errors={errors} />
          </div>

          {!isEditMode && lead?.assignedTo && (
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-container rounded-lg">
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {lead.assignedTo.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <span className="font-body-sm text-on-surface-variant">
                Assigned to <strong className="text-on-surface">{lead.assignedTo}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-low">
          <button onClick={onClose} className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 bg-on-tertiary-container text-white rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isEditMode ? 'Rescheduling...' : 'Scheduling...'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isEditMode ? 'Reschedule Follow-Up' : 'Schedule Follow-Up'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpModal;
