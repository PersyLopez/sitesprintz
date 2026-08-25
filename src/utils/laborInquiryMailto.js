import { PRICING_CONFIG } from '../config/pricing.config';

const ALLOWED_TOPICS = new Set([
  'optional extras',
  'managed care',
  'brand match',
  'unique look',
]);

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function isSafeLaborEmail(email) {
  return typeof email === 'string' && email.length <= 80 && EMAIL_PATTERN.test(email);
}

export function sanitizeLaborTopic(topic) {
  const value = String(topic || '').trim().slice(0, 40).toLowerCase();
  return ALLOWED_TOPICS.has(value) ? value : 'optional extras';
}

export function laborDisplayVars(labor = PRICING_CONFIG.labor) {
  const care = Number(labor?.managedCare?.price);
  const extra = Number(labor?.extraBatch?.price);
  const brand = Number(labor?.brandMatch?.price);
  const look = Number(labor?.uniqueLook?.price);
  const batches = Number(labor?.managedCare?.batchesPerMonth);
  if (![care, extra, brand, look, batches].every(Number.isFinite)) {
    return null;
  }
  return { care, extra, brand, look, batches };
}

/**
 * Mail client only. Never pass claim tokens, JWTs, or the page URL.
 * @param {string} [topic]
 * @param {typeof PRICING_CONFIG.labor} [labor]
 * @returns {string|null} mailto href or null if email is not safe
 */
export function laborInquiryMailto(topic = 'optional extras', labor = PRICING_CONFIG.labor) {
  const email = labor?.contactEmail;
  if (!isSafeLaborEmail(email)) {
    return null;
  }
  const safeTopic = sanitizeLaborTopic(topic);
  const subject = encodeURIComponent(`SiteSprintz — ${safeTopic}`);
  const body = encodeURIComponent(
    'Account email:\nSite (if you have one):\nWhat you need:\n',
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
