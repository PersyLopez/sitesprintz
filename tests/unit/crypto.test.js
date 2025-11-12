import { describe, it, expect } from 'vitest';
import { generateRandomPassword, generateToken, generateUUID } from '../../server/utils/crypto.js';

describe('Crypto Utils', () => {
  describe('generateRandomPassword', () => {
    it('should generate password of correct length', () => {
      const password = generateRandomPassword(16);
      expect(password).toHaveLength(16);
    });

    it('should generate different passwords', () => {
      const pass1 = generateRandomPassword();
      const pass2 = generateRandomPassword();
      expect(pass1).not.toBe(pass2);
    });
  });

  describe('generateToken', () => {
    it('should generate hex token', () => {
      const token = generateToken(32);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });
});

