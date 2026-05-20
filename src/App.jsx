import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';
import LeadBox from './pages/LeadBox';
import Reports from './pages/Reports';
import Appointments from './pages/Appointments';
import AppointmentForm from './pages/AppointmentForm';
import HelpSupport from './pages/HelpSupport';
import LegalPolicy from './pages/LegalPolicy';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import ProfileSettings from './pages/ProfileSettings';
import AccountSettings from './pages/AccountSettings';
import Appearance from './pages/Appearance';
import UserManagement from './pages/UserManagement';
import TelecallerDashboard from './pages/TelecallerDashboard';
import SIPTestPanel from './pages/SIPTestPanel';
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

  if (user?.role !== 'super_admin') {
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
      <Route path="/calls" element={<ProtectedRoute><TelecallerDashboard /></ProtectedRoute>} />
      <Route path="/sip-test" element={<ProtectedRoute><SIPTestPanel /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
