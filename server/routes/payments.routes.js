import express from 'express';
import Stripe from 'stripe';
import { randomUUID as nodeRandomUUID } from 'crypto';
import { prisma } from '../../database/db.js';
import { authenticateToken, requireAuth } from '../middleware/auth.js';
import { checkoutLimiter, orderLimiter } from '../middleware/rateLimiting.js';
import { verifyTurnstile } from '../utils/captcha.js';
import { resolvePlanLimits } from '../utils/resolveUserPlan.js';
import {
  sendSuccess,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
  sendServiceUnavailable,
  sendConflict,
  asyncHandler
} from '../utils/apiResponse.js';
import {
  createStandardAccountLink,
  isStripeOAuthConfigured,
  initiateStripeOAuth
} from '../services/payments/StripeConnectService.js';
import {
  getApiOrigin,
  getFrontendOrigin,
  resolveOwnedSiteId,
  getPaymentConnectStatus,
  normalizeApplyTo,
  deactivateProcessor
} from '../services/payments/processorConnectHelpers.js';
import { resolveStripeRedirectUrl, subscriptionCheckoutUrls } from '../utils/stripeReturnUrls.js';
import { livePublishedPath } from '../../src/utils/visitorExperience.js';
import { fulfillPlatformSubscription } from '../services/payments/fulfillPlatformSubscription.js';
import { stripeSubscriptionLineItem, STRIPE_TRIAL_DAYS, normalizePaidPlan, CUSTOMER_LABOR_SKUS, isCustomerLaborSkuConfigured } from '../config/platformPlans.js';
import { createLaborCheckout } from '../services/labor/laborCheckoutService.js';
import { countBillablePublishedSites, countPaidSiteSlots, hasActiveLiveTrialSite } from '../services/subscriptionService.js';

const router = express.Router();
const INVALID_PAID_PLAN = 'Invalid plan. Must be "starter", "growth", or "growth_managed"';

/**
 * Middleware: Require Growth plan for payments
 * Checks plan from site owner, not the customer making the purchase
 */
async function requireProPlan(req, res, next) {
  try {
    const siteId = req.body?.siteId || req.query?.siteId;
    
    if (!siteId) {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return sendBadRequest(res, 'Site ID is required', 'MISSING_SITE_ID');
      }

      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { plan: true, subscription_plan: true }
      });

      const limits = resolvePlanLimits(user);

      if (!limits.payments) {
        return sendForbidden(res, 'Online payments require Growth plan', 'GROWTH_PLAN_REQUIRED');
      }

      return next();
    }

    // Check site owner's plan
    const site = await prisma.sites.findUnique({
      where: { id: siteId },
      select: { 
        user_id: true,
        plan: true,
        users: {
          select: { plan: true, subscription_plan: true }
        }
      }
    });

    if (!site) {
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }

    const limits = resolvePlanLimits(site.users || { plan: site.plan });

    if (!limits.payments) {
      return sendForbidden(res, 'This site does not have online payments enabled. The site owner needs a Growth plan.', 'GROWTH_PLAN_REQUIRED');
    }

    next();
  } catch (error) {
    console.error('Error checking plan for payments:', error);
    return sendForbidden(res, 'Error checking plan', 'PLAN_CHECK_ERROR');
  }
}

// Stripe setup
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

// Allowed origins
const ALLOWED_ORIGINS = `${process.env.CORS_ORIGINS || ''},${process.env.ALLOWED_ORIGINS || ''}`
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

function getRequestOrigin(req) {
    const hdrOrigin = req.headers['origin'];
    if (typeof hdrOrigin === 'string' && hdrOrigin) return hdrOrigin;
    const ref = req.headers['referer'];
    if (typeof ref === 'string' && ref) {
        try { const u = new URL(ref); return `${u.protocol}//${u.host}`; } catch (_) { /* ignore */ }
    }
    return '';
}

function isAllowedOrigin(req) {
    if (process.env.NODE_ENV === 'test') return true;
    const origin = getRequestOrigin(req);
    if (!origin) return true; // Non-browser clients; allow
    const sameOrigin = `${req.protocol}://${req.get('host')}`;
    const allowed = [sameOrigin, ...ALLOWED_ORIGINS];
    return allowed.some(o => o && o.toLowerCase() === origin.toLowerCase());
}

