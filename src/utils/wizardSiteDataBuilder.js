/**
 * wizardSiteDataBuilder — bridge from QuickStart Wizard form data to a
 * complete siteData object via the new layout engine.
 *
 * Decides which builder to delegate to based on the niche:
 *   - Bazaar niches (yard-sale, food-stall, etc.) → buildBazaarSiteData()
 *   - Refined niches (salon, plumbing, etc.)       → buildNicheSiteData()
 *
 * Returns null for niches not recognized by either builder, so the caller
 * (QuickStartWizard) can fall back to the legacy templatesService flow.
 */

import { buildBazaarSiteData } from '../config/bazaarDefaults';
import { buildNicheSiteData, getNicheConfig, NICHE_CONFIGS } from '../config/nicheTemplateBuilders';
import { getLayoutForNiche } from '../config/layouts';
import { colorsFromSiteTheme, normalizeSiteThemeId } from '../config/siteThemes';
import { applyVisitorExperienceDefaults } from './visitorExperience.js';

/**
 * All niche IDs backed by the Refined character builders (i.e. NOT Bazaar).
 * Used by QuickStartWizard to decide whether to use the new layout engine
 * (level step + buildSiteDataFromWizard) or fall back to the legacy
 * templatesService flow.
 */
export const REFINED_NICHE_IDS = Object.keys(NICHE_CONFIGS);

// Bazaar niches are listed under the 'bazaar' layout in layouts.js.
const BAZAAR_NICHES = new Set([
  'yard-sale',
  'food-stall',
  'lemonade-stand',
  'pop-up-shop',
  'craft-market',
  'bake-sale',
  'estate-sale',
  'pop-up-food',
]);

/**
 * Determine whether a niche id is a Bazaar (Approachable) niche.
 * Falls back to getLayoutForNiche() === 'bazaar' when present.
 * @param {string} niche
 * @returns {boolean}
 */
function isBazaarNiche(niche) {
  if (!niche) return false;
  if (BAZAAR_NICHES.has(niche)) return true;
  try {
    return getLayoutForNiche(niche) === 'bazaar';
  } catch {
    return false;
  }
}

/**
 * Inject contact info into the contact section's content (if present),
 * and onto the top-level siteData fields. Refined builders leave the
 * contact section content empty; the wizard is the place where the
 * user-supplied phone/email/address should be threaded through.
 * @param {Object} siteData
 * @param {Object} contact
 */
function injectContact(siteData, contact) {
  if (!siteData || !contact) return siteData;

  // Accept both flat (contactPhone/email) and nested (contact.phone/email) shapes.
  const phone = contact.contactPhone || contact.contact?.phone || siteData.contactPhone || '';
  const email = contact.contactEmail || contact.contact?.email || siteData.contactEmail || '';
  const address = contact.contactAddress || contact.contact?.address || siteData.contactAddress || '';

  siteData.contactPhone = phone;
  siteData.contactEmail = email;
  siteData.contactAddress = address;

  if (Array.isArray(siteData.sections)) {
    siteData.sections = siteData.sections.map((section) => {
      if (section.type !== 'contact') return section;
      return {
        ...section,
        content: {
          ...(section.content || {}),
          phone,
          email,
          address,
        },
      };
    });
  }

  return siteData;
}

function ensureSocial(siteData) {
  if (!siteData) return siteData;
  siteData.social = {
    facebook: '',
    instagram: '',
    whatsapp: '',
    tiktok: '',
    maps: '',
    website: '',
    linkedin: '',
    ...(siteData.social || {}),
  };
  if (siteData.social.googleMapsUrl && !siteData.social.maps) {
    siteData.social.maps = siteData.social.googleMapsUrl;
  }
  return siteData;
}

/**
 * Build a complete siteData object from QuickStart Wizard form state.
 *
 * @param {Object} formState
 * @param {string} formState.niche        - Niche key (salon, yard-sale, ...)
 * @param {string} [formState.businessName]
 * @param {string} [formState.level]       - Business level (solo|studio|established)
 * @param {string} [formState.contactPhone]
 * @param {string} [formState.contactEmail]
 * @param {string} [formState.contactAddress]
 * @param {string} [formState.location]    - Bazaar: location text
 * @param {string} [formState.hours]       - Bazaar: hours text
 * @param {string} [formState.openUntil]   - Bazaar: optional end date
 * @param {Object} [formState.features]    - Feature overrides
 * @param {string} [formState.themeId]     - Curated site theme id
 * @returns {Object|null} siteData, or null when the niche is unknown
 */
export function buildSiteDataFromWizard(formState = {}) {
  const { niche } = formState;
  if (!niche) return null;

  // Bazaar niches → Approachable builder
  if (isBazaarNiche(niche)) {
    const siteData = buildBazaarSiteData({
      popUpType: niche,
      businessName: formState.businessName || '',
      location: formState.location || '',
      hours: formState.hours || '',
      openUntil: formState.openUntil || null,
      contactPhone: formState.contactPhone || '',
      contactEmail: formState.contactEmail || '',
    });
    return applyVisitorExperienceDefaults(
      applyTheme(ensureSocial(injectContact(siteData, formState)), formState.themeId, niche)
    );
  }

  // Refined niches → niche builder
  const nicheConfig = getNicheConfig(niche);
  if (!nicheConfig) return null;

  const siteData = buildNicheSiteData(niche, {
    businessName: formState.businessName,
    level: formState.level,
    contactPhone: formState.contactPhone,
    contactEmail: formState.contactEmail,
    contactAddress: formState.contactAddress,
    features: formState.features,
  });

  return applyVisitorExperienceDefaults(
    applyTheme(ensureSocial(injectContact(siteData, formState)), formState.themeId, niche)
  );
}

function applyTheme(siteData, themeId, niche) {
  if (!siteData) return siteData;
  const id = normalizeSiteThemeId(themeId, niche);
  siteData._themeId = id;
  siteData.colors = colorsFromSiteTheme(id);
  return siteData;
}

export { isBazaarNiche, BAZAAR_NICHES };