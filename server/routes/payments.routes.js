import express from 'express';
import Stripe from 'stripe';
import { requireAuth, authenticateToken } from '../middleware/auth.js';
import { query as dbQuery } from '../../database/db.js';

const router = express.Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

// GET /api/payment/config (tests expect /api/payment, not /api/payments)
router.get('/config', (req, res) => {
  res.json({
    hasStripe: Boolean(stripe),
    publishableKey: STRIPE_PUBLISHABLE_KEY || undefined
  });
});

// POST /api/payment/create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ message: 'Stripe not configured' });
    }

    const { items, siteId, successUrl, cancelUrl } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }

    if (!siteId) {
      return res.status(400).json({ message: 'Site ID is required' });
    }

    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.image ? [item.image] : []
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity || 1,
    }));

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl || `${req.protocol}://${req.get('host')}/checkout/success`,
      cancel_url: cancelUrl || `${req.protocol}://${req.get('host')}/checkout/cancel`,
      client_reference_id: siteId,
      metadata: {
        site_id: siteId,
        order_items: JSON.stringify(items)
      }
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// GET /api/payment/session/:sessionId
router.get('/session/:sessionId', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      sessionId: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
      amountTotal: session.amount_total
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// POST /api/payments/create-subscription-checkout
async function createSubscriptionCheckout(req, res) {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const { priceId, plan } = req.body;
    const userEmail = req.user.email;

    if (!priceId || !plan) {
      return res.status(400).json({ error: 'Price ID and plan are required' });
    }

    let customer;
    const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId: req.user.id }
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.protocol}://${req.get('host')}/dashboard?subscription=success`,
      cancel_url: `${req.protocol}://${req.get('host')}/dashboard?subscription=cancelled`,
      metadata: {
        userId: req.user.id,
        plan: plan
      }
    });

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Subscription checkout error:', error);
    res.status(500).json({ error: 'Failed to create subscription checkout' });
  }
}

router.post('/create-subscription-checkout', requireAuth, createSubscriptionCheckout);

// GET /api/payment/subscription/status (tests may expect this path)
router.get('/subscription/status', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.json({
        hasSubscription: false,
        plan: null,
        status: 'no_stripe'
      });
    }

    const userEmail = req.user.email;
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      return res.json({
        hasSubscription: false,
        plan: null,
        status: 'no_customer'
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.json({
        hasSubscription: false,
        plan: null,
        status: 'no_subscription'
      });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;

    res.json({
      hasSubscription: true,
      plan: subscription.metadata.plan || 'unknown',
      status: subscription.status,
      priceId: priceId,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// POST /api/payments/create-portal-session
// Creates a Stripe Customer Portal session for self-service billing management
router.post('/create-portal-session', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe not configured' 
      });
    }

    // Get user's Stripe customer ID from database
    const result = await dbQuery(
      'SELECT stripe_customer_id, subscription_status FROM users WHERE id = $1',
      [req.user.id]
    );

    // Check if user exists
    if (!result.rows || result.rows.length === 0) {
      console.error(`User not found: ${req.user.id}`);
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    const user = result.rows[0];
    const stripeCustomerId = user.stripe_customer_id;

    // Check if user has a Stripe customer ID
    if (!stripeCustomerId) {
      return res.status(400).json({ 
        error: 'No subscription found. Please subscribe to a plan first.' 
      });
    }

    // Construct return URL from request
    const protocol = req.protocol;
    const host = req.get('host');
    const returnUrl = `${protocol}://${host}/dashboard`;

    console.log(`Creating portal session for customer: ${stripeCustomerId}, return URL: ${returnUrl}`);

    // Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl
    });

    console.log(`✅ Portal session created: ${session.id} for user: ${req.user.email}`);

    // Return portal URL to frontend
    res.json({
      url: session.url
    });

  } catch (error) {
    console.error('Portal session creation error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid customer. Please contact support.' 
      });
    }
    
    if (error.statusCode === 429) {
      return res.status(429).json({ 
        error: 'Too many requests. Please try again later.' 
      });
    }

    // Generic error
    res.status(500).json({ 
      error: 'Failed to create portal session. Please try again later.' 
    });
  }
});

export default router;

