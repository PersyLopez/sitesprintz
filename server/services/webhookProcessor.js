/**
 * Webhook Processor Service
 * Handles Stripe webhook events with idempotency and transaction safety
 * 
 * This is the core business logic for webhook processing, fully testable.
 */

import { query as dbQuery, transaction as dbTransaction } from '../../database/db.js';
import { emailService } from './emailService.js';

export class WebhookProcessor {
  constructor(db = null, emailSvc = null, stripe = null) {
    // Allow dependency injection for testing
    this.db = db || { query: dbQuery, transaction: dbTransaction };
    this.emailService = emailSvc || emailService;
    this.stripe = stripe;
    
    // Event handler mapping
    this.handlers = {
      'checkout.session.completed': this.handleCheckoutCompleted.bind(this),
      'customer.subscription.updated': this.handleSubscriptionUpdated.bind(this),
      'customer.subscription.deleted': this.handleSubscriptionDeleted.bind(this),
      'invoice.payment_failed': this.handlePaymentFailed.bind(this),
    };
  }
  
  /**
   * Main entry point for processing webhook events
   * @param {Object} event - Stripe event object
   * @returns {Promise<{processed: boolean, reason?: string, action?: string}>}
   */
  async processEvent(event) {
    try {
      // Check if already processed (idempotency)
      const alreadyProcessed = await this.isEventProcessed(event.id);
      if (alreadyProcessed) {
        console.log(`Event ${event.id} already processed, skipping`);
        return { processed: false, reason: 'duplicate' };
      }
      
      // Route to appropriate handler
      const handler = this.handlers[event.type];
      if (!handler) {
        console.log(`No handler for event type: ${event.type}`);
        await this.markEventAsProcessed(event);
        return { processed: false, reason: 'unknown_event_type' };
      }
      
      // Process the event
      const result = await handler(event);
      
      // Mark as processed
      await this.markEventAsProcessed(event);
      
      return { processed: true, ...result };
    } catch (error) {
      console.error('Error processing webhook event:', error);
      throw error;
    }
  }
  
