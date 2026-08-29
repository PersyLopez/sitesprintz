/**
 * Tests for sectionHtmlBridge — SSR bridge between layoutRenderer and HTML output.
 *
 * Verifies:
 *   1. Every section type produced by composePage() returns non-null HTML
 *   2. Token-aware inline styles use tokens.theme.bg/text/accent
 *   3. Unknown section types render a placeholder div, never null
 *   4. Delegates to SectionHtmlBuilder for types it handles
 */

import { describe, it, expect, vi } from 'vitest';
import { renderSectionToHtml, ALL_SECTION_TYPES, withNativeBookingTokens } from '../../src/utils/sectionHtmlBridge';
import { buildLiveSiteMarkup } from '../../src/utils/publishedSiteDocument';
import * as liveSiteContact from '../../src/utils/liveSiteContact';

// Minimal tokens for testing
const tokens = {
  theme: {
    bg: '#0c0c0e',
    text: '#f4f2ee',
    accent: '#c2683a',
    muted: '#8a8a8f',
    surface: '#141417',
    hairline: 'rgba(244,242,238,.10)',
  },
};

// All section types the bridge must handle
const EXPECTED_TYPES = [
  'hero',
  'services',
  'about',
  'gallery',
  'before-after',
  'team',
  'testimonials',
  'faq',
  'credentials',
  'contact',
  'catalog',
  'booking',
  'reviews',
  'stats',
  'menu',
  'service-areas',
  'process',
  'case-studies',
  'industries',
  'how-to-order',
  'hours',
  'location',
  'social',
  'native-booking',
  'checkout',
  'placeholder',
];

