# 💎 Pro Template Features - Implementation Plan

## Date: January 2025
## Status: Implementation Ready

---

## 🎯 **Overview**

Pro tier templates add **e-commerce and enhanced user experience** features on top of Starter templates.

**Pro Price:** $25/month  
**Philosophy:** "Everything in Starter + Online Sales & Better UX"

---

## ✅ **PRO TIER FEATURES (10 Total)**

### **Includes: Everything in Starter (6 features)**
1. ✅ Service/Product Filters
2. ✅ Basic Booking Widget (external link - Calendly)
3. ✅ Before/After Gallery
4. ✅ Staff Profiles (basic)
5. ✅ FAQ Accordion
6. ✅ Contact Forms (basic)

### **Adds: Pro-Exclusive Features (4 features)**

#### 1. **Stripe Checkout Integration** 🛒
**Status:** Needs Implementation

**What it enables:**
- Full payment processing
- Accept credit cards, Apple Pay, Google Pay
- Secure checkout flow
- PCI compliant

**Components to Create:**
- `ProductCard.jsx` (with "Add to Cart" button)
- `ShoppingCart.jsx` (cart sidebar/modal)
- `CheckoutButton.jsx` (Stripe integration)
- `PaymentModal.jsx` (checkout flow)

**Editor Sections:**
- Products tab (add/edit products with pricing)
- Payment settings (Stripe keys, tax config)

---

#### 2. **Order Management Dashboard** ✅
**Status:** Already Implemented (verify Pro features)

**Existing:**
- `/orders` page ✅
- Order list with filters ✅
- Order status updates ✅
- CSV export ✅

**Verify:**
- [ ] Only accessible to Pro users
- [ ] Upgrade prompt for Starter users
- [ ] Order tracking for customers

---

#### 3. **Embedded Booking Widget (Advanced)** 📅
**Status:** Needs Enhancement

**Starter has:** External link only (opens new tab)  
**Pro has:** Embedded inline booking (stays on site)

**Providers to Support:**
- Calendly (inline embed)
- Acuity Scheduling
- Square Appointments
- Cal.com
- Crisp Chat Booking

**Components to Create:**
- `BookingWidget.jsx` (embedded iframe/script)
- `BookingConfig.jsx` (editor for booking settings)

**Editor Section:**
- Booking tab with provider selection
- Inline vs popup style
- Custom styling options

---

#### 4. **Subscription/Recurring Pricing Display** 🔁
**Status:** Needs Implementation

**What it displays:**
- "per month" / "per week" pricing
- Subscription tier comparison
- Recurring payment UI components

**Use Cases:**
- Gym memberships (monthly/yearly)
- Service subscriptions (weekly cleaning)
- Meal plans (weekly delivery)
- Coaching packages (monthly)

**Components to Create:**
- `PricingCard.jsx` (subscription display)
- `PricingTiers.jsx` (comparison table)
- `RecurringBadge.jsx` (visual indicator)

---

## 🛠️ **Implementation Phases**

### **Phase 1: E-Commerce Foundation** 🛒
**Priority:** High  
**Duration:** 4-6 hours

**Tasks:**
1. Create Product Management System
   - ProductCard component (display product)
   - Shopping Cart component (cart sidebar)
   - Cart Context (global cart state)
   
2. Stripe Integration
   - CheckoutButton component
   - Stripe API integration
   - Webhook handler (backend)
   
3. Editor Enhancements
   - Products tab in EditorPanel
   - Add/edit product form
   - Price and inventory management
   
4. Payment Settings
   - Stripe keys configuration
   - Tax settings
   - Shipping options

**Deliverables:**
- ✅ Functioning shopping cart
- ✅ Stripe checkout flow
- ✅ Product editor
- ✅ Payment configuration

---

### **Phase 2: Booking Enhancement** 📅
**Priority:** Medium  
**Duration:** 2-3 hours

