/**
 * Phase 2.1 Booking Fee Management Routes
 * 
 * Endpoints for managing cancellation fees, no-show penalties, and booking fees
 */

import express from 'express';
import BookingFeeService from '../services/booking/BookingFeeService.js';
import { requireAuth as authenticateUser } from '../middleware/auth.js';

const router = express.Router();
const feeService = new BookingFeeService();

/**
 * GET /api/booking/services/:serviceId/fee-policies
 * Get all fee policies for a service
 */
router.get('/services/:serviceId/fee-policies', async (req, res) => {
  try {
    const { serviceId } = req.params;

    const policies = await feeService.getPoliciesForService(serviceId);

    res.json(policies);
  } catch (error) {
    console.error('[FeeRoutes] Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch fee policies' });
  }
});

/**
 * PUT /api/booking/services/:serviceId/fee-policies
 * Update all fee policies for a service
 */
router.put('/services/:serviceId/fee-policies', authenticateUser, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { cancellationPolicy, noShowPolicy, bookingFeePolicy } = req.body;

    // Update each policy
    if (cancellationPolicy) {
      await feeService.updateCancellationPolicy(serviceId, cancellationPolicy);
    }

    if (noShowPolicy) {
      await feeService.updateNoShowPolicy(serviceId, noShowPolicy);
    }

    if (bookingFeePolicy) {
      await feeService.updateBookingFeePolicy(serviceId, bookingFeePolicy);
    }

    res.json({
      success: true,
      message: 'Fee policies updated successfully',
      policies: {
        cancellationPolicy,
        noShowPolicy,
        bookingFeePolicy
      }
    });
  } catch (error) {
    console.error('[FeeRoutes] Error updating policies:', error);
    res.status(500).json({ error: 'Failed to update fee policies' });
  }
});

/**
 * POST /api/booking/appointments/:appointmentId/cancellation-fee
 * Calculate and apply cancellation fee
 */
router.post('/appointments/:appointmentId/cancellation-fee', authenticateUser, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const feeInfo = await feeService.processCancellationFee(
      appointmentId,
      new Date()
    );

    res.json({
      success: true,
      feeInfo
    });
  } catch (error) {
    console.error('[FeeRoutes] Error processing cancellation fee:', error);
    res.status(500).json({ error: 'Failed to process cancellation fee' });
  }
});

/**
 * POST /api/booking/appointments/:appointmentId/no-show-fee
 * Apply no-show fee
 */
router.post('/appointments/:appointmentId/no-show-fee', authenticateUser, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const result = await feeService.processNoShowFee(appointmentId);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('[FeeRoutes] Error processing no-show fee:', error);
    res.status(500).json({ error: 'Failed to process no-show fee' });
  }
});

/**
 * POST /api/booking/appointments/:appointmentId/calculate-fees
 * Calculate all fees for an appointment (used at booking time)
 */
router.post('/appointments/:appointmentId/calculate-fees', async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const feeInfo = await feeService.calculateAllFees(appointmentId);

    res.json({
      success: true,
      feeInfo
    });
  } catch (error) {
    console.error('[FeeRoutes] Error calculating fees:', error);
    res.status(500).json({ error: 'Failed to calculate fees' });
  }
});

export default router;


