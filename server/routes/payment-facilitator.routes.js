import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ProductCatalogService } from '../services/ProductCatalogService.js';
import { prisma } from '../../database/db.js';
import {
  sendSuccess,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
  asyncHandler
} from '../utils/apiResponse.js';

const router = express.Router();

/**
 * PAYMENT FACILITATOR ROUTES
 * 
 * These routes allow owners to:
 * 1. Detect existing payment accounts (Stripe, Square, PayPal)
 * 2. Link existing accounts to SiteSprintz
 * 3. Configure which payment provider each site uses
 * 4. Redirect customers directly to payment processors
 */

// ==================== DETECTION ====================

/**
 * GET /api/payments/detect
 * Scan for existing payment setups across the user's accounts
 */
router.get('/detect', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const detected = {
    stripe: [],
    square: null,
    paypal: null,
    shopify: null
  };

  // Check for existing Stripe connections
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      stripe_account_id: true,
      stripe_connected: true,
      plan: true
    }
  });

  if (user?.stripe_account_id) {
    detected.stripe.push({
      accountId: user.stripe_account_id,
      connected: user.stripe_connected,
      isDefault: true
    });
  }

  // Check for site-level payment processor credentials
  const siteCredentials = await prisma.payment_processor_credentials.findMany({
    where: {
      sites: {
        user_id: userId
      }
    },
    select: {
      processor: true,
      account_id: true,
      is_active: true,
      connected_at: true,
      site_id: true
    }
  });

  // Group by processor
  const byProcessor = {};
  siteCredentials.forEach(cred => {
    if (!byProcessor[cred.processor]) {
      byProcessor[cred.processor] = [];
    }
    byProcessor[cred.processor].push({
      accountId: cred.account_id,
      siteId: cred.site_id,
      isActive: cred.is_active,
      connectedAt: cred.connected_at
    });
  });

  // Add to detected
  if (byProcessor.square) detected.square = byProcessor.square;
  if (byProcessor.paypal) detected.paypal = byProcessor.paypal;
  if (byProcessor.shopify) detected.shopify = byProcessor.shopify;
  if (byProcessor.stripe && byProcessor.stripe.length > detected.stripe.length) {
    detected.stripe = byProcessor.stripe;
  }

  sendSuccess(res, { detected });
}));

// ==================== LINKING ====================

/**
 * POST /api/payments/link-existing
 * Disabled: pasting account IDs does not prove ownership and puts the
 * platform in an audit position. Owners must connect via OAuth.
 */
router.post('/link-existing', requireAuth, asyncHandler(async (_req, res) => {
  return sendBadRequest(
    res,
    'Connect Stripe, Square, or PayPal with one click. Pasting account IDs is not supported.',
    'OAUTH_REQUIRED'
  );
}));

// ==================== SITE CONFIGURATION ====================

/**
 * PUT /api/payments/configure-site
 * Set which payment provider a site uses
 */
router.put('/configure-site', requireAuth, asyncHandler(async (req, res) => {
  const { siteId, provider, accountId } = req.body;
  const userId = req.user.id;

  if (!siteId || !provider || !accountId) {
    return sendBadRequest(res, 'siteId, provider, and accountId required', 'MISSING_PARAMS');
  }

  // Verify user owns site
  const site = await prisma.sites.findUnique({
    where: { id: siteId },
    select: { user_id: true }
  });

  if (!site || site.user_id !== userId) {
    return sendForbidden(res, 'You do not own this site');
  }

  // Verify connection exists
  const connection = await prisma.payment_processor_credentials.findFirst({
    where: {
      site_id: siteId,
      processor: provider,
      account_id: accountId,
      is_active: true
    }
  });

  if (!connection) {
    return sendBadRequest(res, 
      `${provider} account ${accountId} not found or inactive`,
      'CONNECTION_NOT_FOUND'
    );
  }

  // Set as active payment method for site
  await prisma.site_payment_method.upsert({
    where: { site_id: siteId },
    update: {
      provider,
      account_id: accountId,
      is_active: true,
      updated_at: new Date()
    },
    create: {
      site_id: siteId,
      provider,
      account_id: accountId,
      is_active: true
    }
  });

  console.log(`✅ Site ${siteId} configured to use ${provider}: ${accountId}`);

  sendSuccess(res, {
    message: 'Payment method configured',
    siteId,
    provider,
    accountId
  });
}));

/**
 * GET /api/payments/site-methods/:siteId
 * Get available payment methods for a site
 */
