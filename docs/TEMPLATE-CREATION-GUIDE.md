# Template Creation Guide

## Introduction

This guide walks you through creating a new Starter tier template for SiteSprintz. Following these steps ensures your template meets platform standards and provides a great user experience.

## Before You Start

### Research Phase

1. **Study Real Businesses**: Look at 10-15 real websites in your chosen niche
2. **Document Patterns**: Note common sections, content types, and features
3. **Identify Pain Points**: What do businesses in this niche need?
4. **Pricing Research**: What are typical prices/rates for this industry?

### Example Research (Restaurant Template):
- Studied: Fine dining, casual dining, fast casual restaurants
- Common sections: Menu, chef profile, reservations, hours, location
- Pricing patterns: $8-$18 appetizers, $22-$45 mains in fine dining
- Pain points: Need to show menu clearly, take reservations, display hours

## Step 1: Plan Your Template

### Define the Niche

- **Template Name**: What will it be called?
- **Target Business**: What type of business is this for?
- **Key Features**: What makes this niche unique?
- **Content Needs**: What information do these businesses need to display?

### Example:
```
Template Name: Salon & Spa
Target: Hair salons, spas, beauty services
Key Features: Service pricing, stylist profiles, booking info, gallery
Content Needs: Services with duration/price, staff bios, before/after photos
```

### Create Section Outline

List all sections your template will include:

**Required Sections**:
- ✅ Brand (name, logo, contact)
- ✅ Navigation
- ✅ Hero
- ✅ Services or Products
- ✅ Contact
- ✅ Footer

**Optional Sections** (choose based on niche):
- About/Story
- Team/Staff
- Testimonials
- FAQ
- Gallery
- Stats/Achievements
- Process/How It Works
- Credentials/Certifications

## Step 2: Create the JSON File

### File Naming Convention

Files should be named: `[niche]-[variant].json`

Examples:
- `salon.json`
- `gym.json`
- `restaurant-casual.json`

### Start with the Template

Create your file in `/public/data/templates/your-template.json`:

```json
{
  "brand": {
    "name": "Business Name",
    "logo": "assets/logo.svg",
    "tagline": "Your Tagline Here",
    "phone": "(555) 123-4567",
    "email": "contact@business.com"
  },
  
  "themeVars": {
    "color-primary": "#6366f1",
    "color-accent": "#8b5cf6",
    "color-success": "#10b981",
    "color-warning": "#f59e0b",
    "color-danger": "#ef4444"
  },
  
  "nav": [
    {"label": "Home", "href": "#top"},
    {"label": "Services", "href": "#services"},
    {"label": "About", "href": "#about"},
    {"label": "Contact", "href": "#contact"}
  ],
  
  "hero": {
    "eyebrow": "Welcome Message",
    "title": "Main Headline",
    "subtitle": "Supporting text that explains what you do",
    "cta": [
      {"label": "Get Started", "href": "#contact"},
      {"label": "Learn More", "href": "#about", "variant": "secondary"}
    ],
    "image": "https://images.unsplash.com/...",
    "imageAlt": "Description of hero image"
  },
  
  "services": {
    "title": "Our Services",
    "subtitle": "What we offer",
    "items": [
      {
        "title": "Service Name",
        "description": "Detailed description of the service",
        "price": 99,
        "duration": "1 hour",
        "features": ["Feature 1", "Feature 2"]
      }
    ]
  },
  
  "contact": {
    "title": "Get In Touch",
    "subtitle": "We'd love to hear from you",
    "email": "hello@business.com",
    "phone": "(555) 123-4567",
    "address": "123 Main St, City, State 12345",
    "hours": {
      "title": "Business Hours",
      "items": [
        "Monday - Friday: 9:00 AM - 6:00 PM",
        "Saturday: 10:00 AM - 4:00 PM",
        "Sunday: Closed"
      ]
    }
  },
  
  "footer": {
    "text": "© 2025 Business Name. All rights reserved.",
    "links": [
      {"label": "Privacy Policy", "href": "#privacy"},
      {"label": "Terms", "href": "#terms"}
    ]
  },
  
  "settings": {
    "allowCheckout": false,
    "allowOrders": true,
    "orderNotificationEmail": "owner@business.com",
    "productCta": "Request Quote",
    "productCtaHref": "mailto:owner@business.com",
    "productNote": "Submit your request and we'll contact you within 24 hours."
  }
}
```

## Step 3: Write Authentic Content

### Content Guidelines

**DO:**
- ✅ Write like a real business in that niche
- ✅ Use industry-appropriate terminology
- ✅ Include realistic prices based on your research
- ✅ Create believable business names (not "Acme" or "Example")
- ✅ Write detailed, helpful descriptions
- ✅ Include specific features and benefits

