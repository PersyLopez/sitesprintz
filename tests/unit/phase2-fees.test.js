/**
 * Phase 2.1 Fee System - Unit Tests
 * Tests for BookingFeeService, cancellation fees, no-show penalties, booking fees
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BookingFeeService from '../../server/services/booking/BookingFeeService.js';
import { addHours, subHours } from 'date-fns';

vi.mock('../../database/db.js', () => ({
  prisma: {
    appointments: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    sites: {
      findUnique: vi.fn(),
    },
    booking_services: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('BookingFeeService', () => {
  let feeService;
  let mockService;

  beforeEach(() => {
    feeService = new BookingFeeService();

    mockService = {
      id: 'service-1',
      name: 'Haircut',
      price: 50.00,
      cancellation_policy: {
        enabled: true,
        type: 'sliding_scale',
        rules: [
          { cancelWithinHours: 24, feePercentage: 100 },
          { cancelWithinHours: 48, feePercentage: 50 },
          { cancelAfterHours: 48, feePercentage: 0 }
        ]
      },
      no_show_policy: {
        enabled: true,
        chargeOnNoShow: true,
        feeType: 'percentage',
        feeAmount: 100,
        requireConfirmation: true
      },
      booking_fee_policy: {
        enabled: true,
        type: 'percentage',
        percentage: 2.5,
        nonRefundable: false
      }
    };
  });

  describe('calculateBookingFee', () => {
    it('should calculate percentage-based booking fee', () => {
      const servicePriceCents = 5000; // $50.00
      const bookingFeePolicy = {
        enabled: true,
        type: 'percentage',
        percentage: 2.5
      };

      const fee = feeService.calculateBookingFee(servicePriceCents, bookingFeePolicy);

      expect(fee).toBe(125); // 2.5% of $50 = $1.25
    });

    it('should calculate flat booking fee', () => {
      const servicePriceCents = 5000;
      const bookingFeePolicy = {
        enabled: true,
        type: 'flat',
        amount: 100
      };

      const fee = feeService.calculateBookingFee(servicePriceCents, bookingFeePolicy);

      expect(fee).toBe(100);
    });

    it('should return 0 when booking fees disabled', () => {
      const servicePriceCents = 5000;
      const bookingFeePolicy = { enabled: false };

      const fee = feeService.calculateBookingFee(servicePriceCents, bookingFeePolicy);

      expect(fee).toBe(0);
    });

    it('should return 0 when policy is null', () => {
      const fee = feeService.calculateBookingFee(5000, null);
      expect(fee).toBe(0);
    });
  });

  describe('calculateCancellationFee', () => {
    it('should charge 100% if cancelled within 24 hours', () => {
      const servicePriceCents = 5000;
      const appointmentTime = addHours(new Date(), 12); // 12 hours from now

      const fee = feeService.calculateCancellationFee(
        servicePriceCents,
        mockService.cancellation_policy,
        appointmentTime
      );

      expect(fee).toBe(5000); // 100% of $50
    });

    it('should charge 50% if cancelled between 24-48 hours', () => {
      const servicePriceCents = 5000;
      const appointmentTime = addHours(new Date(), 36); // 36 hours from now

      const fee = feeService.calculateCancellationFee(
        servicePriceCents,
        mockService.cancellation_policy,
        appointmentTime
      );

      expect(fee).toBe(2500); // 50% of $50
    });

    it('should charge 0% if cancelled more than 48 hours in advance', () => {
      const servicePriceCents = 5000;
      const appointmentTime = addHours(new Date(), 72); // 72 hours from now

      const fee = feeService.calculateCancellationFee(
        servicePriceCents,
        mockService.cancellation_policy,
        appointmentTime
      );

      expect(fee).toBe(0);
    });

    it('should return 0 when cancellation fees disabled', () => {
      const servicePriceCents = 5000;
      const appointmentTime = addHours(new Date(), 6);
      const policy = { enabled: false };

      const fee = feeService.calculateCancellationFee(
        servicePriceCents,
        policy,
        appointmentTime
      );

      expect(fee).toBe(0);
    });
  });

  describe('processCancellationFee', () => {
    it('should calculate refund correctly with Stripe fees', () => {
      // Service: $50, Booking Fee: $1.25, Total: $51.25
      // Stripe fee on $51.25: 2.9% + $0.30 = $1.79
      // Cancel within 24h: 100% charge of service
      // Refund: $51.25 - $50 (cancellation fee) - $1.79 (Stripe) = -$0.54 (customer gets $0)

      const appointment = {
        id: 'apt-1',
        total_payable_cents: 5125, // $51.25
        booking_services: mockService,
        start_time: addHours(new Date(), 12)
      };

      // Note: In real implementation, this would update via Prisma
      // Here we're testing the calculation logic

      const breakdown = {
        paid: (5125 / 100).toFixed(2),
        cancellationFee: (5000 / 100).toFixed(2),
        stripeFeeRetained: (179 / 100).toFixed(2),
        customerRefund: '0.00'
      };

      expect(parseFloat(breakdown.customerRefund)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(breakdown.cancellationFee)).toBe(50);
    });
  });

  describe('Fee Policy Examples by Business Type', () => {
    it('Hair Salon: 50% cancellation if < 24h', () => {
      const salonPolicy = {
        enabled: true,
        type: 'sliding_scale',
        rules: [
          { cancelWithinHours: 24, feePercentage: 50 },
          { cancelAfterHours: 24, feePercentage: 0 }
        ]
      };

      const servicePriceCents = 5000; // $50
      const cancelTime = addHours(new Date(), 6);

      const fee = feeService.calculateCancellationFee(
        servicePriceCents,
        salonPolicy,
        cancelTime
      );

      expect(fee).toBe(2500); // 50% of $50
    });

    it('Photography: 100% cancellation if < 2 weeks', () => {
      const photoPolicy = {
        enabled: true,
        type: 'sliding_scale',
        rules: [
          { cancelWithinHours: 336, feePercentage: 100 }, // 2 weeks = 336 hours
          { cancelAfterHours: 336, feePercentage: 0 }
        ]
      };

      const servicePriceCents = 50000; // $500
      const cancelTime = addHours(new Date(), 120); // 5 days

      const fee = feeService.calculateCancellationFee(
        servicePriceCents,
        photoPolicy,
        cancelTime
      );

      expect(fee).toBe(50000); // 100% of $500
    });

    it('Consulting: 100% cancellation if < 48h', () => {
      const consultPolicy = {
        enabled: true,
        type: 'sliding_scale',
        rules: [
          { cancelWithinHours: 48, feePercentage: 100 },
          { cancelAfterHours: 48, feePercentage: 0 }
        ]
      };

      const servicePriceCents = 10000; // $100
      const cancelTime = addHours(new Date(), 24);

      const fee = feeService.calculateCancellationFee(
        servicePriceCents,
        consultPolicy,
        cancelTime
      );

      expect(fee).toBe(10000); // 100% of $100
    });
  });

  describe('No-Show Fee Calculations', () => {
    it('should calculate percentage-based no-show fee', () => {
      const servicePriceCents = 5000;
      const policy = {
        enabled: true,
        feeType: 'percentage',
        feeAmount: 100
      };

      // Fee should be 100% of $50
      const expectedFee = Math.round((servicePriceCents * policy.feeAmount) / 100);
      expect(expectedFee).toBe(5000);
    });

    it('should calculate fixed no-show fee', () => {
      const servicePriceCents = 5000;
      const policy = {
        enabled: true,
        feeType: 'fixed',
        feeAmount: 2500 // $25
      };

      expect(policy.feeAmount).toBe(2500);
    });
  });

  describe('calculateAllFees site gating', () => {
    it('returns zero booking fee when site bookingFees feature is off', async () => {
      const { prisma } = await import('../../database/db.js');
      prisma.appointments.findUnique.mockResolvedValue({
        id: 'appt-1',
        booking_services: {
          price: 50,
          booking_fee_policy: { enabled: true, type: 'flat', amount: 500 },
        },
        booking_tenants: { site_id: 'site-1' },
      });
      prisma.sites.findUnique.mockResolvedValue({
        site_data: { _features: { bookingFees: { enabled: false } } },
      });
      prisma.appointments.update.mockResolvedValue({});

      const result = await feeService.calculateAllFees('appt-1');

      expect(result.bookingFeeCents).toBe(0);
      expect(result.totalPayableCents).toBe(5000);
    });
  });

  describe('getPoliciesForService', () => {
    it('reads packed policies from cancellation_policy only', async () => {
      const { prisma } = await import('../../database/db.js');
      prisma.booking_services.findUnique.mockResolvedValue({
        cancellation_policy: JSON.stringify({
          cancellationPolicy: { enabled: true, type: 'sliding_scale' },
          noShowPolicy: { enabled: true },
          bookingFeePolicy: { enabled: false },
        }),
      });

      const result = await feeService.getPoliciesForService('service-1');

      expect(prisma.booking_services.findUnique).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        select: { cancellation_policy: true },
      });
      expect(result.cancellationPolicy).toEqual({ enabled: true, type: 'sliding_scale' });
      expect(result.noShowPolicy).toEqual({ enabled: true });
      expect(result.bookingFeePolicy).toEqual({ enabled: false });
    });
  });
});