router.get('/site-methods/:siteId', asyncHandler(async (req, res) => {
  const { siteId } = req.params;

  const site = await prisma.sites.findUnique({
    where: { id: siteId },
    select: { user_id: true, payment_method: true }
  });

  if (!site) {
    return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
  }

  // Get all available connections for this site
  const credentials = await prisma.payment_processor_credentials.findMany({
    where: {
      site_id: siteId,
      is_active: true
    },
    select: {
      processor: true,
      account_id: true,
      connected_at: true,
      metadata: true
    }
  });

  sendSuccess(res, {
    site: {
      id: siteId,
      activeMethod: site.payment_method
    },
    availableMethods: credentials
  });
}));

// ==================== CHECKOUT ROUTING ====================

/**
 * POST /api/payments/checkout/create-session
 * Main checkout endpoint - routes to correct payment processor
 */
router.post('/checkout/create-session', asyncHandler(async (req, res) => {
  const { siteId, items, successUrl, cancelUrl, fulfillment, deliveryAddress, deliveryAddressLine2 } = req.body;

  if (!siteId || !items?.length) {
    return sendBadRequest(res, 'Invalid request', 'INVALID_REQUEST');
  }

  // Get site + active payment method
  const site = await prisma.sites.findUnique({
    where: { id: siteId },
    include: {
      users: {
        select: {
          email: true,
          stripe_account_id: true,
          stripe_connected: true
        }
      }
    }
  });

  if (!site) {
    return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
  }

  const paymentMethod = await prisma.site_payment_method.findUnique({
    where: { site_id: siteId }
  });

  if (!paymentMethod?.is_active) {
    return sendBadRequest(res,
      'Payments not configured for this site',
      'PAYMENT_NOT_CONFIGURED'
    );
  }

  // Route to appropriate processor
  const { provider, account_id } = paymentMethod;

  try {
    if (provider === 'stripe') {
      return await handleStripeCheckout(
        req,
        res,
        site,
        account_id,
        items,
        successUrl,
        cancelUrl,
        { fulfillment, deliveryAddress, deliveryAddressLine2 }
      );
    }

    if (provider === 'square') {
      return await handleSquareCheckout(
        req,
        res,
        site,
        account_id,
        items,
        successUrl,
        cancelUrl,
        { fulfillment, deliveryAddress, deliveryAddressLine2 }
      );
    }

    if (provider === 'paypal') {
      return await handlePayPalCheckout(req, res, site, account_id, items, successUrl, cancelUrl);
    }

    if (provider === 'shopify') {
      return await handleShopifyCheckout(req, res, site, items, successUrl, cancelUrl);
    }

    return sendBadRequest(res, 'Unknown payment provider', 'UNKNOWN_PROVIDER');
  } catch (error) {
    console.error(`${provider} checkout error:`, error);
    return sendServerError(res, error, `Failed to create ${provider} session`);
  }
}));

// ==================== PROCESSOR HANDLERS ====================

/**
 * Stripe: Create checkout session and return redirect URL
 */
async function handleStripeCheckout(
  req,
  res,
  site,
  stripeAccountId,
  items,
  successUrl,
  cancelUrl,
  deliveryOptions = {}
) {
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  const { buildDeliveryCharge } = await import('../utils/delivery.js');
  const { parseSiteData } = await import('../utils/parseSiteData.js');
  const siteData = parseSiteData(site);

  // Verify account is live
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    if (!account.charges_enabled) {
      return sendBadRequest(res,
        'Stripe account not ready for charges',
        'STRIPE_NOT_READY'
      );
    }
  } catch (error) {
    console.error('Stripe account verification failed:', error);
    return sendBadRequest(res, 'Unable to verify Stripe account', 'STRIPE_VERIFY_FAILED');
  }

  // Validate and rebuild checkout with server-side prices and stock
  let rebuiltCheckout;
  try {
    const catalogService = new ProductCatalogService();
    rebuiltCheckout = await catalogService.validateAndRebuildCheckout(items, site.id, siteData);
  } catch (error) {
    console.error('Checkout validation failed:', error.message);
    return sendBadRequest(res, error.message, 'INVALID_CHECKOUT');
  }

  // Build line items from the validated catalog items
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

  const deliveryCharge = await buildDeliveryCharge(siteData, {
    fulfillment: deliveryOptions.fulfillment,
    address: deliveryOptions.deliveryAddress,
    addressLine2: deliveryOptions.deliveryAddressLine2,
  });
  if (!deliveryCharge.ok) {
    return sendBadRequest(res, deliveryCharge.error, deliveryCharge.code || 'INVALID_DELIVERY');
  }
  if (deliveryCharge.fee > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Delivery' },
        unit_amount: Math.round(deliveryCharge.fee * 100),
      },
      quantity: 1,
    });
  }

  // Create session on Stripe
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      siteId: site.id,
      userId: site.user_id,
      // Snake_case keys for webhookProcessor fulfill (neighbor: stripe.routes.js)
      site_id: site.id,
      user_id: site.user_id || '',
      order_items: JSON.stringify(rebuiltCheckout.items),
      type: 'order',
      fulfillment_type: deliveryCharge.fulfillmentType,
      ...(deliveryCharge.shippingAddress
        ? { shipping_address: JSON.stringify(deliveryCharge.shippingAddress) }
        : {}),
    }
  }, {
    stripeAccount: stripeAccountId
  });

  console.log(`✅ Stripe session created: ${session.id} for site: ${site.id}`);

  sendSuccess(res, {
    redirectUrl: session.url,
    sessionId: session.id,
    provider: 'stripe'
  });
}

