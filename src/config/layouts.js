/**
 * Layout Definitions — 5 named layouts with per-level skeletons and section slots.
 *
 * Each layout defines:
 *   - which sections are required vs optional
 *   - the hero variant
 *   - per-level composition (which optional sections are featured)
 *   - which features are offered and their defaults
 *
 * Used by:
 *   - layoutRenderer (to compose the page)
 *   - PageBuilder (to constrain section add/remove)
 *   - QuickStart Wizard (to pick the right layout + level)
 */

// ---------------------------------------------------------------------------
// Section registry reference (types come from sectionRegistry.js)
// ---------------------------------------------------------------------------

/**
 * Section slot definition.
 * @typedef {Object} SectionSlot
 * @property {string} type       - Section type key (from registry)
 * @property {boolean} required   - Cannot be removed by user
 * @property {string} [variant]  - Default variant for this layout
 * @property {string[]} [levels] - Which levels include this section (omit = all)
 */

// ---------------------------------------------------------------------------
// Layout definitions
// ---------------------------------------------------------------------------

export const LAYOUTS = {
  atelier: {
    name: 'Atelier',
    description: 'Book an appointment — services-first, booking-forward',
    character: 'refined',
    niches: ['salon', 'gym', 'pet-care', 'tech-repair'],
    hero: { variant: 'split', ctaDefault: 'booking' },
    sections: {
      // Required (always present, cannot be removed)
      services:     { type: 'services',    required: true,  variant: 'grid' },
      contact:      { type: 'contact',     required: true },
      hours:        { type: 'hours',       required: false },
      location:     { type: 'location',    required: false },
      social:       { type: 'social',      required: false },
      // Optional — included based on level
      team:         { type: 'team',        required: false, variant: 'grid',       levels: ['studio', 'established'] },
      gallery:      { type: 'gallery',      required: false, variant: 'masonry' },
      booking:      { type: 'booking',      required: false, variant: 'panel' },
      testimonials: { type: 'testimonials', required: false, variant: 'feature',   levels: ['studio', 'established'] },
      reviews:      { type: 'reviews',      required: false,                       levels: ['established'] },
      stats:        { type: 'stats',        required: false,                       levels: ['established'] },
      faq:          { type: 'faq',          required: false },
      credentials:  { type: 'credentials',  required: false,                       levels: ['established'] },
    },
    levels: {
      solo: [
        'hero', 'services', 'gallery', 'booking', 'hours', 'location', 'contact', 'social',
      ],
      studio: [
        'hero', 'services', 'team', 'gallery', 'booking', 'testimonials', 'hours', 'location', 'contact', 'social',
      ],
      established: [
        'hero', 'services', 'team', 'gallery', 'booking', 'testimonials', 'reviews', 'stats', 'hours', 'location', 'contact', 'social',
      ],
    },
    features: {
      booking:        { offered: true, defaultOn: true },
      onlineOrdering: { offered: true, defaultOn: false },
      onlinePayment:  { offered: true, defaultOn: true },
      cashPayment:    { offered: true, defaultOn: true },
    },
  },

  craftsman: {
    name: 'Craftsman',
    description: 'Get a problem fixed — trust, service areas, before/after',
    character: 'refined',
    niches: ['cleaning', 'electrician', 'plumbing', 'auto-repair', 'tow-truck'],
    hero: { variant: 'full-bleed', ctaDefault: 'quote' },
    sections: {
      services:      { type: 'services',      required: true,  variant: 'list' },
      'service-areas': { type: 'service-areas', required: true },
      contact:       { type: 'contact',        required: true },
      hours:         { type: 'hours',          required: false },
      location:      { type: 'location',       required: false },
      social:        { type: 'social',         required: false },
      'before-after': { type: 'before-after',   required: false, variant: 'slider' },
      process:       { type: 'process',         required: false, levels: ['studio', 'established'] },
      credentials:   { type: 'credentials',     required: false, levels: ['studio', 'established'] },
      faq:           { type: 'faq',             required: false },
      testimonials:  { type: 'testimonials',    required: false, variant: 'grid', levels: ['studio', 'established'] },
      stats:         { type: 'stats',           required: false, levels: ['established'] },
      gallery:       { type: 'gallery',        required: false },
      team:          { type: 'team',           required: false, variant: 'grid', levels: ['studio', 'established'] },
    },
    levels: {
      solo: [
        'hero', 'services', 'service-areas', 'before-after', 'faq', 'hours', 'location', 'contact', 'social',
      ],
      studio: [
        'hero', 'services', 'service-areas', 'process', 'team', 'before-after', 'credentials', 'faq', 'hours', 'location', 'contact', 'social',
      ],
      established: [
        'hero', 'services', 'service-areas', 'process', 'team', 'before-after', 'credentials', 'stats', 'testimonials', 'faq', 'hours', 'location', 'contact', 'social',
      ],
    },
    features: {
      booking:        { offered: true, defaultOn: false },
      onlineOrdering: { offered: true, defaultOn: false },
      onlinePayment:  { offered: true, defaultOn: true },
      cashPayment:    { offered: true, defaultOn: true },
    },
  },

  counsel: {
    name: 'Counsel',
    description: 'Can they solve my problem? — proof, case studies, process',
    character: 'refined',
    niches: ['consultant', 'freelancer'],
    hero: { variant: 'lead', ctaDefault: 'contact' },
    sections: {
      services:      { type: 'services',      required: true,  variant: 'index' },
      contact:       { type: 'contact',       required: true },
      hours:         { type: 'hours',         required: false },
      location:      { type: 'location',      required: false },
      social:        { type: 'social',        required: false },
      'case-studies': { type: 'case-studies',  required: false, levels: ['studio', 'established'] },
      process:       { type: 'process',       required: false, levels: ['studio', 'established'] },
      team:          { type: 'team',          required: false, levels: ['studio', 'established'] },
      testimonials:  { type: 'testimonials',  required: false, variant: 'feature', levels: ['studio', 'established'] },
      stats:         { type: 'stats',          required: false, levels: ['established'] },
      industries:    { type: 'industries',     required: false, levels: ['established'] },
      credentials:   { type: 'credentials',    required: false, levels: ['established'] },
      faq:           { type: 'faq',            required: false },
    },
    levels: {
      solo: [
        'hero', 'services', 'case-studies', 'hours', 'location', 'contact', 'social',
      ],
      studio: [
        'hero', 'services', 'case-studies', 'process', 'team', 'testimonials', 'hours', 'location', 'contact', 'social',
      ],
      established: [
        'hero', 'industries', 'services', 'case-studies', 'process', 'team', 'testimonials', 'stats', 'hours', 'location', 'contact', 'social',
      ],
    },
    features: {
      booking:        { offered: true, defaultOn: false },
      onlineOrdering: { offered: true, defaultOn: false },
      onlinePayment:  { offered: true, defaultOn: true },
      cashPayment:    { offered: true, defaultOn: true },
    },
  },

  mercantile: {
    name: 'Mercantile',
    description: 'Browse and buy — catalog/menu grid, showcase, reviews',
    character: 'refined',
    niches: ['restaurant', 'product-ordering', 'product-showcase'],
    hero: { variant: 'featured', ctaDefault: 'ordering' },
    sections: {
      catalog:       { type: 'catalog',       required: true,  variant: 'grid' },
      contact:       { type: 'contact',       required: true },
      hours:         { type: 'hours',         required: false },
      location:      { type: 'location',      required: false },
      social:        { type: 'social',        required: false },
      gallery:       { type: 'gallery',        required: false, variant: 'grid' },
      reviews:       { type: 'reviews',        required: false, levels: ['studio', 'established'] },
      team:          { type: 'team',           required: false, levels: ['studio', 'established'] },
      testimonials:  { type: 'testimonials',   required: false, variant: 'grid', levels: ['studio', 'established'] },
      faq:           { type: 'faq',            required: false },
      stats:         { type: 'stats',           required: false, levels: ['established'] },
      booking:       { type: 'booking',         required: false },
    },
    levels: {
      solo: [
        'hero', 'catalog', 'hours', 'location', 'contact', 'social',
      ],
      studio: [
        'hero', 'catalog', 'gallery', 'team', 'reviews', 'faq', 'hours', 'location', 'contact', 'social',
      ],
      established: [
        'hero', 'catalog', 'gallery', 'team', 'reviews', 'stats', 'faq', 'hours', 'location', 'contact', 'social',
      ],
    },
    features: {
      booking:        { offered: true, defaultOn: true },
      onlineOrdering: { offered: true, defaultOn: true },
      onlinePayment:  { offered: true, defaultOn: true },
      cashPayment:    { offered: true, defaultOn: true },
    },
  },

  bazaar: {
    name: 'Bazaar',
    description: 'Pop-up / temporary selling — minimal config, full online experience',
    character: 'approachable',
    niches: ['yard-sale', 'food-stall', 'lemonade-stand', 'pop-up-shop', 'craft-market', 'bake-sale', 'estate-sale', 'pop-up-food'],
    hero: { variant: 'stall', ctaDefault: 'ordering' },
    sections: {
      catalog:      { type: 'catalog',      required: true,  variant: 'grid' },
      contact:      { type: 'contact',       required: true },
      'how-to-order': { type: 'how-to-order', required: false },
      hours:        { type: 'hours',          required: false },
      location:     { type: 'location',       required: false },
      social:       { type: 'social',         required: false },
      gallery:      { type: 'gallery',        required: false },
    },
    // Bazaar has no levels — always solo-equivalent
    levels: {
      solo: [
        'hero', 'catalog', 'how-to-order', 'hours', 'location', 'contact', 'social',
      ],
    },
    features: {
      booking:        { offered: false, defaultOn: false },
      onlineOrdering: { offered: true,  defaultOn: true },
      onlinePayment:  { offered: true,  defaultOn: true },
      cashPayment:    { offered: true,  defaultOn: true },
    },
  },
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Get a layout definition by key.
 * @param {string} key - Layout key (atelier, craftsman, etc.)
 * @returns {Object|undefined} Layout definition
 */
export function getLayout(key) {
  return LAYOUTS[key];
}

/**
 * Get the default layout for a niche.
 * @param {string} niche - Niche key (salon, plumbing, etc.)
 * @returns {string} Layout key
 */
export function getLayoutForNiche(niche) {
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    if (layout.niches.includes(niche)) return key;
  }
  return 'atelier'; // default fallback
}

