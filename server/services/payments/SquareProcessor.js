/**
 * SquareProcessor - Square Payment Processor Adapter
 * 
 * Implements IPaymentProcessor interface for Square payments.
 */

import { Client, Environment } from 'square/legacy';
import crypto from 'crypto';
import { IPaymentProcessor, PaymentValidationError } from './IPaymentProcessor.js';

export class SquareProcessor extends IPaymentProcessor {
  constructor(accessToken, locationId, squareClient = null) {
    super();
    
    if (!accessToken) {
      throw new Error('Square access token required');
    }
    
    if (!locationId) {
      throw new Error('Square location ID required');
    }

    // Allow dependency injection for testing
    this.square = squareClient || new Client({
      accessToken,
      environment: process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox
    });
    
    this.accessToken = accessToken;
    this.locationId = locationId;
  }

  getProcessorName() {
    return 'square';
  }

  async createCheckout(params) {
    // Validate input
    this.validateCheckoutParams(params);

    const {
      items,
      totalCents,
      currency = 'USD',
      successUrl,
      cancelUrl,
      metadata = {}
    } = params;

    // Build line items for Square
    const lineItems = items.map(item => ({
      name: item.name,
      quantity: String(item.quantity || 1),
      basePriceMoney: {
        amount: BigInt(Math.round(item.price * 100)), // Convert to cents
        currency: currency.toUpperCase()
      }
    }));

    // Square order.metadata values max 255 chars — keep keys webhooks need for site recovery
    const orderMetadata = {};
    for (const key of ['site_id', 'user_id', 'type']) {
      if (metadata[key] != null && metadata[key] !== '') {
        orderMetadata[key] = String(metadata[key]).slice(0, 255);
      }
    }

    // Create payment link
    try {
      const response = await this.square.checkoutApi.createPaymentLink({
        idempotencyKey: crypto.randomUUID(),
        paymentLink: {
          order: {
            locationId: this.locationId,
            lineItems,
            ...(Object.keys(orderMetadata).length > 0 ? { metadata: orderMetadata } : {})
          },
          ...(orderMetadata.site_id
            ? { paymentNote: `site_id:${orderMetadata.site_id}` }
            : {}),
          checkoutOptions: {
            redirectUrl: successUrl
          }
        }
      });

      const { paymentLink } = response.result;

      return {
        sessionId: paymentLink.id,
        checkoutUrl: paymentLink.url
      };
    } catch (error) {
      const safeError = new Error('Failed to create checkout');
      safeError.originalError = error.message;
      throw safeError;
    }
  }

  async getTransactionStatus(paymentLinkId) {
    this.validateTransactionId(paymentLinkId);

    try {
      const response = await this.square.checkoutApi.retrievePaymentLink(paymentLinkId);
      const { paymentLink } = response.result;

      // Note: Square payment links don't have a direct "status" field
      // You'd need to check the associated order status
      return {
        status: paymentLink.orderId ? 'paid' : 'unpaid',
        amount: 0, // Would need to fetch order details
        currency: 'USD',
        metadata: {}
      };
    } catch (error) {
      if (error.statusCode === 404) {
        throw new PaymentValidationError('Payment link not found');
      }
      throw error;
    }
  }

  async processRefund(paymentId, amountCents = null, reason = null) {
    this.validateRefundParams(paymentId, amountCents);

    const refundParams = {
      idempotencyKey: crypto.randomUUID(),
      paymentId
    };

    // Only include amount for partial refunds
    if (amountCents !== null) {
      refundParams.amountMoney = {
        amount: BigInt(amountCents),
        currency: 'USD'
      };
    }

    if (reason) {
      refundParams.reason = reason;
    }

    try {
      const response = await this.square.refundsApi.refundPayment(refundParams);
      const { refund } = response.result;

      return {
        refundId: refund.id,
        status: refund.status, // PENDING, COMPLETED, REJECTED, FAILED
        amount: Number(refund.amountMoney.amount)
      };
    } catch (error) {
      if (error.statusCode === 404) {
        throw new PaymentValidationError('Payment not found');
      }
      throw error;
    }
  }

  verifyWebhookSignature(payload, signature, secret) {
    if (!payload || !signature || !secret) {
      return false;
    }

    try {
      // Square uses HMAC-SHA256 for webhook signatures
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');

      // Use constant-time comparison
      return this.secureCompare(signature, expectedSignature);
    } catch (error) {
      return false;
    }
  }

  async handleWebhook(event) {
    if (!event || !event.type) {
      return { action: 'unhandled', type: 'invalid_event' };
    }

    const { type, data } = event;

    switch (type) {
      case 'payment.created':
      case 'payment.updated':
        return {
          action: 'payment_completed',
          paymentId: data.object?.payment?.id,
          amount: Number(data.object?.payment?.totalMoney?.amount || 0),
          currency: data.object?.payment?.totalMoney?.currency
        };

      case 'refund.created':
      case 'refund.updated':
        return {
          action: 'refund_completed',
          refundId: data.object?.refund?.id,
          amount: Number(data.object?.refund?.amountMoney?.amount || 0)
        };

      default:
        return {
          action: 'unhandled',
          type
        };
    }
  }
}

export default SquareProcessor;


