/**
 * Rate Limiting Middleware
 * 
 * Protects against:
 * - Bot attacks and account creation spam
 * - Brute force login attempts
 * - API abuse
 * - Resource exhaustion
 * 
 * @see docs/security/BOT-PROTECTION-ANALYSIS.md
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';
console.log(`[RateLimit] NODE_ENV="${process.env.NODE_ENV}", isTest=${isTest}`);

/**
 * Registration Rate Limiter
 * 
 * Limits: 3 registrations per 15 minutes per IP
 * Purpose: Prevent bot attacks and fake account creation
 */
export const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 3, // Limit each IP to 3 registration requests per windowMs
  message: {
    error: 'Too many registration attempts',
    message: 'Please try again in 15 minutes. If you continue to see this error, contact support.',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count all attempts, even successful ones
  keyGenerator: (req) => ipKeyGenerator(req),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many registration attempts',
      message: 'Please try again in 15 minutes. This helps protect against automated attacks.',
      retryAfter: 15 * 60
    });
  }
});

/**
 * Login Rate Limiter
 * 
 * Limits: 5 login attempts per 15 minutes per IP
 * Purpose: Prevent brute force attacks
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 1000, // Limit each IP to 5 login requests per windowMs in production, 1000 otherwise
  message: {
    error: 'Too many login attempts',
    message: 'Please try again in 15 minutes. If you forgot your password, use the password reset feature.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => ipKeyGenerator(req),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Please try again in 15 minutes. This helps protect your account from brute force attacks.',
      retryAfter: 15 * 60
    });
  }
});

/**
 * Password Reset Rate Limiter
 * 
 * Limits: 3 password reset requests per hour per email
 * Purpose: Prevent email spam and account enumeration
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 1000 : 3, // Limit each email to 3 password reset requests per hour
  message: {
    error: 'Too many password reset requests',
    message: 'Please wait an hour before requesting another password reset. Check your email spam folder.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by email address to prevent spam
    const email = req.body?.email || 'unknown';
    return email.toLowerCase();
  },
  skipFailedRequests: false, // Count all attempts
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many password reset requests',
      message: 'Please wait an hour before requesting another password reset.',
      retryAfter: 60 * 60
    });
  }
});

/**
 * General API Rate Limiter
 * 
 * Limits: 100 requests per 15 minutes per IP
 * Purpose: Prevent API abuse
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 5000 : 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please slow down. Too many requests from your IP address.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please slow down and try again in a few minutes.',
      retryAfter: 15 * 60
    });
  }
});

/**
 * File Upload Rate Limiter
 * 
 * Limits: 20 uploads per hour per IP
 * Purpose: Prevent storage abuse
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 1000 : 20, // Limit each IP to 20 uploads per hour
  message: {
    error: 'Upload limit exceeded',
    message: 'Too many file uploads. Please try again in an hour.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Upload limit exceeded',
      message: 'Too many file uploads. Please try again later.',
      retryAfter: 60 * 60
    });
  }
});


