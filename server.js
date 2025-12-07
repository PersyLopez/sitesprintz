import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import passport from 'passport';
import session from 'express-session';

import { testConnection } from './database/db.js';
import { configureGoogleAuth, setupGoogleRoutes } from './auth-google.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import cookieParser from 'cookie-parser';
import { csrfProtection, csrfTokenEndpoint } from './server/middleware/csrf.js';

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

const publicDir = path.join(__dirname, 'dist');

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
}

// Passport serialization (required for session support)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', userRoutes); // Mounts at /api/admin/..., /api/users/...
app.use('/api', paymentRoutes); // Mounts at /api/payments/..., /api/checkout/...
app.use('/api', siteRoutes); // Mounts at /api/site, /api/upload, etc.
app.use('/api/booking', bookingRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/showcases', showcaseRoutes);
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
