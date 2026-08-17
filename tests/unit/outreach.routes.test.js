import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../../database/db.js', () => ({
  prisma: {
    outreach_candidates: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../server/middleware/auth.js', () => ({
  requireAdmin: (req, _res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
}));

vi.mock('../../server/services/outreach/candidateFinder.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    searchPlacesCandidates: vi.fn(),
    fetchPlaceDetails: vi.fn(),
  };
});

import { prisma } from '../../database/db.js';
import {
  fetchPlaceDetails,
  searchPlacesCandidates,
} from '../../server/services/outreach/candidateFinder.js';
import outreachRoutes from '../../server/routes/outreach.routes.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/outreach', outreachRoutes);
  return app;
}

const scoredFit = {
  fit: true,
  placeId: 'ChIJ-salon',
  name: 'Riverside Cuts',
  address: '12 Main St',
  phone: '512-555-0100',
  email: null,
  website: null,
  websiteKind: 'none',
  mapsUrl: 'https://maps.google.com/?cid=1',
  niche: 'salon',
  layoutKey: 'atelier',
  types: ['beauty_salon'],
  rating: 4.6,
  reviewCount: 42,
  hasHours: true,
  photoCount: 2,
  score: 95,
  reasons: ['No website', '4.6 from 42 reviews'],
  notes: null,
};

describe('outreach routes (requireAdmin mocked)', () => {
  const originalKey = process.env.GOOGLE_PLACES_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_PLACES_API_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = originalKey;
  });

  describe('POST /api/outreach/search', () => {
    it('returns 503 when GOOGLE_PLACES_API_KEY is missing', async () => {
      const response = await request(createApp())
        .post('/api/outreach/search')
        .send({ city: 'Austin', niche: 'salon' });

      expect(response.status).toBe(503);
      expect(response.body).toEqual({ error: 'GOOGLE_PLACES_API_KEY is not set' });
      expect(searchPlacesCandidates).not.toHaveBeenCalled();
    });

    it('returns scored candidates sorted by finder, without persisting', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'test-key';
      searchPlacesCandidates.mockResolvedValue([scoredFit]);

      const response = await request(createApp())
        .post('/api/outreach/search')
        .send({ city: 'Austin', niche: 'salon', radiusMeters: 5000 });

      expect(response.status).toBe(200);
      expect(response.body.candidates).toEqual([scoredFit]);
      expect(searchPlacesCandidates).toHaveBeenCalledWith({
        city: 'Austin',
        niche: 'salon',
        keyword: undefined,
        radiusMeters: 5000,
      });
      expect(prisma.outreach_candidates.create).not.toHaveBeenCalled();
    });

    it('returns 400 when city is missing', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'test-key';

      const response = await request(createApp())
        .post('/api/outreach/search')
        .send({ niche: 'salon' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/city/i);
    });
  });

  describe('POST /api/outreach/candidates', () => {
    it('rejects missing name', async () => {
      const response = await request(createApp())
        .post('/api/outreach/candidates')
        .send({ phone: '512-555-0100' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/name/i);
    });

    it('rejects when there is no location signal', async () => {
      const response = await request(createApp())
        .post('/api/outreach/candidates')
        .send({ name: 'Riverside Cuts' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/location/i);
    });

    it('creates a queued manual candidate without Places hydration', async () => {
      prisma.outreach_candidates.create.mockResolvedValue({
        id: 'cand-1',
        source: 'manual',
        status: 'queued',
        name: 'Riverside Cuts',
      });

      const response = await request(createApp())
        .post('/api/outreach/candidates')
        .send({ name: 'Riverside Cuts', city: 'Austin', phone: '512-555-0100' });

      expect(response.status).toBe(201);
      expect(prisma.outreach_candidates.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'manual',
            status: 'queued',
            name: 'Riverside Cuts',
            added_by: 'admin-1',
            website_kind: 'none',
          }),
        })
      );
      expect(fetchPlaceDetails).not.toHaveBeenCalled();
    });

    it('dedups on place_id', async () => {
      prisma.outreach_candidates.findUnique.mockResolvedValue({
        id: 'existing',
        place_id: 'ChIJ-salon',
        name: 'Riverside Cuts',
      });

      const response = await request(createApp())
        .post('/api/outreach/candidates')
        .send({ name: 'Riverside Cuts', placeId: 'ChIJ-salon' });

      expect(response.status).toBe(200);
      expect(response.body.deduped).toBe(true);
      expect(prisma.outreach_candidates.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/outreach/candidates/import', () => {
    it('saves Places hits and skips duplicate place_id', async () => {
      prisma.outreach_candidates.findUnique
        .mockResolvedValueOnce({ id: 'dup', place_id: 'ChIJ-dup' })
        .mockResolvedValueOnce(null);
      prisma.outreach_candidates.create.mockResolvedValue({
        id: 'new',
        source: 'places',
        name: 'Riverside Cuts',
      });

      const response = await request(createApp())
        .post('/api/outreach/candidates/import')
        .send({
          candidates: [
            { ...scoredFit, placeId: 'ChIJ-dup' },
            scoredFit,
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.skipped).toBe(1);
      expect(response.body.candidates).toHaveLength(1);
      expect(prisma.outreach_candidates.create).toHaveBeenCalledTimes(1);
      expect(prisma.outreach_candidates.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: 'places', status: 'queued' }),
        })
      );
    });

    it('skips real-website candidates and does not persist them', async () => {
      const response = await request(createApp())
        .post('/api/outreach/candidates/import')
        .send({
          candidates: [
            {
              name: 'Wix Salon',
              address: '12 Main St',
              phone: '512-555-0100',
              website: 'https://foo.wixsite.com/salon',
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.skipped).toBe(1);
      expect(response.body.candidates).toHaveLength(0);
      expect(prisma.outreach_candidates.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/outreach/candidates', () => {
    it('filters by status', async () => {
      prisma.outreach_candidates.findMany.mockResolvedValue([]);

      const response = await request(createApp()).get('/api/outreach/candidates?status=queued');

      expect(response.status).toBe(200);
      expect(prisma.outreach_candidates.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'queued' },
        })
      );
    });
  });

  describe('PATCH /api/outreach/candidates/:id', () => {
    it('updates status and notes', async () => {
      prisma.outreach_candidates.findUnique.mockResolvedValue({ id: 'cand-1', status: 'queued' });
      prisma.outreach_candidates.update.mockResolvedValue({
        id: 'cand-1',
        status: 'claimed',
        notes: 'Persy calling Friday',
      });

      const response = await request(createApp())
        .patch('/api/outreach/candidates/cand-1')
        .send({ status: 'claimed', notes: 'Persy calling Friday' });

      expect(response.status).toBe(200);
      expect(prisma.outreach_candidates.update).toHaveBeenCalledWith({
        where: { id: 'cand-1' },
        data: { status: 'claimed', notes: 'Persy calling Friday' },
      });
    });

    it('rejects invalid status', async () => {
      const response = await request(createApp())
        .patch('/api/outreach/candidates/cand-1')
        .send({ status: 'emailed' });

      expect(response.status).toBe(400);
      expect(prisma.outreach_candidates.update).not.toHaveBeenCalled();
    });
  });
});
