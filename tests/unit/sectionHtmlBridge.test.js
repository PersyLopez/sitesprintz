/**
 * Tests for sectionHtmlBridge — SSR bridge between layoutRenderer and HTML output.
 *
 * Verifies:
 *   1. Every section type produced by composePage() returns non-null HTML
 *   2. Token-aware inline styles use tokens.theme.bg/text/accent
 *   3. Unknown section types render a placeholder div, never null
 *   4. Delegates to SectionHtmlBuilder for types it handles
 */

import { describe, it, expect } from 'vitest';
import { renderSectionToHtml, ALL_SECTION_TYPES } from '../../src/utils/sectionHtmlBridge';
import { buildLiveSiteMarkup } from '../../src/utils/publishedSiteDocument';

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

  it('buildLiveSiteMarkup includes nav brand and skips empty gallery', () => {
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
    expect(html).not.toContain('No images yet');
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