// Payments config – expose if payments are enabled
router.get('/payments/config', asyncHandler(async (req, res) => {
    sendSuccess(res, {
        hasStripe: Boolean(stripe),
        publishableKey: STRIPE_PUBLISHABLE_KEY || undefined
    });
}));

// Create Checkout Session for Shopping Cart (Growth Feature)
router.post('/checkout/create-session', checkoutLimiter, orderLimiter, authenticateToken, requireProPlan, asyncHandler(async (req, res) => {
    if (!stripe) {
        return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
    }

    // Verify CAPTCHA
    const captchaResult = await verifyTurnstile(req.body.captchaToken, req.ip);
    if (!captchaResult.success && !captchaResult.skipped) {
        return sendBadRequest(res, 'CAPTCHA verification failed', 'CAPTCHA_FAILED');
    }

    const { items, siteId, successUrl, cancelUrl } = req.body;

    // Validate inputs
    if (!items || !Array.isArray(items) || items.length === 0) {
        return sendBadRequest(res, 'Items are required', 'MISSING_ITEMS');
    }

    if (!siteId) {
        return sendBadRequest(res, 'Site ID is required', 'MISSING_SITE_ID');
    }

    // Verify site belongs to user
    // Using user_id as consistent with other routes
    const site = await prisma.sites.findFirst({
        where: {
            id: siteId,
            user_id: req.user.id
        }
    });

    if (!site) {
        return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }

    // Check if owner has Stripe Connect ready (charges_enabled)
    const owner = await prisma.users.findUnique({
        where: { id: req.user.id }
    });

    if (!owner?.stripe_account_id || !owner?.stripe_connected) {
        return sendBadRequest(res, 'Stripe Connect is not set up. Please complete your payment setup first.', 'STRIPE_CONNECT_REQUIRED');
    }

    // Verify account is live with Stripe
    try {
        const account = await stripe.accounts.retrieve(owner.stripe_account_id);
        if (!account.charges_enabled) {
            return sendBadRequest(res, 'Stripe account is not ready to accept charges. Please complete your setup.', 'STRIPE_CONNECT_REQUIRED');
        }
    } catch (error) {
        console.error('Failed to verify Stripe account:', error);
        return sendBadRequest(res, 'Unable to verify Stripe account status', 'STRIPE_CONNECT_REQUIRED');
    }

    const stripeAccountId = owner.stripe_account_id;

    // Build line items for Stripe
    const lineItems = items.map(item => ({
        price_data: {
            currency: 'usd',
            product_data: {
                name: item.name,
                description: item.description || '',
                images: item.image ? [item.image] : [],
                metadata: {
                    product_id: item.id,
                    options: JSON.stringify(item.options || {})
                }
            },
            unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity || 1,
    }));

    // Calculate platform fee (10% commission)
    const total = items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);
    const platformFee = Math.round(total * 100 * 0.10); // 10% in cents

    // Create Stripe session
    const sessionParams = {
        payment_method_types: ['card', 'paypal', 'link'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: siteId,
        metadata: {
            site_id: siteId,
            user_id: req.user.id,
            order_items: JSON.stringify(items)
        },
        billing_address_collection: 'auto',
        ...(platformFee > 0 && {
            payment_intent_data: {
                application_fee_amount: platformFee
            }
        })
    };

    const livePath = livePublishedPath(site.subdomain || siteId) || `/view/${encodeURIComponent(site.subdomain || siteId)}`;
    sessionParams.success_url = resolveStripeRedirectUrl(
        req,
        successUrl,
        `${livePath}?order=success`
    );
    sessionParams.cancel_url = resolveStripeRedirectUrl(
        req,
        cancelUrl,
        `${livePath}?order=cancelled`
    );

    // Direct charge on the owner's Standard account — funds never settle on SiteSprintz
    const session = await stripe.checkout.sessions.create(sessionParams, {
        stripeAccount: stripeAccountId
    });

    console.log('✅ Checkout session created:', session.id, 'for user:', req.user.email);

    sendSuccess(res, {
        id: session.id,
        url: session.url
    });
}));

// Create a Checkout Session for a product with dynamic pricing and Stripe Connect support
router.post('/payments/checkout-sessions', checkoutLimiter, orderLimiter, requireProPlan, asyncHandler(async (req, res) => {
    if (!stripe) {
        return sendServiceUnavailable(res, 'Payments not configured', 'STRIPE_NOT_CONFIGURED');
    }

    // Verify CAPTCHA
    const captchaResult = await verifyTurnstile(req.body.captchaToken, req.ip);
    if (!captchaResult.success && !captchaResult.skipped) {
        return sendBadRequest(res, 'CAPTCHA verification failed', 'CAPTCHA_FAILED');
    }

    if (!isAllowedOrigin(req)) {
        return sendForbidden(res, 'Origin not allowed', 'ORIGIN_NOT_ALLOWED');
    }

    const { productIndex, quantity, currency, successUrl, cancelUrl, siteId } = req.body || {};
    const idx = Number(productIndex);
    if (!Number.isInteger(idx) || idx < 0) {
        return sendBadRequest(res, 'Invalid productIndex', 'INVALID_PRODUCT_INDEX');
    }

    // Load site data from database
    if (!siteId) {
        return sendBadRequest(res, 'siteId is required', 'MISSING_SITE_ID');
    }

    let siteData = null;
    let siteOwner = null;
    let liveSlug = siteId;

    try {
        const site = await prisma.sites.findUnique({
            where: { id: siteId },
            include: { users: true }
        });
        if (site) {
            siteData = typeof site.site_data === 'string' ? JSON.parse(site.site_data) : site.site_data;
            siteOwner = site.users;
            liveSlug = site.subdomain || siteId;
        }
    } catch (err) {
        console.error(`[Payments] Failed to find site by ID '${siteId}':`, err.message);
        return sendServerError(res, err, 'Failed to load site data');
    }

    if (!siteData) {
        return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }

    const products = Array.isArray(siteData.products) ? siteData.products : [];
    const product = products[idx];

    if (!product || typeof product.price !== 'number' || !product.name) {
        return sendBadRequest(res, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    const allowCheckout = siteData.settings?.allowCheckout !== false;
    if (!allowCheckout) {
        return sendForbidden(res, 'Checkout disabled for this site', 'CHECKOUT_DISABLED');
    }

    // Check if site owner has Stripe Connect ready (charges_enabled)
    if (!siteOwner?.stripe_account_id || !siteOwner?.stripe_connected) {
        return sendBadRequest(res, 'Stripe Connect is not set up for this site. The owner needs to complete their payment setup.', 'STRIPE_CONNECT_REQUIRED');
    }

    // Verify account is live with Stripe
    try {
        const account = await stripe.accounts.retrieve(siteOwner.stripe_account_id);
        if (!account.charges_enabled) {
            return sendBadRequest(res, 'Site owner\'s Stripe account is not ready to accept charges. Please try again later.', 'STRIPE_CONNECT_REQUIRED');
        }
    } catch (error) {
        console.error('Failed to verify Stripe account:', error);
        return sendBadRequest(res, 'Unable to verify Stripe account status', 'STRIPE_CONNECT_REQUIRED');
    }

    const unitAmountCents = Math.round(product.price * 100);
    if (unitAmountCents < 50) {
        return sendBadRequest(res, 'Amount too low', 'AMOUNT_TOO_LOW');
    }

        const qty = Math.max(1, Number(quantity) || 1);
        const curr = (currency || 'usd').toLowerCase();

        // Determine return URLs
        const sitePath = livePublishedPath(liveSlug) || `/view/${encodeURIComponent(liveSlug)}`;
        const success = resolveStripeRedirectUrl(req, successUrl, `${sitePath}?order=success`);
        const cancel = resolveStripeRedirectUrl(req, cancelUrl, `${sitePath}?order=cancelled`);

        // Check if site owner has Stripe Connect configured
        let stripeAccountId = null;
        if (siteOwner && siteOwner.stripe_account_id && siteOwner.stripe_connected) {
            stripeAccountId = siteOwner.stripe_account_id;
        } else if (siteData.ownerEmail) {
            // Fallback to file-based user lookup if not found via relation
            const user = await prisma.users.findUnique({
                where: { email: siteData.ownerEmail }
            });
            if (user && user.stripe_account_id && user.stripe_connected) {
                stripeAccountId = user.stripe_account_id;
            }
        }

        // Idempotency key
        const incomingIdem = (req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || req.body?.idempotencyKey);
        const idempotencyKey = typeof incomingIdem === 'string' && incomingIdem
            ? incomingIdem
            : (typeof nodeRandomUUID === 'function' ? nodeRandomUUID() : `${Date.now()}-${Math.random()}`);

        // Create session - use Connect account if available
        const sessionOptions = {
            mode: 'payment',
            line_items: [
                {
                    quantity: qty,
                    price_data: {
                        currency: curr,
                        unit_amount: unitAmountCents,
                        product_data: {
                            name: String(product.name).slice(0, 250),
                            description: product.description ? String(product.description).slice(0, 500) : undefined
                        }
                    }
                }
            ],
            success_url: success,
            cancel_url: cancel,
            allow_promotion_codes: false,
            automatic_tax: { enabled: false }, // Disabled for test/demo mode to avoid origin configuration errors
            metadata: {
                siteId: siteId ? String(siteId) : '',
                productIndex: String(idx)
            }
        };

        const createOptions = { idempotencyKey };

        // If connected account exists, use it
        if (stripeAccountId) {
            createOptions.stripeAccount = stripeAccountId;
            console.log(`Creating checkout on connected account: ${stripeAccountId}`);
        } else {
            return sendBadRequest(res, 'Stripe Connect is not set up for this site. Visitors can pay on site.', 'STRIPE_CONNECT_REQUIRED');
        }

    const session = await stripe.checkout.sessions.create(sessionOptions, createOptions);

    return sendSuccess(res, { url: session.url });
}));

// Create Checkout Session for subscription (Starter/Growth plans)
const createSubscriptionCheckout = asyncHandler(async (req, res) => {
    if (!stripe) {
        return sendServiceUnavailable(res, 'Stripe not configured. Add STRIPE_SECRET_KEY to .env', 'STRIPE_NOT_CONFIGURED');
    }

        const { plan: rawPlan, draftId, successUrl, cancelUrl, additionalSite } = req.body;
        const userEmail = req.user.email;
        const plan = normalizePaidPlan(rawPlan);

        if (!plan) {
            return sendBadRequest(res, INVALID_PAID_PLAN, 'INVALID_PLAN');
        }

        const redirects = subscriptionCheckoutUrls(req, {
            plan,
            draftId,
            successUrl,
            cancelUrl,
        });

        const dbUser = await prisma.users.findUnique({
            where: { email: userEmail },
            select: {
                stripe_customer_id: true,
                id: true,
                role: true,
                subscription_status: true,
                stripe_subscription_id: true,
            },
        });

        const buyingAdditionalSite = additionalSite === true || additionalSite === 'true';

        if (
            !buyingAdditionalSite
            && dbUser?.stripe_subscription_id
            && ['active', 'trialing'].includes(dbUser.subscription_status)
        ) {
            return sendConflict(
                res,
                'You already have an active subscription. Manage it in the billing portal.',
                'ALREADY_SUBSCRIBED',
            );
        }

        if (buyingAdditionalSite && dbUser?.id) {
            const publishedCount = await countBillablePublishedSites(dbUser.id);
            const paidSlots = await countPaidSiteSlots(dbUser);
            if (paidSlots !== -1 && publishedCount < paidSlots) {
                return sendConflict(
                    res,
                    'You already have an unused site slot. Publish this site without paying again.',
                    'SITE_SLOT_AVAILABLE',
                );
            }
        }

        let customerId = dbUser?.stripe_customer_id || null;
        if (customerId) {
            try {
                await stripe.customers.retrieve(customerId);
            } catch {
                customerId = null;
            }
        }

        if (!customerId) {
            const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
            if (existingCustomers.data.length > 0) {
                customerId = existingCustomers.data[0].id;
            } else {
                const created = await stripe.customers.create({
                    email: userEmail,
                    metadata: {
                        source: 'sitesprintz',
                        signupDate: new Date().toISOString(),
                    },
                });
                customerId = created.id;
            }
        }

        await prisma.users.update({
            where: { email: userEmail },
            data: { stripe_customer_id: customerId },
        });

        const userId = req.user.id;

        const lineItems = [stripeSubscriptionLineItem(plan)];

        const automaticTaxEnabled = process.env.STRIPE_AUTOMATIC_TAX === 'true';

        const checkoutTrialDays = buyingAdditionalSite
            ? 0
            : (dbUser?.id && await hasActiveLiveTrialSite(dbUser.id) ? 0 : STRIPE_TRIAL_DAYS);

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            client_reference_id: userId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: lineItems,
            success_url: redirects.successUrl,
            cancel_url: redirects.cancelUrl,
            allow_promotion_codes: true,
            billing_address_collection: automaticTaxEnabled ? 'required' : 'auto',
            automatic_tax: { enabled: automaticTaxEnabled },
            subscription_data: {
                ...(checkoutTrialDays > 0 ? { trial_period_days: checkoutTrialDays } : {}),
                metadata: {
                    plan,
                    userId,
                    ...(buyingAdditionalSite ? { additionalSite: 'true' } : {}),
                },
            },
            metadata: {
                plan,
                userId,
                user_email: userEmail,
                draft_id: draftId || '',
                source: buyingAdditionalSite ? 'sitesprintz_additional_site' : 'sitesprintz_subscription',
                ...(buyingAdditionalSite ? { additionalSite: 'true' } : {}),
            },
        }, {
            idempotencyKey: buyingAdditionalSite
                ? `plat-sub:${userId}:${plan}:additional:${draftId || 'site'}`
                : `plat-sub:${userId}:${plan}`,
        });

    sendSuccess(res, { sessionId: session.id, url: session.url });
});

router.post('/payments/create-subscription-checkout', checkoutLimiter, requireAuth, createSubscriptionCheckout);
router.post('/create-subscription-checkout', checkoutLimiter, requireAuth, createSubscriptionCheckout);

const createLaborCheckoutHandler = asyncHandler(async (req, res) => {
    if (!stripe) {
        return sendServiceUnavailable(res, 'Stripe not configured. Add STRIPE_SECRET_KEY to .env', 'STRIPE_NOT_CONFIGURED');
    }

    try {
        const result = await createLaborCheckout({
            user: { id: req.user.id, email: req.user.email },
            sku: req.body?.sku,
            siteId: req.body?.siteId,
            req,
            stripe,
            prisma,
            resolveOwnedSiteId,
        });
        return sendSuccess(res, result);
    } catch (err) {
        if (err.code === 'INVALID_LABOR_SKU') {
            return sendBadRequest(res, 'Unknown labor SKU', 'INVALID_LABOR_SKU');
        }
        if (err.code === 'LABOR_PRICE_NOT_CONFIGURED') {
            return sendServiceUnavailable(res, 'Labor extras are not configured', 'LABOR_PRICE_NOT_CONFIGURED');
        }
        if (err.code === 'SITE_NOT_OWNED') {
            return sendForbidden(res, 'Site not found', 'SITE_NOT_OWNED');
        }
        throw err;
    }
});

router.post('/payments/labor-checkout', checkoutLimiter, requireAuth, createLaborCheckoutHandler);

router.get('/payments/labor-skus', requireAuth, asyncHandler(async (_req, res) => {
    const skus = {};
    for (const id of CUSTOMER_LABOR_SKUS) {
        skus[id] = isCustomerLaborSkuConfigured(id);
    }
    return sendSuccess(res, { skus });
}));

const confirmCheckoutSession = asyncHandler(async (req, res) => {
    if (!stripe) {
        return sendServiceUnavailable(res, 'Stripe not configured. Add STRIPE_SECRET_KEY to .env', 'STRIPE_NOT_CONFIGURED');
    }

    const { sessionId } = req.body;
    if (!sessionId || typeof sessionId !== 'string') {
        return sendBadRequest(res, 'sessionId is required', 'MISSING_SESSION_ID');
    }
    if (!sessionId.startsWith('cs_')) {
        return sendBadRequest(res, 'Invalid checkout session id', 'INVALID_SESSION_ID');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const sessionUserId = session.metadata?.userId || session.client_reference_id;
    if (!sessionUserId || sessionUserId !== req.user.id) {
        return sendForbidden(res, 'Checkout session does not belong to this user', 'SESSION_USER_MISMATCH');
    }

    if (session.metadata?.source === 'labor_extra') {
        return sendSuccess(res, { labor: true, granted: false });
    }

    if (session.mode !== 'subscription') {
        return sendBadRequest(res, 'Not a subscription checkout session', 'INVALID_SESSION_MODE');
    }

    const paid = session.payment_status === 'paid'
        || session.payment_status === 'no_payment_required';
    if (session.status !== 'complete' || !paid) {
        return sendBadRequest(res, 'Checkout session is not complete', 'CHECKOUT_INCOMPLETE');
    }

    if (session.metadata?.user_email) {
        const metaEmail = session.metadata.user_email.toLowerCase();
        const userEmail = (req.user.email || '').toLowerCase();
        if (metaEmail !== userEmail) {
            return sendForbidden(res, 'Checkout session does not belong to this user', 'SESSION_USER_MISMATCH');
        }
    }

    const result = await fulfillPlatformSubscription(session, { db: prisma, stripe });
    if (!result.fulfilled) {
        return sendServerError(res, 'Could not activate subscription', 'FULFILL_FAILED');
    }

    sendSuccess(res, { plan: result.plan, status: result.status });
});

router.post('/payments/confirm-checkout-session', checkoutLimiter, requireAuth, confirmCheckoutSession);
router.post('/confirm-checkout-session', checkoutLimiter, requireAuth, confirmCheckoutSession);

// Create Setup Intent for trial payment method collection
router.post('/trial/setup-intent', requireAuth, asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendServiceUnavailable(res, 'Stripe not configured. Add STRIPE_SECRET_KEY to .env', 'STRIPE_NOT_CONFIGURED');
  }

  const userEmail = req.user.email;
  const { plan: rawPlan } = req.body;
  const plan = normalizePaidPlan(rawPlan);

  if (!plan) {
    return sendBadRequest(res, INVALID_PAID_PLAN, 'INVALID_PLAN');
  }

  // Create or retrieve Stripe customer
  let customer;
  const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });

  if (existingCustomers.data.length > 0) {
    customer = existingCustomers.data[0];
  } else {
    customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        source: 'sitesprintz',
        signupDate: new Date().toISOString()
      }
    });
  }

  // Save customer ID to user record
  await prisma.users.update({
    where: { email: userEmail },
    data: { stripe_customer_id: customer.id }
  });

  // Create Setup Intent to collect payment method
  const setupIntent = await stripe.setupIntents.create({
    customer: customer.id,
    payment_method_types: ['card'],
    usage: 'off_session', // For future payments
    metadata: {
      plan,
      user_email: userEmail,
      purpose: 'trial_payment_method'
    }
  });

  console.log(`Created Setup Intent ${setupIntent.id} for trial - user: ${userEmail}, plan: ${plan}`);
  sendSuccess(res, {
    clientSecret: setupIntent.client_secret,
    setupIntentId: setupIntent.id
  });
}));

