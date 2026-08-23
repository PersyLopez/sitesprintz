export const LOCALES = ['en', 'es'];
export const DEFAULT_LOCALE = 'en';
export const LANG_STORAGE_KEY = 'ss_lang';
export const LANG_COOKIE = 'ss_lang';

export function parseLocale(raw) {
  const value = String(raw || '').trim().toLowerCase().split(/[-_]/)[0];
  return LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

function readCookieLocale() {
  if (typeof document === 'undefined' || !document.cookie) return '';
  const match = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${LANG_COOKIE}=`));
  return match ? match.slice(LANG_COOKIE.length + 1) : '';
}

/**
 * Resolve visitor locale: ?lang= wins, then localStorage, then cookie, else English.
 */
export function resolveLocale(searchParams) {
  const fromQuery = searchParams?.get?.('lang') || (typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('lang')
    : null);
  if (fromQuery) return parseLocale(fromQuery);
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (stored) return parseLocale(stored);
    } catch {
      // ignore quota / private mode
    }
  }
  const fromCookie = readCookieLocale();
  if (fromCookie) return parseLocale(fromCookie);
  return DEFAULT_LOCALE;
}

export function persistLocale(locale) {
  const value = parseLocale(locale);
  if (typeof window === 'undefined') return value;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, value);
  } catch {
    // ignore
  }
  document.cookie = `${LANG_COOKIE}=${value};path=/;max-age=31536000;SameSite=Lax`;
  return value;
}

export function interpolate(template, vars = {}) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (_, key) => (
    vars[key] != null ? String(vars[key]) : `{${key}}`
  ));
}

export function translate(dict, fallbackDict, key, vars) {
  const raw = dict?.[key] ?? fallbackDict?.[key] ?? key;
  return interpolate(raw, vars);
}
