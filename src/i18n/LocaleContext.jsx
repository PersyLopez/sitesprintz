import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_LOCALE, persistLocale, resolveLocale } from './locale.js';
import { tMarketing } from './marketing/index.js';

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [locale, setLocaleState] = useState(() => resolveLocale(searchParams));

  useEffect(() => {
    const fromQuery = searchParams.get('lang');
    if (fromQuery) {
      const parsed = resolveLocale(searchParams);
      setLocaleState(parsed);
      persistLocale(parsed);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next) => {
    const value = persistLocale(next);
    setLocaleState(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === DEFAULT_LOCALE) {
      nextParams.delete('lang');
    } else {
      nextParams.set('lang', value);
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const t = useCallback((key, vars) => tMarketing(locale, key, vars), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => {},
    t: (key, vars) => tMarketing(DEFAULT_LOCALE, key, vars),
  };
}
