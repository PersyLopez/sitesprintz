/**
 * Admin-only outreach candidate queue.
 * POST /search is read-only; persist via /candidates and /candidates/import.
 */

import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';
import {
  fetchPlaceDetails,
  hasPlacesApiKey,
  parsePlaceIdFromMapsUrl,
  placeFromDetails,
  PlacesApiError,
  scoreCandidate,
  searchPlacesCandidates,
} from '../services/outreach/candidateFinder.js';

const router = express.Router();
const STATUSES = new Set(['queued', 'saved', 'rejected', 'claimed']);

router.use(requireAdmin);

function handlePlacesError(err, res) {
  if (err instanceof PlacesApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err.message?.includes('Rate limit')) {
    return res.status(429).json({ error: err.message });
  }
  return res.status(500).json({ error: 'Outreach request failed' });
}

function scoredToRow(scored, { source, addedBy, notes } = {}) {
  const placeId = scored.placeId || null;
  return {
    source,
    place_id: placeId || undefined,
    name: scored.name,
    address: scored.address,
    phone: scored.phone,
    email: scored.email,
    website: scored.website,
    website_kind: scored.websiteKind,
    maps_url: scored.mapsUrl,
    niche: scored.niche,
    layout_key: scored.layoutKey,
    types: scored.types || [],
    rating: scored.rating,
    review_count: scored.reviewCount ?? 0,
    has_hours: Boolean(scored.hasHours),
    photo_count: scored.photoCount ?? 0,
    score: scored.score,
    reasons: scored.reasons || [],
    notes: notes ?? scored.notes ?? null,
    status: 'queued',
    added_by: addedBy || null,
  };
}

function normalizeImported(raw = {}) {
  return scoreCandidate({
    placeId: raw.placeId ?? raw.place_id,
    name: raw.name,
    address: raw.address,
    phone: raw.phone,
    email: raw.email,
    website: raw.website,
    mapsUrl: raw.mapsUrl ?? raw.maps_url ?? raw.url,
    types: raw.types,
    rating: raw.rating,
    reviewCount: raw.reviewCount ?? raw.review_count,
    openingHours: raw.openingHours ?? raw.opening_hours,
    photoCount: raw.photoCount ?? raw.photo_count,
    photos: raw.photos,
    businessStatus: raw.businessStatus ?? raw.business_status,
    niche: raw.niche,
    layoutKey: raw.layoutKey ?? raw.layout_key,
    notes: raw.notes,
  });
}

/**
 * POST /api/outreach/search
 * Body: { city, niche?, keyword?, radiusMeters? }
 * Returns scored fits. Does not persist.
 */
router.post('/search', async (req, res) => {
  try {
    if (!hasPlacesApiKey()) {
      return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY is not set' });
    }

    const { city, niche, keyword, radiusMeters } = req.body || {};
    if (!city || !String(city).trim()) {
      return res.status(400).json({ error: 'city is required' });
    }

    const candidates = await searchPlacesCandidates({
      city: String(city).trim(),
      niche: niche ? String(niche).trim() : undefined,
      keyword: keyword ? String(keyword).trim() : undefined,
      radiusMeters,
    });

    return res.json({ candidates });
  } catch (err) {
    return handlePlacesError(err, res);
  }
});

/**
 * POST /api/outreach/candidates
 * Manually add a person Persy found.
 */
