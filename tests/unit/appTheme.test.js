import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  parseTheme,
  resolveTheme,
  persistTheme,
  applyThemeToDocument,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
} from '../../src/utils/appTheme.js';

describe('appTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('parses light and dark', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('DARK')).toBe('dark');
    expect(parseTheme('sepia')).toBe(DEFAULT_THEME);
  });

  it('defaults to light when nothing is stored', () => {
    expect(resolveTheme()).toBe('light');
  });

  it('reads ss_theme from localStorage', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(resolveTheme()).toBe('dark');
  });

  it('applies data-theme and color-scheme on the document', () => {
    applyThemeToDocument('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('persists the chosen theme', () => {
    persistTheme('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
