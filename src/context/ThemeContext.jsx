import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [theme]);

  // Load theme from server on mount
  useEffect(() => {
    api.getSettings().then(res => {
      if (res?.data?.settings?.theme) {
        const serverTheme = res.data.settings.theme;
        setThemeState(serverTheme);
        localStorage.setItem('theme', serverTheme);
      }
    }).catch(() => {});
  }, []);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    api.updateSettings({ theme: newTheme }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export default ThemeContext;
