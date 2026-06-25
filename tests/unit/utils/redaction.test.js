import { describe, it, expect } from 'vitest';
import { redactValue, redactObject } from '../../../server/utils/redaction.js';

describe('redaction utilities', () => {
  describe('redactValue', () => {
    it('redacts long values without preserving the full secret', () => {
      const redacted = redactValue('abcdefghijklmnopqrstuvwxyz');
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('abcdefghijklmnopqrstuvwxyz');
    });

    it('handles short values', () => {
      const result = redactValue('short');
      expect(result).toContain('[REDACTED]');
    });

    it('handles null and undefined', () => {
      expect(redactValue(null)).toBeNull();
      expect(redactValue(undefined)).toBeUndefined();
    });
  });

  describe('redactObject', () => {
    it('redacts sensitive object keys', () => {
      const result = redactObject({
        authorization: 'Bearer abcdefghijklmnop',
        normal: 'ok'
      });

      expect(result.authorization).toContain('[REDACTED]');
      expect(result.normal).toBe('ok');
    });

    it('redacts nested sensitive keys recursively', () => {
      const result = redactObject({
        data: {
          csrfToken: '1234567890abcdef',
          refreshToken: 'refreshtokenvaluehere',
          name: 'John'
        },
        normal: 'ok'
      });

      expect(result.data.csrfToken).toContain('[REDACTED]');
      expect(result.data.refreshToken).toContain('[REDACTED]');
      expect(result.data.name).toBe('John');
      expect(result.normal).toBe('ok');
    });

    it('preserves non-sensitive keys including multi-word', () => {
      const result = redactObject({
        'content-type': 'application/json',
        host: 'localhost',
        accept: 'text/html',
        connection: 'keep-alive'
      });

      expect(result['content-type']).toBe('application/json');
      expect(result.host).toBe('localhost');
      expect(result.accept).toBe('text/html');
      expect(result.connection).toBe('keep-alive');
    });

    it('handles null and non-object input', () => {
      expect(redactObject(null)).toBeNull();
      expect(redactObject('string')).toBe('string');
      expect(redactObject(42)).toBe(42);
    });
  });
});