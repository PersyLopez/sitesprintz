import { getLayoutForNiche, resolveFeatures, LAYOUTS } from '../config/layouts.js';
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
