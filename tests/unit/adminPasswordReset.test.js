/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('../../server/utils/email-service-wrapper.js', () => ({
  sendEmail: vi.fn(() => Promise.resolve({ success: true })),
  EmailTypes: { PASSWORD_RESET: 'passwordReset' },
}));

import { sendEmail } from '../../server/utils/email-service-wrapper.js';
import { prisma } from '../../database/db.js';
import adminRoutes from '../../server/routes/admin.routes.js';

function adminApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  return app;
}

describe('POST /api/admin/users/:userId/reset-password', () => {
  const previousSite = process.env.SITE_URL;
  const previousBase = process.env.BASE_URL;

  beforeEach(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    delete process.env.SITE_URL;
    process.env.BASE_URL = 'https://rightsitelight.com';
    sendEmail.mockClear();
    prisma.users.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === 'admin-1') {
        return {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          status: 'active',
          email_verified: true,
        };
      }
      if (where.id === 'owner-1') {
        return { id: 'owner-1', email: 'owner@example.com' };
      }
      return null;
    });
    prisma.users.update.mockResolvedValue({ id: 'owner-1' });
  });

  afterEach(() => {
    if (previousSite === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previousSite;
    if (previousBase === undefined) delete process.env.BASE_URL;
    else process.env.BASE_URL = previousBase;
  });

  it('emails the same reset link the public forgot-password path builds', async () => {
    const token = jwt.sign({ userId: 'admin-1' }, process.env.JWT_SECRET);

    const response = await request(adminApp())
      .post('/api/admin/users/owner-1/reset-password')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const templateData = sendEmail.mock.calls[0][2];
    expect(templateData.resetLink).toMatch(/^https:\/\/rightsitelight\.com\/reset-password\?token=[a-f0-9]{64}$/);
    expect(templateData.email).toBe('owner@example.com');
  });
});
