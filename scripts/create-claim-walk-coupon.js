#!/usr/bin/env node

/**
 * One-use 100% claim coupon (PLANTSWALK). Not bound to a Stripe customer —
 * whoever logs in with their own email can apply it once at claim Checkout.
 *
 *   npm run seed:claim-walk
 */

import dotenv from 'dotenv';
import Stripe from 'stripe';
import { prisma } from '../database/db.js';
import { createPlatformCoupon } from '../server/services/platformCouponService.js';

dotenv.config();

const CLAIM_WALK_COUPON = 'PLANTSWALK';

function promoCustomerId(promo) {
  if (!promo?.customer) return null;
  return typeof promo.customer === 'string' ? promo.customer : promo.customer.id;
}

async function unrestrictPromo(stripe, promo) {
  if (!promoCustomerId(promo)) {
    return promo;
  }

  await stripe.promotionCodes.update(promo.id, { active: false });
  const couponId = typeof promo.coupon === 'string' ? promo.coupon : promo.coupon?.id;
  try {
    return await stripe.promotionCodes.create({
      coupon: couponId,
      code: CLAIM_WALK_COUPON,
      max_redemptions: promo.max_redemptions ?? 1,
    });
  } catch {
    return stripe.promotionCodes.create({
      coupon: couponId,
      code: 'CLAIMWALK',
      max_redemptions: 1,
    });
  }
}

async function persistStripePromo({ stripe, prismaClient, createdBy, promo }) {
  const couponId = typeof promo.coupon === 'string' ? promo.coupon : promo.coupon?.id;
  const stripeCoupon = await stripe.coupons.retrieve(couponId);
  return prismaClient.platform_coupons.create({
    data: {
      code: promo.code || CLAIM_WALK_COUPON,
      percent_off: stripeCoupon.percent_off ?? 100,
      amount_off_cents: stripeCoupon.amount_off ?? null,
      duration: stripeCoupon.duration,
      duration_in_months: stripeCoupon.duration_in_months ?? null,
      max_redemptions: promo.max_redemptions ?? 1,
      expires_at: promo.expires_at ? new Date(promo.expires_at * 1000) : null,
      first_time_only: Boolean(promo.restrictions?.first_time_transaction),
      applies_to_plans: null,
      stripe_coupon_id: couponId,
      stripe_promotion_code_id: promo.id,
      active: promo.active !== false,
      times_redeemed: promo.times_redeemed ?? 0,
      created_by: createdBy,
    },
  });
}

async function ensureCoupon({ stripe, createdBy }) {
  const existing = await prisma.platform_coupons.findUnique({
    where: { code: CLAIM_WALK_COUPON },
  });
  if (existing) {
    const promo = await stripe.promotionCodes.retrieve(existing.stripe_promotion_code_id);
    const next = await unrestrictPromo(stripe, promo);
    if (next.id !== existing.stripe_promotion_code_id) {
      await prisma.platform_coupons.update({
        where: { id: existing.id },
        data: {
          stripe_promotion_code_id: next.id,
          code: next.code || CLAIM_WALK_COUPON,
          active: true,
        },
      });
    }
    return { coupon: existing, created: false, code: next.code || CLAIM_WALK_COUPON };
  }

  const listed = await stripe.promotionCodes.list({ code: CLAIM_WALK_COUPON, limit: 10 });
  const promo = listed.data.find((row) => row.code === CLAIM_WALK_COUPON);
  if (promo) {
    const next = await unrestrictPromo(stripe, promo);
    const row = await persistStripePromo({
      stripe,
      prismaClient: prisma,
      createdBy,
      promo: next,
    });
    return { coupon: row, created: true, attached: true, code: next.code };
  }

  const created = await createPlatformCoupon(
    {
      code: CLAIM_WALK_COUPON,
      percent: 100,
      duration: 'forever',
      maxRedemptions: 1,
    },
    { stripe, prisma, createdBy },
  );
  return { coupon: created, created: true, code: created.code };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const secret = process.env.STRIPE_SECRET_KEY || '';
  const stripe = secret ? new Stripe(secret, { apiVersion: '2024-06-20' }) : null;
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }

  const admin = await prisma.users.findFirst({
    where: { role: 'admin' },
    orderBy: { created_at: 'asc' },
  });
  if (!admin) {
    throw new Error('An admin user is required to create platform_coupons.created_by');
  }

  const coupon = await ensureCoupon({
    stripe,
    createdBy: admin.id,
  });

  const couponAction = coupon.attached ? 'attached' : coupon.created ? 'created' : 'existing';
  process.stdout.write(`${couponAction}\t${coupon.code || CLAIM_WALK_COUPON}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
