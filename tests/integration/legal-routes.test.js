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

const PAGE_DESCRIPTIONS = {
  '/terms': 'Terms of Service for Right Site Light.',
  '/privacy': 'Privacy Policy for Right Site Light.',
  '/cookies': 'Cookie Policy for Right Site Light.',
  '/refunds': 'Refund and cancellation policy for Right Site Light.',
  '/third-party-services': 'Third-party services disclosure for Right Site Light.',
};

describe('GET /legal/:page', () => {
  const app = createTestApp();

  Object.keys(PAGE_DESCRIPTIONS).forEach((page) => {
    it(`renders ${page} with its meta description, the policy date and current copyright year`, async () => {
      const res = await request(app).get(`/legal${page}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain(`<meta name="description" content="${PAGE_DESCRIPTIONS[page]}">`);
      expect(res.text).toContain(`Last Updated: ${POLICY_LAST_UPDATED}`);
      expect(res.text).not.toContain('November 14, 2025');
      expect(res.text).not.toContain('&copy; 2025');
      expect(res.text).toContain(`&copy; ${new Date().getFullYear()} Right Site Light. All rights reserved.`);
    });
  });
});