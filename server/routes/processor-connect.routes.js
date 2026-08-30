/**
 * Payment Processor Connection Routes
 *
 * OAuth-only flows for Stripe, Square, and PayPal.
 * Merchants complete KYC on the provider's site; SiteSprintz never collects
 * bank details, identity documents, or pasted API secrets.
 */

import express from 'express';
import { prisma } from '../../database/db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  sendSuccess,
  sendBadRequest,
  sendForbidden,
  sendServiceUnavailable,
  asyncHandler
} from '../utils/apiResponse.js';
import { initiateSquareOAuth, handleSquareCallback } from '../services/payments/SquareOAuthService.js';
import { initiatePayPalOAuth, handlePayPalCallback, isPayPalConfigured } from '../services/payments/PayPalOAuthService.js';
import {
  initiateStripeOAuth,
  handleStripeOAuthCallback,
  isStripeOAuthConfigured
} from '../services/payments/StripeConnectService.js';
import {
  getApiOrigin,
  getFrontendOrigin,
  isProcessorConfigured,
  userCanConnectPayments,
  resolveOwnedSiteId,
  deactivateProcessor,
  getConnectedProcessors,
  getPaymentConnectStatus,
  listOwnedSiteIds,
  normalizeApplyTo,
  recordProcessorConnection,
  copyPaymentSetupToSites,
  saveFuturePaymentDefaults
} from '../services/payments/processorConnectHelpers.js';

const router = express.Router();

function redirectToSettings(res, req, params) {
  const origin = getFrontendOrigin(req);
  const query = new URLSearchParams(params).toString();
  res.redirect(`${origin}/settings/payments?${query}`);
}

async function requirePaymentsAccess(req, res) {
  const allowed = await userCanConnectPayments(req.user.id);
  if (!allowed) {
    sendForbidden(res, 'Connecting a payment provider requires a Growth plan', 'GROWTH_PLAN_REQUIRED');
    return false;
  }
  return true;
}

function handleOAuthStartError(res, error, processorLabel) {
  if (error.message.includes('not configured')) {
    return sendServiceUnavailable(res, `${processorLabel} is not configured on this platform`, `${processorLabel.toUpperCase()}_NOT_CONFIGURED`);
  }
  throw error;
}

/**
 * GET /square  (also /connect/square)
 */
router.get(['/square', '/connect/square'], requireAuth, asyncHandler(async (req, res) => {
  if (!(await requirePaymentsAccess(req, res))) return;

  if (!isProcessorConfigured('square')) {
    return sendServiceUnavailable(res, 'Square not configured', 'SQUARE_NOT_CONFIGURED');
  }

  const siteId = await resolveOwnedSiteId(req.user.id, req.query.siteId);
  const applyTo = normalizeApplyTo(req.query.applyTo);

  try {
    const redirectUri = process.env.SQUARE_REDIRECT_URL || `${getApiOrigin(req)}/api/connect/square/callback`;
    const { authorizeUrl, state } = await initiateSquareOAuth(siteId, req.user.id, redirectUri, applyTo);
    sendSuccess(res, { authorizeUrl, url: authorizeUrl, state });
  } catch (error) {
    handleOAuthStartError(res, error, 'Square');
  }
}));

/**
 * GET /square/callback
 */
router.get(['/square/callback', '/connect/square/callback'], asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return redirectToSettings(res, req, { connect: 'error', processor: 'square', message: String(error) });
  }

  if (!code || !state) {
    return sendBadRequest(res, 'Authorization code and state required', 'MISSING_OAUTH_PARAMS');
  }

  try {
    const result = await handleSquareCallback(code, state);
    return redirectToSettings(res, req, {
      connect: 'success',
      processor: 'square',
      ...(result.siteId ? { site: result.siteId } : {})
    });
  } catch (callbackError) {
    if (callbackError.message.includes('Invalid or expired state token')) {
      return redirectToSettings(res, req, { connect: 'error', processor: 'square', message: 'expired' });
    }
    if (callbackError.message.includes('Failed to connect Square account')) {
      return redirectToSettings(res, req, { connect: 'error', processor: 'square', message: 'token_exchange' });
    }
    if (callbackError.message.includes('active location')) {
      return redirectToSettings(res, req, { connect: 'error', processor: 'square', message: 'no_location' });
    }
    return redirectToSettings(res, req, { connect: 'error', processor: 'square', message: 'token_exchange' });
  }
}));

router.post(['/disconnect/square', '/square/disconnect'], requireAuth, asyncHandler(async (req, res) => {
  await deactivateProcessor({
    siteId: await resolveOwnedSiteId(req.user.id, req.body?.siteId),
    userId: req.user.id,
    processor: 'square',
    applyTo: normalizeApplyTo(req.body?.applyTo)
  });
  sendSuccess(res, {}, 'Square account disconnected');
}));

/**
 * GET /paypal
 */
