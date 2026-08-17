/**
 * Section Registry Configuration
 * Single source of truth for all available sections across the platform
 * This wrapper loads the registry and provides utility functions
 */

import { hasTierAccess } from './tiers.js';

// In-app import of the registry
// In production, can be dynamically loaded from /public/data/section-registry.json
const REGISTRY_DATA = {
  version: "1.0",
  description: "Unified section registry for plug-and-play features across all templates",
  sections: [
    {
      type: "hero",
      name: "Hero Section",
      category: "core",
      icon: "🎯",
      requiredTier: "trial",
      description: "Full-width hero with title, subtitle, and CTA",
      removable: false,
      repeatable: false,
      defaultSettings: {
        backgroundColor: "#ffffff",
        textColor: "#000000",
        ctaLabel: "Get Started"
      },
      defaultContent: {
        title: "Welcome to Your Business",
        subtitle: "Tell your story here",
        image: null,
        ctaText: "Get Started",
        ctaLink: "#contact"
      }
    },
    {
      type: "stats",
      name: "Statistics/Metrics",
      category: "core",
      icon: "📊",
      requiredTier: "starter",
      description: "Display key business metrics or achievements",
      removable: true,
      repeatable: false
    },
    {
      type: "services",
      name: "Services/Products",
      category: "core",
      icon: "🛍️",
      requiredTier: "trial",
      description: "Display services or products in a grid",
      removable: false,
      repeatable: false
    },
    {
      type: "about",
      name: "About Section",
      category: "core",
      icon: "👤",
      requiredTier: "starter",
      description: "Tell your business story",
      removable: true,
      repeatable: false
    },
    {
      type: "gallery",
      name: "Gallery",
      category: "media",
      icon: "🖼️",
      requiredTier: "starter",
      description: "Image gallery with lightbox",
      removable: true,
      repeatable: true
    },
    {
      type: "before-after",
      name: "Before/After Gallery",
      category: "media",
      icon: "🔄",
      requiredTier: "starter",
      description: "Side-by-side before/after comparison",
      removable: true,
      repeatable: true
    },
    {
      type: "team",
      name: "Team Profiles",
      category: "people",
      icon: "👥",
      requiredTier: "starter",
      description: "Display team member profiles",
      removable: true,
      repeatable: false
    },
    {
      type: "testimonials",
      name: "Testimonials",
      category: "social-proof",
      icon: "⭐",
      requiredTier: "starter",
      description: "Customer testimonials and reviews",
      removable: true,
      repeatable: false
    },
    {
      type: "faq",
      name: "FAQ/Accordion",
      category: "content",
      icon: "❓",
      requiredTier: "starter",
      description: "Collapsible FAQ section",
      removable: true,
      repeatable: false
    },
    {
      type: "credentials",
      name: "Credentials/Badges",
      category: "trust",
      icon: "✓",
      requiredTier: "trial",
      description: "Display certifications and trust badges",
      removable: true,
      repeatable: false
    },
    {
      type: "menu",
      name: "Menu (Restaurants)",
      category: "niche",
      icon: "🍽️",
      requiredTier: "starter",
      description: "Restaurant menu with categories",
      removable: true,
      repeatable: false,
      applicableTo: ["restaurant"]
    },
    {
      type: "contact",
      name: "Contact Section",
      category: "core",
      icon: "📞",
      requiredTier: "trial",
      description: "Contact information and form",
      removable: false,
      repeatable: false
    },
    {
      type: "booking",
      name: "Booking Widget",
      category: "features",
      icon: "📅",
      requiredTier: "growth",
      description: "Built-in appointment booking (same as native-booking)",
      removable: true,
      repeatable: false
    },
    {
      type: "catalog",
      name: "Catalog / Menu Grid",
      category: "core",
      icon: "🛒",
      requiredTier: "trial",
      description: "Product or menu catalog. Checkout is gated separately on Growth.",
      removable: false,
      repeatable: false
    },
    {
      type: "service-areas",
      name: "Service Areas",
      category: "core",
      icon: "📍",
      requiredTier: "trial",
      description: "Neighborhoods or regions you serve",
      removable: true,
      repeatable: false
    },
    {
      type: "process",
      name: "Process / How We Work",
      category: "core",
      icon: "📋",
      requiredTier: "starter",
      description: "Step-by-step process",
      removable: true,
      repeatable: false
    },
    {
      type: "case-studies",
      name: "Case Studies",
      category: "core",
      icon: "📁",
      requiredTier: "starter",
      description: "Proof of work and results",
      removable: true,
      repeatable: false
    },
    {
      type: "industries",
      name: "Industries Served",
      category: "core",
      icon: "🏢",
      requiredTier: "starter",
      description: "Industries or client types",
      removable: true,
      repeatable: false
    },
    {
      type: "how-to-order",
      name: "How to Order",
      category: "core",
      icon: "📝",
      requiredTier: "trial",
      description: "Ordering instructions for pop-ups and shops",
      removable: true,
      repeatable: false
    },
    {
      type: "hours",
      name: "Hours",
      category: "core",
      icon: "🕐",
      requiredTier: "trial",
      description: "Open hours for a stall or shop",
      removable: true,
      repeatable: false
    },
    {
      type: "location",
      name: "Location",
      category: "core",
      icon: "📌",
      requiredTier: "trial",
      description: "Where to find the business",
      removable: true,
      repeatable: false
    },
    {
      type: "social",
      name: "Social Links",
      category: "core",
      icon: "🔗",
      requiredTier: "trial",
      description: "Social and map links",
      removable: true,
      repeatable: false,
      defaultContent: {
        title: "Find us",
        facebook: "",
        instagram: "",
        whatsapp: "",
        tiktok: "",
        maps: "",
        website: "",
        linkedin: ""
      }
    },
    {
      type: "native-booking",
      name: "Native Booking Widget",
      category: "features",
      icon: "📅",
      requiredTier: "growth",
      description: "Built-in appointment booking system with business mode support",
      removable: true,
      repeatable: false
    },
    {
      type: "checkout",
      name: "Stripe Checkout",
      category: "features",
      icon: "💳",
      requiredTier: "growth",
      description: "Stripe payment processing and shopping cart",
      removable: true,
      repeatable: false
    },
    {
      type: "reviews",
      name: "Google Reviews",
      category: "social-proof",
      icon: "⭐",
      requiredTier: "growth",
      description: "Display Google Business reviews",
      removable: true,
      repeatable: false
    },
    {
      type: "interactive-calculator",
      name: "Interactive Calculator",
      category: "premium-modules",
      icon: "🧮",
      requiredTier: "growth",
      description: "Dynamic pricing or cost calculator",
      removable: true,
      repeatable: true
    },
    {
      type: "class-scheduler",
      name: "Class Schedule",
      category: "premium-modules",
      icon: "📅",
      requiredTier: "growth",
      description: "Display recurring classes or group sessions",
      removable: true,
      repeatable: false,
      applicableTo: ["gym", "salon"]
    },
    {
      type: "subscription-booking",
      name: "Subscription/Membership Booking",
      category: "premium-modules",
      icon: "🔄",
      requiredTier: "growth",
      description: "Recurring subscription or membership plans",
      removable: true,
      repeatable: false,
      applicableTo: ["gym", "salon", "plumbing"]
    },
    {
      type: "diagnostic-quiz",
      name: "Diagnostic Quiz",
      category: "premium-modules",
      icon: "❓",
      requiredTier: "growth",
      description: "Interactive quiz for diagnostics or matching",
      removable: true,
      repeatable: true,
      applicableTo: ["tech-repair", "consultant", "gym"]
    },
    {
      type: "progress-tracker",
      name: "Progress/Status Tracker",
      category: "premium-modules",
      icon: "📈",
      requiredTier: "growth",
      description: "Show repair status, transformation progress, or project stages",
      removable: true,
      repeatable: false,
      applicableTo: ["tech-repair", "gym", "salon"]
    },
    {
      type: "resource-center",
      name: "Resource Center/Knowledge Base",
      category: "premium-modules",
      icon: "📚",
      requiredTier: "growth",
      description: "Curated resources, guides, or educational content",
      removable: true,
      repeatable: false,
      applicableTo: ["consultant", "electrician", "plumbing"]
    },
    {
      type: "video-gallery",
      name: "Video Gallery",
      category: "premium-modules",
      icon: "🎥",
      requiredTier: "growth",
      description: "YouTube/Vimeo video embedding gallery",
      removable: true,
      repeatable: true
    },
    {
      type: "zip-checker",
      name: "ZIP Code Service Area Checker",
      category: "premium-modules",
      icon: "📍",
      requiredTier: "growth",
      description: "Allow customers to check if you serve their area",
      removable: true,
      repeatable: false,
      applicableTo: ["electrician", "plumbing", "cleaning", "tech-repair"]
    },
    {
      type: "enhanced-profiles",
      name: "Enhanced Staff/Artisan Profiles",
      category: "premium-modules",
      icon: "🎭",
      requiredTier: "growth",
      description: "Rich profiles with specialties, credentials, and portfolios",
      removable: true,
      repeatable: false
    },
    {
      type: "service-filters",
      name: "Service/Menu Filters",
      category: "features",
      icon: "🔍",
      requiredTier: "growth",
      description: "Filter services by category, price, duration, etc.",
      removable: true,
      repeatable: false
    }
  ]
};

