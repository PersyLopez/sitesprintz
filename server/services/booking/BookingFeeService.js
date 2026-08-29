/**
 * Booking Fee Service - Phase 2.1
 * 
 * Handles calculation and management of:
 * - Cancellation fees (sliding scale)
 * - No-show penalties
 * - Booking/platform fees
 */

import { prisma } from '../../../database/db.js';
import { differenceInHours } from 'date-fns';
import { parseSiteData } from '../../utils/parseSiteData.js';
import { siteFeesEnabled } from '../../../src/utils/visitorExperience.js';

function unpackFeePolicies(raw) {
  if (raw == null || raw === '') {
    return { cancellationPolicy: null, noShowPolicy: null, bookingFeePolicy: null };
  }
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { cancellationPolicy: raw, noShowPolicy: null, bookingFeePolicy: null };
    }
  }
  if (parsed && typeof parsed === 'object' && 'cancellationPolicy' in parsed) {
    return {
      cancellationPolicy: parsed.cancellationPolicy ?? null,
      noShowPolicy: parsed.noShowPolicy ?? null,
      bookingFeePolicy: parsed.bookingFeePolicy ?? null,
    };
  }
  return { cancellationPolicy: parsed, noShowPolicy: null, bookingFeePolicy: null };
}

function packFeePolicies(existingRaw, patch) {
  return JSON.stringify({
    ...unpackFeePolicies(existingRaw),
    ...patch,
  });
}

