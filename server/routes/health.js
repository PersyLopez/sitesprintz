import express from 'express';
import { prisma } from '../../database/db.js';
import { isBetaMode, betaAllowsPublicSignups, stripeKeyMode } from '../config/betaMode.js';
import { getTurnstileSiteKey } from '../utils/captcha.js';
import {
  getCanaryStatus,
  getFormsHealthSummary,
  healthProbeSecretMatches,
  isHealthProbeConfigured,
  isHealthProbeRequest,
} from '../utils/healthProbe.js';
import { createContactHealthProbe } from './submissions.routes.js';
import { createFeedbackHealthProbe } from './feedback.routes.js';

const router = express.Router();
const startTime = Date.now();

/**
 * Basic health check endpoint
 * Checks: API availability, database connectivity
 */
router.get('/', async (req, res) => {
  try {
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    // Check database connection
    let dbStatus = 'unknown';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
      dbStatus = 'connected';
    } catch (err) {
      dbStatus = 'disconnected';
    }

    res.json({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime,
      services: {
        api: 'ok',
        database: dbStatus
      },
      performance: {
        database_latency_ms: dbLatency
      },
      beta: {
        enabled: isBetaMode(),
        allowSignups: betaAllowsPublicSignups(),
        stripeMode: stripeKeyMode(process.env.STRIPE_SECRET_KEY)
      },
      turnstileSiteKey: getTurnstileSiteKey(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Detailed database health check
 * Returns: connection status, latency
 */
router.get('/db', async (req, res) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT NOW()`;
    const latency = Date.now() - start;

    res.json({
      status: 'ok',
      latency_ms: latency,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Stripe connectivity check
 * Validates Stripe API key without making a charge
 */
router.get('/stripe', async (req, res) => {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
      return res.status(500).json({
        status: 'error',
        service: 'stripe',
        error: 'Stripe not configured'
      });
    }

    // Simple check - if key is set, assume it's valid
    // (We don't want to make actual API calls on every health check)
    res.json({
      status: 'ok',
      service: 'stripe',
      configured: true,
      mode: stripeKeyMode(STRIPE_SECRET_KEY),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'stripe',
      error: error.message
    });
  }
});

/**
 * Email service health check
 * Validates Resend API key is configured
 */
router.get('/email', async (req, res) => {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      return res.status(500).json({
        status: 'error',
        service: 'resend',
        error: 'Resend not configured'
      });
    }

    res.json({
      status: 'ok',
      service: 'resend',
      configured: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'resend',
      error: error.message
    });
  }
});

/**
 * Forms health check
 * Read-only summary of last real submissions; optional synthetic probe with X-Health-Probe header.
 */
router.get('/forms', async (req, res) => {
  try {
    const probeHeader = req.headers['x-health-probe'];

    if (probeHeader && process.env.HEALTH_PROBE_SECRET && !healthProbeSecretMatches(probeHeader)) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'PROBE_UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      });
    }

    const [forms, canary] = await Promise.all([
      getFormsHealthSummary(),
      getCanaryStatus(),
    ]);

    const emailConfigured = Boolean(process.env.RESEND_API_KEY);

    let probe = { status: 'not_configured' };
    if (isHealthProbeRequest(req)) {
      if (isHealthProbeConfigured()) {
        const [contactResult, platformResult] = await Promise.all([
          createContactHealthProbe(),
          createFeedbackHealthProbe(),
        ]);
        probe = {
          status: contactResult.ok && platformResult.ok ? 'ok' : 'degraded',
          contact: contactResult,
          platform: platformResult,
        };
      }
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      email: { configured: emailConfigured },
      canary,
      forms,
      probe,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Comprehensive health check
 * Runs all checks in parallel and aggregates results
 */
router.get('/full', async (req, res) => {
  const checks = {
    app: { status: 'ok', uptime: Math.floor((Date.now() - startTime) / 1000) },
    database: { status: 'checking' },
    stripe: { status: 'checking' },
    email: { status: 'checking' },
    forms: { status: 'checking' },
  };

  // Run all checks in parallel
  const results = await Promise.allSettled([
    // Database check
    (async () => {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'ok',
        latency_ms: Date.now() - start
      };
    })(),

    // Stripe check
    (async () => {
      const stripeSecret = process.env.STRIPE_SECRET_KEY;
      checks.stripe = {
        status: stripeSecret ? 'ok' : 'not_configured',
        mode: stripeKeyMode(stripeSecret),
      };
    })(),

    // Email check
    (async () => {
      checks.email = {
        status: process.env.RESEND_API_KEY ? 'ok' : 'not_configured'
      };
    })(),

    // Forms summary (read-only)
    (async () => {
      const [forms, canary] = await Promise.all([
        getFormsHealthSummary(),
        getCanaryStatus(),
      ]);
      checks.forms = {
        status: 'ok',
        emailConfigured: Boolean(process.env.RESEND_API_KEY),
        canary,
        lastSubmittedAt: {
          contact: forms.contact.lastSubmittedAt,
          platformFeedback: forms.platformFeedback.lastSubmittedAt,
        },
      };
    })()
  ]);

  // Update failed checks
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const service = ['database', 'stripe', 'email', 'forms'][index];
      checks[service] = {
        status: 'error',
        error: result.reason?.message || 'Unknown error'
      };
    }
  });

  // Determine overall health
  const allHealthy = Object.values(checks).every(check =>
    check.status === 'ok' || check.status === 'not_configured'
  );

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness check endpoint
 * Used by container orchestration to determine if app can accept traffic
 */
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      ready: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness check endpoint
 * Used by container orchestration to determine if app needs to be restarted
 */
router.get('/live', (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime
  });
});

export default router;

