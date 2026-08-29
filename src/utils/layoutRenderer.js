/**
 * Layout Renderer — Shared rendering spec for preview and publish.
 *
 * This module is the SINGLE SOURCE OF TRUTH for rendering sections.
 * Both the client (React PreviewFrame) and the server (sectionHtml.js)
 * call through this module to produce output.
 *
 * Design principles (from LAYOUT_SYSTEM_DESIGN.md):
 *   - Every registry section type has a primitive; unknown types render
 *     a clean placeholder, NEVER null.
 *   - Rendering is driven by: layout, character, level, theme tokens,
 *     feature flags, and section variant.
 *   - Disabled sections are simply absent — no empty placeholders.
 *
 * The module exports:
 *   - renderSection(type, content, siteData, tokens) → section output descriptor
 *   - composePage(siteData, tokens, features) → ordered section list with output
 *   - sectionPrimitives — the map of type → primitive renderer
 */

import { resolveTheme, suggestLevel } from '../config/layoutTokens.js';
import { normalizeSiteThemeId } from '../config/siteThemes.js';
import { isUniqueLookTheme } from '../config/uniqueLook.js';
import {
  getLayout,
  getSkeleton,
  getSectionsForLevel,
  resolveFeatures,
  resolvePaymentMethods,
} from '../config/layouts.js';
import { resolveVoiceCopy, resolveTeamHeading } from './businessScale.js';
import { resolveOperatingModel } from '../config/operatingModel.js';
import { allowsDemoStockPhotos, filterStockImages, isStockImageUrl } from './stockPhotos.js';
import { isAreaDisplay, resolvePrimaryCta, resolvePublicLocation, resolveSiteAddress, resolveSitePhone } from './liveSiteContact.js';

// ---------------------------------------------------------------------------
// Section primitives — one per type, variant-aware, tolerant data access
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} SectionOutput
 * @property {string} type       - Section type key
 * @property {string} [variant]  - Variant used
 * @property {Object} content    - Resolved content (tolerant defaults applied)
 * @property {Object} settings   - Resolved settings
 * @property {string} [accent]   - Whether this section gets accent treatment
 */