router.post('/candidates', async (req, res) => {
  try {
    const body = req.body || {};
    const name = body.name ? String(body.name).trim() : '';
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const hasLocation =
      present(body.address) ||
      present(body.city) ||
      present(body.phone) ||
      present(body.mapsUrl) ||
      present(body.placeId);
    if (!hasLocation) {
      return res.status(400).json({
        error: 'Need a location signal: address, city, phone, mapsUrl, or placeId',
      });
    }

    let placeId = present(body.placeId) ? String(body.placeId).trim() : null;
    if (!placeId && present(body.mapsUrl)) {
      placeId = parsePlaceIdFromMapsUrl(body.mapsUrl);
    }

    let detailsPlace = {};
    if (placeId && hasPlacesApiKey()) {
      try {
        const result = await fetchPlaceDetails(placeId);
        if (result) detailsPlace = placeFromDetails(result);
      } catch (err) {
        if (err instanceof PlacesApiError && err.statusCode === 429) {
          return handlePlacesError(err, res);
        }
        // No key-path already skipped; details optional — keep typed fields.
      }
    }

    const address = [body.address, body.city].filter(present).join(', ') || detailsPlace.address || '';

    const scored = scoreCandidate({
      placeId: placeId || detailsPlace.placeId,
      name,
      address,
      phone: body.phone || detailsPlace.phone,
      email: body.email,
      website: body.website ?? detailsPlace.website,
      mapsUrl: body.mapsUrl || detailsPlace.mapsUrl,
      types: detailsPlace.types || [],
      rating: detailsPlace.rating,
      reviewCount: detailsPlace.reviewCount,
      openingHours: detailsPlace.openingHours,
      photoCount: detailsPlace.photoCount,
      photos: detailsPlace.photos,
      businessStatus: detailsPlace.businessStatus,
      niche: body.niche,
      notes: body.notes,
    });

    if (placeId) {
      const existing = await prisma.outreach_candidates.findUnique({
        where: { place_id: placeId },
      });
      if (existing) {
        return res.status(200).json({ candidate: existing, deduped: true });
      }
    }

    const candidate = await prisma.outreach_candidates.create({
      data: scoredToRow(scored, {
        source: 'manual',
        addedBy: req.user?.id,
        notes: body.notes,
      }),
    });

    return res.status(201).json({ candidate });
  } catch (err) {
    if (err.code === 'P2002') {
      const existing = await prisma.outreach_candidates.findUnique({
        where: { place_id: req.body?.placeId },
      });
      if (existing) return res.status(200).json({ candidate: existing, deduped: true });
    }
    return handlePlacesError(err, res);
  }
});

/**
 * POST /api/outreach/candidates/import
 * Persist Places search hits (dedup place_id). source=places.
 */
router.post('/candidates/import', async (req, res) => {
  try {
    const incoming = Array.isArray(req.body?.candidates) ? req.body.candidates : null;
    if (!incoming) {
      return res.status(400).json({ error: 'candidates array is required' });
    }

    const created = [];
    let skipped = 0;

    for (const raw of incoming) {
      const scored = normalizeImported(raw);
      if (!scored.name || !scored.fit) {
        skipped += 1;
        continue;
      }
      if (scored.placeId) {
        const existing = await prisma.outreach_candidates.findUnique({
          where: { place_id: scored.placeId },
        });
        if (existing) {
          skipped += 1;
          continue;
        }
      }
      try {
        const row = await prisma.outreach_candidates.create({
          data: scoredToRow(scored, {
            source: 'places',
            addedBy: req.user?.id,
            notes: raw.notes,
          }),
        });
        created.push(row);
      } catch (err) {
        if (err.code === 'P2002') {
          skipped += 1;
          continue;
        }
        throw err;
      }
    }

    return res.status(201).json({ candidates: created, skipped });
  } catch (err) {
    return handlePlacesError(err, res);
  }
});

/**
 * GET /api/outreach/candidates?status=
 */
router.get('/candidates', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) {
      if (!STATUSES.has(String(status))) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      where.status = String(status);
    }

    const candidates = await prisma.outreach_candidates.findMany({
      where,
      orderBy: [{ score: 'desc' }, { created_at: 'desc' }],
    });

    return res.json({ candidates });
  } catch (err) {
    return handlePlacesError(err, res);
  }
});

/**
 * PATCH /api/outreach/candidates/:id
 * Body: { status?, notes? }
 */
router.patch('/candidates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body || {};
    const data = {};

    if (status !== undefined) {
      if (!STATUSES.has(String(status))) {
        return res.status(400).json({ error: 'status must be queued, saved, rejected, or claimed' });
      }
      data.status = String(status);
    }
    if (notes !== undefined) {
      data.notes = notes;
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'status or notes is required' });
    }

    const existing = await prisma.outreach_candidates.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidate = await prisma.outreach_candidates.update({
      where: { id },
      data,
    });

    return res.json({ candidate });
  } catch (err) {
    return handlePlacesError(err, res);
  }
});

function present(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export default router;