const SECTION_TYPE_ALIASES = {
  booking: 'native-booking',
  'native-booking': 'booking',
  'multi-step-form': 'contact',
};

/**
 * Get a section definition by type
 * @param {string} type - Section type ID
 * @returns {Object|null} - Section definition or null
 */
export function getSectionByType(type) {
  const exact = REGISTRY_DATA.sections.find(s => s.type === type);
  if (exact) return exact;
  const alias = SECTION_TYPE_ALIASES[type];
  if (!alias) return null;
  return REGISTRY_DATA.sections.find(s => s.type === alias) || null;
}

/**
 * Get all available sections
 * @returns {Array} - All sections
 */
export function getAllSections() {
  return REGISTRY_DATA.sections;
}

/**
 * Get sections by category
 * @param {string} category - Category name (core, media, people, features, premium-modules, etc.)
 * @returns {Array} - Sections in that category
 */
export function getSectionsByCategory(category) {
  return REGISTRY_DATA.sections.filter(s => s.category === category);
}

/**
 * Get all unique categories
 * @returns {Array} - Sorted category names
 */
export function getAllCategories() {
  const categories = new Set(REGISTRY_DATA.sections.map(s => s.category));
  return Array.from(categories).sort();
}

/**
 * Get sections applicable to a specific niche
 * @param {string} niche - Niche template name (restaurant, salon, gym, etc.)
 * @returns {Array} - Sections applicable to that niche + universal sections
 */
