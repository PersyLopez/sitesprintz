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

const WEBHOOK_RECLAIM_AFTER_MS = 15 * 60 * 1000;

export class WebhookProcessor {
  constructor(db = null, emailSvc = null, stripe = null, paymentAdapter = null, paypalProcessor = null) {
    // Allow dependency injection for testing
    this.db = db || prisma;
    this.emailService = emailSvc || emailService;
    this.stripe = stripe;
    this.paymentAdapter = paymentAdapter;
    this.paypalProcessor = paypalProcessor;

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

          const isStaleProcessing = existing?.status === 'processing'
            && existing.created_at instanceof Date
            && Date.now() - existing.created_at.getTime() > WEBHOOK_RECLAIM_AFTER_MS;
          const canReclaim = existing?.status === 'failed' || isStaleProcessing;

          if (!canReclaim) {
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
    return this.fulfillVisitorOrder({
      siteId: session.metadata.site_id,
      userId: session.metadata.user_id,
      customerEmail: session.customer_email || session.customer_details?.email,
      customerName: session.customer_details?.name || 'Guest',
      customerPhone: session.customer_details?.phone,
      items,
      amountCents: session.amount_total,
      currency: session.currency || 'usd',
      metadata: session.metadata,
      stripeSessionId: session.id,
      stripePaymentId: typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null,
    });
  }

  /**
   * Processor-agnostic visitor order fulfillment (shared Stripe / Square / PayPal path).
   * Does not write Square/PayPal refs into stripe_session_id (unique Stripe column).
   */
  async fulfillVisitorOrder({
    siteId,
    userId,
    customerEmail,
    customerName = 'Guest',
    customerPhone = null,
    items = [],
    amountCents = 0,
    currency = 'usd',
    metadata = {},
    stripeSessionId = null,
    stripePaymentId = null,
  }) {
    const orderItemsData = items.map(item => ({
      product_id: item.productId ? parseInt(item.productId) : null,
      name: item.name,
      description: item.description,
      quantity: item.quantity || 1,
      unit_price: item.price,
      total_price: (item.price || 0) * (item.quantity || 1),
      modifiers: item.modifiers || null
    }));

    const order = await this.db.$transaction(async (tx) => {
      const createdOrder = await tx.orders.create({
        data: {
          site_id: siteId,
          user_id: userId || null,
          customer_email: customerEmail,
          customer_name: customerName || 'Guest',
          customer_phone: customerPhone,
          stripe_session_id: stripeSessionId,
          stripe_payment_id: stripePaymentId,
          total_amount: amountCents / 100,
          currency: currency || 'usd',
          payment_status: 'paid',
          status: 'pending',
          items: JSON.stringify(items),
          metadata,
          order_items: {
            create: orderItemsData
          }
        },
        include: { order_items: true }
      });

      const siteCatalogItems = items.map((item) => ({
        productId: item.productId != null ? String(item.productId) : null,
        quantity: item.quantity || 1
      })).filter((item) => item.productId);

      if (siteCatalogItems.length > 0 && siteId) {
        await productCatalogService.decrementSiteCatalog(
          siteId,
          siteCatalogItems,
          tx
        );
      }

      for (const item of orderItemsData) {
        if (!item.product_id || item.quantity < 1) continue;

        try {
          const product = await tx.products.findUnique({
            where: { id: item.product_id }
          });

          if (!product) continue;

          if (product.inventory < item.quantity) {
            throw new Error(`Insufficient inventory for product ${item.product_id}`);
          }

          const updated = await tx.products.update({
            where: { id: item.product_id },
            data: { inventory: { decrement: item.quantity } }
          });

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
        }
      }

      return createdOrder;
    });

    return { orderId: order.id };
  }

  /**
   * Look up visitor order by processor ref stored in orders.metadata (no parallel ledger).
   * Neighbor: Stripe lookups on stripe_payment_id / stripe_charge_id columns.
   */
  async findVisitorOrderByMetadata(key, value) {
    if (!key || value == null || value === '') return null;
    return this.db.orders.findFirst({
      where: {
        metadata: {
          path: [key],
          equals: String(value),
        },
      },
      include: { order_items: true },
    });
  }

  /**
   * Shared refund path — neighbor: handleChargeRefunded (Stripe).
   */
  async applyOrderRefund(order, refundRef = null) {
    if (!order) {
      return { action: 'refund_processed', warning: 'order_not_found' };
    }

    if (order.payment_status === 'refunded' || order.status === 'refunded') {
      return { action: 'refund_processed', orderId: order.id, reason: 'already_refunded' };
    }

    await this.db.orders.update({
      where: { id: order.id },
      data: {
        status: 'refunded',
        payment_status: 'refunded',
        updated_at: new Date(),
      },
    });

    const siteCatalogItems = productCatalogService.extractSiteCatalogItemsFromOrder(order);
    if (siteCatalogItems.length > 0 && order.site_id) {
      await productCatalogService.restockSiteCatalog(order.site_id, siteCatalogItems);
    }

    for (const item of order.order_items || []) {
      if (!item.product_id || item.quantity < 1) continue;

      try {
        const product = await this.db.products.findUnique({
          where: { id: item.product_id },
        });
        if (!product) continue;

        const updated = await this.db.products.update({
          where: { id: item.product_id },
          data: { inventory: { increment: item.quantity } },
        });

        await this.db.inventory_transactions.create({
          data: {
            product_id: item.product_id,
            order_id: order.id,
            quantity_change: item.quantity,
            previous_quantity: product.inventory,
            new_quantity: updated.inventory,
            transaction_type: 'restock',
            notes: `Refund of order ${order.id} - ${item.quantity} unit(s)`,
          },
        });
      } catch (err) {
        console.error(`Failed to restock inventory for product ${item.product_id}:`, err);
      }
    }

    try {
      await this.emailService.sendEmail({
        to: order.customer_email,
        template: 'refundConfirmation',
        data: {
          orderId: order.id,
          amount: order.total_amount,
          chargeId: refundRef,
        },
      });
    } catch (emailError) {
      console.error('Refund confirmation email failed:', emailError);
    }

    return { action: 'refund_processed', orderId: order.id };
  }

  /**
   * Shared payment-failed path — neighbor: handlePaymentIntentFailed (Stripe orders).
   */
  async applyOrderPaymentFailed(order, errorMessage = null) {
    if (!order) {
      return { action: 'payment_failed', warning: 'no_related_record' };
    }

    if (order.payment_status === 'failed' || order.status === 'cancelled') {
      return { action: 'order_payment_failed', orderId: order.id, reason: 'already_failed' };
    }

    await this.db.orders.update({
      where: { id: order.id },
      data: {
        payment_status: 'failed',
        status: 'cancelled',
        updated_at: new Date(),
      },
    });

    try {
      await this.emailService.sendEmail({
        to: order.customer_email,
        template: 'orderPaymentFailed',
        data: {
          orderId: order.id,
          amount: order.total_amount,
          error: errorMessage,
        },
      });
    } catch (emailError) {
      console.error('Order failure email failed:', emailError);
    }

    return { action: 'order_payment_failed', orderId: order.id };
  }

  async resolvePayPalProcessor() {
    if (this.paypalProcessor) return this.paypalProcessor;
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('PayPal not configured for capture');
    }
    const { PayPalProcessor } = await import('./payments/PayPalProcessor.js');
    this.paypalProcessor = new PayPalProcessor(clientId, clientSecret);
    return this.paypalProcessor;
  }

