/**
 * Section normalization utility
 * Converts various template formats into canonical section instances
 */

import { createSectionInstance, getSectionByType } from '../config/sectionRegistry.js';

/**
 * Canonical section instance schema
 * @typedef {Object} SectionInstance
 * @property {string} id - Unique identifier
 * @property {string} type - Section type (from registry)
 * @property {boolean} enabled - Whether section is visible
 * @property {number} order - Display order
 * @property {Object} settings - Section-specific settings
 * @property {Object} content - Section content data
 */

/**
 * Normalize a template into canonical sections array
 * Handles niche templates, custom templates, and mixed data
 * @param {Object} templateData - Template data (niche JSON or custom builder output)
 * @param {Array} adminOverrides - Optional admin section overrides
 * @returns {Array} - Array of canonical section instances
 */
export function normalizeTemplateSections(templateData, adminOverrides = []) {
  if (!templateData) return [];
  
  const sections = [];
  let order = 0;
  
  // Helper to add section if it has content
  const addSectionIfContent = (type, dataSource) => {
    if (dataSource) {
      try {
        const instance = createSectionInstance(type, {
          order: order++,
          content: dataSource
        });
        sections.push(instance);
      } catch (e) {
        console.warn(`Failed to create section: ${type}`, e);
      }
    }
  };
  
  // Helper to check if data is non-empty
  const hasContent = (data) => {
    if (!data) return false;
    if (Array.isArray(data)) return data.length > 0;
    if (typeof data === 'object') return Object.keys(data).length > 0;
    if (typeof data === 'string') return data.trim().length > 0;
    return Boolean(data);
  };
  
  // If sections already exist in canonical form, return them
  if (Array.isArray(templateData.sections) && 
      templateData.sections.length > 0 && 
      templateData.sections[0].type) {
    // Already in canonical form
    return templateData.sections.map((s, i) => ({
      ...s,
      order: s.order !== undefined ? s.order : i
    }));
  }
  
  // Otherwise, normalize from various template formats
  
  // CORE SECTIONS (always first)
  
  // 1. Hero (required)
  if (templateData.hero || templateData.heroTitle) {
    addSectionIfContent('hero', {
      title: templateData.hero?.title || templateData.heroTitle || 'Welcome',
      subtitle: templateData.hero?.subtitle || templateData.heroSubtitle || '',
      image: templateData.hero?.image || templateData.heroImage,
      ctaText: templateData.hero?.ctaText || 'Get Started',
      ctaLink: templateData.hero?.ctaLink || '#contact'
    });
  }
  
  // 2. Stats
  if (hasContent(templateData.stats)) {
    addSectionIfContent('stats', {
      stats: templateData.stats || []
    });
  }
  
  // 3. Services/Products
  if (hasContent(templateData.services) || hasContent(templateData.products)) {
    addSectionIfContent('services', {
      title: 'Our Services',
      items: templateData.services || templateData.products || []
    });
  }

  if (hasContent(templateData.products) || hasContent(templateData.catalog)) {
    addSectionIfContent('catalog', {
      title: templateData.catalog?.title || 'Catalog',
      items: templateData.catalog?.items || templateData.products || []
    });
  }

  if (hasContent(templateData.serviceAreas) || hasContent(templateData['service-areas'])) {
    addSectionIfContent('service-areas', {
      title: 'Service Areas',
      areas: templateData.serviceAreas || templateData['service-areas']?.areas || templateData['service-areas'] || []
    });
  }

  if (hasContent(templateData.caseStudies) || hasContent(templateData['case-studies'])) {
    addSectionIfContent('case-studies', {
      title: 'Case Studies',
      items: templateData.caseStudies || templateData['case-studies']?.items || []
    });
  }
  
  // 4. Menu (restaurant-specific)
  if (hasContent(templateData.menu)) {
    addSectionIfContent('menu', {
      title: templateData.menu?.title || 'Menu',
      sections: templateData.menu?.sections || []
    });
  }
  
  // MEDIA SECTIONS
  
  // 5. Gallery
  if (hasContent(templateData.gallery)) {
    addSectionIfContent('gallery', {
      title: 'Gallery',
      images: templateData.gallery || []
    });
  }
  
  // 6. Before/After
  if (hasContent(templateData.beforeAfter)) {
    addSectionIfContent('before-after', {
      title: 'Transformations',
      pairs: templateData.beforeAfter || []
    });
  }
  
  // PEOPLE SECTIONS
  
  // 7. Team
  if (hasContent(templateData.team)) {
    addSectionIfContent('team', {
      title: 'Our Team',
      members: templateData.team || []
    });
  }
  
  // SOCIAL PROOF SECTIONS
  
  // 8. Testimonials
  if (hasContent(templateData.testimonials)) {
    addSectionIfContent('testimonials', {
      title: 'What Clients Say',
      testimonials: templateData.testimonials || []
    });
  }
  
  // 9. Google Reviews
  if (hasContent(templateData.reviews)) {
    addSectionIfContent('reviews', {
      enabled: true,
      businessId: templateData.reviews?.businessId || ''
    });
  }
  
  // CONTENT SECTIONS
  
  // 10. About
  if (hasContent(templateData.about)) {
    addSectionIfContent('about', {
      title: templateData.about?.title || 'About Us',
      description: templateData.about?.description || templateData.about?.body || '',
      image: templateData.about?.image
    });
  }
  
  // 11. FAQ
  if (hasContent(templateData.faq)) {
    addSectionIfContent('faq', {
      title: 'Frequently Asked Questions',
      items: templateData.faq || []
    });
  }
  
  // TRUST SECTIONS
  
  // 12. Credentials
  if (hasContent(templateData.credentials)) {
    addSectionIfContent('credentials', {
      title: 'Certifications',
      items: templateData.credentials || []
    });
  }
  
  // FEATURE SECTIONS
  
  // 13. Native Booking
  if (templateData.booking || templateData.bookingEnabled || templateData.features?.bookingWidget?.enabled) {
    addSectionIfContent('booking', {
      enabled: templateData.booking?.enabled || templateData.bookingEnabled || templateData.features?.bookingWidget?.enabled || false,
      provider: templateData.booking?.provider || 'native',
      businessMode: templateData.booking?.businessMode || 'solo'
    });
  }
  
  // 14. Checkout
  if (templateData.settings) {
    addSectionIfContent('checkout', {
      enabled: templateData.settings.allowCheckout || false,
      allowOrders: templateData.settings.allowOrders || false
    });
  }
  
  // 15. Service Filters
  if (templateData.filterableGallery || templateData.hasFilters) {
    addSectionIfContent('service-filters', {
      enabled: true,
      filterBy: ['category', 'price']
    });
  }
  
  // PREMIUM MODULES (if present in template)
  if (Array.isArray(templateData.premiumModules)) {
    templateData.premiumModules.forEach((module, i) => {
      try {
        const instance = createSectionInstance(module.type, {
          order: order++,
          settings: module.settings || {},
          content: module.content || {}
        });
        sections.push(instance);
      } catch (e) {
        console.warn(`Failed to create premium module: ${module.type}`, e);
      }
    });
  }
  
  // 16. Contact (typically last)
  if (templateData.contact || templateData.contactEmail || templateData.contactPhone) {
    addSectionIfContent('contact', {
      email: templateData.contact?.email || templateData.contactEmail || '',
      phone: templateData.contact?.phone || templateData.contactPhone || '',
      address: templateData.contact?.address || templateData.contactAddress || '',
      hours: templateData.contact?.hours || templateData.businessHours || ''
    });
  }
  
  return sections;
}

