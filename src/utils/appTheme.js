export const THEMES = ['light', 'dark'];
export const DEFAULT_THEME = 'light';
export const THEME_STORAGE_KEY = 'ss_theme';

export function parseTheme(raw) {
  const value = String(raw || '').trim().toLowerCase();
  return THEMES.includes(value) ? value : DEFAULT_THEME;
}

export function resolveTheme() {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) return parseTheme(stored);
    } catch {
      // ignore quota / private mode
    }
  }
  return DEFAULT_THEME;
}

export function applyThemeToDocument(theme) {
  const value = parseTheme(theme);
  if (typeof document === 'undefined') return value;
  document.documentElement.dataset.theme = value;
  document.documentElement.style.colorScheme = value;
  return value;
}

export function persistTheme(theme) {
  const value = parseTheme(theme);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }
  return applyThemeToDocument(value);
}
