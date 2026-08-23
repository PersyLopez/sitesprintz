/**
 * Thorough tests for sites users can generate.
 *
 * Covers the real preview/publish path:
 *   catalog JSON templates → composePage() → PublishedSiteRenderer SSR
 *   niche builders × levels → same pipeline
 *   bazaar pop-ups → same pipeline
 *
 * Preview and publish both call composePage(); SSR uses the HTML bridge.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { composePage } from '../../src/utils/layoutRenderer.js';
import { renderSectionToHtml, withNativeBookingTokens } from '../../src/utils/sectionHtmlBridge.js';
import { getLayoutForNiche, getSkeleton, LAYOUTS } from '../../src/config/layouts.js';
import { NICHE_CONFIGS, buildNicheSiteData } from '../../src/config/nicheTemplateBuilders.js';
import { BAZAAR_TYPES, buildBazaarSiteData } from '../../src/config/bazaarDefaults.js';
import { PublishedSiteRenderer } from '../../server/services/publishedSiteRenderer.js';
import { buildLiveSiteMarkup } from '../../src/utils/publishedSiteDocument.js';

const TEMPLATES_DIR = join(process.cwd(), 'public/data/templates');
const INDEX = JSON.parse(readFileSync(join(TEMPLATES_DIR, 'index.json'), 'utf-8'));
const CATALOG_IDS = INDEX.templates.map((t) => t.id);
const LEVELS = ['solo', 'studio', 'established'];
const NICHE_IDS = Object.keys(NICHE_CONFIGS);
const renderer = new PublishedSiteRenderer();

function loadCatalogTemplate(id) {
  return JSON.parse(readFileSync(join(TEMPLATES_DIR, `${id}.json`), 'utf-8'));
}

function catalogToSiteData(id, template, extras = {}) {
  const services = Array.isArray(template.services)
    ? template.services
    : template.services?.items || [];
  return {
    ...template,
    businessName: extras.businessName || template.brand?.name || 'Test Business',
    heroTitle: extras.heroTitle || template.hero?.title,
    heroSubtitle: extras.heroSubtitle || template.hero?.subtitle,
    heroImage: template.hero?.image,
    services,
    products: template.products || [],
    category: extras.category || template.category || id,
    _niche: id,
    _layout: extras.layout || getLayoutForNiche(id),
    _level: extras.level || 'studio',
    _character: extras.character || 'refined',
    ...(extras.features ? { _features: extras.features } : {}),
  };
}

function htmlFromPage(page) {
  const tokens = withNativeBookingTokens(page.tokens, page.sections);
  return (page.sections || [])
    .filter((s) => s && s.enabled !== false)
    .map((section) => renderSectionToHtml(section, tokens))
    .filter(Boolean)
    .join('\n');
}

function assertComposedPage(page, { expectBooking = null } = {}) {
  expect(page).toBeTruthy();
  expect(Array.isArray(page.sections)).toBe(true);
  expect(page.sections.length).toBeGreaterThan(0);
  expect(page.tokens?.theme).toBeTruthy();
  expect(page.layout).toBeTruthy();
  expect(LEVELS).toContain(page.level);

  const types = page.sections.map((s) => s.type);
  expect(types).toContain('hero');
  expect(types).toContain('contact');

  for (const section of page.sections) {
    expect(section).not.toBeNull();
    expect(section.type).toBeTruthy();
    expect(section._placeholder).not.toBe(true);
  }

  const hero = page.sections.find((s) => s.type === 'hero');
  expect(hero.content.title).toBeTruthy();
  expect(String(hero.content.title).trim().length).toBeGreaterThan(0);

  if (expectBooking === true) {
    expect(types).toContain('booking');
  }
  if (expectBooking === false) {
    expect(types).not.toContain('booking');
  }
}

function assertPublishedHtml(html, { businessName, heroSnippet } = {}) {
  expect(html).toMatch(/<!DOCTYPE html>/i);
  expect(html).toContain('lang="en"');
  expect(html).toContain('name="viewport"');
  expect(html).toContain('<main id="app">');
  expect(html).not.toContain('Welcome to undefined');
  expect(html).not.toMatch(/<title>\s*My Business\s*<\/title>/);

  if (businessName) {
    expect(html).toContain(businessName);
  }
  if (heroSnippet) {
    expect(html).toContain(heroSnippet);
  }
}

describe('generated sites — catalog templates', () => {
  it('index.json lists every on-disk template json (except indexes)', () => {
    expect(CATALOG_IDS.length).toBeGreaterThanOrEqual(12);
    for (const id of CATALOG_IDS) {
      expect(() => loadCatalogTemplate(id)).not.toThrow();
    }
  });

  it.each(CATALOG_IDS)('catalog "%s" has brand, hero, contact, and nav', (id) => {
    const template = loadCatalogTemplate(id);
    expect(template.brand?.name).toBeTruthy();
    expect(template.hero?.title).toBeTruthy();
    expect(template.contact).toBeTruthy();
    expect(Array.isArray(template.nav)).toBe(true);
    expect(template.nav.length).toBeGreaterThan(0);
  });

  it.each(CATALOG_IDS)('catalog "%s" composes a valid page', (id) => {
    const template = loadCatalogTemplate(id);
    const siteData = catalogToSiteData(id, template);
    const page = composePage({ siteData, niche: id });
    assertComposedPage(page);
    expect(page.layout).toBe(getLayoutForNiche(id));
  });

  it.each(CATALOG_IDS)('catalog "%s" SSR HTML is a complete document with business name', async (id) => {
    const template = loadCatalogTemplate(id);
    const siteData = catalogToSiteData(id, template);
    const html = await renderer.render(siteData, { siteId: `test-${id}` });
    assertPublishedHtml(html, {
      businessName: template.brand.name,
      heroSnippet: (siteData.heroTitle || template.hero.title).replace(/&/g, '&amp;').slice(0, 20),
    });
    expect(html).not.toContain('[object Object]');
  });
});

describe('generated sites — niche × level', () => {
  it('every catalog template has a niche builder', () => {
    const missing = CATALOG_IDS.filter((id) => !NICHE_CONFIGS[id]);
    expect(missing).toEqual([]);
  });

  it.each(NICHE_IDS.flatMap((niche) => LEVELS.map((level) => [niche, level])))(
    'niche "%s" at level "%s" composes and SSR-renders',
    async (niche, level) => {
      const businessName = `Acme ${niche} ${level}`;
      const siteData = buildNicheSiteData(niche, {
        businessName,
        level,
        contactPhone: '(555) 010-0000',
        contactEmail: 'hello@example.com',
      });
      const page = composePage({ siteData, niche, level });
      assertComposedPage(page);
      expect(page.level).toBe(level);
      expect(page.layout).toBe(getLayoutForNiche(niche));

      const skeleton = getSkeleton(page.layout, level);
      const types = page.sections.map((s) => s.type);
      for (const required of skeleton) {
        if (required === 'booking' && !page.features?.booking?.enabled) continue;
        expect(types).toContain(required);
      }

      const html = await renderer.render(siteData, { siteId: `niche-${niche}-${level}` });
      assertPublishedHtml(html, { businessName });
      expect(htmlFromPage(page).length).toBeGreaterThan(200);
    }
  );
});

describe('generated sites — bazaar pop-ups', () => {
  it.each(BAZAAR_TYPES.map((t) => t.id))('bazaar type "%s" composes catalog + contact and SSR-renders', async (popUpType) => {
    const businessName = `Pop-up ${popUpType}`;
    const siteData = buildBazaarSiteData({
      popUpType,
      businessName,
      location: 'Main St',
      hours: 'Sat 9–2',
    });
    const page = composePage({ siteData, layout: 'bazaar', character: 'approachable', level: 'solo' });
    assertComposedPage(page, { expectBooking: false });
    expect(page.layout).toBe('bazaar');
    const types = page.sections.map((s) => s.type);
    expect(types).toContain('catalog');

    const html = await renderer.render(siteData, { siteId: `bazaar-${popUpType}` });
    assertPublishedHtml(html, { businessName });
  });
});

describe('generated sites — feature gates and owner overlay', () => {
  it('booking-off atelier site omits booking from composed output', () => {
    const siteData = buildNicheSiteData('salon', {
      businessName: 'Cash Only Cuts',
      level: 'studio',
      features: { booking: { enabled: false } },
    });
    const page = composePage({ siteData, niche: 'salon' });
    assertComposedPage(page, { expectBooking: false });
  });

  it('escapes owner-supplied script tags in published HTML', async () => {
    const siteData = buildNicheSiteData('consultant', {
      businessName: '<script>alert(1)</script>Trust Co',
      level: 'solo',
    });
    const html = await renderer.render(siteData, { siteId: 'xss-check' });
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toMatch(/&lt;script&gt;|\\u003cscript/);
  });

  it('raw catalog JSON without businessName still titles from brand.name', async () => {
    const template = loadCatalogTemplate('salon');
    const html = await renderer.render(template, { siteId: 'brand-fallback' });
    expect(html).toContain(template.brand.name);
    expect(html).not.toMatch(/<title>\s*My Business\s*<\/title>/);
    expect(html).not.toContain('Welcome to undefined');
  });
});

describe('generated sites — layout skeletons stay renderable', () => {
  it('every layout/level skeleton section produces HTML', () => {
    for (const [layoutKey, layout] of Object.entries(LAYOUTS)) {
      for (const level of Object.keys(layout.levels || {})) {
        const siteData = {
          businessName: `${layoutKey} ${level}`,
          heroTitle: 'Welcome',
          _layout: layoutKey,
          _level: level,
          _character: layout.character,
        };
        const page = composePage({ siteData, layout: layoutKey, level });
        for (const section of page.sections) {
          const html = renderSectionToHtml(section, page.tokens);
          expect(typeof html, `${layoutKey}/${level}/${section.type}`).toBe('string');
          expect(html, `${layoutKey}/${level}/${section.type}`).not.toBeNull();
        }
      }
    }
  });
});

describe('generated sites — one-catalog booking across layouts', () => {
  it('every atelier niche with booking uses page Book CTAs, not a second menu only in the widget', () => {
    for (const niche of LAYOUTS.atelier.niches) {
      const siteData = buildNicheSiteData(niche, { businessName: `Acme ${niche}`, level: 'solo' });
      const { html } = buildLiveSiteMarkup(siteData);
      expect(html, niche).toContain('id="services"');
      expect(html, niche).toContain('data-ss-book-service');
      expect(html, niche).toContain('data-ss-booking-mount');
    }
  });

  it('craftsman and counsel services stay informational unless booking is on', () => {
    const niches = [...LAYOUTS.craftsman.niches, ...LAYOUTS.counsel.niches];
    for (const niche of niches) {
      const siteData = buildNicheSiteData(niche, { businessName: `Acme ${niche}`, level: 'solo' });
      const { html } = buildLiveSiteMarkup(siteData);
      expect(html, niche).not.toContain('data-ss-book-service');
    }
  });

  it('mercantile catalog stays cart; bazaar never emits Book', () => {
    const restaurant = buildNicheSiteData('restaurant', { businessName: 'The Grand Table', level: 'solo' });
    const restaurantHtml = buildLiveSiteMarkup(restaurant).html;
    expect(restaurantHtml).not.toContain('data-ss-book-service');

    const bazaar = buildBazaarSiteData({
      popUpType: BAZAAR_TYPES[0].id,
      businessName: 'Pop-up stall',
      location: 'Main St',
      hours: 'Sat 9–2',
    });
    expect(buildLiveSiteMarkup(bazaar).html).not.toContain('data-ss-book-service');
  });

  it('non-atelier layout with native booking still uses the page services catalog', () => {
    const siteData = buildNicheSiteData('plumbing', {
      businessName: 'Pipe Pros',
      level: 'solo',
      features: { booking: { enabled: true } },
    });
    siteData.booking = {
      ...(siteData.booking || {}),
      enabled: true,
      embedded: true,
      provider: 'native',
    };
    siteData.sections = [
      ...(siteData.sections || []),
      {
        id: 'booking',
        type: 'booking',
        enabled: true,
        content: {
          enabled: true,
          provider: 'native',
          embedded: true,
          title: 'Book a visit',
        },
      },
    ];
    const { html } = buildLiveSiteMarkup(siteData);
    expect(html).toContain('data-ss-book-service');
    expect(html).toContain('data-ss-booking-mount');
  });
});
