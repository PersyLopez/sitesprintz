# Starter Template Standard

## Overview

This document defines the standard structure, features, and requirements for all Starter tier templates. Following this standard ensures consistency, quality, and enables future platform features like universal editors.

## Tier Distinction

### Starter Tier (This Standard)
- Beautiful display of services/products with pricing
- Contact forms for inquiries
- **Order submission forms** (email-only, no dashboard)
- Email notifications to owner and customer
- Offline CTAs (call, email, visit)
- Hours, location, pricing information
- NO payment processing (pay on-site/offline)
- NO orders dashboard (email management only)
- NO calendar integration

### Premium/Pro Tier (Upgrade Path)
- Everything in Starter
- **Orders dashboard** for managing submissions
- Order status management and tracking
- Customer communication tools
- Calendar integration for bookings
- Analytics and reporting

### Checkout Tier (Top Tier)
- Everything in Premium
- Stripe payment processing
- Online checkout and transactions
- Automated payment confirmations

## Required Sections

All starter templates MUST include these sections:

### 1. Brand
```json
{
  "brand": {
    "name": "Business Name",
    "logo": "assets/logo.svg",
    "tagline": "Optional tagline or slogan",
    "phone": "(555) 123-4567",
    "email": "contact@business.com"
  }
}
```

**Requirements:**
- `name` (string, required): Business name
- `logo` (string, required): Path to logo image
- `tagline` (string, optional): Business tagline/slogan
- `phone` (string, required): Contact phone number
- `email` (string, required): Contact email address

### 2. Theme Variables
```json
{
  "themeVars": {
    "color-primary": "#6366f1",
    "color-accent": "#8b5cf6",
    "color-success": "#10b981",
    "color-warning": "#f59e0b",
    "color-danger": "#ef4444"
  }
}
```

**Requirements:**
- All five colors required
- Must be valid hex color codes
- Should complement each other and maintain accessibility

### 3. Navigation
```json
{
  "nav": [
    {"label": "Home", "href": "#top"},
    {"label": "Services", "href": "#services"},
    {"label": "About", "href": "#about"},
    {"label": "Contact", "href": "#contact"}
  ]
}
```