describe('sectionHtmlBridge', () => {
  describe('renderSectionToHtml returns non-null HTML for every section type', () => {
    for (const type of EXPECTED_TYPES) {
      it(`produces non-null HTML for type: ${type}`, () => {
        const section = makeSection(type);
        const html = renderSectionToHtml(section, tokens);
        expect(html).toBeTruthy();
        expect(typeof html).toBe('string');
        expect(html.length).toBeGreaterThan(0);
      });
    }
  });

  it('ALL_SECTION_TYPES exports the expected types', () => {
    expect(ALL_SECTION_TYPES).toContain('hero');
    expect(ALL_SECTION_TYPES).toContain('catalog');
    expect(ALL_SECTION_TYPES).toContain('how-to-order');
    expect(ALL_SECTION_TYPES).toContain('placeholder');
  });

  it('marks composed sections for inline editing', () => {
    const html = renderSectionToHtml(makeSection('hero'), tokens);
    expect(html).toContain('data-ss-edit-type="hero"');
  });

  it('services section exposes catalog anchors when native booking is on', () => {
    const html = renderSectionToHtml(makeSection('services'), { ...tokens, _nativeBooking: true });
    expect(html).toContain('id="services"');
    expect(html).toContain('data-ss-book-service');
    expect(html).toContain('data-service-id');
    expect(html).toContain('data-service-name');
    expect(html).toContain('href="#booking"');
    expect(html).toContain('>Book</a>');
  });

  it('services section omits Book when native booking is off', () => {
    const html = renderSectionToHtml(makeSection('services'), tokens);
    expect(html).toContain('id="services"');
    expect(html).not.toContain('data-ss-book-service');
  });

  it('withNativeBookingTokens respects scheduling flag in site data', () => {
    const sections = [{ type: 'booking', enabled: true, content: { enabled: true, provider: 'native' } }];
    const on = withNativeBookingTokens(tokens, sections, { _features: { booking: { enabled: true } } });
    const off = withNativeBookingTokens(tokens, sections, { _features: { booking: { enabled: false } } });
    expect(on._nativeBooking).toBe(true);
    expect(off._nativeBooking).toBe(false);
  });

  it('uses tokens for inline styles on non-delegated types', () => {
    const section = makeSection('catalog');
    const html = renderSectionToHtml(section, tokens);
    expect(html).toContain(tokens.theme.bg);
    expect(html).toContain(tokens.theme.accent);
  });

  it('renders unknown types as placeholder, never null', () => {
    const section = { type: 'nonexistent-widget', content: {} };
    const html = renderSectionToHtml(section, tokens);
    expect(html).toBeTruthy();
    expect(html).toContain('placeholder');
  });

  it('handles missing tokens gracefully', () => {
    const section = makeSection('hero');
    const html = renderSectionToHtml(section, null);
    expect(html).toBeTruthy();
  });

  it('handles missing content gracefully', () => {
    const section = { type: 'services', content: null };
    const html = renderSectionToHtml(section, tokens);
    expect(html).toBeTruthy();
  });

  it('uses accentValue hex when accent is a token key', () => {
    const html = renderSectionToHtml(makeSection('hero'), {
      theme: { ...tokens.theme, accent: 'studio', accentValue: '#7c2d2d' },
    });
    expect(html).toContain('#7c2d2d');
    expect(html).not.toMatch(/background:[^;]*studio/);
  });

  it('renders a hero background image', () => {
    const html = renderSectionToHtml({
      type: 'hero',
      content: { title: 'Hello', image: 'https://example.com/hero.jpg' },
    }, tokens);
    expect(html).toContain('https://example.com/hero.jpg');
    expect(html).toContain('ss-hero');
  });

  it('renders labeled photo inserts when images are missing', () => {
    const hero = renderSectionToHtml({ type: 'hero', content: { title: 'Hello' } }, tokens);
    expect(hero).toContain('Use your business photo here');
    expect(hero).toContain('ss-hero--photo');
    expect(hero).toContain('/assets/hero-placeholder.jpg');
    expect(hero).toContain('ss-photo-placeholder-img');
    expect(hero).toContain('data-photo-field="hero.image"');
    expect(hero).not.toContain('unsplash.com');

    const services = renderSectionToHtml({
      type: 'services',
      content: { items: [{ name: 'Cut', price: '45' }] },
    }, tokens);
    expect(services).toContain('Use a photo of this service here');
    expect(services).toContain('/assets/hero-placeholder.jpg');

    const catalog = renderSectionToHtml({
      type: 'catalog',
      content: { items: [{ name: 'Mug', price: '$24' }] },
    }, tokens);
    expect(catalog).toContain('Use your product photo here');
  });

  it('keeps an owner photo URL instead of the sample insert', () => {
    const html = renderSectionToHtml({
      type: 'hero',
      content: { title: 'Hello', image: 'https://cdn.example.com/shop.jpg' },
    }, tokens);
    expect(html).toContain('https://cdn.example.com/shop.jpg');
    expect(html).not.toContain('data-testid="photo-placeholder"');
  });

  it('fills team and before-after holes with sample inserts', () => {
    const team = renderSectionToHtml({
      type: 'team',
      content: { members: [{ name: 'Jane', role: 'Lead' }] },
    }, tokens);
    expect(team).toContain('ss-photo-placeholder--avatar');
    expect(team).toContain('Use a photo of this person here');

    const beforeAfter = renderSectionToHtml({
      type: 'before-after',
      content: { title: 'Transformations', pairs: [] },
    }, tokens);
    expect(beforeAfter).toContain('data-testid="photo-placeholder"');
    expect(beforeAfter).toContain('/assets/hero-placeholder.jpg');
    expect(beforeAfter).not.toContain('unsplash.com');
  });

  it('buildLiveSiteMarkup includes nav brand and labeled photo slots', () => {
    const { html, css } = buildLiveSiteMarkup({
      businessName: 'Harbor Goods',
      brand: { name: 'Harbor Goods' },
      nav: [{ label: 'Shop', href: '#catalog' }],
      _layout: 'mercantile',
      _niche: 'product-showcase',
      _level: 'studio',
      hero: { title: 'Harbor Goods', subtitle: 'Objects with soul', image: 'https://example.com/h.jpg' },
      products: [{ name: 'Mug', price: '$24', description: 'Handmade' }],
      contact: { email: 'shop@harbor.test' },
    });
    expect(css).toContain('--ss-accent');
    expect(html).toContain('Harbor Goods');
    expect(html).toContain('Shop');
    expect(html).toContain('data-testid="photo-placeholder"');
    expect(html).toContain('Use your product photo here');
  });

  it('embeds a booking mount for native scheduling', () => {
    const html = renderSectionToHtml({
      type: 'booking',
      content: { title: 'Book a visit', enabled: true },
    }, tokens);
    expect(html).toContain('data-ss-booking-mount');
    expect(html).toContain('id="booking"');
    expect(html).toContain(tokens.theme.accent);
  });

  it('keeps a link-only booking CTA without a widget mount', () => {
    const html = renderSectionToHtml({
      type: 'booking',
      content: { title: 'Book', mode: 'link', url: 'https://cal.example/book' },
    }, tokens);
    expect(html).not.toContain('data-ss-booking-mount');
    expect(html).toContain('https://cal.example/book');
    expect(html).toContain('Book Now');
  });

  it('renders an iframe for external Acuity booking', () => {
    const html = renderSectionToHtml({
      type: 'booking',
      content: {
        title: 'Book',
        provider: 'acuity',
        url: 'https://dhmakeupartistry.as.me/schedule/8ffea782',
      },
    }, tokens);
    expect(html).not.toContain('data-ss-booking-mount');
    expect(html).toContain('data-testid="live-booking-embed"');
    expect(html).toContain('https://dhmakeupartistry.as.me/schedule/8ffea782?embed=true');
  });

  it('uses a booking link instead of an iframe when mode is link', () => {
    const html = renderSectionToHtml({
      type: 'booking',
      content: {
        title: 'Book',
        provider: 'acuity',
        mode: 'link',
        url: 'https://dhmakeupartistry.as.me/schedule/8ffea782',
      },
    }, tokens);
    expect(html).not.toContain('iframe');
    expect(html).not.toContain('data-testid="live-booking-embed"');
    expect(html).toContain('https://dhmakeupartistry.as.me/schedule/8ffea782');
    expect(html).toContain('id="booking"');
  });

  it('uses booking section description for link-only copy', () => {
    const html = renderSectionToHtml({
      type: 'booking',
      content: {
        title: 'Book',
        mode: 'link',
        url: 'https://cal.example/book',
        description: 'Deposits are non-refundable.',
      },
    }, tokens);
    expect(html).toContain('Deposits are non-refundable.');
    expect(html).not.toContain('we will confirm your appointment');
  });

  it('adds add-to-cart buttons when catalog is purchasable', () => {
    const html = renderSectionToHtml({
      type: 'catalog',
      content: {
        title: 'Shop',
        purchasable: true,
        items: [{ name: 'Mug', price: '$24', description: 'Handmade' }],
      },
    }, tokens);
    expect(html).toContain('data-ss-add-to-cart');
    expect(html).toContain('data-product-price="24"');
    expect(html).toContain('Add to cart');
  });

  it('renders a working contact form', () => {
    const html = renderSectionToHtml({
      type: 'contact',
      content: { title: 'Contact Us', email: 'a@b.com', phone: '555' },
    }, tokens);
    expect(html).toContain('id="contact-form"');
    expect(html).toContain('data-type="contact"');
    expect(html).toContain('data-testid="contact-form-submit"');
    expect(html).toContain('name="message"');
  });

  it('renders review quotes instead of a placeholder', () => {
    const html = renderSectionToHtml({
      type: 'reviews',
      content: {
        title: 'Reviews',
        items: [{ quote: 'Loved it', author: 'Sam' }],
      },
    }, tokens);
    expect(html).toContain('Loved it');
    expect(html).toContain('Sam');
    expect(html).not.toContain('will load here');
  });

  it('omits add-to-cart when catalog is not purchasable', () => {
    const html = renderSectionToHtml({
      type: 'catalog',
      content: {
        title: 'Shop',
        items: [{ name: 'Mug', price: '$24' }],
      },
    }, tokens);
    expect(html).not.toContain('data-ss-add-to-cart');
  });

  it('live markup includes add-to-cart when checkout is allowed', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Harbor Goods',
      brand: { name: 'Harbor Goods' },
      _layout: 'mercantile',
      _niche: 'product-showcase',
      _level: 'studio',
      settings: { allowCheckout: true },
      products: [{ name: 'Mug', price: 24, description: 'Handmade' }],
      contact: { email: 'shop@harbor.test' },
    });
    expect(html).toContain('data-ss-add-to-cart');
    expect(html).toContain('Mug');
  });

  it('omits empty team placeholders instead of showing No team members listed', () => {
    const html = renderSectionToHtml({ type: 'team', content: { title: 'Our Team', members: [] } }, tokens);
    expect(html).toBe('');
    expect(html).not.toContain('No team members listed');
  });

  it('titles a single named person as About', () => {
    const html = renderSectionToHtml({
      type: 'team',
      content: { title: 'Our Team', members: [{ name: 'Ada', role: 'Owner' }] },
    }, tokens);
    expect(html).toContain('About');
    expect(html).toContain('Ada');
    expect(html).not.toContain('Our Team');
  });

  it('renders social links for instagram and whatsapp', () => {
    const html = renderSectionToHtml({
      type: 'social',
      content: {
        title: 'Find us',
        instagram: 'https://instagram.com/shop',
        whatsapp: '1 (555) 123-4567',
      },
    }, tokens);
    expect(html).toContain('ss-social');
    expect(html).toContain('Find us');
    expect(html).toContain('https://instagram.com/shop');
    expect(html).toContain('Instagram');
    expect(html).toContain('https://wa.me/15551234567');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).not.toContain('Facebook');
  });

  it('uses a WhatsApp URL as-is and labels maps distinctly', () => {
    const html = renderSectionToHtml({
      type: 'social',
      content: {
        whatsapp: 'https://wa.me/15559876543',
        maps: 'https://maps.google.com/?q=shop',
      },
    }, tokens);
    expect(html).toContain('https://wa.me/15559876543');
    expect(html).toContain('Find us on the map');
    expect(html).not.toContain('Facebook');
  });

  it('mounts a Google reviews widget when placeId is set', () => {
    const html = renderSectionToHtml({
      type: 'reviews',
      content: { title: 'Reviews', placeId: 'ChIJ-test', items: [] },
    }, tokens);
    expect(html).toContain('data-testid="reviews-widget"');
    expect(html).toContain('data-place-id="ChIJ-test"');
  });
});

