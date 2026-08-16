/**
 * Unit Tests: Webhook Handler - Booking Payments
 * Tests webhook processing for booking payment events
 * 
 * Coverage:
 * - handleCheckoutCompleted() for booking payments
 * - Metadata routing (type: 'booking')
 * - Payment success processing
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookProcessor } from '../../../server/services/webhookProcessor.js';
import BookingPaymentAdapter from '../../../server/services/booking/BookingPaymentAdapter.js';

// Mock BookingPaymentAdapter
vi.mock('../../../server/services/booking/BookingPaymentAdapter.js');

// Mock other webhook dependencies
vi.mock('../../../server/utils/stripe-helpers.js', () => ({
  saveOrder: vi.fn(),
  sendOrderNotifications: vi.fn(),
  updateUserSubscription: vi.fn()
}));

vi.mock('../../../database/db.js', () => ({
  prisma: {
    sites: {
      findUnique: vi.fn()
    },
    users: {
      update: vi.fn()
    }
  }
}));

describe('WebhookProcessor - Booking Payments', () => {
  let processor;
  let mockPaymentAdapter;

  beforeEach(() => {
    mockPaymentAdapter = {
      handlePaymentSuccess: vi.fn(),
      handlePaymentFailure: vi.fn()
    };

    processor = new WebhookProcessor(null, null, null, mockPaymentAdapter);

    BookingPaymentAdapter.mockImplementation(() => mockPaymentAdapter);

    vi.clearAllMocks();
  });

  describe('handleCheckoutCompleted - Booking Payments', () => {
    it('should route booking payments to BookingPaymentAdapter', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            mode: 'payment',
            payment_status: 'paid',
            metadata: {
              type: 'booking',
              appointment_id: 'appt-123',
              tenant_id: 'tenant-456',
              service_id: 'service-789',
              payment_type: 'full'
            }
          }
        }
      };

      mockPaymentAdapter.handlePaymentSuccess.mockResolvedValue({
        success: true,
        appointmentId: 'appt-123',
        paymentStatus: 'paid'
      });

      // Act
      const result = await processor.handleCheckoutCompleted(event);

      // Assert
      expect(mockPaymentAdapter.handlePaymentSuccess).toHaveBeenCalledWith(
        'cs_test_123',
        'appt-123'
      );
      
      expect(result).toEqual({
        success: true,
        appointmentId: 'appt-123',
        paymentStatus: 'paid'
      });
    });

    it('should handle deposit payments', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_124',
            mode: 'payment',
            payment_status: 'paid',
            metadata: {
              type: 'booking',
              appointment_id: 'appt-124',
              payment_type: 'deposit'
            }
          }
        }
      };

      mockPaymentAdapter.handlePaymentSuccess.mockResolvedValue({
        success: true,
        appointmentId: 'appt-124',
        paymentStatus: 'paid',
        remainingBalance: 2500
      });

      // Act
      const result = await processor.handleCheckoutCompleted(event);

      // Assert
      expect(mockPaymentAdapter.handlePaymentSuccess).toHaveBeenCalledWith(
        'cs_test_124',
        'appt-124'
      );
    });

    it('should not process booking payments without metadata.type', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_125',
            mode: 'payment',
            payment_status: 'paid',
            metadata: {
              // Missing type: 'booking'
              site_id: 'site-123' // This is a product order
            }
          }
        }
      };

      // Act
      const result = await processor.handleCheckoutCompleted(event);

      // Assert
      expect(mockPaymentAdapter.handlePaymentSuccess).not.toHaveBeenCalled();
      // Should be routed to product order handler instead
    });

    it('should handle payment failure gracefully', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_126',
            mode: 'payment',
            payment_status: 'unpaid', // Payment failed
            metadata: {
              type: 'booking',
              appointment_id: 'appt-126'
            }
          }
        }
      };

      mockPaymentAdapter.handlePaymentSuccess.mockRejectedValue(
        new Error('Payment processing failed')
      );

      // Act & Assert
      await expect(
        processor.handleCheckoutCompleted(event)
      ).rejects.toThrow('Payment processing failed');
    });

    it('should validate required metadata fields', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_127',
            mode: 'payment',
            payment_status: 'paid',
            metadata: {
              type: 'booking'
              // Missing appointment_id
            }
          }
        }
      };

      mockPaymentAdapter.handlePaymentSuccess.mockRejectedValue(
        new Error('Missing appointment_id in metadata')
      );

      // Act & Assert
      await expect(
        processor.handleCheckoutCompleted(event)
      ).rejects.toThrow('Missing appointment_id in metadata');
    });
  });

  describe('handleCheckoutCompleted - Routing Logic', () => {
    it('should route to product orders when site_id present', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_200',
            mode: 'payment',
            payment_status: 'paid',
            metadata: {
              site_id: 'site-123',
              order_id: 'order-456'
              // No type: 'booking'
            }
          }
        }
      };

      // Mock the product order handler
      processor.handlePaymentCheckout = vi.fn().mockResolvedValue({
        action: 'order_created',
        orderId: 'order-456'
      });

      // Act
      const result = await processor.handleCheckoutCompleted(event);

      // Assert
      expect(processor.handlePaymentCheckout).toHaveBeenCalled();
      expect(mockPaymentAdapter.handlePaymentSuccess).not.toHaveBeenCalled();
    });

    it('should route to subscriptions when mode is subscription', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_201',
            mode: 'subscription',
            payment_status: 'paid',
            metadata: {
              user_email: 'user@example.com'
            }
          }
        }
      };

      // Mock the subscription handler
      processor.handleSubscriptionCheckout = vi.fn().mockResolvedValue({
        action: 'subscription_created'
      });

      // Act
      const result = await processor.handleCheckoutCompleted(event);

      // Assert
      expect(processor.handleSubscriptionCheckout).toHaveBeenCalled();
      expect(mockPaymentAdapter.handlePaymentSuccess).not.toHaveBeenCalled();
    });

    it('should return unknown_mode for unrecognized sessions', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_202',
            mode: 'unknown_mode',
            metadata: {}
          }
        }
      };

      // Act
      const result = await processor.handleCheckoutCompleted(event);

      // Assert
      expect(result).toEqual({ action: 'unknown_mode' });
      expect(mockPaymentAdapter.handlePaymentSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should propagate adapter errors', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_300',
            mode: 'payment',
            metadata: {
              type: 'booking',
              appointment_id: 'appt-300'
            }
          }
        }
      };

      const adapterError = new Error('Database connection failed');
      mockPaymentAdapter.handlePaymentSuccess.mockRejectedValue(adapterError);

      // Act & Assert
      await expect(
        processor.handleCheckoutCompleted(event)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle missing appointment gracefully', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_301',
            mode: 'payment',
            metadata: {
              type: 'booking',
              appointment_id: 'nonexistent'
            }
          }
        }
      };

      mockPaymentAdapter.handlePaymentSuccess.mockRejectedValue(
        new Error('Appointment nonexistent not found')
      );

      // Act & Assert
      await expect(
        processor.handleCheckoutCompleted(event)
      ).rejects.toThrow('Appointment nonexistent not found');
    });
  });

  describe('Metadata Validation', () => {
    it('should process with all required metadata fields', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_400',
            mode: 'payment',
            metadata: {
              type: 'booking',
              appointment_id: 'appt-400',
              tenant_id: 'tenant-400',
              service_id: 'service-400',
              payment_type: 'full',
              service_price: '50.00',
              booking_fee: '2.50'
            }
          }
        }
      };

      mockPaymentAdapter.handlePaymentSuccess.mockResolvedValue({
        success: true,
        appointmentId: 'appt-400'
      });

      // Act
      const result = await processor.handleCheckoutCompleted(event);

      // Assert
      expect(mockPaymentAdapter.handlePaymentSuccess).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle extra metadata fields gracefully', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_401',
            mode: 'payment',
            metadata: {
              type: 'booking',
              appointment_id: 'appt-401',
              custom_field_1: 'value1',
              custom_field_2: 'value2'
            }
          }
        }
      };

      mockPaymentAdapter.handlePaymentSuccess.mockResolvedValue({
        success: true
      });

      // Act
      await processor.handleCheckoutCompleted(event);

      // Assert
      expect(mockPaymentAdapter.handlePaymentSuccess).toHaveBeenCalled();
    });
  });
});


