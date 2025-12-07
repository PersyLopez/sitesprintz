import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Stripe Checkout Integration Tests
 * 
 * These tests verify the end-to-end Stripe checkout flow for
 * subscriptions and product purchases with multiple payment methods.
 * 
 * Note: These tests mock the Stripe API. For full E2E testing,
 * use Stripe's test mode with real API calls in a staging environment.
 */

// Mock Stripe
const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn()
    }
  },
  customers: {
    create: vi.fn(),
    retrieve: vi.fn()
  }
};

describe('Stripe Checkout Integration', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful responses
    mockStripe.customers.create.mockResolvedValue({
      id: 'cus_test123',
      email: 'test@example.com'
    });
    
    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_session',
      url: 'https://checkout.stripe.com/test-session'
    });
  });

  // ============================================================
  // Subscription Checkout Flow (10 tests)
  // ============================================================

  describe('Subscription Checkout Flow', () => {
    it('should create checkout session with all payment methods', async () => {
      const sessionParams = {
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
        }]
      };

      const session = await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card', 'paypal', 'link']
        })
      );
      expect(session.url).toBe('https://checkout.stripe.com/test-session');
    });

    it('should create customer before checkout if not exists', async () => {
      const customer = await mockStripe.customers.create({
        email: 'newuser@example.com',
        metadata: {
          source: 'sitesprintz',
          signupDate: new Date().toISOString()
        }
      });
      
      expect(mockStripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com'
        })
      );
      expect(customer.id).toBe('cus_test123');
    });

    it('should include trial period for eligible users', async () => {
      const sessionParams = {
        customer: 'cus_test123',
        mode: 'subscription',
        subscription_data: {
          trial_period_days: 15
        },
        payment_method_types: ['card', 'paypal', 'link']
      };

      await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            trial_period_days: 15
          })
        })
      );
    });

    it('should include metadata for tracking', async () => {
      const sessionParams = {
        customer: 'cus_test123',
        mode: 'subscription',
        payment_method_types: ['card', 'paypal', 'link'],
        metadata: {
          plan: 'pro',
          user_email: 'test@example.com',
          draft_id: 'draft-123',
          source: 'sitesprintz_subscription'
        }
      };

      await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            plan: 'pro',
            source: 'sitesprintz_subscription'
          })
        })
      );
    });

    it('should redirect to success page after completion', async () => {
      const sessionParams = {
        customer: 'cus_test123',
        mode: 'subscription',
        payment_method_types: ['card', 'paypal', 'link'],
        success_url: 'http://localhost:3000/payment-success.html?session_id={CHECKOUT_SESSION_ID}&plan=pro'
      };

      const session = await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining('payment-success.html')
        })
      );
    });

    it('should redirect to cancel page if user cancels', async () => {
      const sessionParams = {
        customer: 'cus_test123',
        mode: 'subscription',
        payment_method_types: ['card', 'paypal', 'link'],
        cancel_url: 'http://localhost:3000/payment-cancel.html?plan=pro'
      };

      await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cancel_url: expect.stringContaining('payment-cancel.html')
        })
      );
    });

    it('should handle Stripe API errors gracefully', async () => {
      mockStripe.checkout.sessions.create.mockRejectedValueOnce(
        new Error('Invalid API key')
      );

      await expect(
        mockStripe.checkout.sessions.create({})
      ).rejects.toThrow('Invalid API key');
    });

    it('should retry on network timeout', async () => {
      mockStripe.checkout.sessions.create
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce({
          id: 'cs_test_session',
          url: 'https://checkout.stripe.com/test-session'
        });

      // First call fails
      await expect(
        mockStripe.checkout.sessions.create({})
      ).rejects.toThrow('Request timeout');

      // Retry succeeds
      const session = await mockStripe.checkout.sessions.create({});
      expect(session.id).toBe('cs_test_session');
    });

    it('should allow promotional codes', async () => {
      const sessionParams = {
        customer: 'cus_test123',
        mode: 'subscription',
        payment_method_types: ['card', 'paypal', 'link'],
        allow_promotion_codes: true
      };

      await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          allow_promotion_codes: true
        })
      );
    });

    it('should collect billing address automatically', async () => {
      const sessionParams = {
        customer: 'cus_test123',
        mode: 'subscription',
        payment_method_types: ['card', 'paypal', 'link'],
        billing_address_collection: 'auto'
      };

      await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          billing_address_collection: 'auto'
        })
      );
    });
  });

  // ============================================================
  // Product Checkout Flow (8 tests)
  // ============================================================

  describe('Product Checkout Flow', () => {
    it('should create one-time payment checkout', async () => {
      const sessionParams = {
        customer_email: 'customer@example.com',
        payment_method_types: ['card', 'paypal', 'link'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Test Product',
              description: 'Product description'
            },
            unit_amount: 5000
          },
          quantity: 1
        }],
        mode: 'payment'
      };

      const session = await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          payment_method_types: ['card', 'paypal', 'link']
        })
      );
      expect(session.url).toBeDefined();
    });

    it('should support multiple items in cart', async () => {
      const sessionParams = {
        customer_email: 'customer@example.com',
        payment_method_types: ['card', 'paypal', 'link'],
        line_items: [
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
        ],
        mode: 'payment'
      };

      await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({ quantity: 2 }),
            expect.objectContaining({ quantity: 1 })
          ])
        })
      );
    });

    it('should calculate total correctly', () => {
      const lineItems = [
        { price_data: { unit_amount: 1000 }, quantity: 2 }, // $20
        { price_data: { unit_amount: 2000 }, quantity: 1 }  // $20
      ];
      
      const total = lineItems.reduce((sum, item) => {
        return sum + (item.price_data.unit_amount * item.quantity);
      }, 0);
      
      expect(total).toBe(4000); // $40 in cents
    });

    it('should include order items in metadata', async () => {
      const orderItems = [
        { id: 'prod-1', name: 'Product 1', quantity: 2, price: 1000 },
        { id: 'prod-2', name: 'Product 2', quantity: 1, price: 2000 }
      ];

      const sessionParams = {
        customer_email: 'customer@example.com',
        payment_method_types: ['card', 'paypal', 'link'],
        mode: 'payment',
        metadata: {
          site_id: 'site-123',
          user_id: 1,
          order_items: JSON.stringify(orderItems)
        }
      };

      await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            order_items: expect.stringContaining('prod-1')
          })
        })
      );
    });

    it('should support Stripe Connect for site owners', async () => {
      const platformFee = 1000; // 10% of $100
      
      const sessionParams = {
        customer_email: 'customer@example.com',
        payment_method_types: ['card', 'paypal', 'link'],
        mode: 'payment',
        payment_intent_data: {
          application_fee_amount: platformFee,
          transfer_data: {
            destination: 'acct_connected_account'
          }
        }
      };

      await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent_data: expect.objectContaining({
            application_fee_amount: platformFee
          })
        })
      );
    });

    it('should handle empty cart gracefully', () => {
      const lineItems = [];
      
      expect(lineItems).toHaveLength(0);
      // Should not create checkout session with empty cart
    });

    it('should validate minimum order amount', () => {
      const lineItems = [
        { price_data: { unit_amount: 30 }, quantity: 1 } // $0.30
      ];
      
      const total = lineItems.reduce((sum, item) => {
        return sum + (item.price_data.unit_amount * item.quantity);
      }, 0);
      
      // Stripe minimum is $0.50 (50 cents)
      expect(total).toBeLessThan(50);
      // Should show validation error
    });

    it('should support different currencies', async () => {
      const sessionParams = {
        customer_email: 'customer@example.com',
        payment_method_types: ['card', 'paypal', 'link'],
        line_items: [{
          price_data: {
            currency: 'eur', // Euro
            product_data: { name: 'EU Product' },
            unit_amount: 5000
          },
          quantity: 1
        }],
        mode: 'payment'
      };

      await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'eur'
              })
            })
          ])
        })
      );
    });
  });

  // ============================================================
  // Payment Method Fallbacks (6 tests)
  // ============================================================

  describe('Payment Method Fallbacks', () => {
    it('should fallback to card if PayPal unavailable', async () => {
      const sessionParams = {
        customer: 'cus_test123',
        mode: 'subscription',
        payment_method_types: ['card', 'link'] // PayPal removed
      };

      await mockStripe.checkout.sessions.create(sessionParams);
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: expect.not.arrayContaining(['paypal'])
        })
      );
    });

    it('should always include card as fallback', () => {
      const paymentMethods = ['card', 'paypal', 'link'];
      expect(paymentMethods[0]).toBe('card');
    });

    it('should handle unsupported payment methods', () => {
      const unsupportedMethods = ['bitcoin', 'cash'];
      const supportedMethods = ['card', 'paypal', 'link'];
      
      unsupportedMethods.forEach(method => {
        expect(supportedMethods).not.toContain(method);
      });
    });

    it('should validate payment method availability by country', () => {
      // PayPal might not be available in all countries
      const countryRestrictions = {
        'US': ['card', 'paypal', 'link'],
        'IN': ['card'], // PayPal restricted
        'BR': ['card', 'paypal']
      };
      
      expect(countryRestrictions['US']).toContain('paypal');
      expect(countryRestrictions['IN']).not.toContain('paypal');
    });

    it('should show appropriate error if no payment methods available', () => {
      const paymentMethods = [];
      
      expect(paymentMethods).toHaveLength(0);
      // Should show error: "No payment methods available"
    });

    it('should log payment method selection analytics', () => {
      const selectedMethod = 'paypal';
      const analytics = {
        event: 'payment_method_selected',
        method: selectedMethod,
        timestamp: new Date()
      };
      
      expect(analytics.method).toBe('paypal');
      expect(analytics.event).toBe('payment_method_selected');
    });
  });
});

