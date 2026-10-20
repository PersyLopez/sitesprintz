import { getLayoutForNiche, resolveFeatures, LAYOUTS } from '../config/layouts.js';

const KNOWN_NICHES = Array.from(
  new Set(Object.values(LAYOUTS).flatMap((layout) => layout.niches || []))
);

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
