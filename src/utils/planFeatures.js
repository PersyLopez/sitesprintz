/**
 * Plan Features and Tier Gating Utility
 * Defines what features are available for each plan tier
 * 
 * Now imports from src/config/tiers.js for single source of truth
 */

import { TIERS, TIER_HIERARCHY, normalizeTier, hasTierAccess } from '../config/tiers.js';

// Feature definitions
export const FEATURES = {
  // Starter features
  CONTACT_FORMS: 'contact_forms',
  SERVICE_DISPLAY: 'service_display',
  BASIC_BOOKING_LINK: 'basic_booking_link',
  IMAGE_GALLERY: 'image_gallery',
  STAFF_PROFILES: 'staff_profiles',
  FAQ_SECTION: 'faq_section',
  FILTERS: 'filters',
  BEFORE_AFTER_GALLERY: 'before_after_gallery',
  
  // Growth features
  EMBEDDED_BOOKING: 'embedded_booking',
  SERVICE_REQUEST_FORMS: 'service_request_forms',
  QUOTE_REQUESTS: 'quote_requests',
  BASIC_ANALYTICS: 'basic_analytics',
  ORDER_MANAGEMENT: 'order_management',
  PRODUCT_MANAGEMENT: 'product_management',
  
  // Pro features
  STRIPE_CHECKOUT: 'stripe_checkout',
  SHOPPING_CART: 'shopping_cart',
  RECURRING_PRICING: 'recurring_pricing',
  SALES_ANALYTICS: 'sales_analytics',
  CUSTOM_DOMAIN: 'custom_domain', // available on every plan
  REMOVE_BRANDING: 'remove_branding', // next paid tier; dashboard toggle, not Growth
  PRIORITY_SUPPORT: 'priority_support',
  
  // Premium features
  LIVE_CHAT: 'live_chat',
  ADVANCED_BOOKING: 'advanced_booking',
  EMAIL_AUTOMATION: 'email_automation',
  CRM_INTEGRATION: 'crm_integration',
  MULTI_LOCATION: 'multi_location',
  AB_TESTING: 'ab_testing',
  BLOG_CMS: 'blog_cms',
  
  // New niche gap features
  INTERACTIVE_CALCULATOR: 'interactive_calculator',
  CLASS_SCHEDULER: 'class_scheduler',
  SUBSCRIPTION_BOOKING: 'subscription_booking',
  DIAGNOSTIC_QUIZ: 'diagnostic_quiz',
  RESOURCE_CENTER: 'resource_center',
  VIDEO_GALLERY: 'video_gallery',
  ZIP_CHECKER: 'zip_checker',
  ENHANCED_PROFILES: 'enhanced_profiles',
  PROGRESS_TRACKER: 'progress_tracker'
};

// Plan feature mapping
// Note: "trial" and "free" are aliases - both refer to the 7-day free trial
const TRIAL_FEATURES = [
  FEATURES.CONTACT_FORMS,
  FEATURES.SERVICE_DISPLAY,
  FEATURES.BASIC_BOOKING_LINK,
  FEATURES.IMAGE_GALLERY,
  FEATURES.CUSTOM_DOMAIN
];

const STARTER_FEATURES = [
  ...TRIAL_FEATURES,
  FEATURES.STAFF_PROFILES,
  FEATURES.FAQ_SECTION,
  FEATURES.FILTERS,
  FEATURES.BEFORE_AFTER_GALLERY
];

const GROWTH_FEATURES = [
  ...STARTER_FEATURES,
  FEATURES.EMBEDDED_BOOKING,
  FEATURES.SERVICE_REQUEST_FORMS,
  FEATURES.QUOTE_REQUESTS,
  FEATURES.BASIC_ANALYTICS,
  FEATURES.ORDER_MANAGEMENT,
  FEATURES.PRODUCT_MANAGEMENT,
  FEATURES.STRIPE_CHECKOUT,
  FEATURES.SHOPPING_CART,
  FEATURES.RECURRING_PRICING,
  FEATURES.SALES_ANALYTICS,
  // Niche modules
  FEATURES.INTERACTIVE_CALCULATOR,
  FEATURES.CLASS_SCHEDULER,
  FEATURES.SUBSCRIPTION_BOOKING,
  FEATURES.DIAGNOSTIC_QUIZ,
  FEATURES.RESOURCE_CENTER,
  FEATURES.VIDEO_GALLERY,
  FEATURES.ZIP_CHECKER,
  FEATURES.ENHANCED_PROFILES,
  FEATURES.PROGRESS_TRACKER
];

export const PLAN_FEATURES = {
  [TIERS.TRIAL]: TRIAL_FEATURES,
  [TIERS.STARTER]: STARTER_FEATURES,
  [TIERS.GROWTH]: GROWTH_FEATURES
};

// Plan metadata (2 paid tiers)
export const PLAN_INFO = {
  trial: {
    name: 'Free Trial',
    price: 0,
    duration: '7 days',
    color: '#64748b'
  },
  starter: {
    name: 'Starter',
    price: 10,
    duration: 'month',
    color: '#22c55e',
    description: 'Get found — site, hours, contact',
    ctaText: 'Upgrade to Starter'
  },
  growth: {
    name: 'Growth',
    price: 35,
    duration: 'month',
    color: '#f59e0b',
    description: 'Bookings and checkout',
    ctaText: 'Upgrade to Growth',
    popular: true
  }
};

