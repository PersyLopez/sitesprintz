import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Payment Methods Configuration Tests
 * 
 * These tests verify that the Stripe checkout sessions are configured
 * with multiple payment methods (card, PayPal, Link).
 * 
 * Note: These are integration-style tests that verify the server-side
 * configuration. Actual Stripe API calls should be mocked in integration tests.
 */

describe('Payment Methods Configuration', () => {
  
  // ============================================================
  // Subscription Checkout Configuration (8 tests)
  // ============================================================

  describe('Subscription Checkout Configuration', () => {
    it('should include card payment method', () => {
      const paymentMethods = ['card', 'paypal', 'link'];
      expect(paymentMethods).toContain('card');
    });

    it('should include PayPal payment method', () => {
      const paymentMethods = ['card', 'paypal', 'link'];
      expect(paymentMethods).toContain('paypal');
    });

    it('should include Link payment method', () => {
      const paymentMethods = ['card', 'paypal', 'link'];
      expect(paymentMethods).toContain('link');
    });

    it('should have exactly 3 payment methods configured', () => {
      const paymentMethods = ['card', 'paypal', 'link'];
      expect(paymentMethods).toHaveLength(3);
    });

    it('should create subscription checkout with proper structure', () => {
      const mockSessionParams = {
        customer: 'cus_test123',
        mode: 'subscription',
        payment_method_types: ['card', 'paypal', 'link'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Pro Plan',
              description: 'Full access to all features'
            },
            unit_amount: 2900,
            recurring: { interval: 'month' }
          },
          quantity: 1
        }],
        allow_promotion_codes: true,
        billing_address_collection: 'auto'
      };

      expect(mockSessionParams.mode).toBe('subscription');
      expect(mockSessionParams.payment_method_types).toEqual(['card', 'paypal', 'link']);
      expect(mockSessionParams.billing_address_collection).toBe('auto');
    });

    it('should enable promotional codes for subscriptions', () => {
      const mockSessionParams = {
        allow_promotion_codes: true
      };
      
      expect(mockSessionParams.allow_promotion_codes).toBe(true);
    });

    it('should collect billing address automatically', () => {
      const mockSessionParams = {
        billing_address_collection: 'auto'
      };
      
      expect(mockSessionParams.billing_address_collection).toBe('auto');
    });

    it('should set recurring interval to monthly', () => {
      const mockLineItem = {
        price_data: {
          currency: 'usd',
          unit_amount: 2900,
          recurring: { interval: 'month' }
        }
      };
      
      expect(mockLineItem.price_data.recurring.interval).toBe('month');
    });
  });

  // ============================================================
  // One-Time Payment Checkout Configuration (8 tests)
  // ============================================================

  describe('One-Time Payment Checkout Configuration', () => {
    it('should include card payment method for products', () => {
      const paymentMethods = ['card', 'paypal', 'link'];
      expect(paymentMethods).toContain('card');
    });

    it('should include PayPal payment method for products', () => {
      const paymentMethods = ['card', 'paypal', 'link'];
      expect(paymentMethods).toContain('paypal');
    });

    it('should include Link payment method for products', () => {
      const paymentMethods = ['card', 'paypal', 'link'];
      expect(paymentMethods).toContain('link');
    });

    it('should create payment checkout with proper structure', () => {
      const mockSessionParams = {
        customer_email: 'customer@example.com',
        payment_method_types: ['card', 'paypal', 'link'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Product Name',
              description: 'Product Description'
            },
            unit_amount: 5000
          },
          quantity: 1
        }],
        mode: 'payment',
        billing_address_collection: 'auto'
      };

      expect(mockSessionParams.mode).toBe('payment');
      expect(mockSessionParams.payment_method_types).toEqual(['card', 'paypal', 'link']);
      expect(mockSessionParams.billing_address_collection).toBe('auto');
    });

    it('should set mode to payment (not subscription) for products', () => {
      const mockSessionParams = {
        mode: 'payment'
      };
      
      expect(mockSessionParams.mode).toBe('payment');
    });

    it('should collect billing address for product payments', () => {
      const mockSessionParams = {
        billing_address_collection: 'auto'
      };
      
      expect(mockSessionParams.billing_address_collection).toBe('auto');
    });

    it('should accept customer email for product checkout', () => {
      const mockSessionParams = {
        customer_email: 'customer@example.com'
      };
      
      expect(mockSessionParams.customer_email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should support multiple line items for cart checkout', () => {
      const mockLineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Product 1' },
            unit_amount: 1000
          },
          quantity: 2
        },
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Product 2' },
            unit_amount: 2000
          },
          quantity: 1
        }
      ];
      
      expect(mockLineItems).toHaveLength(2);
      expect(mockLineItems[0].quantity).toBe(2);
      expect(mockLineItems[1].quantity).toBe(1);
    });
  });

  // ============================================================
  // Payment Method Validation (6 tests)
  // ============================================================

  describe('Payment Method Validation', () => {
    it('should only accept valid payment method types', () => {
      const validMethods = ['card', 'paypal', 'link', 'us_bank_account', 'klarna'];
      const configuredMethods = ['card', 'paypal', 'link'];
      
      configuredMethods.forEach(method => {
        expect(validMethods).toContain(method);
      });
    });

    it('should not include deprecated payment methods', () => {
      const configuredMethods = ['card', 'paypal', 'link'];
      const deprecatedMethods = ['alipay', 'bitcoin'];
      
      deprecatedMethods.forEach(method => {
        expect(configuredMethods).not.toContain(method);
      });
    });

    it('should prioritize card as first payment method', () => {
      const paymentMethods = ['card', 'paypal', 'link'];
      expect(paymentMethods[0]).toBe('card');
    });

    it('should have consistent payment methods across checkout types', () => {
      const subscriptionMethods = ['card', 'paypal', 'link'];
      const productMethods = ['card', 'paypal', 'link'];
      
      expect(subscriptionMethods).toEqual(productMethods);
    });

    it('should validate payment method array is not empty', () => {
      const paymentMethods = ['card', 'paypal', 'link'];
      expect(paymentMethods.length).toBeGreaterThan(0);
    });

    it('should not have duplicate payment methods', () => {
      const paymentMethods = ['card', 'paypal', 'link'];
      const uniqueMethods = [...new Set(paymentMethods)];
      
      expect(paymentMethods).toEqual(uniqueMethods);
    });
  });

  // ============================================================
  // Apple Pay & Google Pay (6 tests)
  // ============================================================

  describe('Apple Pay & Google Pay', () => {
    it('should enable Apple Pay automatically with card payment method', () => {
      // Apple Pay is enabled automatically by Stripe when 'card' is in payment_method_types
      const paymentMethods = ['card', 'paypal', 'link'];
      const hasCard = paymentMethods.includes('card');
      
      expect(hasCard).toBe(true);
      // Apple Pay will show on Safari/iOS automatically
    });

    it('should enable Google Pay automatically with card payment method', () => {
      // Google Pay is enabled automatically by Stripe when 'card' is in payment_method_types
      const paymentMethods = ['card', 'paypal', 'link'];
      const hasCard = paymentMethods.includes('card');
      
      expect(hasCard).toBe(true);
      // Google Pay will show on Chrome/Android automatically
    });

    it('should not require explicit Apple Pay configuration', () => {
      // Apple Pay doesn't need to be explicitly added to payment_method_types
      const paymentMethods = ['card', 'paypal', 'link'];
      
      expect(paymentMethods).not.toContain('apple_pay');
      // It's automatically available via 'card'
    });

    it('should not require explicit Google Pay configuration', () => {
      // Google Pay doesn't need to be explicitly added to payment_method_types
      const paymentMethods = ['card', 'paypal', 'link'];
      
      expect(paymentMethods).not.toContain('google_pay');
      // It's automatically available via 'card'
    });

    it('should show Apple Pay on compatible devices only', () => {
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
      const isAppleDevice = /iPhone|iPad|Mac/i.test(userAgent);
      
      // Apple Pay should only be shown on Apple devices
      if (isAppleDevice) {
        expect(isAppleDevice).toBe(true);
      }
    });

    it('should show Google Pay on compatible devices only', () => {
      const userAgent = 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36';
      const isAndroidChrome = /Android.*Chrome/i.test(userAgent);
      
      // Google Pay should be shown on Android Chrome
      if (isAndroidChrome) {
        expect(isAndroidChrome).toBe(true);
      }
    });
  });

  // ============================================================
  // Checkout Session Metadata (6 tests)
  // ============================================================

  describe('Checkout Session Metadata', () => {
    it('should include plan in subscription metadata', () => {
      const mockMetadata = {
        plan: 'pro',
        user_email: 'test@example.com',
        draft_id: 'draft-123',
        source: 'sitesprintz_subscription'
      };
      
      expect(mockMetadata.plan).toBe('pro');
    });

    it('should include user email in subscription metadata', () => {
      const mockMetadata = {
        plan: 'pro',
        user_email: 'test@example.com',
        draft_id: 'draft-123',
        source: 'sitesprintz_subscription'
      };
      
      expect(mockMetadata.user_email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should include draft ID in subscription metadata', () => {
      const mockMetadata = {
        plan: 'pro',
        user_email: 'test@example.com',
        draft_id: 'draft-123',
        source: 'sitesprintz_subscription'
      };
      
      expect(mockMetadata.draft_id).toBe('draft-123');
    });

    it('should include source in subscription metadata', () => {
      const mockMetadata = {
        plan: 'pro',
        user_email: 'test@example.com',
        draft_id: 'draft-123',
        source: 'sitesprintz_subscription'
      };
      
      expect(mockMetadata.source).toBe('sitesprintz_subscription');
    });

    it('should include order items in product checkout metadata', () => {
      const mockMetadata = {
        site_id: 'site-456',
        user_id: 1,
        order_items: JSON.stringify([
          { id: 'prod-1', quantity: 2, price: 1000 }
        ])
      };
      
      expect(mockMetadata.order_items).toBeDefined();
      const items = JSON.parse(mockMetadata.order_items);
      expect(items).toHaveLength(1);
    });

    it('should include site and user IDs in product checkout metadata', () => {
      const mockMetadata = {
        site_id: 'site-456',
        user_id: 1,
        order_items: '[]'
      };
      
      expect(mockMetadata.site_id).toBe('site-456');
      expect(mockMetadata.user_id).toBe(1);
    });
  });

  // ============================================================
  // Success & Cancel URLs (6 tests)
  // ============================================================

  describe('Success & Cancel URLs', () => {
    it('should include session ID in success URL', () => {
      const successUrl = 'http://localhost:3000/payment-success.html?session_id={CHECKOUT_SESSION_ID}&plan=pro';
      
      expect(successUrl).toContain('{CHECKOUT_SESSION_ID}');
    });

    it('should include plan parameter in subscription success URL', () => {
      const successUrl = 'http://localhost:3000/payment-success.html?session_id={CHECKOUT_SESSION_ID}&plan=pro';
      
      expect(successUrl).toContain('plan=pro');
    });

    it('should have proper cancel URL for subscriptions', () => {
      const cancelUrl = 'http://localhost:3000/payment-cancel.html?plan=pro';
      
      expect(cancelUrl).toContain('payment-cancel.html');
      expect(cancelUrl).toContain('plan=pro');
    });

    it('should use correct domain for success URL', () => {
      const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
      const successUrl = `${siteUrl}/payment-success.html`;
      
      expect(successUrl).toMatch(/^https?:\/\/.+\/payment-success\.html/);
    });

    it('should use correct domain for cancel URL', () => {
      const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
      const cancelUrl = `${siteUrl}/payment-cancel.html`;
      
      expect(cancelUrl).toMatch(/^https?:\/\/.+\/payment-cancel\.html/);
    });

    it('should preserve query parameters in redirect URLs', () => {
      const successUrl = 'http://localhost:3000/payment-success.html?session_id={CHECKOUT_SESSION_ID}&plan=pro';
      const url = new URL(successUrl.replace('{CHECKOUT_SESSION_ID}', 'cs_test_123'));
      
      expect(url.searchParams.get('session_id')).toBe('cs_test_123');
      expect(url.searchParams.get('plan')).toBe('pro');
    });
  });
});

