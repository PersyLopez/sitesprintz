import jwt from 'jsonwebtoken';
import { query as dbQuery } from '../../database/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-token';

/**
 * Middleware to require admin authentication
 * Combines authentication + admin authorization in one middleware
 * 
 * Usage: router.get('/admin/endpoint', requireAdmin, handler)
 */
export async function requireAdmin(req, res, next) {
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
      [decoded.userId || decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Step 3: Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    
    // Step 4: Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        message: 'You do not have permission to access this resource'
      });
    }
    
    // Step 5: Attach user to request
    req.user = {
      id: user.id,
      userId: user.id,
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
    console.error('Admin auth error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
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
      return res.status(401).json({ error: 'Unauthorized' });
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

/**
 * Alias for requireAuth (for compatibility with tests)
 */
export const authenticateToken = requireAuth;

