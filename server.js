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
import { sendEmail, EmailTypes } from './email-service.js';

dotenv.config();

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

function requireAdmin(req, res, next){
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if(token === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// JWT Authentication middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Endpoint to get admin token (for image uploads during setup)
app.get('/api/admin-token', (req, res) => {
  // Return the admin token - in production, you might want to add rate limiting here
  res.json({ token: ADMIN_TOKEN });
});

// Authentication Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Check if user already exists
    const userFile = getUserFilePath(email);
    
    try {
      await fs.access(userFile);
      return res.status(409).json({ error: 'User already exists' });
    } catch (err) {
      // User doesn't exist, proceed with registration
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      id: `user_${Date.now()}`,
      email: email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      sites: []
    };
    
    await fs.writeFile(userFile, JSON.stringify(user, null, 2));
    
    // Generate JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    // Send welcome email
    await sendEmail(email, EmailTypes.WELCOME, { email });
    
    res.json({ success: true, token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Load user
    const userFile = getUserFilePath(email);
    
    let user;
    try {
      const userData = await fs.readFile(userFile, 'utf-8');
      user = JSON.parse(userData);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if temporary password has expired
    if (user.tempPasswordExpires) {
      const tempPasswordExpires = new Date(user.tempPasswordExpires);
      if (tempPasswordExpires < new Date()) {
        return res.status(401).json({ error: 'Temporary password has expired. Please request a new one.' });
      }
    }
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    await fs.writeFile(userFile, JSON.stringify(user, null, 2));
    
    // Generate JWT
    const token = jwt.sign({ 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      status: user.status,
      needsPasswordChange: user.status === 'invited'
    }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      success: true, 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        status: user.status,
        needsPasswordChange: user.status === 'invited'
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const { email } = req.user;
    const userFile = getUserFilePath(email);
    
    const userData = await fs.readFile(userFile, 'utf-8');
    const user = JSON.parse(userData);
    
    res.json({ id: user.id, email: user.email, sites: user.sites });
  } catch (err) {
    res.status(404).json({ error: 'User not found' });
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
    
    const sites = [];
    
    // Load published sites
    const sitesDir = path.join(publicDir, 'sites');
    if (await fs.access(sitesDir).then(() => true).catch(() => false)) {
      const siteDirs = await fs.readdir(sitesDir);
      
      for (const siteDir of siteDirs) {
        const sitePath = path.join(sitesDir, siteDir, 'site.json');
        try {
          const siteData = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
          if (siteData.published?.email === req.user.email) {
            sites.push({
              id: siteDir,
              name: siteData.brand?.name || 'Untitled Site',
              url: `/sites/${siteDir}/`,
              status: 'published',
              createdAt: siteData.published?.at || new Date().toISOString(),
              plan: siteData.published?.plan || 'Starter',
              template: siteData.template || 'unknown'
            });
          }
        } catch (err) {
          console.error(`Error reading site ${siteDir}:`, err.message);
        }
      }
    }
    
    // Load draft sites
    const draftsDir = path.join(publicDir, 'drafts');
    if (await fs.access(draftsDir).then(() => true).catch(() => false)) {
      const draftFiles = await fs.readdir(draftsDir);
      
      for (const draftFile of draftFiles) {
        if (draftFile.endsWith('.json')) {
          try {
            const draftData = JSON.parse(await fs.readFile(path.join(draftsDir, draftFile), 'utf-8'));
            if (draftData.businessData?.email === req.user.email) {
              sites.push({
                id: draftFile.replace('.json', ''),
                name: draftData.businessData?.businessName || 'Untitled Draft',
                url: `/drafts/${draftFile.replace('.json', '')}`,
                status: 'draft',
                createdAt: draftData.createdAt || new Date().toISOString(),
                plan: 'Draft',
                template: draftData.templateId || 'unknown'
              });
            }
          } catch (err) {
            console.error(`Error reading draft ${draftFile}:`, err.message);
          }
        }
      }
    }
    
    // Sort by creation date (newest first)
    sites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
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
    
    // Check if it's a published site
    const sitePath = path.join(publicDir, 'sites', siteId);
    if (await fs.access(sitePath).then(() => true).catch(() => false)) {
      // Verify ownership
      const siteDataPath = path.join(sitePath, 'site.json');
      try {
        const siteData = JSON.parse(await fs.readFile(siteDataPath, 'utf-8'));
        if (siteData.published?.email !== req.user.email) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        // Delete the site directory
        await fs.rm(sitePath, { recursive: true, force: true });
        res.json({ message: 'Site deleted successfully' });
        return;
      } catch (err) {
        console.error(`Error verifying site ownership:`, err.message);
        return res.status(500).json({ error: 'Failed to verify site ownership' });
      }
    }
    
    // Check if it's a draft
    const draftPath = path.join(publicDir, 'drafts', `${siteId}.json`);
    if (await fs.access(draftPath).then(() => true).catch(() => false)) {
      try {
        const draftData = JSON.parse(await fs.readFile(draftPath, 'utf-8'));
        if (draftData.businessData?.email !== req.user.email) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        // Delete the draft file
        await fs.unlink(draftPath);
        res.json({ message: 'Draft deleted successfully' });
        return;
      } catch (err) {
        console.error(`Error verifying draft ownership:`, err.message);
        return res.status(500).json({ error: 'Failed to verify draft ownership' });
      }
    }
    
    res.status(404).json({ error: 'Site not found' });
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

// Create a Checkout Session for a product defined in data/site.json by index
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

    // Load authoritative product data from server-side site.json
    const raw = await fs.readFile(dataFile, 'utf-8');
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
    const success = successUrl || `${origin}/?checkout=success`;
    const cancel = cancelUrl || `${origin}/?checkout=cancel`;

    // Idempotency key: prefer header, then body, then generated
    const incomingIdem = (req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || req.body?.idempotencyKey);
    const idempotencyKey = typeof incomingIdem === 'string' && incomingIdem
      ? incomingIdem
      : (typeof nodeRandomUUID === 'function' ? nodeRandomUUID() : `${Date.now()}-${Math.random()}`);

    const session = await stripe.checkout.sessions.create({
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
      // Enable Stripe Tax for automatic tax calculation
      automatic_tax: { enabled: true },
      metadata: {
        siteId: siteId ? String(siteId) : '',
        productIndex: String(idx)
      }
    }, { idempotencyKey });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create checkout session', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
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
    <style>
      :root {
        --color-bg: #fefefe;
        --color-surface: #ffffff;
        --color-card: #f8fafc;
        --color-text: #1e293b;
        --color-muted: #64748b;
        --color-primary: #2563eb;
        --color-primary-600: #1d4ed8;
        --color-accent: #3b82f6;
        --radius: 12px;
        --shadow-lg: 0 10px 25px rgba(0,0,0,.08);
        --shadow-sm: 0 2px 8px rgba(0,0,0,.06);
        --shadow-hover: 0 4px 12px rgba(0,0,0,.12);
        --spacing-xs: 4px;
        --spacing-sm: 8px;
        --spacing-md: 16px;
        --spacing-lg: 24px;
        --spacing-xl: 32px;
        --spacing-2xl: 48px;
      }
      
      * { box-sizing: border-box; }
      body { 
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        margin: 0; 
        padding: 0; 
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        color: var(--color-text);
        line-height: 1.5;
        font-size: 16px;
      }
      .container { max-width: 1000px; margin: 0 auto; padding: var(--spacing-lg); }
      .card { 
        background: var(--color-surface); 
        border: 1px solid rgba(0,0,0,0.08); 
        border-radius: var(--radius); 
        padding: var(--spacing-lg); 
        box-shadow: var(--shadow-sm); 
        margin: var(--spacing-lg) 0;
        transition: all 0.2s;
      }
      .card:hover { 
        transform: translateY(-2px); 
        box-shadow: var(--shadow-hover); 
        border-color: var(--color-primary);
      }
      .btn { 
        display: inline-flex; 
        align-items: center; 
        gap: var(--spacing-sm); 
        padding: var(--spacing-md) var(--spacing-lg); 
        border-radius: var(--radius); 
        text-decoration: none; 
        font-weight: 600; 
        border: 1px solid transparent; 
        transition: all 0.2s;
        font-size: 0.95rem;
      }
      .btn-primary { background: var(--color-primary); color: white; }
      .btn-primary:hover { background: var(--color-primary-600); transform: translateY(-1px); box-shadow: var(--shadow-hover); }
      .btn-secondary { background: var(--color-card); color: var(--color-text); border-color: rgba(0,0,0,0.1); }
      .btn-secondary:hover { background: var(--color-surface); border-color: var(--color-primary); color: var(--color-primary); }
      .hero { 
        display: grid; 
        grid-template-columns: 1.1fr 0.9fr; 
        align-items: center; 
        gap: var(--spacing-xl); 
        padding: var(--spacing-2xl) 0; 
      }
      .hero h1 { font-size: clamp(1.8rem, 3.5vw + 1rem, 2.8rem); line-height: 1.2; margin: var(--spacing-sm) 0 var(--spacing-md); font-weight: 700; }
      .hero p { font-size: 1.1rem; color: var(--color-muted); margin: 0 0 var(--spacing-lg); }
      .hero img { width: 100%; height: 350px; object-fit: cover; border-radius: var(--radius); }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-lg); }
      .muted { color: var(--color-muted); }
      .text-center { text-align: center; }
      
      @media (max-width: 900px) {
        .hero { grid-template-columns: 1fr; gap: var(--spacing-lg); }
        .container { padding: var(--spacing-md); }
      }
    </style>
  </head>
  <body>
    <div id="loading">Loading...</div>
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
          mainContent.innerHTML = \`
            <div class="container">
              <!-- Header -->
              <header style="padding: 20px 0; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <h1 style="margin: 0; color: \${data.themeVars?.['color-primary'] || '#3b82f6'};">
                    \${data.brand?.name || 'Business Name'}
                  </h1>
                  <nav>
                    \${data.nav?.map(item => \`<a href="\${item.href}" style="margin-left: 20px; text-decoration: none; color: #6b7280;">\${item.label}</a>\`).join('') || ''}
                  </nav>
                </div>
              </header>
              
              <!-- Hero Section -->
              <section class="hero">
                <div>
                  <p style="color: \${data.themeVars?.['color-primary'] || '#3b82f6'}; font-weight: 600; margin-bottom: 10px;">
                    \${data.hero?.eyebrow || ''}
                  </p>
                  <h1 style="font-size: 3rem; font-weight: 700; margin: 0 0 20px 0;">
                    \${data.hero?.title || 'Welcome'}
                  </h1>
                  <p style="font-size: 1.2rem; color: #6b7280; margin: 0 0 30px 0;">
                    \${data.hero?.subtitle || ''}
                  </p>
                  <div>
                    \${data.hero?.cta?.map(btn => \`
                      <a href="\${btn.href}" class="btn \${btn.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}" style="margin-right: 15px;">
                        \${btn.label}
                      </a>
                    \`).join('') || ''}
                  </div>
                </div>
                \${data.hero?.image ? \`
                  <div>
                    <img src="\${data.hero.image}" alt="\${data.hero.imageAlt || ''}" style="width: 100%; height: 400px; object-fit: cover; border-radius: 12px;">
                  </div>
                \` : ''}
              </section>
              
              <!-- Services/Products Section -->
              \${data.services?.items?.length ? \`
                <section class="card">
                  <h2>\${data.services.title || 'Services'}</h2>
                  <p>\${data.services.subtitle || ''}</p>
                  <div class="grid">
                    \${data.services.items.map(item => \`
                      <div class="card">
                        \${item.image ? \`<img src="\${item.image}" alt="\${item.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">\` : ''}
                        <h3>\${item.title}</h3>
                        <p>\${item.description || ''}</p>
                      </div>
                    \`).join('')}
                  </div>
                </section>
              \` : ''}
              
              \${data.products?.length ? \`
                <section class="card">
                  <h2>Our \${data.products[0]?.price ? 'Menu' : 'Services'}</h2>
                  <div class="grid">
                    \${data.products.map(item => \`
                      <div class="card">
                        \${item.image ? \`<img src="\${item.image}" alt="\${item.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">\` : ''}
                        <h3>\${item.name}</h3>
                        \${item.price ? \`<p style="font-size: 1.2rem; font-weight: 600; color: \${data.themeVars?.['color-primary'] || '#3b82f6'};}">$\${item.price}</p>\` : ''}
                        <p>\${item.description || ''}</p>
                      </div>
                    \`).join('')}
                  </div>
                </section>
              \` : ''}
              
              <!-- Contact Section -->
              \${data.contact ? \`
                <section class="card">
                  <h2>\${data.contact.title || 'Contact Us'}</h2>
                  <p>\${data.contact.subtitle || ''}</p>
                  \${data.contact.phone ? \`<p><strong>Phone:</strong> \${data.contact.phone}</p>\` : ''}
                  \${data.contact.email ? \`<p><strong>Email:</strong> \${data.contact.email}</p>\` : ''}
                </section>
              \` : ''}
              
              <!-- Footer -->
              <footer style="text-align: center; padding: 40px 0; border-top: 1px solid #e5e7eb; margin-top: 40px;">
                <p class="muted">\${data.footer?.text || 'Thank you for visiting!'}</p>
              </footer>
            </div>
          \`;
          
        } catch (error) {
          console.error('Error:', error);
          document.getElementById('loading').innerHTML = \`
            <div style="padding: 40px; text-align: center;">
              <h2 style="color: #ef4444;">Error Loading Site</h2>
              <p>\${error.message}</p>
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
