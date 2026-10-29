import { getLayoutForNiche, resolveFeatures, LAYOUTS } from '../config/layouts.js';

const KNOWN_NICHES = Array.from(
  new Set(Object.values(LAYOUTS).flatMap((layout) => layout.niches || []))
);

export function getSiteNiche(site) {
  const data = site?.data || site?.site_data || {};
  const raw = data._niche || data.niche || site?.templateId || site?.template || data.template || '';
  const value = String(raw).toLowerCase().trim();
  if (!value) return '';
  return KNOWN_NICHES.find((niche) => (
    value === niche || value.startsWith(`${niche}-`) || value.includes(niche)
  )) || value;
}

export function getSiteFeatures(site) {
  const data = site?.data || site?.site_data || {};
  const layoutKey = data.layout || data._layout || getLayoutForNiche(getSiteNiche(site));
  const userFeatures = data.features || data._features;
  return resolveFeatures(layoutKey, userFeatures);
}