const sectionPrimitives = {
  // Core sections
  hero(content, siteData, tokens, variant) {
    const c = content || {};
    const heroVariant = variant || 'split';
    const catalogHero = siteData?.hero && typeof siteData.hero === 'object' ? siteData.hero : {};
    const ctaFromCatalog = Array.isArray(catalogHero.cta) ? catalogHero.cta[0]?.label : catalogHero.cta;
    return {
      type: 'hero',
      variant: heroVariant,
      content: {
        eyebrow: c.eyebrow || catalogHero.eyebrow || siteData?.brand?.name || '',
        title: c.title || catalogHero.title || siteData.heroTitle || siteData.businessName || siteData?.brand?.name || 'Welcome',
        subtitle: c.subtitle || catalogHero.subtitle || siteData.heroSubtitle || siteData?.brand?.tagline || '',
        image: liveImage(c.image || catalogHero.image || siteData.heroImage || '', siteData),
        imageAlt: c.imageAlt || catalogHero.imageAlt || '',
        ctaText: c.ctaText || ctaFromCatalog || resolveHeroCta(heroVariant, siteData),
        ctaLink: c.ctaLink || catalogHero.cta?.[0]?.href || resolvePrimaryCta(siteData).href,
        hoursLine: c.hoursLine || formatHours(c.hours || siteData.businessHours || siteData.contact?.hours || ''),
        addressLine: c.addressLine || resolveSiteAddress(siteData),
        phone: c.phone || resolveSitePhone(siteData),
        rating: c.rating || siteData.googleRating || '',
        reviewCount: c.reviewCount || siteData.googleReviewCount || '',
      },
      settings: {
        overlay: c.overlay !== undefined ? c.overlay : (heroVariant === 'full-bleed'),
        parallax: c.parallax || false,
      },
      accent: true,
    };
  },

  services(content, siteData, tokens, variant) {
    const c = content || {};
    let items = firstList(c.items, siteData.services, siteData.products);
    if (!items.length) {
      items = flattenMenuToProducts(siteData.menu?.sections);
    }
    const displayVariant = variant || 'grid';
    return {
      type: 'services',
      variant: displayVariant,
      content: {
        title: c.title || resolveVoiceCopy(siteData, tokens?.level).servicesTitle,
        items: liveItemPhotos(items, siteData),
        displayVariant,
      },
      settings: {},
      accent: false,
    };
  },

  about(content, siteData, tokens) {
    const c = content || {};
    const catalogAbout = siteData?.about && typeof siteData.about === 'object' ? siteData.about : {};
    return {
      type: 'about',
      content: {
        title: c.title || catalogAbout.title || resolveVoiceCopy(siteData, tokens?.level).aboutTitle,
        body: c.body || c.description || catalogAbout.body || catalogAbout.description || '',
        image: liveImage(c.image || catalogAbout.image || '', siteData),
        features: firstList(c.features, catalogAbout.features),
      },
      settings: {},
      accent: false,
    };
  },

  gallery(content, siteData, tokens, variant) {
    const c = content || {};
    const rawImages = flattenGalleryImages(c).length
      ? flattenGalleryImages(c)
      : flattenGalleryImages(siteData.gallery);
    const images = filterStockImages(rawImages, { allowStock: allowsDemoStockPhotos(siteData) });
    const catalogGallery = siteData?.gallery && typeof siteData.gallery === 'object' ? siteData.gallery : {};
    return {
      type: 'gallery',
      variant: variant || 'grid',
      content: {
        title: c.title || catalogGallery.title || 'Gallery',
        images,
        filterable: c.filterable || false,
      },
      settings: {},
      accent: false,
    };
  },

  'before-after'(content, siteData, tokens, variant) {
    const c = content || {};
    const pairs = c.pairs || siteData.beforeAfter || [];
    return {
      type: 'before-after',
      variant: variant || 'slider',
      content: {
        title: c.title || 'Transformations',
        pairs: liveBeforeAfterPairs(pairs, siteData),
      },
      settings: {},
      accent: false,
    };
  },

  team(content, siteData, tokens, variant) {
    const c = content || {};
    const catalogTeam = siteData?.team && typeof siteData.team === 'object' ? siteData.team : {};
    const members = firstList(c.members, catalogTeam.members, siteData.team);
    return {
      type: 'team',
      variant: variant || 'grid',
      content: {
        title: resolveTeamHeading(members, c.title || catalogTeam.title),
        members: liveMemberPhotos(members, siteData),
      },
      settings: {},
      accent: false,
    };
  },

  testimonials(content, siteData, tokens, variant) {
    const c = content || {};
    const catalog = siteData?.testimonials && typeof siteData.testimonials === 'object' ? siteData.testimonials : {};
    const items = firstList(c.testimonials, c.items, catalog.items, siteData.testimonials);
    return {
      type: 'testimonials',
      variant: variant || 'feature',
      content: {
        title: c.title || catalog.title || 'What Clients Say',
        items,
      },
      settings: {},
      accent: false,
    };
  },

  faq(content, siteData, _tokens) {
    const c = content || {};
    const catalog = siteData?.faq && typeof siteData.faq === 'object' ? siteData.faq : {};
    const items = firstList(c.items, catalog.items, siteData.faq);
    return {
      type: 'faq',
      content: {
        title: c.title || catalog.title || 'FAQ',
        items,
      },
      settings: {},
      accent: false,
    };
  },

  credentials(content, siteData, _tokens) {
    const c = content || {};
    const catalog = siteData?.credentials && typeof siteData.credentials === 'object' ? siteData.credentials : {};
    const items = firstList(c.items, catalog.items, siteData.credentials);
    return {
      type: 'credentials',
      content: {
        title: c.title || catalog.title || 'Certifications',
        items,
      },
      settings: {},
      accent: false,
    };
  },

  contact(content, siteData, _tokens) {
    const c = content || {};
    const location = resolvePublicLocation(siteData);
    return {
      type: 'contact',
      content: {
        title: c.title || 'Contact Us',
        email: c.email || siteData.contactEmail || siteData.contact?.email || '',
        phone: c.phone || siteData.contactPhone || siteData.contact?.phone || '',
        address: location.displayLine,
        hours: formatHours(c.hours || siteData.businessHours || siteData.contact?.hours || ''),
        mapUrl: location.mode === 'area' ? '' : (c.mapUrl || siteData.googleMapsUrl || ''),
        addressDisplay: location.mode,
        publicGeo: location.publicGeo,
        serviceRadiusMiles: location.radiusMiles,
      },
      settings: {},
      accent: false,
    };
  },

  // Commerce sections
  catalog(content, siteData, tokens, variant) {
    const c = content || {};
    const products = firstList(c.products, c.items, siteData.products);
    const menuSections = c.sections || siteData.menu?.sections || [];
    // If menu sections exist, flatten to products
    const items = products.length > 0 ? products : flattenMenuToProducts(menuSections);
    return {
      type: 'catalog',
      variant: variant || 'grid',
      content: {
        title: c.title || 'Menu',
        items: liveItemPhotos(items, siteData),
        displayVariant: variant || 'grid',
        purchasable: Boolean(siteData?.settings?.allowCheckout),
      },
      settings: {},
      accent: false,
    };
  },

  // Booking section
  booking(content, siteData, tokens, variant) {
    const c = content || {};
    return {
      type: 'booking',
      variant: variant || 'panel',
      content: {
        title: c.title || 'Book an Appointment',
        description: c.description || c.subtitle || '',
        enabled: c.enabled !== undefined ? c.enabled : true,
        mode: c.mode || siteData?.booking?.mode || 'native',
        embedded: c.embedded !== undefined ? c.embedded : siteData?.booking?.embedded,
        url: c.url || siteData?.booking?.url || '',
        phone: c.phone || siteData?.contactPhone || siteData?.contact?.phone || '',
        businessMode: c.businessMode
          || resolveOperatingModel(siteData?._niche, tokens?.level || siteData?._level).businessMode,
        provider: c.provider || siteData?.booking?.provider || 'native',
      },
      settings: {},
      accent: true,
    };
  },

  // Reviews section (Google Reviews integration)
  reviews(content, siteData, _tokens) {
    const c = content || {};
    const items = firstList(c.items, c.reviews, siteData.testimonials, siteData.reviews);
    const reviewsFeature = siteData?.features?.reviews || {};
    const placeId = c.placeId || reviewsFeature.placeId || siteData.googlePlaceId || '';
    const enabled = c.enabled !== undefined
      ? c.enabled
      : (reviewsFeature.enabled !== undefined ? reviewsFeature.enabled : true);
    return {
      type: 'reviews',
      content: {
        title: c.title || 'Reviews',
        enabled,
        businessId: c.businessId || '',
        placeId,
        rating: c.rating || siteData.googleRating || null,
        reviewCount: c.reviewCount || siteData.googleReviewCount || null,
        items,
      },
      settings: {},
      accent: false,
    };
  },

  // Stats section
  stats(content, siteData, _tokens) {
    const c = content || {};
    const items = firstList(c.items, siteData.stats);
    return {
      type: 'stats',
      content: {
        title: c.title || '',
        items,
      },
      settings: {},
      accent: false,
    };
  },

  // Menu section (alias for catalog, preserves menu-specific structure)
  menu(content, siteData, _tokens) {
    const c = content || {};
    const sections = c.sections || siteData.menu?.sections || [];
    return {
      type: 'menu',
      content: {
        title: c.title || 'Menu',
        sections,
        purchasable: Boolean(siteData?.settings?.allowCheckout),
      },
      settings: {},
      accent: false,
    };
  },

  // Service areas section (Craftsman)
  'service-areas'(content, siteData, _tokens) {
    const c = content || {};
    const areas = c.areas || siteData.serviceAreas || [];
    return {
      type: 'service-areas',
      content: {
        title: c.title || 'Service Areas',
        areas,
      },
      settings: {},
      accent: false,
    };
  },

  // Process section (Craftsman, Counsel)
  process(content, siteData, tokens) {
    const c = content || {};
    const steps = c.steps || siteData.process || [];
    return {
      type: 'process',
      content: {
        title: c.title || resolveVoiceCopy(siteData, tokens?.level).processTitle,
        steps,
      },
      settings: {},
      accent: false,
    };
  },

  // Case studies section (Counsel)
  'case-studies'(content, siteData, _tokens) {
    const c = content || {};
    const items = c.items || siteData.caseStudies || [];
    return {
      type: 'case-studies',
      content: {
        title: c.title || 'Case Studies',
        items,
      },
      settings: {},
      accent: false,
    };
  },

  // Industries section (Counsel)
  industries(content, siteData, tokens) {
    const c = content || {};
    const items = c.items || siteData.industries || [];
    return {
      type: 'industries',
      content: {
        title: c.title || resolveVoiceCopy(siteData, tokens?.level).industriesTitle,
        items,
      },
      settings: {},
      accent: false,
    };
  },

  // "How to order" section (Bazaar)
  'how-to-order'(content, _siteData, _tokens) {
    const c = content || {};
    return {
      type: 'how-to-order',
      content: {
        title: c.title || 'How to Order',
        steps: c.steps || [],
        instructions: c.instructions || '',
      },
      settings: {},
      accent: true,
    };
  },

  // Hours section
  hours(content, siteData, _tokens) {
    const c = content || {};
    return {
      type: 'hours',
      content: {
        title: c.title || 'Hours',
        hours: formatHours(c.hours || siteData.businessHours || siteData.contact?.hours || ''),
        openUntil: c.openUntil || siteData.openUntil || null,
      },
      settings: {},
      accent: false,
    };
  },

  // Location section
  location(content, siteData, _tokens) {
    const c = content || {};
    const location = resolvePublicLocation(siteData);
    return {
      type: 'location',
      content: {
        title: c.title || 'Location',
        address: location.displayLine || c.address || '',
        mapUrl: location.mode === 'area' ? '' : (c.mapUrl || siteData.social?.maps || siteData.googleMapsUrl || ''),
        instructions: c.instructions || '',
        addressDisplay: location.mode,
        publicGeo: location.publicGeo,
        serviceRadiusMiles: location.radiusMiles,
      },
      settings: {},
      accent: false,
    };
  },

  social(content, siteData, _tokens) {
    const c = content || {};
    const social = siteData?.social && typeof siteData.social === 'object' ? siteData.social : {};
    return {
      type: 'social',
      content: {
        title: c.title || 'Find us',
        facebook: c.facebook || social.facebook || '',
        instagram: c.instagram || social.instagram || '',
        whatsapp: c.whatsapp || social.whatsapp || '',
        tiktok: c.tiktok || social.tiktok || '',
        maps: isAreaDisplay(siteData) ? '' : (c.maps || social.maps || siteData?.googleMapsUrl || ''),
        website: c.website || social.website || '',
        linkedin: c.linkedin || social.linkedin || '',
        twitter: c.twitter || social.twitter || '',
        youtube: c.youtube || social.youtube || '',
      },
      settings: {},
      accent: false,
    };
  },

  // Native booking (legacy alias)
  'native-booking'(content, siteData, _tokens) {
    return sectionPrimitives.booking(content, siteData, _tokens, 'panel');
  },

  // Checkout section
  checkout(content, _siteData, _tokens) {
    const c = content || {};
    return {
      type: 'checkout',
      content: {
        enabled: c.enabled !== undefined ? c.enabled : true,
        allowCheckout: c.allowCheckout || false,
        allowOrders: c.allowOrders || false,
      },
      settings: {},
      accent: false,
    };
  },
};

