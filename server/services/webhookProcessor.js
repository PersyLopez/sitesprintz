/**
 * Webhook Processor Service
 * Handles Stripe webhook events with idempotency and transaction safety
 * 
 * This is the core business logic for webhook processing, fully testable.
 */

import { prisma } from '../../database/db.js';
import { emailService } from './emailService.js';
import BookingPaymentAdapter from './booking/BookingPaymentAdapter.js';
import {
  fulfillPlatformSubscription,
  resolveUserForSession,
  resolvePlanFromSubscription,
} from './payments/fulfillPlatformSubscription.js';
import { resolvePrivateAddressForBuyer } from '../../src/utils/liveSiteContact.js';
import { parseSiteData } from '../utils/parseSiteData.js';
import { fulfillLaborSession } from './labor/laborFulfillment.js';
import { recordPlatformCouponRedemption } from './platformCouponService.js';
import { productCatalogService } from './ProductCatalogService.js';

export class WebhookProcessor {
  constructor(db = null, emailSvc = null, stripe = null, paymentAdapter = null) {
    // Allow dependency injection for testing
    this.db = db || prisma;
    this.emailService = emailSvc || emailService;
    this.stripe = stripe;
    this.paymentAdapter = paymentAdapter;

    // Event handler mapping
    this.handlers = {
      'checkout.session.completed': this.handleCheckoutCompleted.bind(this),
      'checkout.session.async_payment_succeeded': this.handleAsyncPaymentSucceeded.bind(this),
      'checkout.session.async_payment_failed': this.handleAsyncPaymentFailed.bind(this),
      'customer.subscription.updated': this.handleSubscriptionUpdated.bind(this),
      'customer.subscription.deleted': this.handleSubscriptionDeleted.bind(this),
      'invoice.paid': this.handleInvoicePaid.bind(this),
      'invoice.payment_failed': this.handlePaymentFailed.bind(this),
      'invoice.payment_action_required': this.handleInvoicePaymentActionRequired.bind(this),
      'charge.refunded': this.handleChargeRefunded.bind(this),
      'charge.dispute': this.handleChargeDispute.bind(this),
      'charge.dispute.created': this.handleChargeDispute.bind(this),
      'account.updated': this.handleAccountUpdated.bind(this),
      'payment_intent.payment_failed': this.handlePaymentIntentFailed.bind(this),
    };
  }

  /**
   * Main entry point for processing webhook events
   * @param {Object} event - Stripe event object
   * @returns {Promise<{processed: boolean, reason?: string, action?: string}>}
   */
  async processEvent(event) {
    try {
      const alreadyProcessed = await this.isEventProcessed(event.id);
      if (alreadyProcessed) {
        console.log(`Event ${event.id} already processed, skipping`);
        return { processed: false, reason: 'duplicate' };
      }

      try {
        await this.db.webhook_events.create({
          data: {
            event_id: event.id,
            processor: 'stripe',
            event_type: event.type,
            payload: event,
            status: 'processing'
          }
        });
      } catch (error) {
        if (error.code === 'P2002') {
          const existing = await this.db.webhook_events.findUnique({
            where: {
              event_id_processor: { event_id: event.id, processor: 'stripe' }
            }
          });
          if (existing?.status === 'processed') {
            return { processed: false, reason: 'duplicate' };
          }
          await this.db.webhook_events.update({
            where: {
              event_id_processor: { event_id: event.id, processor: 'stripe' }
            },
            data: {
              status: 'processing',
              event_type: event.type,
              payload: event
            }
          });
        } else {
          throw error;
        }
      }

      const handler = this.handlers[event.type];
      if (!handler) {
        console.log(`No handler for event type: ${event.type}`);
        await this.markEventAsProcessed(event);
        return { processed: false, reason: 'unknown_event_type' };
      }

      const result = await handler(event);
      await this.markEventAsProcessed(event);

      return { processed: true, ...result };
    } catch (error) {
      console.error('Error processing webhook event:', error);
      try {
        await this.markEventAsProcessed(event, 'failed');
      } catch (markError) {
        console.error('Error marking event as failed:', markError);
      }
      throw error;
    }
  }

