# Pro Template Standard

**Version:** 1.1  
**Last Updated:** November 14, 2025  
**Status:** ✅ All 12 Pro templates compliant  
**Payment:** ✅ Stripe Connect enabled on all templates

---

## Overview

This document defines the standard schema and requirements for all SiteSprintz Pro templates. Pro templates are designed for established businesses and include advanced features like booking, analytics, reviews, and owner dashboards.

**Current Pro Templates:** 12
- `restaurant-pro.json`
- `salon-pro.json`
- `gym-pro.json`
- `pet-care-pro.json`
- `auto-repair-pro.json`
- `tech-repair-pro.json`
- `plumbing-pro.json`
- `electrician-pro.json`
- `cleaning-pro.json`
- `consultant-pro.json`
- `freelancer-pro.json`
- `product-showcase-pro.json`

---

## Required Schema Structure

### 1. Top-Level Keys

Every Pro template MUST include these top-level keys:

```json
{
  "brand": { ... },
  "themeVars": { ... },
  "nav": [ ... ],
  "hero": { ... },
  "features": { ... }
}
```

### 2. Brand Object

```json
"brand": {
  "name": "Business Name",
  "logo": "assets/logo.svg",
  "tagline": "Business Tagline",
  "phone": "(555) 123-4567",
  "email": "contact@business.com"
}
```

**Required Fields:**
- `name` (string): Business name
- `logo` (string): Path to logo file
- `tagline` (string): Business tagline/slogan
- `phone` (string): Contact phone
- `email` (string): Contact email

### 3. Theme Variables

```json
"themeVars": {
  "color-primary": "#3b82f6",
  "color-accent": "#1e40af",
  "color-success": "#10b981",
  "color-warning": "#f59e0b",
  "color-danger": "#ef4444"
}
```

**Required Colors:**
- `color-primary`: Main brand color
- `color-accent`: Secondary brand color
- `color-success`: Success states
- `color-warning`: Warning states
- `color-danger`: Error/danger states

### 4. Navigation

```json
"nav": [
  {"label": "Home", "href": "#home"},
  {"label": "Services", "href": "#services"},
  {"label": "Contact", "href": "#contact"}
]
```

**Requirements:**
- Array of navigation items
- Each item must have `label` (string) and `href` (string)
- Minimum 3 items recommended

### 5. Hero Section

```json
"hero": {
  "eyebrow": "Premium Service",
  "title": "Welcome to Our Business",
  "subtitle": "Description of what we do",
  "cta": [
    {"label": "Book Now", "href": "#booking"},
    {"label": "Learn More", "href": "#about", "variant": "secondary"}
  ],
  "image": "https://example.com/hero.jpg",
  "imageAlt": "Hero image description"
}
```

**Required Fields:**
- `title` (string): Main heading
- `subtitle` (string): Supporting text
- `cta` (array): Call-to-action buttons (at least 1)
- `image` (string): Hero image URL
- `imageAlt` (string): Image alt text for accessibility

**Optional Fields:**
- `eyebrow` (string): Text above title

---

## Pro Features Configuration

### Required Features Object

All Pro templates MUST include this complete features configuration:

```json
"features": {
  "bookingWidget": {
    "enabled": false,
    "provider": "",
    "url": "",
    "embedMode": true
  },
  "reviews": {
    "enabled": false,
    "placeId": "",
    "maxReviews": 5,
    "showOverallRating": true
  },
  "ownerDashboard": true,
  "analytics": true
}
```

### Required Settings Object

All Pro templates MUST include this complete settings configuration:

```json
"settings": {
  "allowCheckout": true,
  "allowOrders": true,
  "stripeEnabled": true,
  "productCta": "Buy Now",
  "productNote": "Secure checkout powered by Stripe. Connect your account to start selling.",
  "bookingEnabled": true,
  "bookingWidget": "calendly",
  "tier": "Pro"
}
```

### Feature Details

#### 1. Booking Widget (REQUIRED)

