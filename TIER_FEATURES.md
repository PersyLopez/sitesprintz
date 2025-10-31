# Template Tier Features Reference

This document outlines the specific features available in each template tier to help maintain consistency and guide future development.

---

## 🎯 Starter Templates (Display Only)

### Purpose
Perfect for service businesses and local shops that want to showcase their offerings without payment processing.

### Included Features

#### Core Display
- ✅ Hero sections with image, title, subtitle, eyebrow, and CTAs
- ✅ Services/offerings display with descriptions
- ✅ Pricing tables (display only, no purchase functionality)
- ✅ About sections with team/business info
- ✅ Testimonials and social proof sections
- ✅ Contact information (phone, email, address, hours)
- ✅ Location/map support with coordinates
- ✅ Footer with links and awards

#### Technical Features
- ✅ Mobile-responsive design
- ✅ SEO-friendly metadata
- ✅ Admin content editor (JSON-based)
- ✅ Custom theme variables (colors, fonts)
- ✅ Navigation with mobile menu toggle
- ✅ Fast loading and optimized performance

#### Call-to-Action Options
- ✅ Phone links (`tel:`)
- ✅ Email links (`mailto:`)
- ✅ External booking links (Calendly, OpenTable, Resy, etc.)
- ✅ Visit/location CTAs
- ✅ Custom CTA text and URLs

### Explicitly Excluded
- ❌ Stripe checkout integration
- ❌ Payment processing
- ❌ Shopping cart functionality
- ❌ Automated order confirmations
- ❌ Order management dashboard
- ❌ Direct online purchasing

### Template Configuration
All Starter templates must include:
```json
"settings": {
  "allowCheckout": false,
  "productCta": "Call to Order",           // Custom CTA text
  "productCtaHref": "tel:+15551234567",    // External link (tel:, mailto:, https://)
  "productNote": "Contact us to order..."   // Upgrade message
}
```

### Available Templates
1. **Starter** - Basic one-page template
2. **Restaurant** - Menu display with reservation links
3. **Salon** - Services with external booking
4. **Freelancer** - Portfolio and contact
5. **Consultant** - Business services and consultation booking
6. **Gym** - Classes and membership info
7. **Tech Repair** - Services with quote requests
8. **Cleaning** - Service packages with quote requests
9. **Pet Care** - Services with booking links
10. **Product Showcase** - Catalog display with offline ordering

---

## 💳 Checkout Templates (Payment Enabled)

### Purpose
Built for retail shops and online sellers ready to accept payments through Stripe.

### Included Features

#### Everything in Starter, PLUS:

#### Payment Processing
- ✅ Stripe Checkout integration
- ✅ Secure payment processing (PCI compliant)
- ✅ Support for credit/debit cards
- ✅ Multiple currency support
- ✅ Idempotent checkout requests (prevents duplicate charges)
- ✅ Webhook support for real-time payment status

#### Order Management
- ✅ Admin dashboard for viewing orders
- ✅ Order metadata capture (customer info, items, amounts)
- ✅ Order status tracking
- ✅ Automated order confirmations via email
- ✅ Stripe-hosted receipts

#### Technical Features
- ✅ Environment variable configuration for Stripe keys
- ✅ Server-side checkout session creation
- ✅ Webhook signature verification
- ✅ Error handling and logging
- ✅ Test mode support (Stripe test keys)

### Template Configuration
All Checkout templates must include:
```json
"settings": {
  "allowCheckout": true,
  "productCta": "Buy Now",                              // Or "Order Now", "Add to Cart"
  "productNote": "Secure checkout powered by Stripe."   // Optional trust message
}
```