**DON'T:**
- ❌ Use Lorem ipsum or placeholder text
- ❌ Make up unrealistic prices
- ❌ Use generic business names
- ❌ Copy/paste the same content across sections
- ❌ Leave sections empty or minimal

### Example: Bad vs Good

**Bad (Generic)**:
```json
{
  "name": "Example Salon",
  "description": "We offer hair services"
}
```

**Good (Specific)**:
```json
{
  "name": "Glow Studio",
  "tagline": "Beauty & Wellness • Since 2015",
  "description": "Transform your look with precision cuts, stunning color, and luxurious treatments from our team of master stylists."
}
```

## Step 4: Choose Great Images

### Image Guidelines

1. **Use Unsplash**: High-quality, free images
2. **Industry-Relevant**: Images should match the niche
3. **Professional**: Avoid low-quality or amateur photos
4. **Diverse**: Show variety in your examples
5. **Always Include Alt Text**: For accessibility

### Finding Images

```
Search terms for [Salon template]:
- "hair salon interior"
- "professional hairstylist working"
- "salon chairs and mirrors"
- "hair color transformation"
```

### Image URLs

Use Unsplash with quality parameter:
```
https://images.unsplash.com/photo-[ID]?w=1200&q=80
```

### Alt Text Examples

**Bad**: `"Image"` or `"Photo"`  
**Good**: `"Modern salon interior with professional styling stations and elegant lighting"`

## Step 5: Set Appropriate Colors

### Color Selection

Colors should reflect the industry:

