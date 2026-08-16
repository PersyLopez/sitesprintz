/**
 * Template Features Configuration
 * 
 * Defines which features each template uses and how they map to tier requirements.
 * This enables "one template, all tiers" architecture where features are gated
 * at render time based on user's subscription.
 */

import { FEATURES } from './planFeatures.js';

/**
 * Template-specific feature usage map
 * Each template defines which features it uses
 */
export const TEMPLATE_FEATURES = {
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant',
    category: 'Food & Dining',
    icon: '🍽️',
    color: '#ef4444',
    description: 'Complete restaurant website with menu, reservations, and online ordering',
    
    // Features this template supports
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: true,
      bookingWidget: true,
      teamProfiles: true,
      gallery: true,
      filterableGallery: true,
      beforeAfterGallery: false,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: true,
      orderManagement: true,
      privateEvents: true,
      chefSpecials: true
    }
  },
  
  salon: {
    id: 'salon',
    name: 'Salon & Spa',
    category: 'Beauty & Wellness',
    icon: '💇',
    color: '#a855f7',
    description: 'Luxury salon website with booking, galleries, and team profiles',
    
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: true,
      bookingWidget: true,
      teamProfiles: true,
      gallery: true,
      filterableGallery: true,
      beforeAfterGallery: true,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: true,
      orderManagement: false,
      packages: true,
      featuredServices: true,
      privateEvents: true
    }
  },
  
  gym: {
    id: 'gym',
    name: 'Gym & Fitness',
    category: 'Fitness & Health',
    icon: '💪',
    color: '#dc2626',
    description: 'Fitness center website with memberships, schedules, and transformation stories',
    
    uses: {
      heroSection: true,
      menuDisplay: false,
      membershipTiers: true,
      bookingWidget: true,
      teamProfiles: true,
      gallery: true,
      filterableGallery: true,
      beforeAfterGallery: true,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: true,
      subscriptionDisplay: true,
      classSchedule: true
    }
  },
  
  consultant: {
    id: 'consultant',
    name: 'Business Consultant',
    category: 'Professional Services',
    icon: '💼',
    color: '#1e40af',
    description: 'Professional consulting website with services, case studies, and booking',
    
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: true,
      bookingWidget: true,
      teamProfiles: true,
      gallery: false,
      filterableGallery: false,
      beforeAfterGallery: false,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: true,
      caseStudies: true,
      process: true
    }
  },
  
  freelancer: {
    id: 'freelancer',
    name: 'Freelancer Portfolio',
    category: 'Professional Services',
    icon: '👔',
    color: '#0ea5e9',
    description: 'Portfolio website with project showcase, skills, and hiring options',
    
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: false,
      bookingWidget: true,
      teamProfiles: false,
      gallery: true,
      filterableGallery: true,
      beforeAfterGallery: false,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: true,
      portfolio: true,
      process: true
    }
  },
  
  cleaning: {
    id: 'cleaning',
    name: 'Cleaning Service',
    category: 'Home Services',
    icon: '🧹',
    color: '#0891b2',
    description: 'Cleaning service website with packages, booking, and before/after gallery',
    
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: true,
      bookingWidget: true,
      teamProfiles: true,
      gallery: true,
      filterableGallery: true,
      beforeAfterGallery: true,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: true,
      packages: true,
      serviceArea: true
    }
  },
  
  electrician: {
    id: 'electrician',
    name: 'Electrician',
    category: 'Home Services',
    icon: '⚡',
    color: '#f59e0b',
    description: 'Electrical services website with emergency service, certifications, and booking',
    
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: true,
      bookingWidget: true,
      teamProfiles: true,
      gallery: false,
      filterableGallery: false,
      beforeAfterGallery: false,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: true,
      emergency247: true,
      certifications: true,
      serviceArea: true
    }
  },
  
  plumbing: {
    id: 'plumbing',
    name: 'Plumbing',
    category: 'Home Services',
    icon: '🔧',
    color: '#3b82f6',
    description: 'Plumbing services website with emergency service, memberships, and booking',
    
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: true,
      bookingWidget: true,
      teamProfiles: true,
      gallery: false,
      filterableGallery: false,
      beforeAfterGallery: false,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: true,
      emergency247: true,
      membershipPlans: true,
      serviceArea: true
    }
  },
  
  'auto-repair': {
    id: 'auto-repair',
    name: 'Auto Repair',
    category: 'Automotive',
    icon: '🚗',
    color: '#ef4444',
    description: 'Auto repair shop website with services, specials, and ASE-certified team',
    
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: true,
      bookingWidget: true,
      teamProfiles: true,
      gallery: true,
      filterableGallery: false,
      beforeAfterGallery: true,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: true,
      servicePackages: true,
      currentSpecials: true,
      warranty: true
    }
  },
  
  'pet-care': {
    id: 'pet-care',
    name: 'Pet Care',
    category: 'Pet Services',
    icon: '🐾',
    color: '#7c3aed',
    description: 'Pet grooming website with services, gallery, and groomer profiles',
    
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: true,
      bookingWidget: true,
      teamProfiles: true,
      gallery: true,
      filterableGallery: true,
      beforeAfterGallery: true,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: true,
      addOns: true,
      process: true
    }
  },
  
  'tech-repair': {
    id: 'tech-repair',
    name: 'Tech Repair',
    category: 'Technology',
    icon: '💻',
    color: '#059669',
    description: 'Tech repair website with device categories, warranty info, and repair tracking',
    
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: true,
      bookingWidget: true,
      teamProfiles: true,
      gallery: true,
      filterableGallery: false,
      beforeAfterGallery: true,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: true,
      warranty: true,
      process: true,
      deviceCategories: true
    }
  },
  
  'product-showcase': {
    id: 'product-showcase',
    name: 'Product Showcase',
    category: 'Retail',
    icon: '🛍️',
    color: '#f97316',
    description: 'E-commerce website with product catalog, collections, and artisan profiles',
    
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: true,
      bookingWidget: false,
      teamProfiles: false,
      gallery: true,
      filterableGallery: true,
      beforeAfterGallery: false,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: true,
      orderManagement: true,
      collections: true,
      artisanProfiles: true,
      featuredProducts: true,
      process: true
    }
  },

  'tow-truck': {
    id: 'tow-truck',
    name: 'Tow Truck',
    category: 'Transportation',
    icon: '🚛',
    color: '#f97316',
    description: '24/7 towing and roadside assistance',
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: false,
      bookingWidget: true,
      teamProfiles: true,
      gallery: true,
      filterableGallery: false,
      beforeAfterGallery: false,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: true,
      stripeCheckout: false,
      serviceArea: true,
      emergency247: true
    }
  },

  'product-ordering': {
    id: 'product-ordering',
    name: 'Product Ordering',
    category: 'Retail',
    icon: '📦',
    color: '#3b82f6',
    description: 'Product catalog with ordering and checkout on Growth',
    uses: {
      heroSection: true,
      menuDisplay: true,
      tabbedNavigation: true,
      bookingWidget: false,
      teamProfiles: false,
      gallery: true,
      filterableGallery: true,
      beforeAfterGallery: false,
      testimonials: true,
      faq: true,
      stats: true,
      credentials: false,
      stripeCheckout: true,
      orderManagement: true,
      collections: true,
      featuredProducts: true
    }
  }
};

