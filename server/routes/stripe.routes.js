import express from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendNotFound,
  sendServerError,
  sendServiceUnavailable,
  asyncHandler
} from '../utils/apiResponse.js';

const router = express.Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

// POST /api/stripe/connect/onboard
router.post('/connect/onboard', requireAuth, asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
  }

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: req.user.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    }
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${req.protocol}://${req.get('host')}/dashboard/stripe?refresh=true`,
    return_url: `${req.protocol}://${req.get('host')}/dashboard/stripe?success=true`,
    type: 'account_onboarding'
  });

  await prisma.users.update({
    where: { id: req.user.id },
    data: { stripe_account_id: account.id }
  });

  sendSuccess(res, {
    accountId: account.id,
    onboardingUrl: accountLink.url
  });
}));

// GET /api/stripe/status (alias for /connect/status for backward compatibility)
router.get('/status', requireAuth, asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendSuccess(res, { connected: false, reason: 'stripe_not_configured' });
  }

  const user = await prisma.users.findUnique({
    where: { id: req.user.id },
    select: { stripe_account_id: true }
  });

  if (!user?.stripe_account_id) {
    return sendSuccess(res, { connected: false, reason: 'no_account' });
  }

  const account = await stripe.accounts.retrieve(user.stripe_account_id);

  sendSuccess(res, {
    connected: account.details_submitted && account.charges_enabled,
    accountId: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled
  });
}));

// GET /api/stripe/connect/status
router.get('/connect/status', requireAuth, asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendSuccess(res, { connected: false, reason: 'stripe_not_configured' });
  }

  const user = await prisma.users.findUnique({
    where: { id: req.user.id },
    select: { stripe_account_id: true }
  });

  if (!user?.stripe_account_id) {
    return sendSuccess(res, { connected: false, reason: 'no_account' });
  }

  const account = await stripe.accounts.retrieve(user.stripe_account_id);

  sendSuccess(res, {
    connected: account.details_submitted && account.charges_enabled,
    accountId: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled
  });
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
    refresh_url: `${req.protocol}://${req.get('host')}/dashboard/stripe?refresh=true`,
    return_url: `${req.protocol}://${req.get('host')}/dashboard/stripe?success=true`,
    type: 'account_onboarding'
  });

  sendSuccess(res, {
    onboardingUrl: accountLink.url
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
router.post('/connect/create-checkout', asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
  }

  const { siteId, items } = req.body;

  if (!siteId || !items) {
    return sendBadRequest(res, 'Site ID and items required', 'MISSING_REQUIRED_FIELDS');
  }

  const site = await prisma.sites.findUnique({
    where: { id: siteId },
    select: { stripe_account_id: true }
  });

  if (!site?.stripe_account_id) {
    return sendBadRequest(res, 'Site does not have Stripe connected', 'STRIPE_NOT_CONNECTED');
  }

  const lineItems = items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100)
    },
    quantity: item.quantity || 1
  }));

  // Direct checkout to connected account - NO APPLICATION FEE
  // Site owner keeps 100% of revenue (minus Stripe's processing fees)
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    payment_intent_data: {
      // Direct transfer to connected account
      // No application fee - site owner pays subscription fee instead
      on_behalf_of: site.stripe_account_id,
      transfer_data: {
        destination: site.stripe_account_id
      }
    },
    success_url: `${req.protocol}://${req.get('host')}/checkout/success`,
    cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`
  });

  sendSuccess(res, {
    sessionId: session.id,
    url: session.url
  });
}));

export default router;

