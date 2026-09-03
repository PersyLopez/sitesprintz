/**
 * Client-side delivery helpers (public config only — no private street).
 */

import { SERVICE_RADIUS_MILES, normalizeServiceRadiusMiles } from './liveSiteContact.js';

function parseMoney(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isDeliveryEnabled(siteData) {
  return siteData?.settings?.delivery?.enabled === true
    || siteData?.delivery?.enabled === true;
}

/**
 * @param {object|null|undefined} siteOrData — workspace site or raw site_data
 */
export function getPublicDeliveryConfig(siteOrData) {
  const delivery = (siteOrData?.delivery && typeof siteOrData.delivery === 'object'
    && siteOrData.delivery.enabled !== undefined)
    ? siteOrData.delivery
    : siteOrData?.settings?.delivery || null;
  if (!delivery || delivery.enabled !== true) {
    return { enabled: false, flatFee: 0, maxRadiusMiles: null };
  }
  const flatFee = Math.max(0, Math.round(parseMoney(delivery.flatFee) * 100) / 100);
  const maxRadiusMiles = normalizeServiceRadiusMiles(delivery.maxRadiusMiles);
  return {
    enabled: true,
    flatFee,
    maxRadiusMiles,
  };
}

export { SERVICE_RADIUS_MILES };
