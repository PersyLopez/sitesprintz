/**
 * SquareProcessor Tests
 * 
 * Tests for Square payment processor adapter.
 * Following TDD: Tests written BEFORE implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SquareProcessor } from '../../../server/services/payments/SquareProcessor.js';
import { runProcessorContractTests } from './IPaymentProcessor.contract.test.js';

// Mock Square SDK
const mockSquareClient = {
  paymentsApi: {
    createPayment: vi.fn()
  },
  refundsApi: {
    refundPayment: vi.fn()
  },
  checkoutApi: {
    createPaymentLink: vi.fn(),
    retrievePaymentLink: vi.fn()
  }
};

vi.mock('square/legacy', () => ({
  Client: class MockClient {
    constructor() {
      return mockSquareClient;
    }
  },
  Environment: {
    Production: 'production',
    Sandbox: 'sandbox'
  }
}));

// Run contract compliance tests
beforeEach(() => {
  // Setup mocks for contract tests
  mockSquareClient.checkoutApi.createPaymentLink.mockResolvedValue({
    result: {
      paymentLink: {
        id: 'link_contract',
        url: 'https://checkout.square.site/pay/link_contract',
        orderId: 'order_contract'
      }
    }
  });
  
  mockSquareClient.checkoutApi.retrievePaymentLink.mockImplementation((linkId) => {
    if (linkId === 'non_existent_id') {
      const error = new Error('Not found');
      error.statusCode = 404;
      throw error;
    }
    return Promise.resolve({
      result: {
        paymentLink: {
          id: linkId,
          orderId: 'order_123'
        }
      }
    });
  });
  
  mockSquareClient.refundsApi.refundPayment.mockResolvedValue({
    result: {
      refund: {
        id: 'refund_contract',
        status: 'COMPLETED',
        amountMoney: {
          amount: BigInt(100),
          currency: 'USD'
        }
      }
    }
  });
});

runProcessorContractTests(SquareProcessor, {
  accessToken: 'test_token',
  locationId: 'loc_123',
  squareClient: mockSquareClient
});

// Square-specific tests
describe('SquareProcessor', () => {
  let processor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new SquareProcessor('test_token', 'loc_123', mockSquareClient);
  });

  describe('getProcessorName()', () => {
    it('should return "square"', () => {
      expect(processor.getProcessorName()).toBe('square');
    });
  });

  describe('createCheckout()', () => {
    it('should create Square payment link', async () => {
      mockSquareClient.checkoutApi.createPaymentLink.mockResolvedValue({
        result: {
          paymentLink: {
            id: 'link_123',
            url: 'https://checkout.square.site/pay/link_123',
            orderId: 'order_123'
          }
        }
      });

      const result = await processor.createCheckout({
        items: [{ name: 'Test Product', price: 100, quantity: 1 }],
        totalCents: 10000,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });

      expect(result).toEqual({
        sessionId: 'link_123',
        checkoutUrl: 'https://checkout.square.site/pay/link_123'
      });

      expect(mockSquareClient.checkoutApi.createPaymentLink).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentLink: expect.objectContaining({
            checkoutOptions: expect.objectContaining({
              redirectUrl: 'https://example.com/success'
            })
          })
        })
      );
    });

    it('should convert items to Square line items format', async () => {
      mockSquareClient.checkoutApi.createPaymentLink.mockResolvedValue({
        result: {
          paymentLink: {
            id: 'link_123',
            url: 'https://checkout.square.site/pay/link_123'
          }
        }
      });

      await processor.createCheckout({
        items: [
          { name: 'Product A', price: 50, quantity: 2 },
          { name: 'Product B', price: 25, quantity: 1 }
        ],
        totalCents: 12500,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });

      const call = mockSquareClient.checkoutApi.createPaymentLink.mock.calls[0][0];
      expect(call.paymentLink.order.lineItems).toHaveLength(2);
      expect(call.paymentLink.order.lineItems[0].quantity).toBe('2');
      expect(call.paymentLink.order.lineItems[1].quantity).toBe('1');
    });

    it('should attach site_id metadata and paymentNote for webhook recovery', async () => {
      mockSquareClient.checkoutApi.createPaymentLink.mockResolvedValue({
        result: {
          paymentLink: {
            id: 'link_123',
            url: 'https://checkout.square.site/pay/link_123'
          }
        }
      });

      await processor.createCheckout({
        items: [{ name: 'Test', price: 10, quantity: 1 }],
        totalCents: 1000,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        metadata: {
          site_id: 'site-123',
          user_id: 'user-123',
          type: 'order',
          order_items: JSON.stringify([{ id: 'p1' }])
        }
      });

      const call = mockSquareClient.checkoutApi.createPaymentLink.mock.calls[0][0];
      expect(call.paymentLink.order.metadata).toEqual({
        site_id: 'site-123',
        user_id: 'user-123',
        type: 'order'
      });
      expect(call.paymentLink.paymentNote).toBe('site_id:site-123');
    });
  });

  describe('getTransactionStatus()', () => {
    it('should retrieve payment link and return status', async () => {
      mockSquareClient.checkoutApi.retrievePaymentLink.mockResolvedValue({
        result: {
          paymentLink: {
            id: 'link_123',
            orderId: 'order_123'
          }
        }
      });

      const result = await processor.getTransactionStatus('link_123');

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('amount');
      expect(mockSquareClient.checkoutApi.retrievePaymentLink).toHaveBeenCalledWith('link_123');
    });
  });

  describe('processRefund()', () => {
    it('should create refund via Square API', async () => {
      mockSquareClient.refundsApi.refundPayment.mockResolvedValue({
        result: {
          refund: {
            id: 'refund_123',
            status: 'COMPLETED',
            amountMoney: {
              amount: 10000,
              currency: 'USD'
            }
          }
        }
      });

      const result = await processor.processRefund('payment_123', 10000, 'customer_request');

      expect(result).toEqual({
        refundId: 'refund_123',
        status: 'COMPLETED',
        amount: 10000
      });

      expect(mockSquareClient.refundsApi.refundPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 'payment_123',
          amountMoney: {
            amount: BigInt(10000),
            currency: 'USD'
          }
        })
      );
    });

    it('should handle full refund when amountCents is null', async () => {
      mockSquareClient.refundsApi.refundPayment.mockResolvedValue({
        result: {
          refund: {
            id: 'refund_123',
            status: 'COMPLETED',
            amountMoney: {
              amount: 10000,
              currency: 'USD'
            }
          }
        }
      });

      const result = await processor.processRefund('payment_123', null);

      // Should not include amountMoney for full refund
      const call = mockSquareClient.refundsApi.refundPayment.mock.calls[0][0];
      expect(call.amountMoney).toBeUndefined();
    });
  });

  describe('verifyWebhookSignature()', () => {
    it('should verify HMAC-SHA256 signature', () => {
      const payload = '{"test": true}';
      const secret = 'webhook_secret';
      
      // Generate valid signature
      const crypto = require('crypto');
      const validSig = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');

      expect(processor.verifyWebhookSignature(payload, validSig, secret)).toBe(true);
      expect(processor.verifyWebhookSignature(payload, 'invalid', secret)).toBe(false);
    });

    it('should use constant-time comparison', () => {
      const processor = new SquareProcessor('token', 'loc_123', mockSquareClient);
      const payload = 'test';
      const secret = 'secret';
      
      const crypto = require('crypto');
      const sig1 = crypto.createHmac('sha256', secret).update(payload).digest('base64');
      const sig2 = 'invalid_signature_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Same length
      
      const result1 = processor.verifyWebhookSignature(payload, sig1, secret);
      const result2 = processor.verifyWebhookSignature(payload, sig2, secret);
      
      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('handleWebhook()', () => {
    it('should handle payment.created event', async () => {
      const event = {
        type: 'payment.created',
        data: {
          object: {
            payment: {
              id: 'payment_123',
              totalMoney: {
                amount: 10000,
                currency: 'USD'
              }
            }
          }
        }
      };

      const result = await processor.handleWebhook(event);

      expect(result.action).toBe('payment_completed');
      expect(result.paymentId).toBe('payment_123');
    });

    it('should handle refund.created event', async () => {
      const event = {
        type: 'refund.created',
        data: {
          object: {
            refund: {
              id: 'refund_123',
              amountMoney: {
                amount: 5000
              }
            }
          }
        }
      };

      const result = await processor.handleWebhook(event);

      expect(result.action).toBe('refund_completed');
      expect(result.refundId).toBe('refund_123');
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

