import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';

describe('Rate Limiting & IP Spoofing (Rule 8)', () => {
    // Create a limited app for testing
    const createLimiterApp = () => {
        const app = express();
        app.set('trust proxy', true); // Essential for X-Forwarded-For to work

        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 5, // Limit each IP to 5 requests per window
            standardHeaders: 'draft-7',
            legacyHeaders: false,
        });

        app.get('/api/data', limiter, (req, res) => {
            res.status(200).json({ success: true, ip: req.ip });
        });

        return app;
    };

    it('should rate limit per IP', async () => {
        const app = createLimiterApp();
        const IP = '192.168.1.1';

        // 5 requests should pass
        for (let i = 0; i < 5; i++) {
            const res = await request(app)
                .get('/api/data')
                .set('X-Forwarded-For', IP);
            expect(res.status).toBe(200);
        }

        // 6th should fail
        const res6 = await request(app)
            .get('/api/data')
            .set('X-Forwarded-For', IP);
        expect(res6.status).toBe(429);
    });

    it('should not block different IPs when one is rate limited', async () => {
        const app = createLimiterApp();
        const IP1 = '192.168.1.100';
        const IP2 = '192.168.1.200';

        // Exhaust IP1
        for (let i = 0; i < 5; i++) {
            await request(app)
                .get('/api/data')
                .set('X-Forwarded-For', IP1);
        }

        // IP2 should still work
        const res = await request(app)
            .get('/api/data')
            .set('X-Forwarded-For', IP2);
        expect(res.status).toBe(200);
    });
});
