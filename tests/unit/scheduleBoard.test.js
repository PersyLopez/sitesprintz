import { describe, it, expect } from 'vitest';
import {
  startOfWeek,
  formatDayKey,
  enumerateDays,
  resolveHourRange,
  buildTimeSlots,
  blockGeometry,
  groupAppointments,
  displayTitle,
  canRevealCustomer,
  rangeForView,
  mapAdminAppointmentsToBoard,
} from '../../src/utils/scheduleBoard';

describe('scheduleBoard — dates', () => {
  it('starts the week on Monday', () => {
    const wednesday = new Date(2026, 7, 19); // Wed Aug 19 2026
    const week = startOfWeek(wednesday);
    expect(week.getDay()).toBe(1);
    expect(formatDayKey(week)).toBe('2026-08-17');
  });

  it('enumerates inclusive days', () => {
    const days = enumerateDays(new Date(2026, 7, 17), new Date(2026, 7, 19));
    expect(days).toHaveLength(3);
    expect(formatDayKey(days[2])).toBe('2026-08-19');
  });

  it('builds a day range or a Mon–Sun week', () => {
    const day = rangeForView(new Date(2026, 7, 19), 'day');
    expect(formatDayKey(day.from)).toBe(formatDayKey(day.to));
    const week = rangeForView(new Date(2026, 7, 19), 'week');
    expect(formatDayKey(week.from)).toBe('2026-08-17');
    expect(formatDayKey(week.to)).toBe('2026-08-23');
  });
});

describe('scheduleBoard — layout', () => {
  it('expands hours to cover late appointments', () => {
    const range = resolveHourRange([
      { startTime: '2026-08-19T19:00:00', endTime: '2026-08-19T20:30:00' },
    ]);
    expect(range.startHour).toBeLessThanOrEqual(8);
    expect(range.endHour).toBeGreaterThanOrEqual(21);
  });

  it('builds labeled hour slots', () => {
    const slots = buildTimeSlots(9, 11, 30);
    expect(slots).toHaveLength(4);
    expect(slots[0].label).toBeTruthy();
    expect(slots[1].label).toBe('');
  });

  it('places a 60-minute block at 25% of a 4-hour day starting at 8', () => {
    const geo = blockGeometry(
      { startTime: '2026-08-19T09:00:00', endTime: '2026-08-19T10:00:00' },
      8,
      12
    );
    expect(geo.topPercent).toBeCloseTo(25, 0);
    expect(geo.heightPercent).toBeCloseTo(25, 0);
  });
});

describe('scheduleBoard — grouping and privacy', () => {
  const columns = [
    { staffId: 'ada', staffName: 'Ada' },
    { staffId: 'lin', staffName: 'Lin' },
  ];
  const days = [new Date(2026, 7, 19)];
  const appointments = [
    { staffId: 'ada', startTime: '2026-08-19T09:00:00', customerName: 'Pat', serviceName: 'Cut', isSelf: true },
    { staffId: 'lin', startTime: '2026-08-19T10:00:00', customerName: 'Sam', serviceName: 'Color', privacy: 'busy' },
  ];

  it('bins appointments by staff and day', () => {
    const grid = groupAppointments(appointments, columns, days);
    expect(grid.ada['2026-08-19']).toHaveLength(1);
    expect(grid.lin['2026-08-19']).toHaveLength(1);
  });

  it('hides colleague customer names on the coverage board', () => {
    expect(canRevealCustomer(appointments[1], { selfStaffId: 'ada' })).toBe(false);
    expect(displayTitle(appointments[1], { selfStaffId: 'ada' })).toBe('Color');
    expect(displayTitle(appointments[0], { selfStaffId: 'ada' })).toBe('Pat');
  });

  it('lets managers see colleague customer names', () => {
    expect(displayTitle(appointments[1], { canViewTeamDetails: true })).toBe('Sam');
  });
});

describe('scheduleBoard — owner admin mapping', () => {
  it('maps snake_case admin rows onto board columns', () => {
    const mapped = mapAdminAppointmentsToBoard(
      [
        {
          id: 'a1',
          staff_id: 'ada',
          staff_name: 'Ada',
          start_time: '2026-08-19T13:00:00',
          end_time: '2026-08-19T14:00:00',
          service_name: 'Cut',
          status: 'confirmed',
          customer_name: 'Pat',
          customer_phone: '555-0100',
        },
        {
          id: 'a2',
          staff_id: 'lin',
          staff_name: 'Lin',
          start_time: '2026-08-19T15:00:00',
          end_time: '2026-08-19T16:00:00',
          service_name: 'Color',
          status: 'confirmed',
          customer_name: 'Sam',
        },
        {
          id: 'a3',
          staff_id: 'ghost',
          status: 'cancelled',
          customer_name: 'Skip',
        },
      ],
      [{ id: 'ada', name: 'Ada', is_primary: true }]
    );

    expect(mapped.columns).toEqual([
      { staffId: 'ada', staffName: 'Ada', isSelf: true },
      { staffId: 'lin', staffName: 'Lin', isSelf: false },
    ]);
    expect(mapped.appointments).toHaveLength(2);
    expect(mapped.appointments[0].customerName).toBe('Pat');
    expect(mapped.appointments[0].privacy).toBe('full');
  });
});