### Required Server Setup
1. **Environment Variables:**
   - `STRIPE_SECRET_KEY` - Stripe API secret key
   - `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
   - `ADMIN_TOKEN` - For accessing admin dashboard

2. **API Endpoints:**
   - `POST /api/payments/checkout-sessions` - Create checkout session
   - `POST /api/payments/webhook` - Handle Stripe webhooks
   - `GET /api/orders` - View orders (admin only)

3. **Database/Storage:**
   - Orders stored in `data/orders/` directory (JSON files)
   - Each order includes: timestamp, customer, items, amount, status

### Available Templates
1. **Product Ordering** - Full e-commerce with Stripe
2. **Restaurant (Online Ordering)** - Menu with online payment for takeout/delivery

---

## 🚀 Premium Suite (Coming Soon)

### Purpose
Full marketing sites for established businesses ready to scale beyond a single landing page.

### Planned Features

#### Everything in Checkout, PLUS:

#### Multi-Page Functionality
- 📋 Multiple page support (about, services, blog, contact, etc.)
- 📋 Dynamic routing and navigation
- 📋 Page-specific layouts and templates
- 📋 Nested navigation and breadcrumbs

#### Content Management
- 📋 Built-in blog with markdown editor
- 📋 Categories and tags for posts
- 📋 RSS feed generation
- 📋 Content scheduling (publish dates)
- 📋 Draft/published status management
- 📋 Media library for images and assets

#### Scheduling & Calendar
- 📋 Calendar integrations (Calendly, Cal.com, Google Calendar)
- 📋 Appointment booking with time slots
- 📋 Automated reminders via email/SMS
- 📋 Calendar sync with admin dashboard
- 📋 Recurring appointments support

#### CRM & Automation
- 📋 Lead capture forms with validation
- 📋 Email marketing integrations (Mailchimp, ConvertKit)
- 📋 Automated welcome sequences
- 📋 Customer segmentation
- 📋 Activity tracking and analytics
- 📋 Export customer data (CSV, JSON)

#### Advanced Features
- 📋 Custom domain support with SSL
- 📋 Advanced analytics (Google Analytics, Plausible)
- 📋 A/B testing for pages and CTAs
- 📋 Gated content (email required)
- 📋 Member login/authentication
- 📋 Search functionality
- 📋 Multi-language support (i18n)

#### Development Features
- 📋 Custom CSS overrides
- 📋 JavaScript injection for 3rd-party scripts
- 📋 API access for integrations
- 📋 Webhook support for events
- 📋 Version control and rollback

### Timeline
Currently in development. Features will be prioritized based on waitlist feedback.

---

## Feature Comparison Matrix

| Feature | Starter | Checkout | Premium |
|---------|---------|----------|---------|
| Display pricing/services | ✅ | ✅ | ✅ |
| Mobile-responsive | ✅ | ✅ | ✅ |
| Admin content editor | ✅ | ✅ | ✅ |
| SEO optimization | ✅ | ✅ | ✅ |
| Offline CTAs (call/email) | ✅ | ✅ | ✅ |
| **Payment processing** | ❌ | ✅ | ✅ |
| **Order management** | ❌ | ✅ | ✅ |
| **Automated emails** | ❌ | ✅ | ✅ |
| **Multi-page layouts** | ❌ | ❌ | 📋 |
| **Blog/CMS** | ❌ | ❌ | 📋 |
| **Scheduling integration** | ❌ | ❌ | 📋 |
| **CRM automation** | ❌ | ❌ | 📋 |
| **Custom domains** | ❌ | ❌ | 📋 |
| **Advanced analytics** | ❌ | ❌ | 📋 |

**Legend:**
- ✅ Available now
- ❌ Not included
- 📋 Planned for future release

---

## Upgrade Paths

### Starter → Checkout
**When to upgrade:**
- Ready to accept online payments
- Want automated order processing
- Need order tracking and management

**What changes:**
1. Set `"allowCheckout": true` in template settings
2. Add Stripe API keys to environment variables
3. Configure webhook endpoint with Stripe
4. Test checkout flow with Stripe test mode
5. Update product CTAs from offline to "Buy Now"

**Cost:** $29/month (Stripe fees apply separately)

### Checkout → Premium
**When to upgrade:**
- Need multiple pages (about, blog, resources)
- Want integrated scheduling and calendar
- Ready for CRM and email automation
- Want custom domain and advanced analytics

**What changes:**
1. All existing Checkout features remain active
2. Unlock multi-page builder in admin
3. Enable blog and CMS features
4. Connect scheduling and CRM integrations
5. Configure custom domain and SSL

**Cost:** TBD (join waitlist for early access pricing)

---

## Development Guidelines

### When Creating New Templates

1. **Determine the tier first:**
   - Service business with no payments? → Starter
   - Retail/online sales with payments? → Checkout
   - Multi-page with advanced features? → Premium (future)

2. **Set proper configuration:**
   - Always include `settings` object
   - Set `allowCheckout` correctly
   - Provide appropriate `productCta` and `productCtaHref`
   - Include upgrade messaging in `productNote` for Starter templates

3. **Update the index:**
   - Add entry to `public/data/templates/index.json`
   - Set correct `plan` property
   - Include 3-5 descriptive features
   - Use consistent naming and descriptions

4. **Test thoroughly:**
   - Verify offline CTAs work (Starter)
   - Test Stripe checkout flow (Checkout)
   - Confirm admin editor works
   - Check mobile responsiveness

---

## Questions?

For implementation questions or feature requests, refer to:
- Main site marketing: `public/data/site.json`
- Template index: `public/data/templates/index.json`
- Setup page: `public/setup.html`
- Server logic: `server.js`
- Client rendering: `public/app.js`

Last updated: October 31, 2025

