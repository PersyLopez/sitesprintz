/**
 * Multi-Processor Webhook Handler
 * 
 * Handles webhooks from multiple payment processors (Stripe, Square, PayPal)
 * with signature verification, idempotency checks, and proper routing.
 * 
 * Security features:
 * - Signature verification (prevents unauthorized webhooks)
 * - Idempotency (prevents duplicate processing/replay attacks)
 * - Error sanitization (no sensitive data in responses)
 * - Constant-time comparison where applicable
 */

import prisma from '../../database/prisma.js';
import logger from '../utils/logger.js';

/**
 * Sanitize error message to remove sensitive data
 * @param {Error} error - Original error
 * @returns {string} Sanitized error message
 */
function sanitizeError(error) {
  const message = error.message || 'Unknown error';
  
  // Remove email addresses
  const sanitized = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  
  // Remove payment IDs (pi_, ch_, acct_, etc.)
  return sanitized.replace(/(pi|ch|cus|acct|sk|pk)_[a-zA-Z0-9]+/g, '[$1_REDACTED]');
}

/**
 * Check if webhook event has already been processed (idempotency)
 * @param {string} eventId - Webhook event ID
 * @param {string} processor - Processor name ('stripe', 'square', 'paypal')
 * @param {object} prismaClient - Prisma client instance
 * @returns {Promise<boolean>} True if duplicate, false if new
 */
export async function checkIdempotency(eventId, processor, prismaClient = prisma) {
  try {
    const existing = await prismaClient.webhook_events.findUnique({
      where: {
        event_id_processor: {
          event_id: eventId,
          processor: processor
        }
      }
    });
    
    return existing !== null;
  } catch (error) {
    logger.error('Idempotency check failed', { eventId, processor, error: error.message });
    // Fail closed: processor must retry when we cannot prove uniqueness
    const unavailable = new Error('Idempotency check unavailable');
    unavailable.code = 'IDEMPOTENCY_UNAVAILABLE';
    unavailable.cause = error;
    throw unavailable;
  }
}

/**
 * Normalize webhook body to the UTF-8 string Square signed (raw Buffer from express.raw).
 * @param {Buffer|string|object} payload
 * @returns {string}
 */
export function normalizeWebhookPayloadString(payload) {
  if (Buffer.isBuffer(payload)) {
    return payload.toString('utf8');
  }
  if (typeof payload === 'string') {
    return payload;
  }
  return JSON.stringify(payload);
}

/**
 * Record webhook event in database
 * @param {object} eventData - Event data
 * @param {object} prismaClient - Prisma client instance
 * @returns {Promise<object>} Created record or duplicate indicator
 */
export async function recordWebhookEvent(eventData, prismaClient = prisma) {
  try {
    const record = await prismaClient.webhook_events.create({
      data: {
        event_id: eventData.event_id,
        processor: eventData.processor,
        event_type: eventData.event_type,
        payload: eventData.payload,
        status: eventData.status,
        processed_at: new Date()
      }
    });
    
    return record;
  } catch (error) {
    // Handle race condition: another concurrent request already created the record
    if (error.code === 'P2002' && error.meta?.target?.includes('event_id')) {
      logger.warn('Webhook event race condition detected', {
        eventId: eventData.event_id,
        processor: eventData.processor
      });
      return { action: 'duplicate', reason: 'race_condition' };
    }
    
    throw error;
  }
}

/**
 * Handle Stripe webhook
 * @param {object} request - HTTP request object
 * @param {object} options - Handler options
 * @returns {Promise<object>} Response object
 */
