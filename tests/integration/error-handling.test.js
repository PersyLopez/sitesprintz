import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import { notFoundHandler } from '../../server/middleware/notFoundHandler.js';
import { sendError } from '../../server/utils/apiResponse.js';

describe('Global Error Handling (Rule 6)', () => {
    it('should handle sync route errors globally', async () => {
        const app = express();
        app.get('/error', (req, res) => {
            throw new Error('Sync error');
        });
        app.use(errorHandler);

        const response = await request(app).get('/error');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Sync error');
    });

    it('should handle async route errors globally (Express 5)', async () => {
        const app = express();
        // Express 5 handles rejected promises automatically
        app.get('/async-error', async (req, res) => {
            throw new Error('Async error');
        });
        app.use(errorHandler);

        const response = await request(app).get('/async-error');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Async error');
    });

    it('should not expose stack traces in production', async () => {
        const app = express();
        app.get('/error', (req, res) => {
            throw new Error('Sensitive data');
        });
        app.use(errorHandler);

        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const response = await request(app).get('/error');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
        expect(response.body).not.toHaveProperty('stack');

        process.env.NODE_ENV = originalEnv;
    });

    it('should not expose stack traces in development without EXPOSE_ERROR_DETAILS', async () => {
        const app = express();
        app.get('/error', (req, res) => {
            throw new Error('Sensitive data');
        });
        app.use(errorHandler);

        const originalEnv = process.env.NODE_ENV;
        const originalExpose = process.env.EXPOSE_ERROR_DETAILS;
        process.env.NODE_ENV = 'development';
        process.env.EXPOSE_ERROR_DETAILS = undefined;

        const response = await request(app).get('/error');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
        expect(response.body).not.toHaveProperty('stack');

        process.env.NODE_ENV = originalEnv;
        process.env.EXPOSE_ERROR_DETAILS = originalExpose;
    });

    it('should expose stack traces in development only when EXPOSE_ERROR_DETAILS=true', async () => {
        const app = express();
        app.get('/error', (req, res) => {
            throw new Error('Debug this');
        });
        app.use(errorHandler);

        const originalEnv = process.env.NODE_ENV;
        const originalExpose = process.env.EXPOSE_ERROR_DETAILS;
        process.env.NODE_ENV = 'development';
        process.env.EXPOSE_ERROR_DETAILS = 'true';

        const response = await request(app).get('/error');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('stack');
        expect(typeof response.body.stack).toBe('string');

        process.env.NODE_ENV = originalEnv;
        process.env.EXPOSE_ERROR_DETAILS = originalExpose;
    });

    it('should respect custom status codes on error objects', async () => {
        const app = express();
        app.get('/403', (req, res) => {
            const error = new Error('Forbidden');
            error.statusCode = 403;
            throw error;
        });
        app.use(errorHandler);

        const response = await request(app).get('/403');

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Forbidden');
    });

    it('should return consistent JSON shape with success: false', async () => {
        const app = express();
        app.get('/error', (req, res) => {
            throw new Error('Test error');
        });
        app.use(errorHandler);

        const response = await request(app).get('/error');

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(Object.keys(response.body)).not.toContain('stack'); // Default: no stack
    });
});

describe('Not Found Handler', () => {
    it('should return JSON 404 for missing API endpoints', async () => {
        const app = express();
        app.use(notFoundHandler);
        app.use(errorHandler);

        const response = await request(app).get('/api/nonexistent');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Endpoint not found');
        expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return HTML 404 for missing HTML pages', async () => {
        const app = express();
        app.use(notFoundHandler);
        app.use(errorHandler);

        const response = await request(app).get('/nonexistent-page');

        expect(response.status).toBe(404);
        expect(response.type).toMatch(/html/);
        expect(response.text).toContain('404');
        expect(response.text).toContain("doesn't exist");
    });

    it('should not expose filesystem paths or stack traces in 404 responses', async () => {
        const app = express();
        app.use(notFoundHandler);
        app.use(errorHandler);

        const response = await request(app).get('/api/some/nested/path');

        expect(response.status).toBe(404);
        expect(JSON.stringify(response.body)).not.toMatch(/\/Users|\/var|\.js|stackTrace/i);
    });

    it('should handle static file 404s gracefully', async () => {
        const app = express();
        app.get('/sites/:siteId/nonexistent-file.css', (req, res) => {
            res.status(404).send('Not Found');
        });
        app.use(notFoundHandler);
        app.use(errorHandler);

        const response = await request(app).get('/sites/demo-site/missing.css');

        expect(response.status).toBe(404);
    });
});

