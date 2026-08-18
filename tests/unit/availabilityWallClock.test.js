import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { wallClockOnDate } from '../../server/services/booking/wallClock.js';

describe('wallClockOnDate', () => {
  it('treats UTC dummy TIME as local wall-clock hours', () => {
    const day = DateTime.fromISO('2026-08-17', { zone: 'America/New_York' }).startOf('day');
    const stored = new Date('1970-01-01T09:00:00.000Z');
    const result = wallClockOnDate(stored, day);

    expect(result.toFormat('HH:mm')).toBe('09:00');
    expect(result.zoneName).toBe('America/New_York');
    expect(result.toISO()).toContain('2026-08-17T09:00:00.000-04:00');
  });

  it('parses HH:mm strings as local wall-clock', () => {
    const day = DateTime.fromISO('2026-08-17', { zone: 'America/Chicago' }).startOf('day');
    const result = wallClockOnDate('17:00', day);

    expect(result.toFormat('HH:mm')).toBe('17:00');
  });
});
