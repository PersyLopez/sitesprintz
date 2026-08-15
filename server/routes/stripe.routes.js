import express from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';
import { checkoutLimiter, orderLimiter } from '../middleware/rateLimiting.js';
import { verifyTurnstile } from '../utils/captcha.js';
import { ProductCatalogService } from '../services/ProductCatalogService.js';
import { prisma } from '../../database/db.js';
import { PLAN_LIMITS } from '../services/subscriptionService.js';
import {
  sendSuccess,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServiceUnavailable,
  asyncHandler
} from '../utils/apiResponse.js';
import { createStandardAccountLink, isStripeOAuthConfigured, initiateStripeOAuth } from '../services/payments/StripeConnectService.js';
import { getApiOrigin, getFrontendOrigin, resolveOwnedSiteId } from '../services/payments/processorConnectHelpers.js';

const router = express.Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

async function startStandardOnboarding(req, res) {
  if (!stripe) {
    return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
  }

  const user = await prisma.users.findUnique({
    where: { id: req.user.id }
  });
  if (!user) {
    return sendNotFound(res, 'User', 'USER_NOT_FOUND');
  }

  const origin = getFrontendOrigin(req);
  const siteId = await resolveOwnedSiteId(user.id, req.body?.siteId);

  if (isStripeOAuthConfigured() && !user.stripe_account_id) {
    const redirectUri = `${getApiOrigin(req)}/api/connect/stripe/callback`;
    const { authorizeUrl } = await initiateStripeOAuth(user.id, siteId, redirectUri);
    return sendSuccess(res, {
      url: authorizeUrl,
      onboardingUrl: authorizeUrl,
      method: 'oauth'
    });
  }

  const { url, accountId } = await createStandardAccountLink({ user, origin, siteId });
  return sendSuccess(res, {
    accountId,
    url,
    onboardingUrl: url,
    method: 'account_link'
  });
}

// POST /api/stripe/connect/onboard
router.post('/connect/onboard', requireAuth, asyncHandler(startStandardOnboarding));

// GET /api/stripe/account (alias for connect status)
router.get('/account', requireAuth, asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendSuccess(res, { connected: false, reason: 'stripe_not_configured' });
  }

  const user = await prisma.users.findUnique({
    where: { id: req.user.id },
    select: { stripe_account_id: true, stripe_connected: true }
  });

  return sendSuccess(res, {
    accountId: user?.stripe_account_id || null,
    connected: !!user?.stripe_connected
  });
}));

// POST /api/stripe/connect (alias for onboard)
router.post('/connect', requireAuth, asyncHandler(startStandardOnboarding));

// GET /api/stripe/status (alias for connect status)
router.get('/status', requireAuth, asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendSuccess(res, { connected: false, reason: 'stripe_not_configured' });
  }

  const user = await prisma.users.findUnique({
    where: { id: req.user.id },
    select: { stripe_account_id: true, stripe_connected: true }
  });

  if (!user?.stripe_account_id) {
    return sendSuccess(res, { connected: false, reason: 'no_account' });
  }

  try {
    const account = await stripe.accounts.retrieve(user.stripe_account_id);
    const connected = account.charges_enabled === true && account.payouts_enabled === true;
    return sendSuccess(res, {
      connected,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    });
  } catch {
    return sendSuccess(res, { connected: false, reason: 'verify_failed', accountId: user.stripe_account_id });
  }
}));

// GET /api/stripe/connect/status
router.get('/connect/status', requireAuth, asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendSuccess(res, { connected: false, reason: 'stripe_not_configured' });
  }

  const user = await prisma.users.findUnique({
    where: { id: req.user.id },
    select: { stripe_account_id: true, stripe_connected: true }
  });

  if (!user?.stripe_account_id) {
    return sendSuccess(res, { connected: false, reason: 'no_account' });
  }

  try {
    const account = await stripe.accounts.retrieve(user.stripe_account_id);
    const connected = account.charges_enabled === true && account.payouts_enabled === true;
    return sendSuccess(res, {
      connected,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    });
  } catch {
    return sendSuccess(res, { connected: false, reason: 'verify_failed', accountId: user.stripe_account_id });
  }
}));

