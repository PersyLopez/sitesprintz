import express from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';
import { query as dbQuery } from '../../database/db.js';

const router = express.Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

// POST /api/connect/onboard
router.post('/connect/onboard', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
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

    await dbQuery(
      'UPDATE users SET stripe_account_id = $1 WHERE id = $2',
      [account.id, req.user.id]
    );

    res.json({
      accountId: account.id,
      onboardingUrl: accountLink.url
    });
  } catch (error) {
    console.error('Stripe onboarding error:', error);
    res.status(500).json({ error: 'Failed to create Stripe account' });
  }
});

// GET /api/connect/status
router.get('/connect/status', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.json({ connected: false, reason: 'stripe_not_configured' });
    }

    const result = await dbQuery(
      'SELECT stripe_account_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!result.rows[0]?.stripe_account_id) {
      return res.json({ connected: false, reason: 'no_account' });
    }

    const account = await stripe.accounts.retrieve(result.rows[0].stripe_account_id);

    res.json({
      connected: account.details_submitted && account.charges_enabled,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    });
  } catch (error) {
    console.error('Stripe status error:', error);
    res.status(500).json({ error: 'Failed to get Stripe status' });
  }
});

// POST /api/connect/refresh
router.post('/connect/refresh', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const result = await dbQuery(
      'SELECT stripe_account_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!result.rows[0]?.stripe_account_id) {
      return res.status(404).json({ error: 'No Stripe account found' });
    }

    const accountLink = await stripe.accountLinks.create({
      account: result.rows[0].stripe_account_id,
      refresh_url: `${req.protocol}://${req.get('host')}/dashboard/stripe?refresh=true`,
      return_url: `${req.protocol}://${req.get('host')}/dashboard/stripe?success=true`,
      type: 'account_onboarding'
    });

    res.json({
      onboardingUrl: accountLink.url
    });
  } catch (error) {
    console.error('Stripe refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh Stripe account' });
  }
});

// POST /api/connect/disconnect
router.post('/connect/disconnect', requireAuth, async (req, res) => {
  try {
    await dbQuery(
      'UPDATE users SET stripe_account_id = NULL WHERE id = $1',
      [req.user.id]
    );

    res.json({ success: true, message: 'Stripe account disconnected' });
  } catch (error) {
    console.error('Stripe disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect Stripe account' });
  }
});

// POST /api/connect/create-checkout
router.post('/connect/create-checkout', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const { siteId, items } = req.body;

    if (!siteId || !items) {
      return res.status(400).json({ error: 'Site ID and items required' });
    }

    const siteResult = await dbQuery(
      'SELECT stripe_account_id FROM sites WHERE id = $1',
      [siteId]
    );

    if (!siteResult.rows[0]?.stripe_account_id) {
      return res.status(400).json({ error: 'Site does not have Stripe connected' });
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
        on_behalf_of: siteResult.rows[0].stripe_account_id,
        transfer_data: {
          destination: siteResult.rows[0].stripe_account_id
        }
      },
      success_url: `${req.protocol}://${req.get('host')}/checkout/success`,
      cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`
    });

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Connect checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
});

export default router;

