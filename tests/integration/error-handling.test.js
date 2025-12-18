import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../server/middleware/errorHandler.js';

describe('Global Error Handling (Rule 6)', () => {
    it('should handle sync route errors globally', async () => {
        const app = express();
        app.get('/error', (req, res) => {
            throw new Error('Sync error');
        });
        app.use(errorHandler);

        const response = await request(app).get('/error');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            error: 'Sync error'
        });
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
        expect(response.body).toEqual({
            error: 'Async error'
        });
    });

    it('should sanitize errors in non-development environment', async () => {
        const app = express();
        app.get('/error', (req, res) => {
            throw new Error('Sensitive data');
        });
        app.use(errorHandler);

        // Mock production-like environment
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const response = await request(app).get('/error');

        expect(response.status).toBe(500);
        expect(response.body.error).toBeDefined();
        expect(response.body.stack).toBeUndefined();

        process.env.NODE_ENV = originalEnv;
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
});
