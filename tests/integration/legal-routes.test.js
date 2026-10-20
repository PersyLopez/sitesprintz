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

      // QA AX-02: policy content must live inside a <main> landmark that
      // opens immediately after <body>; the footer stays outside as a
      // footer landmark.
      expect(res.text).toMatch(/<body>\s*<main>/);
      const mainStart = res.text.indexOf('<main>');
      const mainEnd = res.text.indexOf('</main>');
      expect(mainStart).toBeGreaterThan(-1);
      expect(mainEnd).toBeGreaterThan(mainStart);
      expect(res.text.slice(mainStart, mainEnd)).toContain('<h1>');
      expect(res.text.indexOf('<footer>')).toBeGreaterThan(mainEnd);
      expect(res.text.split('<main>').length - 1).toBe(1);
      expect(res.text.split('</main>').length - 1).toBe(1);
    });
  });
});