// Create subscription with trial period
router.post('/trial/create-subscription', requireAuth, asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendServiceUnavailable(res, 'Stripe not configured. Add STRIPE_SECRET_KEY to .env', 'STRIPE_NOT_CONFIGURED');
  }

  const userEmail = req.user.email;
  const { plan: rawPlan, paymentMethodId, draftId } = req.body;
  const plan = normalizePaidPlan(rawPlan);

  if (!plan) {
    return sendBadRequest(res, INVALID_PAID_PLAN, 'INVALID_PLAN');
  }

  if (!paymentMethodId) {
    return sendBadRequest(res, 'Payment method ID is required', 'MISSING_PAYMENT_METHOD');
  }

  // Get or create customer
  const user = await prisma.users.findUnique({
    where: { email: userEmail },
    select: { stripe_customer_id: true }
  });

  let customerId = user?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        source: 'sitesprintz',
        signupDate: new Date().toISOString()
      }
    });
    customerId = customer.id;

    await prisma.users.update({
      where: { email: userEmail },
      data: { stripe_customer_id: customerId }
    });
  }

  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });

  // Set as default payment method
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId
    }
  });

  // Create subscription with 7-day trial
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [stripeSubscriptionLineItem(plan)],
    trial_period_days: STRIPE_TRIAL_DAYS,
    payment_behavior: 'default_incomplete',
    payment_settings: {
      payment_method_types: ['card'],
      save_default_payment_method: 'on_subscription'
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      plan,
      user_email: userEmail,
      draft_id: draftId || '',
      source: 'sitesprintz_trial',
      trial_start: new Date().toISOString()
    }
  });

  // Update user with subscription info (keep plan fields in sync)
  await prisma.users.update({
    where: { email: userEmail },
    data: {
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      plan: plan,
      subscription_plan: plan,
      current_period_end: new Date(subscription.current_period_end * 1000)
    }
  });

  console.log(`Created trial subscription ${subscription.id} for ${userEmail}, plan: ${plan}`);
  sendSuccess(res, {
    subscriptionId: subscription.id,
    status: subscription.status,
    trialEnd: new Date(subscription.trial_end * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
  });
}));

