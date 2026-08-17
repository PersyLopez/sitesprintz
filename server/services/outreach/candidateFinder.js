/**
 * Admin outreach candidate finder — Google Places search + frozen scoring.
 * No social-network crawling; Places JSON API only.
 */

const PLACES_DETAILS_FIELDS = [
  'place_id',
  'name',
  'formatted_address',
  'formatted_phone_number',
  'international_phone_number',
  'website',
  'url',
  'rating',
  'user_ratings_total',
  'opening_hours',
  'photos',
  'types',
  'business_status',
].join(',');

const DETAILS_FETCH_CAP = 20;
const DEFAULT_RADIUS_METERS = 5000;

const SOCIAL_HOSTS = [
  'facebook.com',
  'fb.com',
  'instagram.com',
  'linktr.ee',
  'linktree.com',
  'nolt.io',
];

const REAL_HOST_NEEDLES = [
  'wix',
  'squarespace',
  'shopify',
  'wordpress.com',
  'godaddy',
  'squares.site',
  'sitesprintz',
];

/** Places `types[]` → layout/niche. First listed type that maps wins. */
export const PLACE_TYPE_TO_NICHE = {
  hair_care: { layoutKey: 'atelier', niche: 'salon' },
  beauty_salon: { layoutKey: 'atelier', niche: 'salon' },
  spa: { layoutKey: 'atelier', niche: 'salon' },
  gym: { layoutKey: 'atelier', niche: 'gym' },
  pet_store: { layoutKey: 'atelier', niche: 'pet-care' },
  veterinarian: { layoutKey: 'atelier', niche: 'pet-care' },
  electronics_repair: { layoutKey: 'atelier', niche: 'tech-repair' },
  electrician: { layoutKey: 'craftsman', niche: 'electrician' },
  plumber: { layoutKey: 'craftsman', niche: 'plumbing' },
  car_repair: { layoutKey: 'craftsman', niche: 'auto-repair' },
  car_wash: { layoutKey: 'craftsman', niche: 'auto-repair' },
  moving_company: { layoutKey: 'craftsman', niche: 'cleaning' },
  locksmith: { layoutKey: 'craftsman', niche: 'cleaning' },
  roofing_contractor: { layoutKey: 'craftsman', niche: 'cleaning' },
  food_truck: { layoutKey: 'bazaar', niche: 'food-stall' },
  restaurant: { layoutKey: 'mercantile', niche: 'restaurant' },
  cafe: { layoutKey: 'mercantile', niche: 'restaurant' },
  meal_takeaway: { layoutKey: 'mercantile', niche: 'restaurant' },
  bakery: { layoutKey: 'mercantile', niche: 'restaurant' },
  clothing_store: { layoutKey: 'mercantile', niche: 'product-showcase' },
  florist: { layoutKey: 'mercantile', niche: 'product-showcase' },
  store: { layoutKey: 'mercantile', niche: 'product-showcase' },
  lawyer: { layoutKey: 'counsel', niche: 'consultant' },
  accountant: { layoutKey: 'counsel', niche: 'consultant' },
  real_estate_agency: { layoutKey: 'counsel', niche: 'consultant' },
  insurance_agency: { layoutKey: 'counsel', niche: 'consultant' },
};

export class PlacesApiError extends Error {
  constructor(message, statusCode = 502, googleStatus = null) {
    super(message);
    this.name = 'PlacesApiError';
    this.statusCode = statusCode;
    this.googleStatus = googleStatus;
  }
}

export function hasPlacesApiKey() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}

function getPlacesApiKey() {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || '';
}

function getFetch() {
  return typeof globalThis !== 'undefined' && globalThis.fetch ? globalThis.fetch : fetch;
}