/**
 * Feature to tier mapping
 * Defines which tier is required to access each template feature
 */
export const FEATURE_TIER_REQUIREMENTS = {
  // Starter tier features (available to all)
  heroSection: 'starter',
  menuDisplay: 'starter',
  gallery: 'starter',
  testimonials: 'starter',
  faq: 'starter',
  stats: 'starter',
  credentials: 'starter',
  contact: 'starter',
  
  // Growth tier features
  tabbedNavigation: 'growth',
  bookingWidget: 'growth',
  teamProfiles: 'growth',
  filterableGallery: 'growth',
  beforeAfterGallery: 'growth',
  process: 'growth',
  serviceArea: 'growth',
  classSchedule: 'growth',
  packages: 'growth',
  membershipPlans: 'growth',
  
  // Growth tier features (booking + commerce)
  stripeCheckout: 'growth',
  orderManagement: 'growth',
  subscriptionDisplay: 'growth',
  collections: 'growth',
  featuredProducts: 'growth',
  privateEvents: 'growth',
  caseStudies: 'growth',
  artisanProfiles: 'growth',
  
  // Features available to all (no gating)
  emergency247: 'starter',
  certifications: 'starter',
  warranty: 'starter',
  deviceCategories: 'starter',
  addOns: 'starter',
  chefSpecials: 'starter',
  membershipTiers: 'starter',
  currentSpecials: 'starter',
  servicePackages: 'starter',
  portfolio: 'starter',
  featuredServices: 'starter'
};

