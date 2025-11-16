/**
 * Audit Trail System
 * 
 * Comprehensive logging of security-sensitive actions for compliance and forensics
 * 
 * Features:
 * - Logs to Winston logger (console + file)
 * - Stores in PostgreSQL database
 * - Tracks user actions, security events
 * - Captures IP, user-agent, request details
 * - Graceful error handling (never fails requests)
 * 
 * Created as part of P0-3: TDD Implementation (GREEN phase)
 */

import logger from './logger.js';
import { query as dbQuery } from '../../database/db.js';

/**
 * Audit Action Constants
 * Standardized action names for consistency
 */
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN_SUCCESS: 'login.success',
  LOGIN_FAILED: 'login.failed',
  LOGIN_BLOCKED: 'login.blocked',
  LOGOUT: 'logout',
  
  // Site Actions
  SITE_CREATED: 'site.created',
  SITE_PUBLISHED: 'site.published',
  SITE_DELETED: 'site.deleted',
  
  // Payment Actions
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  
  // Admin Actions
  ADMIN_ACCESS_DENIED: 'admin.access_denied',
  ADMIN_USER_INVITE: 'admin.user_invite',
  
  // Security Events
  ACCESS_DENIED: 'access.denied',
  TOKEN_EXPIRED: 'token.expired'
};

/**
 * Extract IP address from request
 * Handles proxied requests with x-forwarded-for header
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || req.ip || 'unknown';
}

/**
 * Extract user agent from request
 */
function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Log an audit event
 * Writes to both Winston logger and PostgreSQL database
 * 
 * @param {string} action - Action type (use AUDIT_ACTIONS constants)
 * @param {Object} req - Express request object
 * @param {Object} details - Additional details to log (optional)
 * @returns {Promise<void>}
 */
export async function auditLog(action, req, details = {}) {
  const userId = req.user?.id || null;
  const email = req.user?.email || 'anonymous';
  const ip = getClientIP(req);
  const userAgent = getUserAgent(req);
  const path = req.path || req.url || 'unknown';
  const method = req.method || 'unknown';
  
  // Construct audit entry
  // Start with base fields, then spread details (which can override anything),
  // then force method to always be the HTTP method (never overrideable)
  const auditEntry = {
    action,
    userId,
    email,
    ip,
    userAgent,
    path,
    method,
    ...details,  // Details can override anything above
    method  // But method always wins (comes last)
  };
  
  // Log to Winston (for immediate visibility and log files)
  logger.info('AUDIT', auditEntry);
  
  // Store in database (for long-term retention and querying)
  try {
    await dbQuery(
      `INSERT INTO audit_logs 
       (action, user_id, ip_address, user_agent, path, method, details, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        action,
        userId,
        ip,
        userAgent,
        path,
        method,
        JSON.stringify(details)
      ]
    );
  } catch (error) {
    // Never fail the request due to audit logging issues
    // But do log the error for investigation
    logger.error('Failed to write audit log to database:', {
      error: error.message,
      action,
      userId
    });
  }
}

/**
 * Retrieve audit logs for a specific user
 * 
 * @param {number} userId - User ID
 * @param {number} limit - Maximum number of logs to return (default 100)
 * @returns {Promise<Array>} - Array of audit log entries
 */
export async function getUserAuditLogs(userId, limit = 100) {
  try {
    const result = await dbQuery(
      `SELECT * FROM audit_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows;
  } catch (error) {
    logger.error('Failed to retrieve user audit logs:', {
      error: error.message,
      userId
    });
    return [];
  }
}

/**
 * Retrieve security-critical events
 * Used for security monitoring and incident response
 * 
 * @param {number} limit - Maximum number of events to return (default 100)
 * @returns {Promise<Array>} - Array of security event entries
 */
export async function getSecurityEvents(limit = 100) {
  try {
    // Query uses literal strings for readability and easy auditing
    const result = await dbQuery(
      `SELECT * FROM audit_logs 
       WHERE action IN ('login.failed', 'login.blocked', 'admin.access_denied', 'access.denied', 'token.expired') 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  } catch (error) {
    logger.error('Failed to retrieve security events:', {
      error: error.message
    });
    return [];
  }
}