describe('buildLiveSiteMarkup conversion chrome', () => {
  it('renders a sticky Call + Book bar for salon with a phone', () => {
    const { html, css } = buildLiveSiteMarkup({
      businessName: 'Studio Luxe',
      contactPhone: '555-0100',
      _layout: 'atelier',
      _niche: 'salon',
      _level: 'solo',
      sections: [
        { type: 'hero', enabled: true, content: { title: 'Studio Luxe' } },
        { type: 'contact', enabled: true, content: { phone: '555-0100' } },
        { type: 'booking', enabled: true, content: { enabled: true } },
      ],
    });
    expect(html).toContain('data-testid="sticky-cta-bar"');
    expect(html).toContain('data-testid="sticky-cta-call"');
    expect(html).toContain('tel:5550100');
    expect(html).toContain('data-testid="sticky-cta-book"');
    expect(css).toContain('.ss-sticky-cta');
    expect(html).toContain('data-testid="header-cta"');
    expect(html).toContain('data-testid="header-call"');
    expect(html).toContain('Skip to content');
    expect(html).toContain('id="main"');
    expect(css).toContain('.ss-nav-actions');
    expect(css).toContain('.ss-nav-cta');
  });

  it('keeps header actions visible on small screens when page links hide', () => {
    const { css } = buildLiveSiteMarkup({
      businessName: 'Studio Luxe',
      contactPhone: '555-0100',
      _layout: 'atelier',
      _niche: 'salon',
      _level: 'solo',
      sections: [{ type: 'hero', enabled: true, content: { title: 'Studio Luxe' } }],
    });
    expect(css).toMatch(/@media \(max-width: 800px\)[\s\S]*\.ss-nav-links \{ display: none; \}/);
    expect(css).not.toMatch(/@media \(max-width: 800px\)[\s\S]*\.ss-nav-actions \{ display: none/);
  });

  it('puts hours, address, and tap-to-call in the hero', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Studio Luxe',
      contactPhone: '555-0100',
      contactAddress: '12 Maple St',
      businessHours: 'Tue–Sat 10am–7pm',
      _layout: 'atelier',
      _niche: 'salon',
      _level: 'solo',
      sections: [
        { type: 'hero', enabled: true, content: { title: 'Studio Luxe' } },
        { type: 'contact', enabled: true, content: { phone: '555-0100' } },
      ],
    });
    expect(html).toContain('data-testid="hero-hours"');
    expect(html).toContain('Tue–Sat 10am–7pm');
    expect(html).toContain('data-testid="hero-address"');
    expect(html).toContain('12 Maple St');
    expect(html).toContain('data-testid="hero-phone"');
    expect(html).toContain('tel:5550100');
  });

  it('keeps the SiteSprintz badge on Growth and still shows NAP in the footer', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Studio Luxe',
      contactPhone: '555-0100',
      contactAddress: '12 Maple St',
      plan: 'growth',
      settings: { removeBranding: true },
      _layout: 'atelier',
      _niche: 'salon',
      _level: 'solo',
      sections: [
        { type: 'hero', enabled: true, content: { title: 'Studio Luxe' } },
        { type: 'contact', enabled: true, content: { phone: '555-0100', address: '12 Maple St' } },
      ],
    });
    expect(html).toContain('data-testid="sitesprintz-badge"');
    expect(html).toContain('href="https://sitesprintz.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('Powered by SiteSprintz');
    expect(html).toContain('data-testid="footer-call"');
    expect(html).toContain('data-testid="footer-address"');
  });

  it('shows a service area line and map mount without the private street', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Studio Luxe',
      contact: {
        address: '99 Hidden Ln Unit 4B',
        addressDisplay: 'area',
        serviceAreaLabel: 'Montclair, NJ',
        serviceRadiusMiles: 10,
        publicGeo: { lat: 40.82, lng: -74.21 },
      },
      _layout: 'atelier',
      _niche: 'salon',
      _level: 'solo',
      sections: [
        { type: 'hero', enabled: true, content: { title: 'Studio Luxe' } },
        { type: 'contact', enabled: true, content: { phone: '555-0100' } },
      ],
    });
    expect(html).toContain('Serving Montclair, NJ');
    expect(html).toContain('data-testid="service-area-map"');
    expect(html).toContain('/vendor/service-area-map.js');
    expect(html).not.toContain('99 Hidden');
    expect(html).toContain('data-testid="footer-address"');
  });

  it('omits the map mount when publicGeo is missing', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Studio Luxe',
      contact: {
        address: '99 Hidden Ln Unit 4B',
        addressDisplay: 'area',
        serviceAreaLabel: 'Montclair, NJ',
        serviceRadiusMiles: 10,
      },
      _layout: 'atelier',
      sections: [
        { type: 'contact', enabled: true, content: { phone: '555-0100' } },
      ],
    });
    expect(html).not.toContain('data-testid="service-area-map"');
    expect(html).not.toContain('99 Hidden');
  });

  it('keeps the SiteSprintz badge on Starter', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Harbor Goods',
      plan: 'starter',
      _layout: 'mercantile',
      _niche: 'product-showcase',
      _level: 'solo',
      sections: [{ type: 'hero', enabled: true, content: { title: 'Harbor Goods' } }],
    });
    expect(html).toContain('data-testid="sitesprintz-badge"');
    expect(html).toContain('href="https://sitesprintz.com"');
    expect(html).toContain('Powered by SiteSprintz');
  });

  it('keeps the clickable badge on gallery demo seeds', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'The Grand Table',
      plan: 'growth',
      settings: { demoMode: true },
      _demo: true,
      _layout: 'hearth',
      _niche: 'restaurant',
      _level: 'solo',
      sections: [{ type: 'hero', enabled: true, content: { title: 'The Grand Table' } }],
    });
    expect(html).toContain('data-testid="sitesprintz-badge"');
    expect(html).toContain('href="https://sitesprintz.com"');
    expect(html).toContain('Powered by SiteSprintz');
    expect(html).toContain('class="ss-sitesprintz-badge"');
  });

  it('omits the badge when branding removal is enabled for the plan', () => {
    const spy = vi.spyOn(liveSiteContact, 'shouldRemoveBranding').mockReturnValue(true);
    const { html } = buildLiveSiteMarkup({
      businessName: 'Studio Luxe',
      plan: 'growth',
      _layout: 'atelier',
      sections: [{ type: 'hero', enabled: true, content: { title: 'Studio Luxe' } }],
    });
    expect(html).not.toContain('data-testid="sitesprintz-badge"');
    spy.mockRestore();
  });

  it('keeps a reviews section when only a Google placeId is present', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Riverside Cuts',
      _layout: 'atelier',
      _niche: 'salon',
      _level: 'established',
      features: { reviews: { enabled: true, placeId: 'ChIJ-salon' } },
      sections: [
        { type: 'hero', enabled: true, content: { title: 'Riverside Cuts' } },
        { type: 'reviews', enabled: true, content: { title: 'Reviews', items: [] } },
        { type: 'contact', enabled: true, content: { phone: '555-0100' } },
      ],
    });
    expect(html).toContain('data-testid="reviews-widget"');
    expect(html).toContain('ChIJ-salon');
  });

  it('does not publish Unsplash gallery URLs on customer sites', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Studio Luxe',
      _layout: 'atelier',
      _niche: 'salon',
      _level: 'solo',
      sections: [
        { type: 'hero', enabled: true, content: { title: 'Studio Luxe' } },
        {
          type: 'gallery',
          enabled: true,
          content: {
            title: 'Gallery',
            images: [{ src: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800', alt: 'Stock' }],
          },
        },
      ],
    });
    expect(html).not.toContain('unsplash.com');
    expect(html).toContain('data-testid="photo-placeholder"');
    expect(html).toContain('Use a photo of your work here');
    expect(html).toContain('/assets/hero-placeholder.jpg');
  });

  it('keeps Unsplash on demo seeds', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Demo Salon',
      _demo: true,
      _layout: 'atelier',
      _niche: 'salon',
      _level: 'solo',
      sections: [
        {
          type: 'gallery',
          enabled: true,
          content: {
            title: 'Gallery',
            images: [{ src: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800', alt: 'Demo' }],
          },
        },
      ],
    });
    expect(html).toContain('unsplash.com');
  });

  it('keeps Unsplash when gallery seed set settings.demoMode', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Demo Salon',
      settings: { demoMode: true },
      _layout: 'atelier',
      _niche: 'salon',
      _level: 'solo',
      sections: [
        {
          type: 'hero',
          enabled: true,
          content: {
            title: 'Demo Salon',
            image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200',
          },
        },
      ],
    });
    expect(html).toContain('https://images.unsplash.com/photo-1560066984-138dadb4c035');
    expect(html).toContain('class="ss-hero-photo"');
  });
});