// Create billing portal session
const createPortalSessionHandler = asyncHandler(async (req, res) => {
    if (!stripe) {
        return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
    }

    const { returnUrl } = req.body;
    const userEmail = req.user.email;
    const portalReturnUrl = resolveStripeRedirectUrl(req, returnUrl, '/settings/billing');

    const dbUser = await prisma.users.findUnique({
        where: { email: userEmail },
        select: { stripe_customer_id: true }
    });

    // Get or create Stripe customer ID for user
    let stripeCustomerId = dbUser?.stripe_customer_id;
    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            email: userEmail
        });
        stripeCustomerId = customer.id;
        await prisma.users.update({
            where: { email: userEmail },
            data: { stripe_customer_id: stripeCustomerId }
        });
    }

    const portalSessionOptions = {
        customer: stripeCustomerId,
        return_url: portalReturnUrl,
    };

    if (process.env.STRIPE_PORTAL_CONFIGURATION_ID) {
        portalSessionOptions.configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    }

    const session = await stripe.billingPortal.sessions.create(portalSessionOptions);

    sendSuccess(res, { url: session.url });
});

router.post('/create-portal-session', requireAuth, createPortalSessionHandler);
router.post('/payments/create-portal-session', requireAuth, createPortalSessionHandler);

// Get user's subscription status
router.get('/subscription/status', requireAuth, asyncHandler(async (req, res) => {
    const userEmail = req.user.email;

    // Load user data from DB
    const user = await prisma.users.findUnique({
        where: { email: userEmail }
    });

    if (!user) {
        return sendSuccess(res, { hasSubscription: false, plan: 'trial' });
    }

    // Check if user has subscription data
    if (!user.stripe_subscription_id) {
        return sendSuccess(res, { hasSubscription: false, plan: 'trial' });
    }

    // Verify subscription status with Stripe
    if (stripe && user.stripe_subscription_id) {
        try {
            const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

            // Update local data if different
            if (subscription.status !== user.subscription_status) {
                await prisma.users.update({
                    where: { email: userEmail },
                    data: { subscription_status: subscription.status }
                });
            }

            return sendSuccess(res, {
                hasSubscription: subscription.status === 'active' || subscription.status === 'trialing',
                plan: user.plan || 'trial',
                status: subscription.status,
                currentPeriodEnd: subscription.current_period_end,
                cancelAtPeriodEnd: subscription.cancel_at_period_end
            });
        } catch (error) {
            console.error('Error fetching subscription from Stripe:', error);
        }
    }

    // Fallback to local data
    sendSuccess(res, {
        hasSubscription: user.subscription_status === 'active',
        plan: user.plan || 'free',
        status: user.subscription_status
    });
}));