export function getSectionsForNiche(niche) {
  return REGISTRY_DATA.sections.filter(s => 
    !s.applicableTo || s.applicableTo.length === 0 || s.applicableTo.includes(niche)
  );
}

/**
 * Check if a tier has access to a section
 * @param {string} userTier - User's subscription tier
 * @param {string} sectionType - Section type
 * @param {Object} overrides - Optional admin overrides (sectionId -> { enabled, requiredTier })
 * @returns {boolean} - True if user can access
 */
export function canAccessSection(userTier, sectionType, overrides = {}) {
  const section = getSectionByType(sectionType);
  if (!section) return false;
  
  // Check admin overrides
  const override = overrides[sectionType];
  if (override && override.enabled === false) return false;
  
  const requiredTier = override?.requiredTier || section.requiredTier;
  return hasTierAccess(userTier, requiredTier);
}

/**
 * Create a new section instance
 * @param {string} type - Section type
 * @param {Object} options - Custom settings and content
 * @returns {Object} - New section instance
 */
export function createSectionInstance(type, options = {}) {
  const section = getSectionByType(type);
  if (!section) throw new Error(`Section type not found: ${type}`);
  
  return {
    id: options.id || `${type}-${Date.now()}`,
    type,
    enabled: options.enabled !== false,
    order: options.order || 0,
    settings: { ...section.defaultSettings, ...(options.settings || {}) },
    content: { ...(section.defaultContent || {}), ...(options.content || {}) }
  };
}

export default {
  REGISTRY_DATA,
  getSectionByType,
  getAllSections,
  getSectionsByCategory,
  getAllCategories,
  getSectionsForNiche,
  canAccessSection,
  createSectionInstance
};
