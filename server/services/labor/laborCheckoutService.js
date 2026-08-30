import {
  LABOR_SKUS,
  laborCheckoutMode,
  laborIdempotencyKey,
  normalizeCustomerLaborSku,
  stripeLaborLineItem,
} from '../../config/platformPlans.js';
import { resolveStripeRedirectUrl } from '../../utils/stripeReturnUrls.js';

async function getOrCreateCustomer(stripe, prismaClient, user) {
  const dbUser = await prismaClient.users.findUnique({
    where: { id: user.id },
    select: { stripe_customer_id: true },
  });

  let customerId = dbUser?.stripe_customer_id || null;
  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId);
    } catch {
      customerId = null;
    }
  }

  if (!customerId) {
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const created = await stripe.customers.create({
        email: user.email,
        metadata: { source: 'sitesprintz' },
      });
      customerId = created.id;
    }
    await prismaClient.users.update({
      where: { id: user.id },
      data: { stripe_customer_id: customerId },
    });
  }

  return customerId;
}

/**
 * Authenticated extras Checkout. Env Price IDs only. Never claim_setup.
 * Ignores client amount, price, and quantity.
 */
export async function createLaborCheckout({
  user,
  sku: rawSku,
  siteId,
  req,
  stripe,
  prisma: prismaClient,
  resolveOwnedSiteId,
  now = new Date(),
  env = process.env,
}) {
  if (!stripe) {
    const error = new Error('Stripe not configured');
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }

  const skuId = normalizeCustomerLaborSku(rawSku);
  if (!skuId) {
    const error = new Error('Unknown labor SKU');
    error.code = 'INVALID_LABOR_SKU';
    throw error;
  }

  const lineItem = stripeLaborLineItem(skuId, env);
  const userId = user.id;
  const ownedSiteId = siteId
    ? await resolveOwnedSiteId(userId, siteId)
    : null;
  if (siteId && !ownedSiteId) {
    const error = new Error('Site not found');
    error.code = 'SITE_NOT_OWNED';
    throw error;
  }

  const customerId = await getOrCreateCustomer(stripe, prismaClient, user);
  const successUrl = resolveStripeRedirectUrl(
    req,
    null,
    '/settings/billing?labor=success&session_id={CHECKOUT_SESSION_ID}',
  );
  const cancelUrl = resolveStripeRedirectUrl(req, null, '/settings/billing?labor=cancel');
  const mode = laborCheckoutMode(skuId);
  const sku = LABOR_SKUS[skuId];
  const metadata = {
    source: 'labor_extra',
    type: sku.metadataType,
    userId,
    ...(ownedSiteId ? { siteId: ownedSiteId } : {}),
  };

  const sessionParams = {
    customer: customerId,
    client_reference_id: userId,
    mode,
    payment_method_types: ['card'],
    line_items: [lineItem],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    allow_promotion_codes: true,
  };

  if (mode === 'subscription') {
    sessionParams.subscription_data = {
      metadata: {
        source: 'labor_extra',
        type: sku.metadataType,
        userId,
      },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams, {
    idempotencyKey: laborIdempotencyKey(userId, skuId, now),
  });

  return { url: session.url, sessionId: session.id, sku: skuId, mode };
}
