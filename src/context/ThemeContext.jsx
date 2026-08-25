import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { applyThemeToDocument, DEFAULT_THEME, persistTheme, resolveTheme } from '../utils/appTheme.js';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => applyThemeToDocument(resolveTheme()));

  const setTheme = useCallback((next) => {
    setThemeState(persistTheme(next));
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    theme: DEFAULT_THEME,
    setTheme: () => {}
  };
}
