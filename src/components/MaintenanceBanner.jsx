import { useState, useEffect, useRef, useCallback } from 'react';
import { Construction, X } from 'lucide-react';
import api from '../services/api';

const POLL_INTERVAL = 30000; // 30 seconds

const MaintenanceBanner = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const intervalRef = useRef(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await api.getMaintenanceMode();
      setVisible(res.enabled);
      if (res.enabled) {
        setMessage(res.message || 'The application is currently undergoing maintenance. Please check back shortly.');
      }
    } catch {
      // Silently fail — if the server is unreachable we shouldn't show a banner
    }
  }, []);

  useEffect(() => {
    // Check immediately on mount
    checkStatus();

    // Poll periodically so the banner appears/disappears without page reload
    intervalRef.current = setInterval(checkStatus, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkStatus]);

  if (!visible || dismissed) return null;

  return (
    <div className="bg-on-error-container text-on-error-container border-b border-outline-variant">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-error/10 flex items-center justify-center">
            <Construction className="w-4 h-4 text-error" />
          </div>
          <div className="min-w-0">
            <p className="font-body-md font-bold text-on-surface truncate">
              Maintenance in Progress
            </p>
            <p className="font-caption text-on-surface-variant truncate">
              {message}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default MaintenanceBanner;
