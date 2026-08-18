/**
 * Registry-Aware Publish Service
 * Enables publishing of any template (niche or custom) by building site.json from sections[]
 * No longer requires niche JSON file lookups
 */

import { normalizeTemplateSections, denormalizeSections } from '../utils/sectionNormalizer.js';
import { canAccessSection } from '../config/sectionRegistry.js';
import { hasTierAccess } from '../config/tiers.js';
import { FEATURES, hasFeature } from '../utils/planFeatures.js';
import { resolvePayOnSiteForPublish } from '../utils/payOnSite.js';
import { siteWantsEmbeddedBooking } from '../utils/visitorExperience.js';

function canonicalSocial(social = {}, fallback = {}) {
  const merged = {
    facebook: social.facebook || fallback.facebook || '',
    instagram: social.instagram || fallback.instagram || '',
    whatsapp: social.whatsapp || fallback.whatsapp || '',
    tiktok: social.tiktok || fallback.tiktok || '',
    maps: social.maps || social.googleMapsUrl || fallback.maps || '',
    website: social.website || fallback.website || '',
    linkedin: social.linkedin || fallback.linkedin || '',
  };
  if (social.twitter || fallback.twitter) merged.twitter = social.twitter || fallback.twitter;
  if (social.youtube || fallback.youtube) merged.youtube = social.youtube || fallback.youtube;
  return merged;
}

/**
 * Build a publishable site.json from draft data
 * @param {Object} draftData - Draft site data with sections[]
 * @param {string} userTier - User's subscription tier
 * @returns {Object} - Publishable site data
 */
export function buildPublishableContent(draftData, userTier = 'trial') {
  if (!draftData) throw new Error('No draft data provided');

  // Ensure sections are in canonical form
  const sections = Array.isArray(draftData.sections) ? draftData.sections : [];
  
  // Apply tier-based feature gating: remove sections user doesn't have access to
  const allowedSections = sections
    .filter(section => canAccessSection(userTier, section.type))
    .map(section => ({
      ...section,
      enabled: section.enabled !== false // Ensure enabled is explicit
    }));

  // Build the publishable content object
  const publishableContent = {
    // Core site metadata
    id: draftData.id,
    template: draftData.template,
    templateId: draftData.templateId,
    businessName: draftData.businessName || 'My Business',
    
    // Brand & contact information
    brand: {
      name: draftData.businessName || draftData.brand?.name,
      tagline: draftData.tagline || draftData.brand?.tagline,
      email: draftData.contactEmail || draftData.brand?.email,
      phone: draftData.contactPhone || draftData.brand?.phone,
      logo: draftData.logo
    },
    
    // Hero section
    hero: {
      title: draftData.heroTitle || 'Welcome',
      subtitle: draftData.heroSubtitle || '',
      image: draftData.heroImage
    },
    
    // Contact information
    contact: {
      email: draftData.contactEmail || '',
      phone: draftData.contactPhone || '',
      address: draftData.contactAddress || '',
      hours: draftData.businessHours || ''
    },
    
    // Social links — same keys as wizard, Foundation, and the social section
    social: canonicalSocial(draftData.social),
    foundation: (() => {
      const foundation = { ...(draftData.foundation || {}) };
      const profiles = canonicalSocial(draftData.social, foundation.socialMedia?.profiles);
      const hasProfiles = Object.values(profiles).some(Boolean);
      foundation.socialMedia = {
        ...(foundation.socialMedia || {}),
        profiles,
        enabled: foundation.socialMedia?.enabled || hasProfiles,
      };
      return foundation;
    })(),
    
    // Theme & colors
    colors: draftData.colors || {
      themeId: 'default',
      mode: 'dark',
      primary: '#06b6d4',
      accent: '#0891b2',
      secondary: '#14b8a6',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    
    // Canonical sections (REQUIRED)
    sections: allowedSections,
    
    // Backward compatibility: denormalized fields
    ...denormalizeSections(allowedSections),
    
    // Settings — Growth checkout works via pay-on-site until Stripe is connected
    settings: (() => {
      const canCheckout = ['growth', 'pro', 'premium'].includes(userTier);
      const payOnSite = resolvePayOnSiteForPublish(draftData, canCheckout);
      return {
        allowCheckout: canCheckout
          ? Boolean(draftData.settings?.allowCheckout || payOnSite)
          : false,
        allowOrders: canCheckout
          ? Boolean(draftData.settings?.allowOrders)
          : false,
        payOnSite,
        bookingEnabled: canCheckout && siteWantsEmbeddedBooking(draftData),
        removeBranding: hasFeature(userTier, FEATURES.REMOVE_BRANDING)
          ? Boolean(draftData.settings?.removeBranding)
          : false,
        tier: userTier
      };
    })(),
    
    // Publishing metadata
    publishedAt: new Date().toISOString(),
    version: '2.0', // Indicate this is using the new sections-based system
    
    // Custom template flag (for tracking)
    isCustomTemplate: draftData.isCustom || false
  };

  return publishableContent;
}

/**
 * Validate that published content has required fields
 * @param {Object} content - Published site content
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validatePublishedContent(content) {
  const errors = [];

  if (!content.id) errors.push('Missing site ID');
  if (!content.businessName) errors.push('Missing business name');
  if (!Array.isArray(content.sections)) errors.push('Missing sections array');
  if (content.sections.length === 0) errors.push('At least one section is required');
  
  // Ensure required core sections exist (at least hero and contact)
  const sectionTypes = content.sections.map(s => s.type);
  if (!sectionTypes.includes('hero')) errors.push('Hero section is required');
  if (!sectionTypes.includes('contact')) errors.push('Contact section is required');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Prepare publish payload for API
 * This replaces the old partial data approach
 * @param {Object} draftData - Full draft data
 * @param {string} userTier - User's tier
 * @returns {Object} - Payload to send to /api/drafts/:id/publish
 */
export function preparePublishPayload(draftData, userTier = 'trial') {
  const publishableContent = buildPublishableContent(draftData, userTier);
  
  // Validate before returning
  const validation = validatePublishedContent(publishableContent);
  if (!validation.valid) {
    throw new Error(`Cannot publish: ${validation.errors.join(', ')}`);
  }

  return {
    businessData: publishableContent,
    publishSettings: {
      theme: publishableContent.colors?.themeId || 'default',
      mode: publishableContent.colors?.mode || 'dark',
      tier: userTier,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Apply tier-based filtering to a section array
 * Removes sections that require a higher tier than user has
 * @param {Array} sections - Section instances
 * @param {string} userTier - User's tier
 * @returns {Array} - Filtered sections
 */
export function applyTierFiltering(sections, userTier) {
  if (!Array.isArray(sections)) return [];
  
  return sections.filter(section => {
    if (!section || !section.type) return false;
    return canAccessSection(userTier, section.type);
  });
}

export default {
  buildPublishableContent,
  validatePublishedContent,
  preparePublishPayload,
  applyTierFiltering
};
