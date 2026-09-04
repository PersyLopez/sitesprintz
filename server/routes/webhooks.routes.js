import express from 'express';
import bodyParser from 'body-parser';
import Stripe from 'stripe';
import { prisma } from '../../database/db.js';
import { WebhookProcessor } from '../services/webhookProcessor.js';

const router = express.Router();

// Stripe setup
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

// Webhook event failure queue (persisted to DB for retry)
const failureQueue = [];

/**
 * Persist failed webhook event for reprocessing
 */
async function persistFailedEvent(event, error) {
  try {
    await prisma.webhook_events.create({
      data: {
        event_id: event.id,
        processor: 'stripe',
        event_type: event.type,
        payload: event,
        status: 'failed'
      }
    });
    failureQueue.push({ event_id: event.id, error: error.message, retries: 0 });
  } catch (e) {
    console.error('Failed to persist webhook failure:', e);
  }
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

export default router;

