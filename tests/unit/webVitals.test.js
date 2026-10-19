import { afterEach, describe, expect, it, vi } from 'vitest';

const handlers = vi.hoisted(() => ({
  onLCP: vi.fn(),
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
  onINP: vi.fn(),
  onFID: vi.fn(),
}));

vi.mock('web-vitals', () => handlers);

import { initWebVitals, shouldTrackWebVitals } from '../../src/utils/webVitals.js';

afterEach(() => {
  delete window.gtag;
  handlers.onLCP.mockClear();
});

describe('web vitals', () => {
  it('does not load the library when the page has no analytics', async () => {
    expect(shouldTrackWebVitals()).toBe(false);
    await initWebVitals();
    expect(handlers.onLCP).not.toHaveBeenCalled();
  });

  it('loads the library when analytics is on the page', async () => {
    window.gtag = vi.fn();
    expect(shouldTrackWebVitals()).toBe(true);
    await initWebVitals();
    expect(handlers.onLCP).toHaveBeenCalledTimes(1);
  });
});
