import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLARITY_PROJECT_ID,
  isClarityMarketingPath,
  shouldLoadClarity,
  syncClarity,
} from '../../src/utils/clarity.js';

describe('clarity', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete window.clarity;
  });

  it('allows only platform marketing paths', () => {
    for (const pathname of ['/', '/about', '/contact', '/build', '/login', '/register', '/showcase', '/showcase/demo-shop']) {
      expect(isClarityMarketingPath(pathname)).toBe(true);
    }

    for (const pathname of ['/view/foo', '/sites', '/dashboard', '/setup', '/admin', '/claim/token', '/booking', '/track', '/showcase/a/b']) {
      expect(isClarityMarketingPath(pathname)).toBe(false);
    }
  });

  it('requires production platform hosts and rejects local or custom hosts', () => {
    const base = { isProd: true, pathname: '/' };
    expect(shouldLoadClarity({ ...base, hostname: 'rightsitelight.com' })).toBe(true);
    expect(shouldLoadClarity({ ...base, hostname: 'localhost' })).toBe(false);
    expect(shouldLoadClarity({ ...base, hostname: '127.0.0.1' })).toBe(false);
    expect(shouldLoadClarity({ ...base, hostname: 'my-shop.com' })).toBe(false);
    expect(shouldLoadClarity({ ...base, hostname: 'rightsitelight.com', pathname: '/view/foo' })).toBe(false);
  });

  it('injects the Clarity script once and stops it outside the allowlist', () => {
    syncClarity({ isProd: true, hostname: 'rightsitelight.com', pathname: '/' });
    syncClarity({ isProd: true, hostname: 'rightsitelight.com', pathname: '/about' });

    const scripts = document.querySelectorAll(`script[data-clarity-project="${CLARITY_PROJECT_ID}"]`);
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(`https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`);
    expect(typeof window.clarity).toBe('function');

    window.clarity = vi.fn();
    syncClarity({ isProd: true, hostname: 'rightsitelight.com', pathname: '/view/foo' });
    expect(window.clarity).toHaveBeenCalledWith('stop');
  });
});
