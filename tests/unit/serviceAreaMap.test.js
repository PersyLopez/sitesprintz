import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('service area map', () => {
  it('waits until the map is near the screen before requesting tiles', () => {
    document.body.innerHTML = '<div data-testid="service-area-map" data-lat="40.82" data-lng="-74.21" data-radius-miles="10"></div>';
    let notify = null;
    window.IntersectionObserver = class {
      constructor(callback) {
        notify = callback;
      }

      observe() {}

      unobserve() {}

      disconnect() {}
    };

    const code = readFileSync(resolve('public/vendor/service-area-map.js'), 'utf8');
    window.eval(code);
    const root = document.querySelector('[data-testid="service-area-map"]');
    expect(root.querySelector('img')).toBeNull();

    notify([{ isIntersecting: true, target: root }]);
    expect(root.querySelector('img')?.getAttribute('src')).toContain('tile.openstreetmap.org');
  });
});
