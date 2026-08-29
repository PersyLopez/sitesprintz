/**
 * Booking Payment Integration - Phase 2 Sprint 2
 * 
 * Extends existing Stripe payment system for appointment deposits/payments
 * Reuses: Stripe Connect, payment intents, checkout sessions
 * 
 * This service acts as an adapter between booking system and existing Stripe utils
 */

import { prisma } from '../../../database/db.js';
import Stripe from 'stripe';
import { addDays } from 'date-fns';
import BookingFeeService from './BookingFeeService.js';
import { sitePaymentEnabled } from './shopIntakeFlags.js';
import { publicVisitorCheckoutProcessor } from '../payments/processorConnectHelpers.js';
import { parseSiteData } from '../../utils/parseSiteData.js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

class BookingPaymentAdapter {
  constructor(stripeClient = null) {
    this.feeService = new BookingFeeService();
    this._stripeClient = stripeClient; // For dependency injection (testing)
  }

  /**
   * Get Stripe client instance (lazy initialization)
   * Allows for dependency injection in tests
   */
  getStripe() {
    if (this._stripeClient) {
      return this._stripeClient;
    }
    
    if (!STRIPE_SECRET_KEY) {
      return null;
    }
    
    if (!this._stripe) {
      this._stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    }
    
    return this._stripe;
  }

  payOnSiteCheckoutResult(appointmentId) {
    return {
      checkoutUrl: null,
      sessionId: null,
      appointmentId,
      amountCents: 0,
      paymentType: 'none',
      payOnSite: true,
      fees: { service: '0.00', bookingFee: '0.00', total: '0.00' },
    };
  }

  async confirmPayOnSite(appointmentId) {
    await prisma.appointments.update({
      where: { id: appointmentId },
      data: {
        status: 'confirmed',
        payment_status: 'unpaid',
        payment_method: 'pay_on_site',
      },
    });
    return this.payOnSiteCheckoutResult(appointmentId);
  }

  /**
   * Create booking payment using existing Stripe system
   * Adapts appointment details to checkout format
   * Includes automatic fee calculations (booking, cancellation, no-show)
   */
  async createBookingCheckout(appointmentId, paymentType = 'full') {
    try {
      const appointment = await prisma.appointments.findUnique({
        where: { id: appointmentId },
        include: {
          booking_services: true,
          booking_tenants: true
        }
      });

      if (!appointment) {
        throw new Error(`Appointment ${appointmentId} not found`);
      }

      const tenantRecord = appointment.booking_tenants;
      let siteData = {};
      let subdomain = null;
      if (tenantRecord?.site_id) {
        const site = await prisma.sites.findUnique({
          where: { id: tenantRecord.site_id },
          select: { site_data: true, subdomain: true },
        });
        siteData = parseSiteData(site?.site_data);
        subdomain = site?.subdomain || null;
      }

      if (!sitePaymentEnabled(siteData, tenantRecord)) {
        return this.payOnSiteCheckoutResult(appointmentId);
      }

      const tenant = await prisma.booking_tenants.findUnique({
        where: { id: appointment.tenant_id },
        include: { users: { select: { stripe_account_id: true, stripe_connected: true } } }
      });

      const stripeAccountId = tenant?.users?.stripe_account_id || tenant?.stripe_account_id;
      const checkoutProcessor = publicVisitorCheckoutProcessor({
        user: tenant?.users,
        defaultProcessor: 'stripe',
      });
      if (checkoutProcessor !== 'stripe' || !stripeAccountId) {
        return this.confirmPayOnSite(appointmentId);
      }

      // Calculate all fees
      const fees = await this.feeService.calculateAllFees(appointmentId);

      // Calculate booking price based on payment type
      // price_cents is in cents, so convert to dollars for calculation
      const servicePriceDollars = appointment.booking_services.price_cents / 100;
      const basePriceDollars = this.calculateBookingPrice(
        servicePriceDollars,
        paymentType,
        appointment.booking_services.deposit_percentage || 50
      );

      // Total includes base price + booking fee (both in dollars)
      const totalPriceDollars = basePriceDollars + (fees.bookingFeeCents / 100);
      const totalPriceCents = Math.round(totalPriceDollars * 100);

      const stripe = this.getStripe();
      if (!stripe) {
        return this.confirmPayOnSite(appointmentId);
      }

      const origin = process.env.FRONTEND_URL || 'http://localhost:5173';
      const confirmationCode = appointment.confirmation_code;
      if (!confirmationCode) {
        throw new Error(`Appointment ${appointmentId} is missing a confirmation code`);
      }
      const appointmentPath = `/booking/appointment/${encodeURIComponent(confirmationCode)}`;
      const successUrl = `${origin}${appointmentPath}?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = subdomain
        ? `${origin}/view/${encodeURIComponent(subdomain)}`
        : `${origin}${appointmentPath}`;

      // Create Stripe Checkout Session
      const sessionParams = {
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${appointment.booking_services.name} - Appointment Booking`,
              description: `Booking for ${appointment.customer_name} on ${new Date(appointment.start_time).toLocaleDateString()}`
            },
            unit_amount: totalPriceCents
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: appointment.customer_email,
        metadata: {
          type: 'booking', // Critical: tells webhook this is a booking payment
          appointment_id: appointmentId,
          tenant_id: appointment.tenant_id,
          service_id: appointment.service_id,
          payment_type: paymentType,
          service_price: basePriceDollars.toString(),
          booking_fee: (fees.bookingFeeCents / 100).toString(),
          fees: JSON.stringify(fees.breakdown)
        }
      };