/**
 * Check if a feature requires a higher tier
 * @param {string} feature - Feature key
 * @param {string} userTier - User's current tier
 * @returns {boolean} - True if user has access
 */
export function hasTemplateFeatureAccess(feature, userTier) {
  const tierHierarchy = ['free', 'trial', 'starter', 'growth'];
  const aliases = { free: 'trial', pro: 'growth', premium: 'growth', enterprise: 'growth', business: 'growth' };
  const normalizedUser = aliases[userTier?.toLowerCase()] || userTier?.toLowerCase() || 'trial';
  const requiredTier = FEATURE_TIER_REQUIREMENTS[feature] || 'starter';
  const normalizedRequired = aliases[requiredTier] || requiredTier;
  const userIndex = tierHierarchy.indexOf(normalizedUser);
  const requiredIndex = tierHierarchy.indexOf(normalizedRequired);
  if (userIndex === -1) return false;
  if (requiredIndex === -1) return true;
  return userIndex >= requiredIndex;
}

/**
 * Get upgrade tier needed for a feature
 * @param {string} feature - Feature key
 * @returns {string} - Required tier name
 */
export function getRequiredTierForFeature(feature) {
  return FEATURE_TIER_REQUIREMENTS[feature] || 'starter';
}

/**
 * Get all templates
 * @returns {Array} - Array of template configurations
 */
export function getAllTemplates() {
  return Object.values(TEMPLATE_FEATURES);
}

/**
 * Get template by ID
 * @param {string} templateId - Template ID
 * @returns {Object|null} - Template configuration or null
 */
export function getTemplateById(templateId) {
  return TEMPLATE_FEATURES[templateId] || null;
}

/**
 * Get templates by category
 * @param {string} category - Category name
 * @returns {Array} - Templates in that category
 */
export function getTemplatesByCategory(category) {
  return Object.values(TEMPLATE_FEATURES).filter(t => t.category === category);
}

/**
 * Get all categories
 * @returns {Array} - Unique category names
 */
export function getAllCategories() {
  const categories = new Set(Object.values(TEMPLATE_FEATURES).map(t => t.category));
  return Array.from(categories);
}

/**
 * Get gated features for a template based on user tier
 * @param {string} templateId - Template ID
 * @param {string} userTier - User's tier
 * @returns {Object} - Object with available and locked features
 */
export function getTemplateFeatureAccess(templateId, userTier) {
  const template = TEMPLATE_FEATURES[templateId];
  if (!template) return { available: [], locked: [] };
  
  const available = [];
  const locked = [];
  
  for (const [feature, isUsed] of Object.entries(template.uses)) {
    if (!isUsed) continue;
    
    if (hasTemplateFeatureAccess(feature, userTier)) {
      available.push(feature);
    } else {
      locked.push({
        feature,
        requiredTier: getRequiredTierForFeature(feature)
      });
    }
  }
  
  return { available, locked };
}

export default TEMPLATE_FEATURES;