// ==================== STRIPE CONNECT ROUTES ====================

// Initiate Stripe Connect onboarding (Standard accounts only — Stripe hosts KYC)
router.post('/connect/onboard', requireAuth, asyncHandler(async (req, res) => {
    if (!stripe) {
        return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
    }

    const userEmail = req.user.email;

    const user = await prisma.users.findUnique({
        where: { email: userEmail }
    });

    if (!user) {
        return sendNotFound(res, 'User', 'USER_NOT_FOUND');
    }

    const limits = resolvePlanLimits(user);
    if (!limits.payments) {
        return sendForbidden(res, 'Stripe Connect requires Growth subscription', 'PLAN_REQUIRED', {
            currentPlan: user.plan || 'trial'
        });
    }

    const origin = getFrontendOrigin(req);
    const siteId = await resolveOwnedSiteId(user.id, req.body?.siteId);
    const applyTo = normalizeApplyTo(req.body?.applyTo);

    // Prefer OAuth so owners connect an existing Stripe account in one click.
    if (isStripeOAuthConfigured() && !user.stripe_account_id) {
        const redirectUri = `${getApiOrigin(req)}/api/connect/stripe/callback`;
        const { authorizeUrl } = await initiateStripeOAuth(user.id, siteId, redirectUri, applyTo);
        return sendSuccess(res, {
            url: authorizeUrl,
            method: 'oauth'
        });
    }

    const { url, accountId } = await createStandardAccountLink({ user, origin, siteId, applyTo });
    sendSuccess(res, {
        url,
        accountId,
        method: 'account_link'
    });
}));