/**
 * Square: Create checkout link and return redirect URL
 * Neighbor: handleStripeCheckout — same validate/rebuild + delivery; factory instead of raw SDK
 */
async function handleSquareCheckout(
  req,
  res,
  site,
  _squareAccountId,
  items,
  successUrl,
  cancelUrl,
  deliveryOptions = {}
) {
  const { PaymentServiceFactory } = await import('../services/payments/PaymentServiceFactory.js');
  const { buildDeliveryCharge } = await import('../utils/delivery.js');
  const { parseSiteData } = await import('../utils/parseSiteData.js');
  const siteData = parseSiteData(site);

  let rebuiltCheckout;
  try {
    const catalogService = new ProductCatalogService();
    rebuiltCheckout = await catalogService.validateAndRebuildCheckout(items, site.id, siteData);
  } catch (error) {
    console.error('Checkout validation failed:', error.message);
    return sendBadRequest(res, error.message, 'INVALID_CHECKOUT');
  }

  const deliveryCharge = await buildDeliveryCharge(siteData, {
    fulfillment: deliveryOptions.fulfillment,
    address: deliveryOptions.deliveryAddress,
    addressLine2: deliveryOptions.deliveryAddressLine2,
  });
  if (!deliveryCharge.ok) {
    return sendBadRequest(res, deliveryCharge.error, deliveryCharge.code || 'INVALID_DELIVERY');
  }

  const checkoutItems = [...rebuiltCheckout.items];
  if (deliveryCharge.fee > 0) {
    checkoutItems.push({
      name: 'Delivery',
      price: deliveryCharge.fee,
      quantity: 1,
    });
  }

  const totalCents = Math.round(
    checkoutItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0) * 100
  );

  const processor = await PaymentServiceFactory.getProcessor(site.id, 'square');
  const { checkoutUrl, sessionId } = await processor.createCheckout({
    items: checkoutItems,
    totalCents,
    successUrl,
    cancelUrl,
    metadata: {
      site_id: site.id,
      user_id: site.user_id || '',
      order_items: JSON.stringify(rebuiltCheckout.items),
      type: 'order',
      fulfillment_type: deliveryCharge.fulfillmentType,
      ...(deliveryCharge.shippingAddress
        ? { shipping_address: JSON.stringify(deliveryCharge.shippingAddress) }
        : {}),
    },
  });

  console.log(`✅ Square session created: ${sessionId} for site: ${site.id}`);

  sendSuccess(res, {
    redirectUrl: checkoutUrl,
    sessionId,
    provider: 'square',
  });
}

/**
 * PayPal: Create order and return redirect URL
 */
async function handlePayPalCheckout(req, res, site, paypalAccountId, items, successUrl, cancelUrl) {
  // Placeholder - implement PayPal Client when credentials available
  return sendBadRequest(res, 'PayPal checkout not yet implemented', 'NOT_IMPLEMENTED');
}

/**
 * Shopify: Redirect to Shopify checkout
 */
async function handleShopifyCheckout(req, res, site, items, successUrl, cancelUrl) {
  // Placeholder - implement Shopify Buy Button when store data available
  return sendBadRequest(res, 'Shopify checkout not yet implemented', 'NOT_IMPLEMENTED');
}

export default router;