// ---------------------------------------------------------------------------
// Placeholder renderer — unknown section types NEVER render as null
// ---------------------------------------------------------------------------

function renderPlaceholder(type, content) {
  return {
    type: 'placeholder',
    originalType: type,
    content: content || {},
    settings: {},
    accent: false,
    _placeholder: true,
  };
}

// ---------------------------------------------------------------------------
// Helper: resolve hero CTA based on variant and features
// ---------------------------------------------------------------------------

function resolveHeroCta(variant, _siteData) {
  const defaults = {
    split: 'Book Now',
    'full-bleed': 'Get a Quote',
    lead: 'Get in Touch',
    featured: 'View Menu',
    stall: 'Order Now',
  };
  return defaults[variant] || 'Get Started';
}

// ---------------------------------------------------------------------------
// Helper: flatten menu sections to product list for catalog
// ---------------------------------------------------------------------------

const SECTION_ALIASES = {
  'class-scheduler': 'booking',
  'subscription-booking': 'booking',
  'native-booking': 'booking',
  'interactive-calculator': 'services',
  'service-filters': 'services',
  'zip-checker': 'service-areas',
  'video-gallery': 'gallery',
  'diagnostic-quiz': 'faq',
  'progress-tracker': 'process',
  'enhanced-profiles': 'team',
  'multi-step-form': 'contact',
};

