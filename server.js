import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import passport from 'passport';
import session from 'express-session';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { testConnection } from './database/db.js';
import { configureGoogleAuth, setupGoogleRoutes } from './auth-google.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import { notFoundHandler } from './server/middleware/notFoundHandler.js';
import { requireAdmin } from './server/middleware/auth.js';
import cookieParser from 'cookie-parser';
import { csrfProtection, csrfTokenEndpoint } from './server/middleware/csrf.js';
import { apiLimiter } from './server/middleware/rateLimiting.js';
import './server/jobs/tokenCleanup.js'; // Token cleanup job
import { startReminderJob } from './server/jobs/booking-reminders.js';
startReminderJob();

// Routes
import authRoutes from './server/routes/auth.routes.js';
import webhookRoutes from './server/routes/webhooks.routes.js';
import userRoutes from './server/routes/users.routes.js';
import paymentRoutes from './server/routes/payments.routes.js';
import paymentFacilitatorRoutes from './server/routes/payment-facilitator.routes.js';
import siteRoutes from './server/routes/sites.routes.js';
import bookingRoutes from './server/routes/booking.routes.js';
import bookingFeesRoutes from './server/routes/booking-fees.routes.js';
import contentRoutes from './server/routes/content.routes.js';
import showcaseRoutes from './server/routes/showcase.routes.js';
import adminRoutes from './server/routes/admin.routes.js';
import reviewsRoutes from './server/routes/reviews.routes.js';
import outreachRoutes from './server/routes/outreach.routes.js';
import claimRoutes from './server/routes/claim.routes.js';
import shareRoutes from './server/routes/share.routes.js';
import templatesRoutes from './server/routes/templates.routes.js';
import staffRoutes from './server/routes/staff.routes.js';
import trackingRoutes from './server/routes/tracking.routes.js';
import legalRoutes from './server/routes/legal.routes.js';
import businessModeRoutes from './server/routes/business-mode.routes.js';

// Wave 1 Integration routes
import analyticsRoutes from './server/routes/analytics.routes.js';
import { initializeFoundationRoutes } from './server/routes/foundation.routes.js';
import visualEditorRoutes from './server/routes/visual-editor.routes.js';
import seoRoutes from './server/routes/seo.routes.js';
import processorConnectRoutes from './server/routes/processor-connect.routes.js';
import bookingPhase2Routes from './server/routes/booking-phase2.routes.js';
import { initializePricingRoutes } from './server/routes/pricing.routes.js';
import { query, prisma } from './database/db.js';
import publishedSiteRenderer from './server/services/publishedSiteRenderer.js';
import { isSafeSiteIdentifier } from './server/utils/siteIsolation.js';
import testRoutes from './server/routes/test.routes.js';
import healthRoutes from './server/routes/health.js';

dotenv.config();

// Validate environment configuration
import { validateEnv, logBootSummary } from './server/config/validateEnv.js';
import { getRequiredSecret } from './server/config/secrets.js';
import { createGoogleOAuthState, consumeGoogleOAuthState } from './server/services/auth/googleOAuthState.js';
import { setAuthCookies } from './server/utils/authCookies.js';
import { buildCorsOptions } from './server/config/cors.js';
validateEnv();
logBootSummary();

// Test database connection on startup
testConnection().then(connected => {
  if (!connected) {
    console.error('❌ Failed to connect to database. Server will continue but auth may not work.');
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Disable ETags to prevent 304 responses causing issues with fetch API client
app.set('etag', false);

const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test';
const publicDir = isProd ? path.join(__dirname, 'dist') : path.join(__dirname, 'public');

// Security Headers with Helmet (must be before static files)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for React/Vite
        "https://challenges.cloudflare.com", // Cloudflare Turnstile
        "https://js.stripe.com", // Stripe.js
        "https://checkout.stripe.com" // Stripe Checkout
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://challenges.cloudflare.com",
        "https://resend.com"
      ],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://hooks.stripe.com",
        "https://challenges.cloudflare.com"
      ],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false, // Disable for compatibility
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow images from any origin
}));

// CORS — strict allowlist in production, localhost permitted in development
app.use(cors(buildCorsOptions()));

// SEO routes must be mounted BEFORE static middleware for sitemap/robots.txt to work
app.use('/', seoRoutes);

