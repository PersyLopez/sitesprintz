import express from 'express';
import { prisma } from '../../database/db.js';
import { requireAuth } from '../middleware/auth.js';
import { claimAcceptLimiter } from '../middleware/rateLimiting.js';
import {
  hashClaimToken,
  hashesEqual,
  isClaimExpired,
  isClaimTokenShape,
} from '../services/claimTokenService.js';

const router = express.Router();

function businessNameFromSite(site) {
  const data = site?.site_data && typeof site.site_data === 'object' ? site.site_data : {};
  return data.businessName || data.brand?.name || site?.subdomain || 'Your site';
}

async function findSiteByClaimToken(rawToken) {
  if (!isClaimTokenShape(rawToken)) {
    return null;
  }
  const hashed = hashClaimToken(rawToken);
  const site = await prisma.sites.findUnique({
    where: { claim_token_hash: hashed },
  });
  if (!site || !site.claim_token_hash) {
    return null;
  }
  if (!hashesEqual(site.claim_token_hash, hashed)) {
    return null;
  }
  return site;
}

/**
 * GET /api/claim/:token
 * Public preview. 404 for unknown tokens (do not leak hash).
 */
router.get('/:token', async (req, res) => {
  try {
    const site = await findSiteByClaimToken(req.params.token);
    if (!site) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (isClaimExpired(site.claim_token_expires)) {
      return res.status(410).json({ error: 'Claim link expired' });
    }
    return res.json({
      businessName: businessNameFromSite(site),
      subdomain: site.subdomain,
    });
  } catch {
    return res.status(500).json({ error: 'Claim lookup failed' });
  }
});

/**
 * POST /api/claim/:token/accept
 * Transfer prospect site to the authenticated user after trial/active subscription.
 */
router.post('/:token/accept', claimAcceptLimiter, requireAuth, async (req, res) => {
  try {
    const site = await findSiteByClaimToken(req.params.token);
    if (!site) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (isClaimExpired(site.claim_token_expires)) {
      return res.status(410).json({ error: 'Claim link expired' });
    }

    const claimant = req.user;
    const owner = site.user_id
      ? await prisma.users.findUnique({
          where: { id: site.user_id },
          select: { id: true, role: true },
        })
      : null;

    if (owner && owner.role !== 'admin' && owner.id !== claimant.id) {
      return res.status(403).json({ error: 'Site already owned' });
    }

    if (claimant.role === 'admin' && owner && owner.id !== claimant.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const status = claimant.subscriptionStatus || claimant.subscription_status;
    if (status !== 'trialing' && status !== 'active') {
      return res.status(403).json({
        error: 'Start a 7-day trial before claiming this site',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.sites.update({
        where: { id: site.id },
        data: {
          user_id: claimant.id,
          claim_token_hash: null,
          claim_token_expires: null,
        },
      });
      await tx.outreach_candidates.updateMany({
        where: { site_id: site.id },
        data: { status: 'claimed' },
      });
    });

    return res.json({
      siteId: site.id,
      subdomain: site.subdomain,
      claimed: true,
    });
  } catch {
    return res.status(500).json({ error: 'Claim failed' });
  }
});

export default router;
