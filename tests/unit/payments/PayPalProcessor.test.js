/**
 * PayPalProcessor Tests
 * 
 * Tests for PayPal payment processor adapter.
 * Following TDD: Tests written BEFORE implementation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PayPalProcessor } from '../../../server/services/payments/PayPalProcessor.js';
import { runProcessorContractTests } from './IPaymentProcessor.contract.test.js';

// Mock global fetch for PayPal API calls
global.fetch = vi.fn();

// Mock responses for contract tests
beforeEach(() => {
  vi.useFakeTimers();
  
  // Mock PayPal access token
  global.fetch.mockImplementation((url) => {
    if (url.includes('/v1/oauth2/token')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          access_token: 'test_access_token',
          expires_in: 3600
        })
      });
    }
    
    if (url.includes('/v2/checkout/orders')) {
      if (url.includes('non_existent_id')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' })
        });
      }
      
      if (url.endsWith('/orders')) {
        // Create order
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'order_contract',
            links: [{ rel: 'approve', href: 'https://paypal.com/checkoutnow?token=order_contract' }],
            status: 'CREATED'
          })
        });
      } else {
        // Get order
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'order_contract',
            status: 'APPROVED',
            purchase_units: [{
              amount: {
                value: '10.00',
                currency_code: 'USD'
              }
            }]
          })
        });
      }
    }
    
    if (url.includes('/v2/payments/captures')) {
      // Refund
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: 'refund_contract',
          status: 'COMPLETED',
          amount: {
            value: '1.00',
            currency_code: 'USD'
          }
        })
      });
    }
    
    if (url.includes('/v1/notifications/verify-webhook-signature')) {
      // Webhook verification
      return Promise.resolve({
        ok: true,
        json: async () => ({
          verification_status: 'SUCCESS'
        })
      });
    }
    
    return Promise.reject(new Error('Unmocked URL: ' + url));
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// Run contract compliance tests
runProcessorContractTests(PayPalProcessor, {
  clientId: 'test_client',
  clientSecret: 'test_secret'
});

// PayPal-specific tests
describe('PayPalProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new PayPalProcessor('test_client', 'test_secret');
    // Clear cached token
    processor._accessToken = null;
    processor._tokenExpiry = null;
  });

  describe('getProcessorName()', () => {
    it('should return "paypal"', () => {
      expect(processor.getProcessorName()).toBe('paypal');
    });
  });

  describe('getAccessToken()', () => {
    it('should cache access token until expiration', async () => {
      global.fetch.mockClear();
      
      // First call - fetches token
      const token1 = await processor.getAccessToken();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(token1).toBe('test_access_token');
      
      // Second call - uses cache
      const token2 = await processor.getAccessToken();
      expect(global.fetch).toHaveBeenCalledTimes(1); // No additional call
      expect(token2).toBe('test_access_token');
    });

    it('should refresh token when expired', async () => {
      global.fetch.mockClear();
      
      // First call
      await processor.getAccessToken();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Fast forward past expiration (3600s)
      vi.advanceTimersByTime(3601 * 1000);
      
      // Second call should fetch new token
      await processor.getAccessToken();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not expose credentials in error messages', async () => {
      const processor = new PayPalProcessor('secret_client_id', 'secret_key');
      
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Authentication failed' })
      });
      
      await expect(processor.getAccessToken()).rejects.toThrow();
      
      try {
        await processor.getAccessToken();
      } catch (error) {
        expect(error.message).not.toContain('secret_client_id');
        expect(error.message).not.toContain('secret_key');
      }
    });

    it('should use basic auth for token request', async () => {
      await processor.getAccessToken();
      
      const tokenCall = global.fetch.mock.calls.find(call => 
        call[0].includes('/v1/oauth2/token')
      );
      
      expect(tokenCall[1].headers.Authorization).toMatch(/^Basic /);
    });
  });

  describe('createCheckout()', () => {
    it('should create PayPal order', async () => {
      const result = await processor.createCheckout({
        items: [{ name: 'Test Product', price: 100, quantity: 1 }],
        totalCents: 10000,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });

      expect(result).toEqual({
        sessionId: 'order_contract',
        checkoutUrl: 'https://paypal.com/checkoutnow?token=order_contract'
      });
    });

    it('should include application_context with return URLs', async () => {
      await processor.createCheckout({
        items: [{ name: 'Test', price: 10, quantity: 1 }],
        totalCents: 1000,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });

      const createCall = global.fetch.mock.calls.find(call => 
        call[0].includes('/v2/checkout/orders') && !call[0].match(/order_\w+$/)
      );
      
      const body = JSON.parse(createCall[1].body);
      expect(body.application_context.return_url).toBe('https://example.com/success');
      expect(body.application_context.cancel_url).toBe('https://example.com/cancel');
    });
  });

  describe('getTransactionStatus()', () => {
    it('should retrieve order and return status', async () => {
      const result = await processor.getTransactionStatus('order_123');

      expect(result).toEqual({
        status: 'APPROVED',
        amount: 1000, // $10.00 in cents
        currency: 'USD',
        metadata: {}
      });
    });
  });

  describe('processRefund()', () => {
    it('should create refund via PayPal API', async () => {
      const result = await processor.processRefund('capture_123', 1000, 'customer_request');

      expect(result).toEqual({
        refundId: 'refund_contract',
        status: 'COMPLETED',
        amount: 100 // $1.00 in cents
      });
    });
  });

  describe('verifyWebhookSignature()', () => {
    it('should verify via PayPal API (not just HMAC)', async () => {
      // Mock token request
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test_token',
          expires_in: 3600
        })
      });
      
      // Mock webhook verification request
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          verification_status: 'SUCCESS'
        })
      });

      const result = await processor.verifyWebhookSignature(
        'payload',
        'sig_header',
        'webhook_id'
      );

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', async () => {
      // Mock token request
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test_token',
          expires_in: 3600
        })
      });
      
      // Mock webhook verification request
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          verification_status: 'FAILURE'
        })
      });

      const result = await processor.verifyWebhookSignature(
        'payload',
        'bad-sig',
        'webhook_id'
      );

      expect(result).toBe(false);
    });
  });

  describe('handleWebhook()', () => {
    it('should handle CHECKOUT.ORDER.APPROVED event', async () => {
      const event = {
        event_type: 'CHECKOUT.ORDER.APPROVED',
        resource: {
          id: 'order_123',
          purchase_units: [{
            amount: {
              value: '100.00',
              currency_code: 'USD'
            }
          }]
        }
      };

      const result = await processor.handleWebhook(event);

      expect(result.action).toBe('payment_completed');
      expect(result.orderId).toBe('order_123');
    });

    it('should handle PAYMENT.CAPTURE.REFUNDED event', async () => {
      const event = {
        event_type: 'PAYMENT.CAPTURE.REFUNDED',
        resource: {
          id: 'refund_123',
          amount: {
            value: '50.00'
          }
        }
      };

      const result = await processor.handleWebhook(event);

      expect(result.action).toBe('refund_completed');
      expect(result.refundId).toBe('refund_123');
    });

    it('should handle unknown event types', async () => {
      const event = {
        event_type: 'UNKNOWN.EVENT.TYPE',
        resource: {}
      };

      const result = await processor.handleWebhook(event);
      expect(result.action).toBe('unhandled');
    });
  });
});