// ---------------------------------------------------------------------------
// Helper: build a minimal section descriptor for a given type
// ---------------------------------------------------------------------------
function makeSection(type) {
  const contentByType = {
    hero: { title: 'Welcome', subtitle: 'Sub', ctaText: 'Go', ctaLink: '#go' },
    services: { title: 'Services', items: [{ name: 'A', description: 'Desc', price: '$10' }] },
    about: { title: 'About', body: 'Body text' },
    gallery: { title: 'Gallery', images: [{ src: '/img.jpg', alt: 'Photo' }] },
    'before-after': { title: 'Before/After', pairs: [{ before: '/b.jpg', after: '/a.jpg' }] },
    team: { title: 'Team', members: [{ name: 'Jane', role: 'Lead' }] },
    testimonials: { title: 'Testimonials', items: [{ text: 'Great', author: 'Bob', rating: 5 }] },
    faq: { title: 'FAQ', items: [{ question: 'Q?', answer: 'A.' }] },
    credentials: { title: 'Creds', items: [{ name: 'Cert', issuer: 'Org' }] },
    contact: { title: 'Contact', email: 'a@b.com', phone: '555', address: '123 St' },
    catalog: { title: 'Catalog', items: [{ name: 'Item', price: '$5' }] },
    booking: { title: 'Book', enabled: true },
    reviews: { title: 'Reviews', enabled: true },
    stats: { title: '', items: [{ value: '100+', label: 'Customers' }] },
    menu: { title: 'Menu', sections: [{ name: 'Mains', items: [{ name: 'Burger', price: '$10' }] }] },
    'service-areas': { title: 'Areas', areas: ['Downtown'] },
    process: { title: 'Process', steps: [{ title: 'Step 1' }] },
    'case-studies': { title: 'Cases', items: [{ title: 'Case 1' }] },
    industries: { title: 'Industries', items: ['Healthcare'] },
    'how-to-order': { title: 'How To', steps: ['Browse', 'Order'] },
    hours: { title: 'Hours', hours: 'Mon-Fri 9-5' },
    location: { title: 'Location', address: '123 Main St' },
    social: { title: 'Find us', instagram: 'https://instagram.com/shop', whatsapp: '15551234567' },
    'native-booking': { title: 'Book', enabled: true },
    checkout: { enabled: true },
    placeholder: {},
  };

  return {
    type,
    content: contentByType[type] || {},
    settings: {},
  };
}
