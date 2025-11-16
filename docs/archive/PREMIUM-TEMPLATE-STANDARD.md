# Premium Template Standard

**Version:** 1.0  
**Last Updated:** November 14, 2025  
**Status:** 🚧 **IN DEVELOPMENT** - 4 Premium templates exist  
**Payment:** ✅ Stripe Connect enabled (inherited from Pro)  
**Pricing:** $100/month

---

## Overview

This document defines the standard schema and requirements for all SiteSprintz Premium templates. Premium templates are designed for established businesses seeking advanced automation, superior conversion tools, and comprehensive customer management capabilities.

**Current Premium Templates:** 4
- `medical-premium.json`
- `home-services-premium.json`
- `legal-premium.json`
- `real-estate-premium.json`

---

## Premium Philosophy

### **Value Proposition:**
Premium templates offer **$500-$1,000/month in third-party tool value** plus **$10,000-$30,000 in custom development value** for a **$100/month** subscription.

### **Target Customer:**
- Established businesses (3+ years)
- High-ticket services ($500-$10,000+ per sale)
- Need for automation and self-service
- Ready to scale operations
- Want to reduce admin time by 10-20 hours/week

### **Core Differentiation:**
Premium templates provide **everything in Pro** PLUS exclusive automation, conversion optimization, and customer self-service features that competitors charge hundreds per month for.

---

## Required Schema Structure

### 1. Top-Level Keys

Every Premium template MUST include these top-level keys:

```json
{
  "id": "template-id-premium",
  "name": "Template Name Premium",
  "plan": "Premium",
  "category": "Industry Category",
  "meta": { ... },
  "styles": { ... },
  "navigation": [ ... ],
  "chat": { ... },
  "sections": [ ... ],
  "features": { ... },
  "settings": { ... }
}
```

---

### 2. Plan and Category

```json
{
  "plan": "Premium",
  "category": "Healthcare" | "Home Services" | "Legal" | "Real Estate" | ...
}
```

**Requirements:**
- `plan` MUST be exactly `"Premium"`
- `category` should match business vertical

---

### 3. Meta Object

```json
"meta": {
  "businessName": "[Business Name]",
  "pageTitle": "[Business Name] | Value Proposition",
  "metaDescription": "Compelling 150-160 character description with location and services",
  "logo": "https://via.placeholder.com/180x60/color/ffffff?text=YOUR+LOGO",
  "logoAlt": "[Business Name] logo",
  "primaryPhone": "+1-555-XXX-XXXX",
  "primaryPhoneLabel": "Call: (555) XXX-XXXX",
  "mobileCallLabel": "Tap to Call"
}
```

**Requirements:**
- All fields MUST be present
- Phone numbers in E.164 format (+1-XXX-XXX-XXXX)
- Meta description optimized for SEO (150-160 chars)
- Logo placeholder with appropriate colors

---

### 4. Enhanced Styles

```json
"styles": {
  "primaryColor": "#hex",
  "primaryColorDark": "#hex",
  "accentColor": "#hex",
  "secondaryColor": "#hex",
  "textColor": "#hex",
  "mutedColor": "#hex",
  "surfaceColor": "#hex",
  "borderColor": "rgba(...)",
  "backgroundColor": "#hex",
  "radius": "18px"
}
```

**Premium Enhancements:**
- More sophisticated color palette (9 colors vs 5 in Pro)
- Advanced RGBA support for overlays
- Larger border radius for premium look (18-20px)

---

### 5. Navigation

```json
"navigation": [
  { "label": "Services", "href": "#services" },
  { "label": "Why Us", "href": "#credentials" },
  { "label": "Gallery", "href": "#gallery" },
  { "label": "Testimonials", "href": "#testimonials" },
  { "label": "Resources", "href": "#blog" },
  { "label": "Contact", "href": "#contact" }
]
```

**Premium Requirements:**
- 5-7 navigation items (vs 3-5 in Pro)
- Must include link to resources/blog
- Clear hierarchy and flow

---

## Premium-Exclusive Features

### 1. Live Chat Widget (REQUIRED)

