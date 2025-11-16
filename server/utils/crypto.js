/**
 * Crypto Utilities
 * 
 * Cryptographic helper functions for generating secure tokens,
 * passwords, and UUIDs.
 */

import crypto from 'crypto';

/**
 * Generate a random password
 * @param {number} length - Length of the password (default: 16)
 * @returns {string} Random password
 */
export function generateRandomPassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Use crypto.randomInt for cryptographically secure random selection
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

/**
 * Generate a cryptographically secure random token
 * @param {number} bytes - Number of random bytes to generate (default: 32)
 * @returns {string} Hex-encoded token (length = bytes * 2)
 */
export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a UUID v4
 * @returns {string} UUID in standard format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 */
export function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Generate a secure random string (URL-safe base64)
 * @param {number} bytes - Number of random bytes (default: 32)
 * @returns {string} URL-safe base64 string
 */
export function generateSecureRandom(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Hash a password using crypto.scrypt (more secure than bcrypt for some use cases)
 * @param {string} password - Plain text password
 * @param {string} salt - Salt (use crypto.randomBytes(16).toString('hex'))
 * @returns {Promise<string>} Hashed password (hex)
 */
export async function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

/**
 * Generate a salt for password hashing
 * @returns {string} Salt (hex)
 */
export function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

export default {
  generateRandomPassword,
  generateToken,
  generateUUID,
  generateSecureRandom,
  hashPassword,
  generateSalt,
};

