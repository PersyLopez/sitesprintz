import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookProcessor } from '../../server/services/webhookProcessor.js';

vi.mock('../../server/services/labor/laborFulfillment.js', () => ({
  fulfillLaborSession: vi.fn().mockResolvedValue({
    action: 'labor_fulfilled',
    sku: 'brand_match',
    sessionId: 'cs_labor',
  }),
}));

vi.mock('../../server/services/payments/fulfillPlatformSubscription.js', () => ({
  fulfillPlatformSubscription: vi.fn(),
  resolveUserForSession: vi.fn(),
  resolvePlanFromSubscription: vi.fn(),
}));

import { fulfillLaborSession } from '../../server/services/labor/laborFulfillment.js';
import { fulfillPlatformSubscription } from '../../server/services/payments/fulfillPlatformSubscription.js';

describe('WebhookProcessor labor extras', () => {
  let processor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new WebhookProcessor({}, { sendEmail: vi.fn() }, null, null);
  });

  it('fulfills labor extras without granting a hosting plan', async () => {
    const result = await processor.handleCheckoutCompleted({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_labor',
          mode: 'payment',
          metadata: {
            source: 'labor_extra',
            type: 'brand_match',
            userId: 'user-1',
          },
        },
      },
    });

    expect(result.action).toBe('labor_fulfilled');
    expect(fulfillLaborSession).toHaveBeenCalled();
    expect(fulfillPlatformSubscription).not.toHaveBeenCalled();
  });

  it('does not treat managed care as a platform plan on invoice.paid', async () => {
    processor.stripe = {
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'sub_care',
          metadata: { source: 'labor_extra', type: 'managed_care' },
        }),
      },
    };

    const result = await processor.handleInvoicePaid({
      type: 'invoice.paid',
      data: {
        object: {
          subscription: 'sub_care',
          customer: 'cus_1',
        },
      },
    });

    expect(result.action).toBe('labor_invoice_ignored');
    expect(fulfillPlatformSubscription).not.toHaveBeenCalled();
  });
});
