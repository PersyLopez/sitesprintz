import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { resetPrismaMocks } from '../utils/integrationTestSetup.js';

vi.mock('../../server/middleware/rateLimiting.js', () => ({
  buildIntakeLimiter: (_req, _res, next) => next(),
  uploadLimiter: (_req, _res, next) => next(),
}));

vi.mock('../../src/config/pricing.config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isSetupOfferActive: vi.fn(() => false),
  };
});

const sendEmailMock = vi.fn().mockResolvedValue({ success: true });
const loggerWarn = vi.fn();

vi.mock('../../server/services/emailService.js', () => ({
  emailService: {
    sendEmail: (...args) => sendEmailMock(...args),
  },
}));

vi.mock('../../server/utils/logger.js', () => ({
  default: {
    warn: (...args) => loggerWarn(...args),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../server/utils/intakePhoto.js', () => ({
  persistIntakePhoto: vi.fn(async () => '/uploads/intake-abc.webp'),
  INTAKE_UPLOADS_DIR: '/tmp',
}));

vi.mock('../../server/middleware/auth.js', () => ({
  requireAdmin: (req, _res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
}));

import { isSetupOfferActive } from '../../src/config/pricing.config.js';
import buildIntakeRoutes from '../../server/routes/buildIntake.routes.js';
import { prisma } from '../../database/db.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/build-intake', buildIntakeRoutes);
  return app;
};

const row = {
  id: 99,
  status: 'unread',
  created_at: new Date('2026-09-02T00:00:00.000Z'),
  data: {
    businessName: 'Jane Salon',
    contactName: 'Jane Doe',
    contactEmail: 'jane@example.com',
    recommendedPlan: 'growth',
  },
};

describe('POST /api/build-intake', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
    isSetupOfferActive.mockReturnValue(false);
    sendEmailMock.mockResolvedValue({ success: true });
    prisma.submissions.create.mockResolvedValue(row);
    prisma.submissions.update.mockResolvedValue({ ...row, status: 'notify_failed' });
  });

  it('creates build_intake submission and sends ops plus customer mail', async () => {
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

  it('marks notify_failed when ADMIN_EMAIL is missing but still writes the row', async () => {
    delete process.env.ADMIN_EMAIL;
    const app = createApp();
    const response = await request(app)
      .post('/api/build-intake')
      .send({
        contactName: 'Jane Doe',
        contactEmail: 'jane@example.com',
        businessName: 'Jane Salon',
        acceptedManagedPlan: true,
      });

    expect(response.status).toBe(201);
    expect(prisma.submissions.create).toHaveBeenCalled();
    expect(prisma.submissions.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'notify_failed' },
      }),
    );
    const logged = JSON.stringify(loggerWarn.mock.calls);
    expect(logged).not.toContain('jane@example.com');
    expect(logged).toContain('99');
  });

  it('rejects missing Growth Managed acknowledgement when the offer is off', async () => {
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

  it('accepts a promo POST without Managed ack', async () => {
    isSetupOfferActive.mockReturnValue(true);
    process.env.ADMIN_EMAIL = 'ops@example.com';
    const app = createApp();
    const response = await request(app)
      .post('/api/build-intake')
      .send({
        contactName: 'Jane',
        contactEmail: 'jane@example.com',
        businessName: 'Salon',
        wantsOrdering: true,
      });

    expect(response.status).toBe(201);
    expect(prisma.submissions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          data: expect.objectContaining({
            recommendedPlan: 'growth',
            planPriceMonthly: 35,
          }),
        }),
      }),
    );
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
        contactName: 'Jane',
        contactEmail: 'jane@example.com',
        businessName: 'Salon',
        website: 'filled-by-bot',
      });

    expect(response.status).toBe(201);
    expect(prisma.submissions.create).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