  /**
   * Square payment.updated / payment.created → visitor order when COMPLETED;
   * refund.created/updated → mark refunded like Stripe; FAILED/CANCELED → mark failed.
   * Metadata contract: site_id + order_items (JSON) on payment.note, payment.metadata,
   * or event.data.metadata (facilitator checkout shape).
   */
  async processSquarePaymentEvent(event) {
    if (!event || !event.type) {
      return { action: 'unhandled', type: 'invalid_event' };
    }

    if (event.type === 'refund.created' || event.type === 'refund.updated') {
      return this.processSquareRefundEvent(event);
    }

    if (event.type !== 'payment.updated' && event.type !== 'payment.created') {
      return { action: 'unhandled', type: event.type };
    }

    const payment = event.data?.object?.payment || event.data?.object;
    if (!payment) {
      return { action: 'unhandled', type: 'missing_payment' };
    }

    const status = String(payment.status || '').toUpperCase();
    if (status === 'FAILED' || status === 'CANCELED' || status === 'CANCELLED') {
      const failedOrder = await this.findVisitorOrderByMetadata('square_payment_id', payment.id);
      if (!failedOrder) {
        return { action: 'ignored', reason: 'not_completed', status };
      }
      return this.applyOrderPaymentFailed(failedOrder, `Square payment ${status}`);
    }

    if (status && status !== 'COMPLETED') {
      return { action: 'ignored', reason: 'not_completed', status };
    }

    const existing = await this.findVisitorOrderByMetadata('square_payment_id', payment.id);
    if (existing) {
      return { action: 'payment_processed', orderId: existing.id, reason: 'already_fulfilled' };
    }

    const meta = this.extractSquarePaymentMetadata(event, payment);
    if (!meta?.site_id) {
      console.warn('Square payment missing site_id metadata:', payment.id);
      return { action: 'payment_processed', warning: 'missing metadata' };
    }

    const orderItemsRaw = meta.order_items;
    const orderItemsJson = typeof orderItemsRaw === 'string'
      ? orderItemsRaw
      : JSON.stringify(orderItemsRaw || []);

    const amountCents = Number(
      payment.total_money?.amount
      ?? payment.amount_money?.amount
      ?? payment.totalMoney?.amount
      ?? 0
    );
    const currency = (
      payment.total_money?.currency
      || payment.amount_money?.currency
      || payment.totalMoney?.currency
      || 'USD'
    ).toLowerCase();

    const session = {
      id: null,
      amount_total: amountCents,
      currency,
      customer_email: payment.buyer_email_address || meta.customer_email || 'guest@unknown.local',
      customer_details: {
        email: payment.buyer_email_address || meta.customer_email,
        name: meta.customer_name || payment.buyer_email_address || 'Guest',
        phone: meta.customer_phone || null,
      },
      metadata: {
        site_id: meta.site_id,
        user_id: meta.user_id || '',
        order_items: orderItemsJson,
        type: meta.type || 'order',
        processor: 'square',
        square_payment_id: payment.id,
        ...(meta.fulfillment_type ? { fulfillment_type: meta.fulfillment_type } : {}),
        ...(meta.shipping_address ? { shipping_address: meta.shipping_address } : {}),
      },
      payment_intent: null,
    };

    return this.handlePaymentCheckout(session);
  }

