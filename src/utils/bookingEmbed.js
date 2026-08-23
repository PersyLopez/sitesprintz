/**
 * External booking provider embed helpers (Acuity, Calendly, Square).
 */

export const EXTERNAL_BOOKING_PROVIDERS = new Set([
  'acuity',
  'calendly',
  'square',
  'custom',
  'external',
]);

/**
 * @param {string} [provider]
 * @returns {boolean}
 */
export function isExternalBookingProvider(provider) {
  const normalized = String(provider || 'native').toLowerCase();
  return normalized !== 'native' && normalized !== 'link' && EXTERNAL_BOOKING_PROVIDERS.has(normalized);
}

/**
 * @param {object|null|undefined} siteData
 * @returns {{ provider: string, url: string }}
 */
export function resolveBookingConfig(siteData) {
  const booking = siteData?.booking || {};
  const sections = Array.isArray(siteData?.sections) ? siteData.sections : [];
  const section = sections.find((item) => item?.type === 'booking' || item?.type === 'native-booking');
  const content = section?.content || {};

  return {
    provider: content.provider || booking.provider || 'native',
    url: content.url || booking.url || '',
  };
}

/**
 * @param {object|null|undefined} siteData
 * @returns {boolean}
 */
export function siteHasExternalBooking(siteData) {
  const { provider, url } = resolveBookingConfig(siteData);
  return isExternalBookingProvider(provider) && Boolean(url);
}

/**
 * @param {string} provider
 * @param {string} url
 * @returns {string}
 */
export function getBookingEmbedUrl(provider, url) {
  const baseUrl = String(url || '').trim();
  if (!baseUrl) return '';

  const normalized = String(provider || 'custom').toLowerCase();

  if (normalized === 'calendly' && baseUrl.includes('calendly.com')) {
    if (baseUrl.includes('/embed')) return baseUrl;
    return baseUrl.replace('calendly.com/', 'calendly.com/embed/');
  }

  if (normalized === 'acuity') {
    const isAcuityHost = baseUrl.includes('acuityscheduling.com') || baseUrl.includes('.as.me');
    if (isAcuityHost && !baseUrl.includes('embed=true')) {
      return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}embed=true`;
    }
  }

  return baseUrl;
}
