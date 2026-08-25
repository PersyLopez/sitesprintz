import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { resetPrismaMocks } from '../utils/integrationTestSetup.js';

vi.mock('../../server/middleware/rateLimiting.js', () => ({
  buildIntakeLimiter: (_req, _res, next) => next(),
}));

const sendEmailMock = vi.fn().mockResolvedValue({ success: true });

vi.mock('../../server/services/emailService.js', () => ({
  emailService: {
    sendEmail: (...args) => sendEmailMock(...args),
  },
}));

import buildIntakeRoutes from '../../server/routes/buildIntake.routes.js';
import { prisma } from '../../database/db.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/build-intake', buildIntakeRoutes);
  return app;
};

describe('POST /api/build-intake', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
    prisma.submissions.create.mockResolvedValue({ id: 99 });
  });

  it('creates build_intake submission and queues emails', async () => {
    process.env.ADMIN_EMAIL = 'ops@example.com';
    const app = createApp();
    const response = await request(app)
      .post('/api/build-intake')
      .send({
        contactName: 'Jane Doe',
        contactEmail: 'jane@example.com',
        businessName: 'Jane Salon',
        locationPublic: false,
        serviceAreaLabel: 'Montclair, NJ',
        serviceRadiusMiles: 10,
        features: { booking: true },
        servicesText: 'Cut $40',
        acceptedManagedPlan: true,
      });

    expect(response.status).toBe(201);
    expect(prisma.submissions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          site_id: null,
          form_type: 'build_intake',
          status: 'unread',
          data: expect.objectContaining({
            contactEmail: 'jane@example.com',
            locationPublic: false,
            serviceAreaLabel: 'Montclair, NJ',
            plan: 'growth_managed',
            planPriceMonthly: 75,
          }),
        }),
      }),
    );

    await vi.waitFor(() => {
      expect(sendEmailMock).toHaveBeenCalled();
    });

    expect(sendEmailMock.mock.calls.some(([opts]) => opts.template === 'buildIntakeCustomer')).toBe(true);
    expect(sendEmailMock.mock.calls.some(([opts]) => opts.template === 'buildIntakeOps')).toBe(true);
  });

  it('rejects missing Growth Managed acknowledgement', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/build-intake')
      .send({
        contactName: 'Jane',
        contactEmail: 'jane@example.com',
        businessName: 'Salon',
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('MISSING_PLAN_ACK');
    expect(prisma.submissions.create).not.toHaveBeenCalled();
  });

  it('rejects missing business name', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/build-intake')
      .send({
        contactName: 'Jane',
        contactEmail: 'jane@example.com',
        acceptedManagedPlan: true,
      });

    expect(response.status).toBe(400);
    expect(prisma.submissions.create).not.toHaveBeenCalled();
  });

  it('accepts honeypot spam silently', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/build-intake')
      .send({
        ...{
          contactName: 'Jane',
          contactEmail: 'jane@example.com',
          businessName: 'Salon',
        },
        website: 'filled-by-bot',
      });

    expect(response.status).toBe(201);
    expect(prisma.submissions.create).not.toHaveBeenCalled();
  });
});
