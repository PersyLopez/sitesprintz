import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-token';

// Stripe setup
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

const publicDir = path.join(__dirname, 'public');
const dataFile = path.join(publicDir, 'data', 'site.json');
const templatesDir = path.join(publicDir, 'data', 'templates');

app.use(cors());
app.use(express.static(publicDir));

// Stripe webhook must be defined BEFORE bodyParser.json so we can access the raw body
if (stripe && STRIPE_WEBHOOK_SECRET) {
  app.post('/api/webhooks/stripe', bodyParser.raw({ type: 'application/json' }), (req, res) => {
    const signature = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${(err && err.message) || 'invalid signature'}`);
    }

    // Minimal handling: acknowledge and log important events
    try {
      switch (event.type) {
        case 'checkout.session.completed':
        case 'payment_intent.succeeded':
        case 'charge.refunded':
        case 'payment_intent.payment_failed':
          console.log('Stripe event:', event.type, event.data?.object?.id || '');
          break;
        default:
          // no-op
          break;
      }
    } catch (_) {
      // Never block webhook on internal errors – acknowledge and alert separately if needed
    }
    return res.status(200).send();
  });
}

// After webhook: enable JSON parser for the rest of the API
app.use(bodyParser.json({ limit: '1mb' }));

function requireAdmin(req, res, next){
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if(token === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// Payments config – expose if payments are enabled
app.get('/api/payments/config', (req, res) => {
  res.json({
    hasStripe: Boolean(stripe),
    publishableKey: STRIPE_PUBLISHABLE_KEY || undefined
  });
});

// Create a Checkout Session for a product defined in data/site.json by index
app.post('/api/payments/checkout-sessions', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payments not configured' });

    const { productIndex, quantity, currency, successUrl, cancelUrl, siteId } = req.body || {};
    const idx = Number(productIndex);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ error: 'Invalid productIndex' });
    }

    // Load authoritative product data from server-side site.json
    const raw = await fs.readFile(dataFile, 'utf-8');
    const site = JSON.parse(raw);
    const products = Array.isArray(site.products) ? site.products : [];
    const product = products[idx];
    if (!product || typeof product.price !== 'number' || !product.name) {
      return res.status(400).json({ error: 'Product not found' });
    }

    const unitAmountCents = Math.round(product.price * 100);
    if (unitAmountCents < 50) {
      return res.status(400).json({ error: 'Amount too low' });
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const curr = (currency || 'usd').toLowerCase();

    // Determine return URLs
    const origin = `${req.protocol}://${req.get('host')}`;
    const success = successUrl || `${origin}/?checkout=success`;
    const cancel = cancelUrl || `${origin}/?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
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
      automatic_tax: { enabled: false },
      metadata: {
        siteId: siteId ? String(siteId) : '',
        productIndex: String(idx)
      }
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create checkout session', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.get('/api/site', async (req, res) => {
  try{
    const raw = await fs.readFile(dataFile, 'utf-8');
    const json = JSON.parse(raw);
    res.json(json);
  }catch(err){
    // If no site.json yet, fall back to a sensible default template
    if (err && (err.code === 'ENOENT' || err.message?.includes('ENOENT'))) {
      try{
        const fallbackRaw = await fs.readFile(path.join(templatesDir, 'starter.json'), 'utf-8');
        const fallback = JSON.parse(fallbackRaw);
        return res.json(fallback);
      }catch(e){
        return res.status(500).json({ error: 'No site.json and failed to load default template' });
      }
    }
    res.status(500).json({ error: 'Failed to read site.json' });
  }
});

app.post('/api/site', requireAdmin, async (req, res) => {
  try{
    const incoming = req.body;
    if(typeof incoming !== 'object' || incoming == null){
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(incoming, null, 2));
    res.json({ ok: true });
  }catch(err){
    res.status(500).json({ error: 'Failed to write site.json' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