router.get(['/paypal', '/connect/paypal'], requireAuth, asyncHandler(async (req, res) => {
  if (!(await requirePaymentsAccess(req, res))) return;

  if (!isPayPalConfigured()) {
    return sendServiceUnavailable(res, 'PayPal not configured', 'PAYPAL_NOT_CONFIGURED');
  }

  const siteId = await resolveOwnedSiteId(req.user.id, req.query.siteId);
  const applyTo = normalizeApplyTo(req.query.applyTo);

  try {
    const redirectUri = process.env.PAYPAL_REDIRECT_URL || `${getApiOrigin(req)}/api/connect/paypal/callback`;
    const { authorizeUrl, state } = await initiatePayPalOAuth(siteId, req.user.id, redirectUri, applyTo);
    sendSuccess(res, { authorizeUrl, url: authorizeUrl, state });
  } catch (error) {
    handleOAuthStartError(res, error, 'PayPal');
  }
}));

/**
 * GET /paypal/callback
 */
router.get(['/paypal/callback', '/connect/paypal/callback'], asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return redirectToSettings(res, req, { connect: 'error', processor: 'paypal', message: String(error) });
  }

  if (!code || !state) {
    return sendBadRequest(res, 'Authorization code and state required', 'MISSING_OAUTH_PARAMS');
  }

  try {
    const result = await handlePayPalCallback(code, state);
    return redirectToSettings(res, req, {
      connect: 'success',
      processor: 'paypal',
      ...(result.siteId ? { site: result.siteId } : {})
    });
  } catch (callbackError) {
    if (callbackError.message.includes('Invalid or expired state token')) {
      return redirectToSettings(res, req, { connect: 'error', processor: 'paypal', message: 'expired' });
    }
    if (callbackError.message.includes('Business account')) {
      return redirectToSettings(res, req, { connect: 'error', processor: 'paypal', message: 'paypal_not_business' });
    }
    return redirectToSettings(res, req, { connect: 'error', processor: 'paypal', message: 'token_exchange' });
  }
}));

/**
 * POST /paypal/verify — rejected. Pasting client secrets puts the platform in the audit loop.
 */
router.post(['/paypal/verify', '/connect/paypal/verify'], requireAuth, asyncHandler(async (req, res) => {
  return sendBadRequest(
    res,
    'Connect PayPal with one click instead of pasting API secrets. Right Site Light does not store merchant PayPal credentials.',
    'OAUTH_REQUIRED'
  );
}));

router.post(['/disconnect/paypal', '/paypal/disconnect'], requireAuth, asyncHandler(async (req, res) => {
  await deactivateProcessor({
    siteId: await resolveOwnedSiteId(req.user.id, req.body?.siteId),
    userId: req.user.id,
    processor: 'paypal',
    applyTo: normalizeApplyTo(req.body?.applyTo)
  });
  sendSuccess(res, {}, 'PayPal account disconnected');
}));

/**
 * GET /stripe/oauth — connect an existing Stripe account (Standard OAuth)
 */
router.get(['/stripe/oauth', '/connect/stripe/oauth'], requireAuth, asyncHandler(async (req, res) => {
  if (!(await requirePaymentsAccess(req, res))) return;

  if (!isStripeOAuthConfigured()) {
    return sendServiceUnavailable(res, 'Stripe OAuth not configured', 'STRIPE_OAUTH_NOT_CONFIGURED');
  }

  const siteId = await resolveOwnedSiteId(req.user.id, req.query.siteId);
  const redirectUri = `${getApiOrigin(req)}/api/connect/stripe/callback`;
  const applyTo = normalizeApplyTo(req.query.applyTo);

  try {
    const { authorizeUrl, state } = await initiateStripeOAuth(req.user.id, siteId, redirectUri, applyTo);
    sendSuccess(res, { authorizeUrl, url: authorizeUrl, state });
  } catch (error) {
    handleOAuthStartError(res, error, 'Stripe');
  }
}));

router.get(['/stripe/callback', '/connect/stripe/callback'], asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return redirectToSettings(res, req, { connect: 'error', processor: 'stripe', message: String(error) });
  }

  if (!code || !state) {
    return sendBadRequest(res, 'Authorization code and state required', 'MISSING_OAUTH_PARAMS');
  }

  try {
    const result = await handleStripeOAuthCallback(code, state);
    return redirectToSettings(res, req, {
      connect: 'success',
      processor: 'stripe',
      ...(result.siteId ? { site: result.siteId } : {})
    });
  } catch (callbackError) {
    if (callbackError.message.includes('Invalid or expired state token')) {
      return redirectToSettings(res, req, { connect: 'error', processor: 'stripe', message: 'expired' });
    }
    return redirectToSettings(res, req, { connect: 'error', processor: 'stripe', message: 'token_exchange' });
  }
}));

/**
 * PUT /default — checkout processor for this site (or all sites if applyTo=all)
 */
