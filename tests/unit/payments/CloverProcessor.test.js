import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { CloverProcessor } from '../../../server/services/payments/CloverProcessor.js';

vi.mock('../../../server/services/payments/cloverCheckoutContext.js', () => ({
  saveCloverCheckoutContext: vi.fn(async () => {}),
}));

describe('CloverProcessor', () => {
  let fetchImpl;

  beforeEach(() => {
    fetchImpl = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('maps cart lines to cents and returns the hosted checkout URL', async () => {
    fetchImpl.mockResolvedValue({
      ok: true,
      json: async () => ({
        href: 'https://checkout.clover.com/pay/session-1',
        checkoutSessionId: 'session-1',
      }),
    });
    const processor = new CloverProcessor('token', 'MID123', fetchImpl);

    const result = await processor.createCheckout({
      items: [{ name: 'Mug', price: 12.5, quantity: 2, description: 'Blue' }],
      totalCents: 2500,
      successUrl: 'https://example.com/success?order=success',
      cancelUrl: 'https://example.com/cancel',
      metadata: { site_id: 'site-1', type: 'order' },
      customerEmail: 'buyer@example.com',
    });

    expect(result).toEqual({
      sessionId: 'session-1',
      checkoutUrl: 'https://checkout.clover.com/pay/session-1',
    });
    const [, request] = fetchImpl.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body.shoppingCart.lineItems[0]).toEqual({
      name: 'Mug',
      price: 1250,
      unitQty: 2,
      note: 'Blue',
    });
    expect(body.customer).toEqual({ email: 'buyer@example.com' });
    expect(body.redirectUrls.success).toContain('clover_session={CHECKOUT_SESSION_ID}');
    expect(request.headers.authorization).toBe('Bearer token');
    expect(request.headers['X-Clover-Merchant-Id']).toBe('MID123');
  });

  it('rejects amounts under 50 cents', async () => {
    const processor = new CloverProcessor('token', 'MID123', fetchImpl);
    await expect(processor.createCheckout({
      items: [{ name: 'Tiny', price: 0.1, quantity: 1 }],
      totalCents: 10,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    })).rejects.toThrow(/minimum 50 cents/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a cart whose line totals do not match totalCents', async () => {
    const processor = new CloverProcessor('token', 'MID123', fetchImpl);
    await expect(processor.createCheckout({
      items: [{ name: 'Mug', price: 12.5, quantity: 1 }],
      totalCents: 1000,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    })).rejects.toThrow(/do not match total/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('accepts a fresh Clover-Signature and rejects a stale or bad one', () => {
    const processor = new CloverProcessor('token', 'MID123', fetchImpl);
    const secret = 'signing-secret';
    const payload = '{"status":"APPROVED"}';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const v1 = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
    expect(processor.verifyWebhookSignature(payload, `t=${timestamp},v1=${v1}`, secret)).toBe(true);
    expect(processor.verifyWebhookSignature(payload, `t=${timestamp},v1=${'0'.repeat(v1.length)}`, secret)).toBe(false);
    expect(processor.verifyWebhookSignature(payload, `t=1642599079,v1=${v1}`, secret)).toBe(false);
  });

  it('does not treat a checkout id or a loose paid flag as a captured payment', async () => {
    fetchImpl.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'session-1', paid: true }),
    });
    const processor = new CloverProcessor('token', 'MID123', fetchImpl);
    const status = await processor.getTransactionStatus('session-1');
    expect(status.status).toBe('unpaid');
    expect(status.amount).toBeNull();
    expect(status.metadata.paymentId).toBeNull();
  });
});
