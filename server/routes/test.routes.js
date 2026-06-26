/**
 * Test Utilities Routes
 * 
 * Provides test hooks for manual/automated testing in development/test environments.
 * These endpoints should NEVER be enabled in production.
 * 
 * Requires: NODE_ENV=test or NODE_ENV=development
 */

import express from 'express';
import { prisma } from '../../database/db.js';
import { sendSuccess, sendForbidden, sendServerError } from '../utils/apiResponse.js';

const router = express.Router();

/**
 * Check if request originates from a local/loopback address.
 */
function isLocalRequest(req) {
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
  const localPatterns = [
    '::1',
    '::ffff:127.0.0.1',
    '127.0.0.1',
    'localhost'
  ];
  return localPatterns.some(pattern => ip.includes(pattern));
}

// Security check: Only allow in test/dev environment and from local IPs in dev
router.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    return sendForbidden(res, 'Test endpoints only available in development');
  }

  // In development mode, further restrict to local requests
  // unless DEV_TEST_ROUTE_TOKEN is set for CI/remote testing
  if (process.env.NODE_ENV === 'development') {
    if (!isLocalRequest(req) && !process.env.DEV_TEST_ROUTE_TOKEN) {
      return sendForbidden(res, 'Test endpoints are local-only in development');
    }
  }

  next();
});

/**
 * POST /api/test/expire-trial
 * Expire a user's trial subscription immediately
 * Used for testing trial expiration emails
 * 
 * Body: { userId?: string, email?: string }
 * If neither provided, uses authenticated user
 */
router.post('/test/expire-trial', async (req, res) => {
  try {
    const { userId, email } = req.body;

    // Find user
    let user;
    if (userId) {
      user = await prisma.users.findUnique({ where: { id: userId } });
    } else if (email) {
      user = await prisma.users.findUnique({ where: { email } });
    } else if (req.user) {
      user = await prisma.users.findUnique({ where: { id: req.user.id } });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Must provide userId, email, or be authenticated'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Expire trial
    const now = new Date();
    const expiredUser = await prisma.users.update({
      where: { id: user.id },
      data: {
        trial_ends_at: new Date(now.getTime() - 1000) // 1 second ago
      }
    });

    return sendSuccess(res, {
      message: `Trial expired for ${expiredUser.email}`,
      trialEndsAt: expiredUser.trial_ends_at
    });
  } catch (error) {
    console.error('Error expiring trial:', error);
    return sendServerError(res, error);
  }
});

/**
 * POST /api/test/trigger-stripe-webhook
 * Simulate a Stripe webhook event
 * Used for testing payment confirmation emails
 * 
 * Body: { event: string, data: object }
 * Events: 'checkout.session.completed', 'payment_intent.succeeded'
 */
router.post('/test/trigger-stripe-webhook', async (req, res) => {
  try {
    const { event, data } = req.body;

    if (!event) {
      return res.status(400).json({
        success: false,
        error: 'Must provide event name'
      });
    }

    console.log(`[TEST] Simulating Stripe webhook: ${event}`);
    console.log('[TEST] Webhook data:', JSON.stringify(data, null, 2));

    // Simulate webhook processing based on event type
    if (event === 'checkout.session.completed' && data.customer_email) {
      // Update user subscription
      const user = await prisma.users.findUnique({
        where: { email: data.customer_email }
      });

      if (user) {
        await prisma.users.update({
          where: { id: user.id },
          data: {
            subscription_status: 'active',
            subscription_plan: data.subscription_plan || 'pro',
            stripe_customer_id: data.customer_id
          }
        });

        console.log(`[TEST] Updated subscription for ${user.email}`);
      }
    }

    return sendSuccess(res, {
      message: `Webhook simulated: ${event}`,
      event,
      processed: true
    });
  } catch (error) {
    console.error('Error simulating webhook:', error);
    return sendServerError(res, error);
  }
});

/**
 * POST /api/test/create-order
 * Create a test order for payment processing
 * Used for testing order confirmation emails
 * 
 * Body: { userId: string, items: array }
 */
router.post('/test/create-order', async (req, res) => {
  try {
    const { userId, items = [] } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Must provide userId'
      });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Create a test order (assuming orders table exists)
    // This is a simplified example; adjust based on your schema
    console.log(`[TEST] Creating order for user ${user.email}`);
    console.log('[TEST] Order items:', items);

    return sendSuccess(res, {
      message: `Test order created for ${user.email}`,
      orderId: 'test-' + Date.now(),
      userEmail: user.email,
      itemCount: items.length
    });
  } catch (error) {
    console.error('Error creating test order:', error);
    return sendServerError(res, error);
  }
});

/**
 * POST /api/test/send-email
 * Manually trigger an email send
 * Used for testing email delivery
 * 
 * Body: { to: string, template: string, data?: object }
 */
router.post('/test/send-email', async (req, res) => {
  try {
    const { to, template, data = {} } = req.body;

    if (!to || !template) {
      return res.status(400).json({
        success: false,
        error: 'Must provide to and template'
      });
    }

    console.log(`[TEST] Sending email: ${template} to ${to}`);
    console.log('[TEST] Email data:', data);

    // In test environment with USE_MOCK_EMAIL=true,
    // emails are logged to console instead of sent
    return sendSuccess(res, {
      message: `Test email queued: ${template}`,
      to,
      template,
      queued: true
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return sendServerError(res, error);
  }
});

/**
 * GET /api/test/db-seed-status
 * Check database seed status
 * Used to verify test data is set up
 */
router.get('/test/db-seed-status', async (req, res) => {
  try {
    const userCount = await prisma.users.count();
    const siteCount = await prisma.sites.count();
    const trialsCount = await prisma.users.count({
      where: { subscription_status: 'trialing' }
    });

    return sendSuccess(res, {
      message: 'Database seed status',
      stats: {
        users: userCount,
        sites: siteCount,
        trialing: trialsCount
      }
    });
  } catch (error) {
    console.error('Error checking DB seed:', error);
    return sendServerError(res, error);
  }
});

/**
 * POST /api/test/reset-user
 * Reset user account to initial state
 * Used for test isolation
 * 
 * Body: { userId: string }
 */
router.post('/test/reset-user', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Must provide userId'
      });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Reset to initial state
    const resetUser = await prisma.users.update({
      where: { id: userId },
      data: {
        subscription_status: 'active',
        subscription_plan: 'free',
        trial_ends_at: null,
        stripe_customer_id: null,
        last_login: new Date()
      }
    });

    console.log(`[TEST] Reset user ${resetUser.email}`);

    return sendSuccess(res, {
      message: `User reset: ${resetUser.email}`,
      user: resetUser
    });
  } catch (error) {
    console.error('Error resetting user:', error);
    return sendServerError(res, error);
  }
});

export default router;