**Examples by Industry**:
- **Salon/Beauty**: Purples, pinks, golds (#d946ef, #f472b6)
- **Gym/Fitness**: Reds, oranges (#dc2626, #f59e0b)
- **Restaurant**: Warm tones (#ef4444, #d97706)
- **Tech/Consultant**: Blues, teals (#0ea5e9, #06b6d4)
- **Nature/Eco**: Greens (#10b981, #059669)

### Color Accessibility

Ensure colors have good contrast:
- Test with WebAIM Contrast Checker
- Primary color should work on white background
- Text should be readable

## Step 6: Add Optional Sections

### About Section

```json
"about": {
  "title": "Our Story",
  "body": "Founded in 2015 by Master Stylist Sarah Chen, Glow Studio has become the premier destination for beauty and wellness...",
  "subtitle": "Why choose us",
  "features": [
    "💇‍♀️ Master stylists with 10+ years experience",
    "🎨 Latest color techniques and trends",
    "🌿 Organic and eco-friendly products"
  ]
}
```

### Testimonials

```json
"testimonials": {
  "title": "What Our Clients Say",
  "subtitle": "Real reviews from real customers",
  "items": [
    {
      "text": "Sarah transformed my hair! The balayage she did is absolutely stunning. Best salon experience I've ever had.",
      "author": "Emma Williams",
      "location": "Regular Customer",
      "rating": 5,
      "image": "https://...",
      "imageAlt": "Emma Williams"
    }
  ]
}
```

### Team Section

```json
"team": {
  "title": "Meet Our Stylists",
  "subtitle": "Expert professionals passionate about beauty",
  "members": [
    {
      "name": "Sarah Chen",
      "title": "Master Stylist & Owner",
      "bio": "15+ years of experience from top salons in NYC and LA",
      "image": "https://...",
      "imageAlt": "Sarah Chen",
      "credentials": ["Master Colorist", "Balayage Specialist"]
    }
  ]
}
```

### FAQ Section

```json
"faq": {
  "title": "Frequently Asked Questions",
  "items": [
    {
      "question": "Do you take walk-ins?",
      "answer": "We welcome walk-ins based on availability, but we highly recommend booking an appointment to guarantee your preferred time."
    },
    {
      "question": "What hair products do you use?",
      "answer": "We exclusively use professional-grade products from Redken, Olaplex, and Kevin Murphy, ensuring the health and longevity of your color and style."
    }
  ]
}
```

## Step 7: Configure Settings

### Order Submission Settings

```json
"settings": {
  "allowCheckout": false,  // Must be false for Starter
  "allowOrders": true,     // Must be true for submissions
  "orderNotificationEmail": "owner@business.com",
  "productCta": "Book Appointment",  // Niche-appropriate CTA
  "productCtaHref": "tel:+15551234567",  // Use tel: or mailto:
  "productNote": "Call or email to book your appointment. We'll confirm within 24 hours."
}
```

### CTA Examples by Niche

- **Salon**: "Book Appointment" → `tel:+15551234567`
- **Restaurant**: "Call for Reservation" → `tel:+15551234567`
- **Gym**: "Schedule Visit" → `mailto:info@gym.com`
- **Consultant**: "Request Consultation" → `mailto:hello@consultant.com`

## Step 8: Validate Your Template

### Run Validation

```bash
npm run validate-template public/data/templates/your-template.json
```

### Common Validation Errors

1. **Price is not a number**
   ```json
   ❌ "price": "$99"
   ✅ "price": 99
   ```

2. **Missing required field**
   ```json
   ❌ "hero": {"title": "...", "subtitle": "..."}  // Missing cta
   ✅ "hero": {"title": "...", "subtitle": "...", "cta": [...]}
   ```

3. **Invalid hex color**
   ```json
   ❌ "color-primary": "#66f"
   ✅ "color-primary": "#6366f1"
   ```

4. **Missing image alt text**
   ```json
   ❌ "image": "https://..."  // No imageAlt
   ✅ "image": "https://...", "imageAlt": "Description"
   ```

### Fix All Errors

Keep running validation until you get:
```
✓ Template is valid!
```

## Step 9: Test Your Template

### Manual Testing Checklist

- [ ] Load in setup.html - does it render correctly?
- [ ] Check all sections display properly
- [ ] Test on mobile - is it responsive?
- [ ] Click all links - do they work?
- [ ] Test contact form - does validation work?
- [ ] Try order submission - does it work?
- [ ] Check images - do they load and look good?
- [ ] Test accessibility - keyboard navigation works?
- [ ] Preview published site - everything looks right?

### Testing Process

1. **Start server**: `npm start`
2. **Open setup**: `http://localhost:3000/setup.html`
3. **Select your template**
4. **Customize and preview**
5. **Publish test site**
6. **Visit published site**: `http://localhost:3000/sites/[subdomain]/`

## Step 10: Document Your Template

### Add to index.json

Add your template to `/public/data/templates/index.json`:

```json
{
  "id": "your-template",
  "name": "Your Template Name",
  "description": "Brief description of what this template is for",
  "category": "Category Name",
  "color": "#6366f1",
  "plan": "Starter",
  "features": [
    "Key feature 1",
    "Key feature 2",
    "Key feature 3"
  ]
}
```

### Create Template Card Preview

The template will show in the gallery with:
- Icon (based on category)
- Name and description
- Features list
- Plan badge (Starter/Premium/Checkout)

## Common Pitfalls to Avoid

### 1. Generic Content
❌ "We provide quality services"  
✅ "Professional balayage and color correction with 15+ years of expertise"

### 2. Unrealistic Pricing
❌ Luxury spa charging $10 for services  
✅ Research-based pricing that matches the niche

### 3. Inconsistent Tone
❌ Mixing formal and casual language randomly  
✅ Consistent voice that matches the business type

### 4. Missing Accessibility
❌ Images without alt text, unclear labels  
✅ Descriptive alt text, ARIA labels, semantic HTML

### 5. Poor Image Choices
❌ Low quality, irrelevant stock photos  
✅ Professional, niche-specific imagery

## Template Quality Checklist

Before submitting your template:

- [ ] All required sections present and complete
- [ ] Content is industry-specific and realistic
- [ ] Prices are numbers and appropriate for niche
- [ ] All images have descriptive alt text
- [ ] Colors are industry-appropriate with good contrast
- [ ] Navigation links point to valid sections
- [ ] Contact information is properly formatted (tel:, mailto:)
- [ ] Settings configured correctly for Starter tier
- [ ] No Lorem ipsum or placeholder text
- [ ] Passes validation script with zero errors
- [ ] Tested in browser and looks professional
- [ ] Mobile responsive and accessible
- [ ] Added to index.json with proper metadata

## Examples to Study

Look at these templates for reference:

1. **restaurant-casual.json** - Great example of niche-specific content
2. **salon.json** - Good use of services with pricing
3. **gym.json** - Well-structured team and features sections
4. **consultant.json** - Professional tone and credibility building

## Getting Help

- Review: `/docs/STARTER-TEMPLATE-STANDARD.md` for requirements
- Check: `/docs/TEMPLATE-CHECKLIST.md` for quick reference
- Validate: `npm run validate-template your-file.json`
- Test: Start server and load in setup.html

## Conclusion

Creating a great template takes time and research, but following this guide ensures your template will:
- Meet platform standards
- Provide value to users
- Be maintainable long-term
- Enable future features

Remember: Quality over speed. A well-researched, authentic template is infinitely more valuable than a generic one rushed into production.

Happy template building! 🚀

