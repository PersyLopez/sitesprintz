/**
 * Encryption Utility Tests
 * 
 * Tests for AES-256-GCM encryption/decryption of payment processor credentials.
 * Following TDD: These tests are written BEFORE implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from '../../../server/utils/encryption.js';

describe('Encryption Utility', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Set valid 32-byte key for most tests
    process.env.ENCRYPTION_KEY = 'a'.repeat(32); // 32 bytes
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe('encrypt()', () => {
    it('should return different ciphertext for same plaintext (IV uniqueness)', () => {
      const plaintext = 'secret-api-key';
      const cipher1 = encrypt(plaintext);
      const cipher2 = encrypt(plaintext);
      
      // Different IVs should produce different ciphertexts
      expect(cipher1).not.toBe(cipher2);
      
      // But both should decrypt to same plaintext
      expect(decrypt(cipher1)).toBe(plaintext);
      expect(decrypt(cipher2)).toBe(plaintext);
    });

    it('should throw if ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY not configured');
    });

    it('should throw if ENCRYPTION_KEY is wrong length', () => {
      process.env.ENCRYPTION_KEY = 'too-short';
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be 32 bytes');
    });

    it('should produce valid encrypted format', () => {
      const plaintext = 'sk_test_abc123';
      const ciphertext = encrypt(plaintext);
      
      // Format: base64(IV:12bytes + ciphertext + authTag:16bytes)
      // Should be base64 encoded string
      expect(typeof ciphertext).toBe('string');
      expect(ciphertext.length).toBeGreaterThan(0);
      
      // Should not contain plaintext
      expect(ciphertext).not.toContain('sk_test');
    });

    it('should handle empty string', () => {
      const ciphertext = encrypt('');
      expect(decrypt(ciphertext)).toBe('');
    });

    it('should handle long strings', () => {
      const longString = 'a'.repeat(1000);
      const ciphertext = encrypt(longString);
      expect(decrypt(ciphertext)).toBe(longString);
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const ciphertext = encrypt(specialChars);
      expect(decrypt(ciphertext)).toBe(specialChars);
    });
  });

  describe('decrypt()', () => {
    it('should decrypt what encrypt produces', () => {
      const plaintext = 'sk_test_abc123';
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it('should throw on tampered ciphertext (authentication)', () => {
      const ciphertext = encrypt('secret');
      // Tamper with the ciphertext
      const tampered = ciphertext.slice(0, -2) + 'XX';
      expect(() => decrypt(tampered)).toThrow('Decryption failed');
    });

    it('should throw on invalid format', () => {
      expect(() => decrypt('not-valid-format')).toThrow();
    });

    it('should throw on empty string', () => {
      expect(() => decrypt('')).toThrow();
    });

    it('should throw on corrupted IV', () => {
      const ciphertext = encrypt('test');
      // Corrupt the IV portion
      const corrupted = 'X' + ciphertext.slice(1);
      expect(() => decrypt(corrupted)).toThrow();
    });

    it('should throw on corrupted auth tag', () => {
      const ciphertext = encrypt('test');
      // Corrupt the auth tag (last 16 bytes)
      const corrupted = ciphertext.slice(0, -2) + 'XX';
      expect(() => decrypt(corrupted)).toThrow('Decryption failed');
    });

    it('should throw if wrong ENCRYPTION_KEY used', () => {
      const ciphertext = encrypt('secret');
      
      // Change encryption key
      process.env.ENCRYPTION_KEY = 'b'.repeat(32);
      
      expect(() => decrypt(ciphertext)).toThrow('Decryption failed');
    });
  });

  describe('Security Properties', () => {
    it('should use AES-256-GCM (authenticated encryption)', () => {
      // This test verifies that tampering is detected (GCM property)
      const ciphertext = encrypt('test');
      const tampered = ciphertext.slice(0, -5) + 'XXXXX';
      expect(() => decrypt(tampered)).toThrow('Decryption failed');
    });

    it('should use unique IV per encryption', () => {
      const plaintext = 'same-text';
      const results = new Set();
      
      // Encrypt same text 100 times
      for (let i = 0; i < 100; i++) {
        results.add(encrypt(plaintext));
      }
      
      // All should be unique (different IVs)
      expect(results.size).toBe(100);
    });

    it('should not leak information about plaintext length in error messages', () => {
      // Error messages should not reveal plaintext details
      try {
        decrypt('invalid');
      } catch (error) {
        expect(error.message).not.toContain('plaintext');
        expect(error.message).not.toContain('length');
      }
    });
  });
});


