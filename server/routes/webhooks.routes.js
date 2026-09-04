import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import Stripe from 'stripe';
import { prisma } from '../../database/db.js';
import { WebhookProcessor } from '../services/webhookProcessor.js';
import { handleSquareWebhook } from '../webhooks/multi-processor-handler.js';

const router = express.Router();

// Stripe setup
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

// Square webhook signature key (notification URL signature key from Square Dashboard)
const SQUARE_WEBHOOK_SECRET = process.env.SQUARE_WEBHOOK_SECRET || '';

// Webhook event failure queue (persisted to DB for retry)
const failureQueue = [];

/**
 * Persist failed webhook event for reprocessing
 */
async function persistFailedEvent(event, error, processor = 'stripe') {
  try {
    await prisma.webhook_events.create({
      data: {
        event_id: event.id || event.event_id,
        processor,
        event_type: event.type || event.event_type,
        payload: event,
        status: 'failed'
      }
    });
    failureQueue.push({ event_id: event.id || event.event_id, error: error.message, retries: 0 });
  } catch (e) {
    console.error('Failed to persist webhook failure:', e);
  }
}

/**
 * Square HMAC-SHA256 verification (same algorithm as SquareProcessor.verifyWebhookSignature).
 * Kept local so the ingress route does not need per-site OAuth tokens to verify.
 */
function verifySquareWebhookSignature(payload, signature, secret) {
  if (!payload || !signature || !secret) {
    return false;
  }
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function createSquareWebhookProcessor(webhookProcessor) {
  return {
    verifyWebhookSignature: verifySquareWebhookSignature,
    async handleWebhook(event) {
      return webhookProcessor.processSquarePaymentEvent(event);
    },
    getProcessorName: () => 'square',
  };
}

if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    router.post('/stripe', (req, res) => {
        console.warn('Stripe webhook received but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not configured');
        return res.status(503).json({ error: 'Stripe not configured' });
    });
} else {
    router.post('/stripe', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
        const signature = req.headers['stripe-signature'];
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        try {
            // Instantiate processor with DB and email service
            const processor = new WebhookProcessor(prisma, null, stripe);
            
            // Process the event
            const result = await processor.processEvent(event);
            
            // If duplicate, acknowledge silently
            if (result.reason === 'duplicate') {
                console.log(`Webhook ${event.id} is duplicate, returning 200`);
                return res.status(200).json({ success: true, duplicate: true });
            }
            
            // If not processed due to error, return 500 so Stripe retries
            if (!result.processed && result.reason !== 'unknown_event_type') {
                console.warn(`Event ${event.id} not processed:`, result.reason);
                await persistFailedEvent(event, new Error(result.reason));
                return res.status(500).json({ error: result.reason });
            }
            
            // Success
            console.log(`✅ Webhook ${event.id} (${event.type}) processed successfully`);
            return res.status(200).json({ success: true, processed: result.processed });
            
        } catch (error) {
            console.error('Error processing webhook:', error);
            await persistFailedEvent(event, error);
            
            // Return 500 so Stripe retries (idempotency ensures safe retries)
            return res.status(500).json({ error: error.message });
        }
    });
}

if (!SQUARE_WEBHOOK_SECRET) {
    router.post('/square', (req, res) => {
        console.warn('Square webhook received but SQUARE_WEBHOOK_SECRET not configured');
        return res.status(503).json({ error: 'Square not configured' });
    });
} else {
    router.post('/square', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
        try {
            const webhookProcessor = new WebhookProcessor(prisma, null, null);
            const result = await handleSquareWebhook(req, {
                processor: createSquareWebhookProcessor(webhookProcessor),
                webhookSecret: SQUARE_WEBHOOK_SECRET,
                prisma,
            });

            if (result.status === 400) {
                return res.status(400).json({ error: result.error });
            }
            if (result.status === 503) {
                return res.status(503).json({ error: result.error || 'Webhook temporarily unavailable' });
            }
            if (result.status === 500) {
                return res.status(500).json({ error: result.error || 'Webhook processing failed' });
            }
            if (result.action === 'duplicate') {
                return res.status(200).json({ success: true, duplicate: true });
            }
            return res.status(200).json({
                success: true,
                action: result.action,
                data: result.data,
            });
        } catch (error) {
            console.error('Error processing Square webhook:', error);
            return res.status(500).json({ error: error.message });
        }
    });
}

export default router;
