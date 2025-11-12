import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadStripe,
  initializeStripe,
  createCheckoutSession,
  redirectToCheckout,
  processCheckout,
  formatAmountForStripe,
  formatAmountFromStripe
} from '../../src/utils/stripe';

// Mock window and document
global.window = {
  Stripe: null,
  location: {
    origin: 'https://example.com'
  }
};

global.document = {
  head: {
    appendChild: vi.fn()
  },
  createElement: vi.fn(() => ({
    src: '',
    onload: null,
    onerror: null
  }))
};

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(() => 'test-token')
};

// Mock console
global.console = {
  ...console,
  error: vi.fn()
};

describe('Stripe Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.window.Stripe = null;
  });

  // Load Stripe (3 tests)
  describe('loadStripe', () => {
    it('should return existing Stripe if already loaded', async () => {
      const mockStripe = vi.fn();
      global.window.Stripe = mockStripe;

      const result = await loadStripe();

      expect(result).toBe(mockStripe);
      expect(document.createElement).not.toHaveBeenCalled();
    });

    it('should load Stripe script if not loaded', async () => {
      const mockScript = {
        src: '',
        onload: null,
        onerror: null
      };
      document.createElement.mockReturnValueOnce(mockScript);

      const loadPromise = loadStripe();
      
      // Simulate script load
      global.window.Stripe = vi.fn();
      mockScript.onload();

      const result = await loadPromise;

      expect(document.createElement).toHaveBeenCalledWith('script');
      expect(mockScript.src).toBe('https://js.stripe.com/v3/');
      expect(result).toBe(global.window.Stripe);
    });

    it('should handle script load error', async () => {
      const mockScript = {
        src: '',
        onload: null,
        onerror: null
      };
      document.createElement.mockReturnValueOnce(mockScript);

      const loadPromise = loadStripe();
      
      // Simulate script error
      mockScript.onerror();

      await expect(loadPromise).rejects.toThrow('Failed to load Stripe.js');
    });
  });

  // Initialize Stripe (2 tests)
  describe('initializeStripe', () => {
    it('should initialize Stripe with publishable key', async () => {
      const mockStripeInstance = { _key: 'pk_test_123' };
      const mockStripe = vi.fn(() => mockStripeInstance);
      global.window.Stripe = mockStripe;

      const result = await initializeStripe('pk_test_123');

      expect(mockStripe).toHaveBeenCalledWith('pk_test_123');
      expect(result).toBe(mockStripeInstance);
    });

    it('should handle initialization error', async () => {
      const mockScript = {
        src: '',
        onload: null,
        onerror: null
      };
      document.createElement.mockReturnValueOnce(mockScript);

      const initPromise = initializeStripe('pk_test_123');
      
      mockScript.onerror();

      await expect(initPromise).rejects.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  // Create Checkout Session (4 tests)
  describe('createCheckoutSession', () => {
    it('should create checkout session', async () => {
      const mockSession = {
        id: 'session_123',
        url: 'https://checkout.stripe.com'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession
      });

      const items = [{ id: 'prod_1', quantity: 2 }];
      const result = await createCheckoutSession(items, 'site_456');

      expect(fetch).toHaveBeenCalledWith(
        '/api/checkout/create-session',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }),
          body: expect.stringContaining('site_456')
        })
      );
      expect(result.id).toBe('session_123');
    });

    it('should include success and cancel URLs', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'session_123' })
      });

      await createCheckoutSession([], 'site_1');

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.successUrl).toContain('/checkout/success');
      expect(callBody.cancelUrl).toContain('/checkout/cancel');
    });

    it('should handle session creation error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid items' })
      });

      await expect(createCheckoutSession([], 'site_1')).rejects.toThrow('Invalid items');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network failed'));

      await expect(createCheckoutSession([], 'site_1')).rejects.toThrow('Network failed');
    });
  });

  // Redirect to Checkout (2 tests)
  describe('redirectToCheckout', () => {
    it('should redirect to Stripe checkout', async () => {
      const mockStripe = {
        redirectToCheckout: vi.fn().mockResolvedValue({})
      };

      await redirectToCheckout(mockStripe, 'session_789');

      expect(mockStripe.redirectToCheckout).toHaveBeenCalledWith({
        sessionId: 'session_789'
      });
    });

    it('should handle redirect errors', async () => {
      const mockStripe = {
        redirectToCheckout: vi.fn().mockResolvedValue({
          error: { message: 'Redirect failed' }
        })
      };

      await expect(redirectToCheckout(mockStripe, 'session_bad')).rejects.toThrow('Redirect failed');
    });
  });

  // Process Checkout (2 tests)
  describe('processCheckout', () => {
    it('should complete full checkout flow', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'session_complete' })
      });

      const mockStripe = {
        redirectToCheckout: vi.fn().mockResolvedValue({})
      };

      await processCheckout(mockStripe, [{ id: 'prod_1' }], 'site_1');

      expect(fetch).toHaveBeenCalled();
      expect(mockStripe.redirectToCheckout).toHaveBeenCalledWith({
        sessionId: 'session_complete'
      });
    });

    it('should handle checkout flow errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Checkout failed'));

      const mockStripe = {
        redirectToCheckout: vi.fn()
      };

      await expect(processCheckout(mockStripe, [], 'site_1')).rejects.toThrow('Checkout failed');
      expect(console.error).toHaveBeenCalled();
    });
  });

  // Format Amounts (4 tests)
  describe('Amount Formatting', () => {
    it('should format amount for Stripe (dollars to cents)', () => {
      expect(formatAmountForStripe(10.99)).toBe(1099);
      expect(formatAmountForStripe(100)).toBe(10000);
      expect(formatAmountForStripe(0.50)).toBe(50);
    });

    it('should handle decimal precision', () => {
      expect(formatAmountForStripe(10.999)).toBe(1100);
      expect(formatAmountForStripe(10.001)).toBe(1000);
    });

    it('should format amount from Stripe (cents to dollars)', () => {
      expect(formatAmountFromStripe(1099)).toBe(10.99);
      expect(formatAmountFromStripe(10000)).toBe(100);
      expect(formatAmountFromStripe(50)).toBe(0.50);
    });

    it('should handle zero amounts', () => {
      expect(formatAmountForStripe(0)).toBe(0);
      expect(formatAmountFromStripe(0)).toBe(0);
    });
  });
});

