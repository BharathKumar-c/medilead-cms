import { useState, useEffect, useCallback } from 'react';
import { CircleCheck, Info, AlertTriangle, X } from 'lucide-react';

const icons = {
  success: CircleCheck,
  info: Info,
  error: AlertTriangle,
  warning: AlertTriangle,
};

const styles = {
  success: {
    bg: 'bg-on-tertiary-container',
    border: 'border-on-tertiary-container',
    icon: 'text-on-tertiary-container',
    bar: 'bg-on-tertiary-container/40',
  },
  info: {
    bg: 'bg-secondary',
    border: 'border-secondary',
    icon: 'text-secondary',
    bar: 'bg-secondary/40',
  },
  error: {
    bg: 'bg-error',
    border: 'border-error',
    icon: 'text-error',
    bar: 'bg-error/40',
  },
  warning: {
    bg: 'bg-on-tertiary-container',
    border: 'border-on-tertiary-container',
    icon: 'text-on-tertiary-container',
    bar: 'bg-on-tertiary-container/40',
  },
};

const Toast = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const [exiting, setExiting] = useState(false);
  const Icon = icons[toast.type] || Info;
  const style = styles[toast.type] || styles.info;

  const handleRemove = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  useEffect(() => {
    const timer = setTimeout(handleRemove, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, handleRemove]);

  return (
    <div
      className={`pointer-events-auto w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden transition-all duration-300 ease-out ${
        exiting ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100 animate-slide-in'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          toast.type === 'success' ? 'bg-on-tertiary-container/10' :
          toast.type === 'error' ? 'bg-error/10' :
          toast.type === 'warning' ? 'bg-on-tertiary-container/10' :
          'bg-secondary/10'
        }`}>
          <Icon className={`w-4.5 h-4.5 ${style.icon}`} />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-body-md font-bold text-on-surface leading-snug">{toast.title}</p>
          {toast.message && (
            <p className="font-body-sm text-on-surface-variant mt-0.5 leading-snug">{toast.message}</p>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="flex-shrink-0 p-1 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 bg-surface-container-high overflow-hidden">
        <div
          className={`h-full ${style.bar} animate-shrink`}
          style={{ animationDuration: `${toast.duration || 4000}ms` }}
        />
      </div>
    </div>
  );
};

export default Toast;