**Tasks:**
1. Booking Widget Component
   - Embedded iframe support
   - Script loading (Calendly, Acuity)
   - Inline vs popup modes
   
2. Editor Section
   - Booking configuration tab
   - Provider selection
   - Style customization
   
3. Live Preview
   - Show booking widget in preview
   - Test different providers

**Deliverables:**
- ✅ Embedded booking widgets
- ✅ Multiple provider support
- ✅ Booking editor section

---

### **Phase 3: Recurring/Subscription Display** 🔁
**Priority:** Medium  
**Duration:** 2-3 hours

**Tasks:**
1. Pricing Components
   - Subscription pricing cards
   - Comparison tables
   - Recurring badges
   
2. Editor Integration
   - Add recurring pricing fields
   - Billing period selection
   - Discount display
   
3. Visual Design
   - Professional pricing tables
   - Clear value proposition
   - Call-to-action buttons

**Deliverables:**
- ✅ Subscription pricing display
- ✅ Comparison tables
- ✅ Recurring payment UI

---

### **Phase 4: Plan Gating & Upgrades** 🔒
**Priority:** High  
**Duration:** 2-3 hours

**Tasks:**
1. Feature Gating
   - Check user plan tier
   - Disable Pro features for Starter users
   - Show upgrade prompts
   
2. Upgrade Flow
   - "Upgrade to Pro" CTAs
   - Feature comparison modal
   - Seamless upgrade process
   
3. Template Differentiation
   - Mark Pro templates
   - Show feature requirements
   - Enable/disable based on plan

**Deliverables:**
- ✅ Plan-based feature access
- ✅ Upgrade prompts
- ✅ Tier-based template access

---

## 📋 **Component Architecture**

### **New Components Needed:**

```
src/
├── components/
│   ├── ecommerce/
│   │   ├── ProductCard.jsx
│   │   ├── ShoppingCart.jsx
│   │   ├── CartItem.jsx
│   │   ├── CheckoutButton.jsx
│   │   ├── PaymentModal.jsx
│   │   └── OrderConfirmation.jsx
│   │
│   ├── booking/
│   │   ├── BookingWidget.jsx
│   │   ├── BookingConfig.jsx (editor)
│   │   └── ProviderSelector.jsx
│   │
│   ├── pricing/
│   │   ├── PricingCard.jsx
│   │   ├── PricingTiers.jsx
│   │   ├── RecurringBadge.jsx
│   │   └── ComparisonTable.jsx
│   │
│   ├── setup/
│   │   ├── ProductsEditor.jsx (new tab)
│   │   ├── BookingEditor.jsx (new tab)
│   │   └── PaymentSettings.jsx (new tab)
│   │
│   └── upgrade/
│       ├── UpgradeModal.jsx
│       ├── FeatureLockedBanner.jsx
│       └── PlanComparison.jsx
│
├── context/
│   └── CartContext.jsx (new)
│
├── hooks/
│   ├── useCart.js (new)
│   ├── usePlan.js (new)
│   └── useStripe.js (new)
│
└── utils/
    ├── stripe.js (new)
    └── planFeatures.js (new)
```

---

## 🎨 **Editor Enhancements**

### **New Tabs in EditorPanel:**

1. **Products Tab** (Pro only)
   - Add/edit products
   - Set pricing (one-time or recurring)
   - Manage inventory
   - Upload product images
   - Product categories

2. **Booking Tab** (Pro only)
   - Select booking provider
   - Configure embed settings
   - Style customization
   - Test booking widget

3. **Payment Settings Tab** (Pro only)
   - Stripe API keys
   - Tax configuration
   - Shipping options
   - Currency settings
   - Payment methods (card, Apple Pay, etc.)

4. **Analytics Tab** (Pro users get enhanced)
   - Sales analytics
   - Revenue tracking
   - Top products
   - Conversion rates

---

## 🔐 **Plan Gating Strategy**

