import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Handle 401 from API — clear state without page reload
  const handleUnauthorized = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  // Register the 401 callback with the API service
  useEffect(() => {
    api.onUnauthorized(handleUnauthorized);
  }, [handleUnauthorized]);

  // Check token on mount
  useEffect(() => {
    const token = api.getToken();
    if (token && !user) {
      api.getProfile()
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          api.logout();
          setUser(null);
        })
        .finally(() => setLoading(false));
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

export default AuthContext;
