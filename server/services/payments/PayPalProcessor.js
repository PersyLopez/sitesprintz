/**
 * PayPalProcessor - PayPal Payment Processor Adapter
 * 
 * Implements IPaymentProcessor interface for PayPal payments.
 */

import { IPaymentProcessor, PaymentValidationError } from './IPaymentProcessor.js';

const PAYPAL_API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export class PayPalProcessor extends IPaymentProcessor {
  constructor(clientId, clientSecret) {
    super();
    
    if (!clientId) {
      throw new Error('PayPal client ID required');
    }
    
    if (!clientSecret) {
      throw new Error('PayPal client secret required');
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this._accessToken = null;
    this._tokenExpiry = null;
  }

  getProcessorName() {
    return 'paypal';
  }

  /**
   * Get PayPal access token (with caching)
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this._accessToken && this._tokenExpiry && Date.now() < this._tokenExpiry) {
      return this._accessToken;
    }

    // Fetch new token
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    try {
      const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error('PayPal authentication failed');
      }

      const data = await response.json();
      this._accessToken = data.access_token;
      this._tokenExpiry = Date.now() + (data.expires_in * 1000);

      return this._accessToken;
    } catch (error) {
      // Don't expose credentials in error messages
      throw new Error('Failed to authenticate with PayPal');
    }
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

    const accessToken = await this.getAccessToken();

    // Build order request
    const orderRequest = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency.toUpperCase(),
          value: (totalCents / 100).toFixed(2) // Convert cents to dollars
        },
        items: items.map(item => ({
          name: item.name,
          quantity: String(item.quantity || 1),
          unit_amount: {
            currency_code: currency.toUpperCase(),
            value: item.price.toFixed(2)
          }
        }))
      }],
      application_context: {
        return_url: successUrl,
        cancel_url: cancelUrl
      }
    };

    try {
      const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderRequest)
      });

      if (!response.ok) {
        throw new Error('Failed to create PayPal order');
      }

      const order = await response.json();

      // Find approve link
      const approveLink = order.links.find(link => link.rel === 'approve');

      return {
        sessionId: order.id,
        checkoutUrl: approveLink.href
      };
    } catch (error) {
      const safeError = new Error('Failed to create checkout');
      safeError.originalError = error.message;
      throw safeError;
    }
  }

  async getTransactionStatus(orderId) {
    this.validateTransactionId(orderId);

    const accessToken = await this.getAccessToken();

    try {
      const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new PaymentValidationError('Order not found');
        }
        throw new Error('Failed to retrieve order');
      }

      const order = await response.json();

      // Extract amount from first purchase unit
      const amount = order.purchase_units?.[0]?.amount;

      return {
        status: order.status, // CREATED, APPROVED, COMPLETED, etc.
        amount: amount ? Math.round(parseFloat(amount.value) * 100) : 0, // Convert to cents
        currency: amount?.currency_code || 'USD',
        metadata: {}
      };
    } catch (error) {
      if (error instanceof PaymentValidationError) {
        throw error;
      }
      throw error;
    }
  }

  async processRefund(captureId, amountCents = null, reason = null) {
    this.validateRefundParams(captureId, amountCents);

    const accessToken = await this.getAccessToken();

    const refundRequest = {};

    // Only include amount for partial refunds
    if (amountCents !== null) {
      refundRequest.amount = {
        value: (amountCents / 100).toFixed(2),
        currency_code: 'USD'
      };
    }

    if (reason) {
      refundRequest.note_to_payer = reason;
    }

    try {
      const response = await fetch(`${PAYPAL_API_BASE}/v2/payments/captures/${captureId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(refundRequest)
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new PaymentValidationError('Capture not found');
        }
        throw new Error('Failed to process refund');
      }

      const refund = await response.json();

      return {
        refundId: refund.id,
        status: refund.status, // COMPLETED, PENDING, etc.
        amount: Math.round(parseFloat(refund.amount.value) * 100) // Convert to cents
      };
    } catch (error) {
      if (error instanceof PaymentValidationError) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Verify webhook signature via PayPal API
   * Note: PayPal webhooks require server-side verification
   */
  async verifyWebhookSignature(payload, signature, webhookId) {
    if (!payload || !signature || !webhookId) {
      return false;
    }

    const accessToken = await this.getAccessToken();

    try {
      const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transmission_id: signature,
          transmission_time: new Date().toISOString(),
          cert_url: webhookId,
          auth_algo: 'SHA256withRSA',
          transmission_sig: signature,
          webhook_id: webhookId,
          webhook_event: JSON.parse(payload)
        })
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.verification_status === 'SUCCESS';
    } catch (error) {
      return false;
    }
  }

  async handleWebhook(event) {
    if (!event || !event.event_type) {
      return { action: 'unhandled', type: 'invalid_event' };
    }

    const { event_type, resource } = event;

    switch (event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
      case 'PAYMENT.CAPTURE.COMPLETED':
        return {
          action: 'payment_completed',
          orderId: resource.id,
          amount: resource.purchase_units?.[0]?.amount?.value
            ? Math.round(parseFloat(resource.purchase_units[0].amount.value) * 100)
            : 0
        };

      case 'PAYMENT.CAPTURE.REFUNDED':
        return {
          action: 'refund_completed',
          refundId: resource.id,
          amount: resource.amount?.value
            ? Math.round(parseFloat(resource.amount.value) * 100)
            : 0
        };

      default:
        return {
          action: 'unhandled',
          type: event_type
        };
    }
  }
}

export default PayPalProcessor;


