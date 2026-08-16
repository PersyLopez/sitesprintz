/**
 * Unified Section Renderer
 * Single rendering engine for all sections across all surfaces
 * (published sites, preview frame, viewer component)
 * 
 * Handles tolerant data access and converts various formats
 */

import { getSectionByType, getAllSections } from '../config/sectionRegistry.js';

/**
 * Unified renderer factory
 * Returns a renderer function for a specific section type
 * @param {string} type - Section type
 * @returns {Function} - Renderer function(section, siteData, renderContext)
 */
export function getRendererForType(type) {
  const renderers = {
    // Core sections
    'hero': renderHero,
    'stats': renderStats,
    'services': renderServices,
    'about': renderAbout,
    'gallery': renderGallery,
    'before-after': renderBeforeAfter,
    'team': renderTeam,
    'testimonials': renderTestimonials,
    'faq': renderFaq,
    'credentials': renderCredentials,
    'menu': renderMenu,
    'contact': renderContact,
    
    // Feature sections
    'native-booking': renderNativeBooking,
    'booking': renderNativeBooking,
    'checkout': renderCheckout,
    'reviews': renderReviews,
    'service-filters': renderServiceFilters,
    'catalog': renderCatalog,
    'service-areas': renderZipChecker,
    'process': renderProgressTracker,
    'case-studies': renderCaseStudies,
    'industries': renderServices,
    'how-to-order': renderHowToOrder,
    'hours': renderHours,
    'location': renderLocation,
    
    // Premium modules
    'interactive-calculator': renderInteractiveCalculator,
    'class-scheduler': renderClassScheduler,
    'subscription-booking': renderSubscriptionBooking,
    'diagnostic-quiz': renderDiagnosticQuiz,
    'progress-tracker': renderProgressTracker,
    'resource-center': renderResourceCenter,
    'video-gallery': renderVideoGallery,
    'zip-checker': renderZipChecker,
    'enhanced-profiles': renderEnhancedProfiles
  };
  
  return renderers[type] || (() => null);
}

/**
 * Render all sections in a site
 * @param {Array} sections - Canonical section instances
 * @param {Object} siteData - Full site data
 * @param {Object} renderContext - Context object with render functions
 * @returns {Array} - Rendered HTML/React elements
 */
