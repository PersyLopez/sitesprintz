import { describe, it, expect } from 'vitest';
import { jitterCoordinates } from '../../server/services/serviceAreaGeoService.js';

describe('serviceAreaGeoService jitter', () => {
  it('is stable for the same site id and not the exact geocode', () => {
    const first = jitterCoordinates(40.81111, -74.20999, 10, 'seed-one');
    const second = jitterCoordinates(40.81111, -74.20999, 10, 'seed-one');
    expect(first).toEqual(second);
    expect(first.lat).not.toBe(40.81111);
    expect(first.lng).not.toBe(-74.20999);
  });

  it('changes when the seed changes', () => {
    const a = jitterCoordinates(40.81111, -74.20999, 10, 'seed-a');
    const b = jitterCoordinates(40.81111, -74.20999, 10, 'seed-b');
    expect(a).not.toEqual(b);
  });
});
