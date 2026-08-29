/**
 * Visitor-facing experience defaults for template / demo sites.
 * Live card checkout (Stripe Connect) is the only intentionally limited path.
 */

import { resolvePayOnSiteForPublish } from './payOnSite.js';
import { siteHasExternalBooking } from './bookingEmbed.js';

const BOOKING_SECTION_TYPES = new Set(['booking', 'native-booking']);

export { siteHasExternalBooking } from './bookingEmbed.js';

/**
 * True when the published site should run the native booking widget
 * (Growth embedded booking), not a Starter phone/external link.
 *
 * @param {object|null|undefined} siteData
 * @returns {boolean}
 */
export function siteSchedulingEnabled(siteData) {
  if (!siteData) return true;
  if (siteData._features?.booking?.enabled === false) return false;
  return true;
}

export function siteUrgentEnabled(siteData) {
  if (!siteData) return true;
  const state = siteData._features?.serviceRequests;
  if (state && typeof state === 'object' && state.enabled === false) return false;
  return true;
}

export function siteFeesEnabled(siteData) {
  if (!siteData) return false;
  const state = siteData._features?.bookingFees;
  return Boolean(state && typeof state === 'object' && state.enabled === true);
}

/**
 * True when at least one fee policy type is enabled for visitor disclosure.
 *
 * @param {object|null|undefined} policies
 * @returns {boolean}
 */
export function hasEnabledVisitorFeePolicies(policies) {
  if (!policies || typeof policies !== 'object') return false;
  const { cancellationPolicy, noShowPolicy, bookingFeePolicy } = policies;
  if (cancellationPolicy?.enabled && Array.isArray(cancellationPolicy.rules) && cancellationPolicy.rules.length) {
    return true;
  }
  if (noShowPolicy?.enabled && noShowPolicy.chargeOnNoShow !== false) {
    return true;
  }
  if (bookingFeePolicy?.enabled) {
    return true;
  }
  return false;
}

/**
 * Plain-language fee disclosure lines for the visitor booking form.
 *
 * @param {object|null|undefined} policies
 * @param {(key: string, vars?: Record<string, string|number>) => string} t
 * @returns {string[]}
 */
export function formatVisitorFeeNoticeLines(policies, t) {
  if (!policies || typeof policies !== 'object') return [];
  const lines = [];
  const { cancellationPolicy, noShowPolicy, bookingFeePolicy } = policies;

  if (cancellationPolicy?.enabled && Array.isArray(cancellationPolicy.rules)) {
    for (const rule of cancellationPolicy.rules) {
      if (rule.cancelWithinHours != null) {
        lines.push(t('booking.feeNotice.cancelWithin', {
          hours: rule.cancelWithinHours,
          percent: rule.feePercentage ?? 0,
        }));
      } else if (rule.cancelAfterHours != null) {
        lines.push(t('booking.feeNotice.cancelAfter', {
          hours: rule.cancelAfterHours,
          percent: rule.feePercentage ?? 0,
        }));
      }
    }
  }

  if (noShowPolicy?.enabled && noShowPolicy.chargeOnNoShow !== false) {
    if (noShowPolicy.feeType === 'fixed') {
      lines.push(t('booking.feeNotice.noShowFixed', {
        amount: noShowPolicy.feeAmount ?? 0,
      }));
    } else {
      lines.push(t('booking.feeNotice.noShowPercent', {
        percent: noShowPolicy.feeAmount ?? 0,
      }));
    }
  }

  if (bookingFeePolicy?.enabled) {
    if (bookingFeePolicy.type === 'flat') {
      const amountCents = bookingFeePolicy.amount ?? 0;
      lines.push(t('booking.feeNotice.bookingFeeFlat', {
        amount: (amountCents / 100).toFixed(2),
      }));
    } else {
      lines.push(t('booking.feeNotice.bookingPercent', {
        percent: bookingFeePolicy.percentage ?? 0,
      }));
    }
  }

  return lines;
}

export function siteWantsEmbeddedBooking(siteData) {
  if (!siteData) return false;
  if (!siteSchedulingEnabled(siteData)) return false;
  if (siteHasExternalBooking(siteData)) return true;
  if (siteData.booking?.mode === 'link' || siteData.booking?.embedded === false) {
    return false;
  }
  if (siteData.booking?.enabled === true || siteData.settings?.bookingEnabled === true) {
    return true;
  }
  if (siteData._features?.booking?.enabled === true) {
    return true;
  }
  const sections = Array.isArray(siteData.sections) ? siteData.sections : [];
  return sections.some((section) => {
    if (!section || section.enabled === false) return false;
    if (!BOOKING_SECTION_TYPES.has(section.type)) return false;
    const content = section.content || {};
    if (content.enabled === false) return false;
    if (content.mode === 'link' || content.mode === 'off') return false;
    return true;
  });
}

/**
 * True when the live site should mount the native SiteSprintz booking widget.
 *
 * @param {object|null|undefined} siteData
 * @returns {boolean}
 */
export function siteWantsNativeBooking(siteData) {
  return siteWantsEmbeddedBooking(siteData) && !siteHasExternalBooking(siteData);
}

/**
 * Stamp pay-on-site and native booking flags onto wizard / template siteData
 * so visitors get a complete experience before Stripe is connected.
 *
 * @param {object|null|undefined} siteData
 * @returns {object|null|undefined}
 */
export function applyVisitorExperienceDefaults(siteData) {
  if (!siteData) return siteData;
  siteData.settings = {
    ...(siteData.settings || {}),
    payOnSite: resolvePayOnSiteForPublish(siteData, true),
  };
  if (siteWantsEmbeddedBooking(siteData)) {
    const external = siteHasExternalBooking(siteData);
    siteData.booking = {
      ...(siteData.booking || {}),
      enabled: true,
      embedded: external ? false : true,
      mode: external ? 'embed' : (siteData.booking?.mode || 'native'),
      provider: siteData.booking?.provider || 'native',
    };
    siteData.settings.bookingEnabled = true;
  }
  return siteData;
}

/**
 * Subdomain from a live-site path (`/sites/:subdomain` or `/view/:subdomain`).
 *
 * @param {string} [pathname]
 * @returns {string}
 */
export function subdomainFromLivePath(pathname = '') {
  const parts = String(pathname).split('/').filter(Boolean);
  const index = parts.findIndex((part) => part === 'sites' || part === 'view');
  if (index >= 0 && parts[index + 1]) return parts[index + 1];
  return '';
}
