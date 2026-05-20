import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference — apply immediately and listen for changes
      root.classList.toggle('dark', mq.matches);
      const handler = (e) => root.classList.toggle('dark', e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  // Load theme from server on mount only if no local preference exists
  useEffect(() => {
    if (!localStorage.getItem('theme')) {
      api.getSettings().then(res => {
        if (res?.data?.settings?.theme) {
          const serverTheme = res.data.settings.theme;
          setThemeState(serverTheme);
          localStorage.setItem('theme', serverTheme);
        }
      }).catch(() => {});
    }
  }, []);

  const setTheme = async (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    try {
      await api.updateSettings({ theme: newTheme });
    } catch {
      // Surface failure — dispatch toast so UI can show save didn't persist
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { type: 'error', title: 'Theme Save Failed', message: 'Your theme preference could not be saved to the server.' },
      }));
    }
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
