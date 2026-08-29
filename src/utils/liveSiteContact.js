/**
 * Shared NAP / conversion helpers for live published sites.
 */

import { getLayout } from '../config/layouts.js';
import { FEATURES, hasFeature } from './planFeatures.js';
import { PLATFORM_SUPPORT_EMAIL } from '../config/pricing.config.js';

const PRIMARY_BY_INTENT = {
  booking: { href: '#booking', label: 'Book', stickyTestId: 'sticky-cta-book' },
  quote: { href: '#contact', label: 'Get a Quote', stickyTestId: 'sticky-cta-quote' },
  ordering: { href: '#catalog', label: 'Order', stickyTestId: 'sticky-cta-order' },
  contact: { href: '#contact', label: 'Contact', stickyTestId: 'sticky-cta-contact' },
};

export const ADDRESS_DISPLAY_STREET = 'street';
export const ADDRESS_DISPLAY_AREA = 'area';
export const SERVICE_RADIUS_MILES = Object.freeze([5, 10, 15, 25, 50]);
export const SERVICE_AREA_LABEL_MAX = 80;

const AREA_PUBLISH_ERROR = 'AREA_LOCATION_INCOMPLETE';

export function telHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

export function resolveSitePhone(siteData) {
  const fromSection = (Array.isArray(siteData?.sections) ? siteData.sections : [])
    .find((section) => section?.type === 'contact')?.content?.phone;
  return siteData?.contactPhone || siteData?.contact?.phone || fromSection || '';
}

export function normalizeAddressDisplay(value) {
  return value === ADDRESS_DISPLAY_AREA ? ADDRESS_DISPLAY_AREA : ADDRESS_DISPLAY_STREET;
}

export function isAreaDisplay(siteData) {
  return normalizeAddressDisplay(siteData?.contact?.addressDisplay) === ADDRESS_DISPLAY_AREA;
}

export function normalizeServiceRadiusMiles(value) {
  const miles = Number(value);
  return SERVICE_RADIUS_MILES.includes(miles) ? miles : null;
}

export function normalizeServiceAreaLabel(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SERVICE_AREA_LABEL_MAX);
}

export function formatServiceAreaLine(label, radiusMiles) {
  const area = normalizeServiceAreaLabel(label);
  const miles = normalizeServiceRadiusMiles(radiusMiles);
  if (!area) return '';
  if (!miles) return `Serving ${area}`;
  return `Serving ${area} · within ${miles} miles`;
}

export function isValidPublicGeo(value) {
  if (!value || typeof value !== 'object') return false;
  const lat = Number(value.lat);
  const lng = Number(value.lng);
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180;
}

function sectionStreet(siteData) {
  const fromSection = (Array.isArray(siteData?.sections) ? siteData.sections : [])
    .find((section) => section?.type === 'location' || section?.type === 'contact')?.content?.address;
  return String(fromSection || '').trim();
}

function publicLineFromContact(contact) {
  return formatServiceAreaLine(contact?.serviceAreaLabel, contact?.serviceRadiusMiles);
}

/**
 * Private street from owner/draft site_data. Empty on already-redacted public payloads.
 */
export function resolvePrivateStreet(siteData) {
  const contact = siteData?.contact && typeof siteData.contact === 'object' ? siteData.contact : {};
  const privateStreet = String(contact.privateStreet || '').trim();
  if (privateStreet) return privateStreet;

  const publicLine = publicLineFromContact(contact);
  const candidates = [
    contact.address,
    siteData?.contactAddress,
    siteData?.businessAddress,
    sectionStreet(siteData),
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (!value) continue;
    if (publicLine && value === publicLine) continue;
    return value;
  }
  return '';
}

export function resolvePublicLocation(siteData) {
  const contact = siteData?.contact && typeof siteData.contact === 'object' ? siteData.contact : {};
  const radiusMiles = normalizeServiceRadiusMiles(contact.serviceRadiusMiles);
  const label = normalizeServiceAreaLabel(contact.serviceAreaLabel);
  const displayLine = formatServiceAreaLine(label, radiusMiles);
  const geo = isValidPublicGeo(contact.publicGeo) ? { lat: Number(contact.publicGeo.lat), lng: Number(contact.publicGeo.lng) } : null;

  if (isAreaDisplay(siteData)) {
    return {
      mode: ADDRESS_DISPLAY_AREA,
      displayLine,
      label,
      radiusMiles,
      publicGeo: geo,
      showMapCircle: Boolean(geo && radiusMiles),
    };
  }

  return {
    mode: ADDRESS_DISPLAY_STREET,
    displayLine: resolvePrivateStreet(siteData) || String(siteData?.contactAddress || contact.address || sectionStreet(siteData) || '').trim(),
    label: '',
    radiusMiles: null,
    publicGeo: null,
    showMapCircle: false,
  };
}

export function resolveSiteAddress(siteData) {
  return resolvePublicLocation(siteData).displayLine || '';
}

/**
 * Street for confirmed buyers. Empty unless area mode and a private street exists.
 */
export function resolvePrivateAddressForBuyer(siteData) {
  if (!isAreaDisplay(siteData)) return '';
  return resolvePrivateStreet(siteData);
}

export function normalizeContactLocationFields(siteData) {
  if (!siteData || typeof siteData !== 'object') return siteData;
  const contact = { ...(siteData.contact && typeof siteData.contact === 'object' ? siteData.contact : {}) };
  contact.addressDisplay = normalizeAddressDisplay(contact.addressDisplay);
  contact.serviceAreaLabel = normalizeServiceAreaLabel(contact.serviceAreaLabel);
  const radius = normalizeServiceRadiusMiles(contact.serviceRadiusMiles);
  if (radius) contact.serviceRadiusMiles = radius;
  else delete contact.serviceRadiusMiles;
  const street = String(contact.address || siteData.contactAddress || '').trim();
  if (contact.addressDisplay === ADDRESS_DISPLAY_AREA && street) {
    contact.privateStreet = street;
    contact.address = street;
  }
  siteData.contact = contact;
  return siteData;
}