function asItemList(value, nestedKeys = ['items', 'members', 'images', 'steps', 'areas', 'features']) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    for (const key of nestedKeys) {
      if (Array.isArray(value[key])) return value[key];
    }
  }
  return [];
}

function firstList(...candidates) {
  for (const value of candidates) {
    const list = asItemList(value);
    if (list.length) return list;
  }
  return [];
}

function liveImage(url, siteData) {
  if (!url) return '';
  if (allowsDemoStockPhotos(siteData)) return url;
  return isStockImageUrl(url) ? '' : url;
}

function liveItemPhotos(items, siteData) {
  return (Array.isArray(items) ? items : []).map((item) => {
    if (!item || typeof item !== 'object') return item;
    const next = liveImage(item.image || item.src || '', siteData);
    return { ...item, image: next };
  });
}

function liveMemberPhotos(members, siteData) {
  return (Array.isArray(members) ? members : []).map((member) => {
    if (!member || typeof member !== 'object') return member;
    const next = liveImage(member.photo || member.image || '', siteData);
    return { ...member, photo: next, image: next };
  });
}

function liveBeforeAfterPairs(pairs, siteData) {
  return (Array.isArray(pairs) ? pairs : []).map((pair) => {
    if (!pair || typeof pair !== 'object') return pair;
    return {
      ...pair,
      before: liveImage(pair.before, siteData),
      after: liveImage(pair.after, siteData),
    };
  });
}

