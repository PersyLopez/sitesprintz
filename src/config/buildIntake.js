/**
 * Build-on-request intake schema — shared by public form and API route.
 */

import { FEATURES } from '../utils/planFeatures.js';
import { TIERS, TIER_INFO } from './tiers.js';
import { isSetupOfferActive, PRICING_CONFIG } from './pricing.config.js';
import {
  SERVICE_RADIUS_MILES,
  SERVICE_AREA_LABEL_MAX,
  normalizeServiceRadiusMiles,
  normalizeServiceAreaLabel,
} from '../utils/liveSiteContact.js';

const MAX_SHORT = 200;
const MAX_MEDIUM = 2000;
const MAX_LONG = 8000;
const MAX_URL = 2000;
const HTTPS_URL = /^https:\/\/.+/i;
const INTAKE_UPLOAD_PATH = /^\/uploads\/intake-[a-zA-Z0-9._-]+\.(jpe?g|png|gif|webp)$/i;
const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const CATALOG_MAX_ITEMS = 40;

export const BUILD_INTAKE_FORM_TYPE = 'build_intake';
export const BUILD_INTAKE_PLAN = TIERS.GROWTH_MANAGED;
export const BUILD_INTAKE_PLAN_PRICE = TIER_INFO[TIERS.GROWTH_MANAGED].price;
export const BUILD_INTAKE_STATUSES = Object.freeze(['unread', 'notify_failed', 'in_progress', 'done']);
export { CATALOG_MAX_ITEMS };

export const OPERATING_MODELS = Object.freeze(['solo', 'team']);
export const FULFILLMENT_MODES = Object.freeze(['pickup', 'shipping', 'both']);
export const PREFERRED_LOCALES = Object.freeze(['en', 'es']);

export const FEATURE_MODULES = Object.freeze({
  booking: {
    featureKey: FEATURES.EMBEDDED_BOOKING,
    fields: ['servicesText', 'depositCancellationPolicy', 'operatingModel', 'staffNames'],
  },
  shop: {
    featureKey: FEATURES.SHOPPING_CART,
    fields: ['productsText', 'fulfillmentMode'],
  },
  gallery: {
    featureKey: FEATURES.IMAGE_GALLERY,
    fields: ['extraAlbumUrl'],
  },
  staff: {
    featureKey: FEATURES.STAFF_PROFILES,
    fields: ['staffProfilesText'],
  },
  faq: {
    featureKey: FEATURES.FAQ_SECTION,
    fields: ['faqText'],
  },
  beforeAfter: {
    featureKey: FEATURES.BEFORE_AFTER_GALLERY,
    fields: ['beforeAfterText'],
  },
  quotes: {
    featureKey: FEATURES.QUOTE_REQUESTS,
    fields: ['quotesText'],
  },
  brandMatch: {
    featureKey: 'labor_brand_match',
    fields: ['brandColors', 'brandFileUrl'],
  },
  uniqueLook: {
    featureKey: 'labor_unique_look',
    fields: ['referenceUrls', 'vibeSentence'],
  },
});

export const FEATURE_MODULE_KEYS = Object.freeze(Object.keys(FEATURE_MODULES));
export { SERVICE_RADIUS_MILES };

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function sanitizeText(value, maxLength) {
  if (value == null || value === '') return '';
  return stripHtml(String(value)).slice(0, maxLength);
}

function sanitizeHttpsUrl(value) {
  const trimmed = stripHtml(String(value ?? ''));
  if (!trimmed) return '';
  if (!HTTPS_URL.test(trimmed)) return '';
  return trimmed.slice(0, MAX_URL);
}

/**
 * Public intake photos: https links or server-written /uploads/intake-* paths.
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeIntakePhotoUrl(value) {
  const trimmed = stripHtml(String(value ?? ''));
  if (!trimmed) return '';
  if (trimmed.includes('..') || trimmed.includes('\\')) return '';
  if (INTAKE_UPLOAD_PATH.test(trimmed)) {
    return trimmed.slice(0, MAX_URL);
  }
  if (HTTPS_URL.test(trimmed)) {
    return trimmed.slice(0, MAX_URL);
  }
  return '';
}

/**
 * @param {{ booking?: boolean, shop?: boolean }} features
 * @returns {'starter'|'growth'}
 */
export function recommendedPlanFromFeatures(features) {
  if (features?.booking || features?.shop) return TIERS.GROWTH;
  return TIERS.STARTER;
}

function sanitizeCatalogItems(raw) {
  if (!Array.isArray(raw)) return [];
  const items = [];
  for (const row of raw.slice(0, CATALOG_MAX_ITEMS)) {
    if (!row || typeof row !== 'object') continue;
    const name = sanitizeText(row.name, MAX_SHORT);
    const price = sanitizeText(row.price, 40);
    const photoUrl = sanitizeIntakePhotoUrl(row.photoUrl ?? row.photo);
    if (!name && !price && !photoUrl) continue;
    items.push({ name, price, photoUrl });
  }
  return items;
}

function sanitizeBoolean(value, defaultValue = false) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return defaultValue;
}

