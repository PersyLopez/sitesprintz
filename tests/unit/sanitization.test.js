import { describe, it, expect } from 'vitest';
import { 
  sanitizeString, 
  sanitizeEmail, 
  sanitizeSubdomain,
  sanitizePhone,
  stripHTML,
  sanitizeFilename
} from '../../server/utils/sanitization.js';

describe('Sanitization Utils', () => {
  describe('sanitizeString', () => {
    it('should trim and limit string length', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('a'.repeat(600), 100)).toBe('a'.repeat(100));
    });

    it('should handle non-strings', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(123)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should lowercase and trim emails', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    });
  });

  describe('sanitizeSubdomain', () => {
    it('should lowercase and remove invalid characters', () => {
      expect(sanitizeSubdomain('My-Site!')).toBe('my-site');
      expect(sanitizeSubdomain('TEST_123')).toBe('test123');
    });
  });

  describe('sanitizePhone', () => {
    it('should remove non-digit characters except +', () => {
      expect(sanitizePhone('(555) 123-4567')).toBe('5551234567');
      expect(sanitizePhone('+1 555 123 4567')).toBe('+15551234567');
    });
  });

  describe('stripHTML', () => {
    it('should remove HTML tags', () => {
      expect(stripHTML('<p>Hello <b>World</b></p>')).toBe('Hello World');
      expect(stripHTML('<script>alert("XSS")</script>')).toBe('alert("XSS")');
    });
  });

  describe('sanitizeFilename', () => {
    it('should create safe filenames', () => {
      expect(sanitizeFilename('my file.txt')).toBe('my_file.txt');
      expect(sanitizeFilename('../../../etc/passwd')).toBe('.._.._.._etc_passwd');
    });
  });
});

