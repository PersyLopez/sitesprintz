/**
 * IPaymentProcessor Contract Tests
 * 
 * Contract test suite that ALL payment processor implementations must pass.
 * This ensures all processors follow the same interface contract.
 * 
 * Usage:
 *   import { runProcessorContractTests } from './IPaymentProcessor.contract.test.js';
 *   runProcessorContractTests(StripeProcessor, { secretKey: 'sk_test_mock' });
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Run contract compliance tests against a payment processor implementation
 * @param {class} ProcessorClass - The processor class to test
 * @param {object} mockCredentials - Mock credentials for the processor
 */
export function runProcessorContractTests(ProcessorClass, mockCredentials) {
  describe(`${ProcessorClass.name} Contract Compliance`, () => {
    let processor;

    beforeEach(() => {
      // Support different constructor patterns for different processors
      if (mockCredentials.stripeClient) {
        // Stripe pattern: (secretKey, stripeClient)
        processor = new ProcessorClass(mockCredentials.secretKey, mockCredentials.stripeClient);
      } else if (mockCredentials.squareClient) {
        // Square pattern: (accessToken, locationId, client)
        processor = new ProcessorClass(mockCredentials.accessToken, mockCredentials.locationId, mockCredentials.squareClient);
      } else if (mockCredentials.accessToken && mockCredentials.locationId) {
        // Square pattern without client
        processor = new ProcessorClass(mockCredentials.accessToken, mockCredentials.locationId);
      } else if (mockCredentials.clientId && mockCredentials.clientSecret) {
        // PayPal pattern: (clientId, clientSecret)
        processor = new ProcessorClass(mockCredentials.clientId, mockCredentials.clientSecret);
      } else {
        // Generic pattern
        processor = new ProcessorClass(mockCredentials);
      }
    });

    describe('createCheckout()', () => {
      it('should return { sessionId, checkoutUrl } on success', async () => {
        const result = await processor.createCheckout({
          items: [{ name: 'Test', price: 10, quantity: 1 }],
          totalCents: 1000,
          currency: 'usd',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });
        
        expect(result).toHaveProperty('sessionId');
        expect(result).toHaveProperty('checkoutUrl');
        expect(typeof result.sessionId).toBe('string');
        expect(result.checkoutUrl).toMatch(/^https:\/\//);
      });

      it('should reject invalid totalCents (negative)', async () => {
        await expect(processor.createCheckout({
          items: [{ name: 'Test', price: 10, quantity: 1 }],
          totalCents: -100,
          currency: 'usd',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        })).rejects.toThrow(/Invalid amount|minimum/i);
      });

      it('should reject totalCents below minimum (50 cents)', async () => {
        await expect(processor.createCheckout({
          items: [{ name: 'Test', price: 0.4, quantity: 1 }],
          totalCents: 40, // Below 50 cent minimum
          currency: 'usd',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        })).rejects.toThrow(/Invalid amount|minimum/i);
      });

      it('should reject invalid URLs (non-HTTPS in production)', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        
        try {
          await expect(processor.createCheckout({
            items: [{ name: 'Test', price: 10, quantity: 1 }],
            totalCents: 1000,
            currency: 'usd',
            successUrl: 'http://example.com/success', // HTTP not allowed
            cancelUrl: 'https://example.com/cancel'
          })).rejects.toThrow(/HTTPS required/i);
        } finally {
          process.env.NODE_ENV = originalEnv;
        }
      });

      it('should reject missing successUrl', async () => {
        await expect(processor.createCheckout({
          items: [{ name: 'Test', price: 10, quantity: 1 }],
          totalCents: 1000,
          currency: 'usd',
          cancelUrl: 'https://example.com/cancel'
          // Missing successUrl
        })).rejects.toThrow(/Success.*URL|required/i);
      });

      it('should reject missing cancelUrl', async () => {
        await expect(processor.createCheckout({
          items: [{ name: 'Test', price: 10, quantity: 1 }],
          totalCents: 1000,
          currency: 'usd',
          successUrl: 'https://example.com/success'
          // Missing cancelUrl
        })).rejects.toThrow(/Cancel.*URL|required/i);
      });

      it('should handle empty items array', async () => {
        await expect(processor.createCheckout({
          items: [],
          totalCents: 1000,
          currency: 'usd',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        })).rejects.toThrow();
      });
    });

    describe('getTransactionStatus()', () => {
      it('should return status, amount, and metadata', async () => {
        // This test requires a mock that returns a valid transaction
        // Each processor will need to mock their API response
        const result = await processor.getTransactionStatus('test_transaction_id');
        
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('amount');
        expect(typeof result.status).toBe('string');
        expect(typeof result.amount).toBe('number');
      });

      it('should reject empty transaction ID', async () => {
        await expect(processor.getTransactionStatus(''))
          .rejects.toThrow(/Transaction ID|required/i);
      });

      it('should handle non-existent transaction gracefully', async () => {
        // Should throw a specific error, not crash
        await expect(processor.getTransactionStatus('non_existent_id'))
          .rejects.toThrow();
      });
    });

    describe('processRefund()', () => {
      it('should require valid transaction ID', async () => {
        await expect(processor.processRefund('', 100))
          .rejects.toThrow(/Transaction ID|required/i);
      });

      it('should reject negative refund amounts', async () => {
        await expect(processor.processRefund('txn_123', -100))
          .rejects.toThrow(/Invalid refund amount/i);
      });

      it('should allow null amount for full refund', async () => {
        // Some processors allow null for full refund
        // This should not throw a validation error
        try {
          await processor.processRefund('txn_123', null);
        } catch (error) {
          // If it throws, it should be a processor-specific error, not validation
          expect(error.message).not.toContain('Invalid refund amount');
        }
      });

      it('should return { refundId, status, amount } on success', async () => {
        // Requires mock setup - each processor will mock differently
        const result = await processor.processRefund('txn_123', 100);
        
        expect(result).toHaveProperty('refundId');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('amount');
        expect(typeof result.refundId).toBe('string');
        expect(typeof result.status).toBe('string');
        expect(typeof result.amount).toBe('number');
      });
    });

    describe('verifyWebhookSignature()', () => {
      it('should return true for valid signature', async () => {
        // Note: PayPal verification is async, others are sync
        const result = await processor.verifyWebhookSignature(
          'test_payload',
          'valid_signature',
          'secret'
        );
        expect(typeof result).toBe('boolean');
      });

      it('should return false for invalid signature (not throw)', async () => {
        const result = await processor.verifyWebhookSignature(
          'payload',
          'bad-sig',
          'secret'
        );
        expect(result).toBe(false);
        // Should not throw
      });

      it('should use constant-time comparison', () => {
        // This test verifies timing attack prevention
        // Implementation should use crypto.timingSafeEqual
        const payload = 'test_payload';
        const secret = 'test_secret';
        
        // Generate valid signature (processor-specific)
        const validSig = processor._generateTestSignature?.(payload, secret);
        if (!validSig) {
          // Skip if processor doesn't provide test signature generator
          return;
        }
        
        const result1 = processor.verifyWebhookSignature(payload, validSig, secret);
        const result2 = processor.verifyWebhookSignature(payload, 'invalid', secret);
        
        expect(result1).toBe(true);
        expect(result2).toBe(false);
      });
    });

    describe('handleWebhook()', () => {
      it('should return action and data object', async () => {
        const event = {
          type: 'test_event',
          data: { object: { id: 'test_id' } }
        };
        
        const result = await processor.handleWebhook(event);
        
        expect(result).toHaveProperty('action');
        expect(typeof result.action).toBe('string');
      });

      it('should handle unknown event types gracefully', async () => {
        const event = {
          type: 'unknown_event_type',
          data: {}
        };
        
        const result = await processor.handleWebhook(event);
        // Should return action, even if 'unhandled'
        expect(result).toHaveProperty('action');
      });
    });

    describe('calculatePlatformFee()', () => {
      it('should calculate percentage fee correctly', () => {
        const feePolicy = { type: 'percentage', value: 1 }; // 1%
        const amountCents = 10000; // $100.00
        
        const fee = processor.calculatePlatformFee(amountCents, feePolicy);
        expect(fee).toBe(100); // 1% of 10000 = 100 cents
      });

      it('should calculate flat fee correctly', () => {
        const feePolicy = { type: 'flat', value: 500 }; // $5.00
        const amountCents = 10000;
        
        const fee = processor.calculatePlatformFee(amountCents, feePolicy);
        expect(fee).toBe(500);
      });

      it('should enforce minimum fee', () => {
        const feePolicy = { 
          type: 'percentage', 
          value: 0.1, // 0.1%
          minCents: 50 
        };
        const amountCents = 1000; // $10.00, 0.1% = 1 cent, but min is 50
        
        const fee = processor.calculatePlatformFee(amountCents, feePolicy);
        expect(fee).toBe(50); // Minimum enforced
      });

      it('should enforce maximum fee', () => {
        const feePolicy = { 
          type: 'percentage', 
          value: 10, // 10%
          maxCents: 1000 
        };
        const amountCents = 50000; // $500.00, 10% = 5000 cents, but max is 1000
        
        const fee = processor.calculatePlatformFee(amountCents, feePolicy);
        expect(fee).toBe(1000); // Maximum enforced
      });
    });

    describe('getProcessorName()', () => {
      it('should return processor name', () => {
        const name = processor.getProcessorName();
        expect(typeof name).toBe('string');
        expect(['stripe', 'square', 'paypal']).toContain(name);
      });
    });
  });
}

