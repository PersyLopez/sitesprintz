/**
 * Product delivery (flat fee + max radius) — owner opt-in on site_data.settings.delivery.
 * Per-mile pricing is deferred; v1 is flat fee only.
 */

import {
  SERVICE_RADIUS_MILES,
  normalizeServiceRadiusMiles,
  resolvePrivateStreet,
} from '../../src/utils/liveSiteContact.js';

function parseMoney(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * @param {object|null|undefined} siteData
 * @returns {boolean}
 */
export function isDeliveryEnabled(siteData) {
  return siteData?.settings?.delivery?.enabled === true;
}

/**
 * Public visitor-facing delivery config (never includes private street).
 * @param {object|null|undefined} siteData
 * @returns {{ enabled: boolean, flatFee: number, maxRadiusMiles: number|null }}
 */
export function getPublicDeliveryConfig(siteData) {
  const delivery = siteData?.settings?.delivery;
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

/**
 * Normalize owner-submitted delivery fields.
 * @param {object|null|undefined} input
 * @returns {{ enabled: boolean, flatFee: number, maxRadiusMiles: number }}
 */
export function normalizeDeliverySetting(input) {
  const source = input && typeof input === 'object' ? input : {};
  const enabled = Boolean(source.enabled);
  const flatFee = Math.max(0, Math.round(parseMoney(source.flatFee) * 100) / 100);
  const maxRadiusMiles = normalizeServiceRadiusMiles(source.maxRadiusMiles) || SERVICE_RADIUS_MILES[1];
  return { enabled, flatFee, maxRadiusMiles };
}

/**
 * Whether the shop has a private street usable as delivery origin.
 * @param {object|null|undefined} siteData
 * @returns {boolean}
 */
export function shopHasDeliveryOrigin(siteData) {
  return Boolean(String(resolvePrivateStreet(siteData) || '').trim());
}

/**
 * Apply delivery settings onto site_data. Enabling requires a private street.
 * @param {object} siteData
 * @param {object} deliveryInput
 * @returns {{ siteData: object } | { error: string, code: string }}
 */
export function applyDeliverySetting(siteData, deliveryInput) {
  const source = siteData && typeof siteData === 'object' ? siteData : {};
  const normalized = normalizeDeliverySetting(deliveryInput);

  if (normalized.enabled && !shopHasDeliveryOrigin(source)) {
    return {
      error: 'Add a private street address for this shop before enabling delivery.',
      code: 'DELIVERY_ORIGIN_REQUIRED',
    };
  }

  if (normalized.enabled && normalized.flatFee < 0) {
    return {
      error: 'Delivery fee cannot be negative.',
      code: 'INVALID_DELIVERY_FEE',
    };
  }

  return {
    siteData: {
      ...source,
      settings: {
        ...(source.settings || {}),
        delivery: normalized,
        ...(normalized.enabled ? { allowCheckout: true } : {}),
      },
    },
  };
}

/**
 * Nested-merge delivery so editor saves cannot wipe settings.delivery.
 * @param {object|null|undefined} existingSettings
 * @param {object|null|undefined} incomingSettings
 * @returns {object}
 */
export function mergeDeliveryIntoSettings(existingSettings, incomingSettings) {
  const existing = existingSettings && typeof existingSettings === 'object' ? existingSettings : {};
  const incoming = incomingSettings && typeof incomingSettings === 'object' ? incomingSettings : {};
  const existingDelivery = existing.delivery && typeof existing.delivery === 'object'
    ? existing.delivery
    : {};
  const hasIncomingDelivery = Object.prototype.hasOwnProperty.call(incoming, 'delivery');

  return {
    ...existing,
    ...incoming,
    delivery: hasIncomingDelivery
      ? {
          ...existingDelivery,
          ...(incoming.delivery && typeof incoming.delivery === 'object' ? incoming.delivery : {}),
        }
      : existing.delivery,
  };
}

export { SERVICE_RADIUS_MILES };

/**
 * Server-side delivery charge for checkout. Never trusts client fee.
 * @param {object} siteData
 * @param {{ fulfillment?: string, address?: string }} options
 * @param {{ measureDeliveryMiles: Function }} [deps]
 * @returns {Promise<
 *   | { ok: true, fee: number, miles: number|null, shippingAddress: object|null, fulfillmentType: string }
 *   | { ok: false, code: string, error: string }
 * >}
 */
export async function buildDeliveryCharge(siteData, options = {}, deps = {}) {
  const fulfillment = String(options.fulfillment || 'pickup').toLowerCase();
  if (fulfillment !== 'delivery') {
    return {
      ok: true,
      fee: 0,
      miles: null,
      shippingAddress: null,
      fulfillmentType: 'pay_on_site',
    };
  }

  const config = getPublicDeliveryConfig(siteData);
  if (!config.enabled) {
    return {
      ok: false,
      code: 'DELIVERY_DISABLED',
      error: 'Delivery is not enabled for this shop',
    };
  }
  if (!config.maxRadiusMiles) {
    return {
      ok: false,
      code: 'DELIVERY_RADIUS_REQUIRED',
      error: 'Delivery radius is not configured',
    };
  }

  const address = String(options.address || '').trim().slice(0, 300);
  const line2 = options.addressLine2 ? String(options.addressLine2).trim().slice(0, 120) : '';
  const city = options.city ? String(options.city).trim().slice(0, 80) : '';
  const region = options.region ? String(options.region).trim().slice(0, 40) : '';
  const postal = options.postal ? String(options.postal).trim().slice(0, 20) : '';
  const composed = [address, line2, city, region, postal].filter(Boolean).join(', ');

  const measure = deps.measureDeliveryMiles
    || (await import('../services/serviceAreaGeoService.js')).measureDeliveryMiles;
  const measured = await measure(siteData, composed || address);
  if (!measured.ok) {
    return { ok: false, code: measured.code, error: measured.error };
  }

  if (measured.miles > config.maxRadiusMiles) {
    return {
      ok: false,
      code: 'DELIVERY_OUT_OF_RANGE',
      error: `Delivery is only available within ${config.maxRadiusMiles} miles (about ${measured.miles} miles away)`,
    };
  }

  return {
    ok: true,
    fee: config.flatFee,
    miles: measured.miles,
    shippingAddress: {
      line1: address,
      line2: line2 || undefined,
      city: city || undefined,
      region: region || undefined,
      postal: postal || undefined,
      composed: composed || address,
    },
    fulfillmentType: 'delivery',
  };
}
