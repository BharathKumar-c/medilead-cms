import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, UserPlus, X } from 'lucide-react';
import api from '../services/api';

const CallPopup = ({ call, callState, onAnswer, onHangUp, onHold, onClose, leadInfo, onCreateLead }) => {
  const [elapsed, setElapsed] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  useEffect(() => {
    if (call && showHistory) {
      const phone = call.caller_number || call.callerNumber;
      if (phone) {
        setLoadingHistory(true);
        api.getCallHistoryByPhone(phone)
          .then(res => { if (res?.data?.calls) setCallHistory(res.data.calls); })
          .catch(() => {})
          .finally(() => setLoadingHistory(false));
      }
    }
  }, [call, showHistory]);

  if (!call) return null;

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const isIncoming = call.direction === 'inbound';
  const callerNumber = call.caller_number || call.callerNumber || 'Unknown';

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-surface rounded-2xl shadow-2xl border border-outline-variant animate-slide-up">
      {/* Header */}
      <div className="px-5 py-3 bg-surface-container-high border-b border-outline-variant flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isIncoming ? (
            <PhoneIncoming className="w-5 h-5 text-success animate-pulse" />
          ) : (
            <PhoneOutgoing className="w-5 h-5 text-secondary" />
          )}
          <div>
            <p className="font-body-md font-bold text-on-surface">{callerNumber}</p>
            <p className="font-caption text-on-surface-variant">
              {callState === 'ringing' ? (isIncoming ? 'Incoming Call' : 'Calling...') : formatTime(elapsed)}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-container-high">
          <X className="w-4 h-4 text-on-surface-variant" />
        </button>
      </div>

      {/* Lead Info */}
      {leadInfo && (
        <div className="px-5 py-3 bg-surface-container border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-white font-bold text-xs">{leadInfo.initials || leadInfo.name?.[0]}</span>
            </div>
            <div className="flex-1">
              <p className="font-body-md font-bold text-on-surface">{leadInfo.name}</p>
              <p className="font-caption text-on-surface-variant">
                {leadInfo.uhid || 'No UHID'} {leadInfo.status ? `· ${leadInfo.status}` : ''}
              </p>
            </div>
          </div>
          {/* Call stats */}
          {leadInfo.callStats && (
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-outline-variant/50">
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-on-surface-variant" />
                <span className="font-caption text-on-surface-variant">{leadInfo.callStats.totalCalls} calls</span>
              </div>
              {leadInfo.callStats.missedCalls > 0 && (
                <div className="flex items-center gap-1">
                  <PhoneMissed className="w-3 h-3 text-error" />
                  <span className="font-caption text-error font-bold">{leadInfo.callStats.missedCalls} missed</span>
                </div>
              )}
              {leadInfo.alternateContact && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-on-surface-variant" />
                  <span className="font-caption text-on-surface-variant">Alt: {leadInfo.alternateContact}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Call History Toggle */}
      {leadInfo && (
        <div className="px-5 py-2 border-b border-outline-variant">
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors">
            <Clock className="w-3 h-3" />
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
          {showHistory && (
            <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
              {loadingHistory ? (
                <p className="font-caption text-on-surface-variant">Loading...</p>
              ) : callHistory.length === 0 ? (
                <p className="font-caption text-on-surface-variant">No previous calls</p>
              ) : callHistory.slice(0, 5).map(ch => (
                <div key={ch.id} className="flex items-center justify-between text-xs py-1">
                  <span className={ch.status === 'missed' ? 'text-error' : 'text-on-surface-variant'}>
                    {ch.status === 'missed' ? 'Missed' : ch.direction} - {ch.duration || 0}s
                  </span>
                  <span className="text-on-surface-variant">
                    {new Date(ch.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {callState === 'ringing' && isIncoming && (
        <div className="px-5 py-3 space-y-2">
          <div className="flex gap-3">
            <button onClick={onAnswer} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-success text-on-primary rounded-lg font-body-md font-bold hover:opacity-90 transition-all">
              <Phone className="w-4 h-4" />
              Answer
            </button>
            <button onClick={onHangUp} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-error text-on-error rounded-lg font-body-md font-bold hover:opacity-90 transition-all">
              <PhoneOff className="w-4 h-4" />
              Reject
            </button>
          </div>
          {!leadInfo && onCreateLead && (
            <button
              onClick={() => onCreateLead(callerNumber)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Create Lead for {callerNumber}
            </button>
          )}
        </div>
      )}

      {callState === 'ringing' && !isIncoming && (
        <div className="px-5 py-3">
          <button onClick={onHangUp} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-error text-on-error rounded-lg font-body-md font-bold hover:opacity-90 transition-all">
            <PhoneOff className="w-4 h-4" />
            Cancel
          </button>
        </div>
      )}

      {callState === 'connected' && (
        <div className="px-5 py-3 flex gap-2">
          <button onClick={onHold} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors text-sm font-medium">
            {callState === 'held' ? <Phone className="w-4 h-4" /> : <PhoneOff className="w-4 h-4" />}
            {callState === 'held' ? 'Resume' : 'Hold'}
          </button>
          <button onClick={onHangUp} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-error text-on-error rounded-lg hover:opacity-90 transition-all text-sm font-medium">
            <PhoneOff className="w-4 h-4" />
            End
          </button>
        </div>
      )}

      {/* Ringing animation */}
      {callState === 'ringing' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success via-success/50 to-success animate-pulse" />
      )}
    </div>
  );
};

export default CallPopup;
