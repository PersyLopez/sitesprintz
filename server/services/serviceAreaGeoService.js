import { createHmac, randomBytes } from 'crypto';
import { getRequiredSecret } from '../config/secrets.js';
import {
  isAreaDisplay,
  isValidPublicGeo,
  normalizeServiceAreaLabel,
  normalizeServiceRadiusMiles,
  resolvePrivateStreet,
} from '../../src/utils/liveSiteContact.js';

const GEOCODE_TIMEOUT_MS = 3000;
const GEOCODE_RETRY_DELAY_MS = 400;
const METERS_PER_MILE = 1609.344;

function hmacBytes(siteId) {
  let secret = 'test-only-encryption_key-secret';
  try {
    secret = getRequiredSecret('ENCRYPTION_KEY', { allowTestFallback: true });
  } catch {
    secret = process.env.ENCRYPTION_KEY || secret;
  }
  return createHmac('sha256', secret).update(String(siteId || 'unknown')).digest();
}

export function jitterCoordinates(lat, lng, radiusMiles, siteId) {
  const radius = normalizeServiceRadiusMiles(radiusMiles);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !radius) return null;
  const digest = hmacBytes(siteId);
  const angle = (digest[0] / 255) * Math.PI * 2;
  const fraction = 0.15 + (digest[1] / 255) * 0.24;
  const offsetMiles = radius * fraction;
  const latRad = (lat * Math.PI) / 180;
  const milesPerDegLat = 69.0;
  const milesPerDegLng = Math.max(Math.cos(latRad) * 69.0, 0.01);
  const nextLat = lat + (offsetMiles / milesPerDegLat) * Math.cos(angle);
  const nextLng = lng + (offsetMiles / milesPerDegLng) * Math.sin(angle);
  const clampedLat = Math.max(-90, Math.min(90, nextLat));
  const clampedLng = ((nextLng + 540) % 360) - 180;
  return { lat: Number(clampedLat.toFixed(5)), lng: Number(clampedLng.toFixed(5)) };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, { headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) {
      throw new Error(`geocode_http_${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(task) {
  try {
    return await task();
  } catch {
    await sleep(GEOCODE_RETRY_DELAY_MS);
    return task();
  }
}

async function geocodeWithPlaces(query) {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`;
  const data = await fetchJson(url);
  const loc = data?.results?.[0]?.geometry?.location;
  if (!loc) return null;
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function geocodeWithNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const data = await fetchJson(url, {
    headers: { 'User-Agent': 'RightSiteLight/1.0 (service-area geocode)' },
  });
  const first = Array.isArray(data) ? data[0] : null;
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export async function geocodeQuery(query) {
  const text = String(query || '').trim();
  if (!text) return null;
  return withRetry(async () => {
    const fromPlaces = await geocodeWithPlaces(text);
    if (fromPlaces) return fromPlaces;
    return geocodeWithNominatim(text);
  });
}

/**
 * Attach jittered publicGeo when area mode is on. Never throws; keeps previous geo on failure.
 */
export async function ensurePublicGeo(siteData, { siteId } = {}) {
  if (!siteData || typeof siteData !== 'object' || !isAreaDisplay(siteData)) {
    return siteData;
  }
  const contact = siteData.contact && typeof siteData.contact === 'object' ? siteData.contact : {};
  siteData.contact = contact;
  if (!contact.geoSeed) {
    contact.geoSeed = randomBytes(16).toString('hex');
  }
  const radius = normalizeServiceRadiusMiles(contact.serviceRadiusMiles);
  const label = normalizeServiceAreaLabel(contact.serviceAreaLabel);
  const street = String(contact.privateStreet || contact.address || '').trim();
  const query = street || label;
  if (!query || !radius) return siteData;

  try {
    const exact = await geocodeQuery(query);
    if (!exact) return siteData;
    const jittered = jitterCoordinates(exact.lat, exact.lng, radius, contact.geoSeed);
    if (jittered) {
      contact.publicGeo = jittered;
    }
  } catch {
    if (!isValidPublicGeo(contact.publicGeo)) {
      // leave missing; renderers omit the map
    }
  }
  return siteData;
}

export function radiusMeters(radiusMiles) {
  const miles = normalizeServiceRadiusMiles(radiusMiles);
  return miles ? Math.round(miles * METERS_PER_MILE) : null;
}

/**
 * Great-circle distance in miles between two WGS84 points.
 * @param {{ lat: number, lng: number }} a
 * @param {{ lat: number, lng: number }} b
 * @returns {number|null}
 */
export function milesBetween(a, b) {
  const lat1 = Number(a?.lat);
  const lng1 = Number(a?.lng);
  const lat2 = Number(b?.lat);
  const lng2 = Number(b?.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) ** 2;
  const earthMiles = 3958.7613;
  return earthMiles * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Geocode shop private street as delivery origin.
 * @param {object} siteData
 * @returns {Promise<{ lat: number, lng: number }|null>}
 */
export async function geocodeShopDeliveryOrigin(siteData) {
  const street = resolvePrivateStreet(siteData);
  if (!street) return null;
  return geocodeQuery(street);
}

/**
 * Miles from shop private street to a customer delivery address.
 * @param {object} siteData
 * @param {string} deliveryAddress
 * @returns {Promise<
 *   | { ok: true, miles: number, origin: {lat:number,lng:number}, destination: {lat:number,lng:number} }
 *   | { ok: false, code: string, error: string }
 * >}
 */
export async function measureDeliveryMiles(siteData, deliveryAddress) {
  const address = String(deliveryAddress || '').trim();
  if (!address) {
    return { ok: false, code: 'DELIVERY_ADDRESS_REQUIRED', error: 'Delivery address is required' };
  }

  const origin = await geocodeShopDeliveryOrigin(siteData);
  if (!origin) {
    return {
      ok: false,
      code: 'DELIVERY_ORIGIN_REQUIRED',
      error: 'This shop has no delivery origin address configured',
    };
  }

  const destination = await geocodeQuery(address);
  if (!destination) {
    return {
      ok: false,
      code: 'DELIVERY_ADDRESS_INVALID',
      error: 'Could not find that delivery address',
    };
  }

  const miles = milesBetween(origin, destination);
  if (miles == null) {
    return {
      ok: false,
      code: 'DELIVERY_DISTANCE_FAILED',
      error: 'Could not measure delivery distance',
    };
  }

  return {
    ok: true,
    miles: Math.round(miles * 10) / 10,
    origin,
    destination,
  };
}
