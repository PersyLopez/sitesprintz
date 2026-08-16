/**
 * Sandbox Integration Tests
 * 
 * Tests payment processors against real sandbox APIs.
 * Requires sandbox credentials in environment.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { StripeProcessor } from '../../../server/services/payments/StripeProcessor.js';
import { SquareProcessor } from '../../../server/services/payments/SquareProcessor.js';
import { PayPalProcessor } from '../../../server/services/payments/PayPalProcessor.js';

describe('Payment Processor Sandbox Tests', () => {
  // Skip if no sandbox credentials
  const hasStripeKey = !!process.env.STRIPE_TEST_KEY;
  const hasSquareToken = !!process.env.SQUARE_SANDBOX_TOKEN && !!process.env.SQUARE_SANDBOX_LOCATION;
  const hasPayPalCredentials = !!process.env.PAYPAL_SANDBOX_CLIENT && !!process.env.PAYPAL_SANDBOX_SECRET;

  describe('Stripe Sandbox', () => {
    it.skipIf(!hasStripeKey)('should create real checkout session', async () => {
      const processor = new StripeProcessor(process.env.STRIPE_TEST_KEY);
      const result = await processor.createCheckout({
        items: [{ name: 'Test Product', price: 10, quantity: 1 }],
        totalCents: 1000,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });
      
      expect(result.checkoutUrl).toMatch(/checkout\.stripe\.com/);
      expect(result.sessionId).toMatch(/^cs_/);
    }, { timeout: 10000 });
  });

  describe('Square Sandbox', () => {
    it.skipIf(!hasSquareToken)('should create real payment link', async () => {
      const processor = new SquareProcessor(
        process.env.SQUARE_SANDBOX_TOKEN,
        process.env.SQUARE_SANDBOX_LOCATION
      );
      const result = await processor.createCheckout({
        items: [{ name: 'Test Product', price: 10, quantity: 1 }],
        totalCents: 1000,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });
      
      expect(result.checkoutUrl).toMatch(/squareup\.com|square\.site/);
      expect(result.sessionId).toBeTruthy();
    }, { timeout: 10000 });
  });

  describe('PayPal Sandbox', () => {
    it.skipIf(!hasPayPalCredentials)('should create real order', async () => {
      const processor = new PayPalProcessor(
        process.env.PAYPAL_SANDBOX_CLIENT,
        process.env.PAYPAL_SANDBOX_SECRET
      );
      const result = await processor.createCheckout({
        items: [{ name: 'Test Product', price: 10, quantity: 1 }],
        totalCents: 1000,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });
      
      expect(result.checkoutUrl).toMatch(/paypal\.com/);
      expect(result.sessionId).toBeTruthy();
    }, { timeout: 10000 });
  });
});


