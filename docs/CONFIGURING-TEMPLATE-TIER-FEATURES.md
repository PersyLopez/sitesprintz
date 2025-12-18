# ⚙️ Configuring Template Tier Features

**Date:** December 2025  
**Status:** Complete Configuration Guide

---

## 🎯 Overview

Configuring what features each template tier can access is **very easy** - everything is centralized in a single configuration file. This guide shows you exactly how to modify tier permissions.

---

## 📍 Where Features Are Configured

### **Single Source of Truth**

All feature permissions are defined in **one file**:

**`src/utils/planFeatures.js`**

This is the **only file** you need to edit to change what each tier can do.

---

## 🔧 How It Works

### Step 1: Define Features

Features are defined as constants:

```javascript
export const FEATURES = {
  // Starter features
  CONTACT_FORMS: 'contact_forms',
  SERVICE_DISPLAY: 'service_display',
  BASIC_BOOKING_LINK: 'basic_booking_link',
  
  // Pro features
  STRIPE_CHECKOUT: 'stripe_checkout',
  SHOPPING_CART: 'shopping_cart',
  ORDER_MANAGEMENT: 'order_management',
  
  // Premium features
  LIVE_CHAT: 'live_chat',
  ADVANCED_BOOKING: 'advanced_booking',
  EMAIL_AUTOMATION: 'email_automation',
  // ... etc
};
```

### Step 2: Assign Features to Plans

Features are assigned to plans in `PLAN_FEATURES`:

```javascript
export const PLAN_FEATURES = {
  free: [
    FEATURES.CONTACT_FORMS,
    FEATURES.SERVICE_DISPLAY,
    FEATURES.BASIC_BOOKING_LINK,
    FEATURES.IMAGE_GALLERY
  ],
  
  starter: [
    FEATURES.CONTACT_FORMS,
    FEATURES.SERVICE_DISPLAY,
    FEATURES.BASIC_BOOKING_LINK,
    FEATURES.IMAGE_GALLERY,
    FEATURES.STAFF_PROFILES,
    FEATURES.FAQ_SECTION,
    FEATURES.FILTERS,
    FEATURES.BEFORE_AFTER_GALLERY
  ],
  
  pro: [
    ...PLAN_FEATURES.starter,  // Inherit all starter features
    FEATURES.STRIPE_CHECKOUT,
    FEATURES.SHOPPING_CART,
    FEATURES.ORDER_MANAGEMENT,
    FEATURES.EMBEDDED_BOOKING,
    FEATURES.RECURRING_PRICING,
    FEATURES.SALES_ANALYTICS,
    FEATURES.PRODUCT_MANAGEMENT
  ],
  
  premium: [
    ...PLAN_FEATURES.pro,  // Inherit all pro features
    FEATURES.LIVE_CHAT,
    FEATURES.ADVANCED_BOOKING,
    FEATURES.EMAIL_AUTOMATION,
    FEATURES.CRM_INTEGRATION,
    FEATURES.MULTI_LOCATION,
    FEATURES.CUSTOM_DOMAIN,
    FEATURES.AB_TESTING,
    FEATURES.BLOG_CMS
  ]
};
```

### Step 3: Use in Components

Components check features using the `hasFeature()` function:

```javascript
import { hasFeature } from '../utils/planFeatures';

function MyComponent() {
  const { plan } = usePlan();
  
  // Check if user has access to a feature
  if (hasFeature(plan, FEATURES.STRIPE_CHECKOUT)) {
    // Show Stripe checkout UI
  } else {
    // Show upgrade prompt
  }
}
```

---

## ✏️ How to Change Feature Permissions

### Example 1: Move a Feature to a Lower Tier

**Scenario:** You want to allow Starter users to have Shopping Cart (currently Pro-only)

**Change in `planFeatures.js`:**

```javascript
// BEFORE
starter: [
  FEATURES.CONTACT_FORMS,
  // ... other features
  // Shopping cart NOT included
],

pro: [
  ...PLAN_FEATURES.starter,
  FEATURES.STRIPE_CHECKOUT,
  FEATURES.SHOPPING_CART,  // Currently Pro-only
  // ...
]

// AFTER - Move shopping cart to Starter
starter: [
  FEATURES.CONTACT_FORMS,
  // ... other features
  FEATURES.SHOPPING_CART,  // ✅ Added to Starter
],

pro: [
  ...PLAN_FEATURES.starter,  // Automatically includes shopping cart
  FEATURES.STRIPE_CHECKOUT,
  // Shopping cart removed from here (inherited from Starter)
  // ...
]
```

**That's it!** The change automatically applies everywhere because:
- Pro inherits Starter features (`...PLAN_FEATURES.starter`)
- Premium inherits Pro features (`...PLAN_FEATURES.pro`)
- All components use `hasFeature()` which reads from this config

