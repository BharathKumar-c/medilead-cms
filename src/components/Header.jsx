import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Search, Bell, X, ChevronRight, User, Moon, LogOut, Settings, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket, playNotificationSound } from '../hooks/useSocket';
import api from '../services/api';

const breadcrumbMap = {
  '/': [{ label: 'Dashboard', to: '/' }],
  '/lead-box': [{ label: 'Dashboard', to: '/' }, { label: 'Lead Box', to: '/lead-box' }],
  '/reports': [{ label: 'Dashboard', to: '/' }, { label: 'Reports', to: '/reports' }],
  '/appointments': [{ label: 'Dashboard', to: '/' }, { label: 'Appointments', to: '/appointments' }],
  '/help': [{ label: 'Dashboard', to: '/' }, { label: 'Help & Support', to: '/help' }],
  '/privacy': [{ label: 'Dashboard', to: '/' }, { label: 'Privacy Policy', to: '/privacy' }],
  '/profile-settings': [{ label: 'Dashboard', to: '/' }, { label: 'Profile Settings', to: '/profile-settings' }],
  '/account-settings': [{ label: 'Dashboard', to: '/' }, { label: 'Account Settings', to: '/account-settings' }],
  '/appearance': [{ label: 'Dashboard', to: '/' }, { label: 'Appearance', to: '/appearance' }],
};