### **Feature Access Control:**

```javascript
const PLAN_FEATURES = {
  starter: [
    'contact_forms',
    'service_display',
    'basic_booking_link',
    'image_gallery',
    'staff_profiles',
    'faq_section'
  ],
  pro: [
    ...STARTER_FEATURES,
    'stripe_checkout',
    'shopping_cart',
    'order_management',
    'embedded_booking',
    'recurring_pricing',
    'sales_analytics'
  ],
  premium: [
    ...PRO_FEATURES,
    'live_chat',
    'advanced_booking',
    'email_automation',
    'crm_integration',
    'multi_location'
  ]
};

function hasFeature(userPlan, feature) {
  return PLAN_FEATURES[userPlan]?.includes(feature);
}
```

### **Upgrade Prompts:**

**Location:** When user tries to:
- Add products (Starter → Pro)
- Enable embedded booking (Starter → Pro)
- Access order dashboard (Starter → Pro)
- Set recurring pricing (Starter → Pro)

**Message Example:**
```
🔒 This is a Pro Feature

Unlock Stripe payments, shopping cart, and order management 
by upgrading to the Pro plan.

[View Features] [Upgrade to Pro →]
```

---

## 💰 **Monetization Integration**

### **Upgrade Flow:**
1. User clicks "Upgrade to Pro"
2. Show plan comparison modal
3. Stripe checkout (upgrade)
4. Update user plan in database
5. Unlock Pro features immediately
6. Send confirmation email

### **Pricing Display:**
- Starter: $10/month → FREE during migration
- Pro: $25/month → Focus tier
- Premium: $49/month → Future

---

## 🧪 **Testing Checklist**

### **E-Commerce:**
- [ ] Add product to cart
- [ ] Update cart quantities
- [ ] Remove from cart
- [ ] Checkout with Stripe (test mode)
- [ ] Order confirmation
- [ ] Order appears in dashboard
- [ ] Email notifications

### **Booking:**
- [ ] Calendly embed works
- [ ] Acuity embed works
- [ ] Inline vs popup modes
- [ ] Mobile responsive
- [ ] Booking loads correctly

### **Recurring Pricing:**
- [ ] Display monthly pricing
- [ ] Display yearly pricing
- [ ] Show savings percentage
- [ ] Comparison table
- [ ] Mobile responsive

### **Plan Gating:**
- [ ] Starter users see upgrade prompts
- [ ] Pro users access all features
- [ ] Feature locks work correctly
- [ ] Upgrade flow completes
- [ ] Plan updated in database

---

## 📊 **Success Metrics**

### **Technical:**
- [ ] Zero console errors
- [ ] All components render correctly
- [ ] Stripe integration secure
- [ ] Booking widgets load < 2s
- [ ] Mobile responsive (100%)

### **User Experience:**
- [ ] Cart UX smooth
- [ ] Checkout completes < 1 minute
- [ ] Booking embed seamless
- [ ] Upgrade path clear
- [ ] Feature value obvious

### **Business:**
- [ ] Conversion to Pro: Target 20%+
- [ ] E-commerce setup: < 30 minutes
- [ ] Support tickets: < 5%
- [ ] User satisfaction: > 9/10

---

## 🚀 **Next Steps**

1. ✅ Create implementation plan (this document)
2. ⏳ Implement E-Commerce Foundation
3. ⏳ Add Booking Widget Enhancement
4. ⏳ Create Recurring Pricing Display
5. ⏳ Implement Plan Gating
6. ⏳ Testing and QA
7. ⏳ Documentation and tutorials

---

## 📝 **Notes**

- Keep Starter features working
- Ensure smooth upgrade path
- Clear value proposition for Pro
- Don't break existing sites
- Maintain backward compatibility

---

**Status:** Ready to implement Phase 1 (E-Commerce Foundation)  
**Next:** Create ProductCard, ShoppingCart, and Stripe integration

