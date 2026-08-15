/**
 * StripeProcessor - Stripe Payment Processor Adapter
 * 
 * Implements IPaymentProcessor interface for Stripe payments.
 * Refactors existing Stripe code into abstraction layer.
 */

import Stripe from 'stripe';
import { IPaymentProcessor, PaymentValidationError } from './IPaymentProcessor.js';

export class StripeProcessor extends IPaymentProcessor {
  constructor(secretKey, stripeClient = null) {
    super();
    
    // Allow dependency injection for testing (stripeClient takes precedence)
    if (stripeClient) {
      this.stripe = stripeClient;
    } else {
      if (!secretKey) {
        throw new Error('Stripe secret key required');
      }
      this.stripe = new Stripe(secretKey, { 
        apiVersion: '2024-06-20' 
      });
    }
    
    this.secretKey = secretKey;
  }

  getProcessorName() {
    return 'stripe';
  }

  async createCheckout(params) {
    // Validate input
    this.validateCheckoutParams(params);

    const {
      items,
      totalCents,
      currency = 'usd',
      successUrl,
      cancelUrl,
      metadata = {},
      platformFeeCents = 0,
      merchantAccountId,
      paymentMethodTypes = ['card', 'paypal', 'link']
    } = params;

    // Build line items
    const lineItems = items.map(item => ({
      price_data: {
        currency,
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.image ? [item.image] : []
        },
        unit_amount: Math.round(item.price * 100) // Convert to cents
      },
      quantity: item.quantity || 1
    }));

    // Build session parameters
    const sessionParams = {
      payment_method_types: paymentMethodTypes,
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata
    };

    // Direct charge on the connected Standard account
    const createOptions = {};
    if (merchantAccountId) {
      createOptions.stripeAccount = merchantAccountId;
      if (platformFeeCents > 0) {
        sessionParams.payment_intent_data = {
          application_fee_amount: platformFeeCents
        };
      }
    }

    try {
      const session = await this.stripe.checkout.sessions.create(sessionParams, createOptions);

      return {
        sessionId: session.id,
        checkoutUrl: session.url
      };
    } catch (error) {
      // Don't expose Stripe API keys in error messages
      const safeError = new Error('Failed to create checkout session');
      safeError.originalError = error.message;
      throw safeError;
    }
  }

  async getTransactionStatus(sessionId) {
    this.validateTransactionId(sessionId);

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      return {
        status: session.payment_status, // 'paid', 'unpaid', 'no_payment_required'
        amount: session.amount_total,
        currency: session.currency,
        metadata: session.metadata || {}
      };
    } catch (error) {
      if (error.type === 'StripeInvalidRequestError') {
        throw new PaymentValidationError('Transaction not found');
      }
      throw error;
    }
  }

  async processRefund(transactionId, amountCents = null, reason = null) {
    this.validateRefundParams(transactionId, amountCents);

    // Map reason to Stripe's format
    const stripeReason = reason === 'customer_request' 
      ? 'requested_by_customer'
      : reason === 'duplicate'
      ? 'duplicate'
      : reason === 'fraudulent'
      ? 'fraudulent'
      : 'other';

    const refundParams = {
      payment_intent: transactionId
    };

    if (amountCents !== null) {
      refundParams.amount = amountCents;
    }

    if (reason) {
      refundParams.reason = stripeReason;
    }

    try {
      const refund = await this.stripe.refunds.create(refundParams);

      return {
        refundId: refund.id,
        status: refund.status, // 'succeeded', 'pending', 'failed', 'canceled'
        amount: refund.amount
      };
    } catch (error) {
      if (error.type === 'StripeInvalidRequestError') {
        throw new PaymentValidationError('Transaction not found or already refunded');
      }
      throw error;
    }
  }

  verifyWebhookSignature(payload, signature, secret) {
    if (!payload || !signature || !secret) {
      return false;
    }

    try {
      // Stripe's constructEvent verifies the signature
      this.stripe.webhooks.constructEvent(payload, signature, secret);
      return true;
    } catch (error) {
      // Invalid signature - return false (don't throw)
      return false;
    }
  }

  async handleWebhook(event) {
    if (!event || !event.type) {
      return { action: 'unhandled', type: 'invalid_event' };
    }

    const { type, data } = event;

    switch (type) {
      case 'checkout.session.completed':
        return {
          action: 'payment_completed',
          sessionId: data.object.id,
          amount: data.object.amount_total,
          currency: data.object.currency
        };

      case 'charge.refunded':
        return {
          action: 'refund_completed',
          refundId: data.object.refund?.id || data.object.id,
          amount: data.object.amount_refunded || data.object.refund?.amount
        };

      case 'payment_intent.succeeded':
        return {
          action: 'payment_completed',
          paymentIntentId: data.object.id
        };

      case 'payment_intent.payment_failed':
        return {
          action: 'payment_failed',
          paymentIntentId: data.object.id,
          error: data.object.last_payment_error?.message
        };

      default:
        return {
          action: 'unhandled',
          type
        };
    }
  }
}

export default StripeProcessor;