// Check if user has access to a feature
export function hasFeature(userPlan, feature) {
  const plan = normalizeTier(userPlan);
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES[TIERS.TRIAL];
  return features.includes(feature);
}

// Check if user has access to any of the listed features
export function hasAnyFeature(userPlan, featureList) {
  return featureList.some(feature => hasFeature(userPlan, feature));
}

// Check if user has access to all listed features
export function hasAllFeatures(userPlan, featureList) {
  return featureList.every(feature => hasFeature(userPlan, feature));
}

// Get minimum required plan for a feature
export function getRequiredPlan(feature) {
  for (const plan of TIER_HIERARCHY) {
    const features = PLAN_FEATURES[plan];
    if (features?.includes(feature)) {
      return plan;
    }
  }
  return TIERS.GROWTH;
}

// Get list of features for a plan
export function getPlanFeatures(plan) {
  const planKey = normalizeTier(plan);
  return PLAN_FEATURES[planKey] || PLAN_FEATURES[TIERS.TRIAL];
}

// Get plan info
export function getPlanInfo(plan) {
  const planKey = normalizeTier(plan);
  return PLAN_INFO[planKey] || PLAN_INFO.trial;
}

// Check if plan A is higher than plan B
export function isPlanHigherThan(planA, planB) {
  const hierarchy = TIER_HIERARCHY;
  const indexA = hierarchy.indexOf(normalizeTier(planA));
  const indexB = hierarchy.indexOf(normalizeTier(planB));
  return indexA > indexB;
}

// Get upgrade options for current plan
export function getUpgradeOptions(currentPlan) {
  const hierarchy = TIER_HIERARCHY;
  const currentIndex = hierarchy.indexOf(normalizeTier(currentPlan));

  if (currentIndex === -1 || currentIndex >= hierarchy.length - 1) {
    return [];
  }

  return hierarchy.slice(currentIndex + 1).map(plan => ({
    plan,
    info: PLAN_INFO[plan]
  }));
}

// Feature display names
export const FEATURE_NAMES = {
  [FEATURES.CONTACT_FORMS]: 'Contact Forms',
  [FEATURES.SERVICE_DISPLAY]: 'Service/Product Display',
  [FEATURES.BASIC_BOOKING_LINK]: 'Basic Booking Links',
  [FEATURES.IMAGE_GALLERY]: 'Image Gallery',
  [FEATURES.STAFF_PROFILES]: 'Staff Profiles',
  [FEATURES.FAQ_SECTION]: 'FAQ Section',
  [FEATURES.FILTERS]: 'Service/Product Filters',
  [FEATURES.BEFORE_AFTER_GALLERY]: 'Before/After Gallery',
  [FEATURES.STRIPE_CHECKOUT]: 'Stripe Payment Processing',
  [FEATURES.SHOPPING_CART]: 'Shopping Cart',
  [FEATURES.ORDER_MANAGEMENT]: 'Order Management Dashboard',
  [FEATURES.EMBEDDED_BOOKING]: 'Embedded Booking Widget',
  [FEATURES.SERVICE_REQUEST_FORMS]: 'Service Request Forms',
  [FEATURES.QUOTE_REQUESTS]: 'Quote Request System',
  [FEATURES.BASIC_ANALYTICS]: 'Basic Analytics',
  [FEATURES.RECURRING_PRICING]: 'Subscription/Recurring Pricing',
  [FEATURES.SALES_ANALYTICS]: 'Sales Analytics',
  [FEATURES.PRODUCT_MANAGEMENT]: 'Product Management',
  [FEATURES.LIVE_CHAT]: 'Live Chat Widget',
  [FEATURES.ADVANCED_BOOKING]: 'Advanced Booking System',
  [FEATURES.EMAIL_AUTOMATION]: 'Email Automation',
  [FEATURES.CRM_INTEGRATION]: 'CRM Integration',
  [FEATURES.MULTI_LOCATION]: 'Multi-Location Support',
  [FEATURES.CUSTOM_DOMAIN]: 'Custom Domain',
  [FEATURES.REMOVE_BRANDING]: 'Remove Branding',
  [FEATURES.PRIORITY_SUPPORT]: 'Priority Support',
  [FEATURES.AB_TESTING]: 'A/B Testing',
  [FEATURES.BLOG_CMS]: 'Blog & CMS',
  [FEATURES.INTERACTIVE_CALCULATOR]: 'Interactive Calculator',
  [FEATURES.CLASS_SCHEDULER]: 'Class Scheduler',
  [FEATURES.SUBSCRIPTION_BOOKING]: 'Subscription Booking',
  [FEATURES.DIAGNOSTIC_QUIZ]: 'Diagnostic Quiz',
  [FEATURES.RESOURCE_CENTER]: 'Resource Center',
  [FEATURES.VIDEO_GALLERY]: 'Video Gallery',
  [FEATURES.ZIP_CHECKER]: 'ZIP Code Checker',
  [FEATURES.ENHANCED_PROFILES]: 'Enhanced Profiles',
  [FEATURES.PROGRESS_TRACKER]: 'Progress Tracker'
};

