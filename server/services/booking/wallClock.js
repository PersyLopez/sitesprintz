import { DateTime } from 'luxon';

/**
 * Availability rules store TIME as a dummy UTC Date whose clock
 * (hour/minute) is the intended local wall-clock. `09:00Z` means 9:00am
 * in the tenant timezone — not 9:00 UTC converted to local.
 */
export function wallClockOnDate(storedTime, targetDate) {
  if (!targetDate?.isValid) return targetDate;

  if (typeof storedTime === 'string') {
    const [hour, minute] = storedTime.split(':').map((part) => Number(part));
    return targetDate.set({
      hour: Number.isFinite(hour) ? hour : 0,
      minute: Number.isFinite(minute) ? minute : 0,
      second: 0,
      millisecond: 0,
    });
  }

  if (storedTime instanceof Date) {
    const utc = DateTime.fromJSDate(storedTime, { zone: 'utc' });
    if (!utc.isValid) return targetDate.startOf('day');
    return targetDate.set({
      hour: utc.hour,
      minute: utc.minute,
      second: 0,
      millisecond: 0,
    });
  }

  return targetDate.startOf('day');
}