  async processSquareRefundEvent(event) {
    const refund = event.data?.object?.refund || event.data?.object;
    if (!refund) {
      return { action: 'unhandled', type: 'missing_refund' };
    }

    const status = String(refund.status || '').toUpperCase();
    if (status === 'FAILED' || status === 'REJECTED') {
      return { action: 'ignored', reason: 'refund_not_completed', status };
    }
    if (status === 'PENDING') {
      return { action: 'ignored', reason: 'refund_pending', status };
    }

    const paymentId = refund.payment_id || refund.paymentId;
    if (!paymentId) {
      console.warn('Square refund missing payment_id:', refund.id);
      return { action: 'refund_processed', warning: 'order_not_found' };
    }

    const order = await this.findVisitorOrderByMetadata('square_payment_id', paymentId);
    return this.applyOrderRefund(order, refund.id);
  }

  /**
   * @param {object} event
   * @param {object} payment
   * @returns {object|null}
   */
  extractSquarePaymentMetadata(event, payment) {
    const candidates = [
      event.data?.metadata,
      payment.metadata,
      payment.application_details?.metadata,
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object' && candidate.site_id) {
        return candidate;
      }
    }

    if (typeof payment.note === 'string' && payment.note.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(payment.note);
        if (parsed?.site_id) return parsed;
      } catch {
        // ignore malformed note
      }
    }

    return null;
  }

  /**
   * PayPal CAPTURE.COMPLETED → visitor order; CAPTURE.REFUNDED / DENIED → mark like Stripe;
   * CHECKOUT.ORDER.APPROVED → server-side capture (fulfillment stays on CAPTURE.COMPLETED).
   * Metadata: custom_id = site_id (from PayPalProcessor.createCheckout);
   * optional JSON custom_id or resource.metadata for order_items.
   */
  async processPayPalPaymentEvent(event) {
    if (!event || !event.event_type) {
      return { action: 'unhandled', type: 'invalid_event' };
    }

    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      return this.processPayPalOrderApproved(event);
    }

    if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
      return this.processPayPalRefundEvent(event);
    }

    if (
      event.event_type === 'PAYMENT.CAPTURE.DENIED'
      || event.event_type === 'PAYMENT.CAPTURE.DECLINED'
    ) {
      return this.processPayPalCaptureFailed(event);
    }

    if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
      return { action: 'unhandled', type: event.event_type };
    }

    const resource = event.resource || {};
    const status = String(resource.status || 'COMPLETED').toUpperCase();
    if (status && status !== 'COMPLETED') {
      return { action: 'ignored', reason: 'not_completed', status };
    }

    const existing = await this.findVisitorOrderByMetadata('paypal_capture_id', resource.id);
    if (existing) {
      return { action: 'payment_processed', orderId: existing.id, reason: 'already_fulfilled' };
    }

    const meta = this.extractPayPalCaptureMetadata(event, resource);
    if (!meta?.site_id) {
      console.warn('PayPal capture missing site_id metadata:', resource.id);
      return { action: 'payment_processed', warning: 'missing metadata' };
    }

    const orderItemsRaw = meta.order_items;
    const orderItemsJson = typeof orderItemsRaw === 'string'
      ? orderItemsRaw
      : JSON.stringify(orderItemsRaw || []);

    const amountValue = resource.amount?.value
      ?? resource.purchase_units?.[0]?.amount?.value;
    const amountCents = amountValue
      ? Math.round(parseFloat(amountValue) * 100)
      : 0;
    const currency = (
      resource.amount?.currency_code
      || resource.purchase_units?.[0]?.amount?.currency_code
      || 'USD'
    ).toLowerCase();

    const paypalOrderId = resource.supplementary_data?.related_ids?.order_id
      || meta.paypal_order_id
      || null;

    const session = {
      id: null,
      amount_total: amountCents,
      currency,
      customer_email: meta.customer_email || 'guest@unknown.local',
      customer_details: {
        email: meta.customer_email,
        name: meta.customer_name || 'Guest',
        phone: meta.customer_phone || null,
      },
      metadata: {
        site_id: meta.site_id,
        user_id: meta.user_id || '',
        order_items: orderItemsJson,
        type: meta.type || 'order',
        processor: 'paypal',
        paypal_capture_id: resource.id,
        ...(paypalOrderId ? { paypal_order_id: paypalOrderId } : {}),
        ...(meta.fulfillment_type ? { fulfillment_type: meta.fulfillment_type } : {}),
        ...(meta.shipping_address ? { shipping_address: meta.shipping_address } : {}),
      },
      payment_intent: null,
    };

    return this.handlePaymentCheckout(session);
  }

  async processPayPalOrderApproved(event) {
    const resource = event.resource || {};
    const paypalOrderId = resource.id;
    if (!paypalOrderId) {
      return { action: 'unhandled', type: 'missing_order' };
    }

    const meta = this.extractPayPalCaptureMetadata(event, resource);
    const expectedSiteId = meta?.site_id || undefined;

    try {
      const paypal = await this.resolvePayPalProcessor();
      const captured = await paypal.captureOrder(
        paypalOrderId,
        expectedSiteId ? { expectedSiteId } : {}
      );
      return {
        action: 'payment_captured',
        data: {
          orderId: captured.orderId || paypalOrderId,
          captureId: captured.captureId,
          status: captured.status,
        },
      };
    } catch (error) {
      console.error('PayPal APPROVED capture failed:', error);
      throw error;
    }
  }

  extractPayPalCaptureIdFromRefund(resource) {
    if (!resource || typeof resource !== 'object') return null;
    if (resource.capture_id) return String(resource.capture_id);
    if (resource.captureId) return String(resource.captureId);

    const links = Array.isArray(resource.links) ? resource.links : [];
    for (const link of links) {
      const href = link?.href;
      if (typeof href !== 'string') continue;
      const match = href.match(/\/captures\/([^/?]+)/);
      if (match?.[1]) return match[1];
    }

    return null;
  }

  async processPayPalRefundEvent(event) {
    const resource = event.resource || {};
    const captureId = this.extractPayPalCaptureIdFromRefund(resource);
    let order = null;

    if (captureId) {
      order = await this.findVisitorOrderByMetadata('paypal_capture_id', captureId);
    }

    if (!order) {
      const relatedOrderId = resource.supplementary_data?.related_ids?.order_id;
      if (relatedOrderId) {
        order = await this.findVisitorOrderByMetadata('paypal_order_id', relatedOrderId);
      }
    }

    if (!order && resource.id) {
      // Some payloads use capture id as resource.id
      order = await this.findVisitorOrderByMetadata('paypal_capture_id', resource.id);
    }

    return this.applyOrderRefund(order, resource.id);
  }

  async processPayPalCaptureFailed(event) {
    const resource = event.resource || {};
    let order = await this.findVisitorOrderByMetadata('paypal_capture_id', resource.id);
    if (!order) {
      const relatedOrderId = resource.supplementary_data?.related_ids?.order_id;
      if (relatedOrderId) {
        order = await this.findVisitorOrderByMetadata('paypal_order_id', relatedOrderId);
      }
    }
    if (!order) {
      return { action: 'payment_failed', warning: 'no_related_record' };
    }
    return this.applyOrderPaymentFailed(
      order,
      `PayPal ${event.event_type}`
    );
  }

  /**
   * @param {object} event
   * @param {object} resource - capture or order resource
   * @returns {object|null}
   */
  extractPayPalCaptureMetadata(event, resource) {
    const candidates = [
      event.resource?.metadata,
      resource.metadata,
      event.data?.metadata,
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object' && candidate.site_id) {
        return candidate;
      }
    }

    const customIdCandidates = [
      resource.custom_id,
      resource.purchase_units?.[0]?.custom_id,
      event.resource?.purchase_units?.[0]?.custom_id,
    ];

    for (const customId of customIdCandidates) {
      if (typeof customId !== 'string' || !customId.trim()) continue;
      if (customId.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(customId);
          if (parsed?.site_id) return parsed;
        } catch {
          // fall through to plain site_id
        }
      }
      return { site_id: customId };
    }

    return null;
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
          customerName: orderData.customerName,
          businessName: orderData.businessName,
          businessAddress,
          payOnSite: orderData.payOnSite === true,
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
      let businessName = orderData.businessName;
      if (!businessName) {
        try {
          businessName = parseSiteData(site.site_data)?.brand?.name;
        } catch {
          businessName = undefined;
        }
      }

      await this.emailService.sendEmail({
        to: ownerEmail,
        template: 'newOrder',
        data: {
          orderId: orderData.orderId,
          customerEmail: orderData.customerEmail,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          amount: orderData.amount,
          items: orderData.items,
          businessName,
          payOnSite: orderData.payOnSite === true,
          notes: orderData.notes,
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
      const order = await this.db.orders.findFirst({
        where: {
          OR: [
            { stripe_charge_id: charge.id },
            { stripe_payment_id: charge.payment_intent }
          ]
        },
        include: { order_items: true }
      });

      return this.applyOrderRefund(order, charge.id);
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
        },
        include: { order_items: true }
      });

      if (order) {
        return this.applyOrderPaymentFailed(
          order,
          paymentIntent.last_payment_error?.message
        );
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
