import {useState, useEffect, useCallback, useRef} from 'react';
import {NavLink, Link, useNavigate, useLocation} from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  Calendar,
  BarChart3,
  HelpCircle,
  LogOut,
  Stethoscope,
  X,
  Users,
  Phone,
  Shield,
  Database,
  Clock,
} from 'lucide-react';
import Header from './Header';
import PatientIntakeForm from './PatientIntakeForm';
import CallPopup from './CallPopup';
import Toast from './Toast';
import {useAuth, getVacAgentId} from '../context/AuthContext';
import api from '../services/api';
import {
  useSocket,
  playNotificationSound,
  playRingtoneLoop,
} from '../hooks/useSocket';

let toastId = 0;

const Layout = ({children, title = 'Medway CMS'}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const incomingCallRef = useRef(null);
  const [callPopupState, setCallPopupState] = useState('ringing'); // ringing | connected | ended
  const [prefillPhoneFromCall, setPrefillPhoneFromCall] = useState('');
  const ringtoneStopRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const addToast = useCallback((type, title, message) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, {id, type, title, message}]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Socket.IO — listen for notifications, incoming calls, and call events
  useSocket({
    onNotification: (notif) => {
      addToast(notif.type || 'info', 'Notification', notif.title);
      playNotificationSound();
      // Dispatch event so Header can update its notification list
      window.dispatchEvent(
        new CustomEvent('new-notification', {detail: notif}),
      );
    },
    onIncomingCall: (data) => {
      // Show incoming call popup
      setIncomingCall(data);
      incomingCallRef.current = data;
      setCallPopupState('ringing');
      // Start looping ringtone
      if (ringtoneStopRef.current) ringtoneStopRef.current();
      ringtoneStopRef.current = playRingtoneLoop();
      // If no lead matched, store phone for potential lead creation
      if (!data.leadInfo) {
        setPrefillPhoneFromCall(data.call?.caller_number || '');
      }
      // Auto-dismiss after 30 seconds if not answered
      setTimeout(() => {
        setIncomingCall((prev) => {
          if (prev && prev.call?.id === data.call?.id) {
            if (ringtoneStopRef.current) ringtoneStopRef.current();
            return null;
          }
          return prev;
        });
      }, 30000);
    },
    onCallEvent: (data) => {
      // ── Handle call state transitions ──
      // Answered: transition popup from ringing → connected
      if (data.event === 'answered' && incomingCallRef.current) {
        if (ringtoneStopRef.current) {
          ringtoneStopRef.current();
          ringtoneStopRef.current = null;
        }
        setCallPopupState('connected');
        addToast('success', 'Call Connected', `Connected with ${data.caller}`);
      }
      // Ended: stop ringtone, dismiss popup
      if (data.event === 'ended' || data.event === 'missed') {
        if (ringtoneStopRef.current) {
          ringtoneStopRef.current();
          ringtoneStopRef.current = null;
        }            // Transition to ended state briefly, then dismiss
            setCallPopupState('ended');
            setTimeout(() => {
              setIncomingCall(null);
              incomingCallRef.current = null;
              setCallPopupState('ringing');
            }, 2000);
      }
      // Show toast for missed calls
      if (data.event === 'missed') {
        addToast('warning', 'Missed Call', `Missed call from ${data.caller}`);
        playNotificationSound();
      } else if (data.event === 'ended') {
        addToast(
          'info',
          'Call Ended',
          `Call from ${data.caller} ended (${data.duration || 0}s)`,
        );
      }
      // Dispatch event so pages can refresh their call data
      window.dispatchEvent(new CustomEvent('call-update', {detail: data}));
    },
  });

  // Listen for outgoing call pending events (popup shown BEFORE API call)
  useEffect(() => {
    const handler = (e) => {
      const data = e.detail;
      if (!data) return;
      setIncomingCall(data);
      incomingCallRef.current = data;
      setCallPopupState('ready'); // Show popup in 'ready' state (green Call button)
    };
    window.addEventListener('outgoing-call-pending', handler);
    return () => window.removeEventListener('outgoing-call-pending', handler);
  }, []);

  // Handler when user clicks green Call button in the popup's 'ready' state
  const handleCallInitiate = useCallback(async (phoneNumber) => {
    try {
      const result = await api.vacClick2Call(phoneNumber);
      if (result?.status === 'success') {
        // Update call state with callId from API
        setIncomingCall(prev => prev ? {
          ...prev,
          call: { ...prev.call, id: result.data?.call_id, status: 'ringing' },
        } : prev);
        // Transition to ringing state
        setCallPopupState('ringing');
        // Start looping ringtone
        if (ringtoneStopRef.current) ringtoneStopRef.current();
        ringtoneStopRef.current = playRingtoneLoop();
        addToast('success', 'Call Initiated', `Calling ${phoneNumber}...`);
        // Auto-dismiss after 30 seconds if call doesn't connect
        setTimeout(() => {
          setIncomingCall((prev) => {
            if (prev && prev.call?.id === result.data?.call_id) {
              if (ringtoneStopRef.current) ringtoneStopRef.current();
              return null;
            }
            return prev;
          });
        }, 30000);
      }
    } catch (err) {
      const code = err.code || '';
      if (code === 'VAC_AGENT_NOT_LOGGED_IN') {
        addToast('warning', 'Agent Not Logged In', 'Please log into the VAC Dialer first, then try again.');
      } else if (code === 'VAC_NOT_CONFIGURED') {
        addToast('error', 'VAC Not Configured', 'VAC Dialer integration is not configured on this server.');
      } else {
        addToast('error', 'Call Failed', err.message || 'Could not initiate call. Please try again.');
      }
      // Close popup on failure
      setIncomingCall(null);
      incomingCallRef.current = null;
      setCallPopupState('ringing');
    }
  }, [addToast]);

  // Listen for custom toast events from child components
  useEffect(() => {
    const handler = (e) => {
      const {type, title, message} = e.detail || {};
      if (type && title) addToast(type, title, message);
    };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, [addToast]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {user, logout} = useAuth();
  const isSuperAdmin =
    user?.roles?.includes('super_admin') || user?.role === 'super_admin';

  const navItems = [
    {to: '/', icon: LayoutDashboard, label: 'Dashboard'},
    {to: '/lead-box', icon: Inbox, label: 'Lead Box'},
    {to: '/follow-ups', icon: Clock, label: 'Follow-Ups'},
    {to: '/vendor-call-logs', icon: Phone, label: 'Calls'},
    {to: '/appointments', icon: Calendar, label: 'Appointments'},
    {to: '/reports', icon: BarChart3, label: 'Reports'},
    ...(isSuperAdmin
      ? [
          {to: '/user-management', icon: Users, label: 'User Management'},
          {to: '/role-management', icon: Shield, label: 'Role Management'},
          {to: '/master-data', icon: Database, label: 'Master Data'},
        ]
      : []),
  ];

  const sidebarContent = (
    <>
      {/* Brand */}
      <div
        className={`mb-6 flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-1'}`}>
        <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-h3 text-[18px] font-extrabold text-primary leading-tight tracking-tight">
              Medway
            </h1>
            <p className="font-caption text-on-surface-variant leading-tight">
              CMS Health Platform
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({isActive}) =>
              `flex items-center rounded-lg transition-all group relative ${
                collapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'
              } ${
                isActive
                  ? 'text-secondary font-bold border-r-4 border-secondary bg-surface-container'
                  : 'text-on-surface-variant hover:text-secondary hover:bg-surface-container-high'
              }`
            }>
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-body-md">{item.label}</span>}
            {collapsed && (
              <div className="absolute left-full ml-2 px-3 py-2 bg-on-surface text-surface-container-lowest rounded-lg font-body-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-lg z-50">
                {item.label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-on-surface" />
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto border-t border-outline-variant pt-4 space-y-1">
        <Link
          to="/help"
          className={`flex items-center rounded-lg text-on-surface-variant hover:text-secondary transition-all group relative ${
            collapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'
          }`}>
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-body-md">Help Support</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-on-surface text-surface-container-lowest rounded-lg font-body-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-lg z-50">
              Help Support
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-on-surface" />
            </div>
          )}
        </Link>
        <button
          onClick={() => setLogoutConfirm(true)}
          className={`w-full flex items-center rounded-lg text-on-surface-variant hover:text-error transition-all group relative ${
            collapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'
          }`}>
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-body-md">Logout</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-on-surface text-surface-container-lowest rounded-lg font-body-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-lg z-50">
              Logout
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-on-surface" />
            </div>
          )}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed top-0 left-0 h-screen bg-surface-container-low border-r border-outline-variant flex-col py-4 z-30 transition-all duration-300 ease-in-out ${collapsed ? 'w-[72px] px-2' : 'w-64 px-4'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute top-0 left-0 h-screen w-64 bg-surface-container-low border-r border-outline-variant flex flex-col py-4 px-4 shadow-xl">
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-h3 text-[18px] font-extrabold text-primary leading-tight tracking-tight">
                    Medway
                  </h1>
                  <p className="font-caption text-on-surface-variant leading-tight"></p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({isActive}) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'text-secondary font-bold border-r-4 border-secondary bg-surface-container'
                        : 'text-on-surface-variant hover:text-secondary hover:bg-surface-container-high'
                    }`
                  }>
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-body-md">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto border-t border-outline-variant pt-4 space-y-1">
              <Link
                to="/help"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-secondary transition-all">
                <HelpCircle className="w-5 h-5" />
                <span className="font-body-md">Help Support</span>
              </Link>
              <button
                onClick={() => setLogoutConfirm(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-error transition-all">
                <LogOut className="w-5 h-5" />
                <span className="font-body-md">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-surface border-b border-outline-variant shadow-sm">
          <Header
            title={title}
            onNewPatientClick={() => setIsFormOpen(true)}
            sidebarCollapsed={collapsed}
            onToggleSidebar={() => {
              if (window.innerWidth < 1024) {
                setMobileOpen(!mobileOpen);
              } else {
                setCollapsed(!collapsed);
              }
            }}
          />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-4">{children}</main>

        {/* Footer */}
        <footer className="sticky bottom-0 bg-surface-container-lowest border-t border-outline-variant px-4 sm:px-6 lg:px-10 py-4 z-10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-label-caps text-on-surface-variant">
                JIREH Technologies
              </span>
              <p className="font-caption text-on-surface-variant opacity-70">
                © 2026 JIREH Technologies • Clinical Performance Portal
              </p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
              <span className="font-caption text-on-surface-variant flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-on-tertiary-container"></span>
                <span className="hidden sm:inline">System Status: </span>Optimal
              </span>
              <Link
                to="/privacy"
                className="font-caption text-on-surface-variant hover:underline">
                Privacy Policy
              </Link>
              <Link
                to="/help"
                className="font-caption text-on-surface-variant hover:underline">
                Technical Support
              </Link>
            </div>
          </div>
        </footer>
      </div>

      <PatientIntakeForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setPrefillPhoneFromCall('');
        }}
        prefillPhone={prefillPhoneFromCall}
        onSuccess={(msg) => addToast('success', 'Patient Saved', msg)}
        onError={(msg) => addToast('error', 'Error', msg)}
      />

      {/* Incoming Call Popup */}
      {incomingCall && (
        <CallPopup
          key={incomingCall.call?.id || Date.now()}
          call={incomingCall.call}
          callState={callPopupState}
          leadInfo={incomingCall.leadInfo}
          onAnswer={() => {
            if (ringtoneStopRef.current) {
              ringtoneStopRef.current();
              ringtoneStopRef.current = null;
            }
            setCallPopupState('connected');
            addToast(
              'success',
              'Call Answered',
              `Connected with ${incomingCall.call?.caller_number}`,
            );
            // Notify backend that call was answered (marks call as in-progress)
            api.updateCallStatus(incomingCall.call?.id, { call_status: 'in-progress' }).catch(() => {
              addToast('warning', 'Sync Warning', 'Call answered locally but server sync failed.');
            });
          }}
          onCallInitiate={handleCallInitiate}
          onHangUp={() => {
            if (ringtoneStopRef.current) {
              ringtoneStopRef.current();
              ringtoneStopRef.current = null;
            }
            const isOutgoing = incomingCall?.call?.direction === 'outbound';
            setCallPopupState('ended');
            addToast(
              'info',
              isOutgoing ? 'Call Cancelled' : 'Call Rejected',
              isOutgoing
                ? `Cancelled call to ${incomingCall.call?.caller_number}`
                : `Rejected call from ${incomingCall.call?.caller_number}`,
            );
            // Call VAC Hangup API to end the call on the dialer
            api.vacHangup('B').catch(() => {
              addToast('warning', 'Hangup Failed', 'Could not end the call on the dialer. Please hang up manually.');
            });
            // Dismiss popup after brief delay
            setTimeout(() => {
              setIncomingCall(null);
              incomingCallRef.current = null;
              setCallPopupState('ringing');
            }, 1500);
          }}
          onClose={() => {
            if (ringtoneStopRef.current) {
              ringtoneStopRef.current();
              ringtoneStopRef.current = null;
            }
            // For outgoing calls, also hang up on the dialer to avoid orphaned calls
            if (incomingCall?.call?.direction === 'outbound') {
              api.vacHangup('B').catch(() => {});
            }
            setIncomingCall(null);
            incomingCallRef.current = null;
            setCallPopupState('ringing');
          }}
          onCreateLead={(phone) => {
            if (ringtoneStopRef.current) {
              ringtoneStopRef.current();
              ringtoneStopRef.current = null;
            }
            setPrefillPhoneFromCall(phone);
            setIsFormOpen(true);
            setIncomingCall(null);
          }}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Logout Confirmation */}
      {logoutConfirm && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLogoutConfirm(false)}>
          <div
            className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-7 h-7 text-error" />
              </div>
              <h3 className="font-h3 text-on-surface mb-2">Log Out</h3>
              <p className="font-body-md text-on-surface-variant">
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div className="flex gap-3 p-6 border-t border-outline-variant">
              <button
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-all font-body-md">
                Cancel
              </button>
              <button
                onClick={() => {
                  setLogoutConfirm(false);
                  logout();
                  navigate('/login');
                }}
                className="flex-1 px-4 py-2 bg-error text-on-error rounded-lg hover:opacity-90 transition-all font-body-md font-medium">
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
