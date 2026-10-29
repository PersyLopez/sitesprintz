/**
 * Clover Hosted Checkout. Card data stays on Clover.
 * North America (US and Canada) only.
 */

import crypto from 'crypto';
import { IPaymentProcessor, PaymentValidationError } from './IPaymentProcessor.js';
import { cloverHosts } from './cloverHosts.js';
import { saveCloverCheckoutContext } from './cloverCheckoutContext.js';

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

function appendQuery(url, key, value) {
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}${key}=${value}`;
}

function cloverAmountCents(body) {
  const raw = body?.amount ?? body?.Amount ?? body?.total ?? null;
  if (raw === null || raw === undefined || raw === '') return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  return amount;
}

function cloverSignatureTimestampFresh(timestamp, nowMs = Date.now()) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return false;
  const seconds = parsed > 1e12 ? Math.floor(parsed / 1000) : parsed;
  const drift = Math.abs(Math.floor(nowMs / 1000) - seconds);
  return drift <= SIGNATURE_TOLERANCE_SECONDS;
}

function cloverRefundIdempotencyKey(merchantId, transactionId, amountCents) {
  const amount = amountCents === null || amountCents === undefined ? 'full' : String(amountCents);
  return crypto
    .createHash('sha256')
    .update(`${merchantId}:${transactionId}:${amount}`)
    .digest('hex');
}

export class CloverProcessor extends IPaymentProcessor {
  constructor(accessToken, merchantId, fetchImpl = fetch) {
    super();
    if (!accessToken) {
      throw new Error('Clover access token required');
    }
    if (!merchantId) {
      throw new Error('Clover merchant ID required');
    }
    this.accessToken = accessToken;
    this.merchantId = merchantId;
    this.fetchImpl = fetchImpl;
  }

  getProcessorName() {
    return 'clover';
  }

  async createCheckout(params) {
    this.validateCheckoutParams(params);
    const {
      items,
      totalCents,
      currency = 'USD',
      successUrl,
      cancelUrl,
      metadata = {},
      customerEmail = null,
    } = params;

    const lineItems = items.map((item) => ({
      name: String(item.name || 'Item').slice(0, 127),
      price: Math.round(Number(item.price) * 100),
      unitQty: Math.max(1, Number(item.quantity) || 1),
      ...(item.description ? { note: String(item.description).slice(0, 255) } : {}),
    }));

    const chargedCents = lineItems.reduce((sum, item) => sum + (item.price * item.unitQty), 0);
    if (chargedCents !== totalCents) {
      throw new PaymentValidationError('Line items do not match total');
    }

    const email = customerEmail || metadata.customer_email || 'guest@unknown.local';
    const body = {
      customer: { email },
      redirectUrls: {
        success: appendQuery(successUrl, 'clover_session', '{CHECKOUT_SESSION_ID}'),
        failure: cancelUrl,
      },
      shoppingCart: { lineItems },
    };

    const { api } = cloverHosts();
    const response = await this.fetchImpl(`${api}/invoicingcheckoutservice/v1/checkouts`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.accessToken}`,
        'X-Clover-Merchant-Id': this.merchantId,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.href || !payload.checkoutSessionId) {
      const safeError = new Error('Failed to create checkout');
      safeError.originalError = payload.message || response.statusText || 'Clover checkout failed';
      throw safeError;
    }

    await saveCloverCheckoutContext(payload.checkoutSessionId, {
      type: metadata.type || 'order',
      siteId: metadata.site_id || null,
      merchantId: this.merchantId,
      appointmentId: metadata.appointment_id || null,
      amountCents: totalCents,
      currency: String(currency || 'usd').toLowerCase(),
      customerEmail: email,
      metadata,
    });

    return {
      sessionId: payload.checkoutSessionId,
      checkoutUrl: payload.href,
    };
  }

  /**
   * Hosted Checkout has no documented retrieve-by-session API.
   * A 200 body with an approved status counts as paid. Anything else stays unpaid
   * so a success redirect alone cannot mark an order paid.
   */
  async getTransactionStatus(transactionId) {
    this.validateTransactionId(transactionId);
    const { api } = cloverHosts();
    const response = await this.fetchImpl(
      `${api}/invoicingcheckoutservice/v1/checkouts/${encodeURIComponent(transactionId)}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${this.accessToken}`,
          'X-Clover-Merchant-Id': this.merchantId,
        },
      }
    );

    if (response.status === 404) {
      return { status: 'unpaid', amount: 0, currency: 'usd', metadata: {} };
    }
    if (!response.ok) {
      return { status: 'unknown', amount: 0, currency: 'usd', metadata: {} };
    }

    const body = await response.json().catch(() => ({}));
    const raw = String(body.status || body.paymentStatus || body.Status || '').toUpperCase();
    const paid = raw === 'APPROVED' || raw === 'PAID' || raw === 'SUCCESS';
    const amount = cloverAmountCents(body);
    const paymentId = body.paymentId || body.payment_id || null;
    return {
      status: paid ? 'paid' : 'unpaid',
      amount,
      currency: 'usd',
      metadata: {
        paymentId: paymentId && paymentId !== transactionId ? String(paymentId) : null,
      },
    };
  }

  async processRefund(transactionId, amountCents = null, reason = null) {
    this.validateRefundParams(transactionId, amountCents);
    const { ecommerce } = cloverHosts();
    const body = { charge: transactionId };
    if (amountCents !== null && amountCents !== undefined) {
      body.amount = amountCents;
    }
    if (reason) {
      body.reason = String(reason).slice(0, 255);
    }

    const response = await this.fetchImpl(`${ecommerce}/v1/refunds`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.accessToken}`,
        'Idempotency-Key': cloverRefundIdempotencyKey(this.merchantId, transactionId, amountCents),
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    if (response.status === 404) {
      throw new PaymentValidationError('Payment not found');
    }
    if (!response.ok) {
      throw new Error('Failed to refund Clover payment');
    }

    return {
      refundId: payload.id || payload.refundId || transactionId,
      status: payload.status || 'pending',
      amount: Number(payload.amount ?? amountCents ?? 0),
    };
  }

  /**
   * Clover-Signature: t=<unix>,v1=<hex hmac sha256 of `${t}.${rawBody}`>
   */
  verifyWebhookSignature(payload, signature, secret) {
    if (!payload || !signature || !secret) return false;
    try {
      const parts = Object.fromEntries(
        String(signature).split(',').map((piece) => {
          const index = piece.indexOf('=');
          if (index === -1) return [piece.trim(), ''];
          return [piece.slice(0, index).trim(), piece.slice(index + 1).trim()];
        })
      );
      const timestamp = parts.t;
      const presented = parts.v1;
      if (!timestamp || !presented) return false;
      if (!cloverSignatureTimestampFresh(timestamp)) return false;
      const expected = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');
      return this.secureCompare(presented.toLowerCase(), expected.toLowerCase());
    } catch {
      return false;
    }
  }

  async handleWebhook(event) {
    const status = String(event?.status || event?.Status || '').toUpperCase();
    const sessionId = event?.data || event?.Data || null;
    const paymentId = event?.id || event?.Id || null;
    if (status !== 'APPROVED') {
      return { action: 'ignored', data: { status, sessionId, paymentId } };
    }
    return { action: 'approved', data: { sessionId, paymentId, merchantId: event?.merchantId || event?.MerchantId || null } };
  }
}

export default CloverProcessor;