router.put(['/default', '/connect/default'], requireAuth, asyncHandler(async (req, res) => {
  const { provider, siteId: requestedSiteId, applyTo: requestedApplyTo } = req.body || {};
  if (!provider) {
    return sendBadRequest(res, 'Provider required', 'MISSING_PROVIDER');
  }

  const siteId = await resolveOwnedSiteId(req.user.id, requestedSiteId);
  const connected = await getConnectedProcessors(req.user.id, siteId);
  const stripeReady = provider === 'stripe' && (connected.byProcessor.stripe || connected.user?.stripe_account_id);
  const otherReady = provider !== 'stripe' && connected.byProcessor[provider];

  if (!stripeReady && !otherReady) {
    return sendBadRequest(res, `Connect ${provider} before setting it as default`, 'NOT_CONNECTED');
  }

  const accountId = connected.byProcessor[provider]?.account_id || connected.user?.stripe_account_id;
  const applyTo = normalizeApplyTo(requestedApplyTo);
  const siteIds = applyTo === 'all'
    ? await listOwnedSiteIds(req.user.id)
    : (siteId ? [siteId] : []);

  for (const id of siteIds) {
    await prisma.sites.update({
      where: { id },
      data: { payment_processor: provider }
    });
    await prisma.site_payment_method.upsert({
      where: { site_id: id },
      update: {
        provider,
        account_id: accountId,
        is_active: true,
        updated_at: new Date()
      },
      create: {
        site_id: id,
        provider,
        account_id: accountId,
        is_active: true
      }
    });
  }

  if (applyTo === 'future' || applyTo === 'all') {
    await saveFuturePaymentDefaults(req.user.id, siteId, true);
  }

  sendSuccess(res, { provider, siteIds, applyTo }, `${provider} set as default`);
}));

router.post(['/attach', '/connect/attach'], requireAuth, asyncHandler(async (req, res) => {
  if (!(await requirePaymentsAccess(req, res))) return;

  const { processor = 'stripe', siteId: requestedSiteId, applyTo: requestedApplyTo } = req.body || {};
  const siteId = await resolveOwnedSiteId(req.user.id, requestedSiteId);
  const applyTo = normalizeApplyTo(requestedApplyTo);
  const connected = await getConnectedProcessors(req.user.id, siteId);

  if (processor === 'stripe') {
    const accountId = connected.user?.stripe_account_id;
    if (!accountId) {
      return sendBadRequest(res, 'Connect Stripe first', 'NOT_CONNECTED');
    }
    await recordProcessorConnection({
      siteId,
      userId: req.user.id,
      processor: 'stripe',
      accountId,
      setDefault: true,
      stripeChargesEnabled: connected.user?.stripe_connected === true,
      applyTo
    });
    return sendSuccess(res, { processor: 'stripe', siteId, applyTo }, 'Stripe attached to this site');
  }

  return sendBadRequest(res, 'Use Copy setup to reuse Square or PayPal on another site', 'COPY_SETUP_REQUIRED');
}));

router.post(['/apply-setup', '/connect/apply-setup'], requireAuth, asyncHandler(async (req, res) => {
  if (!(await requirePaymentsAccess(req, res))) return;

  const sourceSiteId = await resolveOwnedSiteId(req.user.id, req.body?.siteId);
  if (!sourceSiteId) {
    return sendBadRequest(res, 'Select a site first', 'SITE_REQUIRED');
  }

  const applyToFuture = req.body?.applyToFuture === true;
  const applyToAll = req.body?.applyToAll === true;
  const targetSiteIds = applyToAll ? await listOwnedSiteIds(req.user.id) : [];

  const result = await copyPaymentSetupToSites({
    userId: req.user.id,
    sourceSiteId,
    targetSiteIds,
    applyToFuture
  });

  if (applyToFuture && !applyToAll) {
    await saveFuturePaymentDefaults(req.user.id, sourceSiteId, true);
  }

  sendSuccess(res, { ...result, sourceSiteId, applyToFuture, applyToAll }, 'Payment setup updated');
}));

router.put(['/future-defaults', '/connect/future-defaults'], requireAuth, asyncHandler(async (req, res) => {
  if (!(await requirePaymentsAccess(req, res))) return;

  const enabled = req.body?.enabled === true;
  const sourceSiteId = enabled
    ? await resolveOwnedSiteId(req.user.id, req.body?.siteId)
    : null;

  if (enabled && !sourceSiteId) {
    return sendBadRequest(res, 'Select a site to reuse on future sites', 'SITE_REQUIRED');
  }

  await saveFuturePaymentDefaults(req.user.id, sourceSiteId, enabled);
  sendSuccess(res, { enabled, sourceSiteId }, enabled
    ? 'New sites will use this payment setup'
    : 'New sites will not inherit this payment setup');
}));

router.post(['/disconnect/stripe', '/stripe/disconnect'], requireAuth, asyncHandler(async (req, res) => {
  await deactivateProcessor({
    siteId: await resolveOwnedSiteId(req.user.id, req.body?.siteId),
    userId: req.user.id,
    processor: 'stripe',
    applyTo: normalizeApplyTo(req.body?.applyTo)
  });
  sendSuccess(res, {}, 'Stripe disconnected from this site');
}));

/**
 * GET /status — dashboard payment card (also /processors/status)
 */
router.get(['/status', '/processors/status'], requireAuth, asyncHandler(async (req, res) => {
  const payload = await getPaymentConnectStatus(req.user.id, req.query.siteId);
  sendSuccess(res, payload);
}));

export default router;