function hostnameFromWebsite(website) {
  if (!website || !String(website).trim()) return null;
  try {
    const raw = String(website).trim();
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function hostMatchesSocial(host) {
  return SOCIAL_HOSTS.some((s) => host === s || host.endsWith(`.${s}`));
}

function hostLooksLikeBuilder(host) {
  return REAL_HOST_NEEDLES.some((needle) => host.includes(needle));
}

/**
 * Classify a website URL into none | social | real.
 * Unknown / unparseable websites are `none` (manual-add unknown website).
 */
export function classifyWebsite(website) {
  if (!website || !String(website).trim()) return 'none';
  const host = hostnameFromWebsite(website);
  if (!host) return 'none';
  if (hostMatchesSocial(host)) return 'social';
  if (hostLooksLikeBuilder(host)) return 'real';
  return 'real';
}

export function mapTypesToNiche(types = []) {
  for (const type of types) {
    const mapped = PLACE_TYPE_TO_NICHE[type];
    if (mapped) return { ...mapped, matched: true };
  }
  return { layoutKey: 'atelier', niche: 'unknown', matched: false };
}

function hasHoursInfo(openingHours) {
  if (!openingHours || typeof openingHours !== 'object') return false;
  if (Array.isArray(openingHours.weekday_text) && openingHours.weekday_text.length > 0) {
    return true;
  }
  return openingHours.open_now !== undefined && openingHours.open_now !== null;
}

function socialReason(website) {
  const host = hostnameFromWebsite(website) || '';
  if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.com' || host.endsWith('.fb.com')) {
    return 'Facebook-only page';
  }
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    return 'Instagram-only page';
  }
  if (host.includes('linktr.ee') || host.includes('linktree.com')) {
    return 'Linktree-only page';
  }
  if (host === 'nolt.io' || host.endsWith('.nolt.io')) {
    return 'Nolt-only page';
  }
  return 'Social-only website';
}

function present(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

/**
 * Frozen good-fit score. Pure; no network.
 * @param {object} place
 * @returns {object} scored candidate
 */
export function scoreCandidate(place = {}) {
  const name = present(place.name) ? String(place.name).trim() : '';
  const address = present(place.address) ? String(place.address).trim() : '';
  const phone = present(place.phone) ? String(place.phone).trim() : '';
  const website = present(place.website) ? String(place.website).trim() : '';
  const websiteKind = classifyWebsite(website);
  const types = Array.isArray(place.types) ? place.types : [];
  const nicheMap = mapTypesToNiche(types);
  const rating = typeof place.rating === 'number' ? place.rating : Number(place.rating) || 0;
  const reviewCount = Number(place.reviewCount ?? place.user_ratings_total ?? 0) || 0;
  const photoCount = Number(place.photoCount ?? (Array.isArray(place.photos) ? place.photos.length : 0)) || 0;
  const openingHours = place.openingHours || place.opening_hours || null;
  const hasHours = hasHoursInfo(openingHours);
  const businessStatus = place.businessStatus || place.business_status || null;

  const failReasons = [];
  if (businessStatus && businessStatus !== 'OPERATIONAL') {
    failReasons.push(`business_status ${businessStatus}`);
  }
  if (!name) failReasons.push('missing name');
  if (!address && !phone) failReasons.push('missing address and phone');
  if (websiteKind === 'real') failReasons.push('real website');

  let score = 0;
  const reasons = [];

  if (websiteKind === 'none') {
    score += 25;
    reasons.push('No website');
  } else if (websiteKind === 'social') {
    score += 15;
    reasons.push(socialReason(website));
  }

  const ratingOk = rating >= 4.0;
  const reviewsOk = reviewCount >= 8 && reviewCount <= 400;
  if (ratingOk && reviewsOk) {
    score += 15;
    score += 15;
    reasons.push(`${rating} from ${reviewCount} reviews`);
  } else {
    if (ratingOk) {
      score += 15;
      reasons.push(`Rated ${rating}`);
    }
    if (reviewsOk) {
      score += 15;
      reasons.push(`${reviewCount} reviews`);
    }
  }

  if (hasHours) {
    score += 10;
    reasons.push('Has hours');
  }
  if (photoCount >= 1) {
    score += 10;
    reasons.push('Has photos');
  }
  if (phone) {
    score += 10;
    reasons.push('Has phone');
  }
  if (nicheMap.matched) {
    score += 10;
    reasons.push(`Matches ${nicheMap.niche} niche`);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    fit: failReasons.length === 0,
    failReasons,
    placeId: place.placeId || place.place_id || null,
    name,
    address: address || null,
    phone: phone || null,
    email: present(place.email) ? String(place.email).trim() : null,
    website: website || null,
    websiteKind,
    mapsUrl: present(place.mapsUrl) ? String(place.mapsUrl).trim() : (place.url || null),
    niche: place.niche || nicheMap.niche,
    layoutKey: place.layoutKey || nicheMap.layoutKey,
    types,
    rating: rating || null,
    reviewCount,
    hasHours,
    photoCount,
    score,
    reasons,
    notes: present(place.notes) ? String(place.notes) : null,
  };
}

/**
 * Extract a Google Place ID from common Maps URLs.
 */
export function parsePlaceIdFromMapsUrl(mapsUrl) {
  if (!mapsUrl || !String(mapsUrl).trim()) return null;
  const raw = String(mapsUrl).trim();

  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const placeIdParam = url.searchParams.get('place_id') || url.searchParams.get('query_place_id');
    if (placeIdParam) return placeIdParam;

    const q = url.searchParams.get('q') || '';
    const qMatch = q.match(/place_id:([A-Za-z0-9_-]+)/i);
    if (qMatch) return qMatch[1];

    const pathMatch = url.pathname.match(/\/(?:maps\/)?place\/((?:ChIJ|GhIJ|Ej)[A-Za-z0-9_-]+)/);
    if (pathMatch) return pathMatch[1];

    const data = url.searchParams.get('data') || url.hash || '';
    const dataMatch = `${url.pathname}${url.search}${data}`.match(/!1s((?:ChIJ|GhIJ|Ej)[A-Za-z0-9_-]+)/);
    if (dataMatch) return dataMatch[1];
  } catch {
    // fall through to regex on the raw string
  }

  const loose = raw.match(/place_id[=:]([A-Za-z0-9_-]+)/i)
    || raw.match(/query_place_id=([A-Za-z0-9_-]+)/i)
    || raw.match(/((?:ChIJ|GhIJ|Ej)[A-Za-z0-9_-]{10,})/);
  return loose ? loose[1] : null;
}

