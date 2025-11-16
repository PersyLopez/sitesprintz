/**
 * Stripe Webhook Routes
 * Handles incoming webhook events from Stripe with signature verification
 */

import express from 'express';
import Stripe from 'stripe';
import { webhookProcessor } from '../services/webhookProcessor.js';

const router = express.Router();

// Initialize Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

/**
 * POST /api/webhooks/stripe
 * Receives and processes Stripe webhook events
 * 
 * Security: Verifies webhook signature to ensure events are from Stripe
 * Idempotency: Prevents duplicate processing of the same event
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  // Validate signature header exists
  if (!signature) {
    return res.status(400).json({
      error: 'Webhook signature required',
      code: 'MISSING_SIGNATURE'
    });
  }
  
  let event;
  
  try {
    // Verify webhook signature
    if (stripe && STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } else {
      // Development mode - parse without verification
      console.warn('⚠️  Webhook signature verification disabled (missing keys)');
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    
    // Check if it's a timestamp issue (replay attack)
    if (err.message.includes('timestamp') || err.message.includes('tolerance')) {
      return res.status(400).json({
        error: 'Webhook timestamp too old or replay attack detected',
        code: 'INVALID_TIMESTAMP'
      });
    }
    
    return res.status(400).json({
      error: 'Invalid webhook signature',
      code: 'INVALID_SIGNATURE'
    });
  }
  
  // Validate payload structure
  if (!event || !event.type || !event.data) {
    return res.status(400).json({
      error: 'Invalid webhook payload',
      code: 'MALFORMED_PAYLOAD'
    });
  }
  
  // Log webhook receipt
  console.log(`📥 Webhook received: ${event.type} (${event.id})`);
  
  try {
    // Process the event
    const result = await webhookProcessor.processEvent(event);
    
    // Log result
    if (result.processed) {
      console.log(`✅ Webhook processed: ${event.type} (${event.id})`);
    } else {
      console.log(`⏭️  Webhook skipped: ${event.type} (${event.id}) - ${result.reason}`);
    }
    
    // Always return 200 to acknowledge receipt
    res.json({
      received: true,
      ...result
    });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    // Return 500 so Stripe will retry
    res.status(500).json({
      error: 'Webhook processing failed - will retry',
      code: 'PROCESSING_ERROR',
      eventId: event.id
    });
  }
});

export default router;
