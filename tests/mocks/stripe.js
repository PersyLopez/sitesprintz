// Mock for Stripe SDK
import { vi } from 'vitest';

export const mockStripeCustomer = {
  id: 'cus_mock123',
  email: 'test@example.com',
  created: Date.now() / 1000,
};

export const mockStripeSubscription = {
  id: 'sub_mock123',
  customer: 'cus_mock123',
  status: 'active',
  current_period_end: (Date.now() / 1000) + (30 * 24 * 60 * 60),
  items: {
    data: [
      {
        id: 'si_mock123',
        price: {
          id: 'price_mock123',
          product: 'prod_mock123',
          unit_amount: 2900,
          currency: 'usd',
        },
      },
    ],
  },
};

export const mockCheckoutSession = {
  id: 'cs_mock123',
  url: 'https://checkout.stripe.com/pay/cs_mock123',
  payment_status: 'unpaid',
  status: 'open',
  customer_email: null,
  amount_total: 2900,
};

// Mock Stripe class
export class MockStripe {
  constructor(apiKey, config) {
    this.apiKey = apiKey;
    this.config = config;
  }

  customers = {
    create: vi.fn().mockResolvedValue(mockStripeCustomer),
    retrieve: vi.fn().mockResolvedValue(mockStripeCustomer),
    update: vi.fn().mockResolvedValue(mockStripeCustomer),
    del: vi.fn().mockResolvedValue({ id: 'cus_mock123', deleted: true }),
  };

  subscriptions = {
    create: vi.fn().mockResolvedValue(mockStripeSubscription),
    retrieve: vi.fn().mockResolvedValue(mockStripeSubscription),
    update: vi.fn().mockResolvedValue(mockStripeSubscription),
    cancel: vi.fn().mockResolvedValue({ ...mockStripeSubscription, status: 'canceled' }),
    list: vi.fn().mockResolvedValue({
      data: [mockStripeSubscription],
      has_more: false,
    }),
  };

  checkout = {
    sessions: {
      create: vi.fn().mockResolvedValue(mockCheckoutSession),
      retrieve: vi.fn().mockResolvedValue(mockCheckoutSession),
      list: vi.fn().mockResolvedValue({
        data: [mockCheckoutSession],
        has_more: false,
      }),
    },
  };

  prices = {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'price_starter',
          product: 'prod_starter',
          unit_amount: 2900,
          currency: 'usd',
        },
        {
          id: 'price_pro',
          product: 'prod_pro',
          unit_amount: 9900,
          currency: 'usd',
        },
      ],
      has_more: false,
    }),
  };

  webhooks = {
    constructEvent: vi.fn((payload, signature, secret) => {
      return {
        id: 'evt_mock123',
        type: 'checkout.session.completed',
        data: {
          object: mockCheckoutSession,
        },
      };
    }),
  };
}

// Default export as Stripe constructor
export default MockStripe;