const Header = ({ title = 'Medway CMS', onNewPatientClick, sidebarCollapsed, onToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellFlash, setBellFlash] = useState(false);
  const bellFlashTimer = useRef(null);

  const breadcrumbs = breadcrumbMap[location.pathname] || [{ label: 'Dashboard', to: '/' }];
  const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];

  const hasUrgent = notifs.some(n => !n.is_read && n.type === 'urgent');

  useEffect(() => {
    loadNotifications();
  }, []);

  // Socket.IO notifications handled by Layout which dispatches 'new-notification' window events

  // Listen for notifications dispatched by Layout (from call events)
  useEffect(() => {
    const handleNewNotification = (e) => {
      const notif = e.detail;
      setNotifs(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      setBellFlash(true);
      if (bellFlashTimer.current) clearTimeout(bellFlashTimer.current);
      bellFlashTimer.current = setTimeout(() => setBellFlash(false), 3000);
    };
    window.addEventListener('new-notification', handleNewNotification);
    return () => window.removeEventListener('new-notification', handleNewNotification);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifs(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const clearNotification = async (id) => {
    try {
      await api.deleteNotification(id);
      const notif = notifs.find(n => n.id === id);
      setNotifs(prev => prev.filter(n => n.id !== id));
      if (notif && !notif.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'urgent': return 'bg-error';
      case 'warning': return 'bg-on-tertiary-container';
      case 'success': return 'bg-on-tertiary-container';
      case 'info': return 'bg-secondary';
      default: return 'bg-outline-variant';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const goTo = (path) => {
    navigate(path);
    setAvatarOpen(false);
  };

  return (
    <header className="flex justify-between items-center w-full px-4 sm:px-6 lg:px-10 py-3 bg-surface sticky top-0 z-40 border-b border-outline-variant">
      {/* Left: Hamburger + Breadcrumbs + Search */}
      <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-secondary transition-all flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block w-px h-6 bg-outline-variant flex-shrink-0" />

        <nav className="hidden sm:flex items-center gap-1.5 min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.to} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant flex-shrink-0" />}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-body-md font-bold text-on-surface truncate">{crumb.label}</span>
              ) : (
                <Link to={crumb.to} className="font-body-md text-on-surface-variant hover:text-secondary transition-colors flex-shrink-0">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <span className="sm:hidden font-body-md font-bold text-on-surface truncate">{currentBreadcrumb.label}</span>

        <div className="hidden sm:block w-px h-6 bg-outline-variant flex-shrink-0" />

        <div className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-on-surface placeholder:text-on-surface-variant focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
              placeholder="Search patients, leads..."
              type="text"
            />
          </div>
        </div>
      </div>

      {/* Right: New + Notifications + Avatar */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onNewPatientClick}
          className="bg-secondary text-white px-3 sm:px-5 py-2 rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all text-sm sm:text-base"
        >
          <span className="hidden sm:inline">+ New</span>
          <span className="sm:hidden">+</span>
        </button>

        <button
          onClick={() => { setSearchOpen(!searchOpen); }}
          className="md:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-all"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setAvatarOpen(false); }}
            className={`relative p-2 rounded-lg transition-all ${notifOpen ? 'bg-secondary-fixed' : 'hover:bg-surface-container-low'} ${bellFlash ? 'animate-pulse-error' : ''}`}
          >
            <Bell className={`w-5 h-5 ${hasUrgent ? 'text-error' : 'text-on-surface-variant'}`} />
            {unreadCount > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white ${hasUrgent ? 'bg-error animate-pulse-error' : 'bg-secondary'}`}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
                <p className="font-body-md font-bold text-on-surface">Notifications</p>
                <button onClick={markAllRead} className="font-caption text-secondary hover:underline">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-on-surface-variant/50 mx-auto mb-2" />
                    <p className="font-body-md text-on-surface-variant">No notifications</p>
                  </div>
                ) : (
                  notifs.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => { markAsRead(notif.id); if (notif.link) { navigate(notif.link); setNotifOpen(false); } }}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-surface-container-low transition-colors border-b border-outline-variant/50 ${!notif.is_read ? 'bg-secondary-fixed/30' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getNotifIcon(notif.type)}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-body-md text-on-surface ${!notif.is_read ? 'font-bold' : ''}`}>{notif.title}</p>
                        <p className="font-caption text-on-surface-variant">{new Date(notif.created_at).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); clearNotification(notif.id); }}
                        className="p-1 hover:bg-surface-container-high rounded opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-on-surface-variant" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar with Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setAvatarOpen(!avatarOpen); setNotifOpen(false); }}
            className={`flex items-center gap-2 p-1 rounded-lg transition-all ${avatarOpen ? 'bg-secondary-fixed' : 'hover:bg-surface-container-low'}`}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-secondary-fixed bg-secondary flex items-center justify-center">
              {user?.avatar_url ? (
                <img alt="Avatar" className="w-full h-full object-cover" src={user.avatar_url} />
              ) : (
                <span className="text-white font-bold text-sm">{user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
              )}
            </div>
          </button>
          {avatarOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-outline-variant">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="font-body-md font-bold text-on-surface">{user?.name}</p>
                    <p className="font-caption text-on-surface-variant capitalize">{user?.roles?.join(', ') || user?.role}</p>
                  </div>
                </div>
              </div>
              <div className="py-2">
                <button onClick={() => goTo('/profile-settings')} className="w-full flex items-center gap-3 px-4 py-3 font-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                  <User className="w-5 h-5 text-on-surface-variant" />
                  Profile Settings
                </button>
                <button onClick={() => goTo('/account-settings')} className="w-full flex items-center gap-3 px-4 py-3 font-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                  <Settings className="w-5 h-5 text-on-surface-variant" />
                  Account Settings
                </button>
                <button onClick={() => goTo('/appearance')} className="w-full flex items-center gap-3 px-4 py-3 font-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                  <Moon className="w-5 h-5 text-on-surface-variant" />
                  Appearance
                </button>
              </div>
              <div className="border-t border-outline-variant py-2">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 font-body-md text-error hover:bg-error/5 transition-colors">
                  <LogOut className="w-5 h-5" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {searchOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-surface border-b border-outline-variant p-4 shadow-sm z-40">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              className="w-full pl-9 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body-md focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
              placeholder="Search patients, leads..."
              type="text"
              autoFocus
            />
          </div>
        </div>
      )}

      {(notifOpen || avatarOpen) && (
        <div className="fixed inset-0 z-30" onClick={() => { setNotifOpen(false); setAvatarOpen(false); }} />
      )}
    </header>
  );
};

export default Header;