  /**
   * Check if event has already been processed
   * @param {string} eventId - Stripe event ID
   * @returns {Promise<boolean>}
   */
  async isEventProcessed(eventId) {
    try {
      const result = await this.db.query(
        'SELECT id FROM processed_webhooks WHERE id = $1',
        [eventId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error checking event processing status:', error);
      throw error;
    }
  }
  
  /**
   * Mark event as processed in database
   * @param {Object} event - Stripe event object
   */
  async markEventAsProcessed(event) {
    try {
      await this.db.query(
        `INSERT INTO processed_webhooks (id, event_type, data, processed_at)
         VALUES ($1, $2, $3, NOW())`,
        [event.id, event.type, JSON.stringify(event)]
      );
    } catch (error) {
      console.error('Error marking event as processed:', error);
      throw error;
    }
  }
  
  /**
   * Handle checkout.session.completed event
   * Routes to payment or subscription handler based on mode
   */
  async handleCheckoutCompleted(event) {
    const session = event.data.object;
    
    if (session.mode === 'payment') {
      return await this.handlePaymentCheckout(session);
    } else if (session.mode === 'subscription') {
      return await this.handleSubscriptionCheckout(session);
    }
    
    return { action: 'unknown_mode' };
  }
  
  /**
   * Handle payment mode checkout completion
   * Creates order and sends notifications
   */
  async handlePaymentCheckout(session) {
    try {
      // Validate metadata
      if (!session.metadata || !session.metadata.site_id) {
        console.warn('Payment session missing metadata:', session.id);
        return { action: 'payment_processed', warning: 'missing metadata' };
      }
      
      // Create order in database
      const order = await this.createOrder(session);
      
      // Send confirmation emails (don't fail if email fails)
      try {
        await this.sendOrderConfirmation({
          orderId: order.orderId,
          customerEmail: session.customer_email,
          amount: session.amount_total,
          items: JSON.parse(session.metadata.order_items || '[]')
        });
        
        await this.sendOwnerNotification({
          siteId: session.metadata.site_id,
          orderId: order.orderId,
          customerEmail: session.customer_email,
          amount: session.amount_total
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        return { action: 'payment_processed', warning: 'email failed' };
      }
      
      return { action: 'payment_processed', orderId: order.orderId };
    } catch (error) {
      console.error('Error handling payment checkout:', error);
      throw error;
    }
  }
  
  /**
   * Handle subscription mode checkout completion
   * Creates subscription and updates user plan
   */
  async handleSubscriptionCheckout(session) {
    try {
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan || 'pro';
      
      if (!userId) {
        // Race condition - user might not be created yet
        const user = await this.findUserWithRetry(session.customer_email);
        if (!user) {
          throw new Error('User not found for subscription');
        }
      }
      
      // Check if this is an upgrade
      const existingUser = await this.db.query(
        'SELECT plan, stripe_subscription_id FROM users WHERE id = $1',
        [userId]
      );
      
      const isUpgrade = existingUser.rowCount > 0 && existingUser.rows[0].plan !== plan;
      
      // Create subscription
      await this.createSubscription(session);
      
      // Send welcome/upgrade email
      try {
        const template = isUpgrade ? 'subscriptionUpgraded' : 'subscriptionCreated';
        await this.emailService.sendEmail({
          to: session.customer_email,
          template,
          data: { plan }
        });
      } catch (emailError) {
        console.error('Subscription email failed:', emailError);
      }
      
      return {
        action: isUpgrade ? 'upgrade' : 'subscription_created',
        plan
      };
    } catch (error) {
      console.error('Error handling subscription checkout:', error);
      throw error;
    }
  }
  
  /**
   * Create order in database with transaction
   */
  async createOrder(session) {
    return await this.db.transaction(async (tx) => {
      // Insert order
      const orderResult = await tx.query(
        `INSERT INTO orders (site_id, stripe_session_id, customer_email, amount, currency, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id`,
        [
          session.metadata.site_id,
          session.id,
          session.customer_email,
          session.amount_total,
          session.currency,
          'completed'
        ]
      );
      
      const orderId = orderResult.rows[0].id;
      
      // Insert order items
      if (session.metadata.order_items) {
        const items = JSON.parse(session.metadata.order_items);
        
        for (const item of items) {
          await tx.query(
            `INSERT INTO order_items (order_id, name, price, quantity)
             VALUES ($1, $2, $3, $4)`,
            [orderId, item.name, item.price, item.quantity]
          );
        }
      }
      
      return { orderId };
    });
  }
  
  /**
   * Create subscription in database
   */
  async createSubscription(session) {
    return await this.db.transaction(async (tx) => {
      // Insert subscription record
      await tx.query(
        `INSERT INTO subscriptions (
          id, user_id, stripe_customer_id, stripe_subscription_id, 
          plan, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE 
        SET stripe_subscription_id = $4, plan = $5, status = $6, updated_at = NOW()`,
        [
          session.subscription,
          session.metadata.userId,
          session.customer,
          session.subscription,
          session.metadata.plan,
          'active'
        ]
      );
      
      // Update user record
      await tx.query(
        `UPDATE users
         SET plan = $1, stripe_customer_id = $2, stripe_subscription_id = $3,
             subscription_status = $4, updated_at = NOW()
         WHERE id = $5`,
        [
          session.metadata.plan,
          session.customer,
          session.subscription,
          'active',
          session.metadata.userId
        ]
      );
    });
  }
  
  /**
   * Handle subscription status updates
   */
  async handleSubscriptionUpdated(event) {
    const subscription = event.data.object;
    
    try {
      await this.updateSubscriptionStatus(subscription.id, subscription.status);
      
      // Check if this is a plan change
      if (event.data.previous_attributes?.items) {
        return { action: 'plan_change' };
      }
      
      // Send notification for status changes
      if (subscription.status === 'past_due') {
        const user = await this.getUserBySubscriptionId(subscription.id);
        if (user) {
          await this.sendEmail(user.email, EmailTypes.PAYMENT_FAILED, {});
        }
      }
      
      return { action: 'status_updated', status: subscription.status };
    } catch (error) {
      console.error('Error handling subscription update:', error);
      throw error;
    }
  }
  
  /**
   * Handle subscription deletion
   */
  async handleSubscriptionDeleted(event) {
    const subscription = event.data.object;
    
    try {
      // Update status (don't delete row)
      await this.updateSubscriptionStatus(subscription.id, 'canceled');
      
      // Send cancellation confirmation
      const user = await this.getUserBySubscriptionId(subscription.id);
      if (user) {
        await this.sendEmail(user.email, EmailTypes.SUBSCRIPTION_CANCELED, {});
      }
      
      return { action: 'subscription_canceled' };
    } catch (error) {
      console.error('Error handling subscription deletion:', error);
      throw error;
    }
  }
  
  /**
   * Handle payment failures
   */
  async handlePaymentFailed(event) {
    const invoice = event.data.object;
    
    try {
      // Send notification but don't cancel immediately
      await this.sendEmail(
        invoice.customer_email,
        EmailTypes.PAYMENT_FAILED,
        {
          amount: invoice.amount_due,
          attemptCount: invoice.attempt_count
        }
      );
      
      return { action: 'payment_failure_notified' };
    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw error;
    }
  }
  
  /**
   * Update subscription status in database
   */
  async updateSubscriptionStatus(subscriptionId, status) {
    // Get user ID first
    const result = await this.db.query(
      'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
      [subscriptionId]
    );
    
    if (result.rowCount === 0) {
      console.warn('Subscription not found:', subscriptionId);
      return;
    }
    
    const userId = result.rows[0].user_id;
    
    // Update subscription
    await this.db.query(
      `UPDATE subscriptions
       SET status = $1, updated_at = NOW()
       WHERE stripe_subscription_id = $2`,
      [status, subscriptionId]
    );
    
    // Update user
    await this.db.query(
      `UPDATE users
       SET subscription_status = $1, updated_at = NOW()
       WHERE id = $2`,
      [status, userId]
    );
  }
  
  /**
   * Get user by subscription ID
   */
  async getUserBySubscriptionId(subscriptionId) {
    const result = await this.db.query(
      `SELECT u.id, u.email
       FROM users u
       JOIN subscriptions s ON s.user_id = u.id
       WHERE s.stripe_subscription_id = $1`,
      [subscriptionId]
    );
    
    return result.rowCount > 0 ? result.rows[0] : null;
  }
  
  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(orderData) {
    try {
      await this.sendEmail(
        orderData.customerEmail,
        EmailTypes.ORDER_CONFIRMATION,
        {
          orderId: orderData.orderId,
          amount: orderData.amount,
          items: orderData.items
        }
      );
    } catch (error) {
      console.error('Order confirmation email failed:', error);
      // Don't throw - email failure shouldn't fail the order
    }
  }
  
  /**
   * Send owner notification email
   */
  async sendOwnerNotification(orderData) {
    try {
      // Get site owner email
      const result = await this.db.query(
        `SELECT u.email as owner_email
         FROM sites s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = $1`,
        [orderData.siteId]
      );
      
      if (result.rowCount === 0) {
        console.warn('Site owner not found:', orderData.siteId);
        return;
      }
      
      const ownerEmail = result.rows[0].owner_email;
      
      await this.sendEmail(
        ownerEmail,
        EmailTypes.NEW_ORDER,
        {
          orderId: orderData.orderId,
          customerEmail: orderData.customerEmail,
          amount: orderData.amount
        }
      );
    } catch (error) {
      console.error('Owner notification email failed:', error);
      // Don't throw
    }
  }
  
  /**
   * Find user with retry logic (handles race conditions)
   */
  async findUserWithRetry(email, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000; // 1 second
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await this.db.query(
        'SELECT id, email FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rowCount > 0) {
        return result.rows[0];
      }
      
      if (attempt < maxRetries - 1) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    throw new Error(`User not found after ${maxRetries} retries: ${email}`);
  }
  
  /**
   * Get user by subscription ID
   */
  async getUserBySubscriptionId(subscriptionId) {
    const result = await this.db.query(
      'SELECT email FROM users WHERE stripe_subscription_id = $1',
      [subscriptionId]
    );
    return result.rows[0] || null;
  }
}

// Export singleton instance
export const webhookProcessor = new WebhookProcessor();
