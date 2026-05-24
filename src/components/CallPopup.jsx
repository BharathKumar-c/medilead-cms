import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, UserPlus, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, X } from 'lucide-react';
import api from '../services/api';

const CallPopup = ({ call, callState, onAnswer, onHangUp, onClose, leadInfo, onCreateLead }) => {
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  // Timer for connected calls
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  // Fetch call history when toggled
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

  // Handle dismiss with exit animation
  const handleDismiss = useCallback((action) => {
    setExiting(true);
    setTimeout(() => {
      if (action === 'answer' && onAnswer) onAnswer();
      else if (action === 'hangup' && onHangUp) onHangUp();
      else if (action === 'close' && onClose) onClose();
    }, 250);
  }, [onAnswer, onHangUp, onClose]);

  if (!call) return null;

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const callerNumber = call.caller_number || call.callerNumber || 'Unknown';
  const isIncoming = call.direction === 'inbound' || call.direction === 'incoming';

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-[340px] ${exiting ? 'animate-slide-down' : 'animate-slide-up'}`}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant overflow-hidden">
        {/* ── Top Gradient Accent ── */}
        {callState === 'ringing' && (
          <div className="h-1 bg-gradient-to-r from-success via-secondary to-success bg-[length:200%_100%] animate-gradient-shift" />
        )}
        {callState === 'connected' && (
          <div className="h-1 bg-gradient-to-r from-secondary via-blue-400 to-secondary bg-[length:200%_100%] animate-gradient-shift" />
        )}

        {/* ── Caller Info Section ── */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar/Icon */}
              <div className={`relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                callState === 'ringing'
                  ? 'bg-success/10 animate-ring-pulse'
                  : callState === 'connected'
                    ? 'bg-secondary/10'
                    : 'bg-surface-container-high'
              }`}>
                {isIncoming ? (
                  <PhoneIncoming className={`w-6 h-6 ${callState === 'ringing' ? 'text-success' : 'text-secondary'}`} />
                ) : (
                  <PhoneOutgoing className="w-6 h-6 text-on-tertiary-container" />
                )}
                {callState === 'ringing' && (
                  <span className="absolute inset-0 rounded-full border-2 border-success/30 animate-ring-expand" />
                )}
                {callState === 'ringing' && (
                  <span className="absolute inset-0 rounded-full border-2 border-success/15 animate-ring-expand" style={{ animationDelay: '0.5s' }} />
                )}
              </div>

              <div className="min-w-0">
                <p className="font-body-lg font-bold text-on-surface truncate max-w-[200px]">{callerNumber}</p>
                <p className="font-caption text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                  {callState === 'ringing' && (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                      </span>
                      {isIncoming ? 'Incoming Call' : 'Calling...'}
                    </>
                  )}
                  {callState === 'connected' && (
                    <>
                      <Clock className="w-3 h-3" />
                      <span className="font-data-tabular">{formatTime(elapsed)}</span>
                    </>
                  )}
                  {callState === 'ended' && 'Call Ended'}
                </p>
              </div>
            </div>

            {/* Close button */}
            {(callState === 'ringing' || callState === 'connected') && (
              <button
                onClick={() => handleDismiss('close')}
                className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors flex-shrink-0 -mr-1 -mt-1"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            )}
          </div>
        </div>

        {/* ── Lead Info (if matched) ── */}
        {leadInfo && (
          <div className="mx-4 mb-2 px-4 py-3 bg-surface-container rounded-xl border border-outline-variant/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{leadInfo.initials || leadInfo.name?.[0] || '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body-md font-bold text-on-surface truncate">{leadInfo.name || 'Unknown Patient'}</p>
                {leadInfo.uhid && (
                  <p className="font-caption text-on-surface-variant">UHID: {leadInfo.uhid}</p>
                )}
              </div>
            </div>
            {/* Call stats */}
            {leadInfo.callStats && (
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-outline-variant/50">
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
                <button onClick={() => setShowHistory(!showHistory)} className="ml-auto flex items-center gap-1 text-secondary hover:underline font-caption font-bold">
                  <Clock className="w-3 h-3" />
                  {showHistory ? 'Hide' : 'History'}
                </button>
              </div>
            )}
            {/* Call History Dropdown */}
            {showHistory && (
              <div className="mt-2 pt-2 border-t border-outline-variant/50 max-h-28 overflow-y-auto space-y-1">
                {loadingHistory ? (
                  <p className="font-caption text-on-surface-variant text-center py-1">Loading...</p>
                ) : callHistory.length === 0 ? (
                  <p className="font-caption text-on-surface-variant text-center py-1">No previous calls</p>
                ) : (
                  callHistory.slice(0, 5).map(ch => (
                    <div key={ch.id} className="flex items-center justify-between text-xs py-1">
                      <span className={`font-medium ${ch.status === 'missed' ? 'text-error' : 'text-on-surface-variant'}`}>
                        {ch.status === 'missed' ? 'Missed' : ch.direction} · {ch.duration || 0}s
                      </span>
                      <span className="text-on-surface-variant">
                        {new Date(ch.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="px-4 pb-4 pt-1">
          {/* Ringing State - Incoming */}
          {callState === 'ringing' && isIncoming && (
            <div className="space-y-2.5">
              <div className="flex gap-2.5">
                <button
                  onClick={() => handleDismiss('answer')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-success text-white rounded-xl font-body-md font-bold hover:bg-success/90 active:scale-[0.97] transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" />
                  <span>Accept</span>
                </button>
                <button
                  onClick={() => handleDismiss('hangup')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-error text-white rounded-xl font-body-md font-bold hover:bg-error/90 active:scale-[0.97] transition-all shadow-sm"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-body-md font-bold transition-all flex-1 ${
                    isMuted
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/50'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
                {onCreateLead && (
                  <button
                    onClick={() => onCreateLead(callerNumber)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary/10 text-secondary rounded-xl font-body-md font-bold hover:bg-secondary/20 transition-all flex-1 border border-secondary/20"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Lead</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Ringing State - Outgoing */}
          {callState === 'ringing' && !isIncoming && (
            <button
              onClick={() => handleDismiss('hangup')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-error text-white rounded-xl font-body-md font-bold hover:bg-error/90 active:scale-[0.97] transition-all shadow-sm"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Cancel Call</span>
            </button>
          )}

          {/* Connected State */}
          {callState === 'connected' && (
            <div className="space-y-2.5">
              <div className="flex gap-2.5">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-body-md font-bold transition-all flex-1 ${
                    isMuted
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/50'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
                {!leadInfo && onCreateLead && (
                  <button
                    onClick={() => onCreateLead(callerNumber)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary/10 text-secondary rounded-xl font-body-md font-bold hover:bg-secondary/20 transition-all flex-1 border border-secondary/20"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Lead</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => handleDismiss('hangup')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-error text-white rounded-xl font-body-md font-bold hover:bg-error/90 active:scale-[0.97] transition-all shadow-sm"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            </div>
          )}

          {/* Ended State */}
          {callState === 'ended' && (
            <div className="flex gap-2.5">
              {onCreateLead && !leadInfo && (
                <button
                  onClick={() => onCreateLead(callerNumber)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-xl font-body-md font-bold hover:bg-secondary/90 active:scale-[0.97] transition-all shadow-sm flex-1"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Lead</span>
                </button>
              )}
              <button
                onClick={() => handleDismiss('close')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-container-high text-on-surface rounded-xl font-body-md font-bold hover:bg-surface-container-highest transition-all flex-1 border border-outline-variant/50"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallPopup;