function sanitizeEnum(value, allowed, fallback = '') {
  const normalized = stripHtml(String(value ?? '')).toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function sanitizeFeatures(raw) {
  const features = {};
  for (const key of FEATURE_MODULE_KEYS) {
    features[key] = sanitizeBoolean(raw?.features?.[key] ?? raw?.[`feature_${key}`] ?? raw?.[key]);
  }
  return features;
}

/**
 * @param {Record<string, unknown>} body
 * @param {{ now?: Date }} [opts]
 * @returns {{ ok: true, data: object } | { ok: false, error: string, code: string }}
 */
export function sanitizeBuildIntake(body, opts = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Invalid payload', code: 'INVALID_BODY' };
  }

  if (sanitizeText(body.website, 10)) {
    return { ok: false, error: 'Rejected', code: 'SPAM' };
  }

  const contactName = sanitizeText(body.contactName, MAX_SHORT);
  const contactEmail = stripHtml(String(body.contactEmail ?? '')).toLowerCase().slice(0, 254);
  const businessName = sanitizeText(body.businessName, MAX_SHORT);

  if (!contactName) {
    return { ok: false, error: 'Contact name is required', code: 'MISSING_CONTACT_NAME' };
  }
  if (!contactEmail || !EMAIL_PATTERN.test(contactEmail)) {
    return { ok: false, error: 'Valid contact email is required', code: 'INVALID_EMAIL' };
  }
  if (!businessName) {
    return { ok: false, error: 'Business name is required', code: 'MISSING_BUSINESS_NAME' };
  }

  const offerActive = isSetupOfferActive(opts.now || new Date());
  if (!offerActive && !sanitizeBoolean(body.acceptedManagedPlan)) {
    return {
      ok: false,
      error: 'Growth Managed at $75/month must be accepted',
      code: 'MISSING_PLAN_ACK',
    };
  }

  const features = sanitizeFeatures(body);
  if (sanitizeBoolean(body.wantsScheduling)) features.booking = true;
  if (sanitizeBoolean(body.wantsOrdering)) features.shop = true;
  const byAppointment = sanitizeBoolean(body.byAppointment);
  const hoursText = byAppointment ? '' : sanitizeText(body.hoursText, MAX_MEDIUM);
  const locationPublic = sanitizeBoolean(body.locationPublic, false);
  const serviceAreaLabel = normalizeServiceAreaLabel(body.serviceAreaLabel ?? body.cityServiceArea);
  const serviceRadiusMiles = normalizeServiceRadiusMiles(body.serviceRadiusMiles) ?? 10;
  const recommendedPlan = offerActive
    ? recommendedPlanFromFeatures(features)
    : BUILD_INTAKE_PLAN;
  const planPriceMonthly = TIER_INFO[recommendedPlan]?.price ?? BUILD_INTAKE_PLAN_PRICE;
  const offer = PRICING_CONFIG.setupOffer;

  const data = {
    contactName,
    contactEmail,
    contactPhone: sanitizeText(body.contactPhone, 40),
    businessName,
    businessTagline: sanitizeText(body.businessTagline, MAX_SHORT),
    cityServiceArea: sanitizeText(body.cityServiceArea, SERVICE_AREA_LABEL_MAX),
    streetAddress: sanitizeText(body.streetAddress, MAX_MEDIUM),
    locationPublic,
    serviceAreaLabel: locationPublic ? '' : serviceAreaLabel,
    serviceRadiusMiles: locationPublic ? null : serviceRadiusMiles,
    hoursText,
    byAppointment,
    website: sanitizeHttpsUrl(body.websiteUrl ?? body.sourceWebsite),
    instagram: sanitizeHttpsUrl(body.instagram),
    facebook: sanitizeHttpsUrl(body.facebook),
    scheduler: sanitizeHttpsUrl(body.scheduler),
    googleMaps: sanitizeHttpsUrl(body.googleMaps),
    logoUrl: sanitizeIntakePhotoUrl(body.logoUrl) || sanitizeHttpsUrl(body.logoUrl),
    photosUrl: sanitizeHttpsUrl(body.photosUrl),
    coverPhotoUrl: sanitizeIntakePhotoUrl(body.coverPhotoUrl),
    catalogItems: sanitizeCatalogItems(body.catalogItems),
    aboutBio: sanitizeText(body.aboutBio, MAX_LONG),
    customDomain: sanitizeText(body.customDomain, MAX_SHORT),
    preferredLocale: sanitizeEnum(body.preferredLocale, PREFERRED_LOCALES, 'en'),
    features,
    wantsScheduling: Boolean(features.booking),
    wantsOrdering: Boolean(features.shop),
    servicesText: sanitizeText(body.servicesText, MAX_LONG),
    depositCancellationPolicy: sanitizeText(body.depositCancellationPolicy, MAX_MEDIUM),
    operatingModel: sanitizeEnum(body.operatingModel, OPERATING_MODELS),
    staffNames: sanitizeText(body.staffNames, MAX_MEDIUM),
    productsText: sanitizeText(body.productsText, MAX_LONG),
    fulfillmentMode: sanitizeEnum(body.fulfillmentMode, FULFILLMENT_MODES),
    extraAlbumUrl: sanitizeHttpsUrl(body.extraAlbumUrl),
    staffProfilesText: sanitizeText(body.staffProfilesText, MAX_MEDIUM),
    faqText: sanitizeText(body.faqText, MAX_LONG),
    beforeAfterText: sanitizeText(body.beforeAfterText, MAX_LONG),
    quotesText: sanitizeText(body.quotesText, MAX_MEDIUM),
    brandColors: sanitizeText(body.brandColors, MAX_MEDIUM),
    brandFileUrl: sanitizeHttpsUrl(body.brandFileUrl),
    referenceUrls: sanitizeText(body.referenceUrls, MAX_MEDIUM),
    vibeSentence: sanitizeText(body.vibeSentence, MAX_SHORT),
    plan: recommendedPlan,
    recommendedPlan,
    planPriceMonthly,
    acceptedManagedPlan: offerActive ? false : true,
    setupOfferActive: offerActive,
    setupOfferCampaignId: offerActive ? String(offer?.campaignId || '') : '',
    submittedAt: new Date().toISOString(),
  };

  return { ok: true, data };
}

export default sanitizeBuildIntake;
