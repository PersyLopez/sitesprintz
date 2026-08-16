/**
 * Template JSON parsing utilities
 * Shared between seed script and reset endpoint
 */

// Known section types that are regular content sections (top-level keys in JSON)
const CONTENT_SECTION_TYPES = [
  'hero', 'features', 'menu', 'about', 'packages', 'beforeAfter',
  'testimonials', 'team', 'process', 'serviceAreas', 'contact',
  'social', 'stats', 'credentials', 'gallery', 'faq', 'footer',
  'nav', 'brand', 'themeVars', 'settings'
];

// Section types from the sections array (special/booking sections)
const BOOKING_SECTION_TYPES = [
  'interactive-calculator', 'subscription-booking', 'class-scheduler'
];

// Map template slug to layout/character
const LAYOUT_MAP = {
  // Atelier (salon/spa)
  'salon': { layout: 'atelier', character: 'refined', industry: 'service' },
  'gym': { layout: 'atelier', character: 'refined', industry: 'service' },
  'pet-care': { layout: 'atelier', character: 'refined', industry: 'service' },
  'tech-repair': { layout: 'atelier', character: 'refined', industry: 'service' },
  
  // Craftsman (trades)
  'cleaning': { layout: 'craftsman', character: 'refined', industry: 'service' },
  'electrician': { layout: 'craftsman', character: 'refined', industry: 'service' },
  'plumbing': { layout: 'craftsman', character: 'refined', industry: 'service' },
  'auto-repair': { layout: 'craftsman', character: 'refined', industry: 'service' },
  'tow-truck': { layout: 'craftsman', character: 'refined', industry: 'service' },
  
  // Counsel (professional)
  'consultant': { layout: 'counsel', character: 'refined', industry: 'professional' },
  'freelancer': { layout: 'counsel', character: 'refined', industry: 'professional' },
  
  // Mercantile (commerce)
  'restaurant': { layout: 'mercantile', character: 'refined', industry: 'food' },
  'product-ordering': { layout: 'mercantile', character: 'refined', industry: 'product' },
  'product-showcase': { layout: 'mercantile', character: 'refined', industry: 'product' },
};

// Emoji map for each template
const EMOJI_MAP = {
  'salon': '💇',
  'gym': '💪',
  'pet-care': '🐾',
  'tech-repair': '💻',
  'cleaning': '🧹',
  'electrician': '⚡',
  'plumbing': '🔧',
  'auto-repair': '🚗',
  'tow-truck': '🚛',
  'consultant': '💼',
  'freelancer': '👔',
  'restaurant': '🍽️',
  'product-ordering': '🛍️',
  'product-showcase': '🛍️',
};

// Canonical section order for each layout type
const LAYOUT_SECTION_ORDER = {
  atelier: ['hero', 'features', 'menu', 'about', 'gallery', 'testimonials', 'team', 'process', 'stats', 'faq', 'contact', 'footer'],
  craftsman: ['hero', 'features', 'menu', 'about', 'packages', 'beforeAfter', 'serviceAreas', 'testimonials', 'team', 'stats', 'credentials', 'faq', 'contact', 'footer'],
  counsel: ['hero', 'features', 'menu', 'about', 'caseStudies', 'process', 'industries', 'stats', 'testimonials', 'contact', 'footer'],
  mercantile: ['hero', 'menu', 'about', 'catalog', 'products', 'testimonials', 'stats', 'faq', 'contact', 'footer'],
};

function extractSections(jsonData, templateSlug) {
  const layoutInfo = LAYOUT_MAP[templateSlug] || { layout: 'craftsman', character: 'refined', industry: 'service' };
  const canonicalOrder = LAYOUT_SECTION_ORDER[layoutInfo.layout] || LAYOUT_SECTION_ORDER.craftsman;
  
  const sections = [];
  let order = 0;
  
  // Add content sections in canonical order
  for (const sectionType of canonicalOrder) {
    // Check various possible key names
    const keyVariations = [
      sectionType,
      sectionType.replace(/([A-Z])/g, '-$1').toLowerCase(), // camelCase to kebab-case
      sectionType.toLowerCase(),
    ];
    
    let content = null;
    for (const key of keyVariations) {
      if (jsonData[key] !== undefined) {
        content = jsonData[key];
        break;
      }
    }
    
    if (content) {
      sections.push({
        type: sectionType,
        content: content,
        enabled: true,
        order: order++,
      });
    }
  }
  
  // Add booking/special sections from the sections array
  if (jsonData.sections && Array.isArray(jsonData.sections)) {
    for (const bookingSection of jsonData.sections) {
      if (bookingSection.enabled !== false) {
        sections.push({
          type: bookingSection.type,
          content: bookingSection.content || bookingSection,
          enabled: bookingSection.enabled ?? true,
          order: order++,
        });
      }
    }
  }
  
  return sections;
}

function extractMetadata(jsonData, templateSlug) {
  const layoutInfo = LAYOUT_MAP[templateSlug] || { layout: 'craftsman', character: 'refined', industry: 'service' };
  
  let themeMode = 'onyx';
  let themeAccent = 'hearth';
  
  if (layoutInfo.layout === 'atelier') {
    themeMode = 'onyx';
    themeAccent = 'studio';
  } else if (layoutInfo.layout === 'craftsman') {
    themeMode = 'onyx';
    themeAccent = 'hearth';
  } else if (layoutInfo.layout === 'counsel') {
    themeMode = 'onyx';
    themeAccent = 'counsel';
  } else if (layoutInfo.layout === 'mercantile') {
    themeMode = 'onyx';
    themeAccent = 'table';
  }
  
  return {
    _layout: layoutInfo.layout,
    _character: layoutInfo.character,
    _level: 'solo',
    _theme: {
      mode: themeMode,
      accent: themeAccent,
      accentValue: null,
    },
    _features: {
      booking: { offered: true, enabled: true },
      onlinePayment: { offered: true, enabled: true },
      cashPayment: { offered: true, enabled: true },
    },
  };
}

function getTemplateName(templateSlug) {
  const emoji = EMOJI_MAP[templateSlug] || '📄';
  return `${emoji} ${templateSlug.charAt(0).toUpperCase() + templateSlug.slice(1).replace('-', ' ')}`;
}

function getTemplateIndustry(templateSlug) {
  const layoutInfo = LAYOUT_MAP[templateSlug] || { industry: 'service' };
  return layoutInfo.industry;
}

function getTemplateLayout(templateSlug) {
  const layoutInfo = LAYOUT_MAP[templateSlug] || { layout: 'craftsman' };
  return layoutInfo.layout;
}

function getTemplateCharacter(templateSlug) {
  const layoutInfo = LAYOUT_MAP[templateSlug] || { character: 'refined' };
  return layoutInfo.character;
}

export {
  extractSections,
  extractMetadata,
  getTemplateName,
  getTemplateIndustry,
  getTemplateLayout,
  getTemplateCharacter,
  LAYOUT_MAP,
  EMOJI_MAP,
  LAYOUT_SECTION_ORDER,
};