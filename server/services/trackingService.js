import { prisma } from '../../database/db.js';
import crypto from 'crypto';

/**
 * Tracking Service
 * Handles customer tracking tokens for orders and appointments
 */
class TrackingService {
  /**
   * Generate a secure tracking token (16 bytes = 128 bits)
   */
  generateToken() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Create or get tracking token for an order
   * @param {string} orderId - Order ID
   * @param {string} email - Customer email
   * @returns {Promise<object>} Tracking token
   */
  async createOrGetOrderToken(orderId, email) {
    try {
      const id = String(orderId || '').trim();
      const emailNorm = String(email || '').trim().toLowerCase();

      // UUID (or non-empty) guard — avoid Prisma UUID cast errors on garbage input
      const uuidLike =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      if (!id || !emailNorm || !uuidLike) {
        return null;
      }

      // Verify order exists and email matches before issuing a token
      const order = await prisma.orders.findUnique({
        where: { id },
        select: { id: true, customer_email: true },
      });

      if (!order) {
        return null;
      }

      if (
        order.customer_email &&
        order.customer_email.toLowerCase() !== emailNorm
      ) {
        throw new Error('Email does not match order');
      }

      // Check for existing valid token
      const existing = await prisma.tracking_tokens.findFirst({
        where: {
          type: 'order',
          reference_id: id,
          email: emailNorm,
          expires_at: {
            gt: new Date()
          }
        }
      });

      if (existing) {
        return existing;
      }

      // Create new token (expires in 90 days)
      const token = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      const trackingToken = await prisma.tracking_tokens.create({
        data: {
          type: 'order',
          reference_id: id,
          email: emailNorm,
          token,
          expires_at: expiresAt
        }
      });

      return trackingToken;
    } catch (error) {
      console.error('Error creating order tracking token:', error);
      throw error;
    }
  }

  /**
   * Create or get tracking token for an appointment
   * @param {string} confirmationCode - Appointment confirmation code
   * @param {string} email - Customer email
   * @returns {Promise<object>} Tracking token (or null if appointment not found)
   */
  async createOrGetAppointmentToken(confirmationCode, email) {
    try {
      // Verify appointment exists and email matches
      const appointment = await prisma.appointments.findUnique({
        where: { confirmation_code: confirmationCode },
        select: {
          id: true,
          customer_email: true,
          tenant_id: true
        }
      });

      if (!appointment) {
        return null;
      }

      if (appointment.customer_email.toLowerCase() !== email.toLowerCase()) {
        throw new Error('Email does not match appointment');
      }

      // Check for existing valid token
      const existing = await prisma.tracking_tokens.findFirst({
        where: {
          type: 'appointment',
          reference_id: confirmationCode,
          email: email.toLowerCase(),
          expires_at: {
            gt: new Date()
          }
        }
      });

      if (existing) {
        return existing;
      }

      // Create new token (expires in 90 days)
      const token = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      const trackingToken = await prisma.tracking_tokens.create({
        data: {
          type: 'appointment',
          reference_id: confirmationCode,
          email: email.toLowerCase(),
          token,
          expires_at: expiresAt
        }
      });

      return trackingToken;
    } catch (error) {
      console.error('Error creating appointment tracking token:', error);
      throw error;
    }
  }

  /**
   * Get order by tracking token
   * @param {string} token - Tracking token
   * @returns {Promise<object>} Order data
   */
  async getOrderByToken(token) {
    try {
      const trackingToken = await prisma.tracking_tokens.findUnique({
        where: { token }
      });

      if (!trackingToken) {
        throw new Error('Invalid tracking token');
      }

      if (trackingToken.type !== 'order') {
        throw new Error('Token is not for an order');
      }

      if (new Date(trackingToken.expires_at) < new Date()) {
        throw new Error('Tracking token has expired');
      }

      // Update last accessed
      await prisma.tracking_tokens.update({
        where: { id: trackingToken.id },
        data: { last_accessed: new Date() }
      });

      // Get order (skip invalid UUID reference ids)
      const refId = trackingToken.reference_id;
      const uuidLike =
        typeof refId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(refId);
      if (!uuidLike) {
        throw new Error('Order not found');
      }

      const order = await prisma.orders.findUnique({
        where: { id: refId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      return {
        order,
        trackingToken
      };
    } catch (error) {
      console.error('Error getting order by token:', error);
      throw error;
    }
  }

  /**
   * Get appointment by confirmation code (public, no token required)
   * @param {string} confirmationCode - Appointment confirmation code
   * @returns {Promise<object>} Appointment data
   */
  async getAppointmentByCode(confirmationCode) {
    try {
      const appointment = await prisma.appointments.findUnique({
        where: { confirmation_code: confirmationCode },
        include: {
          booking_services: {
            select: {
              name: true,
              duration_minutes: true
            }
          },
          booking_staff: {
            select: {
              name: true
            }
          },
          booking_tenants: {
            select: {
              business_name: true,
              phone: true,
              email: true
            }
          }
        }
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      return appointment;
    } catch (error) {
      console.error('Error getting appointment by code:', error);
      throw error;
    }
  }

  /**
   * Get order status updates (for polling)
   * @param {string} token - Tracking token
   * @returns {Promise<object>} Order status and last update time
   */
  async getOrderUpdates(token) {
    try {
      const { order } = await this.getOrderByToken(token);

      return {
        status: order.status,
        updatedAt: order.updated_at,
        createdAt: order.created_at
      };
    } catch (error) {
      console.error('Error getting order updates:', error);
      throw error;
    }
  }

  /**
   * Get appointment status updates (for polling)
   * @param {string} confirmationCode - Appointment confirmation code
   * @returns {Promise<object>} Appointment status and last update time
   */
  async getAppointmentUpdates(confirmationCode) {
    try {
      const appointment = await this.getAppointmentByCode(confirmationCode);

      return {
        status: appointment.status,
        updatedAt: appointment.updated_at,
        createdAt: appointment.created_at,
        cancelledAt: appointment.cancelled_at
      };
    } catch (error) {
      console.error('Error getting appointment updates:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired tracking tokens
   * @returns {Promise<number>} Number of tokens deleted
   */
  async cleanupExpiredTokens() {
    try {
      const result = await prisma.tracking_tokens.deleteMany({
        where: {
          expires_at: {
            lt: new Date()
          }
        }
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  }
}

export default TrackingService;



