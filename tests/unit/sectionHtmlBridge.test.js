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
import { buildLiveSiteMarkup, renderPublishedViewFragment } from '../../src/utils/publishedSiteDocument';
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
  'zip-checker',
  'interactive-calculator',
  'diagnostic-quiz',
  'progress-tracker',
  'video-gallery',
  'class-scheduler',
  'subscription-booking',
  'service-filters',
  'multi-step-form',
  'enhanced-profiles',
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
    expect(services).toContain('data-testid="photo-placeholder"');
    expect(services).toContain('Example of Cut — use your photo here');
    expect(services).toContain('/assets/hero-placeholder.jpg');
    expect(services).not.toContain('ss-card-media');

    const oilService = renderSectionToHtml({
      type: 'services',
      content: { items: [{ name: 'Oil changes', price: 'from $39' }] },
    }, tokens);
    expect(oilService).toContain('/assets/service-inserts/oil.jpg');
    expect(oilService).toContain('ss-card-media');
    expect(oilService).not.toContain('photo-placeholder');
    expect(oilService).not.toContain('Example of Oil changes');
    expect(oilService).not.toMatch(/unsplash/i);

    const mufflerService = renderSectionToHtml({
      type: 'services',
      content: { items: [{ name: 'Muffler', price: '' }, { name: 'Oil changes', price: '' }] },
    }, tokens);
    expect(mufflerService).toContain('/assets/service-inserts/muffler.jpg');
    expect(mufflerService).toContain('/assets/service-inserts/oil.jpg');
    expect(mufflerService).toContain('ss-card-media');
    expect(mufflerService).not.toContain('photo-placeholder');
    expect(mufflerService).not.toContain('Example of Muffler');
    expect(mufflerService).not.toContain('Example of Oil changes');

    const hairCareService = renderSectionToHtml({
      type: 'services',
      content: { items: [{ name: 'Hair care / haircuts' }] },
    }, tokens);
    expect(hairCareService).toContain('/assets/service-inserts/hair-care.jpg');
    expect(hairCareService).not.toMatch(/\/assets\/service-inserts\/haircut\.(jpg|svg)/);
    expect(hairCareService).toContain('ss-card-media');
    expect(hairCareService).not.toContain('photo-placeholder');

    const haircutService = renderSectionToHtml({
      type: 'services',
      content: { items: [{ name: 'Haircut' }] },
    }, tokens);
    expect(haircutService).toContain('/assets/service-inserts/haircut.jpg');
    expect(haircutService).toContain('ss-card-media');
    expect(haircutService).not.toContain('photo-placeholder');

    const catalog = renderSectionToHtml({
      type: 'catalog',
      content: { items: [{ name: 'Mug', price: '$24' }] },
    }, tokens);
    expect(catalog).toContain('data-testid="photo-placeholder"');
    expect(catalog).toContain('data-photo-field="catalog.items.0.image"');
    expect(catalog).toContain('ss-photo-placeholder');
    expect(catalog).toContain('Use your product photo here');
    expect(catalog).not.toContain('/assets/service-inserts/');

    const menuDish = renderSectionToHtml({
      type: 'catalog',
      content: { items: [{ name: 'Chicken over rice', price: '$12' }] },
    }, tokens);
    expect(menuDish).toContain('data-testid="photo-placeholder"');
    expect(menuDish).not.toContain('/assets/service-inserts/');
    expect(menuDish).toContain('Chicken over rice');
    expect(menuDish).toContain('/assets/hero-placeholder.jpg');
  });

  it('keeps menu section names and diet labels on the catalog', () => {
    const html = renderSectionToHtml({
      type: 'catalog',
      content: {
        title: 'Menu',
        items: [
          { name: 'Tuna Tartare', price: 18, _category: 'Appetizers', _categoryDescription: 'Starters', dietary: ['Pescatarian'] },
          { name: 'Halibut', price: 42, _category: 'Entrées', dietary: ['Gluten-Free'], image: '/uploads/halibut.jpg', imageAlt: 'Halibut' },
        ],
      },
    }, tokens);
    expect(html.indexOf('Appetizers')).toBeLessThan(html.indexOf('Tuna Tartare'));
    expect(html.indexOf('Tuna Tartare')).toBeLessThan(html.indexOf('Entrées'));
    expect(html).toContain('Starters');
    expect(html).toContain('Pescatarian');
    expect(html).toContain('Gluten-Free');
    expect(html).toContain('src="/uploads/halibut.jpg"');
    expect(html).toContain('width="400" height="220"');
    expect(html).not.toContain('photo-placeholder');
    expect(html).not.toContain('hero-placeholder.jpg');
  });

  it('reserves space for service, gallery, about, and before-after photos', () => {
    const service = renderSectionToHtml({
      type: 'services',
      content: { items: [{ name: 'Haircut', image: '/uploads/cut.jpg' }] },
    }, tokens);
    expect(service).toContain('width="400" height="220"');

    const gallery = renderSectionToHtml({
      type: 'gallery',
      content: { images: [{ src: '/uploads/shop.jpg', alt: 'Shop' }] },
    }, tokens);
    expect(gallery).toContain('width="400" height="240"');

    const about = renderSectionToHtml({
      type: 'about',
      content: { title: 'About', image: '/uploads/about.jpg' },
    }, tokens);
    expect(about).toContain('width="640" height="280"');

    const work = renderSectionToHtml({
      type: 'before-after',
      content: { pairs: [{ before: '/uploads/before.jpg', after: '/uploads/after.jpg' }] },
    }, tokens);
    expect(work).toContain('alt="Before" width="800" height="600"');
    expect(work).toContain('alt="After" width="800" height="600"');
  });

  it('keeps an owner photo URL instead of the sample insert', () => {
    const html = renderSectionToHtml({
      type: 'hero',
      content: { title: 'Hello', image: 'https://cdn.example.com/shop.jpg' },
    }, tokens);
    expect(html).toContain('https://cdn.example.com/shop.jpg');
    expect(html).not.toContain('data-testid="photo-placeholder"');

    const service = renderSectionToHtml({
      type: 'services',
      content: { items: [{ name: 'Haircut', image: 'https://cdn.example.com/cut.jpg' }] },
    }, tokens);
    expect(service).toContain('https://cdn.example.com/cut.jpg');
    expect(service).toContain('ss-card-media');
    expect(service).not.toContain('data-testid="photo-placeholder"');
    expect(service).not.toContain('/assets/service-inserts/haircut.jpg');
  });

  it('formats numeric catalog prices as dollar amounts', () => {
    const html = renderSectionToHtml({
      type: 'catalog',
      content: { items: [{ name: 'Mug', price: 20 }] },
    }, tokens);
    expect(html).toContain('$20');
  });

  it('lazy-loads real team and before-after photos', () => {
    const team = renderSectionToHtml({
      type: 'team',
      content: { members: [{ name: 'Jane', role: 'Lead', photo: '/jane.jpg' }] },
    }, tokens);
    expect(team).toContain('src="/jane.jpg"');
    expect(team).toContain('loading="lazy"');
    expect(team).toContain('decoding="async"');

    const beforeAfter = renderSectionToHtml({
      type: 'before-after',
      content: { pairs: [{ before: '/b.jpg', after: '/a.jpg' }] },
    }, tokens);
    expect(beforeAfter).toContain('src="/b.jpg"');
    expect(beforeAfter).toContain('src="/a.jpg"');
    expect((beforeAfter.match(/loading="lazy"/g) || []).length).toBe(2);
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
    expect(html).toContain('data-photo-field="catalog.items.0.image"');
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

  it('keeps an external scheduler unloaded until the visitor asks', () => {
    const html = renderSectionToHtml({
      type: 'booking',
      content: {
        title: 'Book',
        provider: 'acuity',
        url: 'https://dhmakeupartistry.as.me/schedule/8ffea782',
      },
    }, tokens);
    expect(html).not.toContain('data-ss-booking-mount');
    expect(html).not.toContain('<iframe');
    expect(html).toContain('data-testid="booking-embed-open"');
    expect(html).toContain('data-embed-src="https://dhmakeupartistry.as.me/schedule/8ffea782?embed=true"');
  });

  it('links an unknown scheduler instead of framing it', () => {
    const html = renderSectionToHtml({
      type: 'booking',
      content: {
        title: 'Book',
        provider: 'custom',
        url: 'https://example.com/book',
      },
    }, tokens);
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('data-embed-src');
    expect(html).toContain('href="https://example.com/book"');
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
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/api/submissions/contact"');
    expect(html).toContain('name="subdomain" value=""');
  });

  it('stamps the shop subdomain on the contact form', () => {
    const html = renderSectionToHtml({
      type: 'contact',
      content: { title: 'Contact Us' },
    }, { ...tokens, _contactSubdomain: 'gallery-salon' });
    expect(html).toContain('name="subdomain" value="gallery-salon"');
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

  it('links Yelp and Pinterest when the shop stored them', () => {
    const html = renderSectionToHtml({
      type: 'social',
      content: {
        yelp: 'https://yelp.com/biz/shop',
        pinterest: 'https://pinterest.com/shop',
      },
    }, tokens);
    expect(html).toContain('https://yelp.com/biz/shop');
    expect(html).toContain('Yelp');
    expect(html).toContain('https://pinterest.com/shop');
    expect(html).toContain('Pinterest');
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
    expect(html).toContain('data-testid="language-switcher"');
    expect(html).toContain('data-testid="language-switcher-en"');
    expect(html).toContain('data-testid="language-switcher-es"');
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

  it('keeps the Right Site Light badge on Growth and still shows NAP in the footer', () => {
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
    expect(html).toContain('href="https://rightsitelight.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('Powered by Right Site Light');
    expect(html).toContain('data-testid="footer-call"');
    expect(html).toContain('data-testid="footer-address"');
  });

  it('applies Spanish overlay and marks ES active on the live switcher', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Plants & Threads',
      brand: { name: 'Plants & Threads' },
      _layout: 'mercantile',
      _niche: 'product-showcase',
      _level: 'solo',
      sections: [{
        type: 'hero',
        enabled: true,
        content: { title: 'Plants & Threads', subtitle: 'Plants for sale and sewing services.' },
      }],
      locales: {
        es: {
          strings: {
            'sections.0.content.subtitle': 'Plantas a la venta y servicios de costura.',
          },
        },
      },
    }, { locale: 'es' });
    expect(html).toContain('Plantas a la venta y servicios de costura.');
    expect(html).toContain('data-ss-lang="es"');
    expect(html).toMatch(/data-testid="language-switcher-es"[^>]*aria-pressed="true"/);
    expect(html).not.toContain('Plants for sale and sewing services.');
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

  it('keeps the Right Site Light badge on Starter', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Harbor Goods',
      plan: 'starter',
      _layout: 'mercantile',
      _niche: 'product-showcase',
      _level: 'solo',
      sections: [{ type: 'hero', enabled: true, content: { title: 'Harbor Goods' } }],
    });
    expect(html).toContain('data-testid="sitesprintz-badge"');
    expect(html).toContain('href="https://rightsitelight.com"');
    expect(html).toContain('Powered by Right Site Light');
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
    expect(html).toContain('href="https://rightsitelight.com"');
    expect(html).toContain('Powered by Right Site Light');
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

  it('builds a first-paint fragment from the same composition', () => {
    const fragment = renderPublishedViewFragment({
      subdomain: 'trial-shop',
      data: {
        businessName: 'Trial Shop',
        _layout: 'atelier',
        _niche: 'salon',
        _level: 'solo',
        sections: [{ type: 'hero', content: { title: 'Trial Shop' } }],
      },
    });
    expect(fragment).toContain('id="ss-prerender"');
    expect(fragment).toContain('class="ss-live"');
    expect(fragment).toContain('Trial Shop');
    expect(renderPublishedViewFragment(null)).toBe('');
  });

  it('lists hours and the note on the hours and contact sections', () => {
    const hours = renderSectionToHtml({
      type: 'hours',
      content: {
        title: 'Hours',
        lines: ['Tuesday - Friday: 9:00 AM - 8:00 PM', 'Monday: Closed'],
        note: 'Appointments required',
      },
    }, tokens);
    expect(hours).toContain('<li');
    expect(hours).toContain('Monday: Closed');
    expect(hours).toContain('Appointments required');
    expect(hours).not.toContain('[object Object]');

    const contact = renderSectionToHtml({
      type: 'contact',
      content: {
        email: 'hello@shop.test',
        hours: 'Tuesday - Friday: 9:00 AM - 8:00 PM',
        hoursNote: 'Appointments required',
      },
    }, tokens);
    expect(contact).toContain('Appointments required');
  });

  it('shows an owner dish photo and the diet, not a stock plate', () => {
    const html = renderSectionToHtml({
      type: 'menu',
      content: {
        title: 'Menu',
        sections: [{
          name: 'Appetizers',
          items: [{
            name: 'Tuna Tartare',
            price: 18,
            image: '/uploads/tartare.jpg',
            imageAlt: 'Tuna tartare',
            dietary: ['Pescatarian'],
          }],
        }],
      },
    }, tokens);
    expect(html).toContain('src="/uploads/tartare.jpg"');
    expect(html).toContain('width="400" height="220"');
    expect(html).toContain('Pescatarian');
    expect(html).not.toContain('unsplash.com');
  });

  it('renders credentials and a photo slot instead of a stock portrait', () => {
    const html = renderSectionToHtml({
      type: 'enhanced-profiles',
      content: {
        title: 'Meet Our Groomers',
        showCredentials: true,
        showSpecializations: true,
        profiles: [{
          name: 'Emily Johnson',
          title: 'Master Groomer',
          bio: 'Certified master groomer',
          image: '',
          credentials: ['Fear-Free Certified'],
          specializations: ['Anxious Pets'],
        }],
      },
    }, tokens);
    expect(html).toContain('data-testid="profile-card"');
    expect(html).toContain('Emily Johnson');
    expect(html).toContain('Fear-Free Certified');
    expect(html).toContain('Anxious Pets');
    expect(html).toContain('ss-photo-placeholder');
    expect(html).not.toContain('unsplash.com');
    expect(html).not.toContain('555');
  });

  it('renders inquiry steps that post to the contact inbox', () => {
    const html = renderSectionToHtml({
      type: 'multi-step-form',
      content: {
        title: 'Private Dining Inquiry',
        steps: [
          {
            title: 'Event Details',
            fields: [{ name: 'eventType', label: 'Event Type', type: 'select', required: true, options: [{ value: 'Corporate Event' }], placeholder: '', min: null, max: null }],
          },
          {
            title: 'Contact Information',
            fields: [{ name: 'contactEmail', label: 'Email Address', type: 'email', required: true, options: [], placeholder: '', min: null, max: null }],
          },
        ],
      },
    }, { ...tokens, _contactSubdomain: 'gallery-restaurant' });
    expect(html).toContain('data-testid="inquiry-form"');
    expect(html).toContain('action="/api/submissions/contact"');
    expect(html).toContain('name="type" value="inquiry"');
    expect(html).toContain('value="gallery-restaurant"');
    expect(html).toContain('data-testid="inquiry-step"');
    expect(html).toContain('name="eventType"');
    expect(html).toContain('name="email"');
    expect(html).toContain('Corporate Event');
    expect(html).toContain('data-ss-step-next');
    expect(html).not.toContain('console.log');
  });

  it('renders menu filters that hide items in the browser', () => {
    const html = renderSectionToHtml({
      type: 'service-filters',
      content: {
        title: 'Filter Menu',
        items: [{
          name: 'Vegan Power Bowl',
          price: 24,
          category: 'Main Course',
          dietary: ['vegan', 'gluten-free'],
          petType: [],
        }],
        groups: [{
          key: 'dietary',
          label: 'Dietary Restrictions',
          options: [{ value: 'vegan', label: 'Vegan' }],
        }],
      },
    }, tokens);
    expect(html).toContain('data-testid="filter-list"');
    expect(html).toContain('data-dietary="vegan|gluten-free"');
    expect(html).toContain('Dietary Restrictions');
    expect(html).toContain('Vegan Power Bowl');
    expect(html).toContain('items[i].hidden');
    expect(html).not.toContain('console.log');
  });

  it('lists plans and posts a request without a checkout', () => {
    const html = renderSectionToHtml({
      type: 'subscription-booking',
      content: {
        title: 'Maintenance Plans',
        plans: [{ name: 'Basic Maintenance Plan', price: 199, description: 'Annual inspection' }],
        frequencies: [{ label: 'Annual', discount: 15 }],
      },
    }, { ...tokens, _contactSubdomain: 'gallery-plumbing' });
    expect(html).toContain('data-testid="plan-request-form"');
    expect(html).toContain('action="/api/submissions/contact"');
    expect(html).toContain('name="type" value="plan-request"');
    expect(html).toContain('value="gallery-plumbing"');
    expect(html).toContain('Basic Maintenance Plan — $199');
    expect(html).toContain('Annual (15% off)');
    expect(html).toContain('Request this plan');
    expect(html).not.toContain('checkout');
  });

  it('lists classes and posts a spot request', () => {
    const html = renderSectionToHtml({
      type: 'class-scheduler',
      content: {
        title: 'Class Schedule',
        classes: [{
          name: 'Strength Foundations',
          time: '6:00 AM',
          daysOfWeek: [1, 3, 5],
          instructor: 'Mike Rodriguez',
        }],
      },
    }, { ...tokens, _contactSubdomain: 'gallery-gym' });
    expect(html).toContain('data-testid="class-request-form"');
    expect(html).toContain('action="/api/submissions/contact"');
    expect(html).toContain('name="type" value="class-request"');
    expect(html).toContain('value="gallery-gym"');
    expect(html).toContain('Strength Foundations — Mon, Wed, Fri · 6:00 AM');
    expect(html).toContain('Mike Rodriguez');
    expect(html).not.toContain('booked');
  });

  it('links a workout video without embedding it', () => {
    const html = renderSectionToHtml({
      type: 'video-gallery',
      content: {
        title: 'On-Demand Workout Library',
        videos: [
          { title: '20-Minute HIIT Workout', provider: 'youtube', videoId: 'dQw4w9WgXcQ', duration: '20 min', category: 'HIIT' },
          { title: 'Notes only', provider: 'youtube', videoId: 'not-an-id' },
        ],
      },
    }, tokens);
    expect(html).toContain('data-testid="video-library"');
    expect(html).toContain('20-Minute HIIT Workout');
    expect(html).toContain('href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('not-an-id');
  });

  it('renders repair stages and marks the current one', () => {
    const html = renderSectionToHtml({
      type: 'progress-tracker',
      content: {
        title: 'Track Your Repair',
        currentStatus: 'confirmed',
        stages: [
          { id: 'pending', label: 'Pending', description: 'Request received' },
          { id: 'confirmed', label: 'Confirmed', description: 'Repair is scheduled' },
        ],
      },
    }, tokens);
    expect(html).toContain('data-testid="repair-progress"');
    expect(html).toContain('Track Your Repair');
    expect(html).toContain('Request received');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('Confirmed');
  });

  it('renders a diagnostic quiz that posts an estimate', () => {
    const html = renderSectionToHtml({
      type: 'diagnostic-quiz',
      content: {
        title: 'Device Diagnostic Tool',
        questions: [{
          title: "What's the problem?",
          options: [{ label: 'Cracked screen', price: 150 }],
        }],
      },
    }, { ...tokens, _contactSubdomain: 'gallery-repair' });
    expect(html).toContain('data-testid="diagnostic-quote-form"');
    expect(html).toContain('action="/api/submissions/contact"');
    expect(html).toContain('name="type" value="diagnostic-quote"');
    expect(html).toContain('value="gallery-repair"');
    expect(html).toContain('name="answer_0"');
    expect(html).toContain('data-price="150"');
    expect(html).toContain('Cracked screen — $150');
  });

  it('renders a package calculator that posts a quote', () => {
    const html = renderSectionToHtml({
      type: 'interactive-calculator',
      content: {
        title: 'Build Your Package',
        items: [{ name: 'Haircut', price: 75, description: 'Cut and style' }],
      },
    }, { ...tokens, _contactSubdomain: 'gallery-salon' });
    expect(html).toContain('data-testid="package-quote-form"');
    expect(html).toContain('action="/api/submissions/contact"');
    expect(html).toContain('name="type" value="package-quote"');
    expect(html).toContain('value="gallery-salon"');
    expect(html).toContain('name="item_0"');
    expect(html).toContain('data-price="75"');
    expect(html).toContain('Haircut — $75');
  });

  it('renders a zip check that posts to the inbox', () => {
    const html = renderSectionToHtml({
      type: 'zip-checker',
      content: {
        title: 'Check Service Availability',
        areas: ['75001'],
        ranges: [{ start: 75000, end: 75999 }],
        successMessage: 'We serve your area.',
      },
    }, { ...tokens, _contactSubdomain: 'gallery-plumbing' });
    expect(html).toContain('data-testid="zip-check-form"');
    expect(html).toContain('action="/api/submissions/contact"');
    expect(html).toContain('name="type" value="zip-check"');
    expect(html).toContain('value="gallery-plumbing"');
    expect(html).toContain('data-areas="75001"');
    expect(html).toContain('data-ranges="75000-75999"');
  });

  it('leaves checkout off the live page when the plan cannot take payment', () => {
    const { html } = buildLiveSiteMarkup({
      businessName: 'Trial Shop',
      settings: { allowCheckout: false },
      _layout: 'atelier',
      _niche: 'salon',
      _level: 'solo',
      sections: [
        { type: 'hero', content: { title: 'Trial Shop' } },
        { type: 'checkout', content: { enabled: true } },
      ],
    });
    expect(html).not.toContain('Ready to complete your order');
    expect(html).not.toContain('ss-checkout');
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
