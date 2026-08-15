/**
 * IPaymentProcessor - Abstract Payment Processor Interface
 * 
 * All payment processor implementations must extend this class and implement
 * the abstract methods. This ensures a consistent interface across all processors.
 * 
 * Security features:
 * - Input validation on all methods
 * - HTTPS enforcement in production
 * - Constant-time string comparison (timing attack prevention)
 */

/**
 * Custom error class for payment validation errors
 */
export class PaymentValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PaymentValidationError';
  }
}

/**
 * Abstract base class for payment processors
 * Cannot be instantiated directly - must be extended
 */
export class IPaymentProcessor {
  constructor() {
    if (this.constructor === IPaymentProcessor) {
      throw new Error('IPaymentProcessor is abstract and cannot be instantiated directly');
    }
  }

  /**
   * Validate checkout parameters
   * @param {object} params - Checkout parameters
   * @throws {PaymentValidationError} If validation fails
   */
  validateCheckoutParams(params) {
    if (!params || typeof params !== 'object') {
      throw new PaymentValidationError('Checkout parameters required');
    }

    // Validate amount
    if (!params.totalCents || typeof params.totalCents !== 'number') {
      throw new PaymentValidationError('totalCents must be a number');
    }

    if (params.totalCents < 50) {
      throw new PaymentValidationError('Invalid amount: minimum 50 cents');
    }

    // Validate items
    if (!params.items || !Array.isArray(params.items) || params.items.length === 0) {
      throw new PaymentValidationError('Items array required and must not be empty');
    }

    // Validate URLs
    if (!params.successUrl || typeof params.successUrl !== 'string') {
      throw new PaymentValidationError('Success URL required');
    }

    if (!params.cancelUrl || typeof params.cancelUrl !== 'string') {
      throw new PaymentValidationError('Cancel URL required');
    }

    // Enforce HTTPS in production
    if (process.env.NODE_ENV === 'production') {
      if (!params.successUrl.startsWith('https://')) {
        throw new PaymentValidationError('HTTPS required for success URL in production');
      }
      if (!params.cancelUrl.startsWith('https://')) {
        throw new PaymentValidationError('HTTPS required for cancel URL in production');
      }
    }

    // Validate currency
    if (params.currency && typeof params.currency !== 'string') {
      throw new PaymentValidationError('Currency must be a string');
    }
  }

  /**
   * Validate transaction ID
   * @param {string} transactionId - Transaction ID to validate
   * @throws {PaymentValidationError} If validation fails
   */
  validateTransactionId(transactionId) {
    if (!transactionId || typeof transactionId !== 'string' || transactionId.trim() === '') {
      throw new PaymentValidationError('Transaction ID required');
    }
  }

  /**
   * Validate refund parameters
   * @param {string} transactionId - Transaction ID
   * @param {number|null} amountCents - Refund amount (null for full refund)
   * @throws {PaymentValidationError} If validation fails
   */
  validateRefundParams(transactionId, amountCents) {
    this.validateTransactionId(transactionId);

    if (amountCents !== null && amountCents !== undefined) {
      if (typeof amountCents !== 'number') {
        throw new PaymentValidationError('Refund amount must be a number');
      }
      if (amountCents < 0) {
        throw new PaymentValidationError('Invalid refund amount: cannot be negative');
      }
    }
  }

  /**
   * Constant-time string comparison (timing attack prevention)
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} True if strings are equal
   */
  secureCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    // Use Node.js crypto.timingSafeEqual for constant-time comparison
    const crypto = require('crypto');
    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch (error) {
      // If buffers are different lengths, timingSafeEqual throws
      return false;
    }
  }

  /**
   * Calculate platform fee based on policy
   * @param {number} amountCents - Transaction amount in cents
   * @param {object} feePolicy - Fee policy {type: 'percentage'|'flat', value: number, minCents?: number, maxCents?: number}
   * @returns {number} Platform fee in cents
   */
  calculatePlatformFee(amountCents, feePolicy) {
    if (!feePolicy || !feePolicy.type) {
      return 0;
    }

    let fee = 0;

    if (feePolicy.type === 'percentage') {
      if (typeof feePolicy.value !== 'number' || feePolicy.value < 0) {
        throw new PaymentValidationError('Invalid percentage value');
      }
      fee = Math.round((amountCents * feePolicy.value) / 100);
    } else if (feePolicy.type === 'flat') {
      if (typeof feePolicy.value !== 'number' || feePolicy.value < 0) {
        throw new PaymentValidationError('Invalid flat fee value');
      }
      fee = feePolicy.value;
    } else {
      return 0;
    }

    // Apply minimum
    if (feePolicy.minCents !== undefined && fee < feePolicy.minCents) {
      fee = feePolicy.minCents;
    }

    // Apply maximum
    if (feePolicy.maxCents !== undefined && fee > feePolicy.maxCents) {
      fee = feePolicy.maxCents;
    }

    return fee;
  }

  /**
   * Get processor name
   * Must be implemented by subclasses
   * @returns {string} Processor name ('stripe', 'square', 'paypal')
   */
  getProcessorName() {
    throw new Error('getProcessorName() must be implemented by subclass');
  }

  /**
   * Create checkout session
   * Must be implemented by subclasses
   * @param {object} params - Checkout parameters
   * @returns {Promise<{sessionId: string, checkoutUrl: string}>}
   */
  async createCheckout(params) {
    throw new Error('createCheckout() must be implemented by subclass');
  }

  /**
   * Get transaction status
   * Must be implemented by subclasses
   * @param {string} transactionId - Transaction/session ID
   * @returns {Promise<{status: string, amount: number, currency?: string, metadata?: object}>}
   */
  async getTransactionStatus(transactionId) {
    throw new Error('getTransactionStatus() must be implemented by subclass');
  }

  /**
   * Process refund
   * Must be implemented by subclasses
   * @param {string} transactionId - Original transaction ID
   * @param {number|null} amountCents - Refund amount (null = full refund)
   * @param {string|null} reason - Refund reason
   * @returns {Promise<{refundId: string, status: string, amount: number}>}
   */
  async processRefund(transactionId, amountCents = null, reason = null) {
    throw new Error('processRefund() must be implemented by subclass');
  }

  /**
   * Verify webhook signature
   * Must be implemented by subclasses
   * @param {string} payload - Raw webhook body
   * @param {string} signature - Webhook signature header
   * @param {string} secret - Webhook signing secret
   * @returns {boolean} True if valid, false otherwise
   */
  verifyWebhookSignature(payload, signature, secret) {
    throw new Error('verifyWebhookSignature() must be implemented by subclass');
  }

  /**
   * Handle webhook event
   * Must be implemented by subclasses
   * @param {object} event - Parsed webhook event
   * @returns {Promise<{action: string, data?: object}>}
   */
  async handleWebhook(event) {
    throw new Error('handleWebhook() must be implemented by subclass');
  }
}

export default IPaymentProcessor;