// POST /api/stripe/connect/refresh
router.post('/connect/refresh', requireAuth, asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
  }

  const user = await prisma.users.findUnique({
    where: { id: req.user.id },
    select: { stripe_account_id: true }
  });

  if (!user?.stripe_account_id) {
    return sendNotFound(res, 'Stripe account', 'NO_STRIPE_ACCOUNT');
  }

  const accountLink = await stripe.accountLinks.create({
    account: user.stripe_account_id,
    refresh_url: `${getFrontendOrigin(req)}/settings/payments?connect=refresh&processor=stripe`,
    return_url: `${getFrontendOrigin(req)}/settings/payments?connect=success&processor=stripe`,
    type: 'account_onboarding'
  });

  sendSuccess(res, {
    onboardingUrl: accountLink.url,
    url: accountLink.url
  });
}));

// POST /api/stripe/connect/disconnect
router.post('/connect/disconnect', requireAuth, asyncHandler(async (req, res) => {
  await prisma.users.update({
    where: { id: req.user.id },
    data: { stripe_account_id: null }
  });

  sendSuccess(res, {}, 'Stripe account disconnected');
}));

// POST /api/stripe/connect/create-checkout
router.post('/connect/create-checkout', checkoutLimiter, orderLimiter, asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
  }

  // Verify CAPTCHA
  const captchaResult = await verifyTurnstile(req.body.captchaToken, req.ip);
  if (!captchaResult.success && !captchaResult.skipped) {
    return sendBadRequest(res, 'CAPTCHA verification failed', 'CAPTCHA_FAILED');
  }

  const { siteId, items, idempotencyKey } = req.body;

  if (!siteId || !items || !Array.isArray(items) || items.length === 0) {
    return sendBadRequest(res, 'Site ID and items required', 'MISSING_REQUIRED_FIELDS');
  }

  const site = await prisma.sites.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      subdomain: true,
      plan: true,
      site_data: true,
      user_id: true,
      users: {
        select: {
          plan: true,
          subscription_plan: true,
          stripe_account_id: true,
          stripe_connected: true
        }
      }
    }
  });

  if (!site) {
    return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
  }

  const ownerPlan = site.users?.subscription_plan || site.users?.plan || site.plan || 'trial';
  const limits = PLAN_LIMITS[ownerPlan] || PLAN_LIMITS.trial || PLAN_LIMITS.free;
  if (!limits.payments) {
    return sendForbidden(res, 'This site does not have online payments enabled', 'PRO_PLAN_REQUIRED');
  }

  const siteData = typeof site.site_data === 'string'
    ? JSON.parse(site.site_data)
    : (site.site_data || {});
  if (siteData.settings?.allowCheckout === false) {
    return sendForbidden(res, 'Checkout disabled for this site', 'CHECKOUT_DISABLED');
  }

  // Validate and rebuild checkout with server-side prices and stock
  let rebuiltCheckout;
  try {
    const catalogService = new ProductCatalogService();
    rebuiltCheckout = await catalogService.validateAndRebuildCheckout(items, siteId, siteData);
  } catch (error) {
    console.error('Checkout validation failed:', error.message);
    return sendBadRequest(res, error.message, 'INVALID_CHECKOUT');
  }

  // Rebuild line items with validated prices from server
  const lineItems = rebuiltCheckout.items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: String(item.name || 'Item').slice(0, 250),
        description: item.description ? String(item.description).slice(0, 500) : undefined,
        images: item.image ? [item.image] : undefined
      },
      unit_amount: Math.round(Number(item.price) * 100)
    },
    quantity: item.quantity
  }));

  const origin = `${req.protocol}://${req.get('host')}`;
  const sitePath = site.subdomain || siteId;
  const successUrl = `${origin}/sites/${sitePath}/?order=success`;
  const cancelUrl = `${origin}/sites/${sitePath}/?order=cancelled`;

  const stripeAccountId = site.users?.stripe_account_id && site.users?.stripe_connected
    ? site.users.stripe_account_id
    : null;

  if (!stripeAccountId) {
    return sendBadRequest(res, 'The site owner has not connected a payment account', 'PAYMENTS_NOT_CONNECTED');
  }

  const sessionParams = {
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      site_id: siteId,
      user_id: site.user_id || '',
      order_items: JSON.stringify(rebuiltCheckout.items),
      type: 'order'
    }
  };

  // Direct charge on the connected Standard account — funds never hit SiteSprintz
  const stripeOptions = {
    stripeAccount: stripeAccountId,
    ...(idempotencyKey ? { idempotencyKey } : {})
  };
  const session = await stripe.checkout.sessions.create(sessionParams, stripeOptions);

  sendSuccess(res, {
    sessionId: session.id,
    url: session.url
  });
}));

export default router;