/**
 * Get the skeleton (ordered section list) for a layout + level.
 * @param {string} layoutKey - Layout key
 * @param {string} level - Level key (solo, studio, established)
 * @returns {string[]} Ordered section type list
 */
export function getSkeleton(layoutKey, level) {
  const layout = LAYOUTS[layoutKey];
  if (!layout) return [];
  return layout.levels[level] || layout.levels.solo || [];
}

/**
 * Get the sections config for a layout, filtered by level.
 * Returns only sections that should be visible for the given level.
 * @param {string} layoutKey - Layout key
 * @param {string} level - Level key
 * @returns {Object} Filtered sections config
 */
export function getSectionsForLevel(layoutKey, level) {
  const layout = LAYOUTS[layoutKey];
  if (!layout) return {};

  const skeleton = getSkeleton(layoutKey, level);
  const result = {};

  for (const [key, config] of Object.entries(layout.sections)) {
    // Required sections are always included
    if (config.required) {
      result[key] = config;
      continue;
    }
    // Sections with no level restriction are included if in skeleton
    if (!config.levels || config.levels.includes(level)) {
      if (skeleton.includes(key)) {
        result[key] = config;
      }
    }
  }

  return result;
}

/**
 * Resolve effective features for a layout + user overrides.
 * Merges layout feature defaults with user toggles.
 *
 * @param {string} layoutKey - Layout key
 * @param {Object} [userFeatures] - User feature overrides
 * @returns {Object} Resolved feature state
 */