```json
"bookingWidget": {
  "enabled": boolean,
  "provider": "calendly" | "acuity" | "square" | "",
  "url": string,
  "embedMode": true
}
```

**Fields:**
- `enabled` (boolean): Whether booking is active
- `provider` (string): Booking provider name
- `url` (string): Provider's booking URL
- `embedMode` (boolean): MUST be `true` for iframe embedding

**Supported Providers:**
- `"calendly"` - Calendly scheduling
- `"acuity"` - Acuity Scheduling
- `"square"` - Square Appointments

**Default State:** Disabled with empty values  
**Implementation:** Universal BookingWidget component (`public/modules/booking-widget.js`)

#### 2. Google Reviews (REQUIRED)

```json
"reviews": {
  "enabled": boolean,
  "placeId": string,
  "maxReviews": number,
  "showOverallRating": boolean
}
```

**Fields:**
- `enabled` (boolean): Whether reviews are shown
- `placeId` (string): Google Place ID for the business
- `maxReviews` (number): Number of reviews to display (3, 5, 10, or 15)
- `showOverallRating` (boolean): Show rating summary header

**Default State:** Disabled with empty placeId  
**Implementation:** ReviewsWidget component (`public/modules/reviews-widget.js`)

#### 3. Owner Dashboard (REQUIRED)

```json
"ownerDashboard": true
```

**Value:** MUST be `true` for all Pro templates

**Features:**
- Order management
- Revenue tracking
- Customer data
- Site settings

#### 4. Analytics (REQUIRED)

```json
"analytics": true
```

**Value:** MUST be `true` for all Pro templates

**Tracked Metrics:**
- Page views
- Unique visitors
- Orders and revenue
- Conversion rates
- Traffic sources
- Top pages

**Implementation:**
- Backend: `AnalyticsService` (`server/services/analyticsService.js`)
- Frontend: `AnalyticsTracker` (`public/modules/analytics-tracker.js`)
- Dashboard: `SiteAnalytics.jsx` (`src/pages/SiteAnalytics.jsx`)

---

## Payment Configuration (NEW in v1.1)

### Stripe Connect Integration (REQUIRED)

All Pro templates MUST support Stripe Connect for payment processing:

```json
"settings": {
  "allowCheckout": true,
  "allowOrders": true,
  "stripeEnabled": true,
  "productCta": "Buy Now",
  "productNote": "Connect your Stripe account to start selling."
}
```

#### Settings Fields:

**allowCheckout** (boolean): MUST be `true`
- Enables "Buy Now" buttons on products/services
- Allows customers to purchase directly

**allowOrders** (boolean): MUST be `true`
- Enables order processing
- Required for checkout functionality

**stripeEnabled** (boolean): MUST be `true`
- Indicates Stripe Connect is available
- Users connect via Dashboard > Payment Settings

**productCta** (string): Button text for purchases
- Examples: "Buy Now", "Order Now", "Purchase", "Hire Me"
- Should match business type

**productNote** (string): Payment explanation
- Tells users they need to connect Stripe
- Displayed in dashboard or setup

#### Template-Specific CTAs:

| Template | Recommended CTA |
|----------|----------------|
| restaurant-pro | "Order Now" |
| salon-pro | "Buy Now" |
| gym-pro | "Purchase" |
| pet-care-pro | "Buy Now" |
| auto-repair-pro | "Buy Now" |
| tech-repair-pro | "Buy Now" |
| plumbing-pro | "Buy Now" |
| electrician-pro | "Buy Now" |
| cleaning-pro | "Buy Now" |
| consultant-pro | "Purchase" |
| freelancer-pro | "Hire Me" |
| product-showcase-pro | "Buy Now" |

#### How Stripe Connect Works:

1. **User Level Configuration** (not template level):
   - Users connect their Stripe account via OAuth
   - Connection happens in Dashboard > Payment Settings
   - 30-second setup process

2. **Template Indicates Capability**:
   - Template has `allowCheckout: true`
   - Shows "Buy Now" buttons on products/services
   - If user hasn't connected Stripe, buttons show "Connect to enable"

