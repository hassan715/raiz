import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('raiz_theme') as Theme) || 'system';
  });

  const applyTheme = (currentTheme: Theme) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    let isDark = false;
    if (currentTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      isDark = systemPrefersDark;
    } else {
      isDark = currentTheme === 'dark';
    }

    root.classList.add(isDark ? 'dark' : 'light');

    // SYNC NATIVE TAURI WINDOW THEME TO FIX TITLEBAR LAG
    try {
      const win = getCurrentWindow();
      const nativeTheme = currentTheme === 'system' ? null : currentTheme;
      win.setTheme(nativeTheme).catch(() => {});
    } catch (e) {
      console.debug('Failed to set native OS window theme', e);
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('raiz_theme', newTheme);
    applyTheme(newTheme);
  };

  useEffect(() => {
    applyTheme(theme);

    // Cross-Window Synchronization
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'raiz_theme') {
        const newTheme = (e.newValue as Theme) || 'system';
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') applyTheme('system');
    };

    window.addEventListener('storage', handleStorage);
    mediaQuery.addEventListener('change', handleSystemChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