export function resolveFeatures(layoutKey, userFeatures) {
  const layout = LAYOUTS[layoutKey];
  if (!layout) return getDefaultFeatures();

  const resolved = {};
  for (const [key, config] of Object.entries(layout.features)) {
    resolved[key] = {
      offered: config.offered,
      enabled: userFeatures?.[key]?.enabled ?? config.defaultOn,
    };
  }
  return resolved;
}

function getDefaultFeatures() {
  return {
    booking:        { offered: true, enabled: true },
    onlineOrdering: { offered: true, enabled: true },
    onlinePayment:  { offered: true, enabled: true },
    cashPayment:    { offered: true, enabled: true },
  };
}

/**
 * Validate features — ensure at least one payment method when ordering/booking needs it.
 *
 * @param {Object} features - Resolved features (from resolveFeatures)
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateFeatures(features) {
  if (!features) return { ok: true };

  const needsPayment =
    (features.booking?.enabled && features.booking?.offered) ||
    (features.onlineOrdering?.enabled && features.onlineOrdering?.offered);

  if (needsPayment) {
    const hasOnlinePayment = features.onlinePayment?.enabled && features.onlinePayment?.offered;
    const hasCash = features.cashPayment?.enabled && features.cashPayment?.offered;
    const methods = [hasOnlinePayment && 'online', hasCash && 'cash'].filter(Boolean);

    if (methods.length === 0) {
      return { ok: false, error: 'PICK_A_PAYMENT_METHOD' };
    }
  }

  return { ok: true };
}

/**
 * Resolve the payment methods displayed at checkout.
 *
 * @param {Object} features - Resolved features
 * @returns {string[]} Array of 'online' and/or 'cash'
 */
export function resolvePaymentMethods(features) {
  if (!features) return ['cash'];
  const methods = [];
  if (features.onlinePayment?.enabled && features.onlinePayment?.offered) methods.push('online');
  if (features.cashPayment?.enabled && features.cashPayment?.offered) methods.push('cash');
  if (methods.length === 0) methods.push('cash');
  return methods;
}