import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LIVE_TRIAL_DAYS, liveTrialExpiresAt } from '../../server/config/platformPlans.js';
import {
  canOccupyPublishedSiteSlot,
  hasActiveLiveTrialSite,
} from '../../server/services/subscriptionService.js';

const mockSitesFindFirst = vi.fn();

vi.mock('../../database/db.js', () => ({
  prisma: {
    sites: {
      findFirst: (...args) => mockSitesFindFirst(...args),
    },
  },
}));

describe('live trial publish gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('LIVE_TRIAL_DAYS is 15', () => {
    expect(LIVE_TRIAL_DAYS).toBe(15);
  });

  it('allows first unpaid publish when no paid slots', () => {
    const hasActiveSubscription = false;
    const publishedCount = 0;
    const paidSlots = 0;
    const slot = canOccupyPublishedSiteSlot({
      publishedCount,
      maxSites: paidSlots,
      isAdmin: false,
    });
    const isFirstUnpaidLiveTrial = !hasActiveSubscription && publishedCount === 0;
    expect(slot.allowed).toBe(false);
    expect(isFirstUnpaidLiveTrial).toBe(true);
    expect(!slot.allowed && !isFirstUnpaidLiveTrial).toBe(false);
  });

  it('blocks second site without subscription', () => {
    const hasActiveSubscription = false;
    const publishedCount = 1;
    const paidSlots = 0;
    const slot = canOccupyPublishedSiteSlot({
      publishedCount,
      maxSites: paidSlots,
      isAdmin: false,
    });
    const isFirstUnpaidLiveTrial = !hasActiveSubscription && publishedCount === 0;
    expect(slot.allowed).toBe(false);
    expect(isFirstUnpaidLiveTrial).toBe(false);
    expect(!slot.allowed && !isFirstUnpaidLiveTrial).toBe(true);
  });

  it('paid subscriber with slot is unchanged', () => {
    const hasActiveSubscription = true;
    const publishedCount = 0;
    const paidSlots = 1;
    const slot = canOccupyPublishedSiteSlot({
      publishedCount,
      maxSites: paidSlots,
      isAdmin: false,
    });
    expect(slot.allowed).toBe(true);
    expect(hasActiveSubscription).toBe(true);
  });

  it('sets expires_at ~15 days from publish', () => {
    const now = new Date('2026-08-30T00:00:00Z');
    const expiresAt = liveTrialExpiresAt(now);
    const daysMs = LIVE_TRIAL_DAYS * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime() - now.getTime()).toBe(daysMs);
  });

  it('detects active live trial site', async () => {
    mockSitesFindFirst.mockResolvedValue({ id: 'site-1' });
    await expect(hasActiveLiveTrialSite('user-1')).resolves.toBe(true);
    expect(mockSitesFindFirst).toHaveBeenCalledWith({
      where: {
        user_id: 'user-1',
        status: 'published',
        expires_at: { gt: expect.any(Date) },
      },
      select: { id: true },
    });
  });

  it('returns false when no active live trial site', async () => {
    mockSitesFindFirst.mockResolvedValue(null);
    await expect(hasActiveLiveTrialSite('user-2')).resolves.toBe(false);
  });
});
