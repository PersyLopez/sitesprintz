#!/usr/bin/env node
/**
 * Create Stripe Dashboard Prices for labor extras.
 * Prints env lines. Does not write .env. Never creates claim_setup unless --internal.
 *
 * Usage:
 *   node scripts/create-labor-stripe-prices.js
 *   node scripts/create-labor-stripe-prices.js --internal
 */
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { LABOR_SKUS, CUSTOMER_LABOR_SKUS, PLATFORM_PLAN_DETAILS } from '../server/config/platformPlans.js';
import { PRICING_CONFIG } from '../src/config/pricing.config.js';

dotenv.config();

const CENTS = {
  managed_edit: Math.round(Number(PRICING_CONFIG.labor.extraBatch.price) * 100),
  brand_match: Math.round(Number(PRICING_CONFIG.labor.brandMatch.price) * 100),
  unique_look: Math.round(Number(PRICING_CONFIG.labor.uniqueLook.price) * 100),
};

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('STRIPE_SECRET_KEY is required');
    process.exit(1);
  }
  const includeInternal = process.argv.includes('--internal');
  const skuIds = includeInternal
    ? Object.keys(LABOR_SKUS)
    : [...CUSTOMER_LABOR_SKUS];

  const stripe = new Stripe(key, { apiVersion: '2024-06-20' });

  for (const skuId of skuIds) {
    const sku = LABOR_SKUS[skuId];
    const amount = CENTS[skuId];
    if (!Number.isFinite(amount)) {
      console.error(`Skip ${skuId}: no display amount`);
      continue;
    }
    const product = await stripe.products.create({
      name: sku.name,
      description: sku.description,
      metadata: { type: sku.metadataType },
    });
    const recurring = undefined;
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: amount,
      ...(recurring ? { recurring } : {}),
      metadata: { type: sku.metadataType },
    });
    console.log(`${sku.envPriceKey}=${price.id}`);
  }

  const managed = PLATFORM_PLAN_DETAILS.growth_managed;
  const managedProduct = await stripe.products.create({
    name: managed.name,
    description: managed.description,
    metadata: { plan: managed.id },
  });
  const managedPrice = await stripe.prices.create({
    product: managedProduct.id,
    currency: 'usd',
    unit_amount: managed.amount,
    recurring: { interval: 'month' },
    metadata: { plan: managed.id },
  });
  console.log(`${managed.envPriceKey}=${managedPrice.id}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