  /**
   * Check if event has already been processed
   * Uses webhook_events table for idempotency (unique constraint on event_id + processor)
   * @param {string} eventId - Stripe event ID
   * @returns {Promise<boolean>}
   */
  async isEventProcessed(eventId) {
    try {
      const result = await this.db.webhook_events.findUnique({
        where: {
          event_id_processor: { event_id: eventId, processor: 'stripe' }
        }
      });
      return result?.status === 'processed';
    } catch (error) {
      console.error('Error checking event processing status:', error);
      throw error;
    }
  }

  /**
   * Mark event as processed in database using webhook_events table
   * @param {Object} event - Stripe event object
   * @param {string} status - 'processed' or 'failed'
   */
  async markEventAsProcessed(event, status = 'processed') {
    await this.db.webhook_events.update({
      where: {
        event_id_processor: { event_id: event.id, processor: 'stripe' }
      },
      data: {
        status,
        processed_at: new Date(),
        event_type: event.type,
        payload: event
      }
    });
  }

  /**
   * Handle checkout.session.completed event
   * Routes to payment or subscription handler based on mode
   */
  async handleCheckoutCompleted(event) {
    const session = event.data.object;

    if (session.metadata?.source === 'labor_extra') {
      return await this.handleLaborCheckout(session);
    }

    if (session.mode === 'payment') {
      // Check if this is a booking payment (Phase 2)
      if (session.metadata?.type === 'booking') {
        return await this.handleBookingPayment(session);
      }
      
      // Original: Product order payment
      return await this.handlePaymentCheckout(session);
    } else if (session.mode === 'subscription') {
      return await this.handleSubscriptionCheckout(session);
    }

    return { action: 'unknown_mode' };
  }

  async handleLaborCheckout(session) {
    return fulfillLaborSession(session, {
      emailService: this.emailService,
    });
  }

