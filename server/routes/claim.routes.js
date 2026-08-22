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
import {
  completeClaimTrialCheckout,
  createClaimTrialCheckout,
  isSubscribedStatus,
  normalizeClaimPlan,
  validateClaimOwnership,
} from '../services/claimTrialService.js';

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
 * POST /api/claim/:token/trial-checkout
 * Start Stripe Checkout with 7-day trial before claiming.
 */
router.post('/:token/trial-checkout', claimAcceptLimiter, requireAuth, async (req, res) => {
  try {
    const site = await findSiteByClaimToken(req.params.token);
    if (!site) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (isClaimExpired(site.claim_token_expires)) {
      return res.status(410).json({ error: 'Claim link expired' });
    }

    const claimant = req.user;
    const ownershipError = await validateClaimOwnership(site, claimant);
    if (ownershipError) {
      return res.status(ownershipError.status).json(ownershipError.body);
    }

    const plan = normalizeClaimPlan(req.body?.plan);
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan. Must be "starter" or "growth"' });
    }

    const status = claimant.subscriptionStatus || claimant.subscription_status;
    if (isSubscribedStatus(status)) {
      return res.json({ alreadySubscribed: true });
    }

    const { url } = await createClaimTrialCheckout({
      user: claimant,
      site,
      plan,
      claimToken: req.params.token,
      req,
    });

    return res.json({ url });
  } catch (err) {
    if (err.code === 'STRIPE_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Stripe not configured',
        code: 'STRIPE_NOT_CONFIGURED',
      });
    }
    return res.status(500).json({ error: 'Trial checkout failed' });
  }
});

/**
 * POST /api/claim/:token/trial-complete
 * Sync subscription after Stripe Checkout return (covers webhook lag).
 */
router.post('/:token/trial-complete', requireAuth, async (req, res) => {
  try {
    const site = await findSiteByClaimToken(req.params.token);
    if (!site) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (isClaimExpired(site.claim_token_expires)) {
      return res.status(410).json({ error: 'Claim link expired' });
    }

    const sessionId = req.body?.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const result = await completeClaimTrialCheckout({
      user: req.user,
      site,
      sessionId,
    });

    return res.json(result);
  } catch (err) {
    if (err.code === 'STRIPE_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Stripe not configured',
        code: 'STRIPE_NOT_CONFIGURED',
      });
    }
    if (
      err.code === 'SESSION_INCOMPLETE' ||
      err.code === 'SESSION_USER_MISMATCH' ||
      err.code === 'INVALID_SOURCE' ||
      err.code === 'SESSION_SITE_MISMATCH' ||
      err.code === 'MISSING_SUBSCRIPTION' ||
      err.code === 'INVALID_SUBSCRIPTION_STATUS'
    ) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    return res.status(500).json({ error: 'Trial completion failed' });
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
    const ownershipError = await validateClaimOwnership(site, claimant);
    if (ownershipError) {
      return res.status(ownershipError.status).json(ownershipError.body);
    }

    const status = claimant.subscriptionStatus || claimant.subscription_status;
    if (!isSubscribedStatus(status)) {
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