```json
"chat": {
  "enabled": true,
  "provider": "intercom" | "tidio" | "drift" | "tawk",
  "appId": "YOUR_APP_ID_HERE",
  "position": "bottom-right"
}
```

**Purpose:** 20-30% increase in lead generation  
**Value:** $50-$200/month  
**Supported Providers:**
- **Intercom** - Full-featured customer messaging
- **Tidio** - Budget-friendly with AI
- **Drift** - Conversational marketing focus
- **Tawk.to** - Free with pro features

**Requirements:**
- MUST be present in all Premium templates
- Default to `enabled: true`
- Provide setup instructions for each provider

---

### 2. Service/Product Filters (REQUIRED)

```json
"serviceFilters": {
  "enabled": true,
  "containerId": "services-section-id",
  "filters": [
    { "label": "All Services", "value": "all" },
    { "label": "Category 1", "value": "cat1" },
    { "label": "Category 2", "value": "cat2" },
    { "label": "Category 3", "value": "cat3" }
  ]
}
```

**Purpose:** 25-40% reduced bounce rate  
**Requirements:**
- Minimum 4 filter options
- First option MUST be "All Services" / "All Products"
- Filter values must match `category` field in services/products

---

### 3. Interactive Price Calculator (PREMIUM)

```json
"features": {
  "priceCalculator": {
    "enabled": false,
    "type": "service" | "product" | "custom",
    "containerId": "calculator-section",
    "variables": [
      {
        "id": "var1",
        "label": "Variable Name",
        "type": "select" | "range" | "number",
        "options": [ ... ],
        "multiplier": 1.0
      }
    ],
    "basePrice": 0,
    "formula": "dynamic"
  }
}
```

**Purpose:** Instant quote, reduces barrier to inquiry  
**Value:** $2,000-$5,000 custom development  
**Implementation:** Premium-specific JavaScript module

---

### 4. Multi-Step Lead Forms (PREMIUM)

```json
"features": {
  "multiStepForms": {
    "enabled": false,
    "containerId": "lead-form-section",
    "steps": [
      {
        "id": "step1",
        "title": "Step Title",
        "fields": [ ... ]
      }
    ],
    "progressIndicator": true,
    "saveProgress": true
  }
}
```

**Purpose:** Higher quality leads, better qualification  
**Value:** $1,000-$3,000 custom development  
**Features:**
- Progress bar
- Back/forward navigation
- Save and resume
- Conditional logic

---

### 5. Blog/Resources Section (PREMIUM)

```json
"features": {
  "blog": {
    "enabled": false,
    "containerId": "blog-section",
    "categories": [ "Industry News", "Tips", "Case Studies" ],
    "maxPosts": 6,
    "showExcerpt": true,
    "cmsIntegration": "ghost" | "wordpress" | "none"
  }
}
```

**Purpose:** 15-25% increase in organic traffic  
**Value:** $500-$2,000/month agency cost  
**Options:**
- Standalone posts in JSON
- Ghost CMS integration
- WordPress API integration

---

### 6. Enhanced Provider Profiles (PREMIUM)

```json
"sections": [
  {
    "id": "team-showcase",
    "type": "enhanced-team",
    "settings": {
      "heading": "Meet Our Team",
      "profiles": [
        {
          "name": "Provider Name",
          "title": "Professional Title",
          "credentials": ["Credential 1", "Credential 2"],
          "bio": "Detailed biography...",
          "image": "url",
          "video": "optional-video-url",
          "specialties": [ ... ],
          "education": [ ... ],
          "experience": "15+ years",
          "languages": [ "English", "Spanish" ]
        }
      ]
    }
  }
]
```

**Purpose:** Build trust with detailed provider information  
**Enhanced vs Pro:**
- Video introduction support
- Credentials and certifications
- Education and training
- Languages spoken
- Specialties and focus areas

---

### 7. Client Portal / Status Tracking (PREMIUM - Future)

```json
"features": {
  "clientPortal": {
    "enabled": false,
    "loginRequired": true,
    "features": ["appointments", "documents", "messaging", "billing"]
  }
}
```