3. **Payment Flow**:
   - Customer clicks "Buy Now"
   - Stripe Checkout opens (if connected)
   - Payment goes directly to user's Stripe account
   - No transaction fees from SiteSprintz (only Stripe's 2.9% + $0.30)

4. **Order Management**:
   - Orders appear in owner dashboard
   - Email confirmations sent automatically
   - Revenue tracked in analytics

#### Important Notes:

- ✅ **Stripe Connect is configured at USER level** (OAuth)
- ✅ **Templates indicate payment capability** via `allowCheckout`
- ✅ **No SiteSprintz transaction fees** - users keep 100% (minus Stripe fees)
- ✅ **Booking and checkout coexist** - both can be enabled simultaneously
- ✅ **Optional for users** - They can enable/disable checkout independently

#### Fallback Behavior:

If user hasn't connected Stripe:
- "Buy Now" buttons show "Contact for Purchase" or
- Display message: "Connect Stripe to enable checkout"
- Booking still works (independent system)
- Contact forms still work

---

## Optional Features

Pro templates MAY include additional features based on business type:

### Products/Menu

```json
"products": [ ... ]
"menu": {
  "sections": [ ... ]
}
```

For restaurants, cafes, retail businesses.

### Services

```json
"services": [ ... ]
```

For service-based businesses.

### Gallery

```json
"features": {
  "gallery": {
    "filterable": true,
    "categories": ["Category1", "Category2"]
  }
}
```

### Private Events

```json
"features": {
  "privateEvents": {
    "enabled": true,
    "modal": true
  }
}
```

### Testimonials

```json
"testimonials": [ ... ]
```

### Team Members

```json
"team": [ ... ]
```

---

## Compliance Validation

### Automated Validation Script

Run the audit script to validate all Pro templates:

```bash
node scripts/audit-pro-templates.js
```

**What it checks:**
✅ All required top-level keys present  
✅ `features.analytics === true`  
✅ `features.ownerDashboard === true`  
✅ `features.bookingWidget` object present with all keys  
✅ `features.bookingWidget.embedMode === true`  
✅ `features.reviews` object present with all keys  
✅ Valid JSON structure

**What it fixes automatically:**
- Missing `reviews` configuration
- Missing `bookingWidget.embedMode`
- Incorrect `analytics` or `ownerDashboard` values

**Output:**
- Console summary of audited templates
- `PRO-TEMPLATE-AUDIT-REPORT.json` - Detailed compliance report

---

## Best Practices

### 1. Feature Defaults

- Set `enabled: false` for features that require configuration (booking, reviews)
- Always include the complete schema even when disabled
- This allows users to easily enable features in the setup editor

### 2. Image URLs

- Use high-quality images (minimum 1200px width)
- Use Unsplash or similar for demo images
- Always include descriptive `imageAlt` text

### 3. Colors

- Ensure sufficient contrast for accessibility (WCAG AA)
- Test colors against both light and dark backgrounds
- Use semantic color names (`primary`, `accent`, not specific colors)

### 4. Content

- Use realistic, professional content
- Avoid placeholder text like "Lorem ipsum"
- Include complete examples for products/services/menus

### 5. CTAs (Call-to-Actions)

- Use action-oriented button text ("Book Now", "Get Started")
- Include at least one primary CTA in hero section
- Link to relevant sections or booking widget

---

## Template-Specific Guidelines

### Restaurant Templates
**Must Have:**
- Menu with multiple sections
- Booking widget configuration
- Gallery (food/ambiance)
- Private events feature

**Nice to Have:**
- Dietary indicators
- Chef's specials
- Wine/drink menu

### Service Templates (Salon, Gym, Pet Care, etc.)
**Must Have:**
- Services list with pricing
- Booking widget configuration
- Before/after gallery
- Team members

**Nice to Have:**
- Membership tiers
- Class schedules
- Package deals

### Professional Services (Consultant, Freelancer)
**Must Have:**
- Portfolio/case studies
- Booking widget configuration
- Testimonials
- Services/expertise areas

**Nice to Have:**
- Blog/articles
- Resources/downloads
- Speaking engagements

### Trade Services (Plumbing, Electrical, Auto Repair)
**Must Have:**
- Services with pricing ranges
- Emergency contact info
- Service areas
- Certifications/licenses

**Nice to Have:**
- 24/7 availability indicator
- Warranty information
- Before/after photos

---

## Migration Guide

### Updating Existing Templates

If you have an older Pro template:

1. **Run the audit script:**
   ```bash
   node scripts/audit-pro-templates.js
   ```

2. **Review the report:**
   Check `PRO-TEMPLATE-AUDIT-REPORT.json` for issues

3. **Manual fixes (if needed):**
   - Update any custom features not caught by auto-fix
   - Verify content quality
   - Test in the site editor

4. **Validation:**
   - Load template in setup editor
   - Verify all features render correctly
   - Test booking widget integration
   - Test reviews widget (if placeId provided)

---

## Testing Checklist

Before releasing a new or updated Pro template:

### Schema Validation
- [ ] Passes `audit-pro-features.js` script
- [ ] Passes `audit-stripe-config.js` script
- [ ] All required features present
- [ ] All required settings present
- [ ] Valid JSON structure
- [ ] No parse errors

### Feature Testing
- [ ] Analytics tracking initializes correctly
- [ ] Booking widget renders (if enabled)
- [ ] Reviews widget renders (if enabled and placeId provided)
- [ ] Owner dashboard accessible
- [ ] Stripe checkout configuration present
- [ ] "Buy Now" buttons appear on products/services
- [ ] All navigation links work
- [ ] CTAs link to correct sections

### Content Quality
- [ ] Professional, realistic content
- [ ] No placeholder text
- [ ] High-quality images
- [ ] Descriptive alt text
- [ ] Correct contact information format

### Accessibility
- [ ] Color contrast meets WCAG AA
- [ ] All images have alt text
- [ ] Semantic HTML structure
- [ ] Keyboard navigation works
- [ ] Screen reader friendly

### Mobile Responsive
- [ ] Looks good on mobile (320px+)
- [ ] Touch targets are adequate (44px+)
- [ ] Text is readable (16px+ body)
- [ ] Booking iframe is responsive
- [ ] Navigation menu works on mobile

---

## FAQ

### Q: Can I disable analytics for a Pro template?
**A:** No. Analytics is a core Pro feature and must always be enabled. Users can choose not to view their analytics, but tracking should always be available.

### Q: What if a business doesn't need booking?
**A:** Include the `bookingWidget` configuration with `enabled: false`. Users can enable it later if needed.

### Q: How do I get a Google Place ID?
**A:** Use the [Place ID Finder](https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder) tool.

### Q: Can I add custom features?
**A:** Yes, but ensure all required Pro features are present first. Custom features should be additive, not replacement.

### Q: What's the difference between Pro and Basic templates?
**A:**
- **Basic:** Simple, informational sites (no booking, analytics, or dashboard)
- **Pro:** Full-featured business sites with booking, analytics, reviews, and owner dashboard

---

## Version History

### 1.1 (November 14, 2025)
- **Added Stripe Connect support to all 12 Pro templates**
- All templates now have `allowCheckout: true` and `stripeEnabled: true`
- Template-specific CTAs for better conversion
- Payment settings documentation added
- New audit script: `audit-stripe-config.js`
- Comprehensive Stripe Connect integration guide

### 1.0 (November 13, 2025)
- Initial standardization
- All 12 Pro templates compliant
- Features: booking, analytics, reviews, owner dashboard
- Automated validation script
- Comprehensive documentation

---

## Support

For questions or issues with Pro templates:
- Review this documentation
- Run `audit-pro-templates.js` for validation
- Check `PRO-TEMPLATE-AUDIT-REPORT.json` for details
- Test in the setup editor (`/setup`)

---

**✅ All Pro templates are production-ready and fully compliant with this standard.**

