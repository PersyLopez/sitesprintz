/**
 * Token Service
 * 
 * Handles JWT access tokens and refresh token management:
 * - Generate access tokens (short-lived, 15 minutes)
 * - Generate refresh tokens (long-lived, 7 days)
 * - Verify refresh tokens
 * - Revoke tokens
 * - Cleanup expired tokens
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../database/db.js';

const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const getRefreshSecret = () => process.env.REFRESH_TOKEN_SECRET || getJwtSecret() + '-refresh';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Generate access token (short-lived)
 * @param {object} user - User object with id, email, role
 * @returns {string} JWT access token
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      type: 'access'
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate refresh token (cryptographically secure random string)
 * @returns {string} Random 64-character hex string
 */
export function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create token pair (access + refresh)
 * Stores refresh token in database
 * @param {object} user - User object with id, email, role
 * @returns {Promise<object>} Object with accessToken, refreshToken, expiresAt
 */
export async function createTokenPair(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  
  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + REFRESH_TOKEN_EXPIRY);
  
  // Store refresh token in database
  await prisma.refresh_tokens.create({
    data: {
      user_id: user.id,
      token: refreshToken,
      expires_at: expiresAt
    }
  });
  
  return {
    accessToken,
    refreshToken,
    expiresAt: expiresAt.toISOString()
  };
}

/**
 * Verify refresh token and return user
 * Updates last_used_at timestamp
 * @param {string} token - Refresh token string
 * @returns {Promise<object>} User object
 * @throws {Error} If token is invalid, revoked, or expired
 */
export async function verifyRefreshToken(token) {
  if (!token) {
    throw new Error('Refresh token is required');
  }
  
  // Check if token exists and is valid
  const refreshToken = await prisma.refresh_tokens.findUnique({
    where: { token },
    include: { 
      users: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          email_verified: true,
          subscription_status: true,
          subscription_plan: true
        }
      }
    }
  });
  
  if (!refreshToken) {
    throw new Error('Invalid refresh token');
  }
  
  if (refreshToken.revoked) {
    throw new Error('Refresh token has been revoked');
  }
  
  if (new Date(refreshToken.expires_at) < new Date()) {
    throw new Error('Refresh token has expired');
  }
  
  // Check if user account is active
  if (refreshToken.users.status !== 'active') {
    throw new Error('User account is not active');
  }
  
  // Update last used timestamp
  await prisma.refresh_tokens.update({
    where: { id: refreshToken.id },
    data: { last_used_at: new Date() }
  });
  
  return refreshToken.users;
}

/**
 * Revoke a specific refresh token
 * @param {string} token - Refresh token to revoke
 * @returns {Promise<void>}
 */
export async function revokeRefreshToken(token) {
  if (!token) {
    return;
  }
  
  await prisma.refresh_tokens.updateMany({
    where: { token },
    data: {
      revoked: true,
      revoked_at: new Date()
    }
  });
}

/**
 * Revoke all refresh tokens for a user
 * Useful for logout or security incidents
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of tokens revoked
 */
export async function revokeAllUserTokens(userId) {
  const result = await prisma.refresh_tokens.updateMany({
    where: {
      user_id: userId,
      revoked: false
    },
    data: {
      revoked: true,
      revoked_at: new Date()
    }
  });
  
  return result.count;
}

/**
 * Clean up expired tokens
 * Should be run periodically (e.g., daily cron job)
 * @returns {Promise<number>} Number of tokens deleted
 */
export async function cleanupExpiredTokens() {
  const deleted = await prisma.refresh_tokens.deleteMany({
    where: {
      expires_at: {
        lt: new Date()
      }
    }
  });
  
  return deleted.count;
}

/**
 * Get active refresh tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of active refresh tokens
 */
export async function getUserRefreshTokens(userId) {
  return await prisma.refresh_tokens.findMany({
    where: {
      user_id: userId,
      revoked: false,
      expires_at: {
        gt: new Date()
      }
    },
    select: {
      id: true,
      created_at: true,
      last_used_at: true,
      expires_at: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });
}






