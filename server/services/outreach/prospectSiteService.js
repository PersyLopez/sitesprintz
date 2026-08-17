import path from 'path';
import { prisma } from '../../../database/db.js';
import { buildNicheSiteData, getNicheConfig } from '../../../src/config/nicheTemplateBuilders.js';
import { sanitizeSiteDataForStorage } from '../../utils/siteDataSanitizer.js';
import {
  allocateUniqueSubdomain,
  cloneIsolatedSiteData,
  removeIsolatedSiteFiles,
  writeIsolatedSiteFiles,
} from '../../utils/siteIsolation.js';
import {
  buildClaimUrl,
  claimExpiryDate,
  generateClaimToken,
  hashClaimToken,
} from '../claimTokenService.js';

const NICHE_ALIASES = {
  plumber: 'plumbing',
  plumbing: 'plumbing',
  bakery: 'restaurant',
  'bakery/food-stall': 'restaurant',
  'food-stall': 'restaurant',
  keyword: 'consultant',
};

const LAYOUT_NICHE_FALLBACK = {
  atelier: 'salon',
  craftsman: 'plumbing',
  counsel: 'consultant',
  mercantile: 'restaurant',
};

export function resolveProspectNiche(candidate) {
  const raw = String(candidate?.niche || '').trim().toLowerCase();
  const mapped = NICHE_ALIASES[raw] || raw;
  if (getNicheConfig(mapped)) return mapped;
  const fromLayout = LAYOUT_NICHE_FALLBACK[candidate?.layout_key];
  if (fromLayout && getNicheConfig(fromLayout)) return fromLayout;
  return 'salon';
}

function formatCandidateHours(candidate) {
  const hours = candidate?.hours || candidate?.opening_hours || candidate?.openingHours;
  if (!hours) return null;
  if (typeof hours === 'string' && hours.trim()) return hours.trim();
  if (Array.isArray(hours.weekday_text) && hours.weekday_text.length > 0) {
    return hours.weekday_text.join('; ');
  }
  return null;
}

export function applyCandidateFields(siteData, candidate) {
  const address = candidate.address || '';
  const phone = candidate.phone || '';
  const email = candidate.email || '';
  const mapsUrl = candidate.maps_url || candidate.mapsUrl || '';
  const hours = formatCandidateHours(candidate);

  siteData.businessName = candidate.name;
  siteData.brand = { ...(siteData.brand || {}), name: candidate.name };
  siteData.contactPhone = phone;
  siteData.contactEmail = email;
  siteData.contactAddress = address;
  siteData.googleMapsUrl = mapsUrl;
  siteData.social = { ...(siteData.social || {}), maps: mapsUrl };
  siteData.businessHours = hours || '';

  if (Array.isArray(siteData.sections)) {
    for (const section of siteData.sections) {
      const content = section.content || {};
      if (section.type === 'location') {
        content.address = address;
        content.mapUrl = mapsUrl;
      } else if (section.type === 'contact') {
        content.phone = phone;
        content.email = email;
        content.address = address;
      } else if (section.type === 'social') {
        content.maps = mapsUrl;
      } else if (section.type === 'hours') {
        content.hours = hours || '';
      } else if (section.type === 'reviews') {
        content.rating = null;
        content.reviewCount = null;
      }
      section.content = content;
    }
  }

  return siteData;
}

function issueClaimSecret() {
  const claimToken = generateClaimToken();
  return {
    claimToken,
    claim_token_hash: hashClaimToken(claimToken),
    claim_token_expires: claimExpiryDate(),
  };
}

async function persistNewSite({ adminUserId, candidate, siteData }) {
  const nicheId = resolveProspectNiche(candidate);
  const businessName = candidate.name || 'my-site';
  let subdomain;
  let site;
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    subdomain = await allocateUniqueSubdomain(businessName, async (slug) => {
      const existing = await prisma.sites.findFirst({
        where: { subdomain: slug },
        select: { id: true },
      });
      return Boolean(existing);
    });

    const isolated = cloneIsolatedSiteData(siteData, {
      siteId: subdomain,
      subdomain,
      templateId: nicheId,
    });
    const sanitized = sanitizeSiteDataForStorage(isolated);
    const claim = issueClaimSecret();

    try {
      await writeIsolatedSiteFiles(subdomain, isolated);
    } catch (error) {
      throw error;
    }

    try {
      site = await prisma.sites.create({
        data: {
          id: subdomain,
          user_id: adminUserId,
          subdomain,
          template_id: nicheId,
          status: 'published',
          plan: 'trial',
          published_at: new Date(),
          is_public: true,
          site_data: sanitized,
          json_file_path: path.join('sites', subdomain, 'data', 'site.json'),
          claim_token_hash: claim.claim_token_hash,
          claim_token_expires: claim.claim_token_expires,
          created_at: new Date(),
        },
      });
      return { site, claimToken: claim.claimToken, subdomain };
    } catch (error) {
      await removeIsolatedSiteFiles(subdomain).catch(() => {});
      if (error?.code === 'P2002' && attempt < maxAttempts - 1) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to create prospect site');
}

export async function createProspectFromCandidate(candidate, adminUserId) {
  if (candidate.status === 'claimed') {
    const err = new Error('Candidate already claimed');
    err.statusCode = 409;
    throw err;
  }

  if (candidate.status !== 'queued' && candidate.status !== 'saved') {
    const err = new Error('Prospect sites can only be created for queued or saved candidates');
    err.statusCode = 400;
    throw err;
  }

  if (candidate.site_id) {
    const existing = await prisma.sites.findUnique({ where: { id: candidate.site_id } });
    if (existing) {
      const owner = existing.user_id
        ? await prisma.users.findUnique({
            where: { id: existing.user_id },
            select: { id: true, role: true },
          })
        : null;
      if (owner && owner.role !== 'admin') {
        const err = new Error('Candidate already claimed');
        err.statusCode = 409;
        throw err;
      }
      const claim = issueClaimSecret();
      const site = await prisma.sites.update({
        where: { id: existing.id },
        data: {
          claim_token_hash: claim.claim_token_hash,
          claim_token_expires: claim.claim_token_expires,
        },
      });
      return {
        siteId: site.id,
        subdomain: site.subdomain,
        claimUrl: buildClaimUrl(claim.claimToken),
        claimToken: claim.claimToken,
      };
    }
  }

  const nicheId = resolveProspectNiche(candidate);
  let siteData = buildNicheSiteData(nicheId, {
    businessName: candidate.name,
    contactPhone: candidate.phone || '',
    contactEmail: candidate.email || '',
    contactAddress: candidate.address || '',
  });
  siteData = applyCandidateFields(siteData, candidate);

  const { site, claimToken, subdomain } = await persistNewSite({
    adminUserId,
    candidate,
    siteData,
  });

  await prisma.outreach_candidates.update({
    where: { id: candidate.id },
    data: { site_id: site.id },
  });

  return {
    siteId: site.id,
    subdomain,
    claimUrl: buildClaimUrl(claimToken),
    claimToken,
  };
}
