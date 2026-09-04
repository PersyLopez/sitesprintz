/**
 * Payment Service Factory
 * 
 * Factory pattern for creating payment processor instances.
 * Uses static methods for easy access across the application.
 * 
 * Features:
 * - Automatic processor selection based on site configuration
 * - Encrypted credential loading from database
 * - Support for Stripe, Square, and PayPal processors
 */

import { prisma } from '../../../database/db.js';
import { decrypt } from '../../utils/encryption.js';
import { StripeProcessor } from './StripeProcessor.js';
import { SquareProcessor } from './SquareProcessor.js';
// import { PayPalProcessor } from './PayPalProcessor.js'; // P2

const SUPPORTED_PROCESSORS = ['stripe', 'square', 'paypal'];

function resolveSquareLocationId(metadata) {
  if (!metadata || typeof metadata !== 'object') return null;
  if (typeof metadata.location_id === 'string' && metadata.location_id) {
    return metadata.location_id;
  }
  const ids = Array.isArray(metadata.location_ids) ? metadata.location_ids : [];
  const first = ids[0];
  if (typeof first === 'string' && first) return first;
  return first?.id || null;
}

/**
 * Payment Service Factory
 * Static factory for creating payment processor instances
 */
export class PaymentServiceFactory {
  /**
   * Get payment processor for a site
   * @param {string} siteId - Site ID
   * @param {string} [processorOverride] - Optional processor to use instead of site default
   * @returns {Promise<IPaymentProcessor>} Processor instance
   */
  static async getProcessor(siteId, processorOverride = null) {
    // Look up site to get default processor
    const site = await prisma.sites.findFirst({
      where: { id: siteId }
    });

    if (!site) {
      throw new Error('Site not found');
    }

    // Determine which processor to use
    const processorType = processorOverride || site.payment_processor || 'stripe';

    // Create appropriate processor
    switch (processorType) {
      case 'stripe':
        return PaymentServiceFactory._createStripeProcessor(site);
      case 'square':
        return PaymentServiceFactory._createSquareProcessor(siteId);
      case 'paypal':
        return PaymentServiceFactory._createPayPalProcessor(siteId);
      default:
        throw new Error(`Unsupported processor: ${processorType}`);
    }
  }

  /**
   * Create Stripe processor for site
   * @private
   */
  static _createStripeProcessor(site) {
    // Stripe uses stripe_account_id from sites table (existing Stripe Connect integration)
    return new StripeProcessor({
      secretKey: process.env.STRIPE_SECRET_KEY,
      accountId: site.stripe_account_id
    });
  }

  /**
   * Create Square processor for site
   * @private
   */
  static async _createSquareProcessor(siteId) {
    // Load credentials from payment_processor_credentials
    const credentials = await prisma.payment_processor_credentials.findFirst({
      where: {
        site_id: siteId,
        processor: 'square',
        disconnected_at: null
      }
    });

    if (!credentials) {
      throw new Error('Square not configured for this site');
    }

    // Decrypt access token
    const accessToken = decrypt(credentials.access_token_encrypted);

    const locationId = resolveSquareLocationId(credentials.metadata);
    if (!locationId) {
      throw new Error('Square location ID required');
    }

    return new SquareProcessor(accessToken, locationId);
  }

  /**
   * Create PayPal processor for site
   * @private
   */
  static async _createPayPalProcessor(siteId) {
    // Load credentials from payment_processor_credentials
    const credentials = await prisma.payment_processor_credentials.findFirst({
      where: {
        site_id: siteId,
        processor: 'paypal',
        disconnected_at: null
      }
    });

    if (!credentials) {
      throw new Error('PayPal not configured for this site');
    }

    // Decrypt credentials
    const clientId = decrypt(credentials.access_token_encrypted);
    const clientSecret = credentials.refresh_token_encrypted
      ? decrypt(credentials.refresh_token_encrypted)
      : null;

    // Return mock processor until PayPalProcessor is implemented (Track A)
    return {
      getProcessorName: () => 'paypal',
      clientId,
      clientSecret,
      async createCheckout(params) {
        throw new Error('PayPalProcessor not yet implemented');
      },
      async getTransactionStatus(transactionId) {
        throw new Error('PayPalProcessor not yet implemented');
      },
      async processRefund(transactionId, amountCents) {
        throw new Error('PayPalProcessor not yet implemented');
      },
      verifyWebhookSignature(payload, signature, secret) {
        return false;
      },
      async handleWebhook(event) {
        return { action: 'unhandled' };
      }
    };
  }

  /**
   * Create checkout session for a site using its default processor
   * @param {string} siteId - Site ID
   * @param {object} params - Checkout parameters
   * @param {string} [processorOverride] - Optional processor to use
   * @returns {Promise<{sessionId: string, checkoutUrl: string}>}
   */
  static async createCheckoutForSite(siteId, params, processorOverride = null) {
    const processor = await PaymentServiceFactory.getProcessor(siteId, processorOverride);
    return processor.createCheckout(params);
  }

  /**
   * Get list of supported payment processors
   * @returns {string[]} Processor names
   */
  static getSupportedProcessors() {
    return [...SUPPORTED_PROCESSORS];
  }

  /**
   * Check if a processor is connected for a site
   * @param {string} siteId - Site ID
   * @param {string} processor - Processor name
   * @returns {Promise<boolean>} True if connected
   */
  static async isProcessorConnected(siteId, processor) {
    if (processor === 'stripe') {
      // Stripe uses stripe_account_id from sites table
      const site = await prisma.sites.findFirst({
        where: { id: siteId }
      });
      return !!(site?.stripe_account_id);
    }

    // Square and PayPal use payment_processor_credentials
    const credentials = await prisma.payment_processor_credentials.findFirst({
      where: {
        site_id: siteId,
        processor: processor
      }
    });

    if (!credentials) {
      return false;
    }

    // Check if disconnected
    if (credentials.disconnected_at) {
      return false;
    }

    return true;
  }
}

export default PaymentServiceFactory;
