import express from 'express';
import TrackingService from '../services/trackingService.js';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  asyncHandler
} from '../utils/apiResponse.js';

const router = express.Router();
const trackingService = new TrackingService();

// Simple rate limiting (in-memory, per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

/**
 * Simple rate limiter middleware
 */
const rateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Clean old entries
  if (rateLimitMap.has(ip)) {
    const requests = rateLimitMap.get(ip).filter(time => time > windowStart);
    if (requests.length >= RATE_LIMIT_MAX) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    rateLimitMap.set(ip, [...requests, now]);
  } else {
    rateLimitMap.set(ip, [now]);
  }

  next();
};

/**
 * GET /api/tracking/order/:token
 * Get order status by tracking token
 */
router.get('/order/:token', rateLimit, asyncHandler(async (req, res) => {
  const { token } = req.params;

  try {
    const { order } = await trackingService.getOrderByToken(token);

    // Format order items
    let items = [];
    try {
      if (order.items) {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      }
    } catch (e) {
      // Items might be in separate table or invalid JSON
      console.warn('Could not parse order items:', e.message);
    }

    return sendSuccess(res, {
      order: {
        id: order.id,
        status: order.status,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        total: order.total,
        items,
        shippingAddress: order.shipping_address,
        notes: order.notes,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Invalid')) {
      return sendNotFound(res, error.message, 'TRACKING_TOKEN_INVALID');
    }
    if (error.message.includes('expired')) {
      return sendBadRequest(res, error.message, 'TRACKING_TOKEN_EXPIRED');
    }
    throw error;
  }
}));

/**
 * GET /api/tracking/appointment/:code
 * Get appointment by confirmation code (public, no token required)
 */
router.get('/appointment/:code', rateLimit, asyncHandler(async (req, res) => {
  const { code } = req.params;

  try {
    const appointment = await trackingService.getAppointmentByCode(code);

    return sendSuccess(res, {
      appointment: {
        id: appointment.id,
        confirmationCode: appointment.confirmation_code,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        // Mask PII — full details require email proof via booking appointment endpoints
        customerName: appointment.customer_name
          ? String(appointment.customer_name).charAt(0) + '***'
          : null,
        serviceName: appointment.booking_services.name,
        staffName: appointment.booking_staff.name,
        status: appointment.status,
        totalPriceCents: appointment.total_price_cents,
        businessName: appointment.booking_tenants.business_name,
        createdAt: appointment.created_at,
        cancelledAt: appointment.cancelled_at
      }
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return sendNotFound(res, error.message, 'APPOINTMENT_NOT_FOUND');
    }
    throw error;
  }
}));

/**
 * POST /api/tracking/lookup
 * Generate tracking token from email + order ID or confirmation code
 * Body: { type: 'order' | 'appointment', referenceId: string, email: string }
 */
router.post('/lookup', rateLimit, asyncHandler(async (req, res) => {
  const { type, referenceId, email } = req.body;

  if (!type || !referenceId || !email) {
    return sendBadRequest(res, 'type, referenceId, and email are required', 'MISSING_REQUIRED_FIELDS');
  }

  if (type !== 'order' && type !== 'appointment') {
    return sendBadRequest(res, 'type must be "order" or "appointment"', 'INVALID_TYPE');
  }

  try {
    let trackingToken;

    if (type === 'order') {
      trackingToken = await trackingService.createOrGetOrderToken(referenceId, email);
    } else {
      trackingToken = await trackingService.createOrGetAppointmentToken(referenceId, email);
    }

    if (!trackingToken) {
      return sendNotFound(res, 'Order or appointment not found with matching email', 'NOT_FOUND');
    }

    return sendSuccess(res, {
      token: trackingToken.token,
      type: trackingToken.type,
      expiresAt: trackingToken.expires_at
    });
  } catch (error) {
    if (error.message.includes('does not match')) {
      return sendBadRequest(res, error.message, 'EMAIL_MISMATCH');
    }
    throw error;
  }
}));

/**
 * GET /api/tracking/order/:token/updates
 * Get order status updates (for polling)
 */
router.get('/order/:token/updates', rateLimit, asyncHandler(async (req, res) => {
  const { token } = req.params;

  try {
    const updates = await trackingService.getOrderUpdates(token);

    return sendSuccess(res, { updates });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Invalid')) {
      return sendNotFound(res, error.message, 'TRACKING_TOKEN_INVALID');
    }
    if (error.message.includes('expired')) {
      return sendBadRequest(res, error.message, 'TRACKING_TOKEN_EXPIRED');
    }
    throw error;
  }
}));

/**
 * GET /api/tracking/appointment/:code/updates
 * Get appointment status updates (for polling)
 */
router.get('/appointment/:code/updates', rateLimit, asyncHandler(async (req, res) => {
  const { code } = req.params;

  try {
    const updates = await trackingService.getAppointmentUpdates(code);

    return sendSuccess(res, { updates });
  } catch (error) {
    if (error.message.includes('not found')) {
      return sendNotFound(res, error.message, 'APPOINTMENT_NOT_FOUND');
    }
    throw error;
  }
}));

export default router;


