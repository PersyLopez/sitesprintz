/**
 * Shop intake flags — tenant booking toggles + site_data._features.
 * Neighbor: visitorExperience.js (visitor gating) + payOnSite.js (_features merge).
 */

import { parseSiteData } from '../../utils/parseSiteData.js';

const PAYMENT_TYPES = new Set(['none', 'full', 'deposit']);

export const CONNECT_USER_SELECT = {
  stripe_account_id: true,
  stripe_connected: true,
};

/**
 * Visitor card charges require a connected Stripe account.
 * Platform SaaS Checkout is a different ledger and must not be used here.
 *
 * @param {{ stripe_account_id?: string|null, stripe_connected?: boolean }|null|undefined} user
 * @returns {boolean}
 */
export function ownerConnectReady(user) {
  return Boolean(user?.stripe_account_id) && user?.stripe_connected === true;
}

/**
 * Shop wants a card AND Connect is ready. Otherwise visitors pay at the salon.
 *
 * @param {object|null|undefined} tenant
 * @returns {boolean}
 */
export function shopRequiresOnlineCard(tenant) {
  const paymentType = tenant?.default_payment_type || 'none';
  const shopWantsPay = Boolean(tenant?.payment_enabled) && paymentType !== 'none';
  if (!shopWantsPay) return false;
  return ownerConnectReady(tenant?.users);
}

function featureEnabled(features, key, defaultEnabled = true) {
  const state = features?.[key];
  if (!state || typeof state !== 'object') return defaultEnabled;
  if (state.enabled === false) return false;
  return true;
}

/**
 * @param {object|null|undefined} siteData
 * @param {object|null|undefined} [tenant]
 * @returns {boolean}
 */
export function siteSchedulingEnabled(siteData, tenant) {
  if (tenant?.booking_page_enabled === false) return false;
  const features = siteData?._features;
  if (features?.booking && features.booking.enabled === false) return false;
  return true;
}

/**
 * @param {object|null|undefined} siteData
 * @returns {boolean}
 */
export function siteUrgentEnabled(siteData) {
  return featureEnabled(siteData?._features, 'serviceRequests', true);
}

/**
 * @param {object|null|undefined} siteData
 * @returns {boolean}
 */
export function siteFeesEnabled(siteData) {
  return featureEnabled(siteData?._features, 'bookingFees', false);
}

/**
 * @param {object|null|undefined} siteData
 * @param {object|null|undefined} [tenant]
 * @returns {boolean}
 */
export function sitePaymentEnabled(siteData, tenant) {
  if (tenant?.payment_enabled === false) return false;
  if (tenant?.payment_enabled === true) return true;
  return featureEnabled(siteData?._features, 'onlinePayment', false);
}

/**
 * Merge intake flags into site_data._features (booking, serviceRequests, bookingFees).
 *
 * @param {object} siteData
 * @param {{ schedulingEnabled?: boolean, urgentEnabled?: boolean, feesEnabled?: boolean }} updates
 * @returns {object}
 */
export function applyShopIntakeSiteFeatures(siteData, updates) {
  const source = siteData && typeof siteData === 'object' ? siteData : {};
  const existing = source._features && typeof source._features === 'object'
    ? source._features
    : {};

  const booking = existing.booking && typeof existing.booking === 'object'
    ? existing.booking
    : { offered: true, enabled: true };
  const serviceRequests = existing.serviceRequests && typeof existing.serviceRequests === 'object'
    ? existing.serviceRequests
    : { offered: true, enabled: true };
  const bookingFees = existing.bookingFees && typeof existing.bookingFees === 'object'
    ? existing.bookingFees
    : { offered: true, enabled: false };

  const next = {
    ...existing,
    booking: { ...booking },
    serviceRequests: { ...serviceRequests },
    bookingFees: { ...bookingFees },
  };

  if (typeof updates.schedulingEnabled === 'boolean') {
    next.booking.enabled = updates.schedulingEnabled;
  }
  if (typeof updates.urgentEnabled === 'boolean') {
    next.serviceRequests.enabled = updates.urgentEnabled;
  }
  if (typeof updates.feesEnabled === 'boolean') {
    next.bookingFees.enabled = updates.feesEnabled;
  }

  return { ...source, _features: next };
}

/**
 * API response shape for GET /reminder-settings (includes reminder + intake flags).
 */
export function buildShopIntakeSettings(reminderSettings, tenant, siteData) {
  const parsed = parseSiteData(siteData);
  return {
    ...reminderSettings,
    scheduling_enabled: siteSchedulingEnabled(parsed, tenant),
    payment_enabled: sitePaymentEnabled(parsed, tenant),
    urgent_enabled: siteUrgentEnabled(parsed),
    fees_enabled: siteFeesEnabled(parsed),
    default_payment_type: tenant?.default_payment_type || 'none',
    default_deposit_percentage: tenant?.default_deposit_percentage ?? 50,
    connect_ready: ownerConnectReady(tenant?.users),
    online_card_ready: shopRequiresOnlineCard(tenant),
  };
}

/**
 * @param {object} body
 * @returns {{ tenantData: object, siteUpdates: object|null, errors: string[] }}
 */
export function parseShopIntakePutBody(body) {
  const tenantData = {};
  const siteUpdates = {};
  const errors = [];

  if (typeof body.scheduling_enabled === 'boolean') {
    tenantData.booking_page_enabled = body.scheduling_enabled;
    siteUpdates.schedulingEnabled = body.scheduling_enabled;
  }
  if (typeof body.payment_enabled === 'boolean') {
    tenantData.payment_enabled = body.payment_enabled;
  }
  if (typeof body.urgent_enabled === 'boolean') {
    siteUpdates.urgentEnabled = body.urgent_enabled;
  }
  if (typeof body.fees_enabled === 'boolean') {
    siteUpdates.feesEnabled = body.fees_enabled;
  }
  if (body.default_payment_type !== undefined) {
    const type = String(body.default_payment_type);
    if (!PAYMENT_TYPES.has(type)) {
      errors.push('default_payment_type must be none, full, or deposit');
    } else {
      tenantData.default_payment_type = type;
    }
  }
  if (body.default_deposit_percentage !== undefined) {
    const pct = Number(body.default_deposit_percentage);
    if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
      errors.push('default_deposit_percentage must be an integer between 1 and 100');
    } else {
      tenantData.default_deposit_percentage = pct;
    }
  }

  return {
    tenantData,
    siteUpdates: Object.keys(siteUpdates).length ? siteUpdates : null,
    errors,
  };
}

export { PAYMENT_TYPES };