export function placeFromDetails(result = {}) {
  return {
    placeId: result.place_id || null,
    name: result.name || '',
    address: result.formatted_address || result.vicinity || '',
    phone: result.formatted_phone_number || result.international_phone_number || '',
    website: result.website || '',
    mapsUrl: result.url || '',
    types: result.types || [],
    rating: result.rating,
    reviewCount: result.user_ratings_total,
    openingHours: result.opening_hours || null,
    photos: result.photos || [],
    photoCount: Array.isArray(result.photos) ? result.photos.length : 0,
    businessStatus: result.business_status || null,
  };
}

function assertGoogleStatus(data, httpStatus) {
  if (httpStatus === 429 || data.status === 'OVER_QUERY_LIMIT') {
    throw new PlacesApiError('Rate limit exceeded', 429, data.status);
  }
  if (data.status === 'REQUEST_DENIED' || data.status === 'INVALID_REQUEST') {
    throw new PlacesApiError(data.error_message || `API error: ${data.status}`, 400, data.status);
  }
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new PlacesApiError(data.error_message || `API error: ${data.status}`, 502, data.status);
  }
}

async function placesGetJson(url) {
  const fetchFn = getFetch();
  const response = await fetchFn(url);
  if (response.status === 429) {
    throw new PlacesApiError('Rate limit exceeded', 429);
  }
  if (!response.ok) {
    throw new PlacesApiError(`API request failed: ${response.status}`, response.status >= 500 ? 502 : response.status);
  }
  const data = await response.json();
  assertGoogleStatus(data, response.status);
  return data;
}

export async function geocodeCity(city) {
  const key = getPlacesApiKey();
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${key}`;
  const data = await placesGetJson(url);
  const loc = data.results?.[0]?.geometry?.location;
  if (!loc) {
    throw new PlacesApiError('Could not geocode city', 400, data.status);
  }
  return loc;
}

export async function nearbySearch({ lat, lng, radiusMeters, keyword }) {
  const key = getPlacesApiKey();
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(radiusMeters),
    key,
  });
  if (keyword) params.set('keyword', keyword);
  else params.set('type', 'establishment');

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`;
  const data = await placesGetJson(url);
  return data.results || [];
}

export async function fetchPlaceDetails(placeId) {
  if (!placeId) return null;
  const key = getPlacesApiKey();
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${PLACES_DETAILS_FIELDS}&key=${key}`;
  const data = await placesGetJson(url);
  return data.result || null;
}

/**
 * Geocode + Nearby Search + Place Details, then score. Does not persist.
 * Returns only good-fit candidates, score desc.
 */
export async function searchPlacesCandidates({ city, niche, keyword, radiusMeters } = {}) {
  const loc = await geocodeCity(city);
  const radius = Number(radiusMeters) > 0 ? Number(radiusMeters) : DEFAULT_RADIUS_METERS;
  const query = (keyword || niche || '').trim();
  const nearby = await nearbySearch({
    lat: loc.lat,
    lng: loc.lng,
    radiusMeters: radius,
    keyword: query,
  });

  const slice = nearby.slice(0, DETAILS_FETCH_CAP);
  const scored = [];

  for (const item of slice) {
    let details = item;
    try {
      const fetched = await fetchPlaceDetails(item.place_id);
      if (fetched) details = fetched;
    } catch (err) {
      if (err instanceof PlacesApiError && err.statusCode === 429) throw err;
      continue;
    }
    const candidate = scoreCandidate(placeFromDetails(details));
    if (candidate.fit) scored.push(candidate);
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export { DETAILS_FETCH_CAP, DEFAULT_RADIUS_METERS };
