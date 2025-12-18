/**
 * Standardized API Response Utilities
 * 
 * Provides consistent response format across all API endpoints:
 * 
 * Success: { success: true, data: {...}, message?: string }
 * Error:   { success: false, error: string, code?: string, details?: any }
 * 
 * Usage:
 *   import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/apiResponse.js';
 *   
 *   // Success response
 *   sendSuccess(res, { user: userData });
 *   
 *   // Error response
 *   sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
 */

/**
 * Standard success response
 * @param {Response} res - Express response object
 * @param {object} data - Response data
 * @param {string} [message] - Optional success message
 * @param {number} [statusCode=200] - HTTP status code
 */
export function sendSuccess(res, data = {}, message = null, statusCode = 200) {
  const response = {
    success: true,
    ...data
  };
  
  if (message) {
    response.message = message;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Created response (201)
 * @param {Response} res - Express response object
 * @param {object} data - Created resource data
 * @param {string} [message] - Optional success message
 */
export function sendCreated(res, data = {}, message = 'Resource created successfully') {
  return sendSuccess(res, data, message, 201);
}

/**
 * Standard error response
 * @param {Response} res - Express response object
 * @param {string} error - Error message (safe for client)
 * @param {number} [statusCode=500] - HTTP status code
 * @param {string} [code] - Error code for programmatic handling
 * @param {object} [details] - Additional error details (only in non-production)
 */
export function sendError(res, error, statusCode = 500, code = null, details = null) {
  const response = {
    success: false,
    error
  };
  
  if (code) {
    response.code = code;
  }
  
  // Only include details in non-production environments
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Bad Request (400)
 */
export function sendBadRequest(res, error, code = 'BAD_REQUEST', details = null) {
  return sendError(res, error, 400, code, details);
}

/**
 * Unauthorized (401)
 */
export function sendUnauthorized(res, error = 'Authentication required', code = 'UNAUTHORIZED') {
  return sendError(res, error, 401, code);
}

/**
 * Forbidden (403)
 */
export function sendForbidden(res, error = 'Access denied', code = 'FORBIDDEN') {
  return sendError(res, error, 403, code);
}

/**
 * Not Found (404)
 */
export function sendNotFound(res, resource = 'Resource', code = 'NOT_FOUND') {
  return sendError(res, `${resource} not found`, 404, code);
}

/**
 * Conflict (409)
 */
export function sendConflict(res, error, code = 'CONFLICT') {
  return sendError(res, error, 409, code);
}

/**
 * Gone (410) - Resource no longer available
 */
export function sendGone(res, error = 'Resource is no longer available', code = 'GONE') {
  return sendError(res, error, 410, code);
}

/**
 * Unprocessable Entity (422) - Validation errors
 */
export function sendValidationError(res, error, validationErrors = null) {
  const response = {
    success: false,
    error,
    code: 'VALIDATION_ERROR'
  };
  
  if (validationErrors) {
    response.validationErrors = validationErrors;
  }
  
  return res.status(422).json(response);
}

/**
 * Too Many Requests (429)
 */
export function sendRateLimited(res, error = 'Too many requests', retryAfter = 60) {
  return res.status(429).json({
    success: false,
    error,
    code: 'RATE_LIMITED',
    retryAfter
  });
}

/**
 * Internal Server Error (500)
 * Logs the actual error but returns a safe message
 */
export function sendServerError(res, actualError, safeMessage = 'An unexpected error occurred') {
  // Log the actual error for debugging
  console.error('Server Error:', actualError);
  
  return sendError(res, safeMessage, 500, 'SERVER_ERROR');
}

/**
 * Service Unavailable (503)
 */
export function sendServiceUnavailable(res, error = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') {
  return sendError(res, error, 503, code);
}

/**
 * Wrap async route handlers to catch errors automatically
 * @param {Function} fn - Async route handler
 * @returns {Function} - Wrapped handler
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('Unhandled route error:', error);
      sendServerError(res, error);
    });
  };
}

export default {
  sendSuccess,
  sendCreated,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendGone,
  sendValidationError,
  sendRateLimited,
  sendServerError,
  sendServiceUnavailable,
  asyncHandler
};






