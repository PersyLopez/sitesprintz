import { describe, it, expect, beforeEach } from 'vitest';

/**
 * 🔴 RED PHASE: ValidationService Unit Tests
 * 
 * These tests are written FIRST, before implementation.
 * All tests should FAIL initially.
 * 
 * Goal: Define the complete API and behavior of ValidationService
 * 
 * Test Coverage:
 * - Email validation (patterns, disposable, MX records)
 * - String sanitization (XSS, length, trimming)
 * - Subdomain validation (format, reserved words, length)
 * - URL validation (protocols, domains, paths)
 * - Password strength (complexity, common passwords)
 * - Number validation (ranges, types, edge cases)
 * - Object validation (depth, size, schema)
 * - Array validation (length, element types)
 * - Date validation (formats, ranges)
 * - JSON validation (parsing, size, depth)
 */

// Import the service we're about to build
import { ValidationService } from '../../server/services/validationService.js';

describe('ValidationService - Email Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'test+tag@example.co.uk',
        'user123@sub.domain.com',
        'a@b.c',
        'test_user@example-domain.org'
      ];

      validEmails.forEach(email => {
        const result = validator.validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com', // space
        'user@exam ple.com', // space
        'user..double@example.com', // consecutive dots
        'user@.example.com', // starts with dot
        'user@example..com', // consecutive dots
        'user@-example.com', // starts with dash
        'user@example-.com', // ends with dash
        ''
      ];

      invalidEmails.forEach(email => {
        const result = validator.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('invalid');
      });
    });

    it('should handle edge cases', () => {
      // Null/undefined
      expect(validator.validateEmail(null).isValid).toBe(false);
      expect(validator.validateEmail(undefined).isValid).toBe(false);
      expect(validator.validateEmail('').isValid).toBe(false);

      // Extremely long email
      const longEmail = 'a'.repeat(300) + '@example.com';
      expect(validator.validateEmail(longEmail).isValid).toBe(false);
      expect(validator.validateEmail(longEmail).error).toContain('too long');

      // Unicode characters
      const unicodeEmail = 'user🎉@example.com';
      expect(validator.validateEmail(unicodeEmail).isValid).toBe(false);
    });

    it('should check for disposable email providers when requested', () => {
      const result = validator.validateEmail('test@mailinator.com', { checkDisposable: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('disposable');
    });

    it('should normalize email addresses', () => {
      const result = validator.validateEmail('  USER@EXAMPLE.COM  ', { normalize: true });
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('user@example.com');
    });
  });

  describe('isDisposableEmail', () => {
    it('should detect common disposable email providers', () => {
      const disposable = [
        'test@mailinator.com',
        'test@guerrillamail.com',
        'test@10minutemail.com',
        'test@throwaway.email',
        'test@tempmail.com'
      ];

      disposable.forEach(email => {
        expect(validator.isDisposableEmail(email)).toBe(true);
      });
    });

    it('should allow legitimate email providers', () => {
      const legitimate = [
        'user@gmail.com',
        'user@yahoo.com',
        'user@outlook.com',
        'user@company.com'
      ];

      legitimate.forEach(email => {
        expect(validator.isDisposableEmail(email)).toBe(false);
      });
    });
  });
});

