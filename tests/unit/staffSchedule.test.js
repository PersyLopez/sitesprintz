import { describe, it, expect, beforeEach, vi } from 'vitest';
import StaffService from '../../server/services/staffService.js';
import { prisma } from '../../database/db.js';

vi.mock('../../database/db.js', () => ({
  prisma: {
    staff_users: { findUnique: vi.fn() },
    booking_staff: { findMany: vi.fn() },
    appointments: { findMany: vi.fn(), count: vi.fn() },
    booking_tenants: { findUnique: vi.fn() },
    orders: { count: vi.fn() },
  },
}));

describe('StaffService.getSchedule', () => {
  let service;

  beforeEach(() => {
    service = new StaffService();
    vi.clearAllMocks();
    prisma.staff_users.findUnique.mockResolvedValue({
      staff_id: 'ada',
      role: 'staff',
      permissions: {},
    });
    prisma.booking_staff.findMany.mockResolvedValue([
      { id: 'ada', name: 'Ada', is_primary: true, display_order: 0 },
      { id: 'lin', name: 'Lin', is_primary: false, display_order: 1 },
    ]);
    prisma.appointments.findMany.mockResolvedValue([
      {
        id: 'a1',
        staff_id: 'ada',
        start_time: new Date('2026-08-19T13:00:00Z'),
        end_time: new Date('2026-08-19T14:00:00Z'),
        status: 'confirmed',
        customer_name: 'Pat',
        customer_phone: '555-0100',
        customer_email: 'pat@example.com',
        customer_notes: 'Window seat',
        booking_services: { name: 'Cut', duration_minutes: 60 },
        booking_staff: { id: 'ada', name: 'Ada' },
      },
      {
        id: 'a2',
        staff_id: 'lin',
        start_time: new Date('2026-08-19T15:00:00Z'),
        end_time: new Date('2026-08-19T16:00:00Z'),
        status: 'confirmed',
        customer_name: 'Sam',
        customer_phone: '555-0101',
        customer_email: 'sam@example.com',
        customer_notes: 'Allergic',
        booking_services: { name: 'Color', duration_minutes: 60 },
        booking_staff: { id: 'lin', name: 'Lin' },
      },
    ]);
  });

  it('returns only the viewer column for mine scope', async () => {
    const result = await service.getSchedule('tenant-1', 'user-1', {
      from: '2026-08-19T00:00:00.000Z',
      to: '2026-08-20T00:00:00.000Z',
      scope: 'mine',
    });

    expect(result.scope).toBe('mine');
    expect(result.hasTeam).toBe(true);
    expect(result.columns).toEqual([
      { staffId: 'ada', staffName: 'Ada', isSelf: true },
    ]);
    expect(prisma.appointments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ staff_id: 'ada' }),
      })
    );
  });

  it('redacts colleague customer details on the team board for regular staff', async () => {
    const result = await service.getSchedule('tenant-1', 'user-1', {
      from: '2026-08-19T00:00:00.000Z',
      to: '2026-08-20T00:00:00.000Z',
      scope: 'team',
    });

    expect(result.canViewTeamDetails).toBe(false);
    expect(result.columns).toHaveLength(2);
    const mine = result.appointments.find((apt) => apt.id === 'a1');
    const theirs = result.appointments.find((apt) => apt.id === 'a2');
    expect(mine.customerName).toBe('Pat');
    expect(mine.privacy).toBe('full');
    expect(theirs.customerName).toBeNull();
    expect(theirs.customerPhone).toBeNull();
    expect(theirs.privacy).toBe('busy');
    expect(theirs.serviceName).toBe('Color');
  });

  it('lets managers see every customer on the team board', async () => {
    prisma.staff_users.findUnique.mockResolvedValue({
      staff_id: 'ada',
      role: 'manager',
      permissions: {},
    });

    const result = await service.getSchedule('tenant-1', 'user-1', {
      from: '2026-08-19T00:00:00.000Z',
      to: '2026-08-20T00:00:00.000Z',
      scope: 'team',
    });

    const theirs = result.appointments.find((apt) => apt.id === 'a2');
    expect(result.canViewTeamDetails).toBe(true);
    expect(theirs.customerName).toBe('Sam');
    expect(theirs.customerNotes).toBe('Allergic');
  });
});
