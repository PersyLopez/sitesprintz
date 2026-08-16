/**
 * Template Validator
 * Validates template sections structure
 */

// All known section types in the system
const KNOWN_SECTION_TYPES = new Set([
  // Content sections
  'hero', 'about', 'services', 'gallery', 'testimonials', 'contact',
  'faq', 'team', 'stats', 'process', 'credentials', 'before-after',
  'service-areas', 'catalog', 'menu', 'hours', 'booking', 'case-studies',
  'industries', 'how-to-order', 'reviews', 'contact-form', 'social',
  'featured-services', 'packages', 'private-events', 'nav', 'footer',
  'brand', 'settings', 'social', 'reviews', 'menu', 'hours', 'stats',
  'features', 'beforeAfter', 'serviceAreas',
  
  // Booking/special sections
  'interactive-calculator', 'subscription-booking', 'class-scheduler',
]);

// Required fields per section type
const REQUIRED_FIELDS = {
  hero: ['title'],
  services: ['items'],
  gallery: ['images'],
  testimonials: ['items'],
  contact: [],
  faq: ['items'],
  team: ['members'],
  stats: ['items'],
  process: ['steps'],
  credentials: ['items'],
  'before-after': ['items'],
  'service-areas': ['areas'],
  catalog: ['items'],
  menu: ['categories'],
  hours: ['schedule'],
  booking: [],
  'case-studies': ['items'],
  industries: ['items'],
  'how-to-order': ['steps'],
  reviews: ['items'],
  'contact-form': [],
  social: ['links'],
  'featured-services': ['items'],
  packages: ['items'],
  'private-events': [],
  nav: ['items'],
  footer: [],
  brand: ['name'],
  settings: [],
  features: ['items'],
  beforeAfter: ['items'],
  serviceAreas: ['areas'],
  
  // Booking sections
  'interactive-calculator': [],
  'subscription-booking': [],
  'class-scheduler': [],
};

function validateTemplateSections(sections) {
  const errors = [];
  
  if (!Array.isArray(sections)) {
    errors.push('Sections must be an array');
    return { valid: false, errors };
  }
  
  sections.forEach((section, index) => {
    if (!section || typeof section !== 'object') {
      errors.push(`Section at index ${index}: must be an object`);
      return;
    }
    
    if (!section.type) {
      errors.push(`Section at index ${index}: missing 'type' field`);
      return;
    }
    
    if (typeof section.type !== 'string') {
      errors.push(`Section at index ${index}: 'type' must be a string`);
      return;
    }
    
    if (!KNOWN_SECTION_TYPES.has(section.type)) {
      errors.push(`Section at index ${index}: unknown section type '${section.type}'`);
    }
    
    if (!section.content || typeof section.content !== 'object') {
      errors.push(`Section at index ${index} (${section.type}): 'content' must be an object`);
    }
    
    // Check required fields
    const required = REQUIRED_FIELDS[section.type] || [];
    for (const field of required) {
      if (!section.content || section.content[field] === undefined || section.content[field] === null) {
        errors.push(`Section at index ${index} (${section.type}): required field '${field}' is missing`);
      }
    }
    
    // Validate boolean enabled
    if (section.enabled !== undefined && typeof section.enabled !== 'boolean') {
      errors.push(`Section at index ${index} (${section.type}): 'enabled' must be a boolean`);
    }
    
    // Validate order
    if (section.order !== undefined && (typeof section.order !== 'number' || section.order < 0)) {
      errors.push(`Section at index ${index} (${section.type}): 'order' must be a non-negative number`);
    }
  });
  
  return { valid: errors.length === 0, errors };
}

function getKnownSectionTypes() {
  return Array.from(KNOWN_SECTION_TYPES).sort();
}

export { validateTemplateSections, getKnownSectionTypes, KNOWN_SECTION_TYPES, REQUIRED_FIELDS };