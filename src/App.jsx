import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LicenseProvider, useLicense } from './context/LicenseContext';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';
import LeadBox from './pages/LeadBox';
import Reports from './pages/Reports';
import Appointments from './pages/Appointments';
import AppointmentForm from './pages/AppointmentForm';
import HelpSupport from './pages/HelpSupport';
import LegalPolicy from './pages/LegalPolicy';
import NotFound from './pages/NotFound';
import LicenseExpired from './pages/LicenseExpired';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProfileSettings from './pages/ProfileSettings';
import AccountSettings from './pages/AccountSettings';
import Appearance from './pages/Appearance';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import PermissionAssignment from './pages/PermissionAssignment';
import MasterData from './pages/MasterData';
import TelecallerDashboard from './pages/TelecallerDashboard';
import SIPTestPanel from './pages/SIPTestPanel';
import LicenseManagement from './pages/LicenseManagement';
import CallLogsTable from './components/CallLogsTable';
import MaintenanceBanner from './components/MaintenanceBanner';
import DocsLanding from './pages/docs/DocsLanding';
import DocsRouter from './pages/docs/DocsRouter';

function AdminRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body-md text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = user?.roles?.includes('super_admin') || user?.role === 'super_admin';
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body-md text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body-md text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes — no auth required */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/docs" element={<DocsLanding />} />
      <Route path="/docs/*" element={<DocsRouter />} />

      {/* Protected routes — auth required */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/lead-box" element={<ProtectedRoute><LeadBox /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
      <Route path="/appointments/new" element={<ProtectedRoute><AppointmentForm /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
      <Route path="/privacy" element={<ProtectedRoute><LegalPolicy /></ProtectedRoute>} />
      <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
      <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
      <Route path="/appearance" element={<ProtectedRoute><Appearance /></ProtectedRoute>} />
      <Route path="/user-management" element={<AdminRoute><UserManagement /></AdminRoute>} />
      <Route path="/role-management" element={<AdminRoute><RoleManagement /></AdminRoute>} />
      <Route path="/role-management/:id/permissions" element={<AdminRoute><PermissionAssignment /></AdminRoute>} />
      <Route path="/master-data" element={<AdminRoute><MasterData /></AdminRoute>} />
      <Route path="/calls" element={<ProtectedRoute><TelecallerDashboard /></ProtectedRoute>} />
      <Route path="/vendor-call-logs" element={<ProtectedRoute><CallLogsTable /></ProtectedRoute>} />
      <Route path="/sip-test" element={<AdminRoute><SIPTestPanel /></AdminRoute>} />
      <Route path="/license-management" element={<ProtectedRoute><LicenseManagement /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppContent() {
  const { licenseExpired } = useLicense();
  if (licenseExpired) {
    return <LicenseExpired />;
  }
  return <AppRoutes />;
}

function App() {
  return (
    <Router>
      <LicenseProvider>
        <AuthProvider>
          <ThemeProvider>
            <MaintenanceBanner />
            <AppContent />
          </ThemeProvider>
        </AuthProvider>
      </LicenseProvider>
    </Router>
  );
}

export default App;
