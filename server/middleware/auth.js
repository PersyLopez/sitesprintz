import jwt from 'jsonwebtoken';
import { prisma } from '../../database/db.js';

// function to get secret to avoid ESM hoisting issues
const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-token';

/**
 * Extract token from Authorization header
 */
function extractToken(req) {
  const authHeader = req.headers['authorization'];
  return authHeader && authHeader.split(' ')[1];
}

/**
 * Authenticate user and load from database
 */
async function authenticateAndLoadUser(token) {
  const decoded = jwt.verify(token, getJwtSecret());

  const user = await prisma.users.findUnique({
    where: { id: decoded.userId || decoded.id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      email_verified: true,
      subscription_status: true,
      subscription_plan: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.status === 'suspended' || user.status === 'banned') {
    throw new Error('Account is suspended');
  }

  return user;
}

/**
 * Attach user to request object
 */
function attachUserToRequest(req, user) {
  req.user = {
    id: user.id,
    userId: user.id, // For backwards compatibility
    email: user.email,
    role: user.role,
    status: user.status,
    subscriptionStatus: user.subscription_status,
    subscriptionPlan: user.subscription_plan
  };
}

/**
 * Handle authentication errors
 */
function handleAuthError(err, res) {
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  if (err.message === 'User not found') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (err.message === 'Account is suspended') {
    return res.status(403).json({ error: 'Account is suspended' });
  }
  console.error('Auth error:', err);
  return res.status(500).json({ error: 'Authentication failed' });
}

/**
 * Check email verification requirement
 */
function checkEmailVerification(user, res) {
  const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';
  if (requireEmailVerification && !user.email_verified && user.role !== 'admin') {
    // Skip verification for test users in E2E environment
    if (process.env.NODE_ENV !== 'production' && (user.email.startsWith('test') || user.email.startsWith('reset'))) {
      return null;
    }
    return res.status(403).json({
      error: 'Email verification required',
      requiresVerification: true,
      message: 'Please verify your email address to access this resource.'
    });
  }
  return null;
}

/**
 * Authorize admin access
 */
function authorizeAdmin(user, res) {
  if (user.role !== 'admin') {
    console.log(`[AdminAuth] Access denied for user ${user.email} with role ${user.role}`);
    return res.status(403).json({
      error: 'Admin access required',
      message: 'You do not have permission to access this resource'
    });
  }
  return null;
}

/**
 * Middleware to require admin authentication
 * Combines authentication + admin authorization in one middleware
 * 
 * Usage: router.get('/admin/endpoint', requireAdmin, handler)
 */
export async function requireAdmin(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const user = await authenticateAndLoadUser(token);
    const authError = authorizeAdmin(user, res);
    if (authError) return authError;

    attachUserToRequest(req, user);
    next();
  } catch (err) {
    return handleAuthError(err, res);
  }
}

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
 */
export async function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    console.log('Auth Middleware: No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const user = await authenticateAndLoadUser(token);
    console.log(`Auth Middleware: Token verified for user ${user.email} (${user.role})`);

    const verificationError = checkEmailVerification(user, res);
    if (verificationError) return verificationError;

    attachUserToRequest(req, user);
    next();
  } catch (err) {
    if (err.message === 'User not found') {
      console.log('Auth Middleware: User not found in DB');
    }
    console.error('Auth middleware error:', err);
    console.log('Auth Middleware: Error details:', err.message);
    return handleAuthError(err, res);
  }
}

/**
 * Alias for requireAuth (for compatibility with tests)
 */
export const authenticateToken = requireAuth;