**Purpose:** 30-40% reduction in support calls  
**Value:** $5,000-$15,000 custom development  
**Status:** Planned for Q2 2026

---

### 8. Advanced Booking System (PREMIUM - Future)

```json
"features": {
  "advancedBooking": {
    "enabled": false,
    "provider": "native" | "calendly" | "acuity",
    "features": {
      "multiService": true,
      "resourceScheduling": true,
      "deposits": true,
      "waitlist": true,
      "recurring": true
    }
  }
}
```

**Purpose:** Full-featured scheduling without external tools  
**Value:** $50-$150/month + custom integration  
**Status:** Planned for Q2 2026

---

### 9. Service Area Mapping (PREMIUM - Future)

```json
"features": {
  "serviceAreaMap": {
    "enabled": false,
    "containerId": "coverage-section",
    "center": { "lat": 0, "lng": 0 },
    "radius": 50,
    "zipcodes": [ ... ],
    "showMap": true
  }
}
```

**Purpose:** Instant lead qualification by location  
**Value:** High for service businesses  
**Status:** Planned for Q2 2026

---

### 10. Email Automation Sequences (PREMIUM - Future)

```json
"features": {
  "emailAutomation": {
    "enabled": false,
    "provider": "resend" | "sendgrid",
    "sequences": [
      {
        "trigger": "new_lead",
        "emails": [ ... ]
      }
    ]
  }
}
```

**Purpose:** 25-35% increase in repeat business  
**Value:** $30-$100/month  
**Status:** Planned for Q2 2026

---

## Premium Features Object (Complete)

All Premium templates MUST include this complete features configuration:

```json
"features": {
  // Inherited from Pro
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
  "analytics": true,
  
  // Premium-Exclusive (Currently Available)
  "liveChat": {
    "enabled": false,
    "provider": "",
    "appId": "",
    "position": "bottom-right"
  },
  "serviceFilters": {
    "enabled": true,
    "containerId": "",
    "filters": []
  },
  
  // Premium-Exclusive (Coming Soon)
  "priceCalculator": {
    "enabled": false,
    "type": "service",
    "variables": []
  },
  "multiStepForms": {
    "enabled": false,
    "steps": []
  },
  "blog": {
    "enabled": false,
    "categories": []
  },
  "clientPortal": {
    "enabled": false
  },
  "advancedBooking": {
    "enabled": false
  },
  "emailAutomation": {
    "enabled": false
  },
  "serviceAreaMap": {
    "enabled": false
  }
}
```

---

## Premium Settings Object (Complete)

All Premium templates MUST include these settings:

```json
"settings": {
  // Inherited from Pro
  "allowCheckout": true,
  "allowOrders": true,
  "stripeEnabled": true,
  "productCta": "Buy Now",
  "productNote": "Secure checkout powered by Stripe.",
  "bookingEnabled": true,
  "bookingWidget": "calendly",
  
  // Premium-Specific
  "tier": "Premium",
  "chatEnabled": true,
  "advancedAnalytics": true,
  "automationEnabled": true,
  "whiteLabel": true
}
```

---

## Premium Section Types

Premium templates have access to enhanced section types:

### Available Section Types:
1. `healthcare-hero` - Medical/wellness hero with stats
2. `emergency-hero` - 24/7 service hero
3. `legal-hero` - Attorney/law firm hero
4. `medical-services` - Healthcare services grid
5. `services-advanced` - Enhanced service cards
6. `credentials-showcase` - Licenses, insurance, awards
7. `team-showcase` - Enhanced team profiles with video
8. `before-after-showcase` - Before/after comparison slider
9. `testimonials-advanced` - Video testimonials
10. `multi-step-form` - Lead qualification form
11. `price-calculator` - Interactive quote tool
12. `blog-grid` - Blog/resources section
13. `client-portal-preview` - Portal feature showcase
14. `service-area-map` - Coverage area visualization
15. `faq-advanced` - Searchable FAQ with categories

---

## Content Quality Standards

### Premium templates MUST have:

