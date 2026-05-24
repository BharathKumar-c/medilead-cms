import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = ({ onNotification, onIncomingCall, onCallEvent } = {}) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Store callbacks in refs so listeners always invoke the latest version
  const onNotificationRef = useRef(onNotification);
  const onIncomingCallRef = useRef(onIncomingCall);
  const onCallEventRef = useRef(onCallEvent);
  onNotificationRef.current = onNotification;
  onIncomingCallRef.current = onIncomingCall;
  onCallEventRef.current = onCallEvent;

  useEffect(() => {
    const token = api.getToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Join personal room
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        socket.emit('join', user.id);
      }
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('notification', (data) => {
      if (onNotificationRef.current) onNotificationRef.current(data);
    });

    socket.on('incoming-call', (data) => {
      if (onIncomingCallRef.current) onIncomingCallRef.current(data);
    });

    socket.on('call-event', (data) => {
      if (onCallEventRef.current) onCallEventRef.current(data);
    });

    return () => {
      try {
        socket.disconnect();
      } catch (e) {
        // Ignore — can happen in React StrictMode (dev) when WebSocket
        // handshake hasn't completed before the cleanup fires.
      }
      socketRef.current = null;
    };
  }, []);

  return { socket: socketRef.current, connected };
};

// Notification sound using Web Audio API
export const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 800;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    // Second tone (higher)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1000;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.35);

    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio not available
  }
};

// Professional looping ringtone for incoming calls
// Returns a stop function to be called when the call is answered/rejected
export const playRingtoneLoop = () => {
  let stopped = false;
  let timeoutIds = [];

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const scheduleTones = () => {
      if (stopped) return;

      const now = ctx.currentTime;

      // First ring tone (440Hz, 0.2s)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 440;
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Second ring tone (480Hz, 0.2s) after 0.2s gap
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 480;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.25, now + 0.4);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc2.start(now + 0.4);
      osc2.stop(now + 0.6);

      // Schedule next ring after the pause (2.4s gap between ring pairs)
      if (!stopped) {
        const id = setTimeout(scheduleTones, 2400);
        timeoutIds.push(id);
      }
    };

    // Start the ring loop
    scheduleTones();

    return () => {
      stopped = true;
      timeoutIds.forEach(id => clearTimeout(id));
      ctx.close().catch(() => {});
    };
  } catch {
    // Audio not available
    return () => {};
  }
};


