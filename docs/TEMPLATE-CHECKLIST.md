# Template Creation Checklist

Quick reference checklist for creating Starter templates. Print this out and check off items as you go!

## Pre-Creation Research

- [ ] Researched 10-15 real businesses in the niche
- [ ] Documented common sections and features
- [ ] Noted typical pricing ranges
- [ ] Identified unique pain points for this industry
- [ ] Chosen appropriate business name (not generic)
- [ ] Selected industry-appropriate colors
- [ ] Found high-quality, relevant images on Unsplash

## Required Sections

### Brand
- [ ] `name` - Realistic business name
- [ ] `logo` - Path to logo (usually `assets/logo.svg`)
- [ ] `phone` - Contact phone number
- [ ] `email` - Valid email address
- [ ] `tagline` (optional) - Industry-appropriate tagline

### Theme Variables
- [ ] `color-primary` - Valid 6-digit hex code
- [ ] `color-accent` - Valid 6-digit hex code
- [ ] `color-success` - Valid 6-digit hex code
- [ ] `color-warning` - Valid 6-digit hex code
- [ ] `color-danger` - Valid 6-digit hex code
- [ ] Colors tested for accessibility/contrast

### Navigation
- [ ] 3-6 navigation items
- [ ] Each item has `label` and `href`
- [ ] Href points to valid sections (#services, #about, etc.)
- [ ] Labels are clear and descriptive

### Hero
- [ ] `title` - Compelling main headline
- [ ] `subtitle` - Supporting description
- [ ] `cta` - Array with 1-2 call-to-action buttons
- [ ] `image` - High-quality hero image URL
- [ ] `imageAlt` - Descriptive alt text for accessibility
- [ ] `eyebrow` (optional) - Small text above title

### Services OR Products
- [ ] Has either `services` or `products` (or both)
- [ ] `title` - Section title
- [ ] `items` or products array with at least 3-5 items
- [ ] Each item has name/title and description
- [ ] Prices are NUMBERS (not strings like "$99")
- [ ] Descriptions are detailed and industry-specific
- [ ] Images have alt text (if included)

### Contact
- [ ] `title` - Section title
- [ ] `email` - Valid email format
- [ ] `phone` - Contact phone number
- [ ] `address` (optional) - Physical address
- [ ] `hours` (optional) - Business hours object
- [ ] All contact info is realistic

### Footer
- [ ] `text` - Copyright or footer text
- [ ] `links` (optional) - Array of footer links
- [ ] Year is current (2025)

### Settings
- [ ] `allowCheckout` set to `false`
- [ ] `allowOrders` set to `true`
- [ ] `orderNotificationEmail` - Valid email
- [ ] `productCta` - Industry-appropriate CTA text
- [ ] `productCtaHref` - Uses tel: or mailto: protocol
- [ ] `productNote` - Explanation of ordering process

## Optional Sections (Choose Based on Niche)

### About
- [ ] `title` and `body` present
- [ ] `subtitle` (optional)
- [ ] `features` array (optional)
- [ ] Content is industry-specific
- [ ] No Lorem ipsum or placeholder text

### Testimonials
- [ ] `title` present
- [ ] At least 3-4 testimonial items
- [ ] Each has `text` (or `quote`) and `author`
- [ ] Testimonials sound authentic
- [ ] Names are realistic (not "John Doe")
- [ ] Images have alt text (if included)

### Team
- [ ] `title` present
- [ ] At least 1-2 team members
- [ ] Each has `name`, `title`, and `bio`
- [ ] Bios are detailed and credible
- [ ] Images have alt text
- [ ] Credentials listed (if applicable)

### FAQ
- [ ] `title` present
- [ ] At least 5-8 FAQ items
- [ ] Questions are industry-relevant
- [ ] Answers are helpful and detailed
- [ ] Covers common customer concerns

### Stats
- [ ] Numbers are impressive but realistic
- [ ] Labels are clear
- [ ] Uses appropriate metrics for the industry

### Social
- [ ] Valid URLs with full protocol (https://)
- [ ] Links are to real social platforms
- [ ] Appropriate platforms for the niche

## Content Quality

- [ ] No Lorem ipsum or placeholder text anywhere
- [ ] All prices are realistic for the industry
- [ ] Business name is not generic (no "Acme", "Example", etc.)
- [ ] Tone is consistent throughout
- [ ] Content is industry-specific and detailed
- [ ] Grammar and spelling are correct
- [ ] Phone numbers use consistent formatting
- [ ] Email addresses are believable

## Images

- [ ] All images are high quality (Unsplash recommended)
- [ ] Images are relevant to the niche
- [ ] Hero image is compelling
- [ ] All images have descriptive alt text
- [ ] Image URLs include quality parameter (?w=1200&q=80)
- [ ] No broken image links

## Data Formatting

- [ ] All prices are numbers, not strings
  - ✅ `"price": 99`
  - ❌ `"price": "$99"`
- [ ] Phone numbers use tel: protocol in CTAs
  - ✅ `"href": "tel:+15551234567"`
  - ❌ `"href": "(555) 123-4567"`
- [ ] Emails use mailto: protocol in CTAs
  - ✅ `"href": "mailto:hello@business.com"`
  - ❌ `"href": "hello@business.com"`
- [ ] All URLs include protocol
  - ✅ `"href": "https://example.com"`
  - ❌ `"href": "example.com"`
- [ ] Hex colors are 6 digits
  - ✅ `"#6366f1"`
  - ❌ `"#66f"`

## Validation

- [ ] Run: `npm run validate-template your-file.json`
- [ ] Zero validation errors
- [ ] Review and fix any warnings
- [ ] All required fields present
- [ ] All field types correct
- [ ] Settings configured properly

## Manual Testing

### Setup Page
- [ ] Template loads in setup.html
- [ ] All sections render correctly
- [ ] Form fields populate with template data
- [ ] Preview button works
- [ ] Can proceed to customization

### Preview
- [ ] Preview shows all sections
- [ ] Images load correctly
- [ ] Colors look good
- [ ] Text is readable
- [ ] Navigation works
- [ ] CTAs are clickable
- [ ] Mobile responsive
- [ ] No layout issues

### Published Site
- [ ] Can successfully publish test site
- [ ] Visit published URL
- [ ] All content displays correctly
- [ ] Forms work
- [ ] Links work
- [ ] Images load
- [ ] Responsive on mobile
- [ ] Fast loading speed

### Accessibility
- [ ] Can navigate with keyboard only (Tab key)
- [ ] All interactive elements are focusable
- [ ] Skip to main content link works
- [ ] Form labels are properly associated
- [ ] ARIA labels present where needed
- [ ] Color contrast is sufficient
- [ ] Images have alt text
- [ ] Headings are hierarchical (H1 → H2 → H3)

## Documentation

- [ ] Added template to `index.json`
- [ ] Filled in all metadata (id, name, description, category, plan)
- [ ] Features list is compelling
- [ ] Category is appropriate
- [ ] Plan is set to "Starter"
- [ ] Color matches template primary color

## Final Review

- [ ] Reviewed entire JSON file for typos
- [ ] Checked all URLs are valid
- [ ] Verified all images load
- [ ] Confirmed prices make sense
- [ ] Read all content for quality
- [ ] Tested on multiple browsers
- [ ] Tested on mobile device
- [ ] Got feedback from another person
- [ ] Made improvements based on feedback
- [ ] Template looks professional and polished

## Submission

- [ ] Template file is properly named
- [ ] Located in `/public/data/templates/`
- [ ] Passes all validation
- [ ] Passes all manual tests
- [ ] Added to index.json
- [ ] Committed to version control
- [ ] Ready for production use

---

## Quick Validation Commands

```bash
# Validate single template
npm run validate-template public/data/templates/your-template.json

# Validate all templates
npm run validate-templates

# Start server for testing
npm start
```

## Quick Test URLs

```
Setup Page: http://localhost:3000/setup.html
Dashboard: http://localhost:3000/dashboard.html
```

---

**Remember**: Quality matters more than speed. Take your time to create an authentic, well-researched template that truly serves businesses in your chosen niche.

**Pro Tip**: Before finalizing, ask yourself: "Would a real business in this industry actually use this template?" If not, keep refining!

