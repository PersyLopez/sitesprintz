import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../../database/db.js';
import ServiceManagementService from '../../../server/services/booking/ServiceManagementService.js';
import BookingFeeService, {
  DEFAULT_SHOP_FEE_POLICIES,
} from '../../../server/services/booking/BookingFeeService.js';

vi.mock('../../../database/db.js', () => ({
  prisma: {
    booking_tenants: { findUnique: vi.fn() },
    booking_services: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('shop payment inherit onto existing services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets deposit on existing services when the shop requires payment', async () => {
    prisma.booking_services.updateMany.mockResolvedValue({ count: 3 });
    const service = new ServiceManagementService();
    const count = await service.syncExistingServicesToShopPayment('tenant-1', {
      payment_enabled: true,
      default_payment_type: 'deposit',
      default_deposit_percentage: 50,
      users: { stripe_account_id: 'acct_1', stripe_connected: true },
    });
    expect(count).toBe(3);
    expect(prisma.booking_services.updateMany).toHaveBeenCalledWith({
      where: { tenant_id: 'tenant-1' },
      data: expect.objectContaining({
        requires_payment: true,
        payment_type: 'deposit',
        deposit_percentage: 50,
      }),
    });
  });

  it('keeps existing services pay-at-salon when Connect is not ready', async () => {
    prisma.booking_services.updateMany.mockResolvedValue({ count: 3 });
    const service = new ServiceManagementService();
    await service.syncExistingServicesToShopPayment('tenant-1', {
      payment_enabled: true,
      default_payment_type: 'deposit',
      default_deposit_percentage: 50,
      users: { stripe_account_id: 'acct_1', stripe_connected: false },
    });
    expect(prisma.booking_services.updateMany).toHaveBeenCalledWith({
      where: { tenant_id: 'tenant-1' },
      data: expect.objectContaining({
        requires_payment: false,
        payment_type: 'none',
      }),
    });
  });

  it('clears payment on existing services when the shop switch is off', async () => {
    prisma.booking_services.updateMany.mockResolvedValue({ count: 2 });
    const service = new ServiceManagementService();
    await service.syncExistingServicesToShopPayment('tenant-1', {
      payment_enabled: false,
      default_payment_type: 'deposit',
      default_deposit_percentage: 50,
      users: { stripe_account_id: 'acct_1', stripe_connected: true },
    });
    expect(prisma.booking_services.updateMany).toHaveBeenCalledWith({
      where: { tenant_id: 'tenant-1' },
      data: expect.objectContaining({
        requires_payment: false,
        payment_type: 'none',
      }),
    });
  });

  it('fills empty fee policies and leaves customized services alone', async () => {
    prisma.booking_services.findMany.mockResolvedValue([
      { id: 'svc-empty', cancellation_policy: null },
      { id: 'svc-custom', cancellation_policy: JSON.stringify({ cancellationPolicy: { enabled: true } }) },
    ]);
    prisma.booking_services.update.mockResolvedValue({});
    const fees = new BookingFeeService();
    const updated = await fees.applyDefaultPoliciesToTenant('tenant-1');
    expect(updated).toBe(1);
    expect(prisma.booking_services.update).toHaveBeenCalledTimes(1);
    expect(prisma.booking_services.update).toHaveBeenCalledWith({
      where: { id: 'svc-empty' },
      data: { cancellation_policy: JSON.stringify(DEFAULT_SHOP_FEE_POLICIES) },
    });
  });

  it('adds the shop booking fee from packed policy JSON without writing phantom appointment columns', async () => {
    prisma.appointments = {
      findUnique: vi.fn().mockResolvedValue({
        id: 'appt-1',
        booking_services: {
          price_cents: 4500,
          cancellation_policy: JSON.stringify(DEFAULT_SHOP_FEE_POLICIES),
        },
        booking_tenants: { site_id: 'studio-lopez' },
      }),
      update: vi.fn(),
    };
    prisma.sites = {
      findUnique: vi.fn().mockResolvedValue({
        site_data: { _features: { bookingFees: { offered: true, enabled: true } } },
      }),
    };
    const fees = new BookingFeeService();
    const result = await fees.calculateAllFees('appt-1');
    expect(result.servicePriceCents).toBe(4500);
    expect(result.bookingFeeCents).toBe(113);
    expect(prisma.appointments.update).not.toHaveBeenCalled();
  });
});
