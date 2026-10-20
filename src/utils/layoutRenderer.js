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

import { FEATURES, hasFeature } from './planFeatures.js';
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
    let items = firstList(c.items, siteData.services);
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
        hoursNote: readHours(c.hours || siteData.businessHours || siteData.contact?.hours || '').note,
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
    const source = Array.isArray(c.sections) ? c.sections : (siteData?.menu?.sections || []);
    const sections = source.map((sec) => ({
      name: String(sec?.name || '').trim(),
      items: (Array.isArray(sec?.items) ? sec.items : [])
        .map((item) => ({
          name: String(item?.name || '').trim(),
          price: item?.price,
          description: typeof item?.description === 'string' ? item.description : '',
          image: liveImage(typeof item?.image === 'string' ? item.image : '', siteData),
          imageAlt: typeof item?.imageAlt === 'string' ? item.imageAlt : '',
          dietary: filterTags(item?.dietary),
        }))
        .filter((item) => item.name),
    })).filter((sec) => sec.name && sec.items.length);
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
    const source = c.hours || siteData.businessHours || siteData.contact?.hours || '';
    const parsed = readHours(source);
    const note = (typeof c.note === 'string' && c.note.trim()) || parsed.note;
    return {
      type: 'hours',
      content: {
        title: c.title || 'Hours',
        hours: parsed.lines.join(' · '),
        lines: parsed.lines,
        note,
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
        parking: visitNote(c.parking || siteData.contact?.parking),
        accessibility: visitNote(c.accessibility || siteData.contact?.accessibility),
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
        maps: isAreaDisplay(siteData) ? '' : (c.maps || social.maps || httpUrl(social.googleMaps) || siteData?.googleMapsUrl || ''),
        website: c.website || social.website || '',
        linkedin: c.linkedin || social.linkedin || '',
        twitter: c.twitter || social.twitter || '',
        youtube: c.youtube || social.youtube || '',
        yelp: httpUrl(c.yelp || social.yelp),
        pinterest: httpUrl(c.pinterest || social.pinterest),
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
  'zip-checker'(content) {
    const c = content || {};
    const areas = firstList(c.serviceAreas, c.areas, c.zips)
      .map((zip) => String(zip).trim())
      .filter((zip) => /^\d{5}$/.test(zip));
    const ranges = (Array.isArray(c.serviceAreaRanges) ? c.serviceAreaRanges : [])
      .map((range) => ({ start: Number(range?.start), end: Number(range?.end) }))
      .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end));
    return {
      type: 'zip-checker',
      content: {
        title: c.title || 'Check service availability',
        description: typeof c.description === 'string' ? c.description : '',
        areas,
        ranges,
        successMessage: c.successMessage || 'We serve your area.',
        unavailableMessage: c.errorMessage || 'We do not serve that area yet. Send a note and we will tell you if that changes.',
      },
      settings: {},
      accent: false,
    };
  },

  'interactive-calculator'(content) {
    const c = content || {};
    const items = firstList(c.items)
      .map((item) => ({
        name: String(item?.name || item?.label || '').trim(),
        price: Number(item?.price) || 0,
        description: typeof item?.description === 'string' ? item.description : '',
      }))
      .filter((item) => item.name);
    return {
      type: 'interactive-calculator',
      content: {
        title: c.heading || c.title || 'Build your package',
        description: typeof (c.subheading || c.description) === 'string' ? (c.subheading || c.description) : '',
        items,
      },
      settings: {},
      accent: false,
    };
  },

  'subscription-booking'(content) {
    const c = content || {};
    const plans = (Array.isArray(c.services) ? c.services : (Array.isArray(c.plans) ? c.plans : []))
      .map((plan) => ({
        name: String(plan?.name || '').trim(),
        price: Number(plan?.price) || 0,
        description: typeof plan?.description === 'string' ? plan.description : '',
      }))
      .filter((plan) => plan.name);
    const frequencies = (Array.isArray(c.frequencies) ? c.frequencies : [])
      .map((item) => ({
        label: String(item?.label || item?.value || '').trim(),
        discount: Number(item?.discount) || 0,
      }))
      .filter((item) => item.label);
    return {
      type: 'subscription-booking',
      content: {
        title: c.title || c.heading || 'Plans',
        description: typeof c.description === 'string' ? c.description : '',
        plans,
        frequencies,
      },
      settings: {},
      accent: false,
    };
  },

  'enhanced-profiles'(content, siteData) {
    const c = content || {};
    const profiles = liveMemberPhotos((Array.isArray(c.profiles) ? c.profiles : [])
      .map((profile) => ({
        name: String(profile?.name || '').trim(),
        title: String(profile?.title || profile?.role || '').trim(),
        bio: typeof profile?.bio === 'string' ? profile.bio : '',
        image: typeof profile?.image === 'string' ? profile.image : (typeof profile?.photo === 'string' ? profile.photo : ''),
        credentials: filterTags(profile?.credentials),
        specializations: filterTags(profile?.specializations),
      }))
      .filter((profile) => profile.name), siteData)
      .map((profile) => ({
        name: profile.name,
        title: profile.title,
        bio: profile.bio,
        image: profile.photo || '',
        credentials: profile.credentials,
        specializations: profile.specializations,
      }));
    return {
      type: 'enhanced-profiles',
      content: {
        title: c.title || c.heading || 'Meet the team',
        description: typeof c.description === 'string' ? c.description : '',
        showCredentials: c.showCredentials !== false,
        showSpecializations: c.showSpecializations !== false,
        profiles,
      },
      settings: {},
      accent: false,
    };
  },

  'multi-step-form'(content) {
    const c = content || {};
    const steps = (Array.isArray(c.steps) ? c.steps : [])
      .map((step) => ({
        title: String(step?.title || '').trim(),
        description: typeof step?.description === 'string' ? step.description : '',
        fields: (Array.isArray(step?.fields) ? step.fields : [])
          .map((field) => inquiryField(field))
          .filter(Boolean),
      }))
      .filter((step) => step.title && step.fields.length);
    return {
      type: 'multi-step-form',
      content: {
        title: c.heading || c.title || 'Inquiry',
        description: typeof (c.subheading || c.description) === 'string' ? (c.subheading || c.description) : '',
        steps,
      },
      settings: {},
      accent: false,
    };
  },

  'service-filters'(content) {
    const c = content || {};
    const items = (Array.isArray(c.items) ? c.items : [])
      .map((item) => ({
        name: String(item?.name || '').trim(),
        price: Number(item?.price) || 0,
        description: typeof item?.description === 'string' ? item.description : '',
        category: String(item?.category || '').trim(),
        dietary: filterTags(item?.dietary),
        petType: filterTags(item?.petType),
      }))
      .filter((item) => item.name);
    const config = c.filterConfig && typeof c.filterConfig === 'object' ? c.filterConfig : {};
    const keys = Array.isArray(c.filters) ? c.filters.map((key) => String(key || '').trim()).filter(Boolean) : [];
    const groups = keys.map((key) => ({
      key,
      label: String(config[key]?.label || (key === 'category' ? 'Category' : key === 'petType' ? 'Pet type' : 'Dietary')).trim(),
      options: filterOptions(items, key, config[key]),
    })).filter((group) => group.options.length);
    return {
      type: 'service-filters',
      content: {
        title: c.heading || c.title || 'Filter',
        description: typeof (c.subheading || c.description) === 'string' ? (c.subheading || c.description) : '',
        items,
        groups,
      },
      settings: {},
      accent: false,
    };
  },

  'class-scheduler'(content) {
    const c = content || {};
    const classes = (Array.isArray(c.classes) ? c.classes : [])
      .map((item) => ({
        name: String(item?.name || '').trim(),
        type: String(item?.type || '').trim(),
        time: String(item?.time || '').trim(),
        duration: String(item?.duration || '').trim(),
        instructor: String(item?.instructor || '').trim(),
        description: typeof item?.description === 'string' ? item.description : '',
        daysOfWeek: Array.isArray(item?.daysOfWeek)
          ? item.daysOfWeek.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
          : [],
      }))
      .filter((item) => item.name);
    return {
      type: 'class-scheduler',
      content: {
        title: c.heading || c.title || 'Class schedule',
        description: typeof (c.subheading || c.description) === 'string' ? (c.subheading || c.description) : '',
        classes,
      },
      settings: {},
      accent: false,
    };
  },

  'video-gallery'(content) {
    const c = content || {};
    const videos = (Array.isArray(c.videos) ? c.videos : [])
      .map((video) => ({
        title: String(video?.title || '').trim(),
        description: typeof video?.description === 'string' ? video.description : '',
        category: typeof video?.category === 'string' ? video.category : '',
        provider: String(video?.provider || '').trim().toLowerCase(),
        videoId: String(video?.videoId || '').trim(),
        duration: typeof video?.duration === 'string' ? video.duration : '',
      }))
      .filter((video) => video.title);
    return {
      type: 'video-gallery',
      content: {
        title: c.title || c.heading || 'Videos',
        description: typeof (c.description || c.subheading) === 'string' ? (c.description || c.subheading) : '',
        showCategories: c.showCategories !== false,
        videos,
      },
      settings: {},
      accent: false,
    };
  },

  'progress-tracker'(content) {
    const c = content || {};
    const source = Array.isArray(c.statuses) ? c.statuses : (Array.isArray(c.stages) ? c.stages : []);
    const stages = source
      .map((stage) => ({
        id: String(stage?.id || '').trim(),
        label: String(stage?.label || stage?.title || stage?.name || '').trim(),
        description: typeof stage?.description === 'string' ? stage.description : '',
      }))
      .filter((stage) => stage.label);
    return {
      type: 'progress-tracker',
      content: {
        title: c.title || c.heading || 'Track your repair',
        currentStatus: typeof c.currentStatus === 'string' ? c.currentStatus : '',
        stages,
      },
      settings: {},
      accent: false,
    };
  },

  'diagnostic-quiz'(content) {
    const c = content || {};
    const questions = (Array.isArray(c.questions) ? c.questions : [])
      .map((question) => {
        const title = String(question?.title || question?.label || '').trim();
        const options = (Array.isArray(question?.options) ? question.options : [])
          .map((option) => ({
            label: String(option?.label || option?.name || '').trim(),
            price: Number(option?.price) || 0,
          }))
          .filter((option) => option.label);
        return { title, options };
      })
      .filter((question) => question.title && question.options.length);
    return {
      type: 'diagnostic-quiz',
      content: {
        title: c.heading || c.title || 'Get an estimate',
        description: typeof (c.subheading || c.description) === 'string' ? (c.subheading || c.description) : '',
        questions,
      },
      settings: {},
      accent: false,
    };
  },

  checkout(content, siteData, _tokens) {
    const c = content || {};
    const allowCheckout = Boolean(siteData?.settings?.allowCheckout);
    const enabled = allowCheckout && c.enabled !== false;
    return {
      type: 'checkout',
      enabled,
      content: {
        enabled,
        allowCheckout,
        allowOrders: allowCheckout && Boolean(siteData?.settings?.allowOrders),
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

function inquiryField(field) {
  const allowed = ['text', 'email', 'tel', 'number', 'select', 'textarea'];
  const type = allowed.includes(field?.type) ? field.type : 'text';
  const name = String(field?.name || '').trim();
  if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(name)) return null;
  const options = type === 'select'
    ? (Array.isArray(field?.options) ? field.options : [])
      .map((option) => ({
        value: String(option?.label || option?.value || '').trim(),
      }))
      .filter((option) => option.value)
    : [];
  if (type === 'select' && !options.length) return null;
  const min = Number(field?.min);
  const max = Number(field?.max);
  return {
    name,
    label: String(field?.label || name).trim(),
    type,
    required: field?.required === true,
    placeholder: typeof field?.placeholder === 'string' ? field.placeholder : '',
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
    options,
  };
}

function filterTags(value) {
  const source = Array.isArray(value) ? value : (value ? [value] : []);
  return source.map((tag) => String(tag || '').trim()).filter(Boolean);
}

function filterOptions(items, key, configured) {
  const fromConfig = Array.isArray(configured?.options)
    ? configured.options
      .map((option) => ({
        value: String(option?.value || '').trim(),
        label: String(option?.label || option?.value || '').trim(),
      }))
      .filter((option) => option.value && option.label)
    : [];
  if (fromConfig.length) return fromConfig;
  const seen = new Set();
  items.forEach((item) => {
    const tags = key === 'category' ? filterTags(item.category) : filterTags(item[key]);
    tags.forEach((tag) => seen.add(tag));
  });
  return [...seen].map((value) => ({ value, label: value }));
}

const SECTION_ALIASES = {
  'native-booking': 'booking',
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

function visitNote(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function httpUrl(value) {
  const raw = String(value || '').trim();
  return /^https?:\/\//i.test(raw) ? raw : '';
}

function hourSpan(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  if (value.closed === true) return 'Closed';
  const open = typeof value.open === 'string' ? value.open.trim() : '';
  const close = typeof value.close === 'string' ? value.close.trim() : '';
  if (open && close) return `${open} – ${close}`;
  return open;
}

function readHours(hours) {
  if (!hours) return { lines: [], note: '' };
  if (typeof hours === 'string') {
    const line = hours.trim();
    return { lines: line ? [line] : [], note: '' };
  }
  if (Array.isArray(hours)) {
    return {
      lines: hours.map((item) => hourSpan(item)).filter(Boolean),
      note: '',
    };
  }
  if (typeof hours === 'object') {
    const note = typeof hours.note === 'string' ? hours.note.trim() : '';
    if (Array.isArray(hours.items)) {
      return { lines: hours.items.map((item) => hourSpan(item)).filter(Boolean), note };
    }
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const lines = days
      .map((day) => hourSpan(hours[day] || hours[day.charAt(0).toUpperCase() + day.slice(1)]))
      .filter(Boolean);
    return { lines, note };
  }
  return { lines: [], note: '' };
}

function formatHours(hours) {
  return readHours(hours).lines.join(' · ');
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
        _categoryDescription: typeof section.description === 'string' ? section.description.trim() : '',
        dietary: filterTags(item?.dietary),
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
        const plan = siteData?.plan || siteData?.settings?.tier;
        const gatedFeature = {
          'zip-checker': FEATURES.ZIP_CHECKER,
          'interactive-calculator': FEATURES.INTERACTIVE_CALCULATOR,
          'diagnostic-quiz': FEATURES.DIAGNOSTIC_QUIZ,
          'progress-tracker': FEATURES.PROGRESS_TRACKER,
          'video-gallery': FEATURES.VIDEO_GALLERY,
          'class-scheduler': FEATURES.CLASS_SCHEDULER,
          'subscription-booking': FEATURES.SUBSCRIPTION_BOOKING,
          'service-filters': FEATURES.FILTERS,
          'multi-step-form': FEATURES.SERVICE_REQUEST_FORMS,
          'enhanced-profiles': FEATURES.ENHANCED_PROFILES,
        }[section.type] || null;
        if (gatedFeature && plan && !hasFeature(plan, gatedFeature)) continue;
        const usesSettings = Boolean(gatedFeature);
        const extraSettings = usesSettings && section.settings && typeof section.settings === 'object'
          ? section.settings
          : {};
        const rendered = renderSection(
          section.type,
          { ...extraSettings, ...(section.content || {}) },
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