export async function handleStripeWebhook(request, options) {
  const { processor, webhookSecret, prisma: prismaClient = prisma, logger: log = logger } = options;
  
  try {
    const payload = request.body;
    const signature = request.headers['stripe-signature'];
    
    if (!signature) {
      return {
        status: 400,
        error: 'Stripe signature required'
      };
    }
    
    // Verify signature
    const isValid = processor.verifyWebhookSignature(payload, signature, webhookSecret);
    if (!isValid) {
      log.warn('Stripe webhook signature verification failed');
      return {
        status: 400,
        error: 'Invalid webhook signature'
      };
    }
    
    // Parse event
    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const eventId = event.id;
    
    // Check idempotency (fail closed → 503)
    let isDuplicate;
    try {
      isDuplicate = await checkIdempotency(eventId, 'stripe', prismaClient);
    } catch (idemError) {
      log.error('Stripe idempotency unavailable', { eventId, error: idemError.message });
      return {
        status: 503,
        error: 'Webhook temporarily unavailable'
      };
    }
    if (isDuplicate) {
      log.info('Duplicate Stripe webhook received', { eventId });
      return {
        status: 200,
        action: 'duplicate'
      };
    }
    
    // Process webhook
    try {
      const result = await processor.handleWebhook(event);
      
      // Record successful processing
      await recordWebhookEvent({
        event_id: eventId,
        processor: 'stripe',
        event_type: event.type,
        payload: event,
        status: 'processed'
      }, prismaClient);
      
      return {
        status: 200,
        action: result.action,
        data: result.data
      };
    } catch (processingError) {
      log.error('Stripe webhook processing failed', {
        eventId,
        error: processingError.message,
        stack: processingError.stack
      });
      
      // Record failed processing
      await recordWebhookEvent({
        event_id: eventId,
        processor: 'stripe',
        event_type: event.type,
        payload: event,
        status: 'failed'
      }, prismaClient).catch(() => {
        // Ignore error if recording fails
      });
      
      return {
        status: 500,
        error: 'Webhook processing failed'
      };
    }
  } catch (error) {
    log.error('Stripe webhook handler error', { error: error.message });
    return {
      status: 500,
      error: 'Webhook processing failed'
    };
  }
}

/**
 * Handle Square webhook
 * @param {object} request - HTTP request object
 * @param {object} options - Handler options
 * @returns {Promise<object>} Response object
 */
export async function handleSquareWebhook(request, options) {
  const { processor, webhookSecret, prisma: prismaClient = prisma, logger: log = logger } = options;
  
  try {
    const payload = request.body;
    const signature = request.headers['x-square-hmacsha256-signature'];
    
    if (!signature) {
      return {
        status: 400,
        error: 'Square signature required'
      };
    }
    
    // Verify HMAC against the exact raw body Square signed
    const payloadString = normalizeWebhookPayloadString(payload);
    const isValid = processor.verifyWebhookSignature(payloadString, signature, webhookSecret);
    
    if (!isValid) {
      log.warn('Square webhook signature verification failed');
      return {
        status: 400,
        error: 'Invalid webhook signature'
      };
    }
    
    // Parse event
    const event = JSON.parse(payloadString);
    const eventId = event.event_id;
    
    if (!eventId) {
      return {
        status: 400,
        error: 'Missing event_id'
      };
    }
    
    // Check idempotency (fail closed → 503)
    let isDuplicate;
    try {
      isDuplicate = await checkIdempotency(eventId, 'square', prismaClient);
    } catch (idemError) {
      log.error('Square idempotency unavailable', { eventId, error: idemError.message });
      return {
        status: 503,
        error: 'Webhook temporarily unavailable'
      };
    }
    if (isDuplicate) {
      log.info('Duplicate Square webhook received', { eventId });
      return {
        status: 200,
        action: 'duplicate'
      };
    }
    
    // Process webhook (processor may fulfill visitor orders)
    try {
      const result = await processor.handleWebhook(event);
      
      // Record successful processing
      await recordWebhookEvent({
        event_id: eventId,
        processor: 'square',
        event_type: event.type,
        payload: event,
        status: 'processed'
      }, prismaClient);
      
      return {
        status: 200,
        action: result.action,
        data: result.data
      };
    } catch (processingError) {
      log.error('Square webhook processing failed', {
        eventId,
        error: processingError.message
      });
      
      // Record failed processing
      await recordWebhookEvent({
        event_id: eventId,
        processor: 'square',
        event_type: event.type,
        payload: event,
        status: 'failed'
      }, prismaClient).catch(() => {});
      
      return {
        status: 500,
        error: 'Webhook processing failed'
      };
    }
  } catch (error) {
    log.error('Square webhook handler error', { error: error.message });
    return {
      status: 500,
      error: 'Webhook processing failed'
    };
  }
}

