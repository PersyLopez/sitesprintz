/**
 * Tests for layoutRenderer.js — TDD red-green cycles
 *
 * Seams tested:
 *   1. renderSection() — every known type returns a valid descriptor
 *   2. renderSection() — unknown types return placeholder, never null
 *   3. composePage() — full page composition with layout, tokens, features
 *   4. Feature gating — booking disabled removes booking section, etc.
 *   5. Payment method resolution in composed output
 *   6. Tolerant data access — missing/empty content handled gracefully
 */

import { describe, it, expect, vi } from 'vitest';
import {
  renderSection,
  composePage,
  sectionPrimitives,
} from '../../src/utils/layoutRenderer';

// ---------------------------------------------------------------------------
// 1. renderSection() — known types
// ---------------------------------------------------------------------------

describe('layoutRenderer — renderSection() known types', () => {
  const knownTypes = [
    'hero', 'services', 'about', 'gallery', 'before-after', 'team',
    'testimonials', 'faq', 'credentials', 'contact', 'catalog', 'booking',
    'reviews', 'stats', 'menu', 'service-areas', 'process', 'case-studies',
    'industries', 'how-to-order', 'hours', 'location', 'social',
  ];

  it.each(knownTypes)('renders %s with valid descriptor', (type) => {
    const result = renderSection(type, {}, {}, {});
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(result.type).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result._placeholder).toBeUndefined();
  });

  it('hero with variant renders with that variant', () => {
    const result = renderSection('hero', { title: 'Test' }, {}, {}, 'full-bleed');
    expect(result.variant).toBe('full-bleed');
  });

  it('hero falls back to siteData.businessName when no title', () => {
    const result = renderSection('hero', {}, { businessName: 'My Biz' }, {});
    expect(result.content.title).toBe('My Biz');
  });

  it('services with variant=grid sets displayVariant', () => {
    const result = renderSection('services', {}, {}, {}, 'grid');
    expect(result.content.displayVariant).toBe('grid');
  });

  it('services with variant=list sets displayVariant', () => {
    const result = renderSection('services', {}, {}, {}, 'list');
    expect(result.content.displayVariant).toBe('list');
  });

  it('booking section preserves enabled flag', () => {
    const result = renderSection('booking', { enabled: false }, {}, {});
    expect(result.content.enabled).toBe(false);
  });

  it('contact section resolves from siteData top-level keys', () => {
    const result = renderSection('contact', {}, {
      contactEmail: 'a@b.com',
      contactPhone: '555-1234',
      contactAddress: '123 Main St',
    }, {});
    expect(result.content.email).toBe('a@b.com');
    expect(result.content.phone).toBe('555-1234');
  });

  it('catalog section flattens menu sections to products', () => {
    const menuData = {
      sections: [
        { name: 'Mains', items: [{ name: 'Burger', price: 12 }] },
        { name: 'Sides', items: [{ name: 'Fries', price: 5 }] },
      ],
    };
    const result = renderSection('catalog', menuData, {}, {});
    expect(result.content.items).toHaveLength(2);
    expect(result.content.items[0]._category).toBe('Mains');
  });
});

// ---------------------------------------------------------------------------
// 2. renderSection() — unknown types return placeholder, never null
// ---------------------------------------------------------------------------

