import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizePlatformPlan,
  fulfillPlatformSubscription,
  resolveUserForSession,
} from '../../../server/services/payments/fulfillPlatformSubscription.js';

const paidSession = (overrides = {}) => ({
  payment_status: 'paid',
  ...overrides,
});

describe('fulfillPlatformSubscription', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      users: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
  });

  it('fulfills by metadata.userId', async () => {
    const user = {
      id: 'user-1',
      email: 'a@example.com',
      plan: 'trial',
      subscription_status: null,
      stripe_subscription_id: null,
    };
    mockDb.users.findUnique.mockResolvedValue(user);
    mockDb.users.update.mockResolvedValue({ ...user, plan: 'starter' });

    const session = paidSession({
      metadata: { userId: 'user-1', plan: 'starter' },
      customer: 'cus_1',
      subscription: 'sub_1',
    });

    const result = await fulfillPlatformSubscription(session, { db: mockDb });

    expect(result.fulfilled).toBe(true);
    expect(result.plan).toBe('starter');
    expect(mockDb.users.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        plan: 'starter',
        subscription_plan: 'starter',
        subscription_status: 'active',
        stripe_customer_id: 'cus_1',
        stripe_subscription_id: 'sub_1',
      }),
    });
    expect(mockDb.subscriptions).toBeUndefined();
  });

  it('falls back to metadata.user_email when userId is missing', async () => {
    mockDb.users.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'b@example.com',
      plan: null,
      subscription_status: null,
      stripe_subscription_id: null,
    });
    mockDb.users.update.mockResolvedValue({});

    const session = paidSession({
      metadata: { user_email: 'b@example.com', plan: 'growth' },
      customer: 'cus_2',
      subscription: 'sub_2',
    });

    const result = await fulfillPlatformSubscription(session, { db: mockDb });
    expect(result.fulfilled).toBe(true);
    expect(mockDb.users.findUnique).toHaveBeenCalledWith({ where: { email: 'b@example.com' } });
  });

  it('normalizes pro to growth', async () => {
    expect(normalizePlatformPlan('pro')).toBe('growth');
    expect(normalizePlatformPlan('premium')).toBe('growth');

    mockDb.users.findUnique.mockResolvedValue({
      id: 'user-3',
      email: 'c@example.com',
      plan: 'starter',
      subscription_status: 'active',
      stripe_subscription_id: 'sub_old',
    });
    mockDb.users.update.mockResolvedValue({});

    const result = await fulfillPlatformSubscription(
      paidSession({
        metadata: { userId: 'user-3', plan: 'pro' },
        subscription: 'sub_new',
        customer: 'cus_3',
      }),
      { db: mockDb },
    );
    expect(result.plan).toBe('growth');
  });

  it('returns null for unknown or missing plan (never defaults to growth)', () => {
    expect(normalizePlatformPlan('garbage')).toBeNull();
    expect(normalizePlatformPlan(null)).toBeNull();
    expect(normalizePlatformPlan(undefined)).toBeNull();
    expect(normalizePlatformPlan('')).toBeNull();
  });

  it('rejects unknown plan without granting growth', async () => {
    mockDb.users.findUnique.mockResolvedValue({
      id: 'user-bad',
      email: 'bad@example.com',
      plan: 'trial',
      subscription_status: null,
      stripe_subscription_id: null,
    });

    const result = await fulfillPlatformSubscription(
      paidSession({
        metadata: { userId: 'user-bad', plan: 'enterprise' },
        subscription: 'sub_bad',
      }),
      { db: mockDb },
    );

    expect(result).toEqual({ fulfilled: false, reason: 'invalid_plan' });
    expect(mockDb.users.update).not.toHaveBeenCalled();
  });

  it('rejects unpaid or open sessions', async () => {
    mockDb.users.findUnique.mockResolvedValue({
      id: 'user-unpaid',
      email: 'unpaid@example.com',
      plan: null,
      subscription_status: null,
      stripe_subscription_id: null,
    });

    const result = await fulfillPlatformSubscription(
      {
        metadata: { userId: 'user-unpaid', plan: 'starter' },
        subscription: 'sub_unpaid',
        payment_status: 'unpaid',
        status: 'open',
      },
      { db: mockDb },
    );

    expect(result).toEqual({ fulfilled: false, reason: 'not_paid' });
    expect(mockDb.users.update).not.toHaveBeenCalled();
  });

  it('does not treat complete+unpaid as paid', async () => {
    const result = await fulfillPlatformSubscription(
      {
        metadata: { userId: 'user-unpaid', plan: 'starter' },
        subscription: 'sub_async',
        status: 'complete',
        payment_status: 'unpaid',
      },
      { db: mockDb },
    );
    expect(result).toEqual({ fulfilled: false, reason: 'not_paid' });
    expect(mockDb.users.update).not.toHaveBeenCalled();
  });

  it('does not fulfill another user via customer_details billing email', async () => {
    const payer = {
      id: 'payer-1',
      email: 'payer@example.com',
      plan: 'trial',
      subscription_status: null,
      stripe_subscription_id: null,
    };
    mockDb.users.findUnique.mockImplementation(({ where }) => {
      if (where.id === 'payer-1') return Promise.resolve(payer);
      if (where.email === 'victim@example.com') return Promise.resolve({ id: 'victim-1' });
      return Promise.resolve(null);
    });
    mockDb.users.update.mockResolvedValue({});

    const result = await fulfillPlatformSubscription(
      paidSession({
        metadata: { userId: 'payer-1', plan: 'starter' },
        customer_details: { email: 'victim@example.com' },
        subscription: 'sub_steal',
      }),
      { db: mockDb },
    );

    expect(result.fulfilled).toBe(true);
    expect(result.userId).toBe('payer-1');
    expect(mockDb.users.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'payer-1' } }),
    );
  });

  it('does not fulfill via billing email when userId and user_email are missing', async () => {
    mockDb.users.findUnique.mockResolvedValue({
      id: 'victim-1',
      email: 'victim@example.com',
    });

    const result = await fulfillPlatformSubscription(
      paidSession({
        metadata: { plan: 'growth' },
        customer_details: { email: 'victim@example.com' },
        customer_email: 'victim@example.com',
        subscription: 'sub_x',
      }),
      { db: mockDb },
    );

    expect(result).toEqual({ fulfilled: false, reason: 'user_not_found' });
    expect(mockDb.users.findUnique).not.toHaveBeenCalledWith({ where: { email: 'victim@example.com' } });
    expect(mockDb.users.update).not.toHaveBeenCalled();
  });

  it('is idempotent when already active on same subscription', async () => {
    mockDb.users.findUnique.mockResolvedValue({
      id: 'user-4',
      email: 'd@example.com',
      plan: 'growth',
      subscription_status: 'active',
      stripe_subscription_id: 'sub_4',
    });

    const result = await fulfillPlatformSubscription(
      paidSession({
        metadata: { userId: 'user-4', plan: 'growth' },
        subscription: 'sub_4',
      }),
      { db: mockDb },
    );

    expect(result.idempotent).toBe(true);
    expect(mockDb.users.update).not.toHaveBeenCalled();
  });

  it('resolveUserForSession uses client_reference_id', async () => {
    mockDb.users.findUnique.mockResolvedValue({ id: 'user-5', email: 'e@example.com' });
    const user = await resolveUserForSession({ client_reference_id: 'user-5' }, mockDb);
    expect(user.id).toBe('user-5');
  });
});

