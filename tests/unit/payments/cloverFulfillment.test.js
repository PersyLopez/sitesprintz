import { describe, it, expect, beforeEach } from 'vitest';
import { WebhookProcessor } from '../../../server/services/webhookProcessor.js';
import {
  saveCloverCheckoutContext,
  claimCloverFulfillment,
  releaseCloverFulfillment,
} from '../../../server/services/payments/cloverCheckoutContext.js';

describe('Clover fulfillment idempotency', () => {
  const sessionId = 'clover-session-idem-1';

  beforeEach(async () => {
    await releaseCloverFulfillment(sessionId);
  });

  it('claims a session once', async () => {
    expect(await claimCloverFulfillment(sessionId)).toBe(true);
    expect(await claimCloverFulfillment(sessionId)).toBe(false);
    await releaseCloverFulfillment(sessionId);
    expect(await claimCloverFulfillment(sessionId)).toBe(true);
  });

  it('ignores an approved webhook whose amount does not match the stored cart', async () => {
    await saveCloverCheckoutContext(sessionId, {
      type: 'order',
      siteId: 'site-1',
      merchantId: 'MID123',
      amountCents: 2500,
      currency: 'usd',
      metadata: { site_id: 'site-1', type: 'order', order_items: '[]' },
    });

    const created = [];
    const db = {
      orders: {
        findFirst: async () => null,
        create: async (args) => {
          created.push(args);
          return { id: 'order-1' };
        },
      },
      appointments: { findFirst: async () => null },
    };
    const processor = new WebhookProcessor(db, null, null);
    const result = await processor.processCloverPaymentEvent({
      status: 'APPROVED',
      type: 'PAYMENT',
      id: 'pay-1',
      data: sessionId,
      merchantId: 'MID123',
      amount: 100,
    });

    expect(result).toMatchObject({ action: 'ignored', reason: 'amount_mismatch' });
    expect(created).toHaveLength(0);
  });

  it('ignores a webhook for a different Clover merchant', async () => {
    await saveCloverCheckoutContext(sessionId, {
      type: 'order',
      siteId: 'site-1',
      merchantId: 'MID123',
      amountCents: 2500,
      currency: 'usd',
      metadata: { site_id: 'site-1', type: 'order', order_items: '[]' },
    });
    const processor = new WebhookProcessor({
      orders: { findFirst: async () => null },
      appointments: { findFirst: async () => null },
    }, null, null);

    const result = await processor.processCloverPaymentEvent({
      status: 'APPROVED',
      type: 'PAYMENT',
      id: 'pay-1',
      data: sessionId,
      merchantId: 'OTHER',
      amount: 2500,
    });

    expect(result).toMatchObject({ action: 'ignored', reason: 'merchant_mismatch' });
  });
});
