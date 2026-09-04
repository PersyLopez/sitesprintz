/**
 * PaymentServiceFactory Tests
 * 
 * Tests for factory pattern that creates appropriate payment processor instances.
 * Following TDD: Tests written BEFORE implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted() to properly handle mock hoisting
const { mockPrisma, mockDecrypt } = vi.hoisted(() => ({
  mockPrisma: {
    payment_processor_credentials: {
      findFirst: vi.fn()
    },
    sites: {
      findFirst: vi.fn()
    }
  },
  mockDecrypt: vi.fn((text) => text?.replace('encrypted_', '') || '')
}));

// Mock modules with hoisted mocks
vi.mock('../../../database/db.js', () => ({
  prisma: mockPrisma
}));

vi.mock('../../../server/utils/encryption.js', () => ({
  decrypt: mockDecrypt
}));

// Same square SDK stub as SquareProcessor.test.js — Client needs Environment.Sandbox
vi.mock('square', () => ({
  Client: class MockClient {
    constructor() {
      return {};
    }
  },
  Environment: {
    Production: 'production',
    Sandbox: 'sandbox'
  }
}));

import { PaymentServiceFactory } from '../../../server/services/payments/PaymentServiceFactory.js';

describe('PaymentServiceFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProcessor()', () => {
    it('should return StripeProcessor for Stripe site', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue({
        id: 'site_123',
        payment_processor: 'stripe',
        stripe_account_id: 'acct_123'
      });

      mockPrisma.payment_processor_credentials.findFirst.mockResolvedValue(null);

      const processor = await PaymentServiceFactory.getProcessor('site_123');

      expect(processor).toBeDefined();
      expect(processor.getProcessorName()).toBe('stripe');
    });

    it('should return SquareProcessor for Square site', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue({
        id: 'site_123',
        payment_processor: 'square'
      });

      mockPrisma.payment_processor_credentials.findFirst.mockResolvedValue({
        processor: 'square',
        access_token_encrypted: 'encrypted_token',
        metadata: { location_ids: [{ id: 'loc_123' }] }
      });

      const processor = await PaymentServiceFactory.getProcessor('site_123');

      expect(processor).toBeDefined();
      expect(processor.getProcessorName()).toBe('square');
      expect(mockDecrypt).toHaveBeenCalledWith('encrypted_token');
    });

    it('should return PayPalProcessor for PayPal site', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue({
        id: 'site_123',
        payment_processor: 'paypal'
      });

      mockPrisma.payment_processor_credentials.findFirst.mockResolvedValue({
        processor: 'paypal',
        access_token_encrypted: 'encrypted_client_id',
        refresh_token_encrypted: 'encrypted_client_secret'
      });

      const processor = await PaymentServiceFactory.getProcessor('site_123');

      expect(processor).toBeDefined();
      expect(processor.getProcessorName()).toBe('paypal');
    });

    it('should default to Stripe if no processor configured', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue({
        id: 'site_123',
        payment_processor: null,
        stripe_account_id: 'acct_123'
      });

      const processor = await PaymentServiceFactory.getProcessor('site_123');

      expect(processor.getProcessorName()).toBe('stripe');
    });

    it('should throw error if site not found', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue(null);

      await expect(PaymentServiceFactory.getProcessor('nonexistent'))
        .rejects.toThrow('Site not found');
    });

    it('should throw error if processor configured but no credentials', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue({
        id: 'site_123',
        payment_processor: 'square'
      });

      mockPrisma.payment_processor_credentials.findFirst.mockResolvedValue(null);

      await expect(PaymentServiceFactory.getProcessor('site_123'))
        .rejects.toThrow('Square not configured for this site');
    });

    it('should decrypt credentials before passing to processor', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue({
        id: 'site_123',
        payment_processor: 'square'
      });

      mockPrisma.payment_processor_credentials.findFirst.mockResolvedValue({
        processor: 'square',
        access_token_encrypted: 'encrypted_sq0atp-xxx',
        metadata: { location_ids: [{ id: 'loc_123' }] }
      });

      await PaymentServiceFactory.getProcessor('site_123');

      expect(mockDecrypt).toHaveBeenCalledWith('encrypted_sq0atp-xxx');
    });

    it('should use first location ID for Square', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue({
        id: 'site_123',
        payment_processor: 'square'
      });

      mockPrisma.payment_processor_credentials.findFirst.mockResolvedValue({
        processor: 'square',
        access_token_encrypted: 'encrypted_token',
        metadata: { 
          location_ids: [
            { id: 'loc_123', name: 'Main' },
            { id: 'loc_456', name: 'Second' }
          ] 
        }
      });

      const processor = await PaymentServiceFactory.getProcessor('site_123');

      // Should use first location
      expect(processor.locationId).toBe('loc_123');
    });

    it('should use metadata.location_id as the Square default', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue({
        id: 'site_123',
        payment_processor: 'square'
      });

      mockPrisma.payment_processor_credentials.findFirst.mockResolvedValue({
        processor: 'square',
        access_token_encrypted: 'encrypted_token',
        metadata: {
          location_id: 'loc_default',
          location_ids: [
            { id: 'loc_123', name: 'Main' },
            { id: 'loc_456', name: 'Second' }
          ]
        }
      });

      const processor = await PaymentServiceFactory.getProcessor('site_123');

      expect(processor.locationId).toBe('loc_default');
    });
  });

  describe('createCheckoutForSite()', () => {
    it('should create checkout using site default processor', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue({
        id: 'site_123',
        payment_processor: 'stripe',
        stripe_account_id: 'acct_123'
      });

      const mockCreateCheckout = vi.fn().mockResolvedValue({
        sessionId: 'cs_123',
        checkoutUrl: 'https://checkout.stripe.com/cs_123'
      });

      vi.spyOn(PaymentServiceFactory, 'getProcessor').mockResolvedValue({
        getProcessorName: () => 'stripe',
        createCheckout: mockCreateCheckout
      });

      const result = await PaymentServiceFactory.createCheckoutForSite('site_123', {
        items: [{ name: 'Test', price: 10, quantity: 1 }],
        totalCents: 1000,
        currency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });

      expect(result.sessionId).toBe('cs_123');
      expect(mockCreateCheckout).toHaveBeenCalled();
    });

    it('should allow processor override', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue({
        id: 'site_123',
        payment_processor: 'stripe'
      });

      mockPrisma.payment_processor_credentials.findFirst.mockResolvedValue({
        processor: 'square',
        access_token_encrypted: 'encrypted_token',
        metadata: { location_ids: [{ id: 'loc_123' }] }
      });

      const mockCreateCheckout = vi.fn().mockResolvedValue({
        sessionId: 'link_123',
        checkoutUrl: 'https://square.site/link_123'
      });

      vi.spyOn(PaymentServiceFactory, 'getProcessor').mockResolvedValue({
        getProcessorName: () => 'square',
        createCheckout: mockCreateCheckout
      });

      const result = await PaymentServiceFactory.createCheckoutForSite(
        'site_123',
        { items: [], totalCents: 1000, successUrl: '', cancelUrl: '' },
        'square' // Override processor
      );

      expect(result.checkoutUrl).toContain('square');
    });
  });

  describe('getSupportedProcessors()', () => {
    it('should return list of supported processors', () => {
      const processors = PaymentServiceFactory.getSupportedProcessors();

      expect(processors).toContain('stripe');
      expect(processors).toContain('square');
      expect(processors).toContain('paypal');
      expect(processors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('isProcessorConnected()', () => {
    it('should return true if processor has credentials', async () => {
      mockPrisma.payment_processor_credentials.findFirst.mockResolvedValue({
        processor: 'square',
        access_token_encrypted: 'encrypted_token',
        connected_at: new Date(),
        disconnected_at: null
      });

      const connected = await PaymentServiceFactory.isProcessorConnected('site_123', 'square');

      expect(connected).toBe(true);
    });

    it('should return false if no credentials found', async () => {
      mockPrisma.payment_processor_credentials.findFirst.mockResolvedValue(null);

      const connected = await PaymentServiceFactory.isProcessorConnected('site_123', 'square');

      expect(connected).toBe(false);
    });

    it('should return false if disconnected', async () => {
      mockPrisma.payment_processor_credentials.findFirst.mockResolvedValue({
        processor: 'square',
        access_token_encrypted: 'encrypted_token',
        connected_at: new Date('2025-01-01'),
        disconnected_at: new Date('2025-01-02')
      });

      const connected = await PaymentServiceFactory.isProcessorConnected('site_123', 'square');

      expect(connected).toBe(false);
    });

    it('should handle Stripe specially (check stripe_account_id)', async () => {
      mockPrisma.sites.findFirst.mockResolvedValue({
        id: 'site_123',
        stripe_account_id: 'acct_123'
      });

      const connected = await PaymentServiceFactory.isProcessorConnected('site_123', 'stripe');

      expect(connected).toBe(true);
    });
  });
});
