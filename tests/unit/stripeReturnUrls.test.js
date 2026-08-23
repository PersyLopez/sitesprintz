import { describe, it, expect, afterEach } from 'vitest';
import {
  resolveStripeRedirectUrl,
  subscriptionCheckoutUrls,
} from '../../server/utils/stripeReturnUrls.js';

describe('stripeReturnUrls', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env.CLIENT_URL = prev.CLIENT_URL;
    process.env.FRONTEND_URL = prev.FRONTEND_URL;
    process.env.SITE_URL = prev.SITE_URL;
    process.env.CORS_ORIGINS = prev.CORS_ORIGINS;
  });

  it('uses the frontend origin and React payment-success path for plan checkout', () => {
    process.env.CLIENT_URL = 'http://localhost:5173';
    const urls = subscriptionCheckoutUrls({ headers: {} }, { plan: 'starter' });
    expect(urls.successUrl).toBe(
      'http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=starter'
    );
    expect(urls.cancelUrl).toBe('http://localhost:5173/payment-cancel?plan=starter');
  });

  it('sends editor checkout cancel back to setup when a draft is in play', () => {
    process.env.CLIENT_URL = 'http://localhost:5173';
    const urls = subscriptionCheckoutUrls({ headers: {} }, { plan: 'growth', draftId: 'draft-1' });
    expect(urls.successUrl).toContain('draftId=draft-1');
    expect(urls.cancelUrl).toBe('http://localhost:5173/setup');
  });

  it('keeps a same-origin return URL from the page that opened the portal', () => {
    process.env.CLIENT_URL = 'http://localhost:5173';
    const url = resolveStripeRedirectUrl(
      { headers: { origin: 'http://localhost:5173' } },
      'http://localhost:5173/settings/billing',
      '/dashboard'
    );
    expect(url).toBe('http://localhost:5173/settings/billing');
  });

  it('rejects an off-origin redirect and uses the action fallback', () => {
    process.env.CLIENT_URL = 'http://localhost:5173';
    const url = resolveStripeRedirectUrl(
      { headers: {} },
      'https://evil.example/phish',
      '/settings/billing'
    );
    expect(url).toBe('http://localhost:5173/settings/billing');
  });
});
