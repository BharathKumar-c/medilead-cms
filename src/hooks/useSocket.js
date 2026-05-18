import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = ({ onNotification, onIncomingCall, onCallEvent } = {}) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

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
      if (onNotification) onNotification(data);
    });

    socket.on('incoming-call', (data) => {
      if (onIncomingCall) onIncomingCall(data);
    });

    socket.on('call-event', (data) => {
      if (onCallEvent) onCallEvent(data);
    });

    return () => {
      socket.disconnect();
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

// Ring sound for incoming calls
export const playRingSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const playTone = (startTime) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    };

    // Two-ring pattern
    playTone(ctx.currentTime);
    playTone(ctx.currentTime + 0.5);

    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Audio not available
  }
};
