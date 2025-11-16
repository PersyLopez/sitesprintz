/**
 * Centralized error handling utilities
 * Provides consistent error responses across all routes
 */

/**
 * Standard error response format
 * @typedef {Object} ErrorResponse
 * @property {string} error - Error type/category
 * @property {string} message - User-friendly error message
 * @property {string} [code] - Machine-readable error code
 * @property {Object} [details] - Additional error details
 * @property {string} [timestamp] - ISO timestamp
 */

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Limits & Quotas
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  TRIAL_EXPIRED: 'TRIAL_EXPIRED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  
  // External Services
  STRIPE_ERROR: 'STRIPE_ERROR',
  EMAIL_ERROR: 'EMAIL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  BAD_REQUEST: 'BAD_REQUEST'
};

/**
 * Create standardized error response
 * @param {string} error - Error type
 * @param {string} message - User-friendly message
 * @param {string} [code] - Error code
 * @param {Object} [details] - Additional details
 * @returns {ErrorResponse}
 */
export function createError(error, message, code = null, details = null) {
  const response = {
    error,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (code) {
    response.code = code;
  }
  
  if (details) {
    response.details = details;
  }
  
  return response;
}

/**
 * Send standardized error response
 * @param {Response} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} error - Error type
 * @param {string} message - User-friendly message
 * @param {string} [code] - Error code
 * @param {Object} [details] - Additional details
 */
export function sendError(res, status, error, message, code = null, details = null) {
  return res.status(status).json(createError(error, message, code, details));
}

/**
 * Common error handlers
 */
export const ErrorHandlers = {
  // 400 Bad Request
  badRequest: (res, message = 'Bad request', details = null) => {
    return sendError(res, 400, 'Bad Request', message, ErrorCodes.BAD_REQUEST, details);
  },
  
  validation: (res, details) => {
    return sendError(res, 400, 'Validation failed', 'The provided data is invalid', ErrorCodes.VALIDATION_ERROR, details);
  },
  
  missingField: (res, field) => {
    return sendError(res, 400, 'Missing required field', `${field} is required`, ErrorCodes.MISSING_REQUIRED_FIELD, { field });
  },
  
  // 401 Unauthorized
  unauthorized: (res, message = 'Authentication required') => {
    return sendError(res, 401, 'Unauthorized', message, ErrorCodes.UNAUTHORIZED);
  },
  
  invalidCredentials: (res) => {
    return sendError(res, 401, 'Invalid credentials', 'Email or password is incorrect', ErrorCodes.INVALID_CREDENTIALS);
  },
  
  tokenExpired: (res) => {
    return sendError(res, 401, 'Token expired', 'Your session has expired. Please log in again.', ErrorCodes.TOKEN_EXPIRED);
  },
  
  // 403 Forbidden
  forbidden: (res, message = 'Access denied') => {
    return sendError(res, 403, 'Forbidden', message, ErrorCodes.FORBIDDEN);
  },
  
  subscriptionRequired: (res, plan, status) => {
    return sendError(
      res,
      403,
      'Subscription required',
      'An active subscription is required for this action',
      ErrorCodes.SUBSCRIPTION_REQUIRED,
      { plan, status }
    );
  },
  
  trialExpired: (res) => {
    return sendError(
      res,
      403,
      'Trial expired',
      'Your free trial has expired. Please upgrade to continue.',
      ErrorCodes.TRIAL_EXPIRED
    );
  },
  
  quotaExceeded: (res, quota, current) => {
    return sendError(
      res,
      403,
      'Quota exceeded',
      'You have reached your plan limit',
      ErrorCodes.QUOTA_EXCEEDED,
      { quota, current }
    );
  },
  
  // 404 Not Found
  notFound: (res, resource = 'Resource') => {
    return sendError(res, 404, 'Not found', `${resource} not found`, ErrorCodes.NOT_FOUND);
  },
  
  // 409 Conflict
  alreadyExists: (res, resource) => {
    return sendError(res, 409, 'Already exists', `${resource} already exists`, ErrorCodes.ALREADY_EXISTS);
  },
  
  conflict: (res, message) => {
    return sendError(res, 409, 'Conflict', message, ErrorCodes.CONFLICT);
  },
  
  // 429 Too Many Requests
  rateLimitExceeded: (res, retryAfter = null) => {
    const details = retryAfter ? { retryAfter } : null;
    return sendError(
      res,
      429,
      'Rate limit exceeded',
      'Too many requests. Please try again later.',
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      details
    );
  },
  
  // 500 Internal Server Error
  internal: (res, message = 'An unexpected error occurred') => {
    return sendError(res, 500, 'Internal server error', message, ErrorCodes.INTERNAL_ERROR);
  },
  
  database: (res) => {
    return sendError(res, 500, 'Database error', 'Failed to complete database operation', ErrorCodes.DATABASE_ERROR);
  },
  
  stripe: (res, message = 'Payment processing failed') => {
    return sendError(res, 500, 'Payment error', message, ErrorCodes.STRIPE_ERROR);
  },
  
  email: (res) => {
    return sendError(res, 500, 'Email error', 'Failed to send email', ErrorCodes.EMAIL_ERROR);
  },
  
  // 503 Service Unavailable
  serviceUnavailable: (res, service = 'Service') => {
    return sendError(
      res,
      503,
      'Service unavailable',
      `${service} is currently unavailable`,
      ErrorCodes.SERVICE_UNAVAILABLE
    );
  }
};

/**
 * Express error handling middleware
 * Usage: app.use(errorMiddleware)
 */
export function errorMiddleware(err, req, res, next) {
  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return ErrorHandlers.validation(res, err.details || err.message);
  }
  
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return ErrorHandlers.unauthorized(res);
  }
  
  if (err.name === 'TokenExpiredError') {
    return ErrorHandlers.tokenExpired(res);
  }
  
  if (err.code === 'EBADCSRFTOKEN') {
    return ErrorHandlers.forbidden(res, 'Invalid CSRF token');
  }
  
  // Default to internal server error
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;
    
  return ErrorHandlers.internal(res, message);
}

/**
 * Async route wrapper to catch errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  ErrorCodes,
  createError,
  sendError,
  ErrorHandlers,
  errorMiddleware,
  asyncHandler
};