function normalizeImage(img) {
  if (!img) return null;
  if (typeof img === 'string') return { src: img, url: img, alt: '' };
  const src = img.src || img.url || img.image || '';
  if (!src) return null;
  return {
    ...img,
    src,
    url: src,
    alt: img.alt || img.imageAlt || '',
  };
}

function flattenGalleryImages(source) {
  if (!source) return [];
  if (Array.isArray(source)) return source.map(normalizeImage).filter(Boolean);
  if (typeof source !== 'object') return [];
  if (Array.isArray(source.images) && source.images.length) {
    return source.images.map(normalizeImage).filter(Boolean);
  }
  if (Array.isArray(source.categories)) {
    return source.categories
      .flatMap((category) => (category.images || []).map(normalizeImage))
      .filter(Boolean);
  }
  return [];
}

function formatHours(hours) {
  if (!hours) return '';
  if (typeof hours === 'string') return hours;
  if (Array.isArray(hours)) return hours.filter(Boolean).join(' · ');
  if (typeof hours === 'object') {
    if (Array.isArray(hours.items)) return hours.items.filter(Boolean).join(' · ');
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const fromDays = days
      .map((day) => hours[day] || hours[day.charAt(0).toUpperCase() + day.slice(1)])
      .filter(Boolean);
    if (fromDays.length) return fromDays.join(' · ');
  }
  return '';
}

