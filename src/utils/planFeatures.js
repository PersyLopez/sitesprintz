/**
 * Plan Features and Tier Gating Utility
 * Defines what features are available for each plan tier
 */

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
  
  // Pro features
  STRIPE_CHECKOUT: 'stripe_checkout',
  SHOPPING_CART: 'shopping_cart',
  ORDER_MANAGEMENT: 'order_management',
  EMBEDDED_BOOKING: 'embedded_booking',
  RECURRING_PRICING: 'recurring_pricing',
  SALES_ANALYTICS: 'sales_analytics',
  PRODUCT_MANAGEMENT: 'product_management',
  
  // Premium features
  LIVE_CHAT: 'live_chat',
  ADVANCED_BOOKING: 'advanced_booking',
  EMAIL_AUTOMATION: 'email_automation',
  CRM_INTEGRATION: 'crm_integration',
  MULTI_LOCATION: 'multi_location',
  CUSTOM_DOMAIN: 'custom_domain',
  AB_TESTING: 'ab_testing',
  BLOG_CMS: 'blog_cms'
};

// Plan feature mapping
const FREE_FEATURES = [
  FEATURES.CONTACT_FORMS,
  FEATURES.SERVICE_DISPLAY,
  FEATURES.BASIC_BOOKING_LINK,
  FEATURES.IMAGE_GALLERY
];

const STARTER_FEATURES = [
  ...FREE_FEATURES,
  FEATURES.STAFF_PROFILES,
  FEATURES.FAQ_SECTION,
  FEATURES.FILTERS,
  FEATURES.BEFORE_AFTER_GALLERY
];

const PRO_FEATURES = [
  ...STARTER_FEATURES,
  FEATURES.STRIPE_CHECKOUT,
  FEATURES.SHOPPING_CART,
  FEATURES.ORDER_MANAGEMENT,
  FEATURES.EMBEDDED_BOOKING,
  FEATURES.RECURRING_PRICING,
  FEATURES.SALES_ANALYTICS,
  FEATURES.PRODUCT_MANAGEMENT
];

const PREMIUM_FEATURES = [
  ...PRO_FEATURES,
  FEATURES.LIVE_CHAT,
  FEATURES.ADVANCED_BOOKING,
  FEATURES.EMAIL_AUTOMATION,
  FEATURES.CRM_INTEGRATION,
  FEATURES.MULTI_LOCATION,
  FEATURES.CUSTOM_DOMAIN,
  FEATURES.AB_TESTING,
  FEATURES.BLOG_CMS
];

export const PLAN_FEATURES = {
  free: FREE_FEATURES,
  starter: STARTER_FEATURES,
  pro: PRO_FEATURES,
  premium: PREMIUM_FEATURES
};

// Plan metadata
export const PLAN_INFO = {
  free: {
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
    description: 'Perfect for service businesses',
    ctaText: 'Upgrade to Starter'
  },
  
  pro: {
    name: 'Pro',
    price: 25,
    duration: 'month',
    color: '#06b6d4',
    description: 'Add e-commerce and payments',
    ctaText: 'Upgrade to Pro',
    popular: true
  },
  
  premium: {
    name: 'Premium',
    price: 49,
    duration: 'month',
    color: '#8b5cf6',
    description: 'Full automation and advanced tools',
    ctaText: 'Upgrade to Premium'
  }
};

// Check if user has access to a feature
export function hasFeature(userPlan, feature) {
  const plan = userPlan?.toLowerCase() || 'free';
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
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
  for (const [plan, features] of Object.entries(PLAN_FEATURES)) {
    if (features.includes(feature)) {
      return plan;
    }
  }
  return 'premium'; // Default to highest tier if not found
}

// Get list of features for a plan
export function getPlanFeatures(plan) {
  const planKey = plan?.toLowerCase() || 'free';
  return PLAN_FEATURES[planKey] || PLAN_FEATURES.free;
}

// Get plan info
export function getPlanInfo(plan) {
  const planKey = plan?.toLowerCase() || 'free';
  return PLAN_INFO[planKey] || PLAN_INFO.free;
}

// Check if plan A is higher than plan B
export function isPlanHigherThan(planA, planB) {
  const hierarchy = ['free', 'starter', 'pro', 'premium'];
  const indexA = hierarchy.indexOf(planA?.toLowerCase());
  const indexB = hierarchy.indexOf(planB?.toLowerCase());
  return indexA > indexB;
}

// Get upgrade options for current plan
export function getUpgradeOptions(currentPlan) {
  const hierarchy = ['free', 'starter', 'pro', 'premium'];
  const currentIndex = hierarchy.indexOf(currentPlan?.toLowerCase());
  
  if (currentIndex === -1 || currentIndex >= hierarchy.length - 1) {
    return []; // Already at highest tier or invalid plan
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
  [FEATURES.RECURRING_PRICING]: 'Subscription/Recurring Pricing',
  [FEATURES.SALES_ANALYTICS]: 'Sales Analytics',
  [FEATURES.PRODUCT_MANAGEMENT]: 'Product Management',
  [FEATURES.LIVE_CHAT]: 'Live Chat Widget',
  [FEATURES.ADVANCED_BOOKING]: 'Advanced Booking System',
  [FEATURES.EMAIL_AUTOMATION]: 'Email Automation',
  [FEATURES.CRM_INTEGRATION]: 'CRM Integration',
  [FEATURES.MULTI_LOCATION]: 'Multi-Location Support',
  [FEATURES.CUSTOM_DOMAIN]: 'Custom Domain',
  [FEATURES.AB_TESTING]: 'A/B Testing',
  [FEATURES.BLOG_CMS]: 'Blog & CMS'
};

