import { getLayoutForNiche, resolveFeatures, LAYOUTS } from '../config/layouts.js';
import { getPublicSiteHost, isValidCustomDomain, normalizeHostname } from './customDomainHost.js';
import { livePublishedPath } from './visitorExperience.js';

const KNOWN_NICHES = Array.from(
  new Set(Object.values(LAYOUTS).flatMap((layout) => layout.niches || []))
);

export function normalizeSiteRecord(payload) {
  const site = payload?.site || payload;
  if (!site || typeof site !== 'object') return null;

  const data = site.data || site.site_data || {};
  const businessName =
    site.businessName
    || site.name
    || data.brand?.name
    || data.businessName
    || null;

  return {
    ...site,
    data,
    site_data: data,
    businessName,
    name: site.name || businessName,
    template: site.template || site.templateId || data.niche || data.template || null,
    templateId: site.templateId || site.template || data.niche || data.template || null,
    payOnSite: site.payOnSite === true || data.settings?.payOnSite === true,
    allowCheckout: site.allowCheckout === true || data.settings?.allowCheckout === true,
  };
}

export function getSiteDisplayName(site) {
  return site?.businessName || site?.name || 'Untitled Site';
}

export function getSiteNiche(site) {
  const raw = site?.templateId || site?.template || site?.data?.niche || '';
  const value = String(raw).toLowerCase().trim();
  if (!value) return '';
  return KNOWN_NICHES.find((niche) => (
    value === niche || value.startsWith(`${niche}-`) || value.includes(niche)
  )) || value;
}

export function getSiteFeatures(site) {
  const niche = getSiteNiche(site);
  const layoutKey = site?.data?.layout || getLayoutForNiche(niche);
  return resolveFeatures(layoutKey, site?.data?.features);
}

/** Live published URL. Empty VITE_API_URL means same-origin (production). */
export function getPublishedSiteUrl(subdomain) {
  const path = livePublishedPath(subdomain);
  if (!path) return null;
  const origin = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return `${origin}${path}`;
}

function resolvedCustomDomainHost(customDomain) {
  if (!isValidCustomDomain(customDomain)) return '';
  return normalizeHostname(customDomain);
}

/** Absolute https live URL on the public host (server QR, showcase, SEO). */
export function getAbsolutePublishedSiteUrl(subdomain, { customDomain } = {}) {
  const customHost = resolvedCustomDomainHost(customDomain);
  if (customHost) return `https://${customHost}`;
  const path = livePublishedPath(subdomain);
  if (!path) return null;
  const siteUrl = typeof process !== 'undefined' && process.env?.SITE_URL
    ? String(process.env.SITE_URL).replace(/\/$/, '')
    : '';
  const origin = siteUrl || `https://${getPublicSiteHost()}`;
  return `${origin}${path}`;
}

/** Display label without protocol (share card footer). */
export function getPublishedSiteDisplayUrl(subdomain, { customDomain } = {}) {
  const customHost = resolvedCustomDomainHost(customDomain);
  if (customHost) return customHost;
  const path = livePublishedPath(subdomain);
  if (!path) return null;
  return `${getPublicSiteHost()}${path}`;
}

/** Append UTM params for print/QR share URLs. Social OG cards stay untracked. */
export function withShareTracking(url, { source, medium } = {}) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (source) parsed.searchParams.set('utm_source', source);
    if (medium) parsed.searchParams.set('utm_medium', medium);
    return parsed.toString();
  } catch {
    return url;
  }
}

export function getSiteWorkspacePaths(siteId, site = {}) {
  const base = `/dashboard/sites/${siteId}`;
  const subdomain = site?.subdomain;
  return {
    overview: base,
    orders: `${base}/orders`,
    appointments: `${base}/appointments`,
    products: `${base}/products`,
    settings: `${base}/settings`,
    analytics: `${base}/analytics`,
    edit: `/setup?site=${siteId}`,
    liveEdit: subdomain ? `${livePublishedPath(subdomain)}?edit=true` : `/setup?site=${siteId}`,
  };
}

const LAST_WORKSPACE_SITE_PREFIX = 'sitesprintz:last-workspace-site:';

function getLastWorkspaceSiteKey(userId) {
  return `${LAST_WORKSPACE_SITE_PREFIX}${String(userId || '').trim()}`;
}

export function rememberLastWorkspaceSite(userId, siteId) {
  if (!userId || !siteId || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(getLastWorkspaceSiteKey(userId), String(siteId));
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function readLastWorkspaceSite(userId) {
  if (!userId || typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(getLastWorkspaceSiteKey(userId));
  } catch {
    return null;
  }
}

function isSafeSameOriginPath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

export function resolveOwnerPostLoginPath({
  sites,
  lastSiteId,
  role,
  safeRedirect,
} = {}) {
  if (isSafeSameOriginPath(safeRedirect)) return safeRedirect;
  if (role === 'admin') return '/admin';
  if (!Array.isArray(sites) || sites.length === 0) return '/dashboard';
  if (sites.length === 1) return getSiteWorkspacePaths(sites[0]?.id).overview;

  const lastSite = sites.find((site) => site?.id === lastSiteId);
  return lastSite ? getSiteWorkspacePaths(lastSite.id).overview : '/dashboard';
}
