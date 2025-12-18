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
import cookieParser from 'cookie-parser';
import { csrfProtection, csrfTokenEndpoint } from './server/middleware/csrf.js';
import { apiLimiter } from './server/middleware/rateLimiting.js';
import './server/jobs/tokenCleanup.js'; // Token cleanup job

// Routes
import authRoutes from './server/routes/auth.routes.js';
import webhookRoutes from './server/routes/webhooks.routes.js';
import userRoutes from './server/routes/users.routes.js';
import paymentRoutes from './server/routes/payments.routes.js';
import siteRoutes from './server/routes/sites.routes.js';
import bookingRoutes from './server/routes/booking.routes.js';
import contentRoutes from './server/routes/content.routes.js';
import showcaseRoutes from './server/routes/showcase.routes.js';
import adminRoutes from './server/routes/admin.routes.js';
import reviewsRoutes from './server/routes/reviews.routes.js';
import shareRoutes from './server/routes/share.routes.js';
import templatesRoutes from './server/routes/templates.routes.js';

dotenv.config();

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

const isProd = process.env.NODE_ENV === 'production';
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

app.use(cors());
app.use(express.static(publicDir));

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
  secret: process.env.JWT_SECRET || 'your-secret-key-change-this',
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
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

  app.get('/auth/google', (req, res) => {
    const plan = req.query.plan;
    const intent = req.query.intent;
    let state = plan || 'free';
    if (intent) state += `,intent:${intent}`;

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
            name: 'Google Mock User',
            role: 'user',
            status: 'active',
            subscription_status: 'trial',
            subscription_plan: 'free',
            auth_provider: 'google',
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

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Keep redirect behavior consistent with real auth-google.js logic
      const stateStr = typeof state === 'string' ? state : '';
      const parts = stateStr.split(',');
      const plan = parts[0];
      const intentPart = parts.find(p => p.startsWith('intent:'));
      const intent = intentPart ? intentPart.split(':')[1] : null;

      if (intent === 'publish') {
        return res.redirect(`/auto-publish.html?token=${token}`);
      }

      if (plan && (plan === 'starter' || plan === 'pro')) {
        return res.redirect(`/register-success.html?token=${token}&plan=${plan}`);
      }

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      return res.redirect(`${clientUrl}/oauth/callback?token=${token}`);
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
app.use('/api/sites', siteRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/showcases', showcaseRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/share', shareRoutes);
// app.use('/api/admin', adminRoutes); -- Moved up to prioritized list
import submissionsRoutes from './server/routes/submissions.routes.js';
app.use('/api/submissions', submissionsRoutes);
import draftsRoutes from './server/routes/drafts.routes.js';
app.use('/api/drafts', draftsRoutes);

// Mock endpoints to prevent frontend 404 errors
app.get('/api/stripe/status', (req, res) => res.json({ connected: false }));
app.get('/api/orders/pending-count', (req, res) => res.json({ count: 0 }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/test-ping', (req, res) => res.send('pong'));

// Test-only routes
if (process.env.NODE_ENV === 'test') {
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
}

// Serve published sites
app.use('/sites', express.static(path.join(__dirname, 'public/sites')));

// Global Error Handler
app.use(errorHandler);

// Handle SPA routing - serve index.html for all non-API routes
// Handle SPA routing - serve index.html for all non-API routes
// Use app.use with method check for Express 5 compatibility (app.get('*') can cause PathError)
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();

  // Don't intercept API calls
  if (req.path.startsWith('/api/')) {
    return next();
  }

  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (0.0.0.0)`);
  console.log(`Admin token: ${process.env.ADMIN_TOKEN || 'dev-token'}`);
});

export default app;
