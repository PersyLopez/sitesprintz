/**
 * StripeProcessor Tests
 * 
 * Tests for Stripe payment processor adapter.
 * Following TDD: Tests written BEFORE implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StripeProcessor } from '../../../server/services/payments/StripeProcessor.js';
import { runProcessorContractTests } from './IPaymentProcessor.contract.test.js';

// Mock Stripe SDK
const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn(),
      retrieve: vi.fn()
    }
  },
  refunds: {
    create: vi.fn()
  },
  webhooks: {
    constructEvent: vi.fn()
  }
};

// Mock Stripe module
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      constructor() {
        return mockStripe;
      }
    }
  };
});

// Setup mocks for contract tests
const setupContractMocks = () => {
  mockStripe.checkout.sessions.create.mockResolvedValue({
    id: 'cs_test_contract',
    url: 'https://checkout.stripe.com/pay/cs_test_contract'
  });
  mockStripe.checkout.sessions.retrieve.mockImplementation((sessionId) => {
    if (sessionId === 'non_existent_id') {
      const error = new Error('No such checkout session');
      error.type = 'StripeInvalidRequestError';
      throw error;
    }
    return Promise.resolve({
      id: sessionId,
      payment_status: 'paid',
      amount_total: 1000,
      currency: 'usd',
      metadata: {}
    });
  });
  mockStripe.refunds.create.mockResolvedValue({
    id: 're_test_contract',
    status: 'succeeded',
    amount: 100
  });
  mockStripe.webhooks.constructEvent.mockImplementation((payload, sig, secret) => {
    if (sig === 'bad-sig' || sig === 'invalid') {
      throw new Error('Invalid signature');
    }
    return { type: 'test' };
  });
};

setupContractMocks();

// Run contract compliance tests with mocked Stripe client
runProcessorContractTests(StripeProcessor, { 
  secretKey: 'sk_test_mock',
  stripeClient: mockStripe 
});

// Stripe-specific tests
describe('StripeProcessor', () => {
  let processor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new StripeProcessor('sk_test_mock', mockStripe);
  });

  describe('getProcessorName()', () => {
    it('should return "stripe"', () => {
      expect(processor.getProcessorName()).toBe('stripe');
    });
  });

  describe('createCheckout()', () => {
    it('should create Stripe checkout session', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123'
      });

      const result = await processor.createCheckout({
        items: [{ name: 'Test Product', price: 100, quantity: 1 }],
        totalCents: 10000,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });

      expect(result).toEqual({
        sessionId: 'cs_test_123',
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_123'
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'usd',
                unit_amount: 10000
              })
            })
          ]),
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        }),
        expect.anything()
      );
    });

    it('should include application_fee_amount when merchantAccountId provided', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123'
      });

      await processor.createCheckout({
        items: [{ name: 'Test', price: 100, quantity: 1 }],
        totalCents: 10000,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        platformFeeCents: 100,
        merchantAccountId: 'acct_123'
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent_data: expect.objectContaining({
            application_fee_amount: 100
          })
        }),
        expect.objectContaining({ stripeAccount: 'acct_123' })
      );
    });

    it('should NOT include payment_intent_data when no merchantAccountId', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123'
      });

      await processor.createCheckout({
        items: [{ name: 'Test', price: 100, quantity: 1 }],
        totalCents: 10000,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });

      const callArg = mockStripe.checkout.sessions.create.mock.calls[0][0];
      expect(callArg.payment_intent_data).toBeUndefined();
    });

    it('should support multiple payment methods', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123'
      });

      await processor.createCheckout({
        items: [{ name: 'Test', price: 100, quantity: 1 }],
        totalCents: 10000,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        paymentMethodTypes: ['card', 'paypal', 'link']
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card', 'paypal', 'link']
        }),
        expect.anything()
      );
    });
  });

  describe('getTransactionStatus()', () => {
    it('should retrieve session and return status', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test_123',
        payment_status: 'paid',
        amount_total: 10000,
        currency: 'usd',
        metadata: { order_id: '123' }
      });

      const result = await processor.getTransactionStatus('cs_test_123');

      expect(result).toEqual({
        status: 'paid',
        amount: 10000,
        currency: 'usd',
        metadata: { order_id: '123' }
      });

      expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_test_123');
    });

    it('should handle unpaid status', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test_123',
        payment_status: 'unpaid',
        amount_total: 10000,
        currency: 'usd'
      });

      const result = await processor.getTransactionStatus('cs_test_123');
      expect(result.status).toBe('unpaid');
    });
  });

  describe('processRefund()', () => {
    it('should create full refund when amountCents is null', async () => {
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test_123',
        status: 'succeeded',
        amount: 10000
      });

      const result = await processor.processRefund('pi_test_123', null, 'customer_request');

      expect(result).toEqual({
        refundId: 're_test_123',
        status: 'succeeded',
        amount: 10000
      });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        reason: 'requested_by_customer'
      });
    });

    it('should create partial refund when amountCents provided', async () => {
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test_123',
        status: 'succeeded',
        amount: 5000
      });

      const result = await processor.processRefund('pi_test_123', 5000, 'duplicate');

      expect(result.amount).toBe(5000);
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 5000,
        reason: 'duplicate'
      });
    });
  });

  describe('verifyWebhookSignature()', () => {
    it('should call stripe.webhooks.constructEvent', () => {
      mockStripe.webhooks.constructEvent.mockReturnValue({ type: 'test' });
      
      const result = processor.verifyWebhookSignature(
        '{"test": true}',
        'sig_header',
        'whsec_123'
      );
      
      expect(result).toBe(true);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        '{"test": true}',
        'sig_header',
        'whsec_123'
      );
    });

    it('should return false (not throw) on invalid signature', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });
      
      const result = processor.verifyWebhookSignature('payload', 'bad', 'secret');
      expect(result).toBe(false);
    });
  });

  describe('handleWebhook()', () => {
    it('should handle checkout.session.completed event', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            amount_total: 10000
          }
        }
      };

      const result = await processor.handleWebhook(event);

      expect(result.action).toBe('payment_completed');
      expect(result.sessionId).toBe('cs_test_123');
    });

    it('should handle charge.refunded event', async () => {
      const event = {
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_test_123',
            refund: {
              id: 're_test_123',
              amount: 10000
            }
          }
        }
      };

      const result = await processor.handleWebhook(event);

      expect(result.action).toBe('refund_completed');
      expect(result.refundId).toBe('re_test_123');
    });

    it('should handle unknown event types', async () => {
      const event = {
        type: 'unknown.event.type',
        data: {}
      };

      const result = await processor.handleWebhook(event);
      expect(result.action).toBe('unhandled');
    });
  });
});