describe('WebhookProcessor subscription status (users only)', () => {
  let processor;
  let mockDb;

  beforeEach(async () => {
    mockDb = {
      users: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      webhook_events: {
        findUnique: vi.fn(),
      },
    };
    const { WebhookProcessor } = await import('../../../server/services/webhookProcessor.js');
    processor = new WebhookProcessor(mockDb);
    processor.emailService = { sendEmail: vi.fn().mockResolvedValue({}) };
  });

  it('updateSubscriptionStatus updates user by stripe_subscription_id', async () => {
    mockDb.users.findFirst.mockResolvedValue({ id: 'user-sub-1' });
    mockDb.users.update.mockResolvedValue({});

    await processor.updateSubscriptionStatus('sub_abc', 'canceled');

    expect(mockDb.users.findFirst).toHaveBeenCalledWith({
      where: { stripe_subscription_id: 'sub_abc' },
      select: { id: true },
    });
    expect(mockDb.users.update).toHaveBeenCalledWith({
      where: { id: 'user-sub-1' },
      data: expect.objectContaining({ subscription_status: 'canceled' }),
    });
    expect(mockDb.subscriptions).toBeUndefined();
  });

  it('getUserBySubscriptionId returns user row', async () => {
    const user = { id: 'user-sub-2', email: 'sub@example.com', stripe_subscription_id: 'sub_xyz' };
    mockDb.users.findFirst.mockResolvedValue(user);

    const result = await processor.getUserBySubscriptionId('sub_xyz');

    expect(result).toEqual(user);
    expect(mockDb.users.findFirst).toHaveBeenCalledWith({
      where: { stripe_subscription_id: 'sub_xyz' },
    });
  });

  it('handleSubscriptionDeleted clears plan entitlements', async () => {
    mockDb.users.findFirst.mockResolvedValue({
      id: 'user-del',
      email: 'del@example.com',
      plan: 'growth',
      subscription_plan: 'growth',
      stripe_subscription_id: 'sub_del',
    });
    mockDb.users.update.mockResolvedValue({});

    await processor.handleSubscriptionDeleted({
      data: { object: { id: 'sub_del' } },
    });

    expect(mockDb.users.update).toHaveBeenCalledWith({
      where: { id: 'user-del' },
      data: expect.objectContaining({
        subscription_status: 'canceled',
        plan: null,
        subscription_plan: null,
      }),
    });
  });

  it('isEventProcessed throws on DB error (fail closed)', async () => {
    mockDb.webhook_events.findUnique.mockRejectedValue(new Error('db down'));

    await expect(processor.isEventProcessed('evt_1')).rejects.toThrow('db down');
  });
});
