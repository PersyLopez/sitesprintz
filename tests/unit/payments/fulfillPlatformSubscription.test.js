import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizePlatformPlan,
  fulfillPlatformSubscription,
  resolveUserForSession,
} from '../../../server/services/payments/fulfillPlatformSubscription.js';

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

    const session = {
      metadata: { userId: 'user-1', plan: 'starter' },
      customer: 'cus_1',
      subscription: 'sub_1',
    };

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

  it('falls back to email when userId is missing', async () => {
    mockDb.users.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'b@example.com',
      plan: null,
      subscription_status: null,
      stripe_subscription_id: null,
    });
    mockDb.users.update.mockResolvedValue({});

    const session = {
      metadata: { user_email: 'b@example.com', plan: 'growth' },
      customer: 'cus_2',
      subscription: 'sub_2',
    };

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
      { metadata: { userId: 'user-3', plan: 'pro' }, subscription: 'sub_new', customer: 'cus_3' },
      { db: mockDb },
    );
    expect(result.plan).toBe('growth');
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
      { metadata: { userId: 'user-4', plan: 'growth' }, subscription: 'sub_4' },
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
    };
    const { WebhookProcessor } = await import('../../../server/services/webhookProcessor.js');
    processor = new WebhookProcessor(mockDb);
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
});
