/**
 * Feature Flags — Essential feature toggles for the layout system.
 *
 * Every layout offers booking, online ordering, and online payment as
 * *essential* features that can be opted out of. Cash-only, no-booking,
 * and no-orders are first-class configurations.
 *
 * Advanced features (analytics, advanced booking) are
 * gated by subscription tier (via planFeatures.js). Custom domains are
 * available on every plan.
 *
 * This module is used by:
 *   - composePage() in layoutRenderer.js (to include/skip sections)
 *   - EditorPanel / Settings (to render toggle UI)
 *   - Publish flow (to validate and persist)
 */

import { resolveFeatures, validateFeatures, resolvePaymentMethods } from '../config/layouts.js';

// ---------------------------------------------------------------------------
// Feature definitions — what each toggle controls
// ---------------------------------------------------------------------------

export const FEATURE_DEFINITIONS = {
  booking: {
    key: 'booking',
    label: 'Online Booking',
    description: 'Let customers book appointments directly on your site',
    affectsSections: ['booking'],
    ctaOverride: { disabled: 'Call to Book', ctaLink: 'tel:{phone}' },
  },
  onlineOrdering: {
    key: 'onlineOrdering',
    label: 'Online Ordering',
    description: 'Accept orders for pickup or delivery',
    affectsSections: ['catalog', 'menu'],
  },
  onlinePayment: {
    key: 'onlinePayment',
    label: 'Online Payment',
    description: 'Accept credit/debit card payments via Stripe',
    affectsSections: [],
  },
  cashPayment: {
    key: 'cashPayment',
    label: 'Cash / In-Person Payment',
    description: 'Accept cash or in-person payments at pickup',
    affectsSections: [],
  },
};

// ---------------------------------------------------------------------------
// Re-export from layouts.js for convenience
// ---------------------------------------------------------------------------

export { resolveFeatures, validateFeatures, resolvePaymentMethods };

// ---------------------------------------------------------------------------
// UI helpers — for rendering feature toggles in the editor
// ---------------------------------------------------------------------------

/**
 * Get feature toggle config for a layout, suitable for editor UI.
 * Includes offered status, current enabled/disabled, and metadata.
 *
 * @param {string} layoutKey - Layout key
 * @param {Object} [userFeatures] - User's current feature toggles
 * @returns {Object[]} Array of toggle descriptors for the editor
 */
export function getFeatureToggles(layoutKey, userFeatures) {
  const resolved = resolveFeatures(layoutKey, userFeatures);

  return Object.entries(FEATURE_DEFINITIONS).map(([key, def]) => {
    const state = resolved[key] || { offered: false, enabled: false };
    return {
      ...def,
      offered: state.offered,
      enabled: state.enabled,
      // For UI: disable the toggle if the feature isn't offered for this layout
      disabled: !state.offered,
    };
  });
}

/**
 * Compute the effective CTA for the hero section based on feature state.
 * If booking is disabled, switch CTA to "Call to Book" with tel: link.
 *
 * @param {Object} features - Resolved features
 * @param {Object} siteData - Site data (for phone number)
 * @param {string} layoutKey - Layout key
 * @returns {{ ctaText: string, ctaLink: string }}
 */
export function resolveHeroCtaFromFeatures(features, siteData, layoutKey) {
  const phone = siteData?.contactPhone || siteData?.phone || '';
  const layoutCtaMap = {
    atelier: { enabled: 'Book Now', disabled: 'Call to Book' },
    craftsman: { enabled: 'Get a Quote', disabled: 'Call Now' },
    counsel: { enabled: 'Get in Touch', disabled: 'Get in Touch' },
    mercantile: { enabled: 'Order Now', disabled: 'View Menu' },
    bazaar: { enabled: 'Order Now', disabled: 'View Menu' },
  };

  const ctaConfig = layoutCtaMap[layoutKey] || layoutCtaMap.atelier;

  // If booking is enabled, use the booking CTA
  if (features.booking?.enabled && features.booking?.offered) {
    return { ctaText: ctaConfig.enabled, ctaLink: '#booking' };
  }

  // If ordering is enabled, use the ordering CTA
  if (features.onlineOrdering?.enabled && features.onlineOrdering?.offered) {
    return { ctaText: 'Order Now', ctaLink: '#catalog' };
  }

  // No booking or ordering — fall back to contact/phone
  if (phone) {
    return { ctaText: ctaConfig.disabled, ctaLink: `tel:${phone}` };
  }

  return { ctaText: ctaConfig.disabled, ctaLink: '#contact' };
}

/**
 * Validate features for save — wraps validateFeatures with user-friendly messages.
 *
 * @param {string} layoutKey - Layout key
 * @param {Object} userFeatures - User feature overrides
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateFeaturesForSave(layoutKey, userFeatures) {
  const resolved = resolveFeatures(layoutKey, userFeatures);
  const validation = validateFeatures(resolved);

  if (validation.ok) {
    return { valid: true, errors: [] };
  }

  const errorMessages = {
    PICK_A_PAYMENT_METHOD: 'You need at least one payment method (online or cash) when ordering or booking is enabled.',
  };

  return {
    valid: false,
    errors: [errorMessages[validation.error] || validation.error],
  };
}