describe('ValidationService - String Validation & Sanitization', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('sanitizeString', () => {
    it('should remove XSS attack vectors', () => {
      const xssAttacks = [
        { input: '<script>alert("xss")</script>', expected: 'alert("xss")' },
        { input: '<img src=x onerror=alert(1)>', expected: '' },
        { input: 'Hello <b>World</b>', expected: 'Hello World' },
        { input: '<iframe src="evil.com"></iframe>', expected: '' },
        { input: '"><script>alert(1)</script>', expected: '">alert(1)' },
        { input: 'javascript:alert(1)', expected: 'alert(1)' },
        { input: '<svg onload=alert(1)>', expected: '' }
      ];

      xssAttacks.forEach(({ input, expected }) => {
        const result = validator.sanitizeString(input);
        expect(result).toBe(expected);
        expect(result).not.toContain('<script');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
      });
    });

    it('should handle SQL injection attempts gracefully', () => {
      const sqlInjection = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1; DELETE FROM users"
      ];

      // Should not throw, just sanitize
      sqlInjection.forEach(input => {
        expect(() => validator.sanitizeString(input)).not.toThrow();
        const result = validator.sanitizeString(input);
        expect(result).toBeDefined();
      });
    });

    it('should trim whitespace by default', () => {
      expect(validator.sanitizeString('  hello  ')).toBe('hello');
      expect(validator.sanitizeString('\n\tworld\n')).toBe('world');
    });

    it('should enforce length limits', () => {
      const longString = 'a'.repeat(10000);
      const result = validator.sanitizeString(longString, { maxLength: 500 });
      expect(result.length).toBeLessThanOrEqual(500);
    });

    it('should escape HTML when requested', () => {
      const result = validator.sanitizeString('<div>Test & "quotes"</div>', { escape: true });
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
    });

    it('should handle null/undefined/empty gracefully', () => {
      expect(validator.sanitizeString(null)).toBe('');
      expect(validator.sanitizeString(undefined)).toBe('');
      expect(validator.sanitizeString('')).toBe('');
    });

    it('should preserve safe content', () => {
      const safeStrings = [
        'Hello World',
        'Email: test@example.com',
        'Price: $99.99',
        '2024-01-15',
        'Normal text with punctuation!'
      ];

      safeStrings.forEach(str => {
        expect(validator.sanitizeString(str)).toBe(str);
      });
    });
  });

  describe('validateLength', () => {
    it('should validate string length within range', () => {
      expect(validator.validateLength('hello', 1, 10).isValid).toBe(true);
      expect(validator.validateLength('hi', 2, 2).isValid).toBe(true);
    });

    it('should reject strings that are too short', () => {
      const result = validator.validateLength('hi', 5, 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 5');
    });

    it('should reject strings that are too long', () => {
      const result = validator.validateLength('hello world', 1, 5);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at most 5');
    });

    it('should handle edge cases', () => {
      expect(validator.validateLength('', 0, 10).isValid).toBe(true);
      expect(validator.validateLength(null, 0, 10).isValid).toBe(false);
      expect(validator.validateLength(undefined, 0, 10).isValid).toBe(false);
    });
  });
});

