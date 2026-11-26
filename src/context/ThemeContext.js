import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext();
const storageKey = 'academia_smart_theme';
const validThemes = new Set(['light', 'dark', 'system']);
export const resolveTheme = (theme, systemTheme) => theme === 'system' ? systemTheme : theme;
const getSystemTheme = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => validThemes.has(localStorage.getItem(storageKey)) ? localStorage.getItem(storageKey) : 'system');
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = resolveTheme(theme, systemTheme);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;
    const update = event => setSystemTheme(event.matches ? 'dark' : 'light');
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  useEffect(() => {
    localStorage.setItem(storageKey, theme);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [theme, resolvedTheme]);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme: next => validThemes.has(next) && setTheme(next) }), [theme, resolvedTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
