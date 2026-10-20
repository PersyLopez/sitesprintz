import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createContactLimiter } from '../../server/middleware/rateLimiting.js';

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
});