  /**
   * Handle booking payment (Phase 2)
   * Creates appointment after successful payment
   */
  async handleBookingPayment(session) {
    try {
      const appointmentId = session.metadata?.appointment_id;
      
      if (!appointmentId) {
        console.warn('Booking payment session missing appointment_id:', session.id);
        return { action: 'booking_payment_processed', warning: 'missing appointment_id' };
      }

      const paymentAdapter = this.paymentAdapter || new BookingPaymentAdapter();

      // Handle payment success (updates appointment status to 'paid')
      const result = await paymentAdapter.handlePaymentSuccess(session.id, appointmentId);

      console.log('✅ Booking payment processed:', {
        sessionId: session.id,
        appointmentId,
        amount: session.amount_total / 100,
        customerEmail: session.customer_email
      });

      return {
        success: true,
        action: 'booking_payment_processed',
        appointmentId: result.appointmentId,
        paymentStatus: result.paymentStatus
      };
    } catch (error) {
      console.error('Error handling booking payment:', error);
      // Don't throw - return error info for logging
      return {
        action: 'booking_payment_failed',
        error: error.message
      };
    }
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
          items: JSON.parse(session.metadata.order_items || '[]'),
          siteId: session.metadata.site_id,
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
      const existingUser = await resolveUserForSession(session, this.db);
      const previousPlan = existingUser?.plan;

      const result = await fulfillPlatformSubscription(session, {
        db: this.db,
        stripe: this.stripe,
      });

      if (!result.fulfilled) {
        throw new Error('User not found for subscription');
      }

      try {
        await recordPlatformCouponRedemption(session, {
          prisma: this.db,
          stripe: this.stripe,
        });
      } catch (redemptionError) {
        console.error('Platform coupon redemption failed:', redemptionError);
      }

      const { plan } = result;
      const isUpgrade = Boolean(previousPlan && previousPlan !== plan);

      try {
        const template = isUpgrade ? 'subscriptionUpgraded' : 'subscriptionCreated';
        const to = session.customer_email
          || session.customer_details?.email
          || existingUser?.email;
        if (to) {
          await this.emailService.sendEmail({
            to,
            template,
            data: { plan },
          });
        }
      } catch (emailError) {
        console.error('Subscription email failed:', emailError);
      }

      return {
        action: isUpgrade ? 'upgrade' : 'subscription_created',
        plan,
      };
    } catch (error) {
      console.error('Error handling subscription checkout:', error);
      throw error;
    }
  }

  /**
   * Create order in database with transaction
   * Uses canonical schema with standardized field names
   * Also handles inventory decrement atomically
   */
  async createOrder(session) {
    const items = session.metadata.order_items ? JSON.parse(session.metadata.order_items) : [];
    
    // Build normalized order items for creation
    const orderItemsData = items.map(item => ({
      product_id: item.productId ? parseInt(item.productId) : null,
      name: item.name,
      description: item.description,
      quantity: item.quantity || 1,
      unit_price: item.price, // Normalize: price -> unit_price
      total_price: (item.price || 0) * (item.quantity || 1),
      modifiers: item.modifiers || null
    }));

    // Use transaction for order + inventory
    const order = await this.db.$transaction(async (tx) => {
      // Create order and line items
      const createdOrder = await tx.orders.create({
        data: {
          site_id: session.metadata.site_id,
          user_id: session.metadata.user_id,
          customer_email: session.customer_email || session.customer_details?.email,
          customer_name: session.customer_details?.name || 'Guest',
          customer_phone: session.customer_details?.phone,
          stripe_session_id: session.id,
          total_amount: session.amount_total / 100, // Convert cents to dollars
          currency: session.currency || 'usd',
          payment_status: 'paid',
          status: 'pending',
          items: JSON.stringify(items), // Denormalized for history
          metadata: session.metadata,
          // Create normalized line items
          order_items: {
            create: orderItemsData
          }
        },
        include: { order_items: true }
      });

      // Decrement site catalog stock (source of truth for dashboard products)
      const siteCatalogItems = items.map((item) => ({
        productId: item.productId != null ? String(item.productId) : null,
        quantity: item.quantity || 1
      })).filter((item) => item.productId);

      if (siteCatalogItems.length > 0 && session.metadata.site_id) {
        await productCatalogService.decrementSiteCatalog(
          session.metadata.site_id,
          siteCatalogItems,
          tx
        );
      }

      // Decrement inventory for each item
      for (const item of orderItemsData) {
        if (!item.product_id || item.quantity < 1) continue;

        try {
          // Get current stock
          const product = await tx.products.findUnique({
            where: { id: item.product_id }
          });

          if (!product) continue;

          // Guard: only decrement if enough stock
          if (product.inventory < item.quantity) {
            throw new Error(`Insufficient inventory for product ${item.product_id}`);
          }

          // Atomic decrement
          const updated = await tx.products.update({
            where: { id: item.product_id },
            data: { inventory: { decrement: item.quantity } }
          });

          // Log to inventory_transactions
          await tx.inventory_transactions.create({
            data: {
              product_id: item.product_id,
              order_id: createdOrder.id,
              quantity_change: -item.quantity,
              previous_quantity: product.inventory,
              new_quantity: updated.inventory,
              transaction_type: 'sale',
              notes: `Order ${createdOrder.id} - ${item.quantity} unit(s)`
            }
          });
        } catch (err) {
          console.error(`Failed to decrement inventory for product ${item.product_id}:`, err);
          // Continue - inventory tracking is not critical to order creation
        }
      }

      return createdOrder;
    });

    return { orderId: order.id };
  }

  /**
   * Create subscription in database (users table only)
   */
  async createSubscription(session) {
    const result = await fulfillPlatformSubscription(session, {
      db: this.db,
      stripe: this.stripe,
    });
    if (!result.fulfilled) {
      throw new Error('User not found for subscription');
    }
    return result;
  }

  /**
   * Handle invoice.paid — renewals and recurring charge confirmation
   */
  async handleInvoicePaid(event) {
    const invoice = event.data.object;

    try {
      let subscription = null;
      let subscriptionId = null;

      if (invoice.subscription) {
        subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id;

        if (this.stripe && subscriptionId) {
          try {
            subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
          } catch (retrieveError) {
            console.error('Failed to retrieve subscription for invoice.paid:', retrieveError);
          }
        }
      }

      if (subscription?.metadata?.source === 'labor_extra') {
        return { action: 'labor_invoice_ignored' };
      }

      let user = null;
      if (subscriptionId) {
        user = await this.getUserBySubscriptionId(subscriptionId);
      }

      if (!user && invoice.customer) {
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer.id;
        user = await this.db.users.findFirst({
          where: { stripe_customer_id: customerId },
        });
      }

      if (!user) {
        console.warn('User not found for invoice.paid:', invoice.id);
        return { action: 'user_not_found' };
      }

      const stripeStatus = subscription?.status;
      if (stripeStatus !== 'active' && stripeStatus !== 'trialing') {
        return { action: 'invoice_paid_ignored', status: stripeStatus };
      }

      const mappedStatus = stripeStatus === 'trialing' ? 'trialing' : 'active';
      const updateData = {
        subscription_status: mappedStatus,
      };

      if (subscriptionId) {
        updateData.stripe_subscription_id = subscriptionId;
      }

      if (subscription?.current_period_end) {
        updateData.current_period_end = new Date(subscription.current_period_end * 1000);
      }

      if (subscription) {
        const plan = resolvePlanFromSubscription(subscription);
        if (plan) {
          updateData.plan = plan;
          updateData.subscription_plan = plan;
        }
      }

      await this.db.users.update({
        where: { id: user.id },
        data: updateData,
      });

      try {
        if (user.email) {
          await this.emailService.sendEmail({
            to: user.email,
            template: 'subscriptionRenewed',
            data: {
              amount: invoice.amount_paid,
              plan: updateData.plan || user.plan,
            },
          });
        }
      } catch (emailError) {
        console.error('Invoice paid email failed:', emailError);
      }

      return {
        action: 'invoice_paid_updated',
        status: mappedStatus,
        plan: updateData.plan,
      };
    } catch (error) {
      console.error('Error handling invoice.paid:', error);
      throw error;
    }
  }

  /**
   * Handle deferred subscription checkout success (async payment methods)
   */
  async handleAsyncPaymentSucceeded(event) {
    let session = event.data.object;

    if (this.stripe && session?.id) {
      try {
        session = await this.stripe.checkout.sessions.retrieve(session.id);
      } catch (retrieveError) {
        console.error('Failed to retrieve session for async_payment_succeeded:', retrieveError);
      }
    }

    if (session.metadata?.source === 'labor_extra') {
      return await this.handleLaborCheckout(session);
    }

    if (session.mode !== 'subscription') {
      return { action: 'ignored_non_subscription' };
    }

    const result = await fulfillPlatformSubscription(session, {
      db: this.db,
      stripe: this.stripe,
    });

    return {
      action: result.fulfilled ? 'async_payment_fulfilled' : 'async_payment_not_fulfilled',
      ...result,
    };
  }

  /**
   * Handle deferred subscription checkout failure — never grant a plan
   */
  async handleAsyncPaymentFailed(event) {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (!userId) {
      console.warn('async_payment_failed missing metadata.userId:', session.id);
      return { action: 'user_not_found' };
    }

    const user = await this.db.users.findUnique({ where: { id: userId } });
    if (!user) {
      return { action: 'user_not_found' };
    }

    const status = session.payment_status === 'unpaid' ? 'unpaid' : 'incomplete';

    await this.db.users.update({
      where: { id: user.id },
      data: {
        subscription_status: status,
      },
    });

    return { action: 'async_payment_failed_updated', status };
  }

  /**
   * Handle invoice requiring customer action (e.g. 3DS on renewal)
   */
  async handleInvoicePaymentActionRequired(event) {
    const invoice = event.data.object;

    try {
      let subscription = null;
      let subscriptionId = null;

      if (invoice.subscription) {
        subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id;

        if (this.stripe && subscriptionId) {
          try {
            subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
          } catch (retrieveError) {
            console.error('Failed to retrieve subscription for payment_action_required:', retrieveError);
          }
        }
      }

      let user = null;
      if (subscriptionId) {
        user = await this.getUserBySubscriptionId(subscriptionId);
      }

      if (!user && invoice.customer) {
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer.id;
        user = await this.db.users.findFirst({
          where: { stripe_customer_id: customerId },
        });
      }

      if (!user) {
        return { action: 'user_not_found' };
      }

      const subStatus = subscription?.status || 'past_due';

      await this.db.users.update({
        where: { id: user.id },
        data: {
          subscription_status: subStatus,
        },
      });

      try {
        await this.emailService.sendEmail({
          to: user.email,
          template: 'paymentFailed',
          data: { amount: invoice.amount_due },
        });
      } catch (emailError) {
        console.error('payment_action_required email failed:', emailError);
      }

      return { action: 'payment_action_required', status: subStatus };
    } catch (error) {
      console.error('Error handling payment_action_required:', error);
      throw error;
    }
  }

  /**
   * Handle subscription status updates
   */
  async handleSubscriptionUpdated(event) {
    const subscription = event.data.object;

    try {
      const user = await this.getUserBySubscriptionId(subscription.id);
      if (!user) {
        console.warn('User not found for subscription:', subscription.id);
        return { action: 'user_not_found' };
      }

      const updateData = {
        subscription_status: subscription.status,
      };

      if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        updateData.plan = null;
        updateData.subscription_plan = null;
      }

      await this.db.users.update({
        where: { id: user.id },
        data: updateData,
      });

      if (event.data.previous_attributes?.items) {
        return { action: 'plan_change' };
      }

      if (subscription.status === 'past_due') {
        await this.emailService.sendEmail({
          to: user.email,
          template: 'paymentFailed',
          data: {},
        });
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
      const user = await this.getUserBySubscriptionId(subscription.id);
      if (user) {
        await this.db.users.update({
          where: { id: user.id },
          data: {
            subscription_status: 'canceled',
            plan: null,
            subscription_plan: null,
          },
        });

        await this.emailService.sendEmail({
          to: user.email,
          template: 'subscriptionCanceled',
          data: {}
        });
      } else {
        console.warn('User not found for subscription:', subscription.id);
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
      let user = null;
      if (invoice.subscription) {
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id;
        user = await this.getUserBySubscriptionId(subscriptionId);
      }

      if (!user && invoice.customer) {
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer.id;
        user = await this.db.users.findFirst({
          where: { stripe_customer_id: customerId },
        });
      }

      if (user) {
        await this.db.users.update({
          where: { id: user.id },
          data: {
            subscription_status: 'past_due',
          },
        });
      }

      try {
        const emailTo = user?.email || invoice.customer_email;
        if (emailTo) {
          await this.emailService.sendEmail({
            to: emailTo,
            template: 'paymentFailed',
            data: {
              amount: invoice.amount_due,
              attemptCount: invoice.attempt_count,
            },
          });
        }
      } catch (emailError) {
        console.error('Error sending payment failure email:', emailError);
      }

      return { action: 'payment_failure_notified' };
    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw error;
    }
  }

  /**
   * Update subscription status on users (no subscriptions table)
   */
  async updateSubscriptionStatus(subscriptionId, status) {
    const user = await this.db.users.findFirst({
      where: { stripe_subscription_id: subscriptionId },
      select: { id: true },
    });

    if (!user) {
      console.warn('User not found for subscription:', subscriptionId);
      return;
    }

    await this.db.users.update({
      where: { id: user.id },
      data: {
        subscription_status: status,
      },
    });
  }

  /**
   * Get user by Stripe subscription ID
   */
  async getUserBySubscriptionId(subscriptionId) {
    return this.db.users.findFirst({
      where: { stripe_subscription_id: subscriptionId },
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(orderData) {
    try {
      let businessAddress = '';
      try {
        if (orderData.siteId) {
          const site = await this.db.sites.findUnique({
            where: { id: orderData.siteId },
            select: { site_data: true },
          });
          businessAddress = resolvePrivateAddressForBuyer(parseSiteData(site?.site_data));
        }
      } catch {
        businessAddress = '';
      }

      await this.emailService.sendEmail({
        to: orderData.customerEmail,
        template: 'orderConfirmation',
        data: {
          orderId: orderData.orderId,
          amount: orderData.amount,
          items: orderData.items,
          businessAddress,
        }
      });
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
      const site = await this.db.sites.findUnique({
        where: { id: orderData.siteId },
        include: { users: true }
      });

      if (!site || !site.users) {
        console.warn('Site owner not found:', orderData.siteId);
        return;
      }

      const ownerEmail = site.users.email;

      await this.emailService.sendEmail({
        to: ownerEmail,
        template: 'newOrder',
        data: {
          orderId: orderData.orderId,
          customerEmail: orderData.customerEmail,
          amount: orderData.amount
        }
      });
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
      const user = await this.db.users.findUnique({
        where: { email },
        select: { id: true, email: true }
      });

      if (user) {
        return user;
      }

      if (attempt < maxRetries - 1) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error(`User not found after ${maxRetries} retries: ${email}`);
  }

  /**
   * Handle account.updated event
   * Sync stripe_connected when Connect account capabilities change
   */
  async handleAccountUpdated(event) {
    const account = event.data.object;
    const stripeConnected = account.charges_enabled === true && account.payouts_enabled === true;

    const users = await this.db.users.findMany({
      where: { stripe_account_id: account.id },
      select: { id: true }
    });

    if (!users.length) {
      return { action: 'account_updated', warning: 'no_user_found' };
    }

    await this.db.users.updateMany({
      where: { stripe_account_id: account.id },
      data: { stripe_connected: stripeConnected }
    });

    return { action: 'account_updated', usersUpdated: users.length };
  }

  /**
   * Handle charge.dispute / charge.dispute.created events
   * Marks matching order as disputed (no inventory restock)
   */
  async handleChargeDispute(event) {
    const dispute = event.data.object;
    const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
    const paymentIntentId = typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

    if (!chargeId && !paymentIntentId) {
      console.warn('Dispute missing charge and payment_intent:', dispute.id);
      return { action: 'dispute_processed', warning: 'missing_charge_reference' };
    }

    try {
      const order = await this.db.orders.findFirst({
        where: {
          OR: [
            ...(chargeId ? [{ stripe_charge_id: chargeId }] : []),
            ...(paymentIntentId ? [{ stripe_payment_id: paymentIntentId }] : [])
          ]
        }
      });

      if (!order) {
        console.warn('No order found for dispute:', dispute.id);
        return { action: 'dispute_processed', warning: 'order_not_found' };
      }

      await this.db.orders.update({
        where: { id: order.id },
        data: {
          status: 'disputed',
          payment_status: 'disputed',
          updated_at: new Date()
        }
      });

      return { action: 'dispute_processed', orderId: order.id };
    } catch (error) {
      console.error('Error handling charge dispute:', error);
      throw error;
    }
  }

  /**
   * Handle charge.refunded event
   * Restocks inventory and updates order status
   */
  async handleChargeRefunded(event) {
    const charge = event.data.object;

    try {
      // Find order by charge ID or payment ID
      const order = await this.db.orders.findFirst({
        where: {
          OR: [
            { stripe_charge_id: charge.id },
            { stripe_payment_id: charge.payment_intent }
          ]
        },
        include: { order_items: true }
      });

      if (!order) {
        console.warn('No order found for refunded charge:', charge.id);
        return { action: 'refund_processed', warning: 'order_not_found' };
      }

      // Update order status to refunded
      await this.db.orders.update({
        where: { id: order.id },
        data: {
          status: 'refunded',
          payment_status: 'refunded',
          updated_at: new Date()
        }
      });

      // Restock site catalog stock
      const siteCatalogItems = productCatalogService.extractSiteCatalogItemsFromOrder(order);
      if (siteCatalogItems.length > 0 && order.site_id) {
        await productCatalogService.restockSiteCatalog(order.site_id, siteCatalogItems);
      }

      // Restock inventory
      for (const item of order.order_items) {
        if (!item.product_id || item.quantity < 1) continue;

        try {
          const product = await this.db.products.findUnique({
            where: { id: item.product_id }
          });

          if (!product) continue;

          // Atomic increment
          const updated = await this.db.products.update({
            where: { id: item.product_id },
            data: { inventory: { increment: item.quantity } }
          });

          // Log to inventory_transactions
          await this.db.inventory_transactions.create({
            data: {
              product_id: item.product_id,
              order_id: order.id,
              quantity_change: item.quantity, // Positive for restock
              previous_quantity: product.inventory,
              new_quantity: updated.inventory,
              transaction_type: 'restock',
              notes: `Refund of order ${order.id} - ${item.quantity} unit(s)`
            }
          });
        } catch (err) {
          console.error(`Failed to restock inventory for product ${item.product_id}:`, err);
          // Continue - inventory tracking is not critical
        }
      }

      // Send refund confirmation email
      try {
        await this.emailService.sendEmail({
          to: order.customer_email,
          template: 'refundConfirmation',
          data: {
            orderId: order.id,
            amount: order.total_amount,
            chargeId: charge.id
          }
        });
      } catch (emailError) {
        console.error('Refund confirmation email failed:', emailError);
      }

      return { action: 'refund_processed', orderId: order.id };
    } catch (error) {
      console.error('Error handling charge refund:', error);
      throw error;
    }
  }

  /**
   * Handle payment_intent.payment_failed event
   * Handles booking payment failures and order payment failures
   */
  async handlePaymentIntentFailed(event) {
    const paymentIntent = event.data.object;

    try {
      // Check if this is a booking payment
      if (paymentIntent.metadata?.type === 'booking') {
        const appointmentId = paymentIntent.metadata?.appointment_id;

        if (appointmentId) {
          // Update appointment to mark payment as failed
          await this.db.appointments.update({
            where: { id: appointmentId },
            data: {
              payment_status: 'failed',
              status: 'cancelled', // Cancel the appointment if payment fails
              cancellation_reason: 'Payment failed',
              updated_at: new Date()
            }
          });

          // Send failure notification
          const appointment = await this.db.appointments.findUnique({
            where: { id: appointmentId },
            select: { customer_email: true, total_price_cents: true }
          });

          if (appointment) {
            try {
              await this.emailService.sendEmail({
                to: appointment.customer_email,
                template: 'bookingPaymentFailed',
                data: {
                  appointmentId,
                  amount: appointment.total_price_cents / 100,
                  error: paymentIntent.last_payment_error?.message
                }
              });
            } catch (emailError) {
              console.error('Booking failure email failed:', emailError);
            }
          }

          return { action: 'booking_payment_failed', appointmentId };
        }
      }

      // Check if this is an order payment
      const order = await this.db.orders.findFirst({
        where: {
          stripe_payment_id: paymentIntent.id
        }
      });

      if (order) {
        // Update order status to failed
        await this.db.orders.update({
          where: { id: order.id },
          data: {
            payment_status: 'failed',
            status: 'cancelled',
            updated_at: new Date()
          }
        });

        // Send failure notification
        try {
          await this.emailService.sendEmail({
            to: order.customer_email,
            template: 'orderPaymentFailed',
            data: {
              orderId: order.id,
              amount: order.total_amount,
              error: paymentIntent.last_payment_error?.message
            }
          });
        } catch (emailError) {
          console.error('Order failure email failed:', emailError);
        }

        return { action: 'order_payment_failed', orderId: order.id };
      }

      return { action: 'payment_failed', warning: 'no_related_record' };
    } catch (error) {
      console.error('Error handling payment intent failure:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const webhookProcessor = new WebhookProcessor();
