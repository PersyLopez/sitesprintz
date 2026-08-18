/**
 * Niche Template Builders — Refined character siteData seeds for all niches.
 *
 * Each niche produces a complete siteData with:
 *   - `_layout` / `_character` / `_level` / `_theme` / `_features` metadata
 *   - canonical `sections[]` array
 *   - starter content appropriate to the niche
 *
 * Layouts:
 *   Atelier    — salon, gym, pet-care, tech-repair (booking-forward)
 *   Craftsman  — cleaning, electrician, plumbing, auto-repair, tow-truck (trust + reach)
 *   Counsel    — consultant, freelancer (proof / case studies)
 *   Mercantile — restaurant, product-ordering, product-showcase (browse + buy)
 *
 * Bazaar niches are handled separately by bazaarDefaults.js (Approachable character).
 */

import { resolveTheme, suggestLevel } from './layoutTokens.js';
import { resolveFeatures, getLayoutForNiche } from './layouts.js';
import { resolveVoiceCopy } from '../utils/businessScale.js';
import { resolveOperatingModel, buildSiteNav, defaultNamedTeamMembers } from './operatingModel.js';

// ---------------------------------------------------------------------------
// Atelier niches (booking-forward services)
// ---------------------------------------------------------------------------

const ATELIER_NICHES = [
  {
    id: 'salon',
    name: 'Salon & Spa',
    icon: '💇',
    accent: 'studio', // oxblood
    heroTitle: 'Hours, styles, and a way to book',
    heroSubtitle: 'People already like the cut — this page shows when you\'re open and how to get on the chair.',
    defaultHours: 'Tue–Sat 9am–6pm',
    services: [
      { name: 'Haircut & Style', price: '$45', description: 'Precision cut and blow-dry' },
      { name: 'Color Treatment', price: '$85', description: 'Full color or highlights' },
      { name: 'Manicure', price: '$30', description: 'Pampering nail care' },
    ],
    ctaDefault: 'Book Now',
    galleryImages: [
      { src: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80', alt: 'Salon interior' },
      { src: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80', alt: 'Hair styling' },
    ],
  },
  {
    id: 'gym',
    name: 'Fitness & Gym',
    icon: '💪',
    accent: 'club', // graphite
    heroTitle: 'Class times and a clear way in',
    heroSubtitle: 'See when the floor is open, how to book a session, and where to show up.',
    soloHeroSubtitle: 'Personal training with hours you can find. Book a session and let\'s get started.',
    defaultHours: 'Mon–Fri 5am–9pm, Sat–Sun 7am–2pm',
    services: [
      { name: 'Personal Training', price: '$60/session', description: '1-on-1 coaching' },
      { name: 'Group Classes', price: '$20/class', description: 'Yoga, HIIT, spin, and more' },
      { name: 'Membership', price: '$50/mo', description: 'Full gym access' },
    ],
    ctaDefault: 'Book Now',
    galleryImages: [
      { src: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', alt: 'Gym floor' },
      { src: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80', alt: 'Training' },
    ],
  },
  {
    id: 'pet-care',
    name: 'Pet Care',
    icon: '🐾',
    accent: 'hearth', // forest
    heroTitle: 'Grooming hours and easy booking',
    heroSubtitle: 'Bath, board, and checkups — see when we\'re open and how to schedule.',
    defaultHours: 'Tue–Sat 8am–5pm',
    services: [
      { name: 'Grooming', price: '$40', description: 'Bath, brush, and trim' },
      { name: 'Boarding', price: '$35/night', description: 'Safe, comfortable stay' },
      { name: 'Vet Checkup', price: '$55', description: 'Wellness examination' },
    ],
    ctaDefault: 'Book Now',
    galleryImages: [
      { src: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800&q=80', alt: 'Happy dog' },
      { src: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80', alt: 'Grooming' },
    ],
  },
  {
    id: 'tech-repair',
    name: 'Tech Repair',
    icon: '💻',
    accent: 'trade', // steel
    heroTitle: 'Drop-off hours and a clear repair path',
    heroSubtitle: 'Phone and computer repair — see when the bench is open and how to reach us.',
    defaultHours: 'Mon–Sat 10am–7pm',
    services: [
      { name: 'Screen Repair', price: 'from $59', description: 'Phone & tablet screens' },
      { name: 'Diagnostic', price: '$25', description: 'Full system check' },
      { name: 'Data Recovery', price: 'from $99', description: 'Recover what matters' },
    ],
    ctaDefault: 'Book Now',
    galleryImages: [
      { src: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80', alt: 'Device repair' },
      { src: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&q=80', alt: 'Phone repair' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Craftsman niches (trade / fix-it / reach)
// ---------------------------------------------------------------------------

const CRAFTSMAN_NICHES = [
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: '🧹',
    accent: 'hearth', // forest
    heroTitle: 'A clean, booked without the chase',
    heroSubtitle: 'Service areas, weekday hours, and a simple way to request a quote.',
    defaultHours: 'Mon–Fri 8am–5pm',
    services: [
      { name: 'Deep Clean', price: 'from $120', description: 'Top-to-bottom thorough clean' },
      { name: 'Regular Service', price: 'from $80', description: 'Weekly or bi-weekly' },
      { name: 'Move-In/Out', price: 'from $200', description: 'Make it spotless for transition' },
    ],
    serviceAreas: ['Downtown', 'North Side', 'West End', 'Suburbs'],
    ctaDefault: 'Get a Quote',
  },
  {
    id: 'electrician',
    name: 'Electrician',
    icon: '⚡',
    accent: 'trade', // steel
    heroTitle: 'Electrical work you can actually schedule',
    heroSubtitle: 'Licensed professionals, weekday hours, and a clear way to request a quote.',
    soloHeroSubtitle: 'Licensed electrician — hours, service area, and how to reach me.',
    defaultHours: 'Mon–Fri 7am–5pm',
    services: [
      { name: 'Panel Upgrade', price: 'from $800', description: 'Modernize your electrical panel' },
      { name: 'Wiring & Rewiring', price: 'from $300', description: 'Safe, code-compliant wiring' },
      { name: 'Emergency Call', price: 'from $150', description: '24/7 emergency response' },
    ],
    serviceAreas: ['Citywide', 'Greater Metro', 'Surrounding Counties'],
    ctaDefault: 'Get a Quote',
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: '🔧',
    accent: 'trade', // steel
    heroTitle: 'Plumbing help with hours you can find',
    heroSubtitle: 'Drain, leak, and heater work — see when we\'re available and how to call.',
    defaultHours: 'Mon–Fri 7am–5pm',
    services: [
      { name: 'Drain Cleaning', price: 'from $99', description: 'Clear stubborn blockages' },
      { name: 'Leak Repair', price: 'from $150', description: 'Find and fix leaks fast' },
      { name: 'Water Heater', price: 'from $500', description: 'Install or replace' },
    ],
    serviceAreas: ['Downtown', 'East Side', 'South Bay'],
    ctaDefault: 'Get a Quote',
  },
  {
    id: 'auto-repair',
    name: 'Auto Repair',
    icon: '🚗',
    accent: 'workshop', // bronze
    heroTitle: 'Shop hours, honest estimates, a number to call',
    heroSubtitle: 'Expert mechanics, honest pricing, fast turnaround — see when the bay is open.',
    soloHeroSubtitle: 'Expert repair, honest pricing, and hours you can find.',
    defaultHours: 'Mon–Fri 8am–6pm, Sat 8am–2pm',
    services: [
      { name: 'Oil Change', price: 'from $39', description: 'Synthetic or conventional' },
      { name: 'Brake Service', price: 'from $199', description: 'Pads, rotors, inspection' },
      { name: 'Engine Diagnostic', price: 'from $89', description: 'Check engine light? We find it' },
    ],
    serviceAreas: ['Citywide', 'Highway Corridor'],
    ctaDefault: 'Get a Quote',
  },
  {
    id: 'tow-truck',
    name: 'Tow Truck',
    icon: '🚙',
    accent: 'workshop', // bronze
    heroTitle: '24/7 towing — call when you need a lift',
    heroSubtitle: 'Fast roadside help with a number to call and the area we cover.',
    defaultHours: 'Open 24/7',
    services: [
      { name: 'Local Tow', price: 'from $75', description: 'Up to 10 miles' },
      { name: 'Roadside Assistance', price: 'from $49', description: 'Jump-start, lockout, tire' },
      { name: 'Long-Distance Tow', price: 'from $150', description: 'Over 10 miles' },
    ],
    serviceAreas: ['Highway 101 Corridor', 'Greater Metro', 'All County'],
    ctaDefault: 'Call Now',
  },
];

// ---------------------------------------------------------------------------
// Counsel niches (proof / case studies)
// ---------------------------------------------------------------------------

const COUNSEL_NICHES = [
  {
    id: 'consultant',
    name: 'Consultant',
    icon: '💼',
    accent: 'counsel', // indigo
    heroTitle: 'Strategy work, booked by appointment',
    heroSubtitle: 'See how to reach us, what we work on, and request a conversation.',
    defaultHours: 'By appointment',
    services: [
      { name: 'Strategy Consulting', price: '$200/hr', description: 'Business strategy and planning' },
      { name: 'Process Optimization', price: '$5,000/project', description: 'Streamline operations' },
      { name: 'Market Analysis', price: '$3,000/project', description: 'Research-backed insights' },
    ],
    caseStudies: [
      { title: 'Tech Startup Growth', summary: 'Helped a SaaS startup triple revenue in 18 months.', result: '+200% revenue' },
      { title: 'Manufacturing Efficiency', summary: 'Reduced operating costs by 30% for a mid-size manufacturer.', result: '-30% costs' },
    ],
    ctaDefault: 'Get in Touch',
  },
  {
    id: 'freelancer',
    name: 'Freelancer',
    icon: '👔',
    accent: 'counsel', // indigo
    heroTitle: 'Creative work with a clear way to start',
    heroSubtitle: 'Services, examples, and how to get in touch.',
    defaultHours: 'By appointment',
    services: [
      { name: 'Web Design', price: 'from $2,500', description: 'Custom, responsive websites' },
      { name: 'Brand Identity', price: 'from $1,500', description: 'Logo, palette, guidelines' },
      { name: 'Content Strategy', price: 'from $1,000', description: 'Messaging and content plan' },
    ],
    caseStudies: [
      { title: 'E-commerce Redesign', summary: 'Increased conversion rate by 45% for an online retailer.', result: '+45% conversions' },
      { title: 'Brand Refresh', summary: 'Modernized a legacy brand for a new market.', result: 'Repositioned' },
    ],
    ctaDefault: 'Get in Touch',
  },
];

// ---------------------------------------------------------------------------
// Mercantile niches (browse + buy)
// ---------------------------------------------------------------------------

const MERCANTILE_NICHES = [
  {
    id: 'restaurant',
    name: 'Restaurant',
    icon: '🍽️',
    accent: 'table', // amber
    heroTitle: 'Menu, hours, and where to find us',
    heroSubtitle: 'See what we\'re serving, when the kitchen is open, and how to get here.',
    defaultHours: 'Tue–Sun 5pm–10pm',
    menuSections: [
      {
        name: 'Mains',
        items: [
          { name: 'Signature Dish', price: '$24', description: 'Our chef\'s favorite' },
          { name: 'Grilled Salmon', price: '$22', description: 'With seasonal vegetables' },
        ],
      },
      {
        name: 'Starters',
        items: [
          { name: 'Bruschetta', price: '$9', description: 'Fresh tomato, basil, olive oil' },
          { name: 'Calamari', price: '$12', description: 'Crispy, with lemon aioli' },
        ],
      },
    ],
    ctaDefault: 'Order Now',
  },
  {
    id: 'product-ordering',
    name: 'Product Ordering',
    icon: '📦',
    accent: 'table', // amber
    heroTitle: 'Order online or pick up in person',
    heroSubtitle: 'Browse the catalog, see hours, and know where to collect your order.',
    defaultHours: 'Mon–Sat 10am–6pm',
    products: [
      { name: 'Bestseller Item', price: '$29', description: 'Our most popular product' },
      { name: 'Gift Set', price: '$49', description: 'A curated bundle' },
      { name: 'Refill Pack', price: '$19', description: 'Stock up and save' },
    ],
    ctaDefault: 'Order Now',
  },
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    icon: '🛍️',
    accent: 'table', // amber
    heroTitle: 'See the collection, then visit or order',
    heroSubtitle: 'Hours, location, and a simple way to request what you want.',
    defaultHours: 'Tue–Sat 11am–7pm',
    products: [
      { name: 'Featured Piece', price: '$59', description: 'A standout from our collection' },
      { name: 'Classic Edition', price: '$39', description: 'Timeless and versatile' },
      { name: 'Limited Run', price: '$89', description: 'Only a few available' },
    ],
    ctaDefault: 'Order Now',
  },
];

// ---------------------------------------------------------------------------
// Combined config map
// ---------------------------------------------------------------------------

export const NICHE_CONFIGS = [
  ...ATELIER_NICHES,
  ...CRAFTSMAN_NICHES,
  ...COUNSEL_NICHES,
  ...MERCANTILE_NICHES,
].reduce((acc, config) => {
  acc[config.id] = config;
  return acc;
}, {});

export { ATELIER_NICHES, CRAFTSMAN_NICHES, COUNSEL_NICHES, MERCANTILE_NICHES };

/**
 * Get a niche config by id.
 * @param {string} id - Niche id
 * @returns {Object|undefined} Niche config
 */
export function getNicheConfig(id) {
  return NICHE_CONFIGS[id];
}

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

export const DEFAULT_SOCIAL = {
  facebook: '',
  instagram: '',
  whatsapp: '',
  tiktok: '',
  maps: '',
  website: '',
  linkedin: '',
};

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pushHoursLocationContactSocial(sections, order, niche, contactTitle) {
  sections.push({
    id: generateId('hours'),
    type: 'hours',
    enabled: true,
    order: order++,
    content: { title: 'Hours', hours: niche.defaultHours || '' },
    settings: {},
  });
  sections.push({
    id: generateId('location'),
    type: 'location',
    enabled: true,
    order: order++,
    content: { title: 'Find us', address: '', mapUrl: '' },
    settings: {},
  });
  sections.push({
    id: generateId('contact'),
    type: 'contact',
    enabled: true,
    order: order++,
    content: { title: contactTitle, phone: '', email: '', address: '' },
    settings: {},
  });
  sections.push({
    id: generateId('social'),
    type: 'social',
    enabled: true,
    order: order++,
    content: { title: 'Find us', ...DEFAULT_SOCIAL },
    settings: {},
  });
}

function resolveNicheHero(niche, isSolo) {
  return {
    title: (isSolo && niche.soloHeroTitle) || niche.heroTitle,
    subtitle: (isSolo && niche.soloHeroSubtitle) || niche.heroSubtitle,
  };
}

function craftsmanProcessSteps(isSolo) {
  if (isSolo) {
    return [
      { title: 'Contact', description: 'Reach out and tell me what you need.' },
      { title: 'Assessment', description: 'I assess the job and provide a quote.' },
      { title: 'Service', description: 'I complete the work to your satisfaction.' },
    ];
  }
  return [
    { title: 'Contact', description: 'Reach out and tell us what you need.' },
    { title: 'Assessment', description: 'We assess the job and provide a quote.' },
    { title: 'Service', description: 'We complete the work to your satisfaction.' },
  ];
}

function counselProcessSteps(isSolo) {
  if (isSolo) {
    return [
      { title: 'Discovery', description: 'I learn your business and goals.' },
      { title: 'Strategy', description: 'I craft a tailored plan.' },
      { title: 'Execution', description: 'I deliver measurable results.' },
    ];
  }
  return [
    { title: 'Discovery', description: 'We learn your business and goals.' },
    { title: 'Strategy', description: 'We craft a tailored plan.' },
    { title: 'Execution', description: 'We deliver measurable results.' },
  ];
}

// ---------------------------------------------------------------------------
// Section builders per layout
// ---------------------------------------------------------------------------

function buildAtelierSections(niche, level, features) {
  const sections = [];
  let order = 0;
  const voice = resolveVoiceCopy({ teamSize: level === 'solo' ? 1 : 2 }, level);
  const hero = resolveNicheHero(niche, voice.isSolo);
  const model = resolveOperatingModel(niche.id, level);

  sections.push({
    id: generateId('hero'),
    type: 'hero',
    variant: 'split',
    enabled: true,
    order: order++,
    content: {
      eyebrow: niche.name,
      title: hero.title,
      subtitle: hero.subtitle,
      ctaText: features.booking.enabled ? niche.ctaDefault : 'Contact Us',
      ctaLink: features.booking.enabled ? '#booking' : '#contact',
    },
    settings: {},
  });

  sections.push({
    id: generateId('services'),
    type: 'services',
    variant: 'grid',
    enabled: true,
    order: order++,
    content: { title: voice.servicesTitle, items: niche.services || [] },
    settings: {},
  });

  if (level === 'studio' || level === 'established') {
    sections.push({
      id: generateId('team'),
      type: 'team',
      variant: level === 'established' ? 'grid' : 'staff-picker',
      enabled: true,
      order: order++,
      content: { title: model.teamTitle, members: defaultNamedTeamMembers(niche.id, level) },
      settings: {},
    });
  }

  sections.push({
    id: generateId('gallery'),
    type: 'gallery',
    variant: 'masonry',
    enabled: true,
    order: order++,
    content: {
      title: 'Gallery',
      images: (niche.galleryImages || []).map((img) => (
        typeof img === 'string' ? { src: img, url: img, alt: niche.name } : img
      )),
    },
    settings: {},
  });

  if (features.booking.enabled) {
    sections.push({
      id: generateId('booking'),
      type: 'booking',
      variant: 'panel',
      enabled: true,
      order: order++,
      content: {
        title: 'Book an Appointment',
        enabled: true,
        businessMode: model.businessMode,
        noPreferenceText: model.noPreferenceText,
        staffAssignment: model.staffAssignment,
      },
      settings: {},
    });
  }

  if (level === 'studio' || level === 'established') {
    sections.push({
      id: generateId('testimonials'),
      type: 'testimonials',
      variant: 'feature',
      enabled: true,
      order: order++,
      content: { title: 'What Clients Say', items: [] },
      settings: {},
    });
  }

  if (level === 'established') {
    sections.push({
      id: generateId('reviews'),
      type: 'reviews',
      enabled: true,
      order: order++,
      content: { title: 'Reviews', rating: null, reviewCount: null },
      settings: {},
    });
    sections.push({
      id: generateId('stats'),
      type: 'stats',
      enabled: true,
      order: order++,
      content: { title: '', items: [] },
      settings: {},
    });
  }

  pushHoursLocationContactSocial(sections, order, niche, 'Contact Us');

  return sections;
}

function buildCraftsmanSections(niche, level, _features) {
  const sections = [];
  let order = 0;
  const voice = resolveVoiceCopy({ teamSize: level === 'solo' ? 1 : 2 }, level);
  const hero = resolveNicheHero(niche, voice.isSolo);
  const model = resolveOperatingModel(niche.id, level);

  sections.push({
    id: generateId('hero'),
    type: 'hero',
    variant: 'full-bleed',
    enabled: true,
    order: order++,
    content: {
      eyebrow: niche.name,
      title: hero.title,
      subtitle: hero.subtitle,
      ctaText: niche.ctaDefault,
      ctaLink: '#contact',
      overlay: true,
    },
    settings: {},
  });

  sections.push({
    id: generateId('services'),
    type: 'services',
    variant: 'list',
    enabled: true,
    order: order++,
    content: { title: voice.servicesTitle, items: niche.services || [] },
    settings: {},
  });

  sections.push({
    id: generateId('service-areas'),
    type: 'service-areas',
    enabled: true,
    order: order++,
    content: { title: 'Service Areas', areas: niche.serviceAreas || [] },
    settings: {},
  });

  if (level === 'studio' || level === 'established') {
    sections.push({
      id: generateId('process'),
      type: 'process',
      enabled: true,
      order: order++,
      content: {
        title: voice.processTitle,
        steps: craftsmanProcessSteps(voice.isSolo),
      },
      settings: {},
    });

    sections.push({
      id: generateId('team'),
      type: 'team',
      variant: 'grid',
      enabled: true,
      order: order++,
      content: { title: model.teamTitle, members: defaultNamedTeamMembers(niche.id, level) },
      settings: {},
    });
  }

  sections.push({
    id: generateId('before-after'),
    type: 'before-after',
    variant: 'slider',
    enabled: true,
    order: order++,
    content: { title: 'Transformations', pairs: [] },
    settings: {},
  });

  if (level === 'studio' || level === 'established') {
    sections.push({
      id: generateId('credentials'),
      type: 'credentials',
      enabled: true,
      order: order++,
      content: { title: 'Certifications', items: [] },
      settings: {},
    });
  }

  if (level === 'established') {
    sections.push({
      id: generateId('stats'),
      type: 'stats',
      enabled: true,
      order: order++,
      content: { title: '', items: [] },
      settings: {},
    });
    sections.push({
      id: generateId('testimonials'),
      type: 'testimonials',
      variant: 'grid',
      enabled: true,
      order: order++,
      content: { title: 'What Clients Say', items: [] },
      settings: {},
    });
  }

  sections.push({
    id: generateId('faq'),
    type: 'faq',
    enabled: true,
    order: order++,
    content: { title: 'FAQ', items: [] },
    settings: {},
  });

  pushHoursLocationContactSocial(sections, order, niche, 'Contact Us');

  return sections;
}

function buildCounselSections(niche, level, _features) {
  const sections = [];
  let order = 0;
  const voice = resolveVoiceCopy({ teamSize: level === 'solo' ? 1 : 2 }, level);
  const hero = resolveNicheHero(niche, voice.isSolo);
  const model = resolveOperatingModel(niche.id, level);

  sections.push({
    id: generateId('hero'),
    type: 'hero',
    variant: 'lead',
    enabled: true,
    order: order++,
    content: {
      eyebrow: niche.name,
      title: hero.title,
      subtitle: hero.subtitle,
      ctaText: niche.ctaDefault,
      ctaLink: '#contact',
    },
    settings: {},
  });

  if (level === 'established') {
    sections.push({
      id: generateId('industries'),
      type: 'industries',
      enabled: true,
      order: order++,
      content: { title: voice.industriesTitle, items: [] },
      settings: {},
    });
  }

  sections.push({
    id: generateId('services'),
    type: 'services',
    variant: 'index',
    enabled: true,
    order: order++,
    content: { title: voice.servicesTitle, items: niche.services || [] },
    settings: {},
  });

  if (level === 'studio' || level === 'established') {
    sections.push({
      id: generateId('case-studies'),
      type: 'case-studies',
      enabled: true,
      order: order++,
      content: { title: 'Case Studies', items: niche.caseStudies || [] },
      settings: {},
    });

    sections.push({
      id: generateId('process'),
      type: 'process',
      enabled: true,
      order: order++,
      content: {
        title: voice.processTitle,
        steps: counselProcessSteps(voice.isSolo),
      },
      settings: {},
    });
  }

  if (level === 'studio' || level === 'established') {
    sections.push({
      id: generateId('team'),
      type: 'team',
      variant: 'grid',
      enabled: true,
      order: order++,
      content: { title: model.teamTitle, members: defaultNamedTeamMembers(niche.id, level) },
      settings: {},
    });
  }

  if (level === 'studio' || level === 'established') {
    sections.push({
      id: generateId('testimonials'),
      type: 'testimonials',
      variant: 'feature',
      enabled: true,
      order: order++,
      content: { title: 'What Clients Say', items: [] },
      settings: {},
    });
  }

  if (level === 'established') {
    sections.push({
      id: generateId('stats'),
      type: 'stats',
      enabled: true,
      order: order++,
      content: { title: '', items: [] },
      settings: {},
    });
  }

  pushHoursLocationContactSocial(sections, order, niche, 'Get in Touch');

  return sections;
}

function buildMercantileSections(niche, level, features) {
  const sections = [];
  let order = 0;
  const voice = resolveVoiceCopy({ teamSize: level === 'solo' ? 1 : 2 }, level);
  const hero = resolveNicheHero(niche, voice.isSolo);
  const model = resolveOperatingModel(niche.id, level);

  sections.push({
    id: generateId('hero'),
    type: 'hero',
    variant: 'featured',
    enabled: true,
    order: order++,
    content: {
      eyebrow: niche.name,
      title: hero.title,
      subtitle: hero.subtitle,
      ctaText: features.onlineOrdering.enabled ? niche.ctaDefault : 'View Menu',
      ctaLink: features.onlineOrdering.enabled ? '#catalog' : '#contact',
    },
    settings: {},
  });

  // Build catalog content from menuSections or products
  let catalogItems = [];
  if (niche.menuSections) {
    for (const section of niche.menuSections) {
      for (const item of (section.items || [])) {
        catalogItems.push({ ...item, _category: section.name });
      }
    }
  } else if (niche.products) {
    catalogItems = niche.products;
  }

  sections.push({
    id: generateId('catalog'),
    type: 'catalog',
    variant: 'grid',
    enabled: true,
    order: order++,
    content: { title: niche.menuSections ? 'Menu' : 'Our Products', items: catalogItems },
    settings: {},
  });

  if (level === 'studio' || level === 'established') {
    sections.push({
      id: generateId('gallery'),
      type: 'gallery',
      variant: 'grid',
      enabled: true,
      order: order++,
      content: { title: 'Gallery', images: [] },
      settings: {},
    });
  }

  if (level === 'studio' || level === 'established') {
    sections.push({
      id: generateId('team'),
      type: 'team',
      variant: 'grid',
      enabled: true,
      order: order++,
      content: { title: model.teamTitle, members: defaultNamedTeamMembers(niche.id, level) },
      settings: {},
    });
  }

  if (level === 'studio' || level === 'established') {
    sections.push({
      id: generateId('reviews'),
      type: 'reviews',
      enabled: true,
      order: order++,
      content: { title: 'Reviews', rating: null, reviewCount: null },
      settings: {},
    });
  }

  if (level === 'established') {
    sections.push({
      id: generateId('stats'),
      type: 'stats',
      enabled: true,
      order: order++,
      content: { title: '', items: [] },
      settings: {},
    });
  }

  if (features.booking.enabled) {
    sections.push({
      id: generateId('booking'),
      type: 'booking',
      enabled: true,
      order: order++,
      content: {
        title: 'Reservations',
        enabled: true,
        businessMode: model.businessMode,
        noPreferenceText: model.noPreferenceText,
        staffAssignment: model.staffAssignment,
      },
      settings: {},
    });
  }

  sections.push({
    id: generateId('faq'),
    type: 'faq',
    enabled: true,
    order: order++,
    content: { title: 'FAQ', items: [] },
    settings: {},
  });

  pushHoursLocationContactSocial(sections, order, niche, 'Contact Us');

  return sections;
}

// ---------------------------------------------------------------------------
// Section builder dispatch
// ---------------------------------------------------------------------------

const SECTION_BUILDERS = {
  atelier: buildAtelierSections,
  craftsman: buildCraftsmanSections,
  counsel: buildCounselSections,
  mercantile: buildMercantileSections,
};

// ---------------------------------------------------------------------------
// buildNicheSiteData()
// ---------------------------------------------------------------------------

/**
 * Assemble a complete siteData object for a Refined-layout niche.
 *
 * @param {string} nicheId - Niche id (salon, plumbing, consultant, restaurant, etc.)
 * @param {Object} [opts]
 * @param {string} [opts.businessName] - Required: business name
 * @param {string} [opts.level] - Override level (solo, studio, established)
 * @param {number} [opts.teamSize] - Team size hint for auto-detection
 * @param {Object} [opts.features] - Feature overrides
 * @param {string} [opts.contactPhone]
 * @param {string} [opts.contactEmail]
 * @param {string} [opts.contactAddress]
 * @returns {Object} Complete siteData with layout metadata
 */
export function buildNicheSiteData(nicheId, opts = {}) {
  const niche = getNicheConfig(nicheId);
  if (!niche) {
    throw new Error(`Unknown niche: ${nicheId}`);
  }

  const layoutKey = getLayoutForNiche(nicheId);

  // Auto-detect level if not provided
  const seedData = {
    teamSize: opts.teamSize,
    team: opts.teamSize ? Array.from({ length: opts.teamSize }, () => ({})) : [],
  };
  const level = opts.level || suggestLevel(seedData) || 'solo';

  // Resolve theme tokens
  const theme = resolveTheme({
    layout: layoutKey,
    character: 'refined',
    level,
    overrides: { accent: niche.accent },
  });

  // Resolve features with user overrides
  const features = resolveFeatures(layoutKey, opts.features);

  // Build sections using the layout's section builder
  const buildSections = SECTION_BUILDERS[layoutKey];
  const sections = buildSections ? buildSections(niche, level, features) : [];

  // Flatten products/menu for legacy top-level access
  const products = niche.products || (niche.menuSections
    ? niche.menuSections.flatMap((s) => s.items || [])
    : []);

  const hero = resolveNicheHero(niche, level === 'solo');
  const operatingModel = resolveOperatingModel(nicheId, level);
  const siteData = {
    businessName: opts.businessName || niche.name,
    heroTitle: hero.title,
    heroSubtitle: hero.subtitle,
    contactPhone: opts.contactPhone || '',
    contactEmail: opts.contactEmail || '',
    contactAddress: opts.contactAddress || '',
    businessHours: niche.defaultHours || '',
    social: { ...DEFAULT_SOCIAL },
    products,
    sections,
    team: { members: defaultNamedTeamMembers(nicheId, level) },
    booking: {
      enabled: features.booking?.enabled === true,
      embedded: features.booking?.enabled === true,
      provider: 'native',
      businessMode: operatingModel.businessMode,
      noPreferenceText: operatingModel.noPreferenceText,
      staffAssignment: operatingModel.staffAssignment,
    },

    // Layout metadata consumed by the engine
    _layout: layoutKey,
    _character: 'refined',
    _level: level,
    _niche: nicheId,
    _operatingModel: operatingModel,
    _theme: {
      layout: layoutKey,
      character: 'refined',
      level,
      mode: theme.theme.mode,
      accent: theme.theme.accent,
      accentValue: theme.theme.accentValue,
    },
    _features: features,
  };
  siteData.nav = buildSiteNav(siteData);
  return siteData;
}