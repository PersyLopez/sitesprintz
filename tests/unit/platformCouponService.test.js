import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeCouponCode,
  validateCouponCreateInput,
  createPlatformCoupon,
  updatePlatformCouponActive,
  recordPlatformCouponRedemption,
} from '../../server/services/platformCouponService.js';

describe('platformCouponService', () => {
  describe('validateCouponCreateInput', () => {
    it('requires exactly one of percent or amount', () => {
      expect(validateCouponCreateInput({ code: 'SAVE10', duration: 'once' }).ok).toBe(false);
      expect(validateCouponCreateInput({
        code: 'SAVE10', percent: 10, amount: 500, duration: 'once',
      }).ok).toBe(false);
      expect(validateCouponCreateInput({ code: 'SAVE10', percent: 10, duration: 'once' }).ok).toBe(true);
      expect(validateCouponCreateInput({ code: 'SAVE10', amount: 500, duration: 'once' }).ok).toBe(true);
    });

    it('accepts maxRedemptions 1 and null unlimited', () => {
      const capped = validateCouponCreateInput({ code: 'ONCE', percent: 5, duration: 'once', maxRedemptions: 1 });
      const unlimited = validateCouponCreateInput({ code: 'MANY', percent: 5, duration: 'once' });
      expect(capped.ok).toBe(true);
      expect(capped.data.maxRedemptions).toBe(1);
      expect(unlimited.ok).toBe(true);
      expect(unlimited.data.maxRedemptions).toBeNull();
    });

    it('requires durationInMonths for repeating duration', () => {
      const missing = validateCouponCreateInput({ code: 'REP', percent: 10, duration: 'repeating' });
      const valid = validateCouponCreateInput({
        code: 'REP',
        percent: 10,
        duration: 'repeating',
        durationInMonths: 3,
      });
      expect(missing.ok).toBe(false);
      expect(valid.ok).toBe(true);
      expect(valid.data.durationInMonths).toBe(3);
    });
  });

  describe('normalizeCouponCode', () => {
    it('normalizes to uppercase and validates pattern', () => {
      expect(normalizeCouponCode(' save-10 ')).toBe('SAVE-10');
      expect(normalizeCouponCode('ab')).toBeNull();
    });

    it('rejects duplicate codes at create time', async () => {
      const prisma = {
        platform_coupons: {
          findUnique: vi.fn().mockResolvedValue({ id: 'existing' }),
        },
      };
      const stripe = { coupons: { create: vi.fn() }, promotionCodes: { create: vi.fn() } };

      await expect(createPlatformCoupon(
        { code: 'DUP', percent: 10, duration: 'once' },
        { stripe, prisma, createdBy: 'admin-1' },
      )).rejects.toMatchObject({ code: 'CODE_EXISTS' });

      expect(stripe.coupons.create).not.toHaveBeenCalled();
    });
  });

  describe('createPlatformCoupon', () => {
    let prisma;
    let stripe;
    let stripeCall;

    beforeEach(() => {
      stripeCall = vi.fn((factory) => factory());
      prisma = {
        platform_coupons: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: 'coupon-1',
            code: 'GROWTH20',
            percent_off: 20,
            amount_off_cents: null,
            duration: 'once',
            duration_in_months: null,
            max_redemptions: null,
            expires_at: null,
            first_time_only: false,
            applies_to_plans: null,
            stripe_coupon_id: 'cou_1',
            stripe_promotion_code_id: 'promo_1',
            active: true,
            times_redeemed: 0,
            created_by: 'admin-1',
            created_at: new Date('2026-08-29T00:00:00.000Z'),
            updated_at: new Date('2026-08-29T00:00:00.000Z'),
          }),
        },
      };
      stripe = {
        coupons: { create: vi.fn().mockResolvedValue({ id: 'cou_1' }) },
        promotionCodes: {
          create: vi.fn().mockResolvedValue({ id: 'promo_1' }),
          update: vi.fn().mockResolvedValue({ id: 'promo_1', active: false }),
        },
      };
    });

    it('throws STRIPE_NOT_CONFIGURED without stripe client', async () => {
      await expect(createPlatformCoupon(
        { code: 'NOSTRIPE', percent: 10, duration: 'once' },
        { stripe: null, prisma, createdBy: 'admin-1' },
      )).rejects.toMatchObject({ code: 'STRIPE_NOT_CONFIGURED' });
    });

    it('creates Stripe coupon then promotion code then persists', async () => {
      const coupon = await createPlatformCoupon(
        { code: 'growth20', percent: 20, duration: 'once', firstTimeOnly: true },
        { stripe, prisma, createdBy: 'admin-1', stripeCall },
      );

      expect(stripe.coupons.create).toHaveBeenCalledWith(expect.objectContaining({
        percent_off: 20,
        duration: 'once',
      }));
      expect(stripe.coupons.create.mock.calls[0][0].currency).toBeUndefined();
      expect(stripe.promotionCodes.create).toHaveBeenCalledWith(expect.objectContaining({
        coupon: 'cou_1',
        code: 'GROWTH20',
        restrictions: { first_time_transaction: true },
      }));
      expect(coupon.code).toBe('GROWTH20');
    });

    it('restricts the promotion code to a Stripe customer when given', async () => {
      await createPlatformCoupon(
        {
          code: 'PLANTSWALK',
          percent: 100,
          duration: 'forever',
          maxRedemptions: 1,
          restrictToCustomerId: 'cus_walk1',
        },
        { stripe, prisma, createdBy: 'admin-1', stripeCall },
      );

      expect(stripe.promotionCodes.create).toHaveBeenCalledWith(expect.objectContaining({
        coupon: 'cou_1',
        code: 'PLANTSWALK',
        max_redemptions: 1,
        customer: 'cus_walk1',
      }));
    });
  });

  describe('updatePlatformCouponActive', () => {
    it('deactivates Stripe promotion code and local active flag', async () => {
      const stripeCall = vi.fn((factory) => factory());
      const stripe = {
        promotionCodes: {
          update: vi.fn().mockResolvedValue({ id: 'promo_1', active: false }),
        },
      };
      const prisma = {
        platform_coupons: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'coupon-1',
            stripe_promotion_code_id: 'promo_1',
          }),
          update: vi.fn().mockResolvedValue({
            id: 'coupon-1',
            code: 'OFF',
            percent_off: 10,
            amount_off_cents: null,
            duration: 'once',
            duration_in_months: null,
            max_redemptions: null,
            expires_at: null,
            first_time_only: false,
            applies_to_plans: null,
            stripe_coupon_id: 'cou_1',
            stripe_promotion_code_id: 'promo_1',
            active: false,
            times_redeemed: 0,
            created_by: 'admin-1',
            created_at: new Date(),
            updated_at: new Date(),
          }),
        },
      };

      const result = await updatePlatformCouponActive('coupon-1', { active: false }, {
        stripe,
        prisma,
        stripeCall,
      });

      expect(stripe.promotionCodes.update).toHaveBeenCalledWith('promo_1', { active: false });
      expect(result.active).toBe(false);
    });
  });

  describe('recordPlatformCouponRedemption', () => {
    it('is idempotent on stripe_session_id', async () => {
      const prisma = {
        platform_coupons: {
          findFirst: vi.fn().mockResolvedValue({ id: 'coupon-1' }),
          update: vi.fn(),
        },
        platform_coupon_redemptions: {
          findUnique: vi.fn().mockResolvedValue({ id: 'red-1' }),
        },
        $transaction: vi.fn(),
      };

      const result = await recordPlatformCouponRedemption({
        id: 'cs_123',
        metadata: { userId: 'user-1' },
        discounts: [{ promotion_code: 'promo_1' }],
      }, { prisma });

      expect(result).toEqual({ recorded: true, idempotent: true, couponId: 'coupon-1' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