describe('ValidationService - Subdomain Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('validateSubdomain', () => {
    it('should accept valid subdomains', () => {
      const valid = [
        'mysite',
        'my-site',
        'site123',
        'abc',
        's1t3-n4m3'
      ];

      valid.forEach(subdomain => {
        const result = validator.validateSubdomain(subdomain);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid subdomain formats', () => {
      const invalid = [
        'My-Site', // uppercase
        'my_site', // underscore
        '-mysite', // starts with dash
        'mysite-', // ends with dash
        'my..site', // consecutive dots
        'my site', // space
        'my@site', // special char
        'ab', // too short (< 3 chars)
        'a'.repeat(64) // too long (> 63 chars)
      ];

      invalid.forEach(subdomain => {
        const result = validator.validateSubdomain(subdomain);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject reserved subdomains', () => {
      const reserved = [
        'www',
        'api',
        'admin',
        'app',
        'dashboard',
        'blog',
        'support',
        'help',
        'status',
        'mail',
        'ftp'
      ];

      reserved.forEach(subdomain => {
        const result = validator.validateSubdomain(subdomain);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('reserved');
      });
    });

    it('should reject profanity and inappropriate words', () => {
      const inappropriate = ['spam', 'porn', 'xxx', 'hack'];

      inappropriate.forEach(subdomain => {
        const result = validator.validateSubdomain(subdomain);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('not allowed');
      });
    });
  });

  describe('isReservedSubdomain', () => {
    it('should identify reserved system subdomains', () => {
      expect(validator.isReservedSubdomain('www')).toBe(true);
      expect(validator.isReservedSubdomain('api')).toBe(true);
      expect(validator.isReservedSubdomain('admin')).toBe(true);
    });

    it('should allow non-reserved subdomains', () => {
      expect(validator.isReservedSubdomain('mybusiness')).toBe(false);
      expect(validator.isReservedSubdomain('acme-corp')).toBe(false);
    });
  });
});

describe('ValidationService - URL Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('validateURL', () => {
    it('should accept valid URLs', () => {
      const valid = [
        'https://example.com',
        'http://sub.domain.com',
        'https://example.com/path',
        'https://example.com/path?query=1',
        'https://example.com:8080',
        'https://192.168.1.1'
      ];

      valid.forEach(url => {
        const result = validator.validateURL(url);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalid = [
        'not-a-url',
        'ftp://example.com', // wrong protocol
        'javascript:alert(1)', // XSS vector
        '//example.com', // protocol-relative
        'http://',
        'http://ex ample.com' // space
      ];

      invalid.forEach(url => {
        const result = validator.validateURL(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should restrict protocols when specified', () => {
      const httpsOnly = validator.validateURL('http://example.com', {
        allowedProtocols: ['https']
      });
      expect(httpsOnly.isValid).toBe(false);
      expect(httpsOnly.error).toContain('protocol');

      const httpsOk = validator.validateURL('https://example.com', {
        allowedProtocols: ['https']
      });
      expect(httpsOk.isValid).toBe(true);
    });

    it('should validate URL length', () => {
      const longURL = 'https://example.com/' + 'a'.repeat(3000);
      const result = validator.validateURL(longURL);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });
});

describe('ValidationService - Password Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong passwords', () => {
      const strong = [
        'MyP@ssw0rd!',
        'Str0ng#Pass',
        'C0mpl3x!ty_Rules',
        'Secur3$Password'
      ];

      strong.forEach(password => {
        const result = validator.validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
        expect(result.strength).toBeGreaterThanOrEqual(3); // Strong
      });
    });

    it('should reject weak passwords', () => {
      const weak = [
        'password',
        '12345678',
        'abcdefgh',
        'Password', // no number/special
        'pass123', // too short
        ''
      ];

      weak.forEach(password => {
        const result = validator.validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should check for common passwords', () => {
      const common = [
        'password123',
        'qwerty',
        'admin',
        'letmein',
        '123456'
      ];

      common.forEach(password => {
        const result = validator.validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('common');
      });
    });

    it('should enforce minimum complexity requirements', () => {
      // No uppercase
      expect(validator.validatePasswordStrength('abcd1234!').error).toContain('uppercase');

      // No lowercase
      expect(validator.validatePasswordStrength('ABCD1234!').error).toContain('lowercase');

      // No number
      expect(validator.validatePasswordStrength('Abcdefgh!').error).toContain('number');

      // No special character
      expect(validator.validatePasswordStrength('Abcd1234').error).toContain('special');

      // Too short
      expect(validator.validatePasswordStrength('Ab1!').error).toContain('at least 8');
    });

    it('should return strength score', () => {
      const weak = validator.validatePasswordStrength('password');
      expect(weak.strength).toBe(0);

      const medium = validator.validatePasswordStrength('Password123');
      expect(medium.strength).toBeGreaterThanOrEqual(2);

      const strong = validator.validatePasswordStrength('MyP@ssw0rd!2024');
      expect(strong.strength).toBe(4);
    });
  });
});

describe('ValidationService - Number Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('validateNumber', () => {
    it('should validate numbers within range', () => {
      expect(validator.validateNumber(5, { min: 1, max: 10 }).isValid).toBe(true);
      expect(validator.validateNumber(0, { min: 0, max: 100 }).isValid).toBe(true);
    });

    it('should reject numbers outside range', () => {
      const result = validator.validateNumber(15, { min: 1, max: 10 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('between');
    });

    it('should handle edge cases', () => {
      expect(validator.validateNumber(NaN).isValid).toBe(false);
      expect(validator.validateNumber(Infinity).isValid).toBe(false);
      expect(validator.validateNumber(-Infinity).isValid).toBe(false);
      expect(validator.validateNumber(null).isValid).toBe(false);
      expect(validator.validateNumber(undefined).isValid).toBe(false);
      expect(validator.validateNumber('not a number').isValid).toBe(false);
    });

    it('should validate integers when requested', () => {
      expect(validator.validateNumber(5, { integer: true }).isValid).toBe(true);
      expect(validator.validateNumber(5.5, { integer: true }).isValid).toBe(false);
    });

    it('should validate positive numbers when requested', () => {
      expect(validator.validateNumber(5, { positive: true }).isValid).toBe(true);
      expect(validator.validateNumber(-5, { positive: true }).isValid).toBe(false);
      expect(validator.validateNumber(0, { positive: true }).isValid).toBe(false);
    });
  });
});

describe('ValidationService - Object Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('validateObject', () => {
    it('should validate object against schema', () => {
      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', min: 0, max: 150 },
        email: { type: 'email' }
      };

      const valid = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      };

      const result = validator.validateObject(valid, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const schema = {
        name: { type: 'string', required: true }
      };

      const result = validator.validateObject({}, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].message).toContain('required');
    });

    it('should validate nested objects', () => {
      const schema = {
        user: {
          type: 'object',
          schema: {
            name: { type: 'string', required: true },
            email: { type: 'email', required: true }
          }
        }
      };

      const invalid = {
        user: {
          name: 'John'
          // missing email
        }
      };

      const result = validator.validateObject(invalid, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('user.email');
    });

    it('should reject objects that are too deep', () => {
      const deepObject = { level1: { level2: { level3: { level4: { level5: {} } } } } };
      const result = validator.validateObject(deepObject, {}, { maxDepth: 3 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('deep');
    });

    it('should reject objects that are too large', () => {
      const largeObject = {};
      for (let i = 0; i < 10000; i++) {
        largeObject[`key${i}`] = 'value';
      }

      const result = validator.validateObject(largeObject, {}, { maxKeys: 100 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too many keys');
    });

    it('should reject unknown fields in strict mode', () => {
      const schema = { name: { type: 'string' } };
      const data = { name: 'John', unknown: 'field' };

      const result = validator.validateObject(data, schema, { strict: true });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('unknown');
      expect(result.errors[0].message).toContain('not allowed');
    });
  });

  describe('checkObjectDepth', () => {
    it('should calculate object depth correctly', () => {
      expect(validator.checkObjectDepth({})).toBe(1);
      expect(validator.checkObjectDepth({ a: 1 })).toBe(1);
      expect(validator.checkObjectDepth({ a: { b: 1 } })).toBe(2);
      expect(validator.checkObjectDepth({ a: { b: { c: 1 } } })).toBe(3);
    });

    it('should handle arrays in depth calculation', () => {
      expect(validator.checkObjectDepth({ arr: [1, 2, 3] })).toBe(2);
      expect(validator.checkObjectDepth({ arr: [{ nested: true }] })).toBe(3);
    });

    it('should detect circular references', () => {
      const circular = { a: 1 };
      circular.self = circular;

      expect(() => validator.checkObjectDepth(circular)).not.toThrow();
      expect(validator.checkObjectDepth(circular)).toBe(-1); // Indicates circular
    });
  });
});

describe('ValidationService - Array Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('validateArray', () => {
    it('should validate array length', () => {
      expect(validator.validateArray([1, 2, 3], { minLength: 1, maxLength: 5 }).isValid).toBe(true);
      expect(validator.validateArray([1], { minLength: 2 }).isValid).toBe(false);
      expect(validator.validateArray([1, 2, 3], { maxLength: 2 }).isValid).toBe(false);
    });

    it('should validate element types', () => {
      const result = validator.validateArray([1, 2, 3], { elementType: 'number' });
      expect(result.isValid).toBe(true);

      const mixed = validator.validateArray([1, 'two', 3], { elementType: 'number' });
      expect(mixed.isValid).toBe(false);
      expect(mixed.errors[0].index).toBe(1);
    });

    it('should validate each element against schema', () => {
      const schema = { type: 'object', schema: { id: { type: 'number', required: true } } };
      const valid = [{ id: 1 }, { id: 2 }];
      const invalid = [{ id: 1 }, { name: 'missing id' }];

      expect(validator.validateArray(valid, schema).isValid).toBe(true);
      expect(validator.validateArray(invalid, schema).isValid).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validator.validateArray(null).isValid).toBe(false);
      expect(validator.validateArray(undefined).isValid).toBe(false);
      expect(validator.validateArray('not an array').isValid).toBe(false);
      expect(validator.validateArray([]).isValid).toBe(true);
    });
  });
});

