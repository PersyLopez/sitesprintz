import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { randomUUID as nodeRandomUUID } from 'crypto';
import { sendEmail, EmailTypes, sendAdminNotification } from './email-service.js';
import cron from 'node-cron';
import { query as dbQuery, transaction as dbTransaction, testConnection } from './database/db.js';
import passport from 'passport';
import session from 'express-session';
import { configureGoogleAuth, setupGoogleRoutes } from './auth-google.js';

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
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-token';

// Stripe setup
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

// Allowed origins for creating checkout sessions (comma-separated list). Same-origin is always allowed.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');
const draftsDir = path.join(publicDir, 'drafts');
const usersDir = path.join(publicDir, 'users');
const dataFile = path.join(publicDir, 'data', 'site.json');
const templatesDir = path.join(publicDir, 'data', 'templates');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Standardized user file naming helper
function getUserFilePath(email) {
  const sanitized = email.toLowerCase().replace(/[^a-z0-9@.]/g, '_');
  return path.join(usersDir, `${sanitized}.json`);
}

// Validation helpers
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  // Allow various phone formats
  const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,}$/;
  return phoneRegex.test(phone);
}

function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
}

function generateRandomPassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Ensure directories exist
fs.mkdir(uploadsDir, { recursive: true }).catch(() => {});
fs.mkdir(draftsDir, { recursive: true }).catch(() => {});
fs.mkdir(usersDir, { recursive: true }).catch(() => {});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Server-side var dir for webhook persistence
const varDir = path.join(__dirname, 'var');
const stripeEventsDir = path.join(varDir, 'stripe-events');
const stripeFailedDir = path.join(varDir, 'stripe-events-failed');

// Ensure directories exist (best-effort)
await fs.mkdir(stripeEventsDir, { recursive: true }).catch(() => {});
await fs.mkdir(stripeFailedDir, { recursive: true }).catch(() => {});

app.use(cors());
app.use(express.static(publicDir));

// Add favicon route to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content, but no error
});

