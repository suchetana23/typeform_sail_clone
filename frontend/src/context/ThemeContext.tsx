'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggleDark: () => {} });

function readDarkPreference(): boolean {
  try {
    const stored = localStorage.getItem('app-dark-mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const dark = readDarkPreference();
    document.documentElement.classList.toggle('dark', dark);
    setIsDark(dark);
  }, []);

  const toggleDark = () => {
    setIsDark(prev => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('app-dark-mode', String(next));
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