function flattenMenuToProducts(menuSections) {
  if (!Array.isArray(menuSections)) return [];
  const products = [];
  for (const section of menuSections) {
    const items = section.items || [];
    for (const item of items) {
      products.push({
        ...item,
        _category: section.name || section.id || '',
      });
    }
  }
  return products;
}

// ---------------------------------------------------------------------------
// Core: render a single section
// ---------------------------------------------------------------------------

/**
 * Render a single section using its primitive.
 * Unknown section types render as a placeholder — never null.
 *
 * @param {string} type - Section type key
 * @param {Object} content - Section content
 * @param {Object} siteData - Full site data for context
 * @param {Object} tokens - Resolved theme tokens (from resolveTheme)
 * @param {string} [variant] - Override variant for this section
 * @returns {SectionOutput} Rendered section descriptor
 */
export function renderSection(type, content, siteData, tokens, variant) {
  const resolvedType = SECTION_ALIASES[type] || type;
  const primitive = sectionPrimitives[resolvedType];
  if (primitive) {
    return primitive(content, siteData, tokens, variant);
  }
  // Unknown types: clean placeholder, never null
  return renderPlaceholder(type, content);
}

// ---------------------------------------------------------------------------
// Core: compose an entire page
// ---------------------------------------------------------------------------

/**
 * Compose a full page from site data, layout, character, level, and features.
 *
 * This is the main entry point for both preview and publish rendering.
 * It resolves the theme, determines the skeleton, and renders each section.
 *
 * @param {Object} params
 * @param {Object} params.siteData - Full site data
 * @param {string} [params.layout] - Layout key (atelier, etc.)
 * @param {string} [params.character] - Character key (refined, approachable)
 * @param {string} [params.level] - Business level (solo, studio, established)
 * @param {string} [params.niche] - Niche key for accent auto-selection
 * @param {Object} [params.overrides] - Theme overrides (mode, accent, accentValue)
 * @param {Object} [params.userFeatures] - Feature toggles from editor
 * @returns {Object} Composed page with sections and resolved tokens
 */