/**
 * Handle PayPal webhook
 * @param {object} request - HTTP request object
 * @param {object} options - Handler options
 * @returns {Promise<object>} Response object
 */
export async function handlePayPalWebhook(request, options) {
  const { 
    processor, 
    webhookId, 
    paypalVerify, 
    prisma: prismaClient = prisma, 
    logger: log = logger 
  } = options;
  
  try {
    const payload = request.body;
    const headers = request.headers;
    
    // Check required headers
    const requiredHeaders = [
      'paypal-transmission-id',
      'paypal-transmission-time',
      'paypal-transmission-sig',
      'paypal-cert-url',
      'paypal-auth-algo'
    ];
    
    const missingHeaders = requiredHeaders.filter(h => !headers[h]);
    if (missingHeaders.length > 0) {
      return {
        status: 400,
        error: `Missing required PayPal headers: ${missingHeaders.join(', ')}`
      };
    }
    
    // Verify webhook via PayPal API
    let verificationResult;
    if (paypalVerify) {
      // Use provided verification function (for testing)
      verificationResult = await paypalVerify({
        webhookId,
        headers,
        payload
      });
    } else {
      // Use processor's verification method
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const isValid = processor.verifyWebhookSignature(
        payloadString,
        headers['paypal-transmission-sig'],
        webhookId
      );
      verificationResult = { verification_status: isValid ? 'SUCCESS' : 'FAILURE' };
    }
    
    if (verificationResult.verification_status !== 'SUCCESS') {
      log.warn('PayPal webhook verification failed');
      return {
        status: 400,
        error: 'PayPal webhook verification failed'
      };
    }
    
    // Parse event
    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const eventId = event.id;
    
    if (!eventId) {
      return {
        status: 400,
        error: 'Missing event id'
      };
    }
    
    // Check idempotency (fail closed → 503)
    let isDuplicate;
    try {
      isDuplicate = await checkIdempotency(eventId, 'paypal', prismaClient);
    } catch (idemError) {
      log.error('PayPal idempotency unavailable', { eventId, error: idemError.message });
      return {
        status: 503,
        error: 'Webhook temporarily unavailable'
      };
    }
    if (isDuplicate) {
      log.info('Duplicate PayPal webhook received', { eventId });
      return {
        status: 200,
        action: 'duplicate'
      };
    }
    
    // Process webhook
    try {
      const result = await processor.handleWebhook(event);
      
      // Record successful processing
      await recordWebhookEvent({
        event_id: eventId,
        processor: 'paypal',
        event_type: event.event_type,
        payload: event,
        status: 'processed'
      }, prismaClient);
      
      return {
        status: 200,
        action: result.action,
        data: result.data
      };
    } catch (processingError) {
      log.error('PayPal webhook processing failed', {
        eventId,
        error: processingError.message
      });
      
      // Record failed processing
      await recordWebhookEvent({
        event_id: eventId,
        processor: 'paypal',
        event_type: event.event_type,
        payload: event,
        status: 'failed'
      }, prismaClient).catch(() => {});
      
      return {
        status: 500,
        error: 'Webhook processing failed'
      };
    }
  } catch (error) {
    log.error('PayPal webhook handler error', { error: error.message });
    return {
      status: 500,
      error: 'Webhook processing failed'
    };
  }
}

export default {
  handleStripeWebhook,
  handleSquareWebhook,
  handlePayPalWebhook,
  checkIdempotency,
  recordWebhookEvent,
  normalizeWebhookPayloadString
};


