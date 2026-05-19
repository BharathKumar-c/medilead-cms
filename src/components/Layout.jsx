import { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Inbox, Calendar, BarChart3, HelpCircle, LogOut, Stethoscope, X, Users, Phone } from 'lucide-react';
import Header from './Header';
import PatientIntakeForm from './PatientIntakeForm';
import CallPopup from './CallPopup';
import Toast from './Toast';
import { useAuth } from '../context/AuthContext';
import { useSocket, playNotificationSound, playRingSound } from '../hooks/useSocket';

let toastId = 0;

const Layout = ({ children, title = 'MedCloud CMS' }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const ringSoundRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const addToast = useCallback((type, title, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Socket.IO — listen for notifications, incoming calls, and call events
  useSocket({
    onNotification: (notif) => {
      addToast(notif.type || 'info', 'Notification', notif.title);
      playNotificationSound();
      // Dispatch event so Header can update its notification list
      window.dispatchEvent(new CustomEvent('new-notification', { detail: notif }));
    },
    onIncomingCall: (data) => {
      // Show incoming call popup
      setIncomingCall(data);
      playRingSound();
      // Auto-dismiss after 30 seconds if not answered
      setTimeout(() => {
        setIncomingCall(prev => {
          if (prev && prev.call?.id === data.call?.id) return null;
          return prev;
        });
      }, 30000);
    },
    onCallEvent: (data) => {
      // Show toast for call status changes
      if (data.event === 'missed') {
        addToast('warning', 'Missed Call', `Missed call from ${data.caller}`);
        playNotificationSound();
      } else if (data.event === 'ended') {
        addToast('info', 'Call Ended', `Call from ${data.caller} ended (${data.duration || 0}s)`);
      }
      // Dispatch event so pages can refresh their call data
      window.dispatchEvent(new CustomEvent('call-update', { detail: data }));
    },
  });

  // Listen for custom toast events from child components
  useEffect(() => {
    const handler = (e) => {
      const { type, title, message } = e.detail || {};
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

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/lead-box', icon: Inbox, label: 'Lead Box' },
    { to: '/calls', icon: Phone, label: 'Calls' },
    { to: '/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    ...(isSuperAdmin ? [
      { to: '/user-management', icon: Users, label: 'User Management' },
    ] : []),
  ];

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className={`mb-6 flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-1'}`}>
        <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-h3 text-[18px] font-extrabold text-primary leading-tight tracking-tight">MedCloud</h1>
            <p className="font-caption text-on-surface-variant leading-tight">Health Platform</p>
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
            className={({ isActive }) =>
              `flex items-center rounded-lg transition-all group relative ${
                collapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'
              } ${
                isActive
                  ? 'text-secondary font-bold border-r-4 border-secondary bg-surface-container'
                  : 'text-on-surface-variant hover:text-secondary hover:bg-surface-container-high'
              }`
            }
          >
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
          }`}
        >
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
          }`}
        >
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
      <aside className={`hidden lg:flex fixed top-0 left-0 h-screen bg-surface-container-low border-r border-outline-variant flex-col py-4 z-30 transition-all duration-300 ease-in-out ${collapsed ? 'w-[72px] px-2' : 'w-64 px-4'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 left-0 h-screen w-64 bg-surface-container-low border-r border-outline-variant flex flex-col py-4 px-4 shadow-xl">
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-h3 text-[18px] font-extrabold text-primary leading-tight tracking-tight">MedCloud</h1>
                  <p className="font-caption text-on-surface-variant leading-tight">Health Platform</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'text-secondary font-bold border-r-4 border-secondary bg-surface-container'
                        : 'text-on-surface-variant hover:text-secondary hover:bg-surface-container-high'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-body-md">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto border-t border-outline-variant pt-4 space-y-1">
              <Link to="/help" className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-secondary transition-all">
                <HelpCircle className="w-5 h-5" />
                <span className="font-body-md">Help Support</span>
              </Link>
              <button onClick={() => setLogoutConfirm(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-error transition-all">
                <LogOut className="w-5 h-5" />
                <span className="font-body-md">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
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
        <main className="flex-1 overflow-y-auto pb-4">
          {children}
        </main>

        {/* Footer */}
        <footer className="sticky bottom-0 bg-surface-container-lowest border-t border-outline-variant px-4 sm:px-6 lg:px-10 py-4 z-10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-label-caps text-on-surface-variant">MedCloud Systems</span>
              <p className="font-caption text-on-surface-variant opacity-70">© 2024 MedCloud Systems • Clinical Performance Portal</p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
              <span className="font-caption text-on-surface-variant flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-on-tertiary-container"></span>
                <span className="hidden sm:inline">System Status: </span>Optimal
              </span>
              <Link to="/privacy" className="font-caption text-on-surface-variant hover:underline">Privacy Policy</Link>
              <Link to="/help" className="font-caption text-on-surface-variant hover:underline">Technical Support</Link>
            </div>
          </div>
        </footer>
      </div>

      <PatientIntakeForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSuccess={(msg) => addToast('success', 'Patient Saved', msg)} onError={(msg) => addToast('error', 'Error', msg)} />

      {/* Incoming Call Popup */}
      {incomingCall && (
        <CallPopup
          call={incomingCall.call}
          callState="ringing"
          leadInfo={incomingCall.leadInfo}
          onAnswer={() => {
            addToast('success', 'Call Answered', `Connected with ${incomingCall.call?.caller_number}`);
            setIncomingCall(null);
          }}
          onHangUp={() => {
            addToast('info', 'Call Rejected', `Rejected call from ${incomingCall.call?.caller_number}`);
            setIncomingCall(null);
          }}
          onClose={() => setIncomingCall(null)}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Logout Confirmation */}
      {logoutConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setLogoutConfirm(false)}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-7 h-7 text-error" />
              </div>
              <h3 className="font-h3 text-on-surface mb-2">Log Out</h3>
              <p className="font-body-md text-on-surface-variant">Are you sure you want to log out of your account?</p>
            </div>
            <div className="flex gap-3 p-6 border-t border-outline-variant">
              <button onClick={() => setLogoutConfirm(false)} className="flex-1 px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-all font-body-md">Cancel</button>
              <button onClick={() => { setLogoutConfirm(false); navigate('/'); }} className="flex-1 px-4 py-2 bg-error text-on-error rounded-lg hover:opacity-90 transition-all font-body-md font-medium">Log Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