export function composePage({
  siteData,
  layout: layoutKey,
  character,
  level,
  niche,
  overrides,
  userFeatures,
}) {
  // Resolve layout from explicit key > siteData metadata > niche > default
  const resolvedLayoutKey =
    layoutKey ||
    siteData?._layout ||
    getLayoutForNiche(niche) ||
    'atelier';
  const layout = getLayout(resolvedLayoutKey);

  // Resolve level from explicit > siteData metadata > auto-detect > default
  const resolvedLevel =
    level ||
    siteData?._level ||
    suggestLevel(siteData) ||
    'solo';
  // Resolve character from explicit > siteData metadata > layout default > default
  const resolvedCharacter =
    character ||
    siteData?._character ||
    layout?.character ||
    'refined';

  // Resolve theme tokens
  const uniqueLook = isUniqueLookTheme(siteData?._uniqueLook) ? siteData._uniqueLook : null;
  const tokens = resolveTheme({
    layout: resolvedLayoutKey,
    character: resolvedCharacter,
    level: resolvedLevel,
    niche: niche || siteData?._niche,
    overrides: {
      uniqueLook,
      themeId: uniqueLook
        ? undefined
        : normalizeSiteThemeId(
          siteData?._themeId || siteData?.themeId || siteData?.colors?.themeId,
          niche || siteData?._niche
        ),
      ...(overrides || {}),
    },
  });

  // Resolve features — user toggles > siteData metadata > layout defaults
  const features = resolveFeatures(resolvedLayoutKey, userFeatures || siteData?._features);

  // Get skeleton for this layout + level
  const skeleton = getSkeleton(resolvedLayoutKey, resolvedLevel);
  const sectionsConfig = getSectionsForLevel(resolvedLayoutKey, resolvedLevel);

  // Render each section in skeleton order
  const sections = [];
  for (const sectionType of skeleton) {
    // Find section data from siteData
    const sectionData = findSectionData(siteData, sectionType);
    if (sectionData && sectionData.enabled === false) continue;
    const config = layout?.sections[sectionType] || sectionsConfig[sectionType];

    // Skip sections gated by features
    if (sectionType === 'booking' && !features.booking?.enabled) continue;
    if ((sectionType === 'catalog' || sectionType === 'menu') && !features.onlineOrdering?.enabled && isOrderingSection(sectionType)) {
      // Catalog/menu section can still show without ordering — only skip if explicitly hidden
    }

    const variant = config?.variant || undefined;
    const content = sectionData?.content || sectionData || {};
    const rendered = renderSection(sectionType, content, siteData, tokens, variant);
    sections.push(rendered);
  }

  // Also render any sections in siteData.sections that aren't in the skeleton
  // (user-added optional sections)
  if (Array.isArray(siteData.sections)) {
    const skeletonSet = new Set(skeleton);
    for (const section of siteData.sections) {
      if (!skeletonSet.has(section.type) && section.enabled !== false) {
        const rendered = renderSection(
          section.type,
          section.content || {},
          siteData,
          tokens,
          section.settings?.variant
        );
        sections.push(rendered);
      }
    }
  }

  const presentTypes = new Set(sections.map((section) => section.type));
  const catalogExtras = ['about', 'faq', 'credentials', 'stats'];
  for (const extraType of catalogExtras) {
    if (presentTypes.has(extraType)) continue;
    const extraData = findSectionData(siteData, extraType);
    if (extraData?.enabled === false) continue;
    if (!hasCatalogBlock(extraType, extraData)) continue;
    const rendered = renderSection(
      extraType,
      extraData?.content || extraData || {},
      siteData,
      tokens
    );
    const contactIndex = sections.findIndex((section) => section.type === 'contact');
    if (contactIndex >= 0) {
      sections.splice(contactIndex, 0, rendered);
    } else {
      sections.push(rendered);
    }
    presentTypes.add(extraType);
  }

  return {
    layout: resolvedLayoutKey,
    character: resolvedCharacter,
    level: resolvedLevel,
    tokens,
    features,
    sections,
    paymentMethods: resolvePaymentMethods(features),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLayoutForNiche(niche) {
  // Import from layouts.js — circular-safe inline lookup
  const { LAYOUTS } = require_or_import_layouts();
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    if (layout.niches.includes(niche)) return key;
  }
  return 'atelier';
}

// Avoid circular import — use dynamic require only if needed
// In ESM context this will be handled by the import at top of file
function require_or_import_layouts() {
  // The import is at the top of the file; this function is a no-op wrapper
  // to make the dependency explicit in this context.
  // In practice, composePage consumers should pass layoutKey explicitly.
  return { LAYOUTS: {} };
}

/**
 * Find section data from siteData by type.
 * Checks sections[] array first, then top-level key.
 */
function findSectionData(siteData, type) {
  if (!siteData) return null;
  // Check canonical sections array
  if (Array.isArray(siteData.sections)) {
    const found = siteData.sections.find((s) => s.type === type);
    if (found) return found;
  }
  // Check top-level key (legacy flat format)
  if (siteData[type]) return siteData[type];
  return null;
}

function hasCatalogBlock(type, data) {
  if (!data || typeof data !== 'object') return false;
  if (type === 'about') {
    return Boolean(data.body || data.description || data.content?.body || data.content?.description);
  }
  return firstList(data.items, data.members, data.content?.items).length > 0;
}

/**
 * Check if a section type is ordering-related.
 */
function isOrderingSection(type) {
  return ['catalog', 'menu', 'products', 'product-catalog'].includes(type);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { sectionPrimitives };