export function assertPublishableLocation(siteData) {
  if (!isAreaDisplay(siteData)) return;
  const label = normalizeServiceAreaLabel(siteData?.contact?.serviceAreaLabel);
  const radius = normalizeServiceRadiusMiles(siteData?.contact?.serviceRadiusMiles);
  if (!label || !radius) {
    const error = new Error('Area display requires a service area and radius');
    error.code = AREA_PUBLISH_ERROR;
    throw error;
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function rewriteAddressFields(target, displayLine) {
  if (!target || typeof target !== 'object') return;
  if (Object.prototype.hasOwnProperty.call(target, 'address')) {
    target.address = displayLine;
  }
  if (Object.prototype.hasOwnProperty.call(target, 'mapUrl')) {
    target.mapUrl = '';
  }
  if (Object.prototype.hasOwnProperty.call(target, 'coordinates')) {
    delete target.coordinates;
  }
  if (Object.prototype.hasOwnProperty.call(target, 'privateStreet')) {
    delete target.privateStreet;
  }
  if (Object.prototype.hasOwnProperty.call(target, 'geoSeed')) {
    delete target.geoSeed;
  }
}

function walkSections(node, displayLine) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item) => walkSections(item, displayLine));
    return;
  }
  if (node.type === 'contact' || node.type === 'location') {
    if (node.content && typeof node.content === 'object') {
      rewriteAddressFields(node.content, displayLine);
    }
  }
  Object.values(node).forEach((value) => {
    if (value && typeof value === 'object') walkSections(value, displayLine);
  });
}

/**
 * Public clone for unauthenticated HTML/JSON/API. Owner/draft payloads must not use this.
 */
export function applyGalleryDemoSupportEmail(siteData) {
  if (!siteData || typeof siteData !== 'object') return siteData;
  if (siteData._demo !== true && siteData.settings?.demoMode !== true) {
    return siteData;
  }
  const next = cloneJson(siteData);
  const email = PLATFORM_SUPPORT_EMAIL;
  if (next.contact && typeof next.contact === 'object') {
    next.contact.email = email;
  }
  next.contactEmail = email;
  if (next.brand && typeof next.brand === 'object') {
    next.brand = { ...next.brand, email };
  }
  if (next.published && typeof next.published === 'object') {
    next.published = { ...next.published, email };
  }
  if (Array.isArray(next.sections)) {
    next.sections = next.sections.map((section) => {
      if (!section?.content || typeof section.content !== 'object') return section;
      if (section.type !== 'contact' && section.type !== 'footer') return section;
      return { ...section, content: { ...section.content, email } };
    });
  }
  return next;
}

export function toPublicSiteData(siteData) {
  if (!siteData || typeof siteData !== 'object') return siteData;
  const publicData = applyGalleryDemoSupportEmail(cloneJson(siteData));
  if (!isAreaDisplay(publicData)) return publicData;

  const location = resolvePublicLocation(publicData);
  const displayLine = location.displayLine;
  const contact = publicData.contact && typeof publicData.contact === 'object' ? publicData.contact : {};
  publicData.contact = {
    ...contact,
    address: displayLine,
    addressDisplay: ADDRESS_DISPLAY_AREA,
    serviceAreaLabel: location.label,
    serviceRadiusMiles: location.radiusMiles,
    publicGeo: location.publicGeo,
  };
  delete publicData.contact.privateStreet;
  delete publicData.contact.coordinates;
  delete publicData.contact.geoSeed;
  publicData.contactAddress = displayLine;
  if (Object.prototype.hasOwnProperty.call(publicData, 'businessAddress')) {
    publicData.businessAddress = displayLine;
  }
  if (publicData.social && typeof publicData.social === 'object') {
    publicData.social = { ...publicData.social, maps: '' };
  }
  if (Object.prototype.hasOwnProperty.call(publicData, 'googleMapsUrl')) {
    publicData.googleMapsUrl = '';
  }
  walkSections(publicData, displayLine);
  return publicData;
}

export function publicSiteContainsStreet(publicData, street) {
  const needle = String(street || '').trim();
  if (!needle) return false;
  return JSON.stringify(publicData).includes(needle);
}

export function preservePrivateLocation(ownerData, incoming) {
  if (!incoming || typeof incoming !== 'object') return incoming;
  if (!isAreaDisplay(ownerData)) return incoming;
  const ownerContact = ownerData.contact && typeof ownerData.contact === 'object' ? ownerData.contact : {};
  const next = incoming;
  next.contact = {
    ...(next.contact && typeof next.contact === 'object' ? next.contact : {}),
    address: ownerContact.address,
    privateStreet: ownerContact.privateStreet || ownerContact.address,
    geoSeed: ownerContact.geoSeed,
    addressDisplay: ADDRESS_DISPLAY_AREA,
  };
  if (ownerData.contactAddress) {
    next.contactAddress = ownerData.contactAddress;
  }
  return next;
}

export function resolvePrimaryCta(siteData, page) {
  const layoutKey = page?.layout || siteData?._layout;
  const intent = getLayout(layoutKey)?.hero?.ctaDefault || 'contact';
  return PRIMARY_BY_INTENT[intent] || PRIMARY_BY_INTENT.contact;
}

export function shouldRemoveBranding(siteData) {
  if (siteData?.settings?.removeBranding !== true) return false;
  return hasFeature(siteData?.plan || siteData?.settings?.tier, FEATURES.REMOVE_BRANDING);
}