**1. Enhanced Copywriting:**
- Benefit-driven headlines
- Social proof in every section
- Clear value propositions
- Urgency and scarcity elements
- Professional tone matching industry

**2. High-Quality Assets:**
- Professional photography (Unsplash Pro quality)
- All images 1200px+ width
- Descriptive alt text for accessibility
- Optimized for performance (<200KB per image)

**3. Trust Indicators:**
- Credentials and certifications
- Awards and recognition
- Years in business
- Number of clients served
- Industry associations
- Insurance and bonding (if applicable)

**4. Comprehensive Content:**
- Detailed service descriptions (100-150 words each)
- Provider bios (150-200 words)
- FAQ section (minimum 8 questions)
- Testimonials (minimum 6, with attribution)
- Clear process/workflow explanation

---

## Validation & Compliance

### Automated Validation Script

```bash
node scripts/audit-premium-templates.js
```

**What it checks:**
✅ `plan === "Premium"`  
✅ All required top-level keys present  
✅ `features.liveChat` object present  
✅ `features.serviceFilters` configured  
✅ Enhanced `styles` object with 9 colors  
✅ `chat` configuration present  
✅ 5-7 navigation items  
✅ All Pro features inherited  
✅ Valid JSON structure

---

## Testing Checklist

Before releasing a Premium template:

### Schema Validation
- [ ] Passes `audit-premium-templates.js` script
- [ ] All required features present
- [ ] All Pro features inherited
- [ ] Valid JSON structure
- [ ] No parse errors

### Feature Testing
- [ ] Live chat widget integrates correctly
- [ ] Service filters work properly
- [ ] Booking widget renders (if enabled)
- [ ] Reviews widget renders (if enabled)
- [ ] Stripe checkout configured
- [ ] All CTAs functional
- [ ] Navigation links work
- [ ] Mobile responsive

### Premium Feature Testing
- [ ] Price calculator (if enabled)
- [ ] Multi-step form (if enabled)
- [ ] Blog section (if enabled)
- [ ] Enhanced provider profiles display
- [ ] Service area map (if enabled)
- [ ] Email automation (if enabled)

### Content Quality
- [ ] Professional, realistic content
- [ ] No placeholder text
- [ ] High-quality images (1200px+)
- [ ] Descriptive alt text
- [ ] Trust indicators present
- [ ] Comprehensive service descriptions

### Performance
- [ ] Page load < 3 seconds
- [ ] Images optimized
- [ ] Lighthouse score 85+
- [ ] Core Web Vitals pass
- [ ] No console errors

---

## Premium Template Checklist

### Must Have (Launch Requirements):
- [ ] `plan: "Premium"`
- [ ] All Pro features inherited
- [ ] Live chat configuration
- [ ] Service filters
- [ ] Enhanced provider profiles
- [ ] Advanced hero section
- [ ] Trust indicators
- [ ] High-quality content

### Should Have (Q1 2026):
- [ ] Interactive price calculator
- [ ] Multi-step lead forms
- [ ] Blog/resources section
- [ ] Video testimonials
- [ ] Before/after galleries

### Future Enhancements (Q2 2026+):
- [ ] Client portal
- [ ] Advanced booking system
- [ ] Email automation
- [ ] Service area mapping
- [ ] CRM integration
- [ ] A/B testing tools

---

## Premium by Industry

### Healthcare/Medical Premium:
**Required:**
- Patient journey section
- Insurance accepted showcase
- Provider credentials (board certification)
- HIPAA compliance messaging
- Telehealth options

**Recommended:**
- Symptom checker
- Patient portal preview
- Health resources/blog
- Online forms (new patient)

---

### Home Services Premium:
**Required:**
- Emergency/24-7 messaging
- Service area coverage
- Licensing and insurance proof
- Before/after gallery
- Warranty information

**Recommended:**
- Instant quote calculator
- ZIP code checker
- Financing options
- Maintenance subscription plans

---

### Legal Services Premium:
**Required:**
- Attorney profiles (bar admission)
- Case results (if permitted)
- Practice areas detail
- Free consultation CTA
- Client testimonials