/**
 * Denormalize sections back to template data format
 * Used when saving draft or publishing
 * @param {Array} sections - Canonical section instances
 * @returns {Object} - Template data with all sections
 */
export function denormalizeSections(sections = []) {
  const result = {
    sections: sections || [],
    // Legacy format fields (for backward compatibility)
    menu: null,
    team: null,
    gallery: null,
    testimonials: null,
    stats: null,
    credentials: null,
    faq: null,
    about: null,
    services: null,
    products: null,
    beforeAfter: null,
    hero: null,
    contact: null,
    booking: null,
    reviews: null
  };
  
  // Populate legacy fields for backward compatibility
  sections.forEach(section => {
    switch (section.type) {
      case 'hero':
        result.hero = section.content;
        break;
      case 'stats':
        result.stats = section.content.stats;
        break;
      case 'services':
        result.services = section.content.items;
        result.products = section.content.items;
        break;
      case 'menu':
        result.menu = section.content;
        break;
      case 'gallery':
        result.gallery = section.content.images;
        break;
      case 'before-after':
        result.beforeAfter = section.content.pairs;
        break;
      case 'team':
        result.team = section.content.members;
        break;
      case 'testimonials':
        result.testimonials = section.content.testimonials;
        break;
      case 'reviews':
        result.reviews = section.content;
        break;
      case 'about':
        result.about = section.content;
        break;
      case 'faq':
        result.faq = section.content.items;
        break;
      case 'credentials':
        result.credentials = section.content.items;
        break;
      case 'native-booking':
        result.booking = section.content;
        break;
      case 'contact':
        result.contact = section.content;
        break;
    }
  });
  
  return result;
}

export default {
  normalizeTemplateSections,
  denormalizeSections
};
