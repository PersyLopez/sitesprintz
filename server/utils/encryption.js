/**
 * Encryption Utility
 * 
 * AES-256-GCM encryption/decryption for sensitive data (payment processor credentials).
 * Uses authenticated encryption to prevent tampering.
 * 
 * Security properties:
 * - AES-256-GCM (authenticated encryption)
 * - 12-byte random IV per encryption
 * - 16-byte auth tag verification
 * - Constant-time operations where possible
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM
const KEY_LENGTH = 32; // 32 bytes for AES-256

/**
 * Get encryption key from environment
 * @returns {Buffer} 32-byte encryption key
 * @throws {Error} If key is missing or wrong length
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY not configured');
  }
  
  // Convert string to buffer if needed
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf8');
  
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (got ${keyBuffer.length})`);
  }
  
  return keyBuffer;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * @param {string} plaintext - Text to encrypt
 * @returns {string} Base64-encoded ciphertext (IV + encrypted data + auth tag)
 * @throws {Error} If encryption fails or key is invalid
 */
export function encrypt(plaintext) {
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a string');
  }
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + encrypted data + auth tag
  const combined = Buffer.concat([iv, encrypted, authTag]);
  
  // Return base64-encoded string
  return combined.toString('base64');
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * @param {string} ciphertext - Base64-encoded ciphertext
 * @returns {string} Decrypted plaintext
 * @throws {Error} If decryption fails, tampering detected, or format invalid
 */
export function decrypt(ciphertext) {
  if (typeof ciphertext !== 'string' || ciphertext.length === 0) {
    throw new Error('Invalid ciphertext format');
  }
  
  const key = getEncryptionKey();
  
  let combined;
  try {
    combined = Buffer.from(ciphertext, 'base64');
  } catch (error) {
    throw new Error('Invalid ciphertext format: not base64');
  }
  
  // Minimum size: IV (12) + auth tag (16) = 28 bytes
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext format: too short');
  }
  
  // Extract components
  const iv = combined.slice(0, IV_LENGTH);
  const authTag = combined.slice(-AUTH_TAG_LENGTH);
  const encrypted = combined.slice(IV_LENGTH, -AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  try {
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    // GCM will throw if auth tag doesn't match (tampering detected)
    throw new Error('Decryption failed: authentication tag mismatch or corrupted data');
  }
}

export default {
  encrypt,
  decrypt
};


