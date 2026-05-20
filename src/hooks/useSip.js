import { useEffect, useRef, useState, useCallback } from 'react';
import { UserAgent, Registerer, Inviter, SessionState, Invitation } from 'sip.js';
import api from '../services/api';

const SIP_WS_URL = import.meta.env.VITE_SIP_WS_URL || 'ws://localhost:8088/ws';
const SIP_DOMAIN = import.meta.env.VITE_SIP_DOMAIN || 'medilead.local';

export const useSip = ({ onIncomingCall, onCallConnected, onCallEnded, onCallFailed }) => {
  const uaRef = useRef(null);
  const registererRef = useRef(null);
  const sessionRef = useRef(null);
  const [registered, setRegistered] = useState(false);
  const [callState, setCallState] = useState('idle'); // idle, ringing, connected, held
  const [currentCall, setCurrentCall] = useState(null);

  const connect = useCallback(async (sipUser, sipPassword) => {
    if (!sipUser || !sipPassword) return;

    // Close any existing connection first
    if (uaRef.current) {
      try {
        await disconnect();
      } catch (err) {
        console.error('Error closing previous SIP connection:', err);
      }
    }

    try {
      const uri = UserAgent.makeURI(`sip:${sipUser}@${SIP_DOMAIN}`);
      if (!uri) return;

      const ua = new UserAgent({
        uri,
        transportOptions: { server: SIP_WS_URL },
        authorizationUsername: sipUser,
        authorizationPassword: sipPassword,
      });

      ua.delegate = {
        onInvite: (invitation) => {
          // Incoming call
          sessionRef.current = invitation;
          const from = invitation.remoteIdentity?.displayName || invitation.remoteIdentity?.uri?.user || 'Unknown';
          const callerNumber = invitation.remoteIdentity?.uri?.user || '';

          setCurrentCall({
            direction: 'inbound',
            callerNumber,
            callerName: from,
            session: invitation,
          });
          setCallState('ringing');

          invitation.stateChange.addListener((state) => {
            if (state === SessionState.Established) {
              setCallState('connected');
              if (onCallConnected) onCallConnected({ direction: 'inbound', callerNumber });
            } else if (state === SessionState.Terminated) {
              setCallState('idle');
              setCurrentCall(null);
              sessionRef.current = null;
              if (onCallEnded) onCallEnded({ direction: 'inbound', callerNumber });
            }
          });

          if (onIncomingCall) onIncomingCall({ callerNumber, callerName: from, session: invitation });
        },
      };

      await ua.start();
      uaRef.current = ua;

      const registerer = new Registerer(ua);
      await registerer.register();
      registererRef.current = registerer;
      setRegistered(true);

      return ua;
    } catch (err) {
      console.error('SIP connect error:', err);
      if (onCallFailed) onCallFailed(err);
    }
  }, [onIncomingCall, onCallConnected, onCallEnded, onCallFailed]);

  const makeCall = useCallback(async (number) => {
    if (!uaRef.current) return;

    try {
      const target = UserAgent.makeURI(`sip:${number}@${SIP_DOMAIN}`);
      if (!target) return;

      const inviter = new Inviter(uaRef.current, target);
      sessionRef.current = inviter;

      setCurrentCall({
        direction: 'outbound',
        callerNumber: number,
        callerName: number,
        session: inviter,
      });
      setCallState('ringing');

      inviter.stateChange.addListener((state) => {
        if (state === SessionState.Established) {
          setCallState('connected');
          if (onCallConnected) onCallConnected({ direction: 'outbound', callerNumber: number });
        } else if (state === SessionState.Terminated) {
          setCallState('idle');
          setCurrentCall(null);
          sessionRef.current = null;
          if (onCallEnded) onCallEnded({ direction: 'outbound', callerNumber: number });
        }
      });

      await inviter.invite();

      // Log the call (non-blocking — don't fail the call if logging fails)
      api.createCallLog({
        caller_number: 'self',
        callee_number: number,
        direction: 'outbound',
      }).catch(err => console.warn('Call log failed:', err));
    } catch (err) {
      console.error('Make call error:', err);
      // Only reset UI if the SIP invite itself failed (not just logging)
      setCallState('idle');
      setCurrentCall(null);
      sessionRef.current = null;
      if (onCallFailed) onCallFailed(err);
    }
  }, [onCallConnected, onCallEnded, onCallFailed]);

  const answerCall = useCallback(async () => {
    if (sessionRef.current && sessionRef.current instanceof Invitation) {
      try {
        await sessionRef.current.accept();
        setCallState('connected');
      } catch (err) {
        console.error('Answer call error:', err);
      }
    }
  }, []);

  const hangUp = useCallback(async () => {
    if (sessionRef.current) {
      try {
        if (sessionRef.current.state === SessionState.Established) {
          await sessionRef.current.bye();
        } else if (sessionRef.current instanceof Invitation) {
          await sessionRef.current.reject();
        } else {
          await sessionRef.current.cancel();
        }
      } catch (err) {
        console.error('Hang up error:', err);
      }
      setCallState('idle');
      setCurrentCall(null);
      sessionRef.current = null;
    }
  }, []);

  const holdCall = useCallback(async () => {
    if (sessionRef.current && sessionRef.current.state === SessionState.Established) {
      try {
        // TODO: Implement proper SIP hold via re-INVITE with a=sendonly SDP.
        // Current implementation only toggles UI state — the call is NOT actually
        // put on hold on the SIP server. A real hold requires SDP renegotiation:
        //   1. Get current SDP from sessionDescriptionHandler
        //   2. Modify media lines to include a=sendonly (hold) or a=active (unhold)
        //   3. Send re-INVITE with modified SDP
        //   4. Handle the answer SDP from the remote party
        setCallState(callState === 'held' ? 'connected' : 'held');
      } catch (err) {
        console.error('Hold error:', err);
      }
    }
  }, [callState]);

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      await hangUp();
    }
    if (registererRef.current) {
      await registererRef.current.unregister();
    }
    if (uaRef.current) {
      await uaRef.current.stop();
    }
    setRegistered(false);
    uaRef.current = null;
    registererRef.current = null;
  }, [hangUp]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    makeCall,
    answerCall,
    hangUp,
    holdCall,
    registered,
    callState,
    currentCall,
  };
};