// Stripe webhook must be defined BEFORE bodyParser.json so we can access the raw body
if (stripe && STRIPE_WEBHOOK_SECRET) {
  app.post('/api/webhooks/stripe', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${(err && err.message) || 'invalid signature'}`);
    }

    // Minimal handling: acknowledge and log important events
    try {
      // Deduplicate by event.id: create file with wx flag
      const filePath = path.join(stripeEventsDir, `${event.id}.json`);
      const payloadRecord = {
        id: event.id,
        type: event.type,
        account: event.account || null,
        created: event.created,
        received_at: Date.now(),
        signature: signature || null,
        raw: req.body.toString('utf8')
      };
      try {
        await fs.writeFile(filePath, JSON.stringify(payloadRecord, null, 2), { flag: 'wx' });
      } catch (e) {
        if (e && (e.code === 'EEXIST' || e.message?.includes('EEXIST'))) {
          // Duplicate delivery; acknowledge without reprocessing
          return res.status(200).send();
        }
        // If we cannot persist, still acknowledge to avoid webhook retries
      }

      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          console.log('Stripe event:', event.type, session.id);
          
          // Handle subscription checkout completion
          if (session.mode === 'subscription' && session.subscription) {
            const customerEmail = session.customer_email || session.customer_details?.email;
            if (customerEmail) {
              try {
                const subscription = await stripe.subscriptions.retrieve(session.subscription);
                const plan = session.metadata?.plan || 'starter';
                const priceId = subscription.items.data[0]?.price?.id;
                
                await updateUserSubscription(customerEmail, {
                  subscriptionId: subscription.id,
                  customerId: subscription.customer,
                  status: subscription.status,
                  plan: plan,
                  priceId: priceId,
                  currentPeriodEnd: subscription.current_period_end,
                  cancelAtPeriodEnd: subscription.cancel_at_period_end || false
                });
                
                console.log(`Subscription created for ${customerEmail}: ${plan} plan`);
              } catch (error) {
                console.error('Error processing subscription checkout:', error);
              }
            }
          }
          
          // Handle product order checkout completion
          if (session.mode === 'payment' && session.metadata?.siteId) {
            try {
              const siteId = session.metadata.siteId;
              const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
              
              // Create order object
              const order = {
                id: session.id,
                orderId: generateOrderId(),
                siteId: siteId,
                amount: session.amount_total / 100,
                currency: session.currency || 'usd',
                customer: {
                  name: session.customer_details?.name || 'Unknown',
                  email: session.customer_details?.email || session.customer_email || '',
                  phone: session.customer_details?.phone || null
                },
                items: lineItems.data.map(item => ({
                  name: item.description,
                  quantity: item.quantity,
                  price: item.amount_total / 100 / item.quantity
                })),
                status: 'new',
                createdAt: new Date(session.created * 1000).toISOString(),
                stripeSessionId: session.id,
                stripePaymentIntentId: session.payment_intent
              };
              
              // Save order
              await saveOrder(order);
              console.log(`Order ${order.orderId} saved for site ${siteId}`);
              
              // Send email notifications
              await sendOrderNotifications(order);
            } catch (error) {
              console.error('Error processing product order:', error);
            }
          }
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object;
          console.log('Stripe event:', event.type, subscription.id);
          
          try {
            // Get customer email
            const customer = await stripe.customers.retrieve(subscription.customer);
            if (customer.email) {
              // Determine plan from price ID
              const priceId = subscription.items.data[0]?.price?.id;
              let plan = 'starter';
              if (priceId === process.env.STRIPE_PRICE_PRO) {
                plan = 'pro';
              }
              
              await updateUserSubscription(customer.email, {
                subscriptionId: subscription.id,
                customerId: subscription.customer,
                status: subscription.status,
                plan: plan,
                priceId: priceId,
                currentPeriodEnd: subscription.current_period_end,
                cancelAtPeriodEnd: subscription.cancel_at_period_end || false
              });
              
              console.log(`Subscription ${event.type === 'customer.subscription.created' ? 'created' : 'updated'} for ${customer.email}`);
            }
          } catch (error) {
            console.error('Error processing subscription event:', error);
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSub = event.data.object;
          console.log('Stripe event: subscription deleted', deletedSub.id);
          
          try {
            const customer = await stripe.customers.retrieve(deletedSub.customer);
            if (customer.email) {
              await updateUserSubscription(customer.email, {
                status: 'cancelled',
                cancelledAt: Date.now()
              });
              console.log(`Subscription cancelled for ${customer.email}`);
            }
          } catch (error) {
            console.error('Error processing subscription cancellation:', error);
          }
          break;

        case 'payment_intent.succeeded':
        case 'charge.refunded':
        case 'payment_intent.payment_failed':
          console.log('Stripe event:', event.type, event.data?.object?.id || '');
          break;

        default:
          break;
      }
    } catch (err) {
      try {
        const failedPath = path.join(stripeFailedDir, `${event.id}-${Date.now()}.json`);
        await fs.writeFile(failedPath, JSON.stringify({ error: String(err?.message || err), event }, null, 2));
      } catch (_) { /* ignore */ }
      // Never block webhook on internal errors – acknowledge and alert separately if needed
    }
    return res.status(200).send();
  });
}

// After webhook: enable JSON parser for the rest of the API
app.use(bodyParser.json({ limit: '1mb' }));

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

function requireAdmin(req, res, next){
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if(token === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// JWT Authentication middleware
/**
 * AUTHENTICATION MIDDLEWARE
 * 
 * Purpose: Verify JWT token and load user from database
 * 
 * How it works:
 * 1. Extract JWT token from Authorization header
 * 2. Verify token is valid and not expired
 * 3. Query database to get current user data
 * 4. Check user status is 'active'
 * 5. Attach user object to request
 * 6. Continue to next middleware/route
 * 
 * Changes from JSON version:
 * - BEFORE: Decoded JWT contains all user data
 * - AFTER: Decoded JWT contains only user ID, query DB for current data
 * 
 * Benefits:
 * - Always get fresh user data (status, subscription, etc.)
 * - Can revoke access by changing status in database
 * - No need to re-issue token when user data changes
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    // Step 1: Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Step 2: Get fresh user data from database
    const result = await dbQuery(
      'SELECT id, email, role, status, subscription_status, subscription_plan FROM users WHERE id = $1',
      [decoded.userId || decoded.id] // Support both old and new token formats
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Step 3: Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    
    // Step 4: Attach user to request
    req.user = {
      id: user.id,
      userId: user.id, // For backwards compatibility
      email: user.email,
      role: user.role,
      status: user.status,
      subscriptionStatus: user.subscription_status,
      subscriptionPlan: user.subscription_plan
    };
    
    next();
    
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

// Order Management Helper Functions
const ordersDir = path.join(publicDir, 'data', 'orders');
fs.mkdir(ordersDir, { recursive: true }).catch(() => {});

// Generate unique order ID
function generateOrderId() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}${random}`;
}

// Save order to file
async function saveOrder(order) {
  try {
    const siteOrdersDir = path.join(ordersDir, order.siteId);
    await fs.mkdir(siteOrdersDir, { recursive: true });
    
    const ordersFile = path.join(siteOrdersDir, 'orders.json');
    
    // Load existing orders
    let orders = { orders: [] };
    try {
      const content = await fs.readFile(ordersFile, 'utf-8');
      orders = JSON.parse(content);
    } catch (err) {
      // File doesn't exist yet, start with empty array
    }
    
    // Add new order to beginning of array
    orders.orders.unshift(order);
    
    // Save back to file
    await fs.writeFile(ordersFile, JSON.stringify(orders, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error saving order:', error);
    return false;
  }
}

// Load orders for a site
async function loadOrders(siteId) {
  try {
    const ordersFile = path.join(ordersDir, siteId, 'orders.json');
    const content = await fs.readFile(ordersFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return { orders: [] };
  }
}

// Send order notification emails
async function sendOrderNotifications(order) {
  try {
    // Load site data to get business name and notification email
    const siteFile = path.join(publicDir, 'sites', order.siteId, 'site.json');
    let site = { name: 'Your Business', notificationEmail: null, ownerEmail: null };
    try {
      const siteContent = await fs.readFile(siteFile, 'utf-8');
      site = JSON.parse(siteContent);
    } catch (err) {
      console.error('Could not load site data for email:', err);
    }
    
    const businessName = site.name || site.businessName || 'Your Business';
    
    // Send confirmation email to customer
    if (order.customer.email) {
      await sendEmail(
        order.customer.email,
        'orderConfirmation',
        {
          customerName: order.customer.name,
          orderId: order.orderId,
          items: order.items,
          total: order.amount,
          currency: order.currency,
          businessName: businessName
        }
      );
      console.log(`✅ Order confirmation sent to customer: ${order.customer.email}`);
    }
    
    // Send alert email to business owner (use notificationEmail if set, fallback to ownerEmail)
    const notificationEmail = site.notificationEmail || site.ownerEmail;
    if (notificationEmail) {
      await sendEmail(
        notificationEmail,
        'newOrderAlert',
        {
          businessName: businessName,
          orderId: order.orderId,
          customerName: order.customer.name,
          customerEmail: order.customer.email,
          customerPhone: order.customer.phone,
          items: order.items,
          total: order.amount,
          currency: order.currency,
          siteId: order.siteId
        }
      );
      console.log(`✅ Order alert sent to: ${notificationEmail}`);
    } else {
      console.log(`⚠️ No notification email configured for site ${order.siteId}`);
    }
  } catch (error) {
    console.error('Error sending order notifications:', error);
  }
}

// Endpoint to get admin token (for image uploads during setup)
app.get('/api/admin-token', (req, res) => {
  // Return the admin token - in production, you might want to add rate limiting here
  res.json({ token: ADMIN_TOKEN });
});

// Authentication Endpoints
/**
 * USER REGISTRATION ENDPOINT
 * 
 * Purpose: Create new user account in database
 * 
 * Request body:
 * - email: User's email address
 * - password: Plain text password (will be hashed)
 * 
 * Process:
 * 1. Validate email and password
 * 2. Check if user already exists (database query)
 * 3. Hash password with bcrypt
 * 4. Insert user into database
 * 5. Generate JWT token
 * 6. Send welcome email
 * 7. Return token and user data
 * 
 * Changes from JSON version:
 * - BEFORE: Check file existence, write JSON file
 * - AFTER: Query database, INSERT command
 * 
 * Benefits:
 * - Instant duplicate check (indexed email column)
 * - No race conditions
 * - Automatic ID generation (UUID)
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Step 1: Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Step 2: Check if user already exists
    const existingUser = await dbQuery(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    // Step 3: Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Step 4: Insert user into database
    const result = await dbQuery(`
      INSERT INTO users (email, password_hash, role, status, created_at)
      VALUES ($1, $2, 'user', 'active', NOW())
      RETURNING id, email, role, status, created_at
    `, [email.toLowerCase(), hashedPassword]);
    
    const user = result.rows[0];
    
    // Step 5: Generate JWT token (valid for 7 days)
    const token = jwt.sign(
      { 
        userId: user.id,
        id: user.id, // For compatibility
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Step 6: Send welcome email (don't fail registration if email fails)
    try {
      await sendEmail(user.email, EmailTypes.WELCOME, { email: user.email });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }
    
    // Step 6b: Notify admin of new user (don't fail registration if this fails)
    try {
      await sendAdminNotification(EmailTypes.ADMIN_NEW_USER, {
        userEmail: user.email,
        userName: user.email.split('@')[0] // Use email prefix as name
      });
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
    }
    
    // Step 7: Return success
    res.json({ 
      success: true, 
      token, 
      user: { 
        id: user.id, 
        email: user.email,
        role: user.role
      } 
    });
    
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * USER LOGIN ENDPOINT
 * 
 * Purpose: Authenticate user and return JWT token
 * 
 * Request body:
 * - email: User's email address
 * - password: Plain text password
 * 
 * Process:
 * 1. Validate email and password provided
 * 2. Query database for user by email
 * 3. Verify password matches (bcrypt.compare)
 * 4. Check account status is active
 * 5. Update last_login timestamp
 * 6. Generate JWT token
 * 7. Return token and user data
 * 
 * Changes from JSON version:
 * - BEFORE: Read file, parse JSON
 * - AFTER: Query database (instant with indexed email)
 * 
 * Benefits:
 * - Fast lookup (indexed email column)
 * - Fresh user data every time
 * - Can check subscription status
 * - Update last_login atomically (no race conditions)
 */
/**
 * QUICK REGISTER ENDPOINT (SEAMLESS UX)
 * 
 * Purpose: Create account with just email for seamless publishing flow
 * Users can set password later via magic link
 */
app.post('/api/auth/quick-register', async (req, res) => {
  try {
    const { email, skipPassword } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    
    // Check if user exists
    const existingUser = await dbQuery(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Create new user
    const tempPassword = skipPassword ? generateRandomPassword() : req.body.password;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const result = await dbQuery(`
      INSERT INTO users (email, password_hash, role, status, created_at)
      VALUES ($1, $2, 'user', $3, NOW())
      RETURNING id, email, role, created_at
    `, [
      email.toLowerCase(),
      hashedPassword,
      skipPassword ? 'pending' : 'active'
    ]);
    
    const user = result.rows[0];
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Send welcome email if skip password
    if (skipPassword) {
      try {
        await sendEmail(email, EmailTypes.WELCOME, { email });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Quick register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify auth token
app.get('/api/auth/verify', requireAuth, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Get current user info
app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

/**
 * SEND MAGIC LINK ENDPOINT
 * 
 * Purpose: Send magic login link to existing users
 */
app.post('/api/auth/send-magic-link', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    
    // Check if user exists
    const result = await dbQuery(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      // Don't reveal if user exists or not
      return res.json({ success: true, message: 'If an account exists, a login link has been sent' });
    }
    
    const user = result.rows[0];
    
    // Generate token
    const token = jwt.sign(
      { 
        userId: user.id,
        id: user.id,
        email: user.email,
        role: user.role,
        magicLink: true
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Send magic link email
    try {
      await sendEmail(user.email, EmailTypes.WELCOME, {
        email: user.email,
        magicLink: `${process.env.BASE_URL || 'http://localhost:3000'}/magic-login?token=${token}`
      });
    } catch (emailError) {
      console.error('Failed to send magic link:', emailError);
    }
    
    res.json({ success: true, message: 'If an account exists, a login link has been sent' });
    
  } catch (err) {
    console.error('Magic link error:', err);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Step 1: Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Step 2: Get user from database
    const result = await dbQuery(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Step 3: Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Step 4: Check account status
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    
    // Step 5: Update last login timestamp (async, don't wait)
    dbQuery(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    ).catch(err => console.error('Failed to update last login:', err));
    
    // Step 6: Generate JWT token (valid for 7 days)
    const token = jwt.sign({ 
      userId: user.id,
      id: user.id, // For compatibility
      email: user.email, 
      role: user.role
    }, JWT_SECRET, { expiresIn: '7d' });
    
    // Step 7: Return success
    res.json({ 
      success: true, 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        status: user.status,
        subscriptionStatus: user.subscription_status,
        subscriptionPlan: user.subscription_plan
      } 
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

/**
 * GET CURRENT USER ENDPOINT
 * 
 * Purpose: Return current authenticated user's data
 * 
 * Authentication: Required (JWT)
 * 
 * Process:
 * 1. User already loaded by requireAuth middleware
 * 2. Return user data (id, email, role, subscription)
 * 
 * Changes from JSON version:
 * - BEFORE: Read user file, parse JSON
 * - AFTER: User already in req.user (from database)
 * 
 * Benefits:
 * - Instant response (no file I/O)
 * - Always fresh data (from middleware)
 * - No race conditions
 */
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    // User already loaded and verified by requireAuth middleware
    // which queries the database for fresh user data
    const user = req.user;
    
    res.json({
      success: true,
      user: {
        id: user.id,
        userId: user.userId, // For backwards compatibility
        email: user.email,
        role: user.role,
        status: user.status,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan
      }
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  // JWT is stateless, so logout is handled client-side
  res.json({ success: true, message: 'Logged out successfully' });
});

// User site management endpoints
app.get('/api/users/:userId/sites', requireAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Verify user can only access their own sites
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Load sites from database
    const result = await dbQuery(`
      SELECT 
        id, subdomain, template_id, status, plan, 
        published_at, created_at, site_data
      FROM sites 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    const sites = result.rows.map(site => ({
      id: site.id,
      subdomain: site.subdomain,
      name: site.site_data?.brand?.name || 'Untitled Site',
      url: `/sites/${site.subdomain}/`,
      status: site.status,
      createdAt: site.published_at || site.created_at,
      plan: site.plan,
      template: site.template_id
    }));
    
    res.json({ sites });
  } catch (error) {
    console.error('Error loading user sites:', error);
    res.status(500).json({ error: 'Failed to load sites' });
  }
});

// Delete user site
app.delete('/api/users/:userId/sites/:siteId', requireAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    const siteId = req.params.siteId;
    
    // Verify user can only delete their own sites
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if site exists and belongs to user
    const result = await dbQuery(
      'SELECT subdomain FROM sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const subdomain = result.rows[0].subdomain;
    
    // Delete from database (CASCADE will delete related submissions and analytics)
    await dbQuery('DELETE FROM sites WHERE id = $1 AND user_id = $2', [siteId, userId]);
    
    // Delete the site directory from file system
    const sitePath = path.join(publicDir, 'sites', subdomain);
    try {
      await fs.rm(sitePath, { recursive: true, force: true });
    } catch (err) {
      console.error(`Error deleting site directory ${subdomain}:`, err.message);
      // Continue even if file deletion fails - database record is gone
    }
    
    res.json({ message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Error deleting site:', error);
    res.status(500).json({ error: 'Failed to delete site' });
  }
});

// Password reset endpoints
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const userPath = getUserFilePath(email);
    
    if (!(await fs.access(userPath).then(() => true).catch(() => false))) {
      // Don't reveal if user exists or not for security
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
    
    // Generate reset token (in production, use crypto.randomBytes)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour
    
    // Load user data
    const userData = JSON.parse(await fs.readFile(userPath, 'utf-8'));
    userData.resetToken = resetToken;
    userData.resetExpires = resetExpires.toISOString();
    
    // Save updated user data
    await fs.writeFile(userPath, JSON.stringify(userData, null, 2));
    
    // Send password reset email
    await sendEmail(email, EmailTypes.PASSWORD_RESET, { email, resetToken });
    
    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Error processing password reset:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Password reset with token endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Find user with this reset token
    const userFiles = await fs.readdir(usersDir);
    let userFile = null;
    let userData = null;
    
    for (const file of userFiles) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(usersDir, file);
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      
      if (data.resetToken === token) {
        userFile = filePath;
        userData = data;
        break;
      }
    }
    
    if (!userData) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Check if token expired
    if (new Date(userData.resetExpires) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }
    
    // Update password
    userData.password = await bcrypt.hash(newPassword, 10);
    userData.resetToken = undefined;
    userData.resetExpires = undefined;
    userData.passwordChangedAt = new Date().toISOString();
    
    await fs.writeFile(userFile, JSON.stringify(userData, null, 2));
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// User invitation system endpoints
app.post('/api/admin/invite-user', requireAuth, async (req, res) => {
  try {
    const { email, role = 'user' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user already exists
    const userPath = getUserFilePath(email);
    
    if (await fs.access(userPath).then(() => true).catch(() => false)) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Generate temporary password
    const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const tempPasswordExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Create user account
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const userData = {
      id: email.replace('@', '_at_').replace('.', '_dot_'),
      email: email,
      password: hashedPassword,
      role: role,
      status: 'invited',
      tempPassword: tempPassword,
      tempPasswordExpires: tempPasswordExpires.toISOString(),
      createdAt: new Date().toISOString(),
      lastLogin: null,
      sites: []
    };
    
    // Save user data
    await fs.writeFile(userPath, JSON.stringify(userData, null, 2));
    
    // Send invitation email
    await sendEmail(email, EmailTypes.INVITATION, { email, tempPassword });
    
    console.log(`✅ Invitation email sent to ${email}`);
    
    res.json({ 
      message: 'User invitation sent successfully',
      email: email,
      loginUrl: `${req.protocol}://${req.get('host')}/login.html`
    });
  } catch (error) {
    console.error('Error creating user invitation:', error);
    res.status(500).json({ error: 'Failed to create user invitation' });
  }
});

// List all users (admin only)
app.get('/api/admin/users', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const users = [];
    const userFiles = await fs.readdir(usersDir);
    
    for (const userFile of userFiles) {
      if (userFile.endsWith('.json')) {
        try {
          const userData = JSON.parse(await fs.readFile(path.join(usersDir, userFile), 'utf-8'));
          // Don't include sensitive data
          users.push({
            id: userData.id,
            email: userData.email,
            role: userData.role,
            status: userData.status,
            createdAt: userData.createdAt,
            lastLogin: userData.lastLogin,
            sitesCount: userData.sites ? userData.sites.length : 0
          });
        } catch (err) {
          console.error(`Error reading user file ${userFile}:`, err.message);
        }
      }
    }
    
    // Sort by creation date (newest first)
    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ users });
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// Force password change on first login
app.post('/api/auth/change-temp-password', requireAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Load user data
    const userPath = getUserFilePath(req.user.email);
    const userData = JSON.parse(await fs.readFile(userPath, 'utf-8'));
    
    // Check if user is using temporary password
    if (userData.status !== 'invited' && !userData.tempPassword) {
      return res.status(400).json({ error: 'No temporary password to change' });
    }
    
    // Update password and status
    const bcrypt = require('bcryptjs');
    userData.password = await bcrypt.hash(newPassword, 10);
    userData.status = 'active';
    userData.tempPassword = undefined;
    userData.tempPasswordExpires = undefined;
    userData.passwordChangedAt = new Date().toISOString();
    
    // Save updated user data
    await fs.writeFile(userPath, JSON.stringify(userData, null, 2));
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing temporary password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================
// ANALYTICS API ENDPOINTS
// ============================================

// Get user analytics
app.get('/api/users/:userId/analytics', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Users can only view their own analytics unless they're admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Load user data
    const userPath = getUserFilePath(req.user.email);
    const userData = JSON.parse(await fs.readFile(userPath, 'utf-8'));
    
    // Get user's sites
    const userSites = userData.sites || [];
    const sitesDir = path.join(publicDir, 'sites');
    
    const sitesAnalytics = [];
    let totalViews = 0;
    let viewsThisMonth = 0;
    let publishedCount = 0;
    let draftCount = 0;
    
    // Analyze each site
    for (const siteId of userSites) {
      try {
        const sitePath = path.join(sitesDir, siteId, 'site.json');
        const siteData = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
        
        // Generate mock analytics (in production, this would come from real tracking)
        const views = Math.floor(Math.random() * 1000);
        const viewsLast7Days = Math.floor(Math.random() * 100);
        
        totalViews += views;
        
        // Count published vs draft
        if (siteData.status === 'published') {
          publishedCount++;
        } else {
          draftCount++;
        }
        
        sitesAnalytics.push({
          id: siteId,
          name: siteData.brand?.name || siteId,
          template: siteData.template || 'Unknown',
          status: siteData.status || 'draft',
          views: views,
          viewsLast7Days: viewsLast7Days,
          createdAt: siteData.createdAt || new Date().toISOString()
        });
      } catch (err) {
        console.error(`Error reading site ${siteId}:`, err.message);
      }
    }
    
    // Calculate month views (mock data)
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    viewsThisMonth = Math.floor(totalViews * 0.3); // Mock: 30% of total views this month
    
    // Calculate changes (mock)
    const viewsChange = Math.floor(Math.random() * 50) - 10; // -10 to +40
    const engagementChange = Math.floor(Math.random() * 20) - 5; // -5 to +15
    
    res.json({
      totalSites: userSites.length,
      publishedSites: publishedCount,
      totalViews: totalViews,
      viewsThisMonth: viewsThisMonth,
      viewsChange: viewsChange,
      avgEngagement: Math.floor(Math.random() * 40) + 30, // 30-70%
      engagementChange: engagementChange,
      activeSites: publishedCount,
      sites: sitesAnalytics.sort((a, b) => b.views - a.views)
    });
  } catch (error) {
    console.error('Error loading user analytics:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// Get admin analytics (platform-wide)
app.get('/api/admin/analytics', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Load all users
    const userFiles = await fs.readdir(usersDir);
    const users = [];
    let totalSites = 0;
    let publishedSites = 0;
    let activePlans = { free: 0, starter: 0, pro: 0 };
    
    for (const userFile of userFiles) {
      if (userFile.endsWith('.json')) {
        try {
          const userData = JSON.parse(await fs.readFile(path.join(usersDir, userFile), 'utf-8'));
          users.push(userData);
          
          // Count sites
          const userSiteCount = userData.sites ? userData.sites.length : 0;
          totalSites += userSiteCount;
          
          // Count user's published sites
          if (userData.sites) {
            for (const siteId of userData.sites) {
              try {
                const sitePath = path.join(publicDir, 'sites', siteId, 'site.json');
                const siteData = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
                if (siteData.status === 'published') {
                  publishedSites++;
                }
                // Count plans
                const plan = siteData.plan || 'free';
                if (activePlans[plan] !== undefined) {
                  activePlans[plan]++;
                }
              } catch (err) {
                // Site might not exist
              }
            }
          }
        } catch (err) {
          console.error(`Error reading user file ${userFile}:`, err.message);
        }
      }
    }
    
    // Calculate metrics
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const newUsersThisMonth = users.filter(u => {
      const created = new Date(u.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;
    
    // Calculate revenue (mock - in production, get from Stripe)
    const starterRevenue = activePlans.starter * 10;
    const proRevenue = activePlans.pro * 25;
    const totalRevenue = starterRevenue + proRevenue;
    const mrr = totalRevenue; // Monthly recurring revenue
    
    // Calculate growth rates (mock)
    const userGrowth = totalUsers > 0 ? Math.floor((newUsersThisMonth / totalUsers) * 100) : 0;
    const siteGrowth = Math.floor(Math.random() * 30) + 5; // 5-35%
    const revenueGrowth = Math.floor(Math.random() * 40) + 10; // 10-50%
    
    // Conversion rate (signups who published)
    const usersWithSites = users.filter(u => u.sites && u.sites.length > 0).length;
    const conversionRate = totalUsers > 0 ? Math.floor((usersWithSites / totalUsers) * 100) : 0;
    
    // Get recent signups (last 10)
    const recentSignups = users
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(u => ({
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        sitesCount: u.sites ? u.sites.length : 0
      }));
    
    // Get top users by site count
    const topUsers = users
      .map(u => ({
        email: u.email,
        totalSites: u.sites ? u.sites.length : 0,
        publishedSites: 0, // Would need to calculate
        draftSites: 0,
        plan: 'Free', // Would need to get from sites
        createdAt: u.createdAt
      }))
      .sort((a, b) => b.totalSites - a.totalSites)
      .slice(0, 20);
    
    // System health metrics
    const uptime = process.uptime();
    const uptimePercent = '99.9'; // Mock uptime
    
    res.json({
      system: {
        status: 'Online',
        uptime: uptimePercent + '%',
        responseTime: Math.floor(Math.random() * 100) + 50, // 50-150ms
        activeUsers: activeUsers,
        totalRequests: Math.floor(Math.random() * 100000) + 50000 // Mock
      },
      platform: {
        totalUsers: totalUsers,
        activeUsers: activeUsers,
        totalSites: totalSites,
        publishedSites: publishedSites,
        totalRevenue: totalRevenue,
        mrr: mrr,
        conversionRate: conversionRate,
        userGrowth: userGrowth,
        siteGrowth: siteGrowth,
        revenueGrowth: revenueGrowth,
        conversionChange: Math.floor(Math.random() * 10) // Mock
      },
      growth: {
        signupsThisMonth: newUsersThisMonth,
        signupsToday: Math.floor(Math.random() * 5), // Mock
        publishesThisMonth: Math.floor(publishedSites * 0.6), // Mock
        publishesToday: Math.floor(Math.random() * 3), // Mock
        paymentsThisMonth: activePlans.starter + activePlans.pro,
        revenueThisMonth: totalRevenue,
        activationRate: conversionRate
      },
      recentSignups: recentSignups,
      topUsers: topUsers
    });
  } catch (error) {
    console.error('Error loading admin analytics:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// Payments config – expose if payments are enabled
app.get('/api/payments/config', (req, res) => {
  res.json({
    hasStripe: Boolean(stripe),
    publishableKey: STRIPE_PUBLISHABLE_KEY || undefined
  });
});

function getRequestOrigin(req){
  const hdrOrigin = req.headers['origin'];
  if (typeof hdrOrigin === 'string' && hdrOrigin) return hdrOrigin;
  const ref = req.headers['referer'];
  if (typeof ref === 'string' && ref) {
    try { const u = new URL(ref); return `${u.protocol}//${u.host}`; } catch (_) {}
  }
  return '';
}

function isAllowedOrigin(req){
  const origin = getRequestOrigin(req);
  if (!origin) return true; // Non-browser clients; allow
  const sameOrigin = `${req.protocol}://${req.get('host')}`;
  const allowed = [sameOrigin, ...ALLOWED_ORIGINS];
  return allowed.some(o => o && o.toLowerCase() === origin.toLowerCase());
}

// Create a Checkout Session for a product with dynamic pricing and Stripe Connect support
app.post('/api/payments/checkout-sessions', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payments not configured' });

    if (!isAllowedOrigin(req)) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    const { productIndex, quantity, currency, successUrl, cancelUrl, siteId } = req.body || {};
    const idx = Number(productIndex);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ error: 'Invalid productIndex' });
    }

    // Load site data - try siteId path first, fallback to dataFile
    let siteFile = dataFile;
    if (siteId) {
      const potentialPath = path.join(__dirname, 'public', 'sites', siteId, 'site.json');
      if (fs.existsSync(potentialPath)) {
        siteFile = potentialPath;
      }
    }

    const raw = await fs.readFile(siteFile, 'utf-8');
    const site = JSON.parse(raw);
    const products = Array.isArray(site.products) ? site.products : [];
    const product = products[idx];
    
    if (!product || typeof product.price !== 'number' || !product.name) {
      return res.status(400).json({ error: 'Product not found' });
    }

    const allowCheckout = site.settings?.allowCheckout !== false;
    if (!allowCheckout) {
      return res.status(403).json({ error: 'Checkout disabled for this site' });
    }

    const unitAmountCents = Math.round(product.price * 100);
    if (unitAmountCents < 50) {
      return res.status(400).json({ error: 'Amount too low' });
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const curr = (currency || 'usd').toLowerCase();

    // Determine return URLs
    const origin = `${req.protocol}://${req.get('host')}`;
    let success, cancel;
    if (siteId) {
      success = successUrl || `${origin}/sites/${siteId}/?order=success`;
      cancel = cancelUrl || `${origin}/sites/${siteId}/?order=cancelled`;
    } else {
      success = successUrl || `${origin}/?checkout=success`;
      cancel = cancelUrl || `${origin}/?checkout=cancel`;
    }

    // Check if site owner has Stripe Connect configured
    let stripeAccountId = null;
    if (site.ownerEmail) {
      const userFile = path.join(__dirname, 'public', 'users', 
        site.ownerEmail.replace('@', '_').replace(/\./g, '_') + '.json');
      
      if (fs.existsSync(userFile)) {
        const userData = JSON.parse(fs.readFileSync(userFile, 'utf-8'));
        if (userData.stripe?.connected && userData.stripe?.accountId) {
          stripeAccountId = userData.stripe.accountId;
        }
      }
    }

    // Idempotency key
    const incomingIdem = (req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || req.body?.idempotencyKey);
    const idempotencyKey = typeof incomingIdem === 'string' && incomingIdem
      ? incomingIdem
      : (typeof nodeRandomUUID === 'function' ? nodeRandomUUID() : `${Date.now()}-${Math.random()}`);

    // Create session - use Connect account if available
    const sessionOptions = {
      mode: 'payment',
      line_items: [
        {
          quantity: qty,
          price_data: {
            currency: curr,
            unit_amount: unitAmountCents,
            product_data: {
              name: String(product.name).slice(0, 250),
              description: product.description ? String(product.description).slice(0, 500) : undefined
            }
          }
        }
      ],
      success_url: success,
      cancel_url: cancel,
      allow_promotion_codes: false,
      automatic_tax: { enabled: true },
      metadata: {
        siteId: siteId ? String(siteId) : '',
        productIndex: String(idx)
      }
    };

    const createOptions = { idempotencyKey };
    
    // If connected account exists, use it
    if (stripeAccountId) {
      createOptions.stripeAccount = stripeAccountId;
      console.log(`Creating checkout on connected account: ${stripeAccountId}`);
    }

    const session = await stripe.checkout.sessions.create(sessionOptions, createOptions);

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create checkout session', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create Checkout Session for subscription (Starter/Pro plans)
async function createSubscriptionCheckout(req, res) {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to .env' });
    }

    const { plan, draftId } = req.body;
    const userEmail = req.user.email;

    // Validate plan and get pricing details
    const validPlans = ['starter', 'pro'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be "starter" or "pro"' });
    }

    // Define plan details (dynamic pricing - no need for pre-created products!)
    const planDetails = {
      starter: {
        name: 'SiteSprintz Starter',
        amount: 1000, // $10.00 in cents
        description: 'Professional website with all premium features'
      },
      pro: {
        name: 'SiteSprintz Pro',
        amount: 2500, // $25.00 in cents
        description: 'Pro plan with payments, ecommerce, and advanced features'
      }
    };

    const selectedPlan = planDetails[plan];

    // Create or retrieve Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: { 
          source: 'sitesprintz',
          signupDate: new Date().toISOString()
        }
      });
    }

    // Create checkout session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: selectedPlan.name,
            description: selectedPlan.description,
          },
          unit_amount: selectedPlan.amount,
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      }],
      success_url: `${process.env.SITE_URL || 'http://localhost:3000'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${process.env.SITE_URL || 'http://localhost:3000'}/payment-cancel.html?plan=${plan}`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        plan,
        user_email: userEmail,
        draft_id: draftId || '',
        source: 'sitesprintz_subscription'
      }
    });

    console.log(`Created subscription checkout session for ${userEmail}, plan: ${plan}, session: ${session.id}`);
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Subscription checkout error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
}

// Mount handlers at both paths for compatibility
app.post('/api/payments/create-subscription-checkout', requireAuth, createSubscriptionCheckout);
app.post('/api/create-subscription-checkout', requireAuth, createSubscriptionCheckout);

// Get user's subscription status
app.get('/api/subscription/status', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    // Load user data
    const userFilePath = getUserFilePath(userEmail);
    let userData;
    try {
      userData = JSON.parse(await fs.readFile(userFilePath, 'utf-8'));
    } catch (error) {
      return res.json({ hasSubscription: false, plan: 'free' });
    }

    // Check if user has subscription data
    if (!userData.subscription || !userData.subscription.subscriptionId) {
      return res.json({ hasSubscription: false, plan: 'free' });
    }

    // Verify subscription status with Stripe
    if (stripe && userData.subscription.subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(userData.subscription.subscriptionId);
        
        // Update local data if different
        if (subscription.status !== userData.subscription.status) {
          userData.subscription.status = subscription.status;
          await fs.writeFile(userFilePath, JSON.stringify(userData, null, 2));
        }

        return res.json({
          hasSubscription: subscription.status === 'active' || subscription.status === 'trialing',
          plan: userData.subscription.plan || 'free',
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        });
      } catch (error) {
        console.error('Error fetching subscription from Stripe:', error);
      }
    }

    // Fallback to local data
    res.json({
      hasSubscription: userData.subscription.status === 'active',
      plan: userData.subscription.plan || 'free',
      status: userData.subscription.status
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Helper function to update user subscription data
async function updateUserSubscription(email, subscriptionData) {
  const userFilePath = getUserFilePath(email);
  try {
    let userData;
    try {
      userData = JSON.parse(await fs.readFile(userFilePath, 'utf-8'));
    } catch (error) {
      // User file doesn't exist, create basic structure
      userData = { email, createdAt: Date.now() };
    }

    userData.subscription = {
      ...userData.subscription,
      ...subscriptionData,
      updatedAt: Date.now()
    };

    await fs.writeFile(userFilePath, JSON.stringify(userData, null, 2));
    console.log(`Updated subscription for ${email}:`, subscriptionData);
  } catch (error) {
    console.error('Failed to update user subscription:', error);
    throw error;
  }
}

// ==================== STRIPE CONNECT ROUTES ====================

// Initiate Stripe Connect onboarding
app.post('/api/connect/onboard', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const userEmail = req.user.email;
    
    // Check if user has Pro or Premium subscription
    const userFilePath = getUserFilePath(userEmail);
    let userData;
    try {
      userData = JSON.parse(await fs.readFile(userFilePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify user has Pro or Premium subscription
    const plan = userData.subscription?.plan?.toLowerCase();
    if (plan !== 'pro' && plan !== 'premium') {
      return res.status(403).json({ 
        error: 'Stripe Connect requires Pro or Premium subscription',
        currentPlan: plan || 'free'
      });
    }

    // Check if user already has a connected account
    let accountId = userData.stripeConnect?.accountId;
    
    if (!accountId) {
      // Create a new Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'standard',
        email: userEmail,
        business_type: 'individual',
        metadata: {
          platform_user_email: userEmail,
          created_via: 'sitesprintz_platform'
        }
      });
      
      accountId = account.id;
      
      // Save account ID to user data
      userData.stripeConnect = {
        accountId,
        status: 'pending',
        createdAt: Date.now()
      };
      await fs.writeFile(userFilePath, JSON.stringify(userData, null, 2));
      
      console.log(`Created Connect account ${accountId} for ${userEmail}`);
    }

    // Create Account Link for onboarding
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard.html?connect=refresh`,
      return_url: `${origin}/dashboard.html?connect=success`,
      type: 'account_onboarding',
    });

    res.json({ 
      url: accountLink.url,
      accountId 
    });

  } catch (error) {
    console.error('Connect onboarding error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate Connect onboarding',
      message: error.message 
    });
  }
});

// Get Stripe Connect status
app.get('/api/connect/status', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.json({ connected: false, message: 'Stripe not configured' });
    }

    const userEmail = req.user.email;
    const userFilePath = getUserFilePath(userEmail);
    
    let userData;
    try {
      userData = JSON.parse(await fs.readFile(userFilePath, 'utf-8'));
    } catch (error) {
      return res.json({ connected: false });
    }

    if (!userData.stripeConnect?.accountId) {
      return res.json({ connected: false });
    }

    // Verify account status with Stripe
    try {
      const account = await stripe.accounts.retrieve(userData.stripeConnect.accountId);
      
      const isConnected = account.charges_enabled && account.payouts_enabled;
      
      // Update local status if changed
      if (userData.stripeConnect.status !== (isConnected ? 'active' : 'pending')) {
        userData.stripeConnect.status = isConnected ? 'active' : 'pending';
        userData.stripeConnect.updatedAt = Date.now();
        await fs.writeFile(userFilePath, JSON.stringify(userData, null, 2));
      }

      res.json({
        connected: isConnected,
        accountId: account.id,
        status: userData.stripeConnect.status,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        email: account.email,
        businessProfile: {
          name: account.business_profile?.name,
          url: account.business_profile?.url
        }
      });

    } catch (error) {
      console.error('Failed to retrieve Connect account:', error);
      res.json({ 
        connected: false,
        error: 'Failed to verify account status',
        accountId: userData.stripeConnect.accountId 
      });
    }

  } catch (error) {
    console.error('Connect status error:', error);
    res.status(500).json({ error: 'Failed to fetch Connect status' });
  }
});

// Refresh Connect account link (if onboarding incomplete)
app.post('/api/connect/refresh', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const userEmail = req.user.email;
    const userFilePath = getUserFilePath(userEmail);
    
    let userData;
    try {
      userData = JSON.parse(await fs.readFile(userFilePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userData.stripeConnect?.accountId) {
      return res.status(400).json({ error: 'No Connect account found. Please start onboarding first.' });
    }

    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const accountLink = await stripe.accountLinks.create({
      account: userData.stripeConnect.accountId,
      refresh_url: `${origin}/dashboard.html?connect=refresh`,
      return_url: `${origin}/dashboard.html?connect=success`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });

  } catch (error) {
    console.error('Connect refresh error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh Connect link',
      message: error.message 
    });
  }
});

// Disconnect Stripe Connect account
app.post('/api/connect/disconnect', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userFilePath = getUserFilePath(userEmail);
    
    let userData;
    try {
      userData = JSON.parse(await fs.readFile(userFilePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userData.stripeConnect?.accountId) {
      // Note: We don't delete the Stripe account, just disconnect it from our platform
      // The business owner can delete it themselves from their Stripe dashboard
      userData.stripeConnect = {
        ...userData.stripeConnect,
        status: 'disconnected',
        disconnectedAt: Date.now()
      };
      
      await fs.writeFile(userFilePath, JSON.stringify(userData, null, 2));
      console.log(`Disconnected Connect account for ${userEmail}`);
    }

    res.json({ success: true, message: 'Account disconnected' });

  } catch (error) {
    console.error('Connect disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

// Create checkout session with connected account (for customer purchases)
app.post('/api/connect/create-checkout', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const { connectedAccountId, lineItems, metadata } = req.body;

    if (!connectedAccountId) {
      return res.status(400).json({ error: 'Connected account ID required' });
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ error: 'Line items required' });
    }

    // Verify the connected account exists and is active
    const account = await stripe.accounts.retrieve(connectedAccountId);
    if (!account.charges_enabled) {
      return res.status(400).json({ error: 'Connected account cannot accept charges' });
    }

    // Calculate platform fee (1% of total, min $0.50, max $5.00)
    const total = lineItems.reduce((sum, item) => {
      return sum + (item.price_data.unit_amount * item.quantity);
    }, 0);
    const platformFee = Math.min(Math.max(Math.round(total * 0.01), 50), 500);

    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;

    // Create checkout session on behalf of connected account
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel.html`,
      payment_intent_data: {
        application_fee_amount: platformFee,
        metadata: {
          ...metadata,
          platform: 'sitesprintz'
        }
      },
      metadata: {
        ...metadata,
        connectedAccountId
      }
    }, {
      stripeAccount: connectedAccountId // Create on behalf of connected account
    });

    console.log(`Created Connect checkout session ${session.id} for account ${connectedAccountId}`);
    console.log(`Platform fee: $${(platformFee / 100).toFixed(2)}`);

    res.json({ 
      sessionId: session.id,
      url: session.url,
      platformFee: platformFee / 100
    });

  } catch (error) {
    console.error('Connect checkout error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
});

app.get('/api/site', async (req, res) => {
  try{
    const raw = await fs.readFile(dataFile, 'utf-8');
    const json = JSON.parse(raw);
    res.json(json);
  }catch(err){
    // If no site.json yet, fall back to a sensible default template
    if (err && (err.code === 'ENOENT' || err.message?.includes('ENOENT'))) {
      try{
        const fallbackRaw = await fs.readFile(path.join(templatesDir, 'starter.json'), 'utf-8');
        const fallback = JSON.parse(fallbackRaw);
        return res.json(fallback);
      }catch(e){
        return res.status(500).json({ error: 'No site.json and failed to load default template' });
      }
    }
    res.status(500).json({ error: 'Failed to read site.json' });
  }
});

app.post('/api/site', requireAdmin, async (req, res) => {
  try{
    const incoming = req.body;
    if(typeof incoming !== 'object' || incoming == null){
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(incoming, null, 2));
    res.json({ ok: true });
  }catch(err){
    res.status(500).json({ error: 'Failed to write site.json' });
  }
});

// Upload image endpoint
app.post('/api/upload', requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({ 
      success: true, 
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename
    });
  });
});

// Delete uploaded image
app.delete('/api/uploads/:filename', requireAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    await fs.unlink(path.join(uploadsDir, filename));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Draft Management Endpoints
app.post('/api/drafts', async (req, res) => {
  try {
    const draftData = req.body;
    
    if (!draftData || !draftData.templateId) {
      return res.status(400).json({ error: 'Invalid draft data: templateId is required' });
    }
    
    // Validate business data if provided
    if (draftData.businessData) {
      const bd = draftData.businessData;
      
      // Validate email if provided
      if (bd.email && !isValidEmail(bd.email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
      
      // Validate phone if provided
      if (bd.phone && !isValidPhone(bd.phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
      
      // Sanitize string fields
      if (bd.businessName) bd.businessName = sanitizeString(bd.businessName, 200);
      if (bd.heroTitle) bd.heroTitle = sanitizeString(bd.heroTitle, 200);
      if (bd.heroSubtitle) bd.heroSubtitle = sanitizeString(bd.heroSubtitle, 500);
      if (bd.address) bd.address = sanitizeString(bd.address, 300);
    }
    
    // Generate unique draft ID
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const draftFile = path.join(draftsDir, `${draftId}.json`);
    
    // Add expiration timestamp (7 days from now)
    const draft = {
      draftId: draftId,
      templateId: draftData.templateId,
      businessData: draftData.businessData || {},
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft'
    };
    
    await fs.writeFile(draftFile, JSON.stringify(draft, null, 2));
    
    res.json({ 
      success: true, 
      draftId: draftId,
      previewUrl: `/preview/${draftId}`,
      expiresAt: draft.expiresAt
    });
  } catch (err) {
    console.error('Draft save error:', err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

app.get('/api/drafts/:draftId', async (req, res) => {
  try {
    const draftId = req.params.draftId;
    const draftFile = path.join(draftsDir, `${draftId}.json`);
    
    const draftRaw = await fs.readFile(draftFile, 'utf-8');
    const draft = JSON.parse(draftRaw);
    
    // Check if draft is expired
    if (new Date(draft.expiresAt) < new Date()) {
      await fs.unlink(draftFile);
      return res.status(410).json({ error: 'Draft has expired' });
    }
    
    res.json(draft);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Draft not found' });
    } else {
      res.status(500).json({ error: 'Failed to load draft' });
    }
  }
});

app.delete('/api/drafts/:draftId', async (req, res) => {
  try {
    const draftId = req.params.draftId;
    const draftFile = path.join(draftsDir, `${draftId}.json`);
    await fs.unlink(draftFile);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

// Save site data from setup flow
app.post('/api/setup', async (req, res) => {
  try {
    const setupData = req.body;
    console.log('Received setup data:', JSON.stringify(setupData, null, 2));
    
    if (!setupData) {
      return res.status(400).json({ error: 'No data received' });
    }
    
    if (!setupData.templateId) {
      return res.status(400).json({ error: 'templateId is required' });
    }
    
    // Load the template
    const templateFile = path.join(templatesDir, `${setupData.templateId}.json`);
    let siteData;
    
    try {
      const templateRaw = await fs.readFile(templateFile, 'utf-8');
      siteData = JSON.parse(templateRaw);
    } catch (err) {
      // Fallback to starter template if template not found
      const starterRaw = await fs.readFile(path.join(templatesDir, 'starter.json'), 'utf-8');
      siteData = JSON.parse(starterRaw);
    }
    
    // Update site data with setup information
    if (setupData.businessData && typeof setupData.businessData === 'object') {
      if (setupData.businessData.businessName && setupData.businessData.businessName.trim()) {
        siteData.brand.name = setupData.businessData.businessName;
      }
      
      if (siteData.hero) {
        if (setupData.businessData.heroTitle && setupData.businessData.heroTitle.trim()) {
          siteData.hero.title = setupData.businessData.heroTitle;
        }
        if (setupData.businessData.heroSubtitle && setupData.businessData.heroSubtitle.trim()) {
          siteData.hero.subtitle = setupData.businessData.heroSubtitle;
        }
        if (setupData.businessData.heroImage && setupData.businessData.heroImage.trim()) {
          siteData.hero.image = setupData.businessData.heroImage;
        }
      }
      
      if (siteData.contact) {
        if (setupData.businessData.email && setupData.businessData.email.trim()) siteData.contact.email = setupData.businessData.email;
        if (setupData.businessData.phone && setupData.businessData.phone.trim()) siteData.contact.phone = setupData.businessData.phone;
        if (setupData.businessData.address && setupData.businessData.address.trim()) siteData.contact.subtitle = setupData.businessData.address;
        if (setupData.businessData.businessHours && setupData.businessData.businessHours.trim()) siteData.contact.hours = setupData.businessData.businessHours;
      }
      
      // Update services/products
      if (Array.isArray(setupData.businessData.services) && setupData.businessData.services.length > 0) {
        // Determine if this template uses 'products' or 'services'
        if (siteData.products) {
          siteData.products = setupData.businessData.services
            .filter(s => s.name && s.name.trim())
            .map(s => ({
              name: s.name,
              price: parseFloat(s.price) || 0,
              description: s.description || '',
              ...(s.image && s.image.trim() && { image: s.image }),
              ...(s.imageAlt && { imageAlt: s.imageAlt })
            }));
        } else if (siteData.services) {
          siteData.services.items = setupData.businessData.services
            .filter(s => s.name && s.name.trim())
            .map(s => ({
              title: s.name,
              description: s.description || '',
              ...(s.price && { price: s.price }),
              ...(s.image && s.image.trim() && { image: s.image }),
              ...(s.imageAlt && { imageAlt: s.imageAlt })
            }));
        }
      }
    }
    
    // Create unique page ID
    const pageId = `${setupData.templateId}-${Date.now()}`;
    const pageDir = path.join(publicDir, 'pages', pageId);
    const pageDataFile = path.join(pageDir, 'site.json');
    
    // Save to new page directory
    await fs.mkdir(pageDir, { recursive: true });
    await fs.writeFile(pageDataFile, JSON.stringify(siteData, null, 2));
    
    // Create page index.html
    const pageHtml = await fs.readFile(path.join(publicDir, 'index.html'), 'utf-8');
    const modifiedHtml = pageHtml.replace(
      './data/site.json',
      `./site.json?page=${pageId}`
    );
    await fs.writeFile(path.join(pageDir, 'index.html'), modifiedHtml);
    
    res.json({ success: true, templateId: setupData.templateId, pageId: pageId });
  } catch (err) {
    console.error('Setup save error:', err);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

/**
 * GUEST PUBLISH ENDPOINT (SEAMLESS UX)
 * 
 * Purpose: Publish site for users who built without logging in
 * Creates account and publishes site in one flow
 */
app.post('/api/sites/guest-publish', async (req, res) => {
  try {
    const { email, data } = req.body;
    
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    
    if (!data) {
      return res.status(400).json({ error: 'Site data required' });
    }
    
    // Check if user exists
    const existingUser = await dbQuery(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    let userId;
    
    if (existingUser.rows.length === 0) {
      // Create new user with temporary password
      const tempPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      const userResult = await dbQuery(`
        INSERT INTO users (email, password_hash, role, status, created_at)
        VALUES ($1, $2, 'user', 'pending', NOW())
        RETURNING id
      `, [email.toLowerCase(), hashedPassword]);
      
      userId = userResult.rows[0].id;
      
      // Send welcome email
      try {
        await sendEmail(email, EmailTypes.WELCOME, { email });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    } else {
      userId = existingUser.rows[0].id;
    }
    
    // Generate subdomain
    const businessName = data.brand?.name || data.meta?.businessName || 'my-site';
    const baseSubdomain = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    let subdomain = baseSubdomain;
    let attempt = 0;
    
    // Ensure unique subdomain
    while (true) {
      const siteDir = path.join(publicDir, 'sites', subdomain);
      try {
        await fs.access(siteDir);
        // Directory exists, try with suffix
        attempt++;
        subdomain = `${baseSubdomain}-${Math.random().toString(36).substr(2, 9)}`;
      } catch {
        // Directory doesn't exist, we can use this subdomain
        break;
      }
    }
    
    // Create site directory
    const siteDir = path.join(publicDir, 'sites', subdomain);
    await fs.mkdir(siteDir, { recursive: true });
    await fs.mkdir(path.join(siteDir, 'data'), { recursive: true });
    
    // Save site data
    await fs.writeFile(
      path.join(siteDir, 'data', 'site.json'),
      JSON.stringify(data, null, 2)
    );
    
    // Copy site template
    const indexContent = await fs.readFile(
      path.join(publicDir, 'site-template.html'),
      'utf-8'
    );
    await fs.writeFile(path.join(siteDir, 'index.html'), indexContent);
    
    // Set 7-day trial expiration
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 7);
    
    // Save site to database
    const siteId = subdomain; // Use subdomain as site ID
    const templateId = data.template || 'starter';
    
    await dbQuery(`
      INSERT INTO sites (
        id, user_id, subdomain, template_id, status, plan,
        published_at, expires_at, site_data, json_file_path
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)
    `, [
      siteId,
      userId,
      subdomain,
      templateId,
      'published',
      'free',
      trialExpiresAt,
      JSON.stringify(data),
      path.join('sites', subdomain, 'data', 'site.json')
    ]);
    
    res.json({
      success: true,
      subdomain,
      url: `${req.protocol}://${req.get('host')}/sites/${subdomain}`,
      businessName,
      trialDays: 7
    });
    
  } catch (err) {
    console.error('Guest publish error:', err);
    res.status(500).json({ error: 'Failed to publish site' });
  }
});

// Publish Draft to Live Site
app.post('/api/drafts/:draftId/publish', async (req, res) => {
  try {
    const { draftId } = req.params;
    const { plan, email } = req.body; // plan: starter, business, pro
    
    // Validate required fields
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    
    if (!plan || !['starter', 'business', 'pro'].includes(plan.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    // Check subscription requirement for paid plans
    if (plan.toLowerCase() !== 'free') {
      try {
        const userFilePath = getUserFilePath(email);
        let userData;
        
        try {
          userData = JSON.parse(await fs.readFile(userFilePath, 'utf-8'));
        } catch (error) {
          // User file doesn't exist
          return res.status(402).json({ 
            error: 'Subscription required',
            message: 'This plan requires an active subscription. Please subscribe first.',
            requiresPayment: true,
            plan: plan.toLowerCase()
          });
        }
        
        // Check if user has subscription
        if (!userData.subscription || !userData.subscription.subscriptionId) {
          return res.status(402).json({ 
            error: 'Subscription required',
            message: 'This plan requires an active subscription. Please subscribe first.',
            requiresPayment: true,
            plan: plan.toLowerCase()
          });
        }
        
        // Verify subscription is active
        const subStatus = userData.subscription.status;
        if (subStatus !== 'active' && subStatus !== 'trialing') {
          return res.status(402).json({ 
            error: 'Inactive subscription',
            message: `Your subscription is ${subStatus}. Please update your payment method or subscribe again.`,
            requiresPayment: true,
            plan: plan.toLowerCase()
          });
        }
        
        // Verify plan tier matches (pro requires pro subscription)
        if (plan.toLowerCase() === 'pro' && userData.subscription.plan !== 'pro') {
          return res.status(403).json({ 
            error: 'Plan upgrade required',
            message: 'This template requires a Pro subscription. Please upgrade your plan.',
            requiresUpgrade: true,
            currentPlan: userData.subscription.plan,
            requiredPlan: 'pro'
          });
        }
        
        console.log(`Subscription verified for ${email}: ${userData.subscription.plan} (${subStatus})`);
      } catch (error) {
        console.error('Error checking subscription:', error);
        return res.status(500).json({ error: 'Failed to verify subscription' });
      }
    }
    
    // Load draft
    const draftFile = path.join(draftsDir, `${draftId}.json`);
    let draft;
    
    try {
      const draftRaw = await fs.readFile(draftFile, 'utf-8');
      draft = JSON.parse(draftRaw);
    } catch (err) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    
    // Check if draft is expired
    if (new Date(draft.expiresAt) < new Date()) {
      await fs.unlink(draftFile);
      return res.status(410).json({ error: 'Draft has expired' });
    }
    
    // Load template data
    const templateFile = path.join(templatesDir, `${draft.templateId}.json`);
    let siteData;
    
    try {
      const templateRaw = await fs.readFile(templateFile, 'utf-8');
      siteData = JSON.parse(templateRaw);
    } catch (err) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Update site data with draft business data
    if (draft.businessData) {
      // Business name
      if (draft.businessData.businessName && draft.businessData.businessName.trim()) {
        siteData.brand.name = draft.businessData.businessName;
      }
      
      // Hero section
      if (siteData.hero) {
        if (draft.businessData.heroTitle) siteData.hero.title = draft.businessData.heroTitle;
        if (draft.businessData.heroSubtitle) siteData.hero.subtitle = draft.businessData.heroSubtitle;
        if (draft.businessData.heroImage) siteData.hero.image = draft.businessData.heroImage;
      }
      
      // Contact information
      if (siteData.contact) {
        if (draft.businessData.email) siteData.contact.email = draft.businessData.email;
        if (draft.businessData.phone) siteData.contact.phone = draft.businessData.phone;
        if (draft.businessData.address) siteData.contact.subtitle = draft.businessData.address;
        if (draft.businessData.businessHours) siteData.contact.hours = draft.businessData.businessHours;
      }
      
      // Social media links (add new section if not exists)
      if (!siteData.social) siteData.social = {};
      if (draft.businessData.websiteUrl) siteData.social.website = draft.businessData.websiteUrl;
      if (draft.businessData.facebookUrl) siteData.social.facebook = draft.businessData.facebookUrl;
      if (draft.businessData.instagramUrl) siteData.social.instagram = draft.businessData.instagramUrl;
      if (draft.businessData.googleMapsUrl) siteData.social.maps = draft.businessData.googleMapsUrl;
      
      // Template-specific fields (preserve custom data)
      if (draft.businessData.templateSpecific && Object.keys(draft.businessData.templateSpecific).length > 0) {
        if (!siteData.custom) siteData.custom = {};
        Object.assign(siteData.custom, draft.businessData.templateSpecific);
      }
      
      // Update services/products
      if (Array.isArray(draft.businessData.services) && draft.businessData.services.length > 0) {
        if (siteData.products) {
          siteData.products = draft.businessData.services
            .filter(s => s.name && s.name.trim())
            .map(s => ({
              name: s.name,
              price: parseFloat(s.price) || 0,
              description: s.description || '',
              ...(s.image && { image: s.image }),
              ...(s.imageAlt && { imageAlt: s.imageAlt })
            }));
        } else if (siteData.services) {
          siteData.services.items = draft.businessData.services
            .filter(s => s.name && s.name.trim())
            .map(s => ({
              title: s.name,
              description: s.description || '',
              ...(s.price && { price: s.price }),
              ...(s.image && { image: s.image }),
              ...(s.imageAlt && { imageAlt: s.imageAlt })
            }));
        }
      }
      
      // Add publishing metadata
      siteData.published = {
        at: new Date().toISOString(),
        plan: plan,
        email: email,
        subdomain: null // will be set after generation
      };
    }
    
    // Generate unique subdomain
    const subdomain = generateSubdomain(siteData.brand.name);
    const sitesDir = path.join(publicDir, 'sites', subdomain);
    const siteConfigFile = path.join(sitesDir, 'site.json');
    const siteIndexFile = path.join(sitesDir, 'index.html');
    
    // Create site directory
    await fs.mkdir(sitesDir, { recursive: true });
    
    // Save site.json
    await fs.writeFile(siteConfigFile, JSON.stringify(siteData, null, 2));
    
    // Create index.html for the site (use a dynamic template)
    const siteHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${siteData.brand?.name || 'Loading...'}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      :root {
        --color-bg: #0a0a0f;
        --color-surface: rgba(255, 255, 255, 0.03);
        --color-card: rgba(255, 255, 255, 0.06);
        --color-text: #f8fafc;
        --color-muted: #94a3b8;
        --color-primary: #6366f1;
        --color-primary-light: #818cf8;
        --color-primary-dark: #4f46e5;
        --color-accent: #8b5cf6;
        --color-accent-light: #a78bfa;
        --color-success: #10b981;
        --color-warning: #f59e0b;
        --radius: 20px;
        --radius-lg: 28px;
        --shadow-glow: 0 0 40px rgba(99, 102, 241, 0.3);
        --shadow-soft: 0 20px 60px rgba(0, 0, 0, 0.5);
        --shadow-subtle: 0 8px 32px rgba(0, 0, 0, 0.3);
        --spacing-xs: 6px;
        --spacing-sm: 12px;
        --spacing-md: 20px;
        --spacing-lg: 32px;
        --spacing-xl: 48px;
        --spacing-2xl: 72px;
      }
      
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
      }
      
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes gradientShift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      
      body { 
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0; 
        padding: 0; 
        background: linear-gradient(135deg, #0a0a0f 0%, #1a0f2e 50%, #0a0a0f 100%);
        background-size: 200% 200%;
        animation: gradientShift 15s ease infinite;
        color: var(--color-text);
        line-height: 1.6;
        font-size: 16px;
        position: relative;
        overflow-x: hidden;
      }
      
      body::before {
        content: '';
        position: fixed;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background-image: 
          radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 70%);
        animation: float 20s ease-in-out infinite;
        pointer-events: none;
        z-index: 0;
      }
      
      .container { 
        max-width: 1200px; 
        margin: 0 auto; 
        padding: var(--spacing-lg);
        position: relative;
        z-index: 1;
      }
      
      .glass {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }
      
      .card { 
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: var(--radius);
        padding: var(--spacing-lg);
        box-shadow: var(--shadow-subtle);
        margin: var(--spacing-lg) 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        animation: fadeInUp 0.6s ease-out;
      }
      
      .card::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
        transition: left 0.6s;
      }
      
      .card:hover::before {
        left: 100%;
      }
      
      .card:hover { 
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 20px 60px rgba(99, 102, 241, 0.3),
                    0 0 0 1px rgba(99, 102, 241, 0.3);
        border-color: rgba(99, 102, 241, 0.5);
      }
      
      .card-grid {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
        padding: var(--spacing-md);
        border-radius: var(--radius);
        border: 1px solid rgba(99, 102, 241, 0.1);
      }
      
      .btn { 
        display: inline-flex; 
        align-items: center; 
        gap: var(--spacing-sm); 
        padding: var(--spacing-md) var(--spacing-xl); 
        border-radius: 14px;
        text-decoration: none; 
        font-weight: 700; 
        border: 2px solid transparent; 
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 1rem;
        position: relative;
        overflow: hidden;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 0.9rem;
      }
      
      .btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s;
      }
      
      .btn:hover::before {
        left: 100%;
      }
      
      .btn-primary { 
        background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
        color: white;
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
        border-color: rgba(255, 255, 255, 0.2);
      }
      
      .btn-primary:hover { 
        transform: translateY(-3px) scale(1.05);
        box-shadow: 0 16px 48px rgba(99, 102, 241, 0.6);
      }
      
      .btn-secondary { 
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(10px);
        color: var(--color-text);
        border: 2px solid rgba(255, 255, 255, 0.2);
      }
      
      .btn-secondary:hover { 
        background: rgba(255, 255, 255, 0.15);
        border-color: var(--color-primary);
        transform: translateY(-3px);
        box-shadow: 0 12px 32px rgba(99, 102, 241, 0.3);
      }
      
      .hero { 
        display: grid; 
        grid-template-columns: 1.1fr 0.9fr; 
        align-items: center; 
        gap: var(--spacing-2xl); 
        padding: var(--spacing-2xl) 0;
        min-height: 70vh;
        position: relative;
      }
      
      .hero::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 800px;
        height: 800px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
        border-radius: 50%;
        filter: blur(60px);
        pointer-events: none;
      }
      
      .hero-content {
        position: relative;
        z-index: 2;
      }
      
      .eyebrow {
        display: inline-block;
        padding: 8px 20px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 50px;
        color: var(--color-primary-light);
        font-size: 0.85rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: var(--spacing-md);
        animation: fadeInUp 0.8s ease-out;
      }
      
      .hero h1 { 
        font-size: clamp(2.5rem, 5vw + 1rem, 4rem);
        line-height: 1.1;
        margin: var(--spacing-md) 0;
        font-weight: 900;
        background: linear-gradient(135deg, #ffffff 0%, var(--color-primary-light) 50%, var(--color-accent-light) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: fadeInUp 1s ease-out;
      }
      
      .hero p { 
        font-size: 1.25rem;
        color: var(--color-muted);
        margin: 0 0 var(--spacing-xl);
        line-height: 1.7;
        animation: fadeInUp 1.2s ease-out;
      }
      
      .hero-image-wrapper {
        position: relative;
        animation: fadeInUp 1.4s ease-out;
      }
      
      .hero img { 
        width: 100%;
        height: 450px;
        object-fit: cover;
        border-radius: var(--radius-lg);
        border: 2px solid rgba(99, 102, 241, 0.3);
        box-shadow: 0 30px 80px rgba(99, 102, 241, 0.4),
                    0 0 100px rgba(99, 102, 241, 0.2);
        transition: all 0.4s ease;
      }
      
      .hero img:hover {
        transform: scale(1.05) rotate(2deg);
        box-shadow: 0 40px 100px rgba(99, 102, 241, 0.6);
      }
      
      .grid { 
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: var(--spacing-xl);
        margin: var(--spacing-xl) 0;
      }
      
      .section-header {
        text-align: center;
        margin: var(--spacing-2xl) 0 var(--spacing-xl);
      }
      
      .section-header h2 {
        font-size: clamp(2rem, 4vw + 1rem, 3rem);
        font-weight: 800;
        margin-bottom: var(--spacing-sm);
        background: linear-gradient(135deg, #ffffff 0%, var(--color-primary-light) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .section-header p {
        font-size: 1.15rem;
        color: var(--color-muted);
        max-width: 600px;
        margin: 0 auto;
      }
      
      .product-card {
        position: relative;
        overflow: hidden;
      }
      
      .product-card img {
        width: 100%;
        height: 250px;
        object-fit: cover;
        border-radius: var(--radius);
        margin-bottom: var(--spacing-md);
        transition: all 0.4s ease;
        border: 1px solid rgba(99, 102, 241, 0.2);
      }
      
      .product-card:hover img {
        transform: scale(1.1);
        box-shadow: 0 20px 60px rgba(99, 102, 241, 0.4);
      }
      
      .product-card h3 {
        font-size: 1.4rem;
        font-weight: 700;
        margin-bottom: var(--spacing-sm);
        color: var(--color-text);
      }
      
      .price-tag {
        display: inline-block;
        font-size: 1.8rem;
        font-weight: 900;
        background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: var(--spacing-sm) 0;
      }
      
      .muted { color: var(--color-muted); }
      .text-center { text-align: center; }
      
      header {
        position: sticky;
        top: 0;
        backdrop-filter: blur(20px);
        background: rgba(10, 10, 15, 0.8);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding: var(--spacing-md) 0;
        z-index: 100;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
      }
      
      header h1 {
        font-size: 1.8rem;
        font-weight: 900;
        margin: 0;
        background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      nav a {
        color: var(--color-muted);
        text-decoration: none;
        font-weight: 600;
        transition: all 0.3s;
        padding: 8px 16px;
        border-radius: 8px;
      }
      
      nav a:hover {
        color: var(--color-primary-light);
        background: rgba(99, 102, 241, 0.1);
      }
      
      footer {
        text-align: center;
        padding: var(--spacing-2xl) 0;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        margin-top: var(--spacing-2xl);
        background: linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.05) 100%);
      }
      
      @media (max-width: 900px) {
        .hero { 
          grid-template-columns: 1fr;
          gap: var(--spacing-xl);
          min-height: auto;
        }
        .container { padding: var(--spacing-md); }
        .grid { grid-template-columns: 1fr; }
      }
      
      /* Pro Template Styles */
      .pro-tabs {
        display: flex;
        gap: var(--spacing-sm);
        border-bottom: 2px solid rgba(255,255,255,0.1);
        margin-bottom: var(--spacing-xl);
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      
      .pro-tab {
        padding: var(--spacing-md) var(--spacing-lg);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        white-space: nowrap;
        font-weight: 600;
        color: var(--color-muted);
        border: none;
        background: none;
        font-size: 1.1rem;
      }
      
      .pro-tab:hover {
        color: var(--color-primary-light);
        background: rgba(99, 102, 241, 0.1);
        border-radius: 8px;
      }
      
      .pro-tab.active {
        color: var(--color-primary-light);
      }
      
      .pro-tab.active::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
        box-shadow: 0 0 20px var(--color-primary);
      }
      
      .pro-tab-content {
        display: none;
        animation: fadeInUp 0.4s ease-out;
      }
      
      .pro-tab-content.active {
        display: block;
      }
      
      .pro-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(10px);
        z-index: 1000;
        padding: var(--spacing-lg);
        overflow-y: auto;
      }
      
      .pro-modal.active {
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .pro-modal-content {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
        backdrop-filter: blur(30px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: var(--radius-lg);
        padding: var(--spacing-2xl);
        max-width: 800px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 30px 90px rgba(0, 0, 0, 0.5);
        position: relative;
        animation: slideUp 0.3s ease-out;
      }
      
      @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      .pro-modal-close {
        position: absolute;
        top: var(--spacing-md);
        right: var(--spacing-md);
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1.5rem;
        color: var(--color-text);
        transition: all 0.3s;
      }
      
      .pro-modal-close:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: rotate(90deg);
      }
      
      .pro-section {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
        border-radius: var(--radius);
        padding: var(--spacing-xl);
        margin-bottom: var(--spacing-lg);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        transition: all 0.3s;
      }
      
      .pro-section:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(99, 102, 241, 0.2);
        border-color: rgba(99, 102, 241, 0.3);
      }
      
      .booking-widget {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
        border: 2px solid rgba(99, 102, 241, 0.3);
        border-radius: var(--radius-lg);
        padding: var(--spacing-xl);
        text-align: center;
        margin: var(--spacing-xl) 0;
      }
      
      .gallery-filters {
        display: flex;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-lg);
        flex-wrap: wrap;
      }
      
      .gallery-filter {
        padding: var(--spacing-sm) var(--spacing-lg);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);
        color: var(--color-muted);
        cursor: pointer;
        transition: all 0.3s;
        font-weight: 600;
      }
      
      .gallery-filter:hover,
      .gallery-filter.active {
        background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
        color: white;
        border-color: transparent;
        transform: translateY(-2px);
      }
      
      .gallery-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: var(--spacing-md);
      }
      
      .gallery-item {
        border-radius: var(--radius);
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .gallery-item:hover {
        transform: scale(1.05);
        box-shadow: 0 20px 60px rgba(99, 102, 241, 0.4);
      }
      
      .gallery-item img {
        width: 100%;
        height: 250px;
        object-fit: cover;
        display: block;
      }
    </style>
  </head>
  <body>
    <div id="loading" style="display: flex; align-items: center; justify-content: center; min-height: 100vh; flex-direction: column; gap: 20px;">
      <div style="width: 60px; height: 60px; border: 4px solid rgba(99, 102, 241, 0.2); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
      <p style="color: var(--color-muted); font-size: 1.1rem; font-weight: 600;">Loading your experience...</p>
    </div>
    <div id="main-content" style="display: none;"></div>
    
    <script>
      console.log('Fresh script starting...');
      
      async function loadSite() {
        try {
          console.log('Fetching site data...');
          const response = await fetch('./site.json');
          
          if (!response.ok) {
            throw new Error(\`HTTP \${response.status}\`);
          }
          
          const data = await response.json();
          console.log('Data loaded:', data);
          
          // Hide loading, show content
          document.getElementById('loading').style.display = 'none';
          const mainContent = document.getElementById('main-content');
          mainContent.style.display = 'block';
          
          // Render the site
          const isPro = data.features?.tabbedMenu || data.features?.bookingWidget || data.menu?.sections;
          
          mainContent.innerHTML = \`
            <!-- Header -->
            <header>
              <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
                <h1>\${data.brand?.name || 'Business Name'}</h1>
                <nav style="display: flex; gap: 8px;">
                  \${data.nav?.map(item => \`<a href="\${item.href}">\${item.label}</a>\`).join('') || ''}
                </nav>
              </div>
            </header>
            
            <div class="container">
              <!-- Hero Section -->
              <section class="hero">
                <div class="hero-content">
                  \${data.hero?.eyebrow ? \`<span class="eyebrow">\${data.hero.eyebrow}</span>\` : ''}
                  <h1>\${data.hero?.title || 'Welcome to ' + (data.brand?.name || 'Our Business')}</h1>
                  <p>\${data.hero?.subtitle || 'Discover amazing products and services'}</p>
                  <div style="display: flex; gap: var(--spacing-md); flex-wrap: wrap;">
                    \${data.hero?.cta?.map(btn => \`
                      <a href="\${btn.href}" class="btn \${btn.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}">
                        \${btn.label}
                      </a>
                    \`).join('') || ''}
                  </div>
                </div>
                \${data.hero?.image ? \`
                  <div class="hero-image-wrapper">
                    <img src="\${data.hero.image}" alt="\${data.hero.imageAlt || data.brand?.name || ''}" />
                  </div>
                \` : ''}
              </section>
              
              <!-- Booking Widget (Pro) -->
              \${data.features?.bookingWidget?.enabled ? \`
                <section id="booking" class="booking-widget">
                  <h2 style="margin-bottom: var(--spacing-md);">📅 Reserve Your Table</h2>
                  <p class="muted" style="margin-bottom: var(--spacing-lg);">Book your reservation online or call us</p>
                  <a href="\${data.features.bookingWidget.url}" target="_blank" class="btn btn-primary">
                    Book Now
                  </a>
                </section>
              \` : ''}
              
              <!-- Tabbed Menu Section (Pro) -->
              \${data.menu?.sections?.length ? \`
                <section id="menu" style="margin-top: var(--spacing-2xl);">
                  <div class="section-header">
                    <h2>\${data.menu.title || 'Our Menu'}</h2>
                    <p>\${data.menu.subtitle || 'Explore our offerings'}</p>
                  </div>
                  
                  <div class="pro-tabs">
                    \${data.menu.sections.map((section, index) => \`
                      <button class="pro-tab \${index === 0 ? 'active' : ''}" onclick="switchMenuTab('\${section.id}')">
                        \${section.name}
                      </button>
                    \`).join('')}
                  </div>
                  
                  \${data.menu.sections.map((section, index) => \`
                    <div class="pro-tab-content \${index === 0 ? 'active' : ''}" id="tab-\${section.id}">
                      \${section.description ? \`<p class="muted text-center" style="margin-bottom: var(--spacing-xl);">\${section.description}</p>\` : ''}
                      <div class="grid">
                        \${section.items.map(item => \`
                          <div class="card product-card">
                            \${item.image ? \`<img src="\${item.image}" alt="\${item.imageAlt || item.name}" />\` : ''}
                            <h3>\${item.name}</h3>
                            \${item.price ? \`<div class="price-tag">$\${item.price}</div>\` : ''}
                            <p class="muted">\${item.description || ''}</p>
                            \${item.dietary?.length ? \`<div style="margin-top: var(--spacing-sm);"><small class="muted">\${item.dietary.join(' • ')}</small></div>\` : ''}
                            \${item.chefRecommended ? \`<div style="margin-top: var(--spacing-xs);"><span style="font-size: 0.85rem;">⭐ Chef Recommended</span></div>\` : ''}
                          </div>
                        \`).join('')}
                      </div>
                    </div>
                  \`).join('')}
                </section>
              \` : ''}
              
              <!-- Chef's Specials (Pro) -->
              \${data.chefSpecials?.items?.length ? \`
                <section class="pro-section" style="margin-top: var(--spacing-2xl);">
                  <div class="section-header">
                    <h2>\${data.chefSpecials.title || "Chef's Specials"}</h2>
                    \${data.chefSpecials.subtitle ? \`<p>\${data.chefSpecials.subtitle}</p>\` : ''}
                  </div>
                  <div class="grid">
                    \${data.chefSpecials.items.map(item => \`
                      <div class="card">
                        \${item.image ? \`<img src="\${item.image}" alt="\${item.imageAlt || item.name}" style="border-radius: var(--radius); margin-bottom: var(--spacing-md);" />\` : ''}
                        <h3>\${item.name}</h3>
                        \${item.price ? \`<div class="price-tag">$\${item.price}</div>\` : ''}
                        <p class="muted">\${item.description || ''}</p>
                        \${item.availability ? \`<div style="margin-top: var(--spacing-sm);"><span style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 4px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 600;">\${item.availability}</span></div>\` : ''}
                      </div>
                    \`).join('')}
                  </div>
                </section>
              \` : ''}
              
              <!-- Private Events/Dining (Pro) -->
              \${data.privateEvents?.rooms?.length ? \`
                <section id="private" class="pro-section" style="margin-top: var(--spacing-2xl);">
                  <div class="section-header">
                    <h2>\${data.privateEvents.title || 'Private Events'}</h2>
                    \${data.privateEvents.subtitle ? \`<p>\${data.privateEvents.subtitle}</p>\` : ''}
                  </div>
                  <div class="grid">
                    \${data.privateEvents.rooms.map((room, index) => \`
                      <div class="card" style="cursor: pointer;" onclick="openPrivateEventModal(\${index})">
                        \${room.image ? \`<img src="\${room.image}" alt="\${room.imageAlt || room.name}" style="border-radius: var(--radius); margin-bottom: var(--spacing-md);" />\` : ''}
                        <h3>\${room.name}</h3>
                        <p class="muted"><strong>\${room.capacity}</strong></p>
                        <p class="muted">\${room.description}</p>
                        <button class="btn btn-secondary" style="margin-top: var(--spacing-md); width: 100%;">Learn More</button>
                      </div>
                    \`).join('')}
                  </div>
                </section>
                
                <!-- Private Event Modals -->
                \${data.privateEvents.rooms.map((room, index) => \`
                  <div class="pro-modal" id="private-modal-\${index}">
                    <div class="pro-modal-content">
                      <button class="pro-modal-close" onclick="closePrivateEventModal(\${index})">×</button>
                      <h2 style="margin-bottom: var(--spacing-md);">\${room.name}</h2>
                      \${room.image ? \`<img src="\${room.image}" alt="\${room.imageAlt || room.name}" style="width: 100%; border-radius: var(--radius); margin-bottom: var(--spacing-lg);" />\` : ''}
                      <p><strong>Capacity:</strong> \${room.capacity}</p>
                      <p class="muted" style="margin: var(--spacing-md) 0;">\${room.description}</p>
                      <h3 style="margin: var(--spacing-lg) 0 var(--spacing-md) 0;">Features</h3>
                      <ul style="list-style: none; padding: 0;">
                        \${room.features?.map(feature => \`<li style="padding: var(--spacing-sm) 0; border-bottom: 1px solid rgba(255,255,255,0.1);">✓ \${feature}</li>\`).join('')}
                      </ul>
                      <a href="#contact" class="btn btn-primary" style="width: 100%; margin-top: var(--spacing-xl);" onclick="closePrivateEventModal(\${index})">
                        Contact Us to Book
                      </a>
                    </div>
                  </div>
                \`).join('')}
              \` : ''}
              
              <!-- Gallery with Filters (Pro) -->
              \${data.gallery?.categories?.length ? \`
                <section id="gallery" style="margin-top: var(--spacing-2xl);">
                  <div class="section-header">
                    <h2>\${data.gallery.title || 'Gallery'}</h2>
                  </div>
                  
                  <div class="gallery-filters">
                    <button class="gallery-filter active" onclick="filterGallery('all')">All</button>
                    \${data.gallery.categories.map(cat => \`
                      <button class="gallery-filter" onclick="filterGallery('\${cat.name.toLowerCase()}')">\${cat.name}</button>
                    \`).join('')}
                  </div>
                  
                  <div class="gallery-grid">
                    \${data.gallery.categories.flatMap(cat => 
                      cat.images.map(img => \`
                        <div class="gallery-item" data-category="\${cat.name.toLowerCase()}">
                          <img src="\${img.url}" alt="\${img.alt}" />
                        </div>
                      \`)
                    ).join('')}
                  </div>
                </section>
              \` : ''}
              
              <!-- Team Section (Pro) -->
              \${data.team?.members?.length ? \`
                <section style="margin-top: var(--spacing-2xl);">
                  <div class="section-header">
                    <h2>\${data.team.title || 'Our Team'}</h2>
                    \${data.team.subtitle ? \`<p>\${data.team.subtitle}</p>\` : ''}
                  </div>
                  <div class="grid">
                    \${data.team.members.map(member => \`
                      <div class="card pro-section">
                        \${member.image ? \`<img src="\${member.image}" alt="\${member.imageAlt || member.name}" style="width: 100%; height: 300px; object-fit: cover; border-radius: var(--radius); margin-bottom: var(--spacing-md);" />\` : ''}
                        <h3>\${member.name}</h3>
                        <p style="color: var(--color-primary-light); font-weight: 600; margin-bottom: var(--spacing-md);">\${member.title}</p>
                        <p class="muted">\${member.bio}</p>
                        \${member.credentials?.length ? \`
                          <div style="margin-top: var(--spacing-md);">
                            \${member.credentials.map(cred => \`<span style="display: inline-block; background: rgba(99, 102, 241, 0.2); color: var(--color-primary-light); padding: 4px 12px; border-radius: 8px; font-size: 0.85rem; margin: 4px;">\${cred}</span>\`).join('')}
                          </div>
                        \` : ''}
                      </div>
                    \`).join('')}
                  </div>
                </section>
              \` : ''}
              
              <!-- Stats Section (Pro) -->
              \${data.stats?.items?.length ? \`
                <section class="pro-section" style="margin-top: var(--spacing-2xl);">
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-xl); text-align: center;">
                    \${data.stats.items.map(stat => \`
                      <div>
                        <div style="font-size: 3rem; font-weight: 900; background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: var(--spacing-sm);">\${stat.number}</div>
                        <div class="muted" style="font-weight: 600;">\${stat.label}</div>
                      </div>
                    \`).join('')}
                  </div>
                </section>
              \` : ''}
              
              <!-- Services Section (Starter) -->
              \${data.services?.items?.length && !isPro ? \`
                <section>
                  <div class="section-header">
                    <h2>\${data.services.title || 'Our Services'}</h2>
                    \${data.services.subtitle ? \`<p>\${data.services.subtitle}</p>\` : ''}
                  </div>
                  <div class="grid">
                    \${data.services.items.map(item => \`
                      <div class="card product-card">
                        \${item.image ? \`<img src="\${item.image}" alt="\${item.title}" />\` : ''}
                        <h3>\${item.title}</h3>
                        <p class="muted">\${item.description || ''}</p>
                        \${item.price ? \`<div class="price-tag">$\${item.price}</div>\` : ''}
                      </div>
                    \`).join('')}
                  </div>
                </section>
              \` : ''}
              
              <!-- Products Section (Starter) -->
              \${data.products?.length && !isPro ? \`
                <section>
                  <div class="section-header">
                    <h2>\${data.productsTitle || 'Our Menu'}</h2>
                    <p>\${data.productsSubtitle || 'Discover our carefully curated selection'}</p>
                  </div>
                  <div class="grid">
                    \${data.products.map(item => \`
                      <div class="card product-card">
                        \${item.image ? \`<img src="\${item.image}" alt="\${item.imageAlt || item.name}" />\` : ''}
                        <h3>\${item.name}</h3>
                        \${item.price ? \`<div class="price-tag">$\${item.price}</div>\` : ''}
                        <p class="muted">\${item.description || ''}</p>
                      </div>
                    \`).join('')}
                  </div>
                </section>
              \` : ''}
              
              <!-- Testimonials -->
              \${data.testimonials?.items?.length ? \`
                <section style="margin-top: var(--spacing-2xl);">
                  <div class="section-header">
                    <h2>\${data.testimonials.title || 'Testimonials'}</h2>
                    \${data.testimonials.subtitle ? \`<p>\${data.testimonials.subtitle}</p>\` : ''}
                  </div>
                  <div class="grid">
                    \${data.testimonials.items.map(item => \`
                      <div class="card">
                        <p style="font-size: 1.1rem; line-height: 1.8; margin-bottom: var(--spacing-md);">"\${item.text}"</p>
                        <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                          \${item.image ? \`<img src="\${item.image}" alt="\${item.imageAlt || item.author}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" />\` : ''}
                          <div>
                            <div style="font-weight: 700;">\${item.author}</div>
                            <div class="muted" style="font-size: 0.9rem;">\${item.location || ''}</div>
                          </div>
                        </div>
                        \${item.rating ? \`<div style="color: #fbbf24; margin-top: var(--spacing-sm);">${'★'.repeat(item.rating)}</div>\` : ''}
                      </div>
                    \`).join('')}
                  </div>
                </section>
              \` : ''}
              
              <!-- Contact Section -->
              \${data.contact ? \`
                <section id="contact" class="card glass" style="margin-top: var(--spacing-2xl);">
                  <div class="section-header">
                    <h2>\${data.contact.title || 'Get In Touch'}</h2>
                    \${data.contact.subtitle ? \`<p>\${data.contact.subtitle}</p>\` : ''}
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-lg); text-align: center;">
                    \${data.contact.phone ? \`
                      <div>
                        <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">📞</div>
                        <strong style="display: block; margin-bottom: var(--spacing-xs);">Phone</strong>
                        <a href="tel:\${data.contact.phone}" style="color: var(--color-primary-light); text-decoration: none; font-weight: 600;">\${data.contact.phone}</a>
                      </div>
                    \` : ''}
                    \${data.contact.email ? \`
                      <div>
                        <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">✉️</div>
                        <strong style="display: block; margin-bottom: var(--spacing-xs);">Email</strong>
                        <a href="mailto:\${data.contact.email}" style="color: var(--color-primary-light); text-decoration: none; font-weight: 600;">\${data.contact.email}</a>
                      </div>
                    \` : ''}
                    \${data.contact.address ? \`
                      <div>
                        <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">📍</div>
                        <strong style="display: block; margin-bottom: var(--spacing-xs);">Location</strong>
                        <span style="color: var(--color-muted);">\${data.contact.address}</span>
                      </div>
                    \` : ''}
                  </div>
                  \${data.contact.hours?.items?.length ? \`
                    <div style="margin-top: var(--spacing-xl); text-align: center;">
                      <h3 style="margin-bottom: var(--spacing-md);">\${data.contact.hours.title || 'Hours'}</h3>
                      \${data.contact.hours.items.map(hour => \`<p class="muted">\${hour}</p>\`).join('')}
                      \${data.contact.hours.note ? \`<p style="margin-top: var(--spacing-md); font-style: italic; color: var(--color-primary-light);">\${data.contact.hours.note}</p>\` : ''}
                    </div>
                  \` : ''}
                </section>
              \` : ''}
            </div>
            
            <!-- Footer -->
            <footer>
              <div class="container">
                <p class="muted">\${data.footer?.text || '© ' + new Date().getFullYear() + ' ' + (data.brand?.name || 'Business Name') + '. All rights reserved.'}</p>
                \${data.footer?.awards?.length ? \`
                  <div style="margin-top: var(--spacing-md); display: flex; flex-wrap: wrap; gap: var(--spacing-md); justify-content: center;">
                    \${data.footer.awards.map(award => \`<span style="font-size: 0.9rem; color: var(--color-primary-light);">🏆 \${award}</span>\`).join('')}
                  </div>
                \` : ''}
              </div>
            </footer>
          \`;
          
          // Pro Template JavaScript Functions
          window.switchMenuTab = function(tabId) {
            document.querySelectorAll('.pro-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.pro-tab-content').forEach(content => content.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById('tab-' + tabId).classList.add('active');
          };
          
          window.openPrivateEventModal = function(index) {
            document.getElementById('private-modal-' + index).classList.add('active');
          };
          
          window.closePrivateEventModal = function(index) {
            document.getElementById('private-modal-' + index).classList.remove('active');
          };
          
          window.filterGallery = function(category) {
            document.querySelectorAll('.gallery-filter').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            document.querySelectorAll('.gallery-item').forEach(item => {
              if (category === 'all' || item.dataset.category === category) {
                item.style.display = 'block';
              } else {
                item.style.display = 'none';
              }
            });
          };
          
          
        } catch (error) {
          console.error('Error:', error);
          document.getElementById('loading').innerHTML = \`
            <div style="padding: 60px; text-align: center; max-width: 500px;">
              <div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>
              <h2 style="background: linear-gradient(135deg, #ef4444, #dc2626); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 2rem; margin-bottom: 16px;">Unable to Load Site</h2>
              <p style="color: var(--color-muted); line-height: 1.6;">\${error.message}</p>
              <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 24px;">Try Again</button>
            </div>
          \`;
        }
      }
      
      // Start loading
      loadSite();
    </script>
  </body>
</html>`;
    await fs.writeFile(siteIndexFile, siteHtml);
    
    // Update published metadata with subdomain
    if (siteData.published) {
      siteData.published.subdomain = subdomain;
      // Re-save site.json with subdomain
      await fs.writeFile(siteConfigFile, JSON.stringify(siteData, null, 2));
    }
    
    // Delete draft after successful publish
    await fs.unlink(draftFile);
    
    const siteUrl = `http://localhost:${PORT}/sites/${subdomain}/`;
    const siteName = siteData.brand?.name || 'Your Business';
    
    // Send site published email
    await sendEmail(email, EmailTypes.SITE_PUBLISHED, { 
      email,
      siteName: siteName,
      siteUrl: siteUrl
    });
    
    // Notify admin of new published site
    try {
      await sendAdminNotification(EmailTypes.ADMIN_SITE_PUBLISHED, {
        siteName: siteName,
        siteTemplate: draft.templateId,
        userName: email.split('@')[0],
        userEmail: email,
        siteId: subdomain,
        plan: plan
      });
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
    }
    
    res.json({
      success: true,
      subdomain: subdomain,
      url: siteUrl,
      plan: plan,
      publishedAt: new Date().toISOString(),
      businessName: siteName,
      whatsIncluded: getPlanFeatures(plan)
    });
    
    function getPlanFeatures(plan) {
      const features = {
        starter: ['Your unique subdomain', 'Mobile-responsive design', 'Contact form', 'Social media links', 'Basic support'],
        business: ['Everything in Starter', 'Custom domain support', 'Unlimited pages', 'SEO optimization', 'Analytics', 'Priority support'],
        pro: ['Everything in Business', 'All premium templates', 'Advanced customization', 'Custom branding', 'API access', '24/7 support']
      };
      return features[plan] || features.starter;
    }
    
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

// Get published site data for editing (authenticated)
app.get('/api/sites/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    // Load site data
    const sitePath = path.join(publicDir, 'sites', subdomain, 'site.json');
    let siteData;
    
    try {
      siteData = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    // Verify ownership
    if (siteData.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized to edit this site' });
    }
    
    res.json({
      success: true,
      site: siteData,
      subdomain: subdomain
    });
  } catch (error) {
    console.error('Load site error:', error);
    res.status(500).json({ error: 'Failed to load site' });
  }
});

// Update published site (authenticated)
app.put('/api/sites/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    const updatedData = req.body;
    
    // Load existing site
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const sitePath = path.join(siteDir, 'site.json');
    let existingSite;
    
    try {
      existingSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    // Verify ownership
    if (existingSite.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized to edit this site' });
    }
    
    // Create backup before updating
    const backupDir = path.join(siteDir, 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `site.backup.${Date.now()}.json`);
    await fs.writeFile(backupPath, JSON.stringify(existingSite, null, 2));
    
    // Update site data (preserve published metadata)
    const updatedSite = {
      ...updatedData,
      published: {
        ...existingSite.published,
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Save updated site
    await fs.writeFile(sitePath, JSON.stringify(updatedSite, null, 2));
    
    // Send notification email to site owner
    try {
      await sendEmail(
        userEmail,
        EmailTypes.SITE_UPDATED,
        {
          businessName: updatedSite.brand?.name || 'Your Business',
          siteUrl: `${process.env.SITE_URL || 'http://localhost:3000'}/sites/${subdomain}/`,
          updateTime: new Date().toLocaleString()
        }
      );
    } catch (emailError) {
      console.error('Failed to send update email:', emailError);
      // Don't fail the update if email fails
    }
    
    res.json({ 
      success: true, 
      message: 'Site updated successfully',
      subdomain: subdomain,
      updatedAt: updatedSite.published.lastUpdated
    });
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({ error: 'Failed to update site' });
  }
});

// PATCH endpoint for single field updates (seamless auto-save)
app.patch('/api/sites/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    const { changes } = req.body; // Array of {field, value} objects
    
    // Load existing site
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const sitePath = path.join(siteDir, 'site.json');
    let existingSite;
    
    try {
      existingSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    // Verify ownership
    if (existingSite.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized to edit this site' });
    }
    
    // Create mini-checkpoint (for undo/redo)
    const checkpointDir = path.join(siteDir, 'checkpoints');
    await fs.mkdir(checkpointDir, { recursive: true });
    const checkpointPath = path.join(checkpointDir, `checkpoint.${Date.now()}.json`);
    await fs.writeFile(checkpointPath, JSON.stringify({
      timestamp: Date.now(),
      data: existingSite,
      changes: changes
    }, null, 2));
    
    // Apply changes using dot notation
    const updatedSite = { ...existingSite };
    
    changes.forEach(({ field, value }) => {
      const keys = field.split('.');
      let obj = updatedSite;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      
      obj[keys[keys.length - 1]] = value;
    });
    
    // Update timestamp
    updatedSite.published = {
      ...updatedSite.published,
      lastUpdated: new Date().toISOString()
    };
    
    // Save updated site
    await fs.writeFile(sitePath, JSON.stringify(updatedSite, null, 2));
    
    // Clean up old checkpoints (keep last 50)
    try {
      const checkpoints = await fs.readdir(checkpointDir);
      if (checkpoints.length > 50) {
        const sorted = checkpoints
          .map(f => ({ name: f, time: parseInt(f.split('.')[1]) }))
          .sort((a, b) => b.time - a.time);
        
        for (let i = 50; i < sorted.length; i++) {
          await fs.unlink(path.join(checkpointDir, sorted[i].name));
        }
      }
    } catch (cleanupError) {
      console.error('Checkpoint cleanup error:', cleanupError);
    }
    
    res.json({ 
      success: true, 
      message: 'Changes saved',
      checkpointId: Date.now()
    });
  } catch (error) {
    console.error('Patch site error:', error);
    res.status(500).json({ error: 'Failed to save changes' });
  }
});

// Get version history
app.get('/api/sites/:subdomain/history', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    // Load site to verify ownership
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const sitePath = path.join(siteDir, 'site.json');
    let existingSite;
    
    try {
      existingSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (existingSite.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Load all backups
    const backupDir = path.join(siteDir, 'backups');
    const checkpointDir = path.join(siteDir, 'checkpoints');
    
    let history = [];
    
    // Add major backups
    try {
      const backups = await fs.readdir(backupDir);
      for (const backup of backups) {
        if (backup.startsWith('site.backup.')) {
          const timestamp = parseInt(backup.split('.')[2]);
          history.push({
            id: `backup-${timestamp}`,
            timestamp: timestamp,
            type: 'backup',
            description: 'Manual save point',
            date: new Date(timestamp).toLocaleString()
          });
        }
      }
    } catch (e) {
      // No backups yet
    }
    
    // Add checkpoints (last 20 only)
    try {
      const checkpoints = await fs.readdir(checkpointDir);
      const sorted = checkpoints
        .filter(f => f.startsWith('checkpoint.'))
        .map(f => parseInt(f.split('.')[1]))
        .sort((a, b) => b - a)
        .slice(0, 20);
      
      for (const timestamp of sorted) {
        const checkpointPath = path.join(checkpointDir, `checkpoint.${timestamp}.json`);
        try {
          const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf-8'));
          const changeDesc = checkpoint.changes?.map(c => c.field).join(', ') || 'Multiple changes';
          
          history.push({
            id: `checkpoint-${timestamp}`,
            timestamp: timestamp,
            type: 'checkpoint',
            description: `Updated: ${changeDesc}`,
            date: new Date(timestamp).toLocaleString()
          });
        } catch (e) {
          // Skip corrupted checkpoint
        }
      }
    } catch (e) {
      // No checkpoints yet
    }
    
    // Sort by timestamp descending
    history.sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({ 
      success: true,
      history: history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// Restore from checkpoint or backup
app.post('/api/sites/:subdomain/restore/:versionId', requireAuth, async (req, res) => {
  try {
    const { subdomain, versionId } = req.params;
    const userEmail = req.user.email;
    
    // Load current site to verify ownership
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const sitePath = path.join(siteDir, 'site.json');
    let currentSite;
    
    try {
      currentSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (currentSite.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Create backup of current state before restoring
    const backupDir = path.join(siteDir, 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    const beforeRestorePath = path.join(backupDir, `site.before-restore.${Date.now()}.json`);
    await fs.writeFile(beforeRestorePath, JSON.stringify(currentSite, null, 2));
    
    // Load the version to restore
    let restoredData;
    
    if (versionId.startsWith('backup-')) {
      const timestamp = versionId.replace('backup-', '');
      const backupPath = path.join(backupDir, `site.backup.${timestamp}.json`);
      restoredData = JSON.parse(await fs.readFile(backupPath, 'utf-8'));
    } else if (versionId.startsWith('checkpoint-')) {
      const timestamp = versionId.replace('checkpoint-', '');
      const checkpointPath = path.join(siteDir, 'checkpoints', `checkpoint.${timestamp}.json`);
      const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf-8'));
      restoredData = checkpoint.data;
    } else {
      return res.status(400).json({ error: 'Invalid version ID' });
    }
    
    // Update timestamp
    restoredData.published = {
      ...restoredData.published,
      lastUpdated: new Date().toISOString(),
      restoredFrom: versionId,
      restoredAt: new Date().toISOString()
    };
    
    // Save restored version
    await fs.writeFile(sitePath, JSON.stringify(restoredData, null, 2));
    
    res.json({ 
      success: true,
      message: 'Version restored successfully',
      restoredFrom: versionId
    });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

// Get current edit session info
app.get('/api/sites/:subdomain/session', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    // Load site to verify ownership
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const sitePath = path.join(siteDir, 'site.json');
    let existingSite;
    
    try {
      existingSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (existingSite.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Get latest checkpoint info
    const checkpointDir = path.join(siteDir, 'checkpoints');
    let lastCheckpoint = null;
    
    try {
      const checkpoints = await fs.readdir(checkpointDir);
      if (checkpoints.length > 0) {
        const latest = checkpoints
          .filter(f => f.startsWith('checkpoint.'))
          .map(f => parseInt(f.split('.')[1]))
          .sort((a, b) => b - a)[0];
        
        lastCheckpoint = {
          timestamp: latest,
          date: new Date(latest).toLocaleString()
        };
      }
    } catch (e) {
      // No checkpoints
    }
    
    res.json({
      success: true,
      session: {
        subdomain: subdomain,
        lastCheckpoint: lastCheckpoint,
        lastUpdated: existingSite.published?.lastUpdated,
        canEdit: true
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session info' });
  }
});

// Delete published site (authenticated)
app.delete('/api/sites/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    // Load existing site
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const sitePath = path.join(siteDir, 'site.json');
    let existingSite;
    
    try {
      existingSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    // Verify ownership
    if (existingSite.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized to delete this site' });
    }
    
    // Delete site directory
    await fs.rm(siteDir, { recursive: true, force: true });
    
    res.json({ 
      success: true, 
      message: 'Site deleted successfully'
    });
  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({ error: 'Failed to delete site' });
  }
});

// Helper function to generate subdomain from business name
function generateSubdomain(businessName) {
  // Convert to lowercase, remove special chars, replace spaces with hyphens
  let subdomain = businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30); // Limit length
  
  // Remove trailing hyphens
  subdomain = subdomain.replace(/-+$/g, '');
  
  // If empty, use default
  if (!subdomain) subdomain = 'mybusiness';
  
  // Add timestamp to make it unique
  subdomain += `-${Date.now().toString(36)}`;
  
  return subdomain;
}

// Function to generate site HTML from site data
function generateSiteHTML(siteData) {
  // Detect if this is a Pro template
  const isPro = siteData.features?.tabbedMenu || siteData.features?.bookingWidget || siteData.menu?.sections;
  
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${siteData.brand?.name || 'Loading...'}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      :root {
        --color-bg: #0a0a0f;
        --color-surface: rgba(255, 255, 255, 0.03);
        --color-card: rgba(255, 255, 255, 0.06);
        --color-text: #f8fafc;
        --color-muted: #94a3b8;
        --color-primary: #6366f1;
        --color-primary-light: #818cf8;
        --color-primary-dark: #4f46e5;
        --color-accent: #8b5cf6;
        --color-accent-light: #a78bfa;
        --color-success: #10b981;
        --color-warning: #f59e0b;
        --radius: 20px;
        --radius-lg: 28px;
        --shadow-glow: 0 0 40px rgba(99, 102, 241, 0.3);
        --shadow-soft: 0 20px 60px rgba(0, 0, 0, 0.5);
        --shadow-subtle: 0 8px 32px rgba(0, 0, 0, 0.3);
        --spacing-xs: 6px;
        --spacing-sm: 12px;
        --spacing-md: 20px;
        --spacing-lg: 32px;
        --spacing-xl: 48px;
        --spacing-2xl: 72px;
      }
      
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
      }
      
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes gradientShift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      
      body { 
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0; 
        padding: 0; 
        background: linear-gradient(135deg, #0a0a0f 0%, #1a0f2e 50%, #0a0a0f 100%);
        background-size: 200% 200%;
        animation: gradientShift 15s ease infinite;
        color: var(--color-text);
        line-height: 1.6;
        font-size: 16px;
        position: relative;
        overflow-x: hidden;
      }
    </style>
    <script>
      // This will be populated with actual site data
      window.siteData = ${JSON.stringify(siteData)};
      window.isPro = ${isPro};
    </script>
  </head>
  <body>
    <div id="root">Loading...</div>
    <script>
      // Simple client-side rendering for preview
      function renderSite() {
        const data = window.siteData;
        const root = document.getElementById('root');
        
        root.innerHTML = \`
          <div style="min-height: 100vh; padding: 20px;">
            <h1 style="text-align: center; margin-bottom: 20px;">\${data.brand?.name || 'Business'}</h1>
            <p style="text-align: center; color: var(--color-muted);">Pro Template Preview - Full rendering will be available when published</p>
          </div>
        \`;
      }
      
      renderSite();
    </script>
  </body>
</html>`;
}

// Get all templates (used by React app)
app.get('/api/templates', async (req, res) => {
  try {
    const indexPath = path.join(templatesDir, 'index.json');
    const indexData = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    
    // Return the templates array
    res.json(index.templates || []);
  } catch (error) {
    console.error('Failed to load templates index:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

// Preview endpoint for templates (used in setup.html preview)
app.get('/api/preview-template/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const templatePath = path.join(__dirname, 'public', 'data', 'templates', `${templateId}.json`);
    
    // Read template data
    const templateJson = await fs.readFile(templatePath, 'utf-8');
    const data = JSON.parse(templateJson);
    
    // Check if this is a Pro template
    const isPro = data.features?.tabbedMenu || data.features?.bookingWidget || data.menu?.sections;
    
    if (!isPro) {
      // For non-Pro templates, show a simple message
      return res.send(generateSiteHTML(data));
    }
    
    // For Pro templates, we need to create a full site with index.html
    // We'll copy the exact generation logic from the publish endpoint
    const tempSubdomain = `preview-${templateId.replace(/-pro$/, '')}-${Date.now().toString(36)}`;
    const sitesDir = path.join(__dirname, 'public', 'sites', tempSubdomain);
    const siteConfigFile = path.join(sitesDir, 'site.json');
    const siteIndexFile = path.join(sitesDir, 'index.html');
    
    // Create temp directory
    await fs.mkdir(sitesDir, { recursive: true });
    
    // Save site.json
    await fs.writeFile(siteConfigFile, JSON.stringify(data, null, 2));
    
    // Here we need to generate the FULL index.html using the same code as publish
    // For now, let's redirect to an existing demo site if available, otherwise temp site
    if (templateId === 'restaurant-pro') {
      return res.redirect('/sites/grandtable-demo/');
    }
    
    // For other Pro templates, generate a basic index.html that loads site.json
    const basicHtml = generateSiteHTML(data);
    await fs.writeFile(siteIndexFile, basicHtml);
    
    // Redirect to the temp site
    res.redirect(`/sites/${tempSubdomain}/`);
    
    // Schedule cleanup after 2 minutes
    setTimeout(async () => {
      try {
        await fs.rm(sitesDir, { recursive: true, force: true });
        console.log(`Cleaned up preview site: ${tempSubdomain}`);
      } catch (err) {
        console.error('Failed to cleanup preview site:', err);
      }
    }, 120000); // 120 seconds
    
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Preview Error</title>
        <style>
          body {
            font-family: system-ui;
            padding: 40px;
            text-align: center;
            background: #f8fafc;
          }
          .error {
            background: white;
            border: 2px solid #ef4444;
            border-radius: 12px;
            padding: 30px;
            max-width: 500px;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>Preview Error</h2>
          <p>Could not load template preview.</p>
          <p style="font-size: 0.9rem; color: #6b7280;">${error.message}</p>
        </div>
      </body>
      </html>
    `);
  }
});

// Route handler for /sites/{subdomain}/ paths
app.get('/sites/:subdomain/:filename', async (req, res, next) => {
  const { subdomain, filename } = req.params;
  const siteDir = path.join(publicDir, 'sites', subdomain);
  const fullPath = path.join(siteDir, filename);
  
  try {
    await fs.access(fullPath);
    res.sendFile(fullPath);
  } catch (err) {
    next();
  }
});

// Route handler for /sites/{subdomain}/ (root of site)
app.get('/sites/:subdomain/', async (req, res, next) => {
  const { subdomain } = req.params;
  const siteDir = path.join(publicDir, 'sites', subdomain);
  const siteIndexFile = path.join(siteDir, 'index.html');
  
  try {
    await fs.access(siteIndexFile);
    res.sendFile(siteIndexFile);
  } catch (err) {
    next();
  }
});

// Subdomain Routing Middleware
app.use((req, res, next) => {
  const hostname = req.get('host') || '';
  const subdomain = hostname.split('.')[0];
  
  // Skip for localhost or if it's a known route/api
  if (hostname.includes('localhost') || req.path.startsWith('/api/') || req.path.startsWith('/data/') || req.path.includes('.')) {
    return next();
  }
  
  // Check if subdomain exists in sites directory
  const sitesDir = path.join(publicDir, 'sites', subdomain);
  const siteIndexFile = path.join(sitesDir, 'index.html');
  
  // Check if site exists
  fs.access(siteIndexFile)
    .then(() => {
      // Site exists, serve from subdomain directory
      const siteConfigFile = path.join(sitesDir, 'site.json');
      
      fs.access(siteConfigFile)
        .then(() => {
          // Serve the site's index.html
          req.url = `/sites/${subdomain}/index.html`;
          next();
        })
        .catch(() => {
          // If no site.json, serve index.html directly
          req.url = `/sites/${subdomain}/index.html`;
          next();
        });
    })
    .catch(() => {
      // Not a subdomain site, continue with normal routing
      next();
    });
});

// Contact Form Submission Endpoint
app.post('/api/contact-form', async (req, res) => {
  try {
    const { subdomain, name, email, phone, message, type, ...otherFields } = req.body;
    
    if (!subdomain || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields: subdomain, email, message' });
    }
    
    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    // Validate phone if provided
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const submissionsFile = path.join(siteDir, 'submissions.json');
    
    // Check if site exists
    try {
      await fs.access(siteDir);
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    // Load site data to get owner email
    const siteJsonPath = path.join(siteDir, 'site.json');
    let siteData;
    try {
      siteData = JSON.parse(await fs.readFile(siteJsonPath, 'utf-8'));
    } catch (error) {
      console.error('Error loading site data:', error);
      return res.status(500).json({ error: 'Failed to load site data' });
    }
    
    const siteOwnerEmail = siteData.published?.email || siteData.contact?.email;
    const businessName = siteData.brand?.name || 'Your Business';
    
    // Create submission object
    const submission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type || 'contact',
      submittedAt: new Date().toISOString(),
      name: sanitizeString(name || '', 200),
      email: email,
      phone: phone || '',
      message: sanitizeString(message, 2000),
      status: 'unread',
      ...otherFields // Include any additional fields (for quote forms, etc.)
    };
    
    // Load existing submissions
    let submissions = [];
    try {
      const existingData = await fs.readFile(submissionsFile, 'utf-8');
      submissions = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist yet, start with empty array
      submissions = [];
    }
    
    // Add new submission
    submissions.unshift(submission); // Add to beginning
    
    // Keep only last 1000 submissions per site
    if (submissions.length > 1000) {
      submissions = submissions.slice(0, 1000);
    }
    
    // Save submissions
    await fs.writeFile(submissionsFile, JSON.stringify(submissions, null, 2));
    
    // Send notification email to site owner
    if (siteOwnerEmail) {
      try {
        const siteUrl = `${process.env.SITE_URL || 'http://localhost:3000'}/sites/${subdomain}/`;
        
        await sendEmail(
          siteOwnerEmail,
          'contactFormSubmission', // We'll add this template
          {
            businessName,
            submitterName: submission.name || 'Someone',
            submitterEmail: submission.email,
            submitterPhone: submission.phone || 'Not provided',
            message: submission.message,
            type: submission.type,
            siteUrl,
            submissionTime: new Date(submission.submittedAt).toLocaleString()
          }
        );
      } catch (emailError) {
        console.error('Failed to send submission notification email:', emailError);
        // Don't fail the submission if email fails
      }
    }
    
    console.log(`✅ Contact form submission received for ${subdomain}`);
    
    res.json({
      success: true,
      message: 'Thank you for your submission! We\'ll get back to you soon.',
      submissionId: submission.id
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

// Get submissions for a site (authenticated)
app.get('/api/sites/:subdomain/submissions', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    // Load site to verify ownership
    const siteJsonPath = path.join(publicDir, 'sites', subdomain, 'site.json');
    let siteData;
    try {
      siteData = JSON.parse(await fs.readFile(siteJsonPath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    // Verify ownership
    if (siteData.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized to view submissions for this site' });
    }
    
    // Load submissions
    const submissionsFile = path.join(publicDir, 'sites', subdomain, 'submissions.json');
    let submissions = [];
    try {
      const data = await fs.readFile(submissionsFile, 'utf-8');
      submissions = JSON.parse(data);
    } catch (error) {
      // No submissions yet
      submissions = [];
    }
    
    res.json({
      success: true,
      submissions,
      total: submissions.length,
      unread: submissions.filter(s => s.status === 'unread').length
    });
    
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to load submissions' });
  }
});

// Mark submission as read
app.patch('/api/submissions/:submissionId/read', requireAuth, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { subdomain } = req.body;
    const userEmail = req.user.email;
    
    if (!subdomain) {
      return res.status(400).json({ error: 'Missing subdomain' });
    }
    
    // Verify ownership
    const siteJsonPath = path.join(publicDir, 'sites', subdomain, 'site.json');
    let siteData;
    try {
      siteData = JSON.parse(await fs.readFile(siteJsonPath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (siteData.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Load and update submissions
    const submissionsFile = path.join(publicDir, 'sites', subdomain, 'submissions.json');
    let submissions = JSON.parse(await fs.readFile(submissionsFile, 'utf-8'));
    
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    submission.status = 'read';
    submission.readAt = new Date().toISOString();
    
    await fs.writeFile(submissionsFile, JSON.stringify(submissions, null, 2));
    
    res.json({ success: true, submission });
    
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

// Trial Expiration Checker
async function checkTrialExpirations() {
  try {
    console.log('🔍 Checking for trial expirations...');
    
    const sitesDir = path.join(publicDir, 'sites');
    
    // Check if sites directory exists
    try {
      await fs.access(sitesDir);
    } catch (error) {
      console.log('No sites directory found, skipping trial check');
      return;
    }
    
    // Get all subdirectories in sites
    const subdirs = await fs.readdir(sitesDir);
    
    for (const subdomain of subdirs) {
      const siteJsonPath = path.join(sitesDir, subdomain, 'site.json');
      
      try {
        const siteData = JSON.parse(await fs.readFile(siteJsonPath, 'utf-8'));
        
        // Check if site has published metadata and is on free plan
        if (!siteData.published || siteData.published.plan !== 'free') {
          continue; // Skip paid sites
        }
        
        // Check if site is already marked as expired
        if (siteData.published.status === 'expired') {
          continue; // Already handled
        }
        
        const publishedAt = new Date(siteData.published.at);
        const now = new Date();
        const daysElapsed = Math.floor((now - publishedAt) / (1000 * 60 * 60 * 24));
        const daysRemaining = 7 - daysElapsed;
        
        console.log(`Site ${subdomain}: ${daysElapsed} days elapsed, ${daysRemaining} days remaining`);
        
        const siteUrl = `${process.env.SITE_URL || 'http://localhost:3000'}/sites/${subdomain}/`;
        const businessName = siteData.brand?.name || 'Your Business';
        const ownerEmail = siteData.published.email;
        
        if (!ownerEmail) {
          console.warn(`No owner email for site ${subdomain}, skipping notifications`);
          continue;
        }
        
        // Day 5: 2 days left warning
        if (daysElapsed === 5 && !siteData.published.warning2DaysSent) {
          console.log(`📧 Sending 2-days-left warning to ${ownerEmail} for ${subdomain}`);
          await sendEmail(
            ownerEmail,
            EmailTypes.TRIAL_EXPIRING_SOON,
            {
              businessName,
              siteUrl,
              daysLeft: 2
            }
          );
          
          // Mark as sent
          siteData.published.warning2DaysSent = true;
          await fs.writeFile(siteJsonPath, JSON.stringify(siteData, null, 2));
        }
        
        // Day 6: 1 day left warning
        if (daysElapsed === 6 && !siteData.published.warning1DaySent) {
          console.log(`📧 Sending 1-day-left warning to ${ownerEmail} for ${subdomain}`);
          await sendEmail(
            ownerEmail,
            EmailTypes.TRIAL_EXPIRING_SOON,
            {
              businessName,
              siteUrl,
              daysLeft: 1
            }
          );
          
          // Mark as sent
          siteData.published.warning1DaySent = true;
          await fs.writeFile(siteJsonPath, JSON.stringify(siteData, null, 2));
        }
        
        // Day 7+: Trial expired
        if (daysElapsed >= 7) {
          console.log(`❌ Trial expired for ${subdomain}, marking as expired`);
          
          // Mark site as expired
          siteData.published.status = 'expired';
          siteData.published.expiredAt = new Date().toISOString();
          await fs.writeFile(siteJsonPath, JSON.stringify(siteData, null, 2));
          
          // Send expiration email (only once)
          if (!siteData.published.expirationEmailSent) {
            console.log(`📧 Sending expiration email to ${ownerEmail} for ${subdomain}`);
            await sendEmail(
              ownerEmail,
              EmailTypes.TRIAL_EXPIRED,
              {
                businessName,
                siteUrl
              }
            );
            
            siteData.published.expirationEmailSent = true;
            await fs.writeFile(siteJsonPath, JSON.stringify(siteData, null, 2));
          }
        }
        
      } catch (error) {
        console.error(`Error processing site ${subdomain}:`, error);
      }
    }
    
    console.log('✅ Trial expiration check complete');
  } catch (error) {
    console.error('Error in trial expiration checker:', error);
  }
}

// Schedule trial expiration checker to run daily at 9 AM
cron.schedule('0 9 * * *', () => {
  console.log('⏰ Running scheduled trial expiration check...');
  checkTrialExpirations();
});

// Also run once on server start
console.log('🚀 Running initial trial expiration check...');
checkTrialExpirations();

// Middleware to check if site is expired before serving
app.use('/sites/:subdomain', async (req, res, next) => {
  const { subdomain } = req.params;
  const siteJsonPath = path.join(publicDir, 'sites', subdomain, 'site.json');
  
  try {
    const siteData = JSON.parse(await fs.readFile(siteJsonPath, 'utf-8'));
    
    // If site is marked as expired, show expiration page
    if (siteData.published?.status === 'expired') {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Trial Expired - ${siteData.brand?.name || 'This Site'}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 20px;
              padding: 50px 40px;
              max-width: 500px;
              text-align: center;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .icon {
              font-size: 80px;
              margin-bottom: 20px;
            }
            h1 {
              color: #1e293b;
              margin: 0 0 15px 0;
              font-size: 2rem;
            }
            p {
              color: #64748b;
              line-height: 1.6;
              margin: 0 0 30px 0;
              font-size: 1.1rem;
            }
            .cta-button {
              display: inline-block;
              padding: 16px 40px;
              background: linear-gradient(135deg, #ef4444, #dc2626);
              color: white;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 600;
              font-size: 1.1rem;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
              transition: transform 0.2s, box-shadow 0.2s;
            }
            .cta-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
            }
            .info-box {
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              border-radius: 8px;
              padding: 16px;
              margin: 25px 0;
              text-align: left;
            }
            .info-box p {
              color: #1e40af;
              margin: 0;
              font-size: 0.9rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">⏰</div>
            <h1>Free Trial Expired</h1>
            <p>The free trial for <strong>${siteData.brand?.name || 'this site'}</strong> has ended.</p>
            
            <div class="info-box">
              <p>💡 <strong>Good News:</strong> Your site data is safely stored for 30 days. Subscribe now to restore it instantly!</p>
            </div>
            
            <a href="${process.env.SITE_URL || 'http://localhost:3000'}/dashboard.html" class="cta-button">
              🚀 Restore My Site
            </a>
            
            <p style="margin-top: 30px; font-size: 0.9rem; color: #94a3b8;">
              Plans start at just $10/month
            </p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Site is not expired, continue normally
    next();
  } catch (error) {
    // If we can't read the site data, let the normal 404 handler deal with it
    next();
  }
});

// ===== PRO FEATURES: Product Management & Stripe Connect =====

// Get products for a site
app.get('/api/sites/:siteId/products', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const siteFile = path.join(__dirname, 'public', 'sites', siteId, 'site.json');
    
    if (!fs.existsSync(siteFile)) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const siteData = JSON.parse(fs.readFileSync(siteFile, 'utf-8'));
    
    // Verify ownership
    if (siteData.ownerEmail !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      products: siteData.products || [],
      siteName: siteData.businessName || siteData.brand?.name || siteId
    });
    
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// Update products for a site
app.put('/api/sites/:siteId/products', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { products } = req.body;
    
    const siteFile = path.join(__dirname, 'public', 'sites', siteId, 'site.json');
    
    if (!fs.existsSync(siteFile)) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const siteData = JSON.parse(fs.readFileSync(siteFile, 'utf-8'));
    
    // Verify ownership
    if (siteData.ownerEmail !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Validate products array
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products must be an array' });
    }
    
    // Update products
    siteData.products = products.map((p, index) => ({
      id: index,
      name: String(p.name || '').trim(),
      description: String(p.description || '').trim(),
      price: parseFloat(p.price) || 0,
      category: String(p.category || 'General').trim(),
      image: String(p.image || '').trim(),
      available: p.available !== false
    })).filter(p => p.name && p.price > 0);
    
    // Save
    fs.writeFileSync(siteFile, JSON.stringify(siteData, null, 2));
    
    // Note: Regenerate site HTML here if needed
    // await regenerateSiteHTML(siteId);
    
    console.log(`Updated ${siteData.products.length} products for site ${siteId}`);
    
    res.json({
      success: true,
      count: siteData.products.length,
      message: `Updated ${siteData.products.length} products`
    });
    
  } catch (error) {
    console.error('Update products error:', error);
    res.status(500).json({ error: 'Failed to update products' });
  }
});

// Save notification email for a site
app.post('/api/sites/:siteId/notification-email', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { notificationEmail } = req.body;
    
    const siteFile = path.join(__dirname, 'public', 'sites', siteId, 'site.json');
    
    // Check if site exists
    try {
      await fs.access(siteFile);
    } catch {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const siteContent = await fs.readFile(siteFile, 'utf-8');
    const siteData = JSON.parse(siteContent);
    
    // Verify ownership
    if (siteData.ownerEmail !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Validate email if provided (can be empty to disable)
    if (notificationEmail && !notificationEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    // Update notification email
    siteData.notificationEmail = notificationEmail || '';
    
    // Save
    await fs.writeFile(siteFile, JSON.stringify(siteData, null, 2));
    
    console.log(`Updated notification email for site ${siteId}: ${notificationEmail || '(disabled)'}`);
    
    res.json({
      success: true,
      notificationEmail: siteData.notificationEmail,
      message: notificationEmail ? 'Notification email saved' : 'Notifications disabled'
    });
    
  } catch (error) {
    console.error('Save notification email error:', error);
    res.status(500).json({ error: 'Failed to save notification email' });
  }
});

// Get site config (for notification email)
app.get('/api/sites/:siteId/config.json', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const siteFile = path.join(__dirname, 'public', 'sites', siteId, 'site.json');
    
    try {
      await fs.access(siteFile);
    } catch {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const siteContent = await fs.readFile(siteFile, 'utf-8');
    const siteData = JSON.parse(siteContent);
    
    // Verify ownership
    if (siteData.ownerEmail !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Return config (notification email and other settings)
    res.json({
      notificationEmail: siteData.notificationEmail || '',
      businessName: siteData.businessName || siteData.name || '',
      siteUrl: `${req.protocol}://${req.get('host')}/sites/${siteId}/`
    });
    
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// Order Management Endpoints

// Get orders for a site
app.get('/api/sites/:siteId/orders', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { status } = req.query; // Optional filter: 'new', 'completed', 'cancelled'
    
    // Load site to verify ownership
    const siteFile = path.join(__dirname, 'public', 'sites', siteId, 'site.json');
    
    try {
      const siteContent = await fs.readFile(siteFile, 'utf-8');
      const siteData = JSON.parse(siteContent);
      
      // Verify ownership
      if (siteData.ownerEmail !== req.user.email && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
    } catch (err) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    // Load orders
    let ordersData = await loadOrders(siteId);
    let orders = ordersData.orders || [];
    
    // Filter by status if requested
    if (status && status !== 'all') {
      orders = orders.filter(o => o.status === status);
    }
    
    res.json({
      success: true,
      orders: orders,
      count: orders.length
    });
    
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// Update order status
app.patch('/api/sites/:siteId/orders/:orderId', requireAuth, async (req, res) => {
  try {
    const { siteId, orderId } = req.params;
    const { status } = req.body;
    
    if (!['new', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Load site to verify ownership
    const siteFile = path.join(__dirname, 'public', 'sites', siteId, 'site.json');
    
    try {
      const siteContent = await fs.readFile(siteFile, 'utf-8');
      const siteData = JSON.parse(siteContent);
      
      // Verify ownership
      if (siteData.ownerEmail !== req.user.email && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
    } catch (err) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    // Load orders
    const ordersFile = path.join(ordersDir, siteId, 'orders.json');
    let ordersData = await loadOrders(siteId);
    
    // Find and update order
    const orderIndex = ordersData.orders.findIndex(o => o.orderId === orderId);
    
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    ordersData.orders[orderIndex].status = status;
    if (status === 'completed') {
      ordersData.orders[orderIndex].completedAt = new Date().toISOString();
    }
    
    // Save
    await fs.writeFile(ordersFile, JSON.stringify(ordersData, null, 2));
    
    res.json({
      success: true,
      order: ordersData.orders[orderIndex]
    });
    
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Image Upload with Optimization
app.post('/api/upload/image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const inputPath = req.file.path;
    const optimizedFilename = `optimized-${req.file.filename}`;
    const outputPath = path.join(uploadsDir, optimizedFilename);
    
    // Import sharp dynamically
    const sharp = (await import('sharp')).default;
    
    // Optimize image
    await sharp(inputPath)
      .resize(1200, 1200, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toFile(outputPath);
    
    // Delete original unoptimized file
    await fs.unlink(inputPath);
    
    // Return URL for optimized image
    const imageUrl = `/uploads/${optimizedFilename}`;
    
    res.json({
      success: true,
      url: imageUrl,
      filename: optimizedFilename
    });
    
  } catch (error) {
    console.error('Image upload error:', error);
    // Clean up files on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (_) {}
    }
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Stripe Connect OAuth callback
app.get('/stripe/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect('/dashboard.html?stripe=error&reason=no_code');
    }
    
    if (!stripe) {
      return res.redirect('/dashboard.html?stripe=error&reason=no_stripe');
    }
    
    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code
    });
    
    const stripeAccountId = response.stripe_user_id;
    
    console.log(`Stripe Connect successful: ${stripeAccountId}`);
    
    // Redirect to dashboard with account ID to save
    res.redirect(`/dashboard.html?stripe=connected&account=${stripeAccountId}&state=${state || ''}`);
    
  } catch (error) {
    console.error('Stripe Connect error:', error);
    res.redirect('/dashboard.html?stripe=error&reason=' + encodeURIComponent(error.message));
  }
});

// Save Stripe connection to user account
app.post('/api/stripe/connect', requireAuth, async (req, res) => {
  try {
    const { accountId } = req.body;
    const userEmail = req.user.email;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID required' });
    }
    
    // Load user data
    const userFile = path.join(__dirname, 'public', 'users',
      userEmail.replace('@', '_').replace(/\./g, '_') + '.json');
    
    if (!fs.existsSync(userFile)) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = JSON.parse(fs.readFileSync(userFile, 'utf-8'));
    
    // Verify account with Stripe API (if possible)
    let accountDetails = {};
    if (stripe) {
      try {
        const account = await stripe.accounts.retrieve(accountId);
        accountDetails = {
          country: account.country,
          email: account.email
        };
      } catch (err) {
        console.error('Failed to retrieve Stripe account details:', err);
      }
    }
    
    // Store connection info
    userData.stripe = {
      connected: true,
      accountId: accountId,
      mode: accountId.includes('_test_') ? 'test' : 'live',
      connectedAt: new Date().toISOString(),
      ...accountDetails
    };
    
    // Update all sites owned by this user with ownerEmail
    const sitesDir = path.join(__dirname, 'public', 'sites');
    if (fs.existsSync(sitesDir)) {
      const sites = fs.readdirSync(sitesDir);
      sites.forEach(siteId => {
        const siteFile = path.join(sitesDir, siteId, 'site.json');
        if (fs.existsSync(siteFile)) {
          const siteData = JSON.parse(fs.readFileSync(siteFile, 'utf-8'));
          if (!siteData.ownerEmail) {
            siteData.ownerEmail = userEmail;
            fs.writeFileSync(siteFile, JSON.stringify(siteData, null, 2));
          }
        }
      });
    }
    
    // Save user data
    fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
    
    console.log(`Stripe connected for user: ${userEmail}`);
    
    res.json({
      success: true,
      message: 'Stripe connected successfully!',
      mode: userData.stripe.mode
    });
    
  } catch (error) {
    console.error('Save Stripe connection error:', error);
    res.status(500).json({ error: 'Failed to save connection' });
  }
});

// Disconnect Stripe
app.post('/api/stripe/disconnect', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userFile = path.join(__dirname, 'public', 'users',
      userEmail.replace('@', '_').replace(/\./g, '_') + '.json');
    
    if (!fs.existsSync(userFile)) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = JSON.parse(fs.readFileSync(userFile, 'utf-8'));
    
    // Remove Stripe connection
    delete userData.stripe;
    
    fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
    
    console.log(`Stripe disconnected for user: ${userEmail}`);
    
    res.json({ success: true, message: 'Stripe disconnected' });
    
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// ====================================
// REACT SPA SUPPORT
// ====================================

// Serve React production build
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    index: false, // Don't serve index.html automatically
    setHeaders: (res, filePath) => {
      // Cache static assets aggressively
      if (filePath.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
    }
  }));
}

// Serve published sites (must come before SPA fallback)
app.use('/sites', express.static(path.join(publicDir, 'sites')));

// SPA fallback - serve index.html for all non-API, non-asset routes
app.get('*', (req, res, next) => {
  // Skip SPA fallback for these routes
  if (
    req.path.startsWith('/api/') ||           // API routes
    req.path.startsWith('/sites/') ||         // Published sites
    req.path.startsWith('/uploads/') ||       // Uploaded images
    req.path.startsWith('/data/') ||          // Template data
    req.path.startsWith('/assets/') ||        // Static assets
    req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff2?|ttf|eot)$/) // File extensions
  ) {
    return next();
  }

  // Serve React app for all other routes
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Development mode - React is on port 5173
    res.status(404).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>🚀 SiteSprintz - Development Mode</h1>
          <p>The React app is running on <a href="http://localhost:5173">http://localhost:5173</a></p>
          <p>The backend API is running on this port (${PORT})</p>
          <p>To build for production: <code>npm run build</code></p>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (fs.existsSync(distPath)) {
    console.log('✅ Serving React production build from /dist');
  } else {
    console.log('⚠️  No production build found. Run "npm run build" to create one.');
    console.log('💡 For development, run React dev server: npm run dev');
  }
});
