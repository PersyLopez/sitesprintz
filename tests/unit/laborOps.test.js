import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtemp } from 'fs/promises';
import os from 'os';
import path from 'path';
import { createLaborLedger } from '../../server/services/labor/laborLedger.js';
import { fulfillLaborSession } from '../../server/services/labor/laborFulfillment.js';
import { redactLaborSecrets } from '../../server/services/labor/laborSecrets.js';
import {
  classifyLaborRequest,
  remainingCareBatches,
  declineDripCopy,
} from '../../server/services/labor/managedCareOps.js';

describe('labor secrets', () => {
  it('redacts claim paths and JWTs', () => {
    const token = 'ab'.repeat(32);
    const text = `See /claim/${token} and Bearer abc.def.ghi`;
    const redacted = redactLaborSecrets(text);
    expect(redacted).not.toContain(token);
    expect(redacted).toContain('/claim/[redacted]');
    expect(redacted).toContain('Bearer [redacted]');
  });
});

describe('managed care ops', () => {
  it('treats a whole list as one batch', () => {
    const result = classifyLaborRequest('Here is the menu\n- soup\n- sandwich\n- salad\nprices included');
    expect(result.kind).toBe('batch');
    expect(result.accept).toBe(true);
  });

  it('declines drips', () => {
    const result = classifyLaborRequest('just this one typo on the sandwich');
    expect(result.kind).toBe('drip');
    expect(result.accept).toBe(false);
    expect(declineDripCopy()).toMatch(/full menu/i);
  });

  it('counts two batches per month', () => {
    expect(remainingCareBatches([
      { sku: 'managed_care' },
      { kind: 'batch' },
    ])).toBe(0);
    expect(remainingCareBatches([{ sku: 'managed_care' }])).toBe(1);
  });
});

describe('labor ledger and fulfillment', () => {
  let ledger;

  beforeEach(async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'labor-ledger-'));
    ledger = createLaborLedger(path.join(dir, 'ledger.jsonl'));
  });

  it('is idempotent on session id', async () => {
    const session = {
      id: 'cs_labor_1',
      mode: 'payment',
      payment_status: 'paid',
      metadata: {
        source: 'labor_extra',
        type: 'brand_match',
        userId: 'user-1',
        siteId: 'site-1',
      },
      customer_details: { email: 'owner@example.com' },
    };
    const emailService = { sendEmail: vi.fn().mockResolvedValue({ success: true }) };

    const first = await fulfillLaborSession(session, { ledger, emailService, opsEmail: 'ops@example.com' });
    const second = await fulfillLaborSession(session, { ledger, emailService, opsEmail: 'ops@example.com' });

    expect(first.action).toBe('labor_fulfilled');
    expect(second.action).toBe('labor_duplicate');
    expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
    const customerCall = emailService.sendEmail.mock.calls.find(
      ([opts]) => opts.template === 'laborPurchaseCustomer'
    );
    expect(JSON.stringify(customerCall[0])).not.toMatch(/claim\//);
  });

  it('does not change hosting plan fields', async () => {
    const session = {
      id: 'cs_labor_2',
      mode: 'subscription',
      metadata: {
        source: 'labor_extra',
        type: 'managed_care',
        userId: 'user-1',
      },
    };
    const result = await fulfillLaborSession(session, { ledger, emailService: null });
    expect(result.sku).toBe('managed_care');
    expect(result).not.toHaveProperty('plan');
  });
});