describe('layoutRenderer — unknown section types', () => {
  it('returns placeholder for unknown type', () => {
    const result = renderSection('nonexistent-section', { foo: 'bar' }, {}, {});
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(result.type).toBe('placeholder');
    expect(result.originalType).toBe('nonexistent-section');
    expect(result._placeholder).toBe(true);
    expect(result.content).toEqual({ foo: 'bar' });
  });

  it('never returns null for any type', () => {
    const weirdTypes = ['', 'FOO', 'some-new-type', null, undefined];
    for (const type of weirdTypes) {
      const result = renderSection(type, {}, {}, {});
      expect(result).not.toBeNull();
      expect(result).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 3. composePage() — full composition
// ---------------------------------------------------------------------------

describe('layoutRenderer — composePage()', () => {
  const baseSiteData = {
    businessName: 'Test Salon',
    heroTitle: 'Welcome to Test Salon',
    services: [{ name: 'Haircut' }, { name: 'Color' }],
    contactEmail: 'hello@test.com',
    contactPhone: '555-0000',
  };

  it('composes an atelier/solo page with correct sections', () => {
    const page = composePage({
      siteData: baseSiteData,
      layout: 'atelier',
      character: 'refined',
      level: 'solo',
    });

    expect(page.layout).toBe('atelier');
    expect(page.character).toBe('refined');
    expect(page.level).toBe('solo');
    expect(page.tokens).toBeDefined();
    expect(page.tokens.theme.accent).toBeDefined();
    expect(page.sections.length).toBeGreaterThan(0);

    // Solo skeleton: hero, services, gallery, booking, contact
    const types = page.sections.map((s) => s.type);
    expect(types).toContain('hero');
    expect(types).toContain('services');
    expect(types).toContain('contact');
  });

  it('composes a craftsman/established page with more sections than solo', () => {
    const soloPage = composePage({
      siteData: baseSiteData,
      layout: 'craftsman',
      level: 'solo',
    });
    const estPage = composePage({
      siteData: baseSiteData,
      layout: 'craftsman',
      level: 'established',
    });

    expect(estPage.sections.length).toBeGreaterThanOrEqual(soloPage.sections.length);
  });

  it('composes a bazaar page without booking', () => {
    const page = composePage({
      siteData: baseSiteData,
      layout: 'bazaar',
      level: 'solo',
    });

    const types = page.sections.map((s) => s.type);
    expect(types).not.toContain('booking');
    expect(types).toContain('catalog');
    expect(types).toContain('contact');
  });

  it('resolves theme tokens correctly for atelier/salon', () => {
    const page = composePage({
      siteData: baseSiteData,
      layout: 'atelier',
      level: 'solo',
      niche: 'salon',
    });

    // Salon defaults to the curated Onyx Oxblood theme
    expect(page.tokens.themeId).toBe('onyx-oxblood');
    expect(page.tokens.theme.accentValue).toBe('#d16b6b');
    expect(page.tokens.theme.onAccent).toBe('#140808');
  });

  it('includes features in composed output', () => {
    const page = composePage({
      siteData: baseSiteData,
      layout: 'atelier',
      level: 'solo',
    });

    expect(page.features).toBeDefined();
    expect(page.features.booking).toBeDefined();
    expect(page.features.onlineOrdering).toBeDefined();
    expect(page.features.onlinePayment).toBeDefined();
    expect(page.features.cashPayment).toBeDefined();
  });

  it('includes paymentMethods in composed output', () => {
    const page = composePage({
      siteData: baseSiteData,
      layout: 'mercantile',
    });

    expect(page.paymentMethods).toBeDefined();
    expect(page.paymentMethods.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Feature gating — booking disabled removes section
// ---------------------------------------------------------------------------

describe('layoutRenderer — feature gating', () => {
  const baseSiteData = {
    businessName: 'Test Biz',
    services: [{ name: 'Service 1' }],
    contactEmail: 'test@test.com',
  };

  it('atelier includes booking when enabled', () => {
    const page = composePage({
      siteData: baseSiteData,
      layout: 'atelier',
      level: 'solo',
      userFeatures: { booking: { enabled: true } },
    });
    const types = page.sections.map((s) => s.type);
    expect(types).toContain('booking');
  });

  it('atelier excludes booking when user disables it', () => {
    const page = composePage({
      siteData: baseSiteData,
      layout: 'atelier',
      level: 'solo',
      userFeatures: { booking: { enabled: false } },
    });
    const types = page.sections.map((s) => s.type);
    expect(types).not.toContain('booking');
  });

  it('bazaar never includes booking (not offered)', () => {
    const page = composePage({
      siteData: baseSiteData,
      layout: 'bazaar',
      level: 'solo',
    });
    expect(page.features.booking.offered).toBe(false);
    // Booking should not be in the bazaar skeleton at all
    const types = page.sections.map((s) => s.type);
    expect(types).not.toContain('booking');
  });
});

// ---------------------------------------------------------------------------
// 5. Tolerant data access — missing/empty content handled
// ---------------------------------------------------------------------------

describe('layoutRenderer — tolerant data access', () => {
  it('hero renders with empty siteData', () => {
    const result = renderSection('hero', {}, {}, {});
    expect(result.content.title).toBeTruthy(); // defaults to 'Welcome'
    expect(result.content.subtitle).toBe('');
  });

  it('services renders with no services array', () => {
    const result = renderSection('services', {}, {}, {});
    expect(result.content.items).toEqual([]);
  });

  it('gallery renders with no images', () => {
    const result = renderSection('gallery', {}, {}, {});
    expect(result.content.images).toEqual([]);
  });

  it('team renders with no members', () => {
    const result = renderSection('team', {}, {}, {});
    expect(result.content.members).toEqual([]);
  });

  it('contact renders with missing fields', () => {
    const result = renderSection('contact', {}, {}, {});
    expect(result.content.email).toBe('');
    expect(result.content.phone).toBe('');
    expect(result.content.address).toBe('');
  });

  it('catalog renders with empty content', () => {
    const result = renderSection('catalog', {}, {}, {});
    expect(result.content.items).toEqual([]);
  });

  it('hours section renders with empty data', () => {
    const result = renderSection('hours', {}, {}, {});
    expect(result.content.title).toBe('Hours');
  });

  it('location mapUrl falls back to siteData.social.maps', () => {
    const result = renderSection('location', {}, {
      social: { maps: 'https://maps.example/shop' },
    }, {});
    expect(result.content.mapUrl).toBe('https://maps.example/shop');
  });

  it('social primitive resolves from siteData.social', () => {
    const result = renderSection('social', {}, {
      social: { instagram: 'https://instagram.com/shop', whatsapp: '15551234567' },
    }, {});
    expect(result.type).toBe('social');
    expect(result.content.title).toBe('Find us');
    expect(result.content.instagram).toBe('https://instagram.com/shop');
    expect(result.content.whatsapp).toBe('15551234567');
  });

  it('how-to-order renders with empty steps', () => {
    const result = renderSection('how-to-order', {}, {}, {});
    expect(result.content.steps).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 6. Payment method resolution
// ---------------------------------------------------------------------------

describe('layoutRenderer — payment methods in composed output', () => {
  it('includes online and cash by default for mercantile', () => {
    const page = composePage({
      siteData: { businessName: 'Test' },
      layout: 'mercantile',
    });
    expect(page.paymentMethods).toContain('online');
    expect(page.paymentMethods).toContain('cash');
  });

  it('includes only cash when online payment disabled', () => {
    const page = composePage({
      siteData: { businessName: 'Test' },
      layout: 'mercantile',
      userFeatures: { onlinePayment: { enabled: false } },
    });
    expect(page.paymentMethods).toEqual(['cash']);
  });

  it('includes only online when cash disabled', () => {
    const page = composePage({
      siteData: { businessName: 'Test' },
      layout: 'mercantile',
      userFeatures: { cashPayment: { enabled: false } },
    });
    expect(page.paymentMethods).toEqual(['online']);
  });
});

// ---------------------------------------------------------------------------
// 7. sectionPrimitives completeness
// ---------------------------------------------------------------------------

describe('layoutRenderer — sectionPrimitives map', () => {
  it('has a primitive for every section type used in LAYOUTS skeletons', () => {
    // Gather all section types from all layouts
    const allTypes = new Set();
    for (const layout of Object.values(
      // Inline require won't work in ESM test, so we hardcode the check
      // against the known layouts
      {
        atelier: { levels: { solo: ['hero', 'services', 'gallery', 'booking', 'hours', 'location', 'contact', 'social'] } },
        craftsman: { levels: { solo: ['hero', 'services', 'service-areas', 'before-after', 'faq', 'hours', 'location', 'contact', 'social'] } },
        counsel: { levels: { solo: ['hero', 'services', 'case-studies', 'hours', 'location', 'contact', 'social'] } },
        mercantile: { levels: { solo: ['hero', 'catalog', 'hours', 'location', 'contact', 'social'] } },
        bazaar: { levels: { solo: ['hero', 'catalog', 'how-to-order', 'hours', 'location', 'contact', 'social'] } },
      }
    )) {
      for (const level of Object.values(layout.levels)) {
        for (const type of level) {
          allTypes.add(type);
        }
      }
    }

    // Every type in the skeletons should have a primitive or be handled
    for (const type of allTypes) {
      expect(sectionPrimitives[type], `Missing primitive for skeleton type: ${type}`).toBeDefined();
    }
  });
});

describe('layoutRenderer — catalog-shaped site data', () => {
  const catalogSite = {
    businessName: 'Luxe Beauty Studio',
    brand: { name: 'Luxe Beauty Studio' },
    _layout: 'atelier',
    _character: 'refined',
    _level: 'studio',
    _niche: 'salon',
    hero: {
      eyebrow: 'Luxe Beauty Studio',
      title: 'Where Beauty Meets Artistry',
      subtitle: 'Premium hair and beauty',
      image: 'https://example.com/hero.jpg',
    },
    gallery: {
      title: 'Our Work',
      categories: [
        { name: 'Hair', images: [{ url: 'https://example.com/a.jpg', alt: 'Cut' }] },
        { name: 'Color', images: [{ url: 'https://example.com/b.jpg', alt: 'Color' }] },
      ],
    },
    team: {
      title: 'Stylists',
      members: [{ name: 'Sarah', title: 'Owner', image: 'https://example.com/s.jpg' }],
    },
    testimonials: {
      items: [{ text: 'Amazing', author: 'Emily', rating: 5 }],
    },
    about: {
      title: 'Our Story',
      body: 'Opened in 2018 with a passion for beauty.',
    },
    contact: { phone: '555-0100', email: 'hello@luxe.test' },
  };

  it('flattens catalog gallery categories into images', () => {
    const result = renderSection('gallery', {}, catalogSite, {});
    expect(result.content.images).toHaveLength(2);
    expect(result.content.images[0].src).toContain('a.jpg');
  });

  it('unwraps catalog team.members', () => {
    const result = renderSection('team', {}, catalogSite, {});
    expect(result.content.members).toHaveLength(1);
    expect(result.content.members[0].name).toBe('Sarah');
  });

  it('uses catalog hero image and business identity', () => {
    const result = renderSection('hero', {}, catalogSite, {}, 'split');
    expect(result.content.image).toContain('hero.jpg');
    expect(result.content.title).toMatch(/Beauty|Luxe/);
  });

  it('inserts about from catalog when composing', () => {
    const page = composePage({ siteData: catalogSite, niche: 'salon', level: 'studio' });
    const types = page.sections.map((s) => s.type);
    expect(types).toContain('about');
    const about = page.sections.find((s) => s.type === 'about');
    expect(about.content.body).toContain('2018');
  });

  it('passes Google placeId onto the reviews section', () => {
    const result = renderSection('reviews', { items: [] }, {
      features: { reviews: { enabled: true, placeId: 'ChIJ-salon' } },
    }, {});
    expect(result.content.placeId).toBe('ChIJ-salon');
  });

  it('strips Unsplash hero images unless the site is a demo seed', () => {
    const live = renderSection('hero', {}, {
      heroImage: 'https://images.unsplash.com/photo-1',
    }, {});
    expect(live.content.image).toBe('');
    const demo = renderSection('hero', {}, {
      _demo: true,
      heroImage: 'https://images.unsplash.com/photo-1',
    }, {});
    expect(demo.content.image).toContain('unsplash.com');
  });
});