class BookingFeeService {
  /**
   * Calculate all fees for an appointment
   */
  async calculateAllFees(appointmentId) {
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

      const tenant = appointment.booking_tenants;
      let feesGloballyEnabled = true;
      if (tenant?.site_id) {
        const site = await prisma.sites.findUnique({
          where: { id: tenant.site_id },
          select: { site_data: true },
        });
        feesGloballyEnabled = siteFeesEnabled(parseSiteData(site?.site_data));
      }

      const service = appointment.booking_services;
      const servicePriceCents = service.price * 100 || 0;

      // Calculate booking fee
      const bookingFeeCents = feesGloballyEnabled
        ? this.calculateBookingFee(servicePriceCents, service.booking_fee_policy)
        : 0;

      // Total payable at booking
      const totalPayableCents = servicePriceCents + bookingFeeCents;

      // Update appointment
      await prisma.appointments.update({
        where: { id: appointmentId },
        data: {
          booking_fee_cents: bookingFeeCents,
          service_price_cents: servicePriceCents,
          total_payable_cents: totalPayableCents
        }
      });

      return {
        servicePriceCents,
        bookingFeeCents,
        totalPayableCents,
        breakdown: {
          service: (servicePriceCents / 100).toFixed(2),
          bookingFee: (bookingFeeCents / 100).toFixed(2),
          total: (totalPayableCents / 100).toFixed(2)
        }
      };
    } catch (error) {
      console.error('[BookingFeeService] Error calculating fees:', error);
      throw error;
    }
  }

  /**
   * Calculate booking/platform fee
   */
  calculateBookingFee(servicePriceCents, bookingFeePolicy) {
    if (!bookingFeePolicy || !bookingFeePolicy.enabled) {
      return 0;
    }

    if (bookingFeePolicy.type === 'flat') {
      return bookingFeePolicy.amount || 0;
    } else if (bookingFeePolicy.type === 'percentage') {
      return Math.round((servicePriceCents * bookingFeePolicy.percentage) / 100);
    }

    return 0;
  }

  /**
   * Calculate cancellation fee based on timing
   */
  calculateCancellationFee(servicePriceCents, cancellationPolicy, cancelledAtDate) {
    if (!cancellationPolicy || !cancellationPolicy.enabled) {
      return 0;
    }

    if (cancellationPolicy.type !== 'sliding_scale') {
      return 0;
    }

    // Calculate hours between now and appointment
    const now = new Date();
    const hoursDifference = differenceInHours(cancelledAtDate, now);

    // Find applicable fee based on hours
    let applicableFeePercentage = 0;
    const rules = cancellationPolicy.rules || [];

    for (const rule of rules) {
      if (rule.cancelWithinHours && hoursDifference <= rule.cancelWithinHours) {
        applicableFeePercentage = rule.feePercentage;
        break;
      }
      if (rule.cancelAfterHours && hoursDifference > rule.cancelAfterHours) {
        applicableFeePercentage = rule.feePercentage;
      }
    }

    // Calculate fee amount (percentage of service price, NOT including booking fee)
    return Math.round((servicePriceCents * applicableFeePercentage) / 100);
  }

  /**
   * Process cancellation and calculate refund
   */
  async processCancellationFee(appointmentId, cancelledAtDate) {
    try {
      const appointment = await prisma.appointments.findUnique({
        where: { id: appointmentId },
        include: {
          booking_services: true
        }
      });

      if (!appointment) {
        throw new Error(`Appointment ${appointmentId} not found`);
      }

      const service = appointment.booking_services;
      const servicePriceCents = service.price * 100 || 0;

      // Calculate cancellation fee
      const cancellationFeeCents = this.calculateCancellationFee(
        servicePriceCents,
        service.cancellation_policy,
        cancelledAtDate
      );

      // Calculate Stripe fee retention (2.9% + $0.30 per transaction)
      const stripeFeePercentage = 0.029;
      const stripeFeeFlat = 30; // cents
      const originalStripeFee = Math.round(
        (appointment.total_payable_cents * stripeFeePercentage) + stripeFeeFlat
      );

      // Calculate refund
      const refundEligibleCents = appointment.total_payable_cents - cancellationFeeCents;
      const customerNetRefund = refundEligibleCents - originalStripeFee;

      // Update appointment with cancellation fee info
      await prisma.appointments.update({
        where: { id: appointmentId },
        data: {
          cancellation_fee_cents: cancellationFeeCents,
          final_refund_cents: refundEligibleCents,
          stripe_processing_fee_cents: originalStripeFee,
          customer_net_refund_cents: Math.max(0, customerNetRefund)
        }
      });

      return {
        cancellationFeeCents,
        refundEligibleCents,
        stripeFeeRetained: originalStripeFee,
        customerNetRefund: Math.max(0, customerNetRefund),
        breakdown: {
          paid: (appointment.total_payable_cents / 100).toFixed(2),
          cancellationFee: (cancellationFeeCents / 100).toFixed(2),
          stripeFeeRetained: (originalStripeFee / 100).toFixed(2),
          customerRefund: (Math.max(0, customerNetRefund) / 100).toFixed(2)
        }
      };
    } catch (error) {
      console.error('[BookingFeeService] Error processing cancellation fee:', error);
      throw error;
    }
  }

  /**
   * Calculate no-show fee
   */
  async processNoShowFee(appointmentId) {
    try {
      const appointment = await prisma.appointments.findUnique({
        where: { id: appointmentId },
        include: {
          booking_services: true
        }
      });

      if (!appointment) {
        throw new Error(`Appointment ${appointmentId} not found`);
      }

      const service = appointment.booking_services;
      const noShowPolicy = service.no_show_policy;

      if (!noShowPolicy || !noShowPolicy.enabled) {
        return { charged: false, amount: 0 };
      }

      let noShowFeeCents = 0;

      if (noShowPolicy.feeType === 'percentage') {
        // Calculate as percentage of service price only (not including booking fee)
        const servicePriceCents = service.price * 100 || 0;
        noShowFeeCents = Math.round(
          (servicePriceCents * noShowPolicy.feeAmount) / 100
        );
      } else if (noShowPolicy.feeType === 'fixed') {
        noShowFeeCents = noShowPolicy.feeAmount || 0;
      }

      // Update appointment
      await prisma.appointments.update({
        where: { id: appointmentId },
        data: {
          no_show: true,
          no_show_fee_cents: noShowFeeCents,
          no_show_charged_at: new Date()
        }
      });

      return {
        charged: true,
        amount: noShowFeeCents,
        amountFormatted: (noShowFeeCents / 100).toFixed(2)
      };
    } catch (error) {
      console.error('[BookingFeeService] Error processing no-show fee:', error);
      throw error;
    }
  }

  /**
   * Update cancellation policy for a service
   */
  async updateCancellationPolicy(serviceId, policy) {
    try {
      const current = await prisma.booking_services.findUnique({
        where: { id: serviceId },
        select: { cancellation_policy: true },
      });
      await prisma.booking_services.update({
        where: { id: serviceId },
        data: {
          cancellation_policy: packFeePolicies(current?.cancellation_policy, {
            cancellationPolicy: policy,
          }),
        }
      });

      return {
        serviceId,
        policy,
        updated: true
      };
    } catch (error) {
      console.error('[BookingFeeService] Error updating cancellation policy:', error);
      throw error;
    }
  }

  /**
   * Update no-show policy for a service
   */
  async updateNoShowPolicy(serviceId, policy) {
    try {
      const current = await prisma.booking_services.findUnique({
        where: { id: serviceId },
        select: { cancellation_policy: true },
      });
      await prisma.booking_services.update({
        where: { id: serviceId },
        data: {
          cancellation_policy: packFeePolicies(current?.cancellation_policy, {
            noShowPolicy: policy,
          }),
        }
      });

      return {
        serviceId,
        policy,
        updated: true
      };
    } catch (error) {
      console.error('[BookingFeeService] Error updating no-show policy:', error);
      throw error;
    }
  }

  /**
   * Update booking fee policy for a service
   */
  async updateBookingFeePolicy(serviceId, policy) {
    try {
      const current = await prisma.booking_services.findUnique({
        where: { id: serviceId },
        select: { cancellation_policy: true },
      });
      await prisma.booking_services.update({
        where: { id: serviceId },
        data: {
          cancellation_policy: packFeePolicies(current?.cancellation_policy, {
            bookingFeePolicy: policy,
          }),
        }
      });

      return {
        serviceId,
        policy,
        updated: true
      };
    } catch (error) {
      console.error('[BookingFeeService] Error updating booking fee policy:', error);
      throw error;
    }
  }

  /**
   * Get all policies for a service
   */
  async getPoliciesForService(serviceId) {
    try {
      const service = await prisma.booking_services.findUnique({
        where: { id: serviceId },
        select: {
          cancellation_policy: true,
        }
      });

      const unpacked = unpackFeePolicies(service?.cancellation_policy);
      return {
        serviceId,
        cancellationPolicy: unpacked.cancellationPolicy,
        noShowPolicy: unpacked.noShowPolicy,
        bookingFeePolicy: unpacked.bookingFeePolicy,
      };
    } catch (error) {
      console.error('[BookingFeeService] Error getting policies:', error);
      throw error;
    }
  }
}

export default BookingFeeService;


