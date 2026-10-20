import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createContactLimiter, visitorIpKey } from '../../server/middleware/rateLimiting.js';
import rateLimit from 'express-rate-limit';

describe('shop contact rate limit', () => {
  it('stops a flood after the limit and asks the visitor to wait', async () => {
    const app = express();
    app.use(express.json());
    app.post('/api/submissions/contact', createContactLimiter(2), (_req, res) => {
      res.status(201).json({ message: 'sent' });
    });

    const first = await request(app).post('/api/submissions/contact').send({ name: 'Ada' });
    const second = await request(app).post('/api/submissions/contact').send({ name: 'Ada' });
    const third = await request(app).post('/api/submissions/contact').send({ name: 'Ada' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(third.status).toBe(429);
    expect(third.body.message).toBe('Please wait before sending another message.');
  });

  it('counts two requests from the same address as one visitor', async () => {
    const first = { ip: '203.0.113.10' };
    const second = { ip: '203.0.113.10' };
    expect(visitorIpKey(first)).toBe(visitorIpKey(second));
    expect(visitorIpKey({ ip: '203.0.113.11' })).not.toBe(visitorIpKey(first));
    expect(typeof visitorIpKey(first)).toBe('string');

    const app = express();
    app.set('trust proxy', 1);
    app.get('/login', rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 2,
      keyGenerator: visitorIpKey,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({ message: 'Please wait.' });
      },
    }), (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const a1 = await request(app).get('/login').set('X-Forwarded-For', '203.0.113.10');
    const a2 = await request(app).get('/login').set('X-Forwarded-For', '203.0.113.10');
    const a3 = await request(app).get('/login').set('X-Forwarded-For', '203.0.113.10');
    const other = await request(app).get('/login').set('X-Forwarded-For', '203.0.113.11');

    expect(a1.status).toBe(200);
    expect(a2.status).toBe(200);
    expect(a3.status).toBe(429);
    expect(other.status).toBe(200);
  });
});