      const platformFee = Math.min(Math.max(Math.round(totalPriceCents * 0.01), 50), 500);
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFee
      };

      const session = await stripe.checkout.sessions.create(sessionParams, {
        stripeAccount: stripeAccountId,
      });

      // Store payment session reference
      await prisma.appointments.update({
        where: { id: appointmentId },
        data: {
          stripe_session_id: session.id,
          payment_intent_id: session.payment_intent || session.id, // Fallback to session.id if no payment_intent yet
          payment_amount_cents: totalPriceCents,
          payment_method: paymentType,
          payment_status: 'pending',
          payment_initiated_at: new Date()
        }
      });

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
        appointmentId,
        amountCents: totalPriceCents,
        paymentType,
        fees: fees.breakdown
      };
    } catch (error) {
      console.error('[BookingPaymentAdapter] Error creating checkout:', error);
      throw error;
    }
  }

  /**
   * Calculate booking price based on payment type
   * @param {number} servicePriceDollars - Service price in dollars
   * @param {string} paymentType - 'full' or 'deposit'
   * @param {number} depositPercentage - Percentage for deposit (0-100)
   * @returns {number} Price in dollars
   */
  calculateBookingPrice(servicePriceDollars, paymentType, depositPercentage = 50) {
    if (paymentType === 'full') {
      return servicePriceDollars;
    } else if (paymentType === 'deposit') {
      return (servicePriceDollars * depositPercentage) / 100;
    }
    return 0;
  }

  /**
   * Handle successful payment for appointment
   * Called when Stripe webhook confirms payment
   */
  async handlePaymentSuccess(sessionId, appointmentId) {
    try {
      const appointment = await prisma.appointments.update({
        where: { id: appointmentId },
        data: {
          status: 'confirmed',
          payment_status: 'paid',
          paid_at: new Date()
        },
        include: {
          booking_services: true,
          booking_tenants: true
        }
      });

      // Send payment confirmation email
      await this.sendPaymentConfirmationEmail(appointment);

      // If deposit payment, mark remaining balance due
      if (appointment.payment_method === 'deposit') {
        await this.createRemainingBalanceDue(appointmentId);
      }

      return {
        success: true,
        appointmentId,
        paymentStatus: 'paid'
      };
    } catch (error) {
      console.error('[BookingPaymentAdapter] Error handling payment success:', error);
      throw error;
    }
  }

  /**
   * Confirm a returned Checkout session on the connected account.
   * Connect checkout.session.completed often never hits the platform webhook.
   */
  async confirmCheckoutSession(sessionId, confirmationCode) {
    if (!sessionId || !confirmationCode) {
      throw new Error('session_id and confirmation_code are required');
    }

    const appointment = await prisma.appointments.findFirst({
      where: { stripe_session_id: sessionId },
      include: {
        booking_tenants: {
          include: { users: { select: { stripe_account_id: true } } }
        }
      }
    });

    if (!appointment || appointment.confirmation_code !== confirmationCode) {
      throw new Error('Appointment not found for this checkout session');
    }

    if (appointment.payment_status === 'paid') {
      return { success: true, appointmentId: appointment.id, paymentStatus: 'paid' };
    }

    const stripe = this.getStripe();
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const stripeAccountId = appointment.booking_tenants?.users?.stripe_account_id
      || appointment.booking_tenants?.stripe_account_id;
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      stripeAccountId ? { stripeAccount: stripeAccountId } : {}
    );

    if (session.payment_status !== 'paid') {
      throw new Error('Checkout session is not paid');
    }

    const metaAppointmentId = session.metadata?.appointment_id;
    if (metaAppointmentId && metaAppointmentId !== appointment.id) {
      throw new Error('Checkout session does not match this appointment');
    }

    return this.handlePaymentSuccess(sessionId, appointment.id);
  }

  /**
   * Handle failed payment for appointment
   */
  async handlePaymentFailure(sessionId, appointmentId, errorMessage) {
    try {
      await prisma.appointments.update({
        where: { id: appointmentId },
        data: {
          payment_status: 'failed'
        }
      });

      // Optionally: Send payment failure email to customer
      // Request to retry payment

      return {
        success: false,
        appointmentId,
        error: errorMessage
      };
    } catch (error) {
      console.error('[BookingPaymentAdapter] Error handling payment failure:', error);
      throw error;
    }
  }

  /**
   * Process refund using Stripe refund API
   */
  async refundAppointmentPayment(appointmentId, reason = 'appointment_cancellation') {
    try {
      const stripe = this.getStripe();
      if (!stripe) {
        throw new Error('Stripe is not configured');
      }

      const appointment = await prisma.appointments.findUnique({
        where: { id: appointmentId }
      });

      if (!appointment) {
        throw new Error(`Appointment ${appointmentId} not found`);
      }

      if (appointment.payment_status !== 'paid') {
        throw new Error('Only paid appointments can be refunded');
      }

      if (!appointment.payment_intent_id && !appointment.stripe_session_id) {
        throw new Error('No payment intent or session found for this appointment');
      }

      // Get payment intent ID from session if needed
      let paymentIntentId = appointment.payment_intent_id;
      if (!paymentIntentId && appointment.stripe_session_id) {
        const session = await stripe.checkout.sessions.retrieve(appointment.stripe_session_id);
        paymentIntentId = session.payment_intent;
      }

      if (!paymentIntentId) {
        throw new Error('Could not find payment intent for refund');
      }

      // Create refund via Stripe
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: reason === 'customer_request' ? 'requested_by_customer' : 'other',
        metadata: {
          appointment_id: appointmentId,
          tenant_id: appointment.tenant_id,
          reason: reason
        }
      });

      // Update appointment status
      await prisma.appointments.update({
        where: { id: appointmentId },
        data: {
          payment_status: 'refunded',
          refund_amount_cents: refund.amount,
          refund_reason: reason,
          refunded_at: new Date()
        }
      });

      // Create notification for customer
      await prisma.booking_notifications.create({
        data: {
          tenant_id: appointment.tenant_id,
          appointment_id: appointmentId,
          type: 'refund',
          channel: 'email',
          recipient_email: appointment.customer_email,
          subject: 'Refund Processed',
          status: 'pending'
        }
      });

      return {
        success: true,
        appointmentId,
        refundId: refund.id,
        amount: refund.amount,
        status: 'refunded'
      };
    } catch (error) {
      console.error('[BookingPaymentAdapter] Error refunding appointment:', error);
      throw error;
    }
  }

  /**
   * Create record for remaining balance
   * When deposit payment, customer still owes remaining balance
   */
  async createRemainingBalanceDue(appointmentId) {
    try {
      const appointment = await prisma.appointments.findUnique({
        where: { id: appointmentId },
        include: {
          booking_services: true
        }
      });

      const depositPaid = appointment.payment_amount_cents;
      const fullPrice = appointment.booking_services.price_cents; // Already in cents
      const remainingBalance = fullPrice - depositPaid;

      if (remainingBalance > 0) {
        // Create a note/record about remaining balance
        // This could be a separate record or just stored in appointment
        await prisma.appointments.update({
          where: { id: appointmentId },
          data: {
            remaining_balance_cents: remainingBalance
          }
        });
      }

      return {
        appointmentId,
        depositPaid: depositPaid / 100,
        totalPrice: fullPrice / 100,
        remainingBalance: remainingBalance / 100
      };
    } catch (error) {
      console.error('[BookingPaymentAdapter] Error creating balance due:', error);
      throw error;
    }
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(appointment) {
    // This would integrate with existing email service
    console.log(`[BookingPaymentAdapter] Payment confirmation email for ${appointment.customer_email}`);
  }

  /**
   * Enable/disable payment requirement for service
   */
  async setServicePaymentRequirement(serviceId, required, paymentType = 'deposit', depositPercentage = 50) {
    try {
      await prisma.booking_services.update({
        where: { id: serviceId },
        data: {
          requires_payment: required,
          payment_type: required ? paymentType : 'none',
          deposit_percentage: depositPercentage
        }
      });

      return {
        serviceId,
        paymentRequired: required,
        paymentType,
        depositPercentage
      };
    } catch (error) {
      console.error('[BookingPaymentAdapter] Error setting payment requirement:', error);
      throw error;
    }
  }

  /**
   * Get payment summary for appointment
   */
  async getPaymentSummary(appointmentId) {
    try {
      const appointment = await prisma.appointments.findUnique({
        where: { id: appointmentId },
        select: {
          payment_status: true,
          payment_amount_cents: true,
          payment_method: true,
          paid_at: true,
          refunded_at: true,
          remaining_balance_cents: true
        }
      });

      if (!appointment) {
        throw new Error(`Appointment ${appointmentId} not found`);
      }

      return {
        status: appointment.payment_status,
        amountPaid: `$${(appointment.payment_amount_cents / 100).toFixed(2)}`,
        paymentMethod: appointment.payment_method,
        remainingBalance: appointment.remaining_balance_cents ? `$${(appointment.remaining_balance_cents / 100).toFixed(2)}` : null,
        paidAt: appointment.paid_at,
        refundedAt: appointment.refunded_at
      };
    } catch (error) {
      console.error('[BookingPaymentAdapter] Error getting payment summary:', error);
      throw error;
    }
  }
}

export default BookingPaymentAdapter;