---

### Example 2: Add a New Feature

**Scenario:** You want to add a new "Video Gallery" feature for Premium users only

**Step 1:** Add feature constant:

```javascript
export const FEATURES = {
  // ... existing features
  VIDEO_GALLERY: 'video_gallery',  // ✅ New feature
};
```

**Step 2:** Add to Premium plan:

```javascript
premium: [
  ...PLAN_FEATURES.pro,
  FEATURES.LIVE_CHAT,
  // ... existing premium features
  FEATURES.VIDEO_GALLERY,  // ✅ Added here
]
```

**Step 3:** Use in component:

```javascript
import { hasFeature, FEATURES } from '../utils/planFeatures';

if (hasFeature(plan, FEATURES.VIDEO_GALLERY)) {
  return <VideoGallery />;
}
```

**Done!** The feature is now Premium-only.

---

### Example 3: Remove a Feature from a Tier

**Scenario:** You want to remove Custom Domain from Premium (make it Enterprise-only)

**Change:**

```javascript
// BEFORE
premium: [
  ...PLAN_FEATURES.pro,
  FEATURES.CUSTOM_DOMAIN,  // Currently Premium
  // ...
]

// AFTER
premium: [
  ...PLAN_FEATURES.pro,
  // FEATURES.CUSTOM_DOMAIN removed
  // ...
]

// Add to Enterprise (if you have it)
enterprise: [
  ...PLAN_FEATURES.premium,
  FEATURES.CUSTOM_DOMAIN,  // Now Enterprise-only
]
```

---

### Example 4: Make a Feature Free

**Scenario:** You want to make FAQ Section available to Free tier

**Change:**

```javascript
// BEFORE
free: [
  FEATURES.CONTACT_FORMS,
  FEATURES.SERVICE_DISPLAY,
  // FAQ not included
],

starter: [
  FEATURES.FAQ_SECTION,  // Currently Starter-only
  // ...
]

// AFTER
free: [
  FEATURES.CONTACT_FORMS,
  FEATURES.SERVICE_DISPLAY,
  FEATURES.FAQ_SECTION,  // ✅ Added to Free
],

starter: [
  ...PLAN_FEATURES.free,  // Automatically includes FAQ
  // FAQ removed from here (inherited from Free)
  // ...
]
```

---

## 🎨 Feature Inheritance System

The system uses **inheritance** - higher tiers automatically get all features from lower tiers:

```
Free Features
    ↓
Starter Features (includes all Free)
    ↓
Pro Features (includes all Starter, which includes all Free)
    ↓
Premium Features (includes all Pro, which includes all Starter, which includes all Free)
```

**This means:**
- ✅ You only define features once per tier
- ✅ Higher tiers automatically get lower-tier features
- ✅ No need to duplicate feature lists
- ✅ Changes cascade automatically

---

## 🔍 How Components Check Features

### Method 1: Using `hasFeature()` Function

```javascript
import { hasFeature, FEATURES } from '../utils/planFeatures';
import { usePlan } from '../hooks/usePlan';

function ProductsEditor() {
  const { plan } = usePlan();
  
  // Check if user can access products
  if (!hasFeature(plan, FEATURES.PRODUCT_MANAGEMENT)) {
    return <UpgradePrompt feature="Product Management" />;
  }
  
  return <ProductsEditorUI />;
}
```

### Method 2: Using `usePlan()` Hook

```javascript
import { usePlan } from '../hooks/usePlan';

function BookingWidget() {
  const { isPro, isPremium } = usePlan();
  
  // Show different UI based on plan
  if (isPremium) {
    return <AdvancedBookingWidget />;
  } else if (isPro) {
    return <BasicBookingWidget />;
  } else {
    return <UpgradePrompt />;
  }
}
```

### Method 3: Direct Plan Check

```javascript
const { user } = useAuth();
const isPro = user?.plan === 'pro' || user?.plan === 'business';

if (isPro) {
  // Show Pro features
}
```

---

## 📋 Complete Configuration Checklist

To change what a tier can do:

- [ ] Open `src/utils/planFeatures.js`
- [ ] Find the `PLAN_FEATURES` object
- [ ] Locate the tier you want to modify (free, starter, pro, premium)
- [ ] Add/remove features from the array
- [ ] Save the file
- [ ] Changes apply immediately (no restart needed)

**That's it!** No other files need to be changed.

---

## 🎯 Common Configuration Tasks

### Task: Make Shopping Cart Available to Starter Users

**File:** `src/utils/planFeatures.js`

**Change:**
```javascript
starter: [
  // ... existing features
  FEATURES.SHOPPING_CART,  // Add this line
],
```

