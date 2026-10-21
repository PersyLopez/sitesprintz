/**
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { assembleSiteData, stripNicheTemplateOverlay } from '../../scripts/seed-gallery-example-sites.js';

const GENERATED_HERO_TITLE = 'Order online or pick up in person';
const GENERATED_HERO_SUBTITLE = 'Browse the catalog, see hours, and know where to collect your order.';

const OAK_ANCHOR = {
  subdomain: 'gallery-ordering',
  niche: 'product-ordering',
  level: 'studio',
  featured: true,
  plan: 'growth',
  businessName: 'Oak & Anchor Supply',
  contactPhone: '(555) 204-7788',
  contactEmail: 'orders@oakanchorsupply.com',
  themeId: 'onyx-brass',
};

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'public/data/templates/product-ordering.json'), 'utf-8')
);

function unsplashUrls(value, found = []) {
  if (typeof value === 'string') {
    if (value.includes('images.unsplash.com')) found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => unsplashUrls(entry, found));
    return found;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => unsplashUrls(entry, found));
  }
  return found;
}

describe('product-ordering gallery demo overlay (QA C-05)', () => {
  const siteData = assembleSiteData(OAK_ANCHOR);
  const json = JSON.stringify(siteData);
  const heroSection = siteData.sections.find((section) => section.type === 'hero');

  it('uses the generated niche hero lines', () => {
    expect(siteData.hero.title).toBe(GENERATED_HERO_TITLE);
    expect(siteData.hero.subtitle).toBe(GENERATED_HERO_SUBTITLE);
  });

  it('uses the generated niche hero lines on the hero section', () => {
    expect(heroSection.content.title).toBe(GENERATED_HERO_TITLE);
    expect(heroSection.content.subtitle).toBe(GENERATED_HERO_SUBTITLE);
  });

  it('leaves the hero image empty', () => {
    expect(siteData.hero.image).toBe('');
    expect(heroSection.content.image || '').toBe('');
  });

  it('leaves the contact address empty', () => {
    expect(siteData.contact.address).toBe('');
    expect(json).not.toContain('Tech Park');
  });

  it('does not copy the electronics template hero, about, or tagline', () => {
    expect(json).not.toContain('Sell online with integrated checkout');
    expect(json).not.toContain('About QuickCart');
    expect(siteData.brand.tagline).toBe(GENERATED_HERO_SUBTITLE);
  });

  it('does not attach a template photo to products, catalog items, gallery, or team', () => {
    const templatePhotos = unsplashUrls(TEMPLATE);
    expect(templatePhotos.length).toBeGreaterThan(0);
    const surfaces = JSON.stringify([
      siteData.products,
      siteData.sections.find((section) => section.type === 'catalog'),
      siteData.sections.find((section) => section.type === 'gallery'),
      siteData.sections.find((section) => section.type === 'team'),
    ]);
    for (const url of templatePhotos) {
      expect(surfaces).not.toContain(url);
    }
    const bestseller = siteData.products.find((item) => item.name === 'Bestseller Item');
    expect(bestseller).toBeTruthy();
    expect(bestseller.image).toBeUndefined();
    expect(bestseller.src).toBeUndefined();
    expect(bestseller.photo).toBeUndefined();
  });
});

describe('stripNicheTemplateOverlay', () => {
  it('strips hero, about, brand, address, and template photos from the raw catalog', () => {
    const stripped = stripNicheTemplateOverlay(TEMPLATE);
    expect(stripped.hero).toEqual({});
    expect(stripped.about).toBeUndefined();
    expect(stripped.brand).toBeUndefined();
    expect(stripped.contact.address).toBe('');
    expect(JSON.stringify(stripped.menu)).not.toContain('images.unsplash.com');
    expect(JSON.stringify(stripped.gallery)).not.toContain('images.unsplash.com');
    expect(JSON.stringify(stripped.team)).not.toContain('images.unsplash.com');
    expect(JSON.stringify(stripped.menu)).toContain('Wireless Earbuds Pro');
  });

  it('does not mutate the catalog it is given', () => {
    const raw = JSON.parse(JSON.stringify(TEMPLATE));
    stripNicheTemplateOverlay(raw);
    expect(raw.hero.title).toBe('Sell online with integrated checkout');
    expect(raw.contact.address).toBe('123 Tech Park Ave, San Francisco, CA 94103');
    expect(JSON.stringify(raw.menu)).toContain('images.unsplash.com');
  });
});