// Never serve unpublished drafts or user JSON from the public tree
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  const blocked = req.path === '/drafts' || req.path.startsWith('/drafts/')
    || req.path === '/users' || req.path.startsWith('/users/');
  if (blocked) {
    return res.status(404).end();
  }
  next();
});

app.use(express.static(publicDir, { dotfiles: 'ignore' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[REQUEST] ${new Date().toISOString()} ${req.method} ${req.url}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[RESPONSE] ${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Add favicon route to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content, but no error
});

// Mount webhooks BEFORE bodyParser.json
app.use('/api/webhooks', webhookRoutes);

// Enable JSON parser for the rest of the API
app.use(bodyParser.json({ limit: '1mb' }));
app.use(cookieParser());

// Apply general API rate limiting (excludes webhooks which are handled separately)
app.use('/api/', (req, res, next) => {
  // Skip rate limiting for webhooks (they have their own protection)
  if (req.path.startsWith('/webhooks/')) {
    return next();
  }
  return apiLimiter(req, res, next);
});

// CSRF Protection
app.get('/api/csrf-token', csrfTokenEndpoint);
app.use(csrfProtection);

// Configure Passport for OAuth
app.use(session({
  secret: getRequiredSecret('JWT_SECRET', { allowTestFallback: true }),
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());
app.use(passport.session());

// Configure Google OAuth if credentials are provided
const googleAuthConfigured = configureGoogleAuth();
if (googleAuthConfigured) {
  setupGoogleRoutes(app);
} else if (process.env.NODE_ENV === 'test') {
  // Test-mode Google OAuth mock:
  // - Never hits external Google
  // - Always produces a valid JWT and redirects to /oauth/callback?token=...
  // This makes E2E reliable and allows testing the full redirect/token flow.
  app.get('/auth/google', async (req, res) => {
    const state = await createGoogleOAuthState({
      plan: req.query.plan,
      intent: req.query.intent
    });

    const redirect = `/auth/google/callback?code=mock&state=${encodeURIComponent(state)}`;
    return res.redirect(redirect);
  });

  app.get('/auth/google/callback', async (req, res) => {
    const { error, state } = req.query;
    if (error) {
      return res.redirect(`/register.html?error=${encodeURIComponent(error)}`);
    }

    try {
      const { prisma } = await import('./database/db.js');

      // Use a deterministic mock user; tests can rely on this existing.
      const email = 'google-mock@example.com';
      let user = await prisma.users.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.users.create({
          data: {
            id: crypto.randomUUID(),
            email,
            password_hash: crypto.randomBytes(16).toString('hex'),
            role: 'user',
            status: 'active',
            subscription_status: 'trial',
            subscription_plan: 'free',
            google_id: 'google-mock',
            email_verified: true,
            created_at: new Date(),
            last_login: new Date()
          }
        });
      } else {
        await prisma.users.update({
          where: { email },
          data: { last_login: new Date() }
        });
      }

      const JWT_SECRET = getRequiredSecret('JWT_SECRET', { allowTestFallback: true });
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      setAuthCookies(res, { accessToken });

      const { plan, intent } = await consumeGoogleOAuthState(state);
      const paidPlans = ['starter', 'growth', 'pro', 'premium'];

      if (intent === 'publish') {
        return res.redirect(`/auto-publish.html?token=${accessToken}`);
      }

      if (plan && paidPlans.includes(plan)) {
        return res.redirect(`/register-success.html?token=${accessToken}&plan=${plan}`);
      }

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return res.redirect(`${clientUrl}/oauth/callback?token=${accessToken}`);
    } catch (e) {
      console.error('Test-mode Google OAuth mock failed:', e);
      return res.redirect('/register.html?error=auth_failed');
    }
  });
}

// Passport serialization (required for session support)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/users', userRoutes);
app.use('/api', paymentRoutes);
app.use('/api/payments', paymentFacilitatorRoutes);
import stripeRoutes from './server/routes/stripe.routes.js';
app.use('/api/stripe', stripeRoutes);
app.use('/api/sites', siteRoutes);
import domainRoutes, { domainPublicRouter } from './server/routes/domain.routes.js';
app.use('/api/sites', domainRoutes);
app.use('/api/domain', domainPublicRouter);
app.use('/api/booking', bookingRoutes);
app.use('/api/booking', bookingFeesRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/showcases', showcaseRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/claim', claimRoutes);
app.use('/api/share', shareRoutes);
import submissionsRoutes from './server/routes/submissions.routes.js';
app.use('/api/submissions', submissionsRoutes);
import feedbackRoutes from './server/routes/feedback.routes.js';
app.use('/api/feedback', feedbackRoutes);
import serviceRequestsRoutes from './server/routes/service-requests.routes.js';
app.use('/api/service-requests', serviceRequestsRoutes);
import draftsRoutes from './server/routes/drafts.routes.js';
app.use('/api/drafts', draftsRoutes);
import uploadsRoutes from './server/routes/uploads.routes.js';
app.use('/api/uploads', uploadsRoutes);
app.use('/api/upload', uploadsRoutes); // Alias for backward compatibility
import ordersRoutes from './server/routes/orders.routes.js';
app.use('/api/orders', ordersRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/business-mode', businessModeRoutes);

// Wave 1 Integration routes (mounted after existing routes)
app.use('/api/analytics', analyticsRoutes);
app.use('/api/foundation', initializeFoundationRoutes(query));
app.use('/api', visualEditorRoutes);
app.use('/api/payment-processors', processorConnectRoutes);
app.use('/api/connect', processorConnectRoutes);
app.use('/api/booking', bookingPhase2Routes);
app.use('/api/pricing', initializePricingRoutes(query));

// Legal pages (Terms, Privacy, Cookie Policy, Refund Policy)
app.use('/legal', legalRoutes);

// Admin token endpoint (mounted separately for backward compatibility)
app.get('/api/admin-token', requireAdmin, async (req, res) => {
  const adminToken = getRequiredSecret('ADMIN_TOKEN', { allowTestFallback: true });
  res.json({ token: adminToken, expiresIn: '1h' });
});

// Health check endpoints (Railway uses /api/health)
app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes);

app.get('/api/test-ping', (req, res) => res.send('pong'));

// Test-only routes
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
  // Mount comprehensive test utilities
  app.use('/api', testRoutes);

  // Legacy test routes (kept for backward compatibility)
  app.post('/api/test/upgrade-user', async (req, res) => {
    const { email, plan = 'pro' } = req.body;
    try {
      const { prisma } = await import('./database/db.js');
      await prisma.users.update({
        where: { email },
        data: { subscription_plan: plan }
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to upgrade user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/test/create-draft-site', async (req, res) => {
    const { email, businessName, templateId } = req.body;
    try {
      const { prisma } = await import('./database/db.js');
      const user = await prisma.users.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const now = Date.now();
      const siteId = `draft_${now}`;
      const subdomain = `draft-${now}`;

      const site = await prisma.sites.create({
        data: {
          id: siteId,
          user_id: user.id,
          subdomain: subdomain,
          template_id: templateId || 'restaurant-casual',
          status: 'draft',
          plan: 'starter',
          site_data: { brand: { name: businessName } },
          created_at: new Date()
        }
      });
      res.json({ success: true, site });
    } catch (error) {
      console.error('Failed to create draft site:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

// Helper: Check if request is from a crawler/bot
function isCrawlerRequest(req) {
  const ua = (req.get('user-agent') || '').toLowerCase();
  const crawlerPatterns = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'whatsapp', 'slackbot', 'discordbot', 'curl', 'wget', 'python',
    'validator'
  ];
  return crawlerPatterns.some(pattern => ua.includes(pattern)) || req.query.ssr === '1';
}

// Handle SPA routing FIRST for /sites/:subdomain (before static file serving)
// Skip SPA shell for crawlers (they need SSR), serve React SPA to browsers
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();

  // Don't intercept API calls
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // For /sites/:subdomain routes
  if (req.path.match(/^\/sites\/[^\/]+$/)) {
    // For crawlers/bots, skip SPA and let SSR route handle it
    if (isCrawlerRequest(req)) {
      return next();
    }
    // For browsers, serve React SPA
    return res.sendFile(path.join(publicDir, 'index.html'));
  }

  next();
});

// CSS route handlers for published sites (must be before static file serving)
app.get('/sites/:siteId/styles.css', async (req, res) => {
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  try {
    const css = generateSiteCSS(req.params.siteId);
    res.send(css);
  } catch (error) {
    console.error('CSS generation failed:', error);
    res.status(500).send('/* CSS generation failed */');
  }
});

app.get('/sites/:siteId/premium.css', async (req, res) => {
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  try {
    const css = generatePremiumCSS(req.params.siteId);
    res.send(css);
  } catch (error) {
    console.error('Premium CSS generation failed:', error);
    res.status(500).send('/* CSS generation failed */');
  }
});

// Helper functions for CSS generation
function generateSiteCSS(siteId) {
  return `
    :root {
      --color-primary: #06b6d4;
      --color-accent: #0891b2;
      --color-secondary: #14b8a6;
      --color-background: #0f172a;
      --color-surface: #1e293b;
      --color-card: #1e293b;
      --color-text: #f8fafc;
      --color-text-muted: #94a3b8;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: var(--color-background);
      color: var(--color-text);
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }
    
    h1, h2, h3, h4, h5, h6 {
      font-weight: 600;
      line-height: 1.3;
    }
    
    nav {
      background: var(--color-surface);
      padding: 1rem 0;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .hero {
      padding: 4rem 1rem;
      text-align: center;
    }
    
    section {
      padding: 3rem 1rem;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }
    
    .card {
      background: var(--color-surface);
      border-radius: 8px;
      padding: 1.5rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
  `;
}

function generatePremiumCSS(siteId) {
  return `
    .booking-widget {
      background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
      border-radius: 12px;
      padding: 2rem;
    }
    
    .gallery-filter {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    
    .gallery-filter button {
      padding: 0.5rem 1rem;
      border: 2px solid var(--color-primary);
      background: transparent;
      color: var(--color-primary);
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .gallery-filter button.active {
      background: var(--color-primary);
      color: white;
    }
    
    .menu-tabs {
      display: flex;
      gap: 1rem;
      border-bottom: 2px solid var(--color-surface);
      margin-bottom: 2rem;
      overflow-x: auto;
    }
    
    .menu-tab {
      padding: 1rem;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }
    
    .menu-tab.active {
      border-bottom-color: var(--color-primary);
      color: var(--color-primary);
    }
  `;
}

// =======================
// Published Sites SSR Route
// =======================
// Must come BEFORE static middleware for /sites to intercept dynamic requests
// Handles both /sites/:subdomain (for published sites) and /sites/:id (legacy)
app.get('/sites/:siteIdentifier', async (req, res, next) => {
  try {
    const { siteIdentifier } = req.params;

    if (!isSafeSiteIdentifier(siteIdentifier)) {
      return next();
    }

    // Try to find site by subdomain first (preferred for published sites)
    let site = await prisma.sites.findFirst({
      where: { subdomain: siteIdentifier },
      select: { site_data: true, status: true, subdomain: true }
    });

    // Fallback: try lookup by id for backward compatibility
    if (!site) {
      site = await prisma.sites.findUnique({
        where: { id: siteIdentifier },
        select: { site_data: true, status: true, subdomain: true }
      });
    }

    // Fallback: try to load from public/sites/{subdomain}/data/site.json for static sites
    let siteData = null;
    if (site && site.site_data) {
      siteData = typeof site.site_data === 'string' ? JSON.parse(site.site_data) : site.site_data;
    }

    if (!siteData) {
      // Not a published site, let static middleware handle it
      return next();
    }

    // Render the site with SSR
    const html = await publishedSiteRenderer.render(siteData, {
      baseUrl: req.get('host'),
      siteIdentifier: site.subdomain || siteIdentifier,
      customDomain: req.get('x-custom-domain') // Optional custom domain header
    });

    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minute cache
    res.send(html);
  } catch (error) {
    console.error('Error rendering published site:', error);
    next(error); // Pass to error handler
  }
});

// Also handle trailing slash variant
app.get('/sites/:siteIdentifier/', async (req, res, next) => {
  req.url = req.url.slice(0, -1); // Remove trailing slash
  return next();
});

// Serve published sites static files (for specific file requests, not subdomain routes)
app.use('/sites', express.static(path.join(__dirname, 'public/sites'), {
  index: false,
  dotfiles: 'ignore'
}));

// Handle all other SPA routing - serve index.html for remaining non-API routes
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();

  // Don't intercept API calls
  if (req.path.startsWith('/api/')) {
    return next();
  }

  res.sendFile(path.join(publicDir, 'index.html'));
});

// Not Found Handler (must come before error handler)
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (0.0.0.0)`);
  console.log(`Admin token: ${process.env.ADMIN_TOKEN ? 'set' : 'missing'}`);
});

export default app;
