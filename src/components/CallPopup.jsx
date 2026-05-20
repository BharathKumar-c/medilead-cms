import { useState, useEffect } from 'react';
import { Phone, PhoneOff, PhoneCall, Clock, User, X, Mic, MicOff, Volume2 } from 'lucide-react';

const CallPopup = ({ call, callState, onAnswer, onHangUp, onHold, onClose, leadInfo }) => {
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let timer;
    if (callState === 'connected') {
      timer = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(timer);
  }, [callState]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!call) return null;

  const isIncoming = call.direction === 'inbound';
  const isRinging = callState === 'ringing';
  const isConnected = callState === 'connected';
  const isHeld = callState === 'held';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
      <div className={`bg-surface-container-lowest border-2 rounded-2xl shadow-2xl w-80 overflow-hidden transition-colors ${
        isRinging ? 'border-secondary animate-pulse' : isConnected ? 'border-on-tertiary-container' : 'border-outline-variant'
      }`}>
        {/* Header */}
        <div className={`px-5 py-4 ${isRinging ? 'bg-secondary/10' : isConnected ? 'bg-on-tertiary-container/10' : 'bg-surface-container'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isRinging ? 'bg-secondary animate-pulse' : isConnected ? 'bg-on-tertiary-container' : 'bg-outline-variant'
              }`}>
                {isRinging ? (
                  <Phone className="w-6 h-6 text-white animate-bounce" />
                ) : isConnected ? (
                  <PhoneCall className="w-6 h-6 text-white" />
                ) : (
                  <Phone className="w-6 h-6 text-on-surface-variant" />
                )}
              </div>
              <div>
                <p className="font-body-md font-bold text-on-surface">
                  {isIncoming ? 'Incoming Call' : 'Outgoing Call'}
                </p>
                <p className="font-h3 text-on-surface">{call.caller_number || call.callerNumber || 'Unknown'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container-high transition-colors">
              <X className="w-4 h-4 text-on-surface-variant" />
            </button>
          </div>
        </div>

        {/* Lead Info */}
        {leadInfo && (
          <div className="px-5 py-3 bg-surface-container border-b border-outline-variant">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-white font-bold text-xs">{leadInfo.initials}</span>
              </div>
              <div>
                <p className="font-body-md font-bold text-on-surface">{leadInfo.name}</p>
                <p className="font-caption text-on-surface-variant">{leadInfo.uhid || 'No UHID'} &middot; {leadInfo.status}</p>
              </div>
            </div>
          </div>
        )}

        {/* Duration */}
        {isConnected && (
          <div className="px-5 py-3 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-on-tertiary-container" />
            <span className="font-data-tabular text-lg text-on-surface">{formatDuration(duration)}</span>
          </div>
        )}

        {/* Ringing Animation */}
        {isRinging && (
          <div className="px-5 py-4 flex items-center justify-center">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="w-1.5 h-8 bg-secondary rounded-full animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 flex items-center justify-center gap-3">
          {isRinging && isIncoming && (
            <>
              <button onClick={onAnswer}
                className="w-14 h-14 rounded-full bg-on-tertiary-container flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-lg">
                <Phone className="w-6 h-6 text-white" />
              </button>
              <button onClick={onHangUp}
                className="w-14 h-14 rounded-full bg-error flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-lg">
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {isConnected && (
            <>
              <button onClick={() => setMuted(!muted)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${muted ? 'bg-error/10 text-error' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
                {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button onClick={onHold}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isHeld ? 'bg-on-tertiary-container/10 text-on-tertiary-container' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
                <Volume2 className="w-4 h-4" />
              </button>
              <button onClick={onHangUp}
                className="w-14 h-14 rounded-full bg-error flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-lg">
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {isRinging && !isIncoming && (
            <button onClick={onHangUp}
              className="w-14 h-14 rounded-full bg-error flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-lg">
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallPopup;
