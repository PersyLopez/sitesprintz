import { describe, it, expect } from 'vitest';
import { jitterCoordinates, milesBetween } from '../../server/services/serviceAreaGeoService.js';

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

describe('milesBetween', () => {
  it('returns ~0 for the same point', () => {
    expect(milesBetween({ lat: 40.22, lng: -74.76 }, { lat: 40.22, lng: -74.76 })).toBeCloseTo(0, 5);
  });

  it('measures a known short hop near Trenton', () => {
    const miles = milesBetween(
      { lat: 40.2206, lng: -74.7597 },
      { lat: 40.2206, lng: -74.7410 }
    );
    expect(miles).toBeGreaterThan(0.8);
    expect(miles).toBeLessThan(1.3);
  });

  it('returns null for invalid coordinates', () => {
    expect(milesBetween({ lat: 'x', lng: 1 }, { lat: 2, lng: 3 })).toBeNull();
  });
});