// Get Stripe Connect status
router.get('/connect/status', requireAuth, asyncHandler(async (req, res) => {
    const payload = await getPaymentConnectStatus(req.user.id, req.query.siteId);
    return sendSuccess(res, payload);
}));

// Refresh Connect account link (if onboarding incomplete)
router.post('/connect/refresh', requireAuth, asyncHandler(async (req, res) => {
    if (!stripe) {
        return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
    }

    const userEmail = req.user.email;
    const user = await prisma.users.findUnique({
        where: { email: userEmail }
    });

    if (!user) {
        return sendNotFound(res, 'User', 'USER_NOT_FOUND');
    }

    if (!user.stripe_account_id) {
        return sendBadRequest(res, 'No Connect account found. Please start onboarding first.', 'NO_CONNECT_ACCOUNT');
    }

    const origin = getFrontendOrigin(req);
    const accountLink = await stripe.accountLinks.create({
        account: user.stripe_account_id,
        refresh_url: `${origin}/settings/payments?connect=refresh&processor=stripe`,
        return_url: `${origin}/settings/payments?connect=success&processor=stripe`,
        type: 'account_onboarding',
    });

    sendSuccess(res, { url: accountLink.url });
}));

// Disconnect Stripe Connect account
router.post('/connect/disconnect', requireAuth, asyncHandler(async (req, res) => {
    const userEmail = req.user.email;
    const user = await prisma.users.findUnique({
        where: { email: userEmail }
    });

    if (!user) {
        return sendNotFound(res, 'User', 'USER_NOT_FOUND');
    }

    const siteId = await resolveOwnedSiteId(user.id, req.body?.siteId);
    await deactivateProcessor({
        siteId,
        userId: user.id,
        processor: 'stripe',
        applyTo: normalizeApplyTo(req.body?.applyTo)
    });

    sendSuccess(res, { siteId }, 'Stripe disconnected from this site');
}));

