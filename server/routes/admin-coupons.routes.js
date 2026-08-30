import express from 'express';
import Stripe from 'stripe';
import { requireAdmin } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendConflict,
  sendServiceUnavailable,
  asyncHandler,
} from '../utils/apiResponse.js';
import {
  createPlatformCoupon,
  listPlatformCoupons,
  updatePlatformCouponActive,
} from '../services/platformCouponService.js';

const router = express.Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

router.get('/coupons', requireAdmin, asyncHandler(async (_req, res) => {
  const coupons = await listPlatformCoupons({ prisma });
  return sendSuccess(res, { coupons });
}));

router.post('/coupons', requireAdmin, asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
  }

  try {
    const coupon = await createPlatformCoupon(req.body, {
      stripe,
      prisma,
      createdBy: req.user.id,
    });
    return sendCreated(res, { coupon }, 'Coupon created successfully');
  } catch (error) {
    const code = error?.code;
    if (code === 'DISCOUNT_XOR' || code === 'INVALID_PERCENT' || code === 'INVALID_AMOUNT'
      || code === 'INVALID_DURATION' || code === 'INVALID_DURATION_MONTHS'
      || code === 'INVALID_MAX_REDEMPTIONS' || code === 'INVALID_EXPIRES_AT'
      || code === 'INVALID_CODE') {
      return sendBadRequest(res, error.message, code);
    }
    if (code === 'CODE_EXISTS') {
      return sendConflict(res, error.message, code);
    }
    if (code === 'MISSING_PLAN_PRICE' || code === 'MISSING_PLAN_PRODUCT') {
      return sendBadRequest(res, error.message, code);
    }
    throw error;
  }
}));

router.patch('/coupons/:id', requireAdmin, asyncHandler(async (req, res) => {
  if (!stripe) {
    return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
  }

  try {
    const coupon = await updatePlatformCouponActive(req.params.id, req.body, {
      stripe,
      prisma,
    });
    return sendSuccess(res, { coupon }, 'Coupon updated successfully');
  } catch (error) {
    if (error?.code === 'NOT_FOUND') {
      return sendNotFound(res, 'Coupon', 'COUPON_NOT_FOUND');
    }
    if (error?.code === 'INVALID_ACTIVE') {
      return sendBadRequest(res, error.message, error.code);
    }
    throw error;
  }
}));

export default router;
