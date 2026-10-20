/**
 * Integration Tests for Legal Routes
 * Asserts public legal pages render the shared policy date constant and the
 * current copyright year — no stale hardcoded dates.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import legalRoutes from '../../server/routes/legal.routes.js';
import { POLICY_LAST_UPDATED } from '../../server/config/policies.js';

const createTestApp = () => {
  const app = express();
  app.use('/legal', legalRoutes);
  return app;
};

describe('GET /legal/:page', () => {
  const app = createTestApp();

  ['/terms', '/privacy', '/cookies', '/refunds'].forEach((page) => {
    it(`renders ${page} with the policy date and current copyright year`, async () => {
      const res = await request(app).get(`/legal${page}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain(`Last Updated: ${POLICY_LAST_UPDATED}`);
      expect(res.text).not.toContain('November 14, 2025');
      expect(res.text).not.toContain('&copy; 2025');
      expect(res.text).toContain(`&copy; ${new Date().getFullYear()} Right Site Light. All rights reserved.`);
    });
  });
});