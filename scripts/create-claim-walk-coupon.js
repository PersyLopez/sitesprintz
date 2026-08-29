#!/usr/bin/env node

/**
 * One-use 100% claim walk: seed the non-admin walker login and PLANTSWALK.
 * Neighbor: scripts/seed-tester-accounts.js + createPlatformCoupon.
 *
 *   npm run seed:claim-walk
 */

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { prisma } from '../database/db.js';
import { createPlatformCoupon } from '../server/services/platformCouponService.js';

dotenv.config();

/** Keep in sync with tests/fixtures/test-credentials.js (tests/ is not on Railway). */
const CLAIM_WALK_COUPON = 'PLANTSWALK';
const CLAIM_WALK_USER = {
  email: 'persylopez99+plantsclaim@gmail.com',
  password: 'ClaimWalk!2026',
  role: 'user',
  plan: 'free',
  subscriptionStatus: 'inactive',
};

async function upsertWalkUser() {
  const passwordHash = await bcrypt.hash(CLAIM_WALK_USER.password, 10);
  const now = new Date();
  const existing = await prisma.users.findUnique({
    where: { email: CLAIM_WALK_USER.email },
  });

  const data = {
    password_hash: passwordHash,
    role: CLAIM_WALK_USER.role,
    status: 'active',
    subscription_status: CLAIM_WALK_USER.subscriptionStatus,
    subscription_plan: CLAIM_WALK_USER.plan,
    plan: CLAIM_WALK_USER.plan,
    email_verified: true,
    last_login: now,
  };

  if (existing) {
    const updated = await prisma.users.update({
      where: { email: CLAIM_WALK_USER.email },
      data,
    });
    return { user: updated, created: false };
  }

  const created = await prisma.users.create({
    data: {
      email: CLAIM_WALK_USER.email,
      created_at: now,
      ...data,
    },
  });
  return { user: created, created: true };
}

async function ensureStripeCustomer(stripe, user) {
  if (user.stripe_customer_id) {
    const existing = await stripe.customers.retrieve(user.stripe_customer_id);
    if (existing && !existing.deleted) {
      return existing;
    }
  }

  const listed = await stripe.customers.list({ email: user.email, limit: 1 });
  const customer = listed.data[0]
    ? listed.data[0]
    : await stripe.customers.create({
      email: user.email,
      metadata: { source: 'sitesprintz', purpose: 'claim_walk' },
    });

  await prisma.users.update({
    where: { id: user.id },
    data: { stripe_customer_id: customer.id },
  });
  return customer;
}

async function persistStripePromo({ stripe, prismaClient, createdBy, promo }) {
  const couponId = typeof promo.coupon === 'string' ? promo.coupon : promo.coupon?.id;
  const stripeCoupon = await stripe.coupons.retrieve(couponId);
  return prismaClient.platform_coupons.create({
    data: {
      code: CLAIM_WALK_COUPON,
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

async function ensureCoupon({ stripe, createdBy, customerId }) {
  const existing = await prisma.platform_coupons.findUnique({
    where: { code: CLAIM_WALK_COUPON },
  });
  if (existing) {
    return { coupon: existing, created: false };
  }

  const listed = await stripe.promotionCodes.list({ code: CLAIM_WALK_COUPON, limit: 10 });
  const promo = listed.data.find((row) => row.code === CLAIM_WALK_COUPON);
  if (promo) {
    const boundCustomer = typeof promo.customer === 'string' ? promo.customer : promo.customer?.id;
    if (boundCustomer && boundCustomer !== customerId) {
      process.stderr.write(
        `warn\t${CLAIM_WALK_COUPON} is bound to a different Stripe customer; apply it while logged in as ${CLAIM_WALK_USER.email}\n`,
      );
    }
    const row = await persistStripePromo({
      stripe,
      prismaClient: prisma,
      createdBy,
      promo,
    });
    return { coupon: row, created: true, attached: true };
  }

  const created = await createPlatformCoupon(
    {
      code: CLAIM_WALK_COUPON,
      percent: 100,
      duration: 'forever',
      maxRedemptions: 1,
      restrictToCustomerId: customerId,
    },
    { stripe, prisma, createdBy },
  );
  return { coupon: created, created: true };
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

  const walk = await upsertWalkUser();
  const customer = await ensureStripeCustomer(stripe, walk.user);
  const coupon = await ensureCoupon({
    stripe,
    createdBy: admin.id,
    customerId: customer.id,
  });

  const userAction = walk.created ? 'created' : 'updated';
  const couponAction = coupon.attached ? 'attached' : coupon.created ? 'created' : 'existing';
  process.stdout.write(`${userAction}\t${CLAIM_WALK_USER.email}\n`);
  process.stdout.write(`${couponAction}\t${CLAIM_WALK_COUPON}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
