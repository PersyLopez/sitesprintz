/**
 * Unit Tests: BookingPaymentAdapter
 * Tests Stripe integration for booking payments
 * 
 * Coverage:
 * - createBookingCheckout()
 * - calculateBookingPrice()
 * - handlePaymentSuccess()
 * - handlePaymentFailure()
 * - refundAppointmentPayment()
 * - createRemainingBalanceDue()
 * - setServicePaymentRequirement()
 * - getPaymentSummary()
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BookingPaymentAdapter from '../../../server/services/booking/BookingPaymentAdapter.js';
import { prisma } from '../../../database/db.js';

// Mock Prisma
vi.mock('../../../database/db.js', () => ({
  prisma: {
    appointments: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    booking_services: {
      update: vi.fn()
    },
    booking_tenants: {
      findUnique: vi.fn()
    },
    sites: {
      findUnique: vi.fn()
    },
    booking_notifications: {
      create: vi.fn()
    }
  }
}));

// Mock BookingFeeService
vi.mock('../../../server/services/booking/BookingFeeService.js', () => ({
  default: class MockBookingFeeService {
    async calculateAllFees() {
      return {
        bookingFeeCents: 250, // $2.50
        breakdown: {
          booking: 250,
          cancellation: 0,
          noShow: 0
        }
      };
    }
  }
}));

describe('BookingPaymentAdapter', () => {
  let adapter;
  let mockStripe;

  beforeEach(() => {
    // Create mock Stripe instance
    mockStripe = {
      checkout: {
        sessions: {
          create: vi.fn(),
          retrieve: vi.fn()
        }
      },
      refunds: {
        create: vi.fn()
      }
    };
    
    // Inject mock Stripe via constructor
    adapter = new BookingPaymentAdapter(mockStripe);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateBookingPrice', () => {
    it('should calculate full price when payment_type is "full"', () => {
      const result = adapter.calculateBookingPrice(100, 'full', 50);
      expect(result).toBe(100);
    });

    it('should calculate deposit price correctly', () => {
      const result = adapter.calculateBookingPrice(100, 'deposit', 50);
      expect(result).toBe(50);
    });

    it('should calculate deposit with custom percentage', () => {
      const result = adapter.calculateBookingPrice(100, 'deposit', 25);
      expect(result).toBe(25);
    });

    it('should return 0 for unknown payment type', () => {
      const result = adapter.calculateBookingPrice(100, 'unknown', 50);
      expect(result).toBe(0);
    });
  });

  describe('createBookingCheckout', () => {
    const mockAppointment = {
      id: 'appt-123',
      tenant_id: 'tenant-456',
      service_id: 'service-789',
      confirmation_code: 'LOPEZ-TEST-1',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      start_time: new Date('2026-02-01T10:00:00'),
      booking_services: {
        id: 'service-789',
        name: 'Haircut',
        price_cents: 5000, // $50
        deposit_percentage: 50
      },
      booking_tenants: {
        id: 'tenant-456',
        payment_enabled: true,
        users: {
          stripe_account_id: 'acct_123',
          stripe_connected: true
        }
      }
    };

    beforeEach(() => {
      process.env.FRONTEND_URL = 'http://localhost:5173';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    });

    it('should short-circuit when payment is disabled for the site', async () => {
      prisma.appointments.findUnique.mockResolvedValue({
        ...mockAppointment,
        booking_tenants: {
          ...mockAppointment.booking_tenants,
          site_id: 'site-1',
          payment_enabled: false,
        },
      });

      const result = await adapter.createBookingCheckout('appt-123', 'full');

      expect(result.paymentType).toBe('none');
      expect(result.amountCents).toBe(0);
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('does not charge the platform when Connect is not ready', async () => {
      prisma.appointments.findUnique.mockResolvedValue(mockAppointment);
      prisma.booking_tenants.findUnique.mockResolvedValue({
        id: 'tenant-456',
        payment_enabled: true,
        stripe_account_id: 'acct_123',
        users: { stripe_account_id: 'acct_123', stripe_connected: false },
      });
      prisma.appointments.update.mockResolvedValue(mockAppointment);

      const result = await adapter.createBookingCheckout('appt-123', 'full');
      expect(result.payOnSite).toBe(true);
      expect(result.checkoutUrl).toBeNull();
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
      expect(prisma.appointments.update).toHaveBeenCalledWith({
        where: { id: 'appt-123' },
        data: expect.objectContaining({
          status: 'confirmed',
          payment_method: 'pay_on_site',
        }),
      });
    });

    it('should create checkout session for full payment', async () => {
      // Arrange
      prisma.appointments.findUnique.mockResolvedValue(mockAppointment);
      prisma.booking_tenants.findUnique.mockResolvedValue(mockAppointment.booking_tenants);
      prisma.appointments.update.mockResolvedValue(mockAppointment);
      
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/cs_test_123',
        payment_intent: 'pi_test_123'
      });

      // Act
      const result = await adapter.createBookingCheckout('appt-123', 'full');

      // Assert
      expect(result).toEqual({
        checkoutUrl: 'https://checkout.stripe.com/cs_test_123',
        sessionId: 'cs_test_123',
        appointmentId: 'appt-123',
        amountCents: 5250, // $50 + $2.50 fee
        paymentType: 'full',
        fees: {
          booking: 250,
          cancellation: 0,
          noShow: 0
        }
      });

      // Verify Stripe session creation
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          customer_email: 'john@example.com',
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 5250
              })
            })
          ]),
          metadata: expect.objectContaining({
            type: 'booking',
            appointment_id: 'appt-123',
            payment_type: 'full'
          }),
          success_url: 'http://localhost:5173/booking/appointment/LOPEZ-TEST-1?session_id={CHECKOUT_SESSION_ID}',
        }),
        expect.anything()
      );

      // Verify appointment update
      expect(prisma.appointments.update).toHaveBeenCalledWith({
        where: { id: 'appt-123' },
        data: expect.objectContaining({
          stripe_session_id: 'cs_test_123',
          payment_status: 'pending',
          payment_amount_cents: 5250
        })
      });
    });

    it('should create checkout session for deposit payment', async () => {
      // Arrange
      prisma.appointments.findUnique.mockResolvedValue(mockAppointment);
      prisma.booking_tenants.findUnique.mockResolvedValue(mockAppointment.booking_tenants);
      prisma.appointments.update.mockResolvedValue(mockAppointment);
      
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_124',
        url: 'https://checkout.stripe.com/cs_test_124'
      });

      // Act
      const result = await adapter.createBookingCheckout('appt-123', 'deposit');

      // Assert
      expect(result.amountCents).toBe(2750); // $25 (50% deposit) + $2.50 fee
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            payment_type: 'deposit'
          }),
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 2750
              })
            })
          ])
        }),
        expect.anything()
      );
    });

    it('should create checkout on the connected account without a platform fee', async () => {
      // Arrange
      prisma.appointments.findUnique.mockResolvedValue(mockAppointment);
      prisma.booking_tenants.findUnique.mockResolvedValue({
        ...mockAppointment.booking_tenants,
        users: {
          stripe_account_id: 'acct_123',
          stripe_connected: true
        }
      });
      prisma.appointments.update.mockResolvedValue(mockAppointment);
      
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_125',
        url: 'https://checkout.stripe.com/cs_test_125'
      });

      // Act
      await adapter.createBookingCheckout('appt-123', 'full');

      // Assert
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          payment_intent_data: expect.anything(),
        }),
        expect.objectContaining({ stripeAccount: 'acct_123' })
      );
    });

    it('should throw error if appointment not found', async () => {
      // Arrange
      prisma.appointments.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        adapter.createBookingCheckout('invalid-id', 'full')
      ).rejects.toThrow('Appointment invalid-id not found');
    });

    it('falls back to pay on site if Stripe is not configured', async () => {
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const adapterNoStripe = new BookingPaymentAdapter();
      prisma.appointments.findUnique.mockResolvedValue(mockAppointment);
      prisma.booking_tenants.findUnique.mockResolvedValue(mockAppointment.booking_tenants);
      prisma.appointments.update.mockResolvedValue(mockAppointment);

      const result = await adapterNoStripe.createBookingCheckout('appt-123', 'full');
      expect(result.payOnSite).toBe(true);
      expect(result.checkoutUrl).toBeNull();

      process.env.STRIPE_SECRET_KEY = originalKey;
    });
  });

  describe('handlePaymentSuccess', () => {
    const mockAppointment = {
      id: 'appt-123',
      payment_method: 'full',
      booking_services: { name: 'Haircut' },
      booking_tenants: { id: 'tenant-456' }
    };

    it('should update appointment status to paid', async () => {
      // Arrange
      prisma.appointments.update.mockResolvedValue(mockAppointment);

      // Act
      const result = await adapter.handlePaymentSuccess('cs_test_123', 'appt-123');

      // Assert
      expect(result).toEqual({
        success: true,
        appointmentId: 'appt-123',
        paymentStatus: 'paid'
      });

      expect(prisma.appointments.update).toHaveBeenCalledWith({
        where: { id: 'appt-123' },
        data: expect.objectContaining({
          status: 'confirmed',
          payment_status: 'paid',
          paid_at: expect.any(Date)
        }),
        include: expect.any(Object)
      });
    });

    it('confirms a paid Connect session on the connected account', async () => {
      prisma.appointments.findFirst.mockResolvedValue({
        id: 'appt-123',
        confirmation_code: 'LOPEZ-TEST-1',
        payment_status: 'pending',
        stripe_session_id: 'cs_test_123',
        booking_tenants: { users: { stripe_account_id: 'acct_123' } }
      });
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test_123',
        payment_status: 'paid',
        metadata: { appointment_id: 'appt-123' }
      });
      prisma.appointments.update.mockResolvedValue({
        id: 'appt-123',
        payment_method: 'full',
        booking_services: { name: 'Haircut' },
        booking_tenants: { id: 'tenant-456' }
      });

      const result = await adapter.confirmCheckoutSession('cs_test_123', 'LOPEZ-TEST-1');

      expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith(
        'cs_test_123',
        {},
        { stripeAccount: 'acct_123' }
      );
      expect(result.paymentStatus).toBe('paid');
    });

    it('should create remaining balance record for deposit payments', async () => {
      // Arrange
      const depositAppointment = {
        ...mockAppointment,
        payment_method: 'deposit',
        payment_amount_cents: 2500,
        booking_services: {
          name: 'Haircut',
          price_cents: 5000
        }
      };
      
      prisma.appointments.update.mockResolvedValue(depositAppointment);
      prisma.appointments.findUnique.mockResolvedValue(depositAppointment);

      // Act
      await adapter.handlePaymentSuccess('cs_test_123', 'appt-123');

      // Assert - should call update twice (once for paid status, once for remaining balance)
      expect(prisma.appointments.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('handlePaymentFailure', () => {
    it('should update appointment status to failed', async () => {
      // Arrange
      prisma.appointments.update.mockResolvedValue({
        id: 'appt-123',
        payment_status: 'failed'
      });

      // Act
      const result = await adapter.handlePaymentFailure(
        'cs_test_123',
        'appt-123',
        'Card declined'
      );

      // Assert
      expect(result).toEqual({
        success: false,
        appointmentId: 'appt-123',
        error: 'Card declined'
      });

      expect(prisma.appointments.update).toHaveBeenCalledWith({
        where: { id: 'appt-123' },
        data: {
          payment_status: 'failed'
        }
      });
    });
  });

  describe('refundAppointmentPayment', () => {
    const mockAppointment = {
      id: 'appt-123',
      tenant_id: 'tenant-456',
      customer_email: 'john@example.com',
      payment_status: 'paid',
      payment_intent_id: 'pi_test_123',
      stripe_session_id: 'cs_test_123'
    };

    beforeEach(() => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    });

    it('should process refund successfully', async () => {
      // Arrange
      prisma.appointments.findUnique.mockResolvedValue(mockAppointment);
      prisma.appointments.update.mockResolvedValue({
        ...mockAppointment,
        payment_status: 'refunded'
      });
      prisma.booking_notifications.create.mockResolvedValue({});
      
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test_123',
        amount: 5250,
        status: 'succeeded'
      });

      // Act
      const result = await adapter.refundAppointmentPayment('appt-123', 'customer_request');

      // Assert
      expect(result).toEqual({
        success: true,
        appointmentId: 'appt-123',
        refundId: 're_test_123',
        amount: 5250,
        status: 'refunded'
      });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        reason: 'requested_by_customer',
        metadata: expect.objectContaining({
          appointment_id: 'appt-123',
          reason: 'customer_request'
        })
      });

      expect(prisma.appointments.update).toHaveBeenCalledWith({
        where: { id: 'appt-123' },
        data: expect.objectContaining({
          payment_status: 'refunded',
          refund_amount_cents: 5250,
          refund_reason: 'customer_request',
          refunded_at: expect.any(Date)
        })
      });
    });

    it('should retrieve payment intent from session if not stored', async () => {
      // Arrange
      const appointmentNoPI = {
        ...mockAppointment,
        payment_intent_id: null
      };
      
      prisma.appointments.findUnique.mockResolvedValue(appointmentNoPI);
      prisma.appointments.update.mockResolvedValue(appointmentNoPI);
      prisma.booking_notifications.create.mockResolvedValue({});
      
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        payment_intent: 'pi_from_session_123'
      });
      
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test_124',
        amount: 5250
      });

      // Act
      await adapter.refundAppointmentPayment('appt-123', 'business_cancelled');

      // Assert
      expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_test_123');
      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: 'pi_from_session_123'
        })
      );
    });

    it('should throw error if appointment not found', async () => {
      // Arrange
      prisma.appointments.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        adapter.refundAppointmentPayment('invalid-id')
      ).rejects.toThrow('Appointment invalid-id not found');
    });

    it('should throw error if appointment not paid', async () => {
      // Arrange
      prisma.appointments.findUnique.mockResolvedValue({
        ...mockAppointment,
        payment_status: 'unpaid'
      });

      // Act & Assert
      await expect(
        adapter.refundAppointmentPayment('appt-123')
      ).rejects.toThrow('Only paid appointments can be refunded');
    });

    it('should create notification for customer', async () => {
      // Arrange
      prisma.appointments.findUnique.mockResolvedValue(mockAppointment);
      prisma.appointments.update.mockResolvedValue(mockAppointment);
      prisma.booking_notifications.create.mockResolvedValue({});
      
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test_125',
        amount: 5250
      });

      // Act
      await adapter.refundAppointmentPayment('appt-123');

      // Assert
      expect(prisma.booking_notifications.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant_id: 'tenant-456',
          appointment_id: 'appt-123',
          type: 'refund',
          channel: 'email',
          recipient_email: 'john@example.com'
        })
      });
    });
  });

  describe('createRemainingBalanceDue', () => {
    it('should calculate and store remaining balance', async () => {
      // Arrange
      const mockAppointment = {
        id: 'appt-123',
        payment_amount_cents: 2500, // Paid $25 deposit
        booking_services: {
          price_cents: 5000 // Total $50
        }
      };
      
      prisma.appointments.findUnique.mockResolvedValue(mockAppointment);
      prisma.appointments.update.mockResolvedValue({
        ...mockAppointment,
        remaining_balance_cents: 2500
      });

      // Act
      const result = await adapter.createRemainingBalanceDue('appt-123');

      // Assert
      expect(result).toEqual({
        appointmentId: 'appt-123',
        depositPaid: 25,
        totalPrice: 50,
        remainingBalance: 25
      });

      expect(prisma.appointments.update).toHaveBeenCalledWith({
        where: { id: 'appt-123' },
        data: {
          remaining_balance_cents: 2500
        }
      });
    });

    it('should not update if no balance remaining', async () => {
      // Arrange
      const mockAppointment = {
        id: 'appt-123',
        payment_amount_cents: 5000,
        booking_services: {
          price_cents: 5000
        }
      };
      
      prisma.appointments.findUnique.mockResolvedValue(mockAppointment);

      // Act
      const result = await adapter.createRemainingBalanceDue('appt-123');

      // Assert
      expect(result.remainingBalance).toBe(0);
      expect(prisma.appointments.update).not.toHaveBeenCalled();
    });
  });

  describe('setServicePaymentRequirement', () => {
    it('should enable payment requirement for service', async () => {
      // Arrange
      prisma.booking_services.update.mockResolvedValue({
        id: 'service-123',
        requires_payment: true,
        payment_type: 'deposit',
        deposit_percentage: 50
      });

      // Act
      const result = await adapter.setServicePaymentRequirement(
        'service-123',
        true,
        'deposit',
        50
      );

      // Assert
      expect(result).toEqual({
        serviceId: 'service-123',
        paymentRequired: true,
        paymentType: 'deposit',
        depositPercentage: 50
      });

      expect(prisma.booking_services.update).toHaveBeenCalledWith({
        where: { id: 'service-123' },
        data: {
          requires_payment: true,
          payment_type: 'deposit',
          deposit_percentage: 50
        }
      });
    });

    it('should disable payment requirement', async () => {
      // Arrange
      prisma.booking_services.update.mockResolvedValue({
        id: 'service-123',
        requires_payment: false,
        payment_type: 'none'
      });

      // Act
      const result = await adapter.setServicePaymentRequirement(
        'service-123',
        false,
        'none',
        0
      );

      // Assert
      expect(result.paymentRequired).toBe(false);
      expect(prisma.booking_services.update).toHaveBeenCalledWith({
        where: { id: 'service-123' },
        data: expect.objectContaining({
          requires_payment: false,
          payment_type: 'none'
        })
      });
    });
  });

  describe('getPaymentSummary', () => {
    it('should return payment summary for appointment', async () => {
      // Arrange
      const mockAppointment = {
        payment_status: 'paid',
        payment_amount_cents: 5250,
        payment_method: 'full',
        paid_at: new Date('2026-01-15T10:00:00'),
        refunded_at: null,
        remaining_balance_cents: 0
      };
      
      prisma.appointments.findUnique.mockResolvedValue(mockAppointment);

      // Act
      const result = await adapter.getPaymentSummary('appt-123');

      // Assert
      expect(result).toEqual({
        status: 'paid',
        amountPaid: '$52.50',
        paymentMethod: 'full',
        remainingBalance: null,
        paidAt: mockAppointment.paid_at,
        refundedAt: null
      });
    });

    it('should include remaining balance for deposit payments', async () => {
      // Arrange
      const mockAppointment = {
        payment_status: 'paid',
        payment_amount_cents: 2750,
        payment_method: 'deposit',
        paid_at: new Date('2026-01-15T10:00:00'),
        refunded_at: null,
        remaining_balance_cents: 2250
      };
      
      prisma.appointments.findUnique.mockResolvedValue(mockAppointment);

      // Act
      const result = await adapter.getPaymentSummary('appt-123');

      // Assert
      expect(result.remainingBalance).toBe('$22.50');
    });

    it('should throw error if appointment not found', async () => {
      // Arrange
      prisma.appointments.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        adapter.getPaymentSummary('invalid-id')
      ).rejects.toThrow('Appointment invalid-id not found');
    });
  });
});

