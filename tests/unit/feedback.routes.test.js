import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { resetPrismaMocks } from '../utils/integrationTestSetup.js';

vi.mock('../../server/middleware/rateLimiting.js', () => ({
  feedbackLimiter: (_req, _res, next) => next(),
}));

vi.mock('../../server/utils/email-service-wrapper.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  sendAdminNotification: vi.fn().mockResolvedValue({ success: true }),
  EmailTypes: { CONTACT_FORM_SUBMISSION: 'contactFormSubmission' },
}));

import feedbackRoutes from '../../server/routes/feedback.routes.js';
import { prisma } from '../../database/db.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/feedback', feedbackRoutes);
  return app;
};

describe('POST /api/feedback', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
    prisma.submissions.create.mockResolvedValue({ id: 42 });
  });

  it('creates platform feedback submission', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/feedback')
      .send({
        type: 'bug',
        message: 'Checkout button does nothing',
        email: 'tester@example.com',
        url: 'https://app.example.com/dashboard',
      });

    expect(response.status).toBe(201);
    expect(prisma.submissions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          site_id: null,
          form_type: 'platform_feedback',
          status: 'unread',
        }),
      })
    );
  });

  it('rejects missing message', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/feedback')
      .send({ type: 'bug' });

    expect(response.status).toBe(400);
    expect(prisma.submissions.create).not.toHaveBeenCalled();
  });
});
