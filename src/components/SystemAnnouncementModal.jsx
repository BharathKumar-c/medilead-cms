import { useState } from 'react';
import { Megaphone, X, Send, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import api from '../services/api';

/**
 * SystemAnnouncementModal — allows super admins to send system-wide announcements.
 * Announcements are delivered to all active users as notifications.
 *
 * Props:
 *   isOpen       — boolean
 *   onClose      — () => void
 *   onSuccess    — (message) => void
 *   onError      — (message) => void
 */
const SystemAnnouncementModal = ({ isOpen, onClose, onSuccess, onError }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const types = [
    { value: 'info', label: 'Info', icon: Info, color: 'text-secondary' },
    { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-on-tertiary-container' },
    { value: 'urgent', label: 'Urgent', icon: AlertTriangle, color: 'text-error' },
    { value: 'success', label: 'Success', icon: CheckCircle, color: 'text-on-tertiary-container' },
  ];

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (title.trim().length > 200) errs.title = 'Title must be under 200 characters';
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
      const result = await api.sendAnnouncement({
        title: title.trim(),
        message: message.trim() || undefined,
        type,
      });

      if (onSuccess) {
        onSuccess(result.message || `Announcement sent to ${result.data?.recipientCount || 0} users.`);
      }
      setTitle('');
      setMessage('');
      setType('info');
      setErrors({});
      onClose();
    } catch (err) {
      if (onError) {
        onError(err.message || 'Failed to send announcement');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const ErrorMsg = ({ field }) =>
    errors[field] ? (
      <p className="font-caption text-error mt-1">{errors[field]}</p>
    ) : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-error" />
            </div>
            <div>
              <h3 className="font-h3 text-on-surface">System Announcement</h3>
              <p className="font-caption text-on-surface-variant">
                Send to all active users
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="font-caption text-on-surface-variant uppercase mb-2 block">
              Announcement Type
            </label>
            <div className="flex gap-2">
              {types.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-body-md transition-all ${
                      type === t.value
                        ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                        : 'border border-outline-variant text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${type === t.value ? 'text-white' : t.color}`} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
              Title <span className="text-error text-base font-bold leading-none">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Scheduled maintenance on June 20"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              maxLength={200}
              className={`w-full px-4 py-3 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 transition-all placeholder:text-on-surface-variant/50 ${
                errors.title
                  ? 'border-error focus:border-error focus:ring-error/20'
                  : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
              }`}
            />
            <div className="flex justify-between">
              <ErrorMsg field="title" />
              <span className="font-caption text-on-surface-variant/50 mt-1">
                {title.length}/200
              </span>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
              Message (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Additional details about this announcement..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all resize-none placeholder:text-on-surface-variant/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-low">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 bg-error text-white rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Announcement
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemAnnouncementModal;
