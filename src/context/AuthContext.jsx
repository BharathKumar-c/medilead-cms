import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const profileRequestId = useRef(0);

  // Handle 401 from API — clear state and token
  const handleUnauthorized = useCallback(() => {
    api.logout();
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  // Register the 401 callback with the API service
  useEffect(() => {
    api.onUnauthorized(handleUnauthorized);
  }, [handleUnauthorized]);

  // Check token on mount
  useEffect(() => {
    const requestId = ++profileRequestId.current;
    const token = api.getToken();
    if (token && !user) {
      api.getProfile()
        .then(res => {
          if (requestId !== profileRequestId.current) return;
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          if (requestId !== profileRequestId.current) return;
          api.logout();
          setUser(null);
        })
        .finally(() => {
          if (requestId === profileRequestId.current) setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const value = useMemo(() => {
    const isAuthenticated = !!user && !!api.getToken();
    return { user, loading, login, logout, isAuthenticated };
  }, [user, loading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const usePermissions = () => {
  const { user } = useAuth();
  return {
    hasPermission: (perm) => user?.permissions?.includes(perm) || false,
    hasAnyPermission: (...perms) => perms.some(p => user?.permissions?.includes(p)),
    hasRole: (role) => user?.roles?.includes(role) || user?.role === role || false,
    isSuperAdmin: user?.roles?.includes('super_admin') || user?.role === 'super_admin' || false,
  };
};

export default AuthContext;