// Create checkout session with connected account (for customer purchases)
router.post('/connect/create-checkout', checkoutLimiter, orderLimiter, requireProPlan, asyncHandler(async (req, res) => {
    if (!stripe) {
        return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
    }

    // Verify CAPTCHA
    const captchaResult = await verifyTurnstile(req.body.captchaToken, req.ip);
    if (!captchaResult.success && !captchaResult.skipped) {
        return sendBadRequest(res, 'CAPTCHA verification failed', 'CAPTCHA_FAILED');
    }

    const { connectedAccountId, lineItems, metadata, successUrl, cancelUrl } = req.body;

    if (!connectedAccountId) {
        return sendBadRequest(res, 'Connected account ID required', 'MISSING_ACCOUNT_ID');
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
        return sendBadRequest(res, 'Line items required', 'MISSING_LINE_ITEMS');
    }

    // Verify the connected account exists and is active
    const account = await stripe.accounts.retrieve(connectedAccountId);
    if (!account.charges_enabled) {
        return sendBadRequest(res, 'Connected account cannot accept charges', 'ACCOUNT_NOT_READY');
    }

    // Calculate platform fee (1% of total, min $0.50, max $5.00)
    const total = lineItems.reduce((sum, item) => {
        return sum + (item.price_data.unit_amount * item.quantity);
    }, 0);
    const platformFee = Math.min(Math.max(Math.round(total * 0.01), 50), 500);

    // Create checkout session on behalf of connected account
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        success_url: resolveStripeRedirectUrl(
            req,
            successUrl,
            '/payment-success?session_id={CHECKOUT_SESSION_ID}'
        ),
        cancel_url: resolveStripeRedirectUrl(req, cancelUrl, '/payment-cancel'),
        payment_intent_data: {
            application_fee_amount: platformFee,
            metadata: {
                ...metadata,
                platform: 'sitesprintz'
            }
        },
        metadata: {
            ...metadata,
            connectedAccountId
        }
    }, {
        stripeAccount: connectedAccountId // Create on behalf of connected account
    });

    console.log(`Created Connect checkout session ${session.id} for account ${connectedAccountId}`);
    console.log(`Platform fee: $${(platformFee / 100).toFixed(2)}`);

    sendSuccess(res, {
        sessionId: session.id,
        url: session.url,
        platformFee: platformFee / 100
    });
}));

export default router;
