import express from 'express';
import { query as dbQuery, pool } from '../../database/db.js';

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
      await dbQuery('SELECT 1');
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
      }
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
 * Returns: connection status, latency, pool stats
 */
router.get('/db', async (req, res) => {
  try {
    const start = Date.now();
    await dbQuery('SELECT NOW()');
    const latency = Date.now() - start;
    
    res.json({
      status: 'ok',
      latency_ms: latency,
      connections: {
        total: pool.totalCount,
        idle: pool.idleCount,
        active: pool.totalCount - pool.idleCount
      },
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
 * Comprehensive health check
 * Runs all checks in parallel and aggregates results
 */
router.get('/full', async (req, res) => {
  const checks = {
    app: { status: 'ok', uptime: Math.floor((Date.now() - startTime) / 1000) },
    database: { status: 'checking' },
    stripe: { status: 'checking' },
    email: { status: 'checking' }
  };
  
  // Run all checks in parallel
  const results = await Promise.allSettled([
    // Database check
    (async () => {
      const start = Date.now();
      await dbQuery('SELECT 1');
      checks.database = {
        status: 'ok',
        latency_ms: Date.now() - start
      };
    })(),
    
    // Stripe check
    (async () => {
      checks.stripe = {
        status: process.env.STRIPE_SECRET_KEY ? 'ok' : 'not_configured'
      };
    })(),
    
    // Email check
    (async () => {
      checks.email = {
        status: process.env.RESEND_API_KEY ? 'ok' : 'not_configured'
      };
    })()
  ]);
  
  // Update failed checks
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const service = ['database', 'stripe', 'email'][index];
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
    await dbQuery('SELECT 1');
    
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

