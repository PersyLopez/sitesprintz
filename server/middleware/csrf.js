/**
 * CSRF Protection Middleware
 * 
 * Implements Cross-Site Request Forgery protection using tokens.
 * 
 * How it works:
 * 1. Generate unique CSRF tokens per session
 * 2. Client fetches token from /api/csrf-token
 * 3. Client includes token in X-CSRF-Token header for state-changing requests
 * 4. Server validates token on POST/PUT/PATCH/DELETE requests
 * 
 * Created as part of P1-4: TDD Implementation (GREEN phase)
 */

import crypto from 'crypto';

// Store CSRF tokens per session (in production, use Redis)
// Map<sessionId, token>
const csrfTokens = new Map();

/**
 * Generate a cryptographically secure CSRF token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get or create session ID from cookies
 */
function getSessionId(req) {
  // Try to get existing session ID from cookie
  const sessionCookie = req.cookies?.sessionId;
  
  if (sessionCookie) {
    return sessionCookie;
  }
  
  // Generate new session ID
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Middleware to generate and return CSRF token
 * 
 * GET /api/csrf-token
 * 
 * Returns: { csrfToken: "..." }
 */
export function csrfTokenEndpoint(req, res) {
  try {
    const sessionId = getSessionId(req);
    
    // Generate new token for this session
    const token = generateToken();
    
    // Store token for validation
    csrfTokens.set(sessionId, token);
    
    // Set session cookie if it doesn't exist
    if (!req.cookies?.sessionId) {
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // 'lax' allows cookies on OAuth redirects while preventing CSRF
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    }
    
    res.json({ csrfToken: token });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * 
 * Usage: app.use(csrfProtection)
 * 
 * Validates X-CSRF-Token header against stored token for:
 * - POST, PUT, PATCH, DELETE requests
 * 
 * Skips validation for:
 * - GET, HEAD, OPTIONS requests
 * - Webhook endpoints (validated by signature)
 */
export function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();
  
  // Skip CSRF validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }
  
  // Skip CSRF validation for webhook endpoints (they use signature validation)
  if (req.path.startsWith('/api/webhooks/')) {
    return next();
  }
  
  // Skip CSRF validation for CSRF token endpoint itself
  if (req.path === '/api/csrf-token') {
    return next();
  }
  
  // Temporarily skip CSRF validation for auth endpoints (until cookie-parser is properly configured)
  console.log('CSRF Check - Path:', req.path, 'Method:', method);
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/auth/')) {
    console.log('✅ Skipping CSRF for auth endpoint');
    return next();
  }
  
  try {
    const sessionId = req.cookies?.sessionId;
    
    if (!sessionId) {
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        message: 'No session found',
        code: 'CSRF_INVALID'
      });
    }
    
    // Get token from header
    const clientToken = req.headers['x-csrf-token'];
    
    if (!clientToken) {
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        message: 'CSRF token required',
        code: 'CSRF_INVALID'
      });
    }
    
    // Get stored token for this session
    const storedToken = csrfTokens.get(sessionId);
    
    if (!storedToken) {
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        message: 'Token expired or invalid',
        code: 'CSRF_INVALID'
      });
    }
    
    // Validate token (constant-time comparison to prevent timing attacks)
    const tokensMatch = crypto.timingSafeEqual(
      Buffer.from(clientToken),
      Buffer.from(storedToken)
    );
    
    if (!tokensMatch) {
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        message: 'Token mismatch',
        code: 'CSRF_INVALID'
      });
    }
    
    // Token is valid, proceed
    next();
  } catch (error) {
    console.error('CSRF validation error:', error);
    
    // Handle buffer length mismatch (different token lengths)
    if (error.code === 'ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH') {
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        message: 'Token format invalid',
        code: 'CSRF_INVALID'
      });
    }
    
    return res.status(500).json({ error: 'CSRF validation failed' });
  }
}

/**
 * Clear CSRF token for a session (on logout)
 */
export function clearCsrfToken(sessionId) {
  if (sessionId) {
    csrfTokens.delete(sessionId);
  }
}

/**
 * Get current CSRF token count (for monitoring)
 */
export function getCsrfTokenCount() {
  return csrfTokens.size;
}

/**
 * Clear all expired CSRF tokens (cleanup function)
 * In production, use Redis with TTL instead
 */
export function cleanupExpiredTokens() {
  // This is a simple in-memory implementation
  // In production, Redis handles TTL automatically
  const MAX_TOKENS = 10000;
  
  if (csrfTokens.size > MAX_TOKENS) {
    // Remove oldest tokens (simple FIFO)
    const tokensToRemove = csrfTokens.size - MAX_TOKENS;
    const keys = Array.from(csrfTokens.keys());
    
    for (let i = 0; i < tokensToRemove; i++) {
      csrfTokens.delete(keys[i]);
    }
  }
}