describe('ValidationService - Date Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('validateDate', () => {
    it('should accept valid dates', () => {
      const valid = [
        new Date(),
        new Date('2024-01-15'),
        '2024-01-15',
        '2024-01-15T10:30:00Z',
        Date.now()
      ];

      valid.forEach(date => {
        const result = validator.validateDate(date);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid dates', () => {
      const invalid = [
        'not a date',
        'Invalid Date',
        NaN,
        null,
        undefined
      ];

      invalid.forEach(date => {
        const result = validator.validateDate(date);
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate date ranges', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000); // yesterday
      const future = new Date(now.getTime() + 86400000); // tomorrow

      expect(validator.validateDate(now, { min: past, max: future }).isValid).toBe(true);
      expect(validator.validateDate(past, { min: now }).isValid).toBe(false);
      expect(validator.validateDate(future, { max: now }).isValid).toBe(false);
    });

    it('should parse common date formats', () => {
      const formats = [
        '2024-01-15',
        '01/15/2024',
        '2024-01-15T10:30:00Z',
        '2024-01-15 10:30:00'
      ];

      formats.forEach(format => {
        const result = validator.validateDate(format);
        expect(result.isValid).toBe(true);
        expect(result.parsed).toBeInstanceOf(Date);
      });
    });
  });
});

describe('ValidationService - JSON Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('safeJSONParse', () => {
    it('should parse valid JSON', () => {
      const valid = ['{"name": "test"}', '[1, 2, 3]', '"string"', 'true', 'null'];

      valid.forEach(json => {
        const result = validator.safeJSONParse(json);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });

    it('should reject invalid JSON', () => {
      const invalid = [
        '{invalid}',
        '{"unterminated":',
        'undefined',
        'NaN',
        "'single quotes'"
      ];

      invalid.forEach(json => {
        const result = validator.safeJSONParse(json);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should enforce size limits (DoS prevention)', () => {
      const huge = '{"a":' + '"x"'.repeat(1000000) + '}';
      const result = validator.safeJSONParse(huge, { maxSize: 10000 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should detect deeply nested objects (DoS prevention)', () => {
      let nested = '{"a":1';
      for (let i = 0; i < 1000; i++) {
        nested += ',{"b":1';
      }
      nested += '}}}'.repeat(1000);

      const result = validator.safeJSONParse(nested, { maxDepth: 10 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('deep');
    });

    it('should handle edge cases safely', () => {
      expect(validator.safeJSONParse(null).success).toBe(false);
      expect(validator.safeJSONParse(undefined).success).toBe(false);
      expect(validator.safeJSONParse('').success).toBe(false);
      expect(() => validator.safeJSONParse('malicious')).not.toThrow();
    });
  });
});

describe('ValidationService - Enum Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('validateEnum', () => {
    it('should accept values in allowed list', () => {
      const allowed = ['apple', 'banana', 'orange'];
      expect(validator.validateEnum('apple', allowed).isValid).toBe(true);
      expect(validator.validateEnum('banana', allowed).isValid).toBe(true);
    });

    it('should reject values not in allowed list', () => {
      const allowed = ['apple', 'banana', 'orange'];
      const result = validator.validateEnum('grape', allowed);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be one of');
      expect(result.error).toContain('apple');
    });

    it('should handle case-insensitive comparison when requested', () => {
      const allowed = ['apple', 'banana'];
      expect(validator.validateEnum('APPLE', allowed, { caseSensitive: false }).isValid).toBe(true);
      expect(validator.validateEnum('APPLE', allowed, { caseSensitive: true }).isValid).toBe(false);
    });
  });
});

describe('ValidationService - Composite Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('validateAll', () => {
    it('should run multiple validators and return all errors', () => {
      const validators = [
        () => ({ isValid: false, error: 'Error 1' }),
        () => ({ isValid: false, error: 'Error 2' }),
        () => ({ isValid: true })
      ];

      const result = validator.validateAll(validators);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should pass when all validators pass', () => {
      const validators = [
        () => ({ isValid: true }),
        () => ({ isValid: true })
      ];

      const result = validator.validateAll(validators);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should short-circuit when requested', () => {
      let runCount = 0;
      const validators = [
        () => { runCount++; return { isValid: false, error: 'Early fail' }; },
        () => { runCount++; return { isValid: true }; },
        () => { runCount++; return { isValid: true }; }
      ];

      validator.validateAll(validators, { shortCircuit: true });
      expect(runCount).toBe(1); // Should stop after first failure
    });
  });
});

