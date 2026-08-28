import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseLocale,
  resolveLocale,
  persistLocale,
  isLocalizedAppRoute,
  LANG_STORAGE_KEY,
} from '../../src/i18n/locale.js';

describe('parseLocale', () => {
  it('accepts en and es', () => {
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('es')).toBe('es');
    expect(parseLocale('ES')).toBe('es');
    expect(parseLocale('es-MX')).toBe('es');
  });

  it('falls back to English for invalid values', () => {
    expect(parseLocale('fr')).toBe('en');
    expect(parseLocale('')).toBe('en');
    expect(parseLocale(null)).toBe('en');
  });
});

describe('resolveLocale', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'ss_lang=;path=/;max-age=0';
  });

  it('reads ?lang=es from search params', () => {
    expect(resolveLocale(new URLSearchParams('lang=es'))).toBe('es');
  });

  it('reads ss_lang from localStorage when query is absent', () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, 'es');
    expect(resolveLocale(new URLSearchParams())).toBe('es');
  });

  it('reads ss_lang cookie when storage is empty', () => {
    document.cookie = 'ss_lang=es;path=/';
    expect(resolveLocale(new URLSearchParams())).toBe('es');
  });

  it('returns en for invalid query values', () => {
    expect(resolveLocale(new URLSearchParams('lang=de'))).toBe('en');
  });
});

describe('persistLocale', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'ss_lang=;path=/;max-age=0';
  });

  it('stores a valid locale', () => {
    expect(persistLocale('es')).toBe('es');
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe('es');
    expect(document.cookie).toContain('ss_lang=es');
  });
});

describe('isLocalizedAppRoute', () => {
  it('allows marketing and auth pages', () => {
    expect(isLocalizedAppRoute('/')).toBe(true);
    expect(isLocalizedAppRoute('/login')).toBe(true);
    expect(isLocalizedAppRoute('/showcase/luxe')).toBe(true);
    expect(isLocalizedAppRoute('/about')).toBe(true);
  });

  it('rejects owner and admin shells', () => {
    expect(isLocalizedAppRoute('/dashboard')).toBe(false);
    expect(isLocalizedAppRoute('/dashboard/sites/1')).toBe(false);
    expect(isLocalizedAppRoute('/setup')).toBe(false);
    expect(isLocalizedAppRoute('/admin')).toBe(false);
  });
});
