import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

/**
 * 🔴 RED PHASE: Validation Middleware Integration Tests
 * 
 * These tests validate the HTTP request/response behavior
 * of validation middleware across real Express routes.
 * 
 * Test Coverage:
 * - Body validation
 * - Query parameter validation
 * - URL parameter validation
 * - Error response format
 * - Sanitization of user input
 * - Performance (validation speed)
 * - Size limits (DoS prevention)
 */

// Import middleware we're about to enhance
import { validate, schemas } from '../../server/middleware/validation.js';
import { ValidationService } from '../../server/services/validationService.js';

describe('Validation Middleware - Body Validation', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json({ limit: '10mb' }));
  });

  it('should pass valid request bodies through', async () => {
    app.post('/test', validate({ body: 'register' }), (req, res) => {
      res.json({ success: true, data: req.body });
    });

    const response = await request(app)
      .post('/test')
      .send({
        email: 'test@example.com',
        password: 'SecureP@ss123'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should reject invalid request bodies with 400', async () => {
    app.post('/test', validate({ body: 'register' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({
        email: 'not-an-email',
        password: '123' // too short
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
    expect(response.body.details).toBeInstanceOf(Array);
  });

  it('should return detailed validation errors', async () => {
    app.post('/test', validate({ body: 'register' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({
        email: 'bad-email',
        password: 'short'
      });

    expect(response.status).toBe(400);
    expect(response.body.details).toHaveLength(2);
    expect(response.body.details[0].field).toBeDefined();
    expect(response.body.details[0].message).toBeDefined();
    expect(response.body.details[0].rule).toBeDefined();
  });

  it('should validate required fields', async () => {
    app.post('/test', validate({ body: 'register' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({
        // Missing email and password
      });

    expect(response.status).toBe(400);
    expect(response.body.details).toHaveLength(2);
    expect(response.body.details.map(e => e.field)).toContain('email');
    expect(response.body.details.map(e => e.field)).toContain('password');
  });

  it('should allow optional fields to be missing', async () => {
    app.post('/test', validate({ body: 'createSite' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({
        subdomain: 'mysite',
        templateId: 'template-123'
        // siteData is optional
      });

    expect(response.status).toBe(200);
  });

  it('should validate nested objects', async () => {
    const nestedSchema = {
      user: {
        type: 'object',
        schema: {
          name: { type: 'string', required: true },
          email: { type: 'email', required: true }
        }
      }
    };

    schemas.nested = nestedSchema;

    app.post('/test', validate({ body: 'nested' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({
        user: {
          name: 'John Doe'
          // Missing email
        }
      });

    expect(response.status).toBe(400);
    expect(response.body.details[0].field).toBe('user.email');
  });
});

describe('Validation Middleware - Sanitization', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should sanitize XSS from string inputs', async () => {
    app.post('/test', validate({ body: 'contactForm', sanitize: true }), (req, res) => {
      res.json({ sanitized: req.body });
    });

    const response = await request(app)
      .post('/test')
      .send({
        name: '<script>alert("xss")</script>John',
        email: 'test@example.com',
        message: 'Hello <b>World</b>',
        site: 'mysite'
      });

    expect(response.status).toBe(200);
    expect(response.body.sanitized.name).not.toContain('<script');
    expect(response.body.sanitized.message).not.toContain('<b>');
  });

  it('should trim whitespace from strings', async () => {
    app.post('/test', validate({ body: 'register', sanitize: true }), (req, res) => {
      res.json({ sanitized: req.body });
    });

    const response = await request(app)
      .post('/test')
      .send({
        email: '  test@example.com  ',
        password: '  SecureP@ss123  '
      });

    expect(response.status).toBe(200);
    expect(response.body.sanitized.email).toBe('test@example.com');
    expect(response.body.sanitized.password).toBe('SecureP@ss123');
  });

  it('should normalize emails to lowercase', async () => {
    app.post('/test', validate({ body: 'register', normalize: true }), (req, res) => {
      res.json({ normalized: req.body });
    });

    const response = await request(app)
      .post('/test')
      .send({
        email: 'TEST@EXAMPLE.COM',
        password: 'SecureP@ss123'
      });

    expect(response.status).toBe(200);
    expect(response.body.normalized.email).toBe('test@example.com');
  });

  it('should handle SQL injection attempts safely', async () => {
    app.post('/test', validate({ body: 'contactForm', sanitize: true }), (req, res) => {
      res.json({ sanitized: req.body });
    });

    const response = await request(app)
      .post('/test')
      .send({
        name: "'; DROP TABLE users; --",
        email: 'test@example.com',
        message: "1' OR '1'='1",
        site: 'mysite'
      });

    // Should not throw, just sanitize
    expect(response.status).toBe(200);
    expect(response.body.sanitized).toBeDefined();
  });
});

describe('Validation Middleware - Query Parameters', () => {
  let app;

  beforeEach(() => {
    app = express();
  });

  it('should validate query parameters', async () => {
    schemas.searchQuery = {
      q: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      page: { type: 'number', min: 1, max: 1000 },
      limit: { type: 'number', min: 1, max: 100 }
    };

    app.get('/search', validate({ query: 'searchQuery' }), (req, res) => {
      res.json({ success: true, query: req.query });
    });

    const response = await request(app)
      .get('/search')
      .query({ q: 'test', page: 1, limit: 10 });

    expect(response.status).toBe(200);
  });

  it('should reject missing required query parameters', async () => {
    schemas.searchQuery = {
      q: { type: 'string', required: true }
    };

    app.get('/search', validate({ query: 'searchQuery' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app).get('/search');

    expect(response.status).toBe(400);
    expect(response.body.details[0].field).toBe('q');
  });

  it('should coerce query parameter types', async () => {
    schemas.paginationQuery = {
      page: { type: 'number' },
      active: { type: 'boolean' }
    };

    app.get('/items', validate({ query: 'paginationQuery', coerce: true }), (req, res) => {
      res.json({ types: { page: typeof req.query.page, active: typeof req.query.active } });
    });

    const response = await request(app)
      .get('/items')
      .query({ page: '5', active: 'true' }); // Strings from URL

    expect(response.status).toBe(200);
    expect(response.body.types.page).toBe('number');
    expect(response.body.types.active).toBe('boolean');
  });
});

describe('Validation Middleware - URL Parameters', () => {
  let app;

  beforeEach(() => {
    app = express();
  });

  it('should validate URL parameters', async () => {
    schemas.siteParams = {
      subdomain: { type: 'string', pattern: /^[a-z0-9-]+$/, minLength: 3 }
    };

    app.get('/sites/:subdomain', validate({ params: 'siteParams' }), (req, res) => {
      res.json({ success: true, subdomain: req.params.subdomain });
    });

    const response = await request(app).get('/sites/mysite');
    expect(response.status).toBe(200);
  });

  it('should reject invalid URL parameters', async () => {
    schemas.siteParams = {
      subdomain: { type: 'string', pattern: /^[a-z0-9-]+$/ }
    };

    app.get('/sites/:subdomain', validate({ params: 'siteParams' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app).get('/sites/MY_SITE'); // Uppercase and underscore
    expect(response.status).toBe(400);
  });

  it('should prevent path traversal attacks', async () => {
    schemas.fileParams = {
      filename: { type: 'string', pattern: /^[a-zA-Z0-9._-]+$/ }
    };

    app.get('/files/:filename', validate({ params: 'fileParams' }), (req, res) => {
      res.json({ success: true });
    });

    const pathTraversal = ['../../../etc/passwd', '..\\windows\\system32', '....//....//'];

    for (const attack of pathTraversal) {
      const response = await request(app).get(`/files/${encodeURIComponent(attack)}`);
      expect(response.status).toBe(400);
    }
  });
});

describe('Validation Middleware - Size Limits (DoS Prevention)', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json({ limit: '10mb' }));
  });

  it('should enforce request body size limits', async () => {
    app.post('/test', validate({ body: 'contactForm', maxSize: 1000 }), (req, res) => {
      res.json({ success: true });
    });

    const hugeMessage = 'a'.repeat(10000);
    const response = await request(app)
      .post('/test')
      .send({
        name: 'Test',
        email: 'test@example.com',
        message: hugeMessage,
        site: 'mysite'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('too large');
  });

  it('should reject deeply nested objects', async () => {
    let deepObject = { a: 1 };
    let current = deepObject;
    for (let i = 0; i < 100; i++) {
      current.nested = { value: i };
      current = current.nested;
    }

    schemas.deepTest = {
      data: { type: 'object' }
    };

    app.post('/test', validate({ body: 'deepTest', maxDepth: 10 }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({ data: deepObject });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('deep');
  });

  it('should reject objects with too many keys', async () => {
    const manyKeys = {};
    for (let i = 0; i < 10000; i++) {
      manyKeys[`key${i}`] = 'value';
    }

    schemas.keysTest = {
      data: { type: 'object' }
    };

    app.post('/test', validate({ body: 'keysTest', maxKeys: 100 }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({ data: manyKeys });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('too many keys');
  });

  it('should reject arrays that are too long', async () => {
    schemas.arrayTest = {
      items: { type: 'array', maxLength: 100 }
    };

    app.post('/test', validate({ body: 'arrayTest' }), (req, res) => {
      res.json({ success: true });
    });

    const longArray = Array(1000).fill('item');
    const response = await request(app)
      .post('/test')
      .send({ items: longArray });

    expect(response.status).toBe(400);
  });
});

describe('Validation Middleware - Strict Mode', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should reject unknown fields in strict mode', async () => {
    app.post('/test', validate({ body: 'login', strict: true }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({
        email: 'test@example.com',
        password: 'SecureP@ss123',
        unknownField: 'should be rejected'
      });

    expect(response.status).toBe(400);
    expect(response.body.details[0].field).toBe('unknownField');
    expect(response.body.details[0].message).toContain('not allowed');
  });

  it('should allow unknown fields by default', async () => {
    app.post('/test', validate({ body: 'login' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({
        email: 'test@example.com',
        password: 'SecureP@ss123',
        extraField: 'allowed'
      });

    expect(response.status).toBe(200);
  });
});

describe('Validation Middleware - Performance', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should validate requests quickly (<5ms for simple validation)', async () => {
    app.post('/test', validate({ body: 'register' }), (req, res) => {
      res.json({ success: true });
    });

    const start = Date.now();

    await request(app)
      .post('/test')
      .send({
        email: 'test@example.com',
        password: 'SecureP@ss123'
      });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5);
  });

  it('should validate 100 requests in <500ms', async () => {
    app.post('/test', validate({ body: 'login' }), (req, res) => {
      res.json({ success: true });
    });

    const start = Date.now();
    const requests = [];

    for (let i = 0; i < 100; i++) {
      requests.push(
        request(app)
          .post('/test')
          .send({
            email: 'test@example.com',
            password: 'password123'
          })
      );
    }

    await Promise.all(requests);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});

describe('Validation Middleware - Error Response Format', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should return standardized error format', async () => {
    app.post('/test', validate({ body: 'register' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({
        email: 'bad-email',
        password: 'short'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('code');
    expect(response.body).toHaveProperty('details');
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should include field-specific errors in details', async () => {
    app.post('/test', validate({ body: 'register' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({
        email: 'bad-email',
        password: 'weak'
      });

    expect(response.body.details).toBeInstanceOf(Array);
    expect(response.body.details[0]).toHaveProperty('field');
    expect(response.body.details[0]).toHaveProperty('message');
    expect(response.body.details[0]).toHaveProperty('rule');
    expect(response.body.details[0]).not.toHaveProperty('value'); // Don't leak sensitive data
  });

  it('should not leak sensitive data in error responses', async () => {
    app.post('/test', validate({ body: 'register' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({
        email: 'test@example.com',
        password: 'super-secret-password-123'
      });

    const errorString = JSON.stringify(response.body);
    expect(errorString).not.toContain('super-secret-password');
  });
});

describe('Validation Middleware - Custom Validators', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should support custom validation functions', async () => {
    schemas.customTest = {
      username: {
        type: 'string',
        custom: (value) => {
          if (value.includes('admin')) {
            return { isValid: false, error: 'Username cannot contain "admin"' };
          }
          return { isValid: true };
        }
      }
    };

    app.post('/test', validate({ body: 'customTest' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({ username: 'admin-user' });

    expect(response.status).toBe(400);
    expect(response.body.details[0].message).toContain('admin');
  });

  it('should support async custom validators', async () => {
    schemas.asyncTest = {
      email: {
        type: 'email',
        customAsync: async (value) => {
          // Simulate checking if email exists in database
          await new Promise(resolve => setTimeout(resolve, 10));
          if (value === 'taken@example.com') {
            return { isValid: false, error: 'Email already registered' };
          }
          return { isValid: true };
        }
      }
    };

    app.post('/test', validate({ body: 'asyncTest' }), (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/test')
      .send({
        email: 'taken@example.com',
        password: 'SecureP@ss123'
      });

    expect(response.status).toBe(400);
    expect(response.body.details[0].message).toContain('already registered');
  });
});

describe('Validation Middleware - Multiple Validation Sources', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should validate body, query, and params simultaneously', async () => {
    schemas.userUpdate = {
      name: { type: 'string', minLength: 1 }
    };

    schemas.userParams = {
      userId: { type: 'string', pattern: /^[0-9]+$/ }
    };

    schemas.userQuery = {
      notify: { type: 'boolean' }
    };

    app.put(
      '/users/:userId',
      validate({
        body: 'userUpdate',
        params: 'userParams',
        query: 'userQuery'
      }),
      (req, res) => {
        res.json({ success: true });
      }
    );

    const response = await request(app)
      .put('/users/123')
      .query({ notify: true })
      .send({ name: 'John Doe' });

    expect(response.status).toBe(200);
  });

  it('should report errors from all validation sources', async () => {
    schemas.multiTest = { field: { type: 'string', required: true } };

    app.post(
      '/test/:id',
      validate({
        body: 'multiTest',
        params: { id: { type: 'string', pattern: /^[0-9]+$/ } },
        query: { page: { type: 'number', required: true } }
      }),
      (req, res) => {
        res.json({ success: true });
      }
    );

    const response = await request(app)
      .post('/test/invalid-id') // Invalid param
      .send({}); // Missing required body field
    // Missing required query param

    expect(response.status).toBe(400);
    expect(response.body.details.length).toBeGreaterThanOrEqual(3);
  });
});

