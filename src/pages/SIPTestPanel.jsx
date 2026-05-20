import { useState } from 'react';
import { Phone, PhoneIncoming, PhoneOff, PhoneMissed, Clock, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import api from '../services/api';

let toastId = 0;

const eventOptions = [
  { value: 'incoming', label: 'Incoming Call', icon: PhoneIncoming, color: 'text-secondary', desc: 'Simulates a new inbound call (ringing)' },
  { value: 'answered', label: 'Answered', icon: Phone, color: 'text-on-tertiary-container', desc: 'Call was picked up and connected' },
  { value: 'ended', label: 'Ended', icon: PhoneOff, color: 'text-on-surface-variant', desc: 'Call was disconnected after duration' },
  { value: 'missed', label: 'Missed', icon: PhoneMissed, color: 'text-error', desc: 'Call was not answered' },
];

const SIPTestPanel = () => {
  const [form, setForm] = useState({
    caller: '',
    callee: '18005551234',
    event: 'incoming',
    duration: '30',
  });
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;

    if (!form.caller.trim()) {
      addToast('error', 'Validation', 'Caller phone number is required.');
      return;
    }
    if (!/^\d{10,15}$/.test(form.caller.trim())) {
      addToast('error', 'Validation', 'Caller number must be 10-15 digits.');
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const payload = {
        event: form.event,
        caller: form.caller.trim(),
        callee: form.callee.trim() || '18005551234',
      };

      if (form.event === 'ended' || form.event === 'answered') {
        payload.duration = parseInt(form.duration) || 0;
      }

      const res = await api.triggerSipEvent(payload);

      setLastResult({
        success: true,
        message: res.message || `SIP event "${form.event}" triggered successfully.`,
        payload,
      });

      addToast('success', 'SIP Event Sent', `${form.event} event for ${form.caller} processed.`);
    } catch (err) {
      setLastResult({
        success: false,
        message: err.message || 'Failed to trigger SIP event.',
      });
      addToast('error', 'Failed', err.message || 'Could not trigger SIP event.');
    } finally {
      setSending(false);
    }
  };

  const selectedEvent = eventOptions.find(e => e.value === form.event);

  return (
    <Layout title="SIP Test Panel">
      <div className="p-4 sm:p-6 lg:p-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-h1 text-[24px] sm:text-[28px] lg:text-[32px] text-on-background">SIP Test Panel</h1>
            <p className="font-body-md sm:font-body-lg text-on-surface-variant mt-1">
              Simulate incoming call events for testing and demo purposes.
            </p>
          </div>

          {/* Info banner */}
          <div className="mb-6 p-4 bg-secondary/5 border border-secondary/20 rounded-xl">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-body-md text-on-surface font-medium">How it works</p>
                <p className="font-body-sm text-on-surface-variant mt-1">
                  This panel sends a SIP event to <code className="px-1.5 py-0.5 bg-surface-container-high rounded text-xs font-mono">POST /api/calls/sip-event</code>.
                  The system will look up the caller number in your leads database, create a call log entry,
                  and notify managers in real-time via Socket.IO. Use this to test missed call alerts,
                  incoming call popups, and call logging flows.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 space-y-6">
              {/* Caller Number */}
              <div>
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
                  Caller Phone Number <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="tel"
                    value={form.caller}
                    onChange={(e) => setForm(prev => ({ ...prev, caller: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
                    placeholder="9876543210"
                    maxLength={15}
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50"
                  />
                </div>
                <p className="mt-1 font-caption text-on-surface-variant">
                  Enter a phone number that matches an existing lead to test auto-lookup.
                </p>
              </div>

              {/* Callee Number */}
              <div>
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
                  Callee Phone Number
                </label>
                <input
                  type="tel"
                  value={form.callee}
                  onChange={(e) => setForm(prev => ({ ...prev, callee: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
                  placeholder="18005551234"
                  maxLength={15}
                  className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50"
                />
                <p className="mt-1 font-caption text-on-surface-variant">
                  The destination number (your system/agent number).
                </p>
              </div>

              {/* Event Type */}
              <div>
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
                  Call Event
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {eventOptions.map(opt => {
                    const isSelected = form.event === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, event: opt.value }))}
                        className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all text-left ${
                          isSelected
                            ? 'border-secondary bg-secondary/5'
                            : 'border-outline-variant hover:border-outline hover:bg-surface-container-low'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-secondary/10' : 'bg-surface-container-low'}`}>
                          <opt.icon className={`w-5 h-5 ${isSelected ? 'text-secondary' : opt.color}`} />
                        </div>
                        <div>
                          <p className={`font-body-md font-bold ${isSelected ? 'text-secondary' : 'text-on-surface'}`}>{opt.label}</p>
                          <p className="font-caption text-on-surface-variant">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration (shown for ended/answered) */}
              {(form.event === 'ended' || form.event === 'answered') && (
                <div>
                  <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
                    Call Duration (seconds)
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                    <input
                      type="number"
                      value={form.duration}
                      onChange={(e) => setForm(prev => ({ ...prev, duration: e.target.value.replace(/\D/g, '') }))}
                      placeholder="30"
                      min="0"
                      className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50"
                    />
                  </div>
                  <p className="mt-1 font-caption text-on-surface-variant">
                    How long the call lasted in seconds (e.g., 30 = 30 seconds, 120 = 2 minutes).
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-low flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedEvent && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-surface-container border border-outline-variant rounded-full font-caption text-on-surface-variant">
                    <selectedEvent.icon className={`w-3.5 h-3.5 ${selectedEvent.color}`} />
                    {selectedEvent.label}
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4" /> Trigger Event</>
                )}
              </button>
            </div>
          </form>

          {/* Result */}
          {lastResult && (
            <div className={`mt-6 p-4 border rounded-xl ${lastResult.success ? 'bg-on-tertiary-container/5 border-on-tertiary-container/20' : 'bg-error/5 border-error/20'}`}>
              <div className="flex gap-3">
                {lastResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-on-tertiary-container flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-body-md font-bold ${lastResult.success ? 'text-on-tertiary-container' : 'text-error'}`}>
                    {lastResult.success ? 'Event Triggered' : 'Event Failed'}
                  </p>
                  <p className="font-body-sm text-on-surface-variant mt-1">{lastResult.message}</p>
                  {lastResult.payload && (
                    <pre className="mt-2 p-2 bg-surface-container-high rounded text-xs font-mono text-on-surface-variant overflow-x-auto">
                      {JSON.stringify(lastResult.payload, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick test scenarios */}
          <div className="mt-8">
            <h3 className="font-h3 text-on-surface mb-4">Quick Test Scenarios</h3>
            <div className="space-y-3">
              {[
                { label: 'Incoming call from known lead', caller: '9876543210', event: 'incoming', desc: 'Tests auto-lead lookup and incoming call popup' },
                { label: 'Missed call alert', caller: '9876543211', event: 'missed', desc: 'Tests missed call notification to managers' },
                { label: 'Completed call with duration', caller: '9876543212', event: 'ended', duration: '120', desc: 'Tests call logging with 2-minute duration' },
              ].map((scenario, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setForm({ caller: scenario.caller, callee: '18005551234', event: scenario.event, duration: scenario.duration || '30' });
                  }}
                  className="w-full flex items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:border-secondary/30 hover:bg-secondary/5 transition-all text-left"
                >
                  <div>
                    <p className="font-body-md text-on-surface font-medium">{scenario.label}</p>
                    <p className="font-caption text-on-surface-variant">{scenario.desc}</p>
                  </div>
                  <span className="text-xs font-mono px-2 py-1 bg-surface-container-high rounded text-on-surface-variant">{scenario.caller}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
};

export default SIPTestPanel;