**Recommended:**
- Case evaluation quiz
- Fee calculator
- Legal resources library
- Client portal access

---

### Real Estate Premium:
**Required:**
- Property search/listings
- Agent profiles
- Market statistics
- Neighborhood info
- Client testimonials

**Recommended:**
- IDX integration
- Map-based search
- Home valuation tool
- Mortgage calculator
- Virtual tours

---

## Value Proposition

### What Premium Customers Get:

**🎯 Everything in Pro ($45/month), PLUS:**

**Premium-Exclusive Features:**
- 💬 Live Chat Widget ($50-$200/mo value)
- 🧮 Interactive Calculators ($2,000-$5,000 dev)
- 📝 Multi-Step Forms ($1,000-$3,000 dev)
- 📚 Blog/CMS Integration ($500-$2,000/mo value)
- 👔 Enhanced Profiles (Professional presentation)
- 🗺️ Service Area Mapping ($1,000-$3,000 dev)
- 📧 Email Automation ($30-$100/mo)
- 🎟️ Client Portal ($5,000-$15,000 dev)

**Total Value:** $600-$900/month + $10,000-$30,000 development

**vs Competitors:**
- WordPress + Premium Plugins: $100-$300/mo
- Custom Development: $10,000-$30,000 one-time
- Agency Retainer: $1,000-$3,000/mo

---

## Implementation Status

### ✅ Currently Available (v1.0):
- Live chat widget integration
- Enhanced service filters
- Advanced hero sections
- Enhanced provider profiles
- Trust indicator sections
- Professional content templates

### 🚧 In Development (Q1 2026):
- Interactive price calculators
- Multi-step lead forms
- Blog/resources CMS
- Video testimonial sections

### 📋 Planned (Q2 2026+):
- Client portal system
- Advanced booking (native)
- Email automation sequences
- Service area mapping
- CRM integrations
- Analytics dashboard
- A/B testing tools

---

## Best Practices

### 1. Feature Defaults
- Set `enabled: false` for premium features requiring configuration
- Always include complete schema even when disabled
- Provide clear setup instructions in `productNote`

### 2. Progressive Enhancement
- Start with Pro features as foundation
- Layer Premium features incrementally
- Test each feature independently
- Monitor performance impact

### 3. Industry Customization
- Tailor content to industry vertical
- Use industry-specific terminology
- Include relevant trust indicators
- Match competitor feature sets

### 4. Conversion Optimization
- Clear CTAs in every section
- Multiple conversion points
- Social proof throughout
- Trust signals above the fold

---

## FAQ

### Q: How is Premium different from Pro?
**A:** Pro includes payment processing and owner dashboard. Premium adds advanced automation, live chat, calculators, multi-step forms, blog/CMS, and future client portal features. Premium is designed for businesses ready to scale.

### Q: Can Premium features be disabled?
**A:** Yes, all Premium features have `enabled: false` by default and can be configured by the user.

### Q: What's the pricing justification?
**A:** Premium delivers $600-$900/month in third-party tool costs + $10,000-$30,000 in custom development value for $100/month.

### Q: When will all Premium features be available?
**A:** Current features (live chat, filters, profiles) are available now. Advanced features (calculators, forms, blog) launch Q1 2026. Portal and automation features launch Q2 2026.

### Q: Can I create a custom Premium template?
**A:** Yes, but ensure all required Pro features are inherited and at least 3-5 Premium-exclusive features are included.

---

## Version History

### 1.0 (November 14, 2025)
- Initial Premium template standard
- 4 Premium templates available
- Live chat and service filters implemented
- Enhanced provider profiles
- Advanced hero sections
- Comprehensive documentation
- Launch-ready foundation

---

## Support

For questions or issues with Premium templates:
- Review this documentation
- Check existing Premium templates for reference
- Run `audit-premium-templates.js` for validation
- Test in the setup editor (`/setup`)
- Refer to `PREMIUM-FEATURES-QUICK-REF.md` for feature details

---

**✨ Premium templates represent the pinnacle of SiteSprintz offerings - designed for businesses ready to dominate their market with automation and superior conversion tools.**