**Result:** Starter users can now use shopping cart (but still can't process payments without Pro)

---

### Task: Remove Live Chat from Premium

**File:** `src/utils/planFeatures.js`

**Change:**
```javascript
premium: [
  ...PLAN_FEATURES.pro,
  // FEATURES.LIVE_CHAT,  // Remove or comment out this line
  FEATURES.ADVANCED_BOOKING,
  // ... rest of features
],
```

**Result:** Premium users no longer have access to live chat

---

### Task: Add New "Social Media Feed" Feature for Pro+

**File:** `src/utils/planFeatures.js`

**Step 1:** Add feature constant:
```javascript
export const FEATURES = {
  // ... existing
  SOCIAL_MEDIA_FEED: 'social_media_feed',
};
```

**Step 2:** Add to Pro:
```javascript
pro: [
  ...PLAN_FEATURES.starter,
  // ... existing pro features
  FEATURES.SOCIAL_MEDIA_FEED,  // Add here
],
```

**Result:** Pro and Premium users can now use social media feed

---

## 🚨 Important Notes

### 1. Feature Inheritance

Remember that higher tiers **inherit** lower-tier features:

```javascript
pro: [
  ...PLAN_FEATURES.starter,  // Gets all Starter features automatically
  FEATURES.STRIPE_CHECKOUT,  // Plus Pro-specific features
]
```

**Don't duplicate features** - let inheritance handle it.

---

### 2. Backend Validation

**Frontend gating** (in `planFeatures.js`) is for UI/UX only.

**Backend validation** should also check permissions:

```javascript
// server/routes/products.routes.js
router.post('/products', requireAuth, async (req, res) => {
  const user = req.user;
  
  // Check if user has Pro plan
  if (user.plan !== 'pro' && user.plan !== 'premium') {
    return res.status(403).json({ 
      error: 'Pro plan required for product management' 
    });
  }
  
  // ... create product
});
```

**Always validate on backend** - frontend checks can be bypassed.

---

### 3. Template-Specific Features

Some features are **template-specific**, not plan-specific:

- Pro templates might have enhanced UI/UX
- Premium templates might be multi-page
- But payment processing is plan-based, not template-based

**Configuration:** Template tiers are defined in:
- `src/config/pricing.config.js` - Pricing and template lists
- `server/services/subscriptionService.js` - Template access limits

---

## 📊 Current Feature Distribution

### Free Tier (4 features)
- Contact Forms
- Service Display
- Basic Booking Link
- Image Gallery

### Starter Tier (8 features)
- All Free features +
- Staff Profiles
- FAQ Section
- Filters
- Before/After Gallery

### Pro Tier (15 features)
- All Starter features +
- Stripe Checkout
- Shopping Cart
- Order Management
- Embedded Booking
- Recurring Pricing
- Sales Analytics
- Product Management

### Premium Tier (23 features)
- All Pro features +
- Live Chat
- Advanced Booking
- Email Automation
- CRM Integration
- Multi-Location
- Custom Domain
- A/B Testing
- Blog/CMS

---

## 🛠️ Advanced Configuration

### Custom Feature Checks

You can create custom feature checks:

```javascript
// Check if user has ANY of these features
import { hasAnyFeature } from '../utils/planFeatures';

if (hasAnyFeature(plan, [
  FEATURES.STRIPE_CHECKOUT,
  FEATURES.ADVANCED_BOOKING
])) {
  // User has at least one
}

// Check if user has ALL of these features
import { hasAllFeatures } from '../utils/planFeatures';

if (hasAllFeatures(plan, [
  FEATURES.STRIPE_CHECKOUT,
  FEATURES.ORDER_MANAGEMENT
])) {
  // User has both
}
```

### Get Required Plan for Feature

```javascript
import { getRequiredPlan } from '../utils/planFeatures';

const requiredPlan = getRequiredPlan(FEATURES.STRIPE_CHECKOUT);
// Returns: 'pro'

// Use in upgrade prompts
<UpgradePrompt 
  message={`${requiredPlan} plan required`}
  requiredPlan={requiredPlan}
/>
```

---

## ✅ Summary

**Configuring template tier features is VERY EASY:**

1. ✅ **Single file** to edit: `src/utils/planFeatures.js`
2. ✅ **Simple array** manipulation (add/remove features)
3. ✅ **Automatic inheritance** (higher tiers get lower-tier features)
4. ✅ **No code changes needed** in components (they use `hasFeature()`)
5. ✅ **Changes apply immediately** (no restart required)

**Time to change:** ~30 seconds per feature

**Complexity:** Very Low - just editing arrays

**Risk:** Low - centralized configuration makes it easy to test and verify

---

**Last Updated:** December 2025  
**Configuration File:** `src/utils/planFeatures.js`