**Requirements:**
- Array of navigation items
- Each item must have `label` and `href`
- 3-6 items recommended
- Use anchor links (#section) for single-page templates

### 4. Hero Section
```json
{
  "hero": {
    "eyebrow": "Welcome to Our Business",
    "title": "We help your business grow",
    "subtitle": "Professional services tailored to your needs",
    "cta": [
      {"label": "Get Started", "href": "#contact"},
      {"label": "Learn More", "href": "#about", "variant": "secondary"}
    ],
    "image": "https://images.unsplash.com/photo-...",
    "imageAlt": "Business hero image description"
  }
}
```

**Requirements:**
- `eyebrow` (string, optional): Small text above title
- `title` (string, required): Main headline
- `subtitle` (string, required): Supporting text
- `cta` (array, required): 1-2 call-to-action buttons
- `image` (string, required): Hero image URL
- `imageAlt` (string, required): Accessible image description

### 5. Services OR Products
Templates must have either `services` or `products` (or both):

```json
{
  "services": {
    "title": "Our Services",
    "subtitle": "What we offer",
    "items": [
      {
        "title": "Service Name",
        "description": "Service description",
        "price": 99,
        "duration": "1 hour",
        "features": ["Feature 1", "Feature 2"]
      }
    ]
  }
}
```

OR

```json
{
  "products": [
    {
      "name": "Product Name",
      "price": 49.99,
      "description": "Product description",
      "image": "https://...",
      "imageAlt": "Product image description",
      "category": "Category Name"
    }
  ]
}
```

**Requirements:**
- Must have title and items/products array
- `price` must be a number (not string)
- Each item must have title/name and description
- Images should have alt text

### 6. Contact Section
```json
{
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
  }
}
```

**Requirements:**
- `title` (string, required)
- `email` (string, required): Must be valid email
- `phone` (string, required): Contact phone
- `address` (string, optional): Physical address
- `hours` (object, optional): Business hours

### 7. Footer
```json
{
  "footer": {
    "text": "© 2025 Business Name. All rights reserved.",
    "links": [
      {"label": "Privacy Policy", "href": "#privacy"},
      {"label": "Terms of Service", "href": "#terms"}
    ]
  }
}
```

**Requirements:**
- `text` (string, required): Copyright or footer text
- `links` (array, optional): Footer navigation links

### 8. Settings (Required for Starter Tier)
```json
{
  "settings": {
    "allowCheckout": false,
    "allowOrders": true,
    "orderNotificationEmail": "owner@business.com",
    "productCta": "Request Quote",
    "productCtaHref": "mailto:owner@business.com",
    "productNote": "Submit your order and we'll contact you to arrange payment and delivery."
  }
}
```

**Requirements:**
- `allowCheckout` (boolean, required): Must be `false` for Starter
- `allowOrders` (boolean, required): Must be `true` for order submission
- `orderNotificationEmail` (string, required): Email to receive order notifications
- `productCta` (string, optional): CTA button text for products/services
- `productCtaHref` (string, optional): CTA button link (tel:/mailto:/https:)
- `productNote` (string, optional): Explanation for users about ordering process

## Optional Sections

These sections are recommended but not required:

### About Section
```json
{
  "about": {
    "title": "About Us",
    "body": "Our story and mission...",
    "subtitle": "Why choose us",
    "features": [
      "Feature or value proposition 1",
      "Feature or value proposition 2"
    ]
  }
}
```

### Testimonials
```json
{
  "testimonials": {
    "title": "What Our Clients Say",
    "subtitle": "Real feedback from real customers",
    "items": [
      {
        "text": "Amazing service! Highly recommended.",
        "author": "John Doe",
        "location": "Customer Title/Location",
        "rating": 5,
        "image": "https://...",
        "imageAlt": "John Doe"
      }
    ]
  }
}
```

### Team
```json
{
  "team": {
    "title": "Meet Our Team",
    "subtitle": "The people behind our success",
    "members": [
      {
        "name": "Jane Smith",
        "title": "Founder & CEO",
        "bio": "Bio text...",
        "image": "https://...",
        "imageAlt": "Jane Smith",
        "credentials": ["Credential 1", "Credential 2"]
      }
    ]
  }
}
```

### FAQ
```json
{
  "faq": {
    "title": "Frequently Asked Questions",
    "items": [
      {
        "question": "What are your hours?",
        "answer": "We're open Monday through Friday, 9 AM to 6 PM."
      }
    ]
  }
}
```

### Stats
```json
{
  "stats": {
    "items": [
      {"number": "10+", "label": "Years Experience"},
      {"number": "500+", "label": "Happy Clients"},
      {"number": "4.9", "label": "Star Rating"}
    ]
  }
}
```

### Social Media
```json
{
  "social": {
    "facebook": "https://facebook.com/business",
    "instagram": "https://instagram.com/business",
    "twitter": "https://twitter.com/business",
    "linkedin": "https://linkedin.com/company/business",
    "youtube": "https://youtube.com/@business"
  }
}
```

### Credentials
```json
{
  "credentials": {
    "title": "Certifications & Awards",
    "items": [
      {
        "icon": "🏆",
        "name": "Award Name",
        "description": "Description of award or certification"
      }
    ]
  }
}
```

### Process
```json
{
  "process": {
    "title": "How It Works",
    "steps": [
      {
        "title": "Step 1: Consultation",
        "description": "We discuss your needs"
      },
      {
        "title": "Step 2: Planning",
        "description": "We create a custom plan"
      }
    ]
  }
}
```

### Gallery
```json
{
  "gallery": {
    "title": "Our Work",
    "subtitle": "See what we've created",
    "images": [
      {
        "url": "https://...",
        "alt": "Project description",
        "caption": "Optional caption"
      }
    ]
  }
}
```

## Order Submission Feature

### How It Works (Starter Tier)

1. User fills out order form on the site
2. Form submits to backend API
3. Order saved to database
4. **Email sent to business owner** with order details
5. **Confirmation email sent to customer**
6. Owner manages order manually via email
7. No dashboard access (upgrade incentive)

### Order Form Configuration

Templates should include order-able items in their products/services:

```json
{
  "products": [
    {
      "name": "Product Name",
      "price": 29.99,
      "description": "Description",
      "orderable": true,
      "image": "https://...",
      "imageAlt": "Product image"
    }
  ]
}
```

### Email Notifications

Two emails sent per order:

**Owner Notification:**
- New order alert
- Customer name, email, phone
- Items ordered with quantities
- Total amount (if applicable)
- Special requests/notes
- Timestamp

**Customer Confirmation:**
- Thank you message
- Order summary
- Payment instructions
- Business contact info
- What to expect next

## Data Structure Standards

### General Rules

1. **Prices**: Always numbers, never strings
   - ✅ `"price": 49.99`
   - ❌ `"price": "$49.99"`
   - ❌ `"price": "49.99"`

2. **Phone Numbers**: Use `tel:` protocol for clickable links
   - ✅ `"href": "tel:+15551234567"`
   - ❌ `"href": "(555) 123-4567"`

3. **Email Addresses**: Use `mailto:` protocol
   - ✅ `"href": "mailto:hello@business.com"`
   - ❌ `"href": "hello@business.com"`

4. **Images**: Always include alt text
   - ✅ `"imageAlt": "Professional team photo"`
   - ❌ Missing imageAlt field

5. **URLs**: Always use full URLs with protocol
   - ✅ `"href": "https://example.com"`
   - ❌ `"href": "example.com"`

6. **Required vs Optional**: Mark optional fields clearly in your template

## Validation Rules

Templates will be validated against these rules:

1. All required sections must be present
2. All required fields within sections must exist
3. Field types must match specifications (numbers, strings, booleans)
4. `settings.allowCheckout` must be `false` for Starter tier
5. `settings.allowOrders` must be `true` for order functionality
6. Prices must be numeric values
7. Email addresses must be valid format
8. URLs must be properly formatted
9. Arrays must not be empty where items are required

## Best Practices

### Content Guidelines

1. **Be Specific**: Generic content makes templates feel template-y
2. **Industry Research**: Each template should reflect real industry practices
3. **Authentic Examples**: Use realistic business names, prices, and descriptions
4. **Complete Information**: Don't leave placeholder text like "Lorem ipsum"

### Structure Guidelines

1. **Logical Order**: Sections should flow naturally (Hero → Services → About → Testimonials → Contact)
2. **Balanced Content**: Don't overload one section while others are sparse
3. **Mobile-First**: Content should work on all screen sizes
4. **Accessibility**: Always include alt text, proper heading hierarchy, and ARIA labels

### Performance Guidelines

1. **Optimize Images**: Use appropriate sizes and formats
2. **Lazy Loading**: Images below the fold should lazy load
3. **Minimal Dependencies**: Only include necessary JavaScript
4. **Fast Load Times**: Target < 3 seconds on 3G

## Upgrade Path

### Why Users Upgrade to Premium

1. **Order Management**: Email chaos vs organized dashboard
2. **Efficiency**: Manual tracking vs automated system
3. **Professionalism**: Better customer communication
4. **Analytics**: Understand order patterns and trends
5. **Calendar Integration**: Automated booking scheduling

### Marketing the Upgrade

In order confirmation emails, include:
- "Managing orders via email? Upgrade to Premium for a dashboard"
- Highlight dashboard benefits
- Link to upgrade page

## Future Considerations

This standard enables:

1. **Universal Editor**: Build once, works for all templates
2. **Template Switching**: Users can change templates without losing content
3. **Automated Testing**: Consistent structure allows automated validation
4. **AI Integration**: Standard structure enables AI-powered customization
5. **Analytics**: Compare performance across similar templates

## Version History

- **v1.0** (2025-11-03): Initial standard with order submission support

