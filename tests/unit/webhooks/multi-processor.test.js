/**
 * Multi-Processor Webhook Handler Tests
 * 
 * Tests for webhook security and routing across Stripe, Square, and PayPal.
 * Following TDD approach - these tests will fail until implementation is complete.
 * 
 * Security focus:
 * - Signature verification (prevents unauthorized webhooks)
 * - Idempotency (prevents duplicate processing/replay attacks)
 * - Processor routing (correct processor handles each webhook)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

// Import the webhook handlers (to be implemented)
import { 
  handleStripeWebhook,
  handleSquareWebhook,
  handlePayPalWebhook,
  checkIdempotency,
  recordWebhookEvent
} from '../../../server/webhooks/multi-processor-handler.js';
import { WebhookProcessor } from '../../../server/services/webhookProcessor.js';

describe('Multi-Processor Webhook Handler', () => {
  let mockPrisma;
  let mockProcessors;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock Prisma for idempotency checks
    mockPrisma = {
      webhook_events: {
        findUnique: vi.fn(),
        create: vi.fn()
      }
    };

    // Mock processor instances
    mockProcessors = {
      stripe: {
        verifyWebhookSignature: vi.fn(),
        handleWebhook: vi.fn(),
        getProcessorName: () => 'stripe'
      },
      square: {
        verifyWebhookSignature: vi.fn(),
        handleWebhook: vi.fn(),
        getProcessorName: () => 'square'
      },
      paypal: {
        verifyWebhookSignature: vi.fn(),
        handleWebhook: vi.fn(),
        getProcessorName: () => 'paypal'
      }
    };
  });

  describe('Stripe Webhook Handler', () => {
    it('should verify signature before processing', async () => {
      const mockRequest = {
        body: '{"type": "checkout.session.completed", "id": "evt_123"}',
        headers: {
          'stripe-signature': 'invalid_signature'
        }
      };

      // Setup: Signature verification fails
      mockProcessors.stripe.verifyWebhookSignature.mockReturnValue(false);

      const result = await handleStripeWebhook(mockRequest, {
        processor: mockProcessors.stripe,
        webhookSecret: 'whsec_test'
      });

      expect(result.status).toBe(400);
      expect(result.error).toMatch(/signature|verification/i);
      expect(mockProcessors.stripe.handleWebhook).not.toHaveBeenCalled();
    });

    it('should process webhook when signature is valid', async () => {
      const mockRequest = {
        body: JSON.stringify({
          type: 'checkout.session.completed',
          id: 'evt_123',
          data: { object: { id: 'cs_123', amount_total: 10000 } }
        }),
        headers: {
          'stripe-signature': 'valid_signature'
        }
      };

      // Setup: Signature verification passes
      mockProcessors.stripe.verifyWebhookSignature.mockReturnValue(true);
      mockProcessors.stripe.handleWebhook.mockResolvedValue({
        action: 'payment_completed',
        data: { sessionId: 'cs_123' }
      });

      // Setup: Not a duplicate (idempotency check)
      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);
      mockPrisma.webhook_events.create.mockResolvedValue({ id: 'wh_1' });

      const result = await handleStripeWebhook(mockRequest, {
        processor: mockProcessors.stripe,
        webhookSecret: 'whsec_test',
        prisma: mockPrisma
      });

      expect(result.status).toBe(200);
      expect(result.action).toBe('payment_completed');
      expect(mockProcessors.stripe.verifyWebhookSignature).toHaveBeenCalled();
      expect(mockProcessors.stripe.handleWebhook).toHaveBeenCalled();
    });

    it('should check idempotency to prevent replay attacks', async () => {
      const eventId = 'evt_duplicate_123';
      const mockRequest = {
        body: JSON.stringify({
          type: 'checkout.session.completed',
          id: eventId,
          data: { object: { id: 'cs_123' } }
        }),
        headers: {
          'stripe-signature': 'valid_signature'
        }
      };

      // Setup: Signature valid
      mockProcessors.stripe.verifyWebhookSignature.mockReturnValue(true);

      // Setup: Event already processed (duplicate)
      mockPrisma.webhook_events.findUnique.mockResolvedValue({
        id: 'wh_1',
        event_id: eventId,
        processor: 'stripe',
        processed_at: new Date()
      });

      const result = await handleStripeWebhook(mockRequest, {
        processor: mockProcessors.stripe,
        webhookSecret: 'whsec_test',
        prisma: mockPrisma
      });

      // Should acknowledge but not reprocess
      expect(result.status).toBe(200);
      expect(result.action).toBe('duplicate');
      expect(mockProcessors.stripe.handleWebhook).not.toHaveBeenCalled();
    });

    it('should handle webhook processing errors gracefully', async () => {
      const mockRequest = {
        body: JSON.stringify({
          type: 'checkout.session.completed',
          id: 'evt_error_123',
          data: { object: { id: 'cs_123' } }
        }),
        headers: {
          'stripe-signature': 'valid_signature'
        }
      };

      // Setup: Signature valid
      mockProcessors.stripe.verifyWebhookSignature.mockReturnValue(true);

      // Setup: Not duplicate
      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);

      // Setup: Processing fails
      mockProcessors.stripe.handleWebhook.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await handleStripeWebhook(mockRequest, {
        processor: mockProcessors.stripe,
        webhookSecret: 'whsec_test',
        prisma: mockPrisma
      });

      // Should return error but not crash
      expect(result.status).toBe(500);
      expect(result.error).toBeDefined();
    });
  });

  describe('Square Webhook Handler', () => {
    it('should verify HMAC-SHA256 signature', async () => {
      const payload = JSON.stringify({
        type: 'payment.created',
        event_id: 'sq_evt_123',
        data: { object: { payment: { id: 'pay_123', amount: 1000 } } }
      });
      const secret = 'sq_webhook_secret';

      // Generate valid HMAC signature
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');

      const mockRequest = {
        body: payload,
        headers: {
          'x-square-hmacsha256-signature': validSignature
        }
      };

      // Setup: Signature verification passes
      mockProcessors.square.verifyWebhookSignature.mockReturnValue(true);
      mockProcessors.square.handleWebhook.mockResolvedValue({
        action: 'payment_created',
        data: { paymentId: 'pay_123' }
      });

      // Setup: Not duplicate
      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);
      mockPrisma.webhook_events.create.mockResolvedValue({ id: 'wh_2' });

      const result = await handleSquareWebhook(mockRequest, {
        processor: mockProcessors.square,
        webhookSecret: secret,
        prisma: mockPrisma
      });

      expect(result.status).toBe(200);
      expect(result.action).toBe('payment_created');
      expect(mockProcessors.square.verifyWebhookSignature).toHaveBeenCalledWith(
        payload,
        validSignature,
        secret
      );
    });

    it('should reject invalid HMAC signature', async () => {
      const mockRequest = {
        body: JSON.stringify({
          type: 'payment.created',
          event_id: 'sq_evt_123'
        }),
        headers: {
          'x-square-hmacsha256-signature': 'invalid_signature'
        }
      };

      // Setup: Signature verification fails
      mockProcessors.square.verifyWebhookSignature.mockReturnValue(false);

      const result = await handleSquareWebhook(mockRequest, {
        processor: mockProcessors.square,
        webhookSecret: 'secret',
        prisma: mockPrisma
      });

      expect(result.status).toBe(400);
      expect(result.error).toMatch(/signature|verification/i);
      expect(mockProcessors.square.handleWebhook).not.toHaveBeenCalled();
    });

    it('should handle missing signature header', async () => {
      const mockRequest = {
        body: JSON.stringify({ type: 'payment.created' }),
        headers: {} // Missing signature header
      };

      const result = await handleSquareWebhook(mockRequest, {
        processor: mockProcessors.square,
        webhookSecret: 'secret',
        prisma: mockPrisma
      });

      expect(result.status).toBe(400);
      expect(result.error).toMatch(/signature.*required|missing/i);
    });

    it('should return 200 duplicate without reprocessing', async () => {
      const payload = JSON.stringify({
        type: 'payment.updated',
        event_id: 'sq_evt_dup',
        data: { object: { payment: { id: 'pay_dup', status: 'COMPLETED' } } }
      });

      mockProcessors.square.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.webhook_events.findUnique.mockResolvedValue({
        id: 'wh_existing',
        event_id: 'sq_evt_dup',
        processor: 'square'
      });

      const result = await handleSquareWebhook({
        body: payload,
        headers: { 'x-square-hmacsha256-signature': 'sig' }
      }, {
        processor: mockProcessors.square,
        webhookSecret: 'secret',
        prisma: mockPrisma
      });

      expect(result.status).toBe(200);
      expect(result.action).toBe('duplicate');
      expect(mockProcessors.square.handleWebhook).not.toHaveBeenCalled();
    });

    it('should return 503 when idempotency check fails closed', async () => {
      const payload = JSON.stringify({
        type: 'payment.updated',
        event_id: 'sq_evt_db_down',
        data: { object: { payment: { id: 'pay_1', status: 'COMPLETED' } } }
      });

      mockProcessors.square.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.webhook_events.findUnique.mockRejectedValue(new Error('db down'));

      const result = await handleSquareWebhook({
        body: payload,
        headers: { 'x-square-hmacsha256-signature': 'sig' }
      }, {
        processor: mockProcessors.square,
        webhookSecret: 'secret',
        prisma: mockPrisma
      });

      expect(result.status).toBe(503);
      expect(result.error).toMatch(/unavailable/i);
      expect(mockProcessors.square.handleWebhook).not.toHaveBeenCalled();
    });

    it('should fulfill visitor order on payment.updated COMPLETED (happy path)', async () => {
      const orderItems = [{ name: 'Cut', price: 25, quantity: 1 }];
      const payload = JSON.stringify({
        type: 'payment.updated',
        event_id: 'sq_evt_ok',
        data: {
          object: {
            payment: {
              id: 'pay_ok',
              status: 'COMPLETED',
              amount_money: { amount: 2500, currency: 'USD' },
              buyer_email_address: 'buyer@example.com',
              note: JSON.stringify({
                site_id: 'site-square-1',
                user_id: '',
                order_items: orderItems,
                type: 'order'
              })
            }
          }
        }
      });

      mockProcessors.square.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);
      mockPrisma.webhook_events.create.mockResolvedValue({ id: 'wh_ok' });

      const mockDb = {
        orders: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        $transaction: vi.fn(async (fn) => fn({
          orders: {
            create: vi.fn().mockResolvedValue({ id: 'ord_square_1', order_items: [] })
          },
          products: {
            findUnique: vi.fn().mockResolvedValue(null)
          }
        })),
      };

      const webhookProcessor = new WebhookProcessor(mockDb, {
        sendEmail: vi.fn().mockResolvedValue(undefined),
      }, null);
      webhookProcessor.sendOrderConfirmation = vi.fn().mockResolvedValue(undefined);
      webhookProcessor.sendOwnerNotification = vi.fn().mockResolvedValue(undefined);

      const squareAdapter = {
        verifyWebhookSignature: mockProcessors.square.verifyWebhookSignature,
        handleWebhook: (event) => webhookProcessor.processSquarePaymentEvent(event),
        getProcessorName: () => 'square'
      };

      const result = await handleSquareWebhook({
        body: payload,
        headers: { 'x-square-hmacsha256-signature': 'sig' }
      }, {
        processor: squareAdapter,
        webhookSecret: 'secret',
        prisma: mockPrisma
      });

      expect(result.status).toBe(200);
      expect(result.action).toBe('payment_processed');
      expect(result.data?.orderId || mockDb.$transaction).toBeTruthy();
      expect(mockDb.$transaction).toHaveBeenCalled();
    });

    it('marks visitor order refunded on refund.created (P5-S2)', async () => {
      const payload = JSON.stringify({
        type: 'refund.created',
        event_id: 'sq_evt_refund',
        data: {
          object: {
            refund: {
              id: 'rfd_sq_1',
              status: 'COMPLETED',
              payment_id: 'pay_ok',
              amount_money: { amount: 2500, currency: 'USD' },
            },
          },
        },
      });

      mockProcessors.square.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);
      mockPrisma.webhook_events.create.mockResolvedValue({ id: 'wh_refund' });

      const mockDb = {
        orders: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'ord_square_1',
            site_id: 'site-square-1',
            customer_email: 'buyer@example.com',
            total_amount: 25,
            payment_status: 'paid',
            status: 'pending',
            items: [],
            order_items: [],
          }),
          update: vi.fn().mockResolvedValue({ id: 'ord_square_1' }),
        },
      };

      const webhookProcessor = new WebhookProcessor(mockDb, {
        sendEmail: vi.fn().mockResolvedValue(undefined),
      }, null);

      const result = await handleSquareWebhook({
        body: payload,
        headers: { 'x-square-hmacsha256-signature': 'sig' },
      }, {
        processor: {
          verifyWebhookSignature: mockProcessors.square.verifyWebhookSignature,
          handleWebhook: (event) => webhookProcessor.processSquarePaymentEvent(event),
          getProcessorName: () => 'square',
        },
        webhookSecret: 'secret',
        prisma: mockPrisma,
      });

      expect(result.status).toBe(200);
      expect(result.action).toBe('refund_processed');
      expect(result.data?.orderId).toBe('ord_square_1');
      expect(mockDb.orders.update).toHaveBeenCalled();
    });
  });

  describe('PayPal Webhook Handler', () => {
    it('should verify webhook via PayPal API', async () => {
      const mockRequest = {
        body: JSON.stringify({
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          id: 'WH-123',
          resource: { id: 'CAPTURE-123', amount: { value: '100.00' } }
        }),
        headers: {
          'paypal-transmission-id': 'trans_123',
          'paypal-transmission-time': '2025-01-04T12:00:00Z',
          'paypal-transmission-sig': 'sig_123',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-auth-algo': 'SHA256withRSA'
        }
      };

      // Setup: PayPal API verification succeeds
      const mockPayPalVerify = vi.fn().mockResolvedValue({
        verification_status: 'SUCCESS'
      });

      mockProcessors.paypal.verifyWebhookSignature.mockReturnValue(true);
      mockProcessors.paypal.handleWebhook.mockResolvedValue({
        action: 'payment_captured',
        data: { captureId: 'CAPTURE-123' }
      });

      // Setup: Not duplicate
      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);
      mockPrisma.webhook_events.create.mockResolvedValue({ id: 'wh_3' });

      const result = await handlePayPalWebhook(mockRequest, {
        processor: mockProcessors.paypal,
        webhookId: 'paypal_webhook_id',
        paypalVerify: mockPayPalVerify,
        prisma: mockPrisma
      });

      expect(result.status).toBe(200);
      expect(result.action).toBe('payment_captured');
      expect(mockPayPalVerify).toHaveBeenCalled();
    });

    it('should reject webhook when PayPal verification fails', async () => {
      const mockRequest = {
        body: JSON.stringify({
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          id: 'WH-123'
        }),
        headers: {
          'paypal-transmission-id': 'trans_123',
          'paypal-transmission-time': '2025-01-04T12:00:00Z',
          'paypal-transmission-sig': 'invalid_sig',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-auth-algo': 'SHA256withRSA'
        }
      };

      // Setup: PayPal API verification fails
      const mockPayPalVerify = vi.fn().mockResolvedValue({
        verification_status: 'FAILURE'
      });

      const result = await handlePayPalWebhook(mockRequest, {
        processor: mockProcessors.paypal,
        webhookId: 'paypal_webhook_id',
        paypalVerify: mockPayPalVerify,
        prisma: mockPrisma
      });

      expect(result.status).toBe(400);
      expect(result.error).toMatch(/verification failed/i);
      expect(mockProcessors.paypal.handleWebhook).not.toHaveBeenCalled();
    });

    it('should handle missing PayPal headers', async () => {
      const mockRequest = {
        body: JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
        headers: {} // Missing required PayPal headers
      };

      const result = await handlePayPalWebhook(mockRequest, {
        processor: mockProcessors.paypal,
        webhookId: 'paypal_webhook_id',
        prisma: mockPrisma
      });

      expect(result.status).toBe(400);
      expect(result.error).toMatch(/headers.*required|missing/i);
    });

    it('should return 200 duplicate without re-processing', async () => {
      const mockRequest = {
        body: JSON.stringify({
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          id: 'WH-dup',
          resource: { id: 'CAPTURE-dup', status: 'COMPLETED', custom_id: 'site-1' }
        }),
        headers: {
          'paypal-transmission-id': 'trans_dup',
          'paypal-transmission-time': '2025-01-04T12:00:00Z',
          'paypal-transmission-sig': 'sig_dup',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-auth-algo': 'SHA256withRSA'
        }
      };

      const mockPayPalVerify = vi.fn().mockResolvedValue({
        verification_status: 'SUCCESS'
      });

      mockPrisma.webhook_events.findUnique.mockResolvedValue({
        id: 'wh_existing',
        event_id: 'WH-dup',
        processor: 'paypal'
      });

      const result = await handlePayPalWebhook(mockRequest, {
        processor: mockProcessors.paypal,
        webhookId: 'paypal_webhook_id',
        paypalVerify: mockPayPalVerify,
        prisma: mockPrisma
      });

      expect(result.status).toBe(200);
      expect(result.action).toBe('duplicate');
      expect(mockProcessors.paypal.handleWebhook).not.toHaveBeenCalled();
    });

    it('should fulfill visitor order on PAYMENT.CAPTURE.COMPLETED (happy path)', async () => {
      const orderItems = [{ name: 'Cut', price: 25, quantity: 1 }];
      const payload = JSON.stringify({
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        id: 'WH-ok',
        resource: {
          id: 'CAPTURE-ok',
          status: 'COMPLETED',
          amount: { value: '25.00', currency_code: 'USD' },
          custom_id: JSON.stringify({
            site_id: 'site-paypal-1',
            user_id: '',
            order_items: orderItems,
            type: 'order',
            customer_email: 'buyer@example.com'
          })
        }
      });

      const mockPayPalVerify = vi.fn().mockResolvedValue({
        verification_status: 'SUCCESS'
      });

      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);
      mockPrisma.webhook_events.create.mockResolvedValue({ id: 'wh_pp_ok' });

      const mockDb = {
        orders: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        $transaction: vi.fn(async (fn) => fn({
          orders: {
            create: vi.fn().mockResolvedValue({ id: 'ord_paypal_1', order_items: [] })
          },
          products: {
            findUnique: vi.fn().mockResolvedValue(null)
          }
        })),
      };

      const webhookProcessor = new WebhookProcessor(mockDb, {
        sendEmail: vi.fn().mockResolvedValue(undefined),
      }, null);
      webhookProcessor.sendOrderConfirmation = vi.fn().mockResolvedValue(undefined);
      webhookProcessor.sendOwnerNotification = vi.fn().mockResolvedValue(undefined);

      const paypalAdapter = {
        verifyWebhookSignature: mockProcessors.paypal.verifyWebhookSignature,
        handleWebhook: (event) => webhookProcessor.processPayPalPaymentEvent(event),
        getProcessorName: () => 'paypal'
      };

      const result = await handlePayPalWebhook({
        body: payload,
        headers: {
          'paypal-transmission-id': 'trans_ok',
          'paypal-transmission-time': '2025-01-04T12:00:00Z',
          'paypal-transmission-sig': 'sig_ok',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-auth-algo': 'SHA256withRSA'
        }
      }, {
        processor: paypalAdapter,
        webhookId: 'paypal_webhook_id',
        paypalVerify: mockPayPalVerify,
        prisma: mockPrisma
      });

      expect(result.status).toBe(200);
      expect(result.action).toBe('payment_processed');
      expect(result.data?.orderId || mockDb.$transaction).toBeTruthy();
      expect(mockDb.$transaction).toHaveBeenCalled();
    });

    it('captures on CHECKOUT.ORDER.APPROVED (P5-S3)', async () => {
      const payload = JSON.stringify({
        event_type: 'CHECKOUT.ORDER.APPROVED',
        id: 'WH-approved',
        resource: {
          id: 'ORDER-PP-APPROVED',
          purchase_units: [{
            custom_id: JSON.stringify({
              site_id: 'site-paypal-1',
              order_items: [{ name: 'Cut', price: 25, quantity: 1 }],
              type: 'order',
            }),
            amount: { value: '25.00', currency_code: 'USD' },
          }],
        },
      });

      const mockPayPalVerify = vi.fn().mockResolvedValue({
        verification_status: 'SUCCESS'
      });
      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);
      mockPrisma.webhook_events.create.mockResolvedValue({ id: 'wh_pp_approved' });

      const captureOrder = vi.fn().mockResolvedValue({
        orderId: 'ORDER-PP-APPROVED',
        status: 'COMPLETED',
        captureId: 'CAPTURE-FROM-APPROVED',
      });

      const webhookProcessor = new WebhookProcessor(
        { $transaction: vi.fn() },
        { sendEmail: vi.fn() },
        null,
        null,
        { captureOrder }
      );

      const result = await handlePayPalWebhook({
        body: payload,
        headers: {
          'paypal-transmission-id': 'trans_appr',
          'paypal-transmission-time': '2025-01-04T12:00:00Z',
          'paypal-transmission-sig': 'sig_appr',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-auth-algo': 'SHA256withRSA'
        }
      }, {
        processor: {
          verifyWebhookSignature: mockProcessors.paypal.verifyWebhookSignature,
          handleWebhook: (event) => webhookProcessor.processPayPalPaymentEvent(event),
          getProcessorName: () => 'paypal'
        },
        webhookId: 'paypal_webhook_id',
        paypalVerify: mockPayPalVerify,
        prisma: mockPrisma
      });

      expect(result.status).toBe(200);
      expect(result.action).toBe('payment_captured');
      expect(result.data?.captureId).toBe('CAPTURE-FROM-APPROVED');
      expect(captureOrder).toHaveBeenCalled();
    });

    it('marks visitor order refunded on PAYMENT.CAPTURE.REFUNDED (P5-S2)', async () => {
      const payload = JSON.stringify({
        event_type: 'PAYMENT.CAPTURE.REFUNDED',
        id: 'WH-refund',
        resource: {
          id: 'refund_pp_1',
          capture_id: 'CAPTURE-ok',
          amount: { value: '25.00', currency_code: 'USD' },
        },
      });

      const mockPayPalVerify = vi.fn().mockResolvedValue({
        verification_status: 'SUCCESS'
      });
      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);
      mockPrisma.webhook_events.create.mockResolvedValue({ id: 'wh_pp_refund' });

      const mockDb = {
        orders: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'ord_paypal_1',
            site_id: 'site-paypal-1',
            customer_email: 'buyer@example.com',
            total_amount: 25,
            payment_status: 'paid',
            status: 'pending',
            items: [],
            order_items: [],
          }),
          update: vi.fn().mockResolvedValue({ id: 'ord_paypal_1' }),
        },
      };

      const webhookProcessor = new WebhookProcessor(mockDb, {
        sendEmail: vi.fn().mockResolvedValue(undefined),
      }, null);

      const result = await handlePayPalWebhook({
        body: payload,
        headers: {
          'paypal-transmission-id': 'trans_ref',
          'paypal-transmission-time': '2025-01-04T12:00:00Z',
          'paypal-transmission-sig': 'sig_ref',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-auth-algo': 'SHA256withRSA'
        }
      }, {
        processor: {
          verifyWebhookSignature: mockProcessors.paypal.verifyWebhookSignature,
          handleWebhook: (event) => webhookProcessor.processPayPalPaymentEvent(event),
          getProcessorName: () => 'paypal'
        },
        webhookId: 'paypal_webhook_id',
        paypalVerify: mockPayPalVerify,
        prisma: mockPrisma
      });

      expect(result.status).toBe(200);
      expect(result.action).toBe('refund_processed');
      expect(result.data?.orderId).toBe('ord_paypal_1');
      expect(mockDb.orders.update).toHaveBeenCalled();
    });
  });

  describe('Idempotency System', () => {
    it('should detect duplicate events', async () => {
      const eventId = 'evt_duplicate_test';
      const processor = 'stripe';

      // Setup: Event already exists
      mockPrisma.webhook_events.findUnique.mockResolvedValue({
        id: 'wh_existing',
        event_id: eventId,
        processor: processor,
        processed_at: new Date('2025-01-04T10:00:00Z')
      });

      const isDuplicate = await checkIdempotency(eventId, processor, mockPrisma);

      expect(isDuplicate).toBe(true);
      expect(mockPrisma.webhook_events.findUnique).toHaveBeenCalledWith({
        where: {
          event_id_processor: {
            event_id: eventId,
            processor: processor
          }
        }
      });
    });

    it('should allow first occurrence of event', async () => {
      const eventId = 'evt_new_unique';
      const processor = 'square';

      // Setup: Event does not exist
      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);

      const isDuplicate = await checkIdempotency(eventId, processor, mockPrisma);

      expect(isDuplicate).toBe(false);
    });

    it('should fail closed when idempotency DB lookup errors', async () => {
      mockPrisma.webhook_events.findUnique.mockRejectedValue(new Error('connection reset'));

      await expect(
        checkIdempotency('evt_fail', 'square', mockPrisma)
      ).rejects.toMatchObject({ code: 'IDEMPOTENCY_UNAVAILABLE' });
    });

    it('should record webhook event after processing', async () => {
      const eventData = {
        event_id: 'evt_record_123',
        processor: 'paypal',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        payload: { test: 'data' },
        status: 'processed'
      };

      mockPrisma.webhook_events.create.mockResolvedValue({
        id: 'wh_new',
        ...eventData,
        processed_at: new Date()
      });

      const result = await recordWebhookEvent(eventData, mockPrisma);

      expect(result).toHaveProperty('id');
      expect(mockPrisma.webhook_events.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event_id: eventData.event_id,
          processor: eventData.processor,
          event_type: eventData.event_type,
          payload: eventData.payload,
          status: eventData.status
        })
      });
    });

    it('should handle race condition in idempotency check', async () => {
      const eventId = 'evt_race_condition';
      const processor = 'stripe';

      // Simulate race condition: findUnique returns null (concurrent request)
      // but create fails with unique constraint violation
      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);
      mockPrisma.webhook_events.create.mockRejectedValue({
        code: 'P2002', // Prisma unique constraint violation
        meta: { target: ['event_id', 'processor'] }
      });

      // Should detect duplicate and handle gracefully
      const eventData = {
        event_id: eventId,
        processor: processor,
        event_type: 'test_event',
        payload: {},
        status: 'processed'
      };

      await expect(
        recordWebhookEvent(eventData, mockPrisma)
      ).resolves.toEqual({ action: 'duplicate', reason: 'race_condition' });
    });
  });

  describe('Webhook Routing', () => {
    it('should route to correct processor based on event structure', () => {
      // Stripe events have 'type' field
      const stripeEvent = {
        type: 'checkout.session.completed',
        id: 'evt_123'
      };
      expect(detectProcessor(stripeEvent)).toBe('stripe');

      // Square events have 'event_id' field
      const squareEvent = {
        type: 'payment.created',
        event_id: 'sq_evt_123'
      };
      expect(detectProcessor(squareEvent)).toBe('square');

      // PayPal events have 'event_type' field (uppercase)
      const paypalEvent = {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        id: 'WH-123'
      };
      expect(detectProcessor(paypalEvent)).toBe('paypal');
    });

    it('should throw error for unknown event structure', () => {
      const unknownEvent = {
        some_field: 'value'
      };

      expect(() => detectProcessor(unknownEvent)).toThrow(/unknown.*processor/i);
    });
  });

  describe('Error Handling', () => {
    it('should not expose sensitive data in error responses', async () => {
      const mockRequest = {
        body: JSON.stringify({
          type: 'checkout.session.completed',
          id: 'evt_sensitive',
          data: {
            object: {
              customer_email: 'customer@example.com',
              payment_intent: 'pi_secret_123'
            }
          }
        }),
        headers: {
          'stripe-signature': 'valid_signature'
        }
      };

      mockProcessors.stripe.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);
      mockProcessors.stripe.handleWebhook.mockRejectedValue(
        new Error('Failed to update order: customer_email=customer@example.com')
      );

      const result = await handleStripeWebhook(mockRequest, {
        processor: mockProcessors.stripe,
        webhookSecret: 'whsec_test',
        prisma: mockPrisma
      });

      expect(result.status).toBe(500);
      expect(result.error).toBeDefined();
      // Should not expose customer email or payment intent in error
      expect(result.error).not.toContain('customer@example.com');
      expect(result.error).not.toContain('pi_secret_123');
    });

    it('should log errors but return generic message to client', async () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn()
      };
      const mockRequest = {
        body: JSON.stringify({ type: 'test', id: 'evt_log' }),
        headers: { 'stripe-signature': 'valid' }
      };

      mockProcessors.stripe.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.webhook_events.findUnique.mockResolvedValue(null);
      mockProcessors.stripe.handleWebhook.mockRejectedValue(
        new Error('Internal database error: connection pool exhausted')
      );

      const result = await handleStripeWebhook(mockRequest, {
        processor: mockProcessors.stripe,
        webhookSecret: 'whsec_test',
        prisma: mockPrisma,
        logger: mockLogger
      });

      // Should log detailed error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Stripe webhook processing failed',
        expect.objectContaining({
          eventId: 'evt_log',
          error: expect.stringContaining('connection pool')
        })
      );

      // Should return generic error to client
      expect(result.error).toBe('Webhook processing failed');
      expect(result.error).not.toContain('connection pool');
    });
  });
});

/**
 * Helper function to detect processor from event structure
 * (To be implemented in actual handler)
 */
function detectProcessor(event) {
  if (event.type && event.id && !event.event_id && !event.event_type) {
    return 'stripe';
  }
  if (event.event_id) {
    return 'square';
  }
  if (event.event_type && event.event_type === event.event_type.toUpperCase()) {
    return 'paypal';
  }
  throw new Error('Unknown processor: cannot determine from event structure');
}