export function renderAllSections(sections, siteData, renderContext = {}) {
  if (!Array.isArray(sections)) return [];
  
  return sections
    .filter(s => s && s.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(section => {
      const renderer = getRendererForType(section.type);
      if (!renderer) {
        console.warn(`No renderer for section type: ${section.type}`);
        return null;
      }
      
      try {
        return renderer(section, siteData, renderContext);
      } catch (e) {
        console.error(`Error rendering section ${section.type}:`, e);
        return null;
      }
    })
    .filter(Boolean);
}

// ============================================================================
// INDIVIDUAL SECTION RENDERERS
// ============================================================================

/**
 * Each renderer follows this pattern:
 * @param {Object} section - Section instance { id, type, enabled, order, settings, content }
 * @param {Object} siteData - Full site data for context
 * @param {Object} renderContext - Render environment (React, vanilla JS, etc.)
 * @returns {*} - Rendered content
 */

function renderHero(section, siteData, ctx) {
  const { content = {} } = section;
  const title = content.title || siteData.heroTitle || 'Welcome';
  const subtitle = content.subtitle || siteData.heroSubtitle || '';
  const image = content.image || siteData.heroImage;
  const ctaText = content.ctaText || 'Get Started';
  const ctaLink = content.ctaLink || '#contact';
  
  // For vanilla JS
  if (ctx.createElement === undefined) {
    return { type: 'hero', title, subtitle, image, ctaText, ctaLink };
  }
  
  // For React
  return ctx.createElement('section', { className: 'hero', key: section.id },
    ctx.createElement('div', { className: 'hero-content' },
      ctx.createElement('h1', null, title),
      ctx.createElement('p', null, subtitle),
      ctx.createElement('a', { href: ctaLink, className: 'cta-button' }, ctaText)
    )
  );
}

function renderStats(section, siteData, ctx) {
  const { content = {} } = section;
  const stats = content.stats || siteData.stats || [];
  
  return { type: 'stats', stats };
}

function renderServices(section, siteData, ctx) {
  const { content = {} } = section;
  const items = content.items || siteData.services || siteData.products || [];
  const title = content.title || 'Our Services';
  
  return { type: 'services', title, items };
}

function renderAbout(section, siteData, ctx) {
  const { content = {} } = section;
  const title = content.title || 'About Us';
  const description = content.description || content.body || siteData.about?.body || '';
  const image = content.image || siteData.about?.image;
  
  return { type: 'about', title, description, image };
}

function renderGallery(section, siteData, ctx) {
  const { content = {} } = section;
  const images = content.images || siteData.gallery || [];
  const title = content.title || 'Gallery';
  
  return { type: 'gallery', title, images };
}

function renderBeforeAfter(section, siteData, ctx) {
  const { content = {} } = section;
  const pairs = content.pairs || siteData.beforeAfter || [];
  const title = content.title || 'Transformations';
  
  return { type: 'before-after', title, pairs };
}

function renderTeam(section, siteData, ctx) {
  const { content = {} } = section;
  const members = content.members || siteData.team || [];
  const title = content.title || 'Our Team';
  
  return { type: 'team', title, members };
}

function renderTestimonials(section, siteData, ctx) {
  const { content = {} } = section;
  const testimonials = content.testimonials || siteData.testimonials || [];
  const title = content.title || 'What Clients Say';
  
  return { type: 'testimonials', title, testimonials };
}

function renderFaq(section, siteData, ctx) {
  const { content = {} } = section;
  const items = content.items || siteData.faq || [];
  const title = content.title || 'FAQ';
  
  return { type: 'faq', title, items };
}

function renderCredentials(section, siteData, ctx) {
  const { content = {} } = section;
  const items = content.items || siteData.credentials || [];
  const title = content.title || 'Certifications';
  
  return { type: 'credentials', title, items };
}

function renderMenu(section, siteData, ctx) {
  const { content = {} } = section;
  const sections = content.sections || siteData.menu?.sections || [];
  const title = content.title || 'Menu';
  
  return { type: 'menu', title, sections };
}

function renderCatalog(section, siteData, ctx) {
  const { content = {} } = section;
  const items = content.items || content.products || siteData.products || [];
  const title = content.title || 'Catalog';
  return { type: 'catalog', title, items };
}

function renderCaseStudies(section, siteData, ctx) {
  const { content = {} } = section;
  const items = content.items || siteData.caseStudies || [];
  return { type: 'case-studies', title: content.title || 'Case Studies', items };
}

function renderHowToOrder(section, siteData, ctx) {
  const { content = {} } = section;
  return {
    type: 'how-to-order',
    title: content.title || 'How to Order',
    steps: content.steps || [],
    instructions: content.instructions || '',
  };
}

function renderHours(section, siteData, ctx) {
  const { content = {} } = section;
  return {
    type: 'hours',
    title: content.title || 'Hours',
    hours: content.hours || siteData.businessHours || '',
  };
}

function renderLocation(section, siteData, ctx) {
  const { content = {} } = section;
  return {
    type: 'location',
    title: content.title || 'Find Us',
    address: content.address || siteData.contactAddress || '',
  };
}

function renderContact(section, siteData, ctx) {
  const { content = {} } = section;
  const email = content.email || siteData.contactEmail || '';
  const phone = content.phone || siteData.contactPhone || '';
  const address = content.address || siteData.contactAddress || '';
  const hours = content.hours || siteData.businessHours || '';
  
  return { type: 'contact', email, phone, address, hours };
}

// FEATURE SECTIONS

function renderNativeBooking(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'native-booking',
    enabled: content.enabled || false,
    businessMode: content.businessMode || 'solo',
    provider: content.provider || 'native'
  };
}

function renderCheckout(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'checkout',
    enabled: content.enabled || false,
    allowCheckout: content.allowCheckout || false,
    allowOrders: content.allowOrders || false
  };
}

function renderReviews(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'reviews',
    enabled: content.enabled || false,
    businessId: content.businessId || ''
  };
}

function renderServiceFilters(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'service-filters',
    enabled: content.enabled || false,
    filterBy: content.filterBy || ['category', 'price']
  };
}

// PREMIUM MODULES

function renderInteractiveCalculator(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'interactive-calculator',
    title: content.title || 'Calculator',
    inputs: content.inputs || [],
    formula: content.formula || ''
  };
}

function renderClassScheduler(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'class-scheduler',
    title: content.title || 'Class Schedule',
    classes: content.classes || []
  };
}

function renderSubscriptionBooking(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'subscription-booking',
    title: content.title || 'Membership Plans',
    plans: content.plans || []
  };
}

function renderDiagnosticQuiz(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'diagnostic-quiz',
    title: content.title || 'Diagnostic',
    questions: content.questions || []
  };
}

function renderProgressTracker(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'progress-tracker',
    title: content.title || 'Progress',
    stages: content.stages || []
  };
}

function renderResourceCenter(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'resource-center',
    title: content.title || 'Resources',
    items: content.items || []
  };
}

function renderVideoGallery(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'video-gallery',
    title: content.title || 'Videos',
    videos: content.videos || []
  };
}

function renderZipChecker(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'zip-checker',
    title: content.title || 'Service Area',
    serviceZips: content.serviceZips || []
  };
}

function renderEnhancedProfiles(section, siteData, ctx) {
  const { content = {} } = section;
  
  return {
    type: 'enhanced-profiles',
    title: content.title || 'Meet Our Team',
    profiles: content.profiles || []
  };
}

export default {
  getRendererForType,
  renderAllSections
};
