/**
 * Tests for nicheTemplateBuilders.js — TDD red-green cycles
 *
 * Seams tested:
 *   1. CRAFTSMAN_NICHES, COUNSEL_NICHES, MERCANTILE_NICHES
 *   2. getNicheConfig() lookup
 *   3. buildNicheSiteData() — Craftsman
 *   4. buildNicheSiteData() — Counsel
 *   5. buildNicheSiteData() — Mercantile
 *   6. Atelier (salon) via builder
 *   7. Level auto-detection
 *   8. Feature defaults per layout
 *   9. Niche → layout consistency
 */

import { describe, it, expect } from 'vitest';
import {
  CRAFTSMAN_NICHES,
  COUNSEL_NICHES,
  MERCANTILE_NICHES,
  NICHE_CONFIGS,
  buildNicheSiteData,
  getNicheConfig,
} from '../../src/config/nicheTemplateBuilders';
import { composePage } from '../../src/utils/layoutRenderer';
import { getLayoutForNiche } from '../../src/config/layouts';

// 1. Niche groups
describe('nicheTemplateBuilders — niche groups', () => {
  it('CRAFTSMAN_NICHES includes all trade niches', () => {
    const ids = CRAFTSMAN_NICHES.map((n) => n.id);
    expect(ids).toContain('cleaning');
    expect(ids).toContain('electrician');
    expect(ids).toContain('plumbing');
    expect(ids).toContain('auto-repair');
    expect(ids).toContain('tow-truck');
  });

  it('COUNSEL_NICHES includes consultant and freelancer', () => {
    const ids = COUNSEL_NICHES.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['consultant', 'freelancer']));
  });

  it('MERCANTILE_NICHES includes restaurant and product niches', () => {
    const ids = MERCANTILE_NICHES.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['restaurant', 'product-ordering', 'product-showcase']));
  });

  it('every niche config has id, name, icon, accent, hero content', () => {
    const all = [...CRAFTSMAN_NICHES, ...COUNSEL_NICHES, ...MERCANTILE_NICHES];
    for (const niche of all) {
      expect(niche.id).toBeTruthy();
      expect(niche.name).toBeTruthy();
      expect(niche.icon).toBeTruthy();
      expect(niche.accent).toBeTruthy();
      expect(niche.heroTitle).toBeTruthy();
      expect(niche.heroSubtitle).toBeTruthy();
    }
  });

  it('no niche id is duplicated across groups', () => {
    const all = [...CRAFTSMAN_NICHES, ...COUNSEL_NICHES, ...MERCANTILE_NICHES];
    const ids = all.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// 2. getNicheConfig()
describe('nicheTemplateBuilders — getNicheConfig()', () => {
  it('returns config for a known niche', () => {
    const config = getNicheConfig('salon');
    expect(config).toBeDefined();
    expect(config.id).toBe('salon');
  });

  it('returns undefined for unknown niche', () => {
    expect(getNicheConfig('nonexistent')).toBeUndefined();
  });
});

// 3. Craftsman build
describe('nicheTemplateBuilders — Craftsman build', () => {
  it('builds a cleaning site with craftsman layout metadata', () => {
    const siteData = buildNicheSiteData('cleaning', {
      businessName: 'Sparkle Clean',
      level: 'solo',
    });

    expect(siteData.businessName).toBe('Sparkle Clean');
    expect(siteData._layout).toBe('craftsman');
    expect(siteData._character).toBe('refined');
    expect(siteData._level).toBe('solo');
    expect(siteData._theme.mode).toBe('onyx');
    expect(siteData._theme.accent).toBe('hearth');
  });

  it('includes service-areas and before-after sections for craftsman', () => {
    const siteData = buildNicheSiteData('plumbing', { businessName: 'Test Plumbing' });
    const types = siteData.sections.map((s) => s.type);
    expect(types).toContain('services');
    expect(types).toContain('service-areas');
    expect(types).toContain('contact');
  });

  it('studio level adds process, credentials, and team sections', () => {
    const solo = buildNicheSiteData('electrician', { businessName: 'Test', level: 'solo' });
    const studio = buildNicheSiteData('electrician', { businessName: 'Test', level: 'studio' });

    const soloTypes = solo.sections.map((s) => s.type);
    const studioTypes = studio.sections.map((s) => s.type);

    expect(studioTypes).toContain('process');
    expect(studioTypes).toContain('credentials');
    expect(studioTypes).toContain('team');
    expect(soloTypes).not.toContain('process');
    expect(soloTypes).not.toContain('team');
  });

  it('uses first-person copy for a solo electrician', () => {
    const solo = buildNicheSiteData('electrician', { businessName: 'Test', level: 'solo' });
    const hero = solo.sections.find((s) => s.type === 'hero');
    const services = solo.sections.find((s) => s.type === 'services');
    expect(hero.content.subtitle).toMatch(/Licensed electrician/i);
    expect(services.content.title).toBe('Services');
    expect(solo.heroSubtitle).toMatch(/Licensed electrician/i);
  });

  it('sets dispatch mode and crew title for a plumbing studio', () => {
    const studio = buildNicheSiteData('plumbing', { businessName: 'Blue Wave', level: 'studio' });
    expect(studio._operatingModel.staffAssignment).toBe('dispatch');
    expect(studio._operatingModel.businessMode).toBe('hybrid');
    const team = studio.sections.find((s) => s.type === 'team');
    expect(team.content.title).toBe('Our Plumbers');
  });

  it('composes through the engine with correct layout and sections', () => {
    const siteData = buildNicheSiteData('auto-repair', {
      businessName: 'Test Auto',
      level: 'studio',
    });

    const page = composePage({ siteData });
    expect(page.layout).toBe('craftsman');
    expect(page.character).toBe('refined');
    expect(page.tokens.theme.mode).toBe('onyx');
    expect(page.tokens.themeId).toBe('onyx-ember');
    expect(page.tokens.theme.accentValue).toBe('#e07a4c');

    const types = page.sections.map((s) => s.type);
    expect(types).toContain('services');
    expect(types).toContain('service-areas');
  });
});

// 4. Counsel build
describe('nicheTemplateBuilders — Counsel build', () => {
  it('builds a consultant site with counsel layout metadata', () => {
    const siteData = buildNicheSiteData('consultant', {
      businessName: 'Strategic Advisors',
      level: 'solo',
    });

    expect(siteData._layout).toBe('counsel');
    expect(siteData._character).toBe('refined');
    expect(siteData._theme.accent).toBe('counsel');
  });

  it('includes case-studies section for counsel at studio level', () => {
    const siteData = buildNicheSiteData('freelancer', {
      businessName: 'Jane Doe Creative',
      level: 'studio',
    });

    const types = siteData.sections.map((s) => s.type);
    expect(types).toContain('case-studies');
    expect(types).toContain('services');
    expect(types).toContain('team');
    expect(types).not.toContain('industries');
  });

  it('established level adds industries and team for counsel', () => {
    const established = buildNicheSiteData('consultant', {
      businessName: 'Big Firm',
      level: 'established',
    });

    const types = established.sections.map((s) => s.type);
    expect(types).toContain('industries');
    expect(types).toContain('team');
    expect(types).toContain('stats');
  });

  it('composes through the engine with counsel layout', () => {
    const siteData = buildNicheSiteData('consultant', { businessName: 'Test', level: 'studio' });
    const page = composePage({ siteData });

    expect(page.layout).toBe('counsel');
    expect(page.character).toBe('refined');
    expect(page.tokens.typography.display.family).toContain('Fraunces');
  });
});

// 5. Mercantile build
describe('nicheTemplateBuilders — Mercantile build', () => {
  it('builds a restaurant site with mercantile layout metadata', () => {
    const siteData = buildNicheSiteData('restaurant', {
      businessName: 'The Grand Table',
      level: 'solo',
    });

    expect(siteData._layout).toBe('mercantile');
    expect(siteData._character).toBe('refined');
    expect(siteData._theme.accent).toBe('table');
  });

  it('includes catalog section for mercantile', () => {
    const siteData = buildNicheSiteData('restaurant', { businessName: 'Test Bistro' });
    const types = siteData.sections.map((s) => s.type);
    expect(types).toContain('catalog');
    expect(types).toContain('contact');
  });

  it('restaurant seeds menu items into catalog content', () => {
    const siteData = buildNicheSiteData('restaurant', { businessName: 'Test' });
    const catalog = siteData.sections.find((s) => s.type === 'catalog');
    expect(catalog).toBeDefined();
    expect(catalog.content.items.length).toBeGreaterThan(0);
  });

  it('studio level adds gallery, reviews, and a kitchen/team section for mercantile', () => {
    const studio = buildNicheSiteData('product-showcase', {
      businessName: 'Test Shop',
      level: 'studio',
    });

    const types = studio.sections.map((s) => s.type);
    expect(types).toContain('gallery');
    expect(types).toContain('reviews');
    expect(types).toContain('team');
  });

  it('composes through the engine with mercantile layout', () => {
    const siteData = buildNicheSiteData('restaurant', { businessName: 'Test', level: 'solo' });
    const page = composePage({ siteData });

    expect(page.layout).toBe('mercantile');
    expect(page.tokens.themeId).toBe('onyx-brass');
    expect(page.tokens.theme.accentValue).toBe('#d4b36a');
  });
});

// 6. Atelier (salon) via builder
describe('nicheTemplateBuilders — Atelier build', () => {
  it('builds a salon site with atelier layout metadata', () => {
    const siteData = buildNicheSiteData('salon', {
      businessName: 'Luxe Studio',
      level: 'solo',
    });

    expect(siteData._layout).toBe('atelier');
    expect(siteData._character).toBe('refined');
    expect(siteData._theme.accent).toBe('studio');
  });

  it('composes through the engine with atelier layout', () => {
    const siteData = buildNicheSiteData('salon', { businessName: 'Test', level: 'studio' });
    const page = composePage({ siteData });

    expect(page.layout).toBe('atelier');
    expect(page.tokens.themeId).toBe('onyx-oxblood');
    expect(page.tokens.theme.accentValue).toBe('#d16b6b');
  });

  it('sets picker mode and stylist title for a salon studio', () => {
    const studio = buildNicheSiteData('salon', { businessName: 'Luxe', level: 'studio' });
    expect(studio._operatingModel.staffAssignment).toBe('pick');
    expect(studio._operatingModel.businessMode).toBe('team');
    const team = studio.sections.find((s) => s.type === 'team');
    const booking = studio.sections.find((s) => s.type === 'booking');
    expect(team.content.title).toBe('Meet Our Stylists');
    expect(team.content.members.length).toBeGreaterThanOrEqual(2);
    expect(team.content.members[0].name).toBeTruthy();
    expect(booking.content.businessMode).toBe('team');
    expect(booking.content.noPreferenceText).toBe('Any Available Stylist');
    expect(studio.nav.some((item) => item.href === '#team')).toBe(true);
  });
});

// 7. Level auto-detection
describe('nicheTemplateBuilders — level auto-detection', () => {
  it('auto-detects solo when no team data', () => {
    const solo = buildNicheSiteData('salon', { businessName: 'Solo Stylist' });
    expect(solo._level).toBe('solo');
  });

  it('auto-detects established with teamSize 6+', () => {
    const established = buildNicheSiteData('consultant', {
      businessName: 'Big Firm',
      teamSize: 6,
    });
    expect(established._level).toBe('established');
  });

  it('auto-detects studio with teamSize 2-5', () => {
    const studio = buildNicheSiteData('salon', {
      businessName: 'Small Shop',
      teamSize: 3,
    });
    expect(studio._level).toBe('studio');
  });

  it('explicit level overrides auto-detection', () => {
    const siteData = buildNicheSiteData('salon', {
      businessName: 'Test',
      level: 'established',
    });
    expect(siteData._level).toBe('established');
  });
});

// 8. Feature defaults per layout
describe('nicheTemplateBuilders — feature defaults', () => {
  it('craftsman defaults booking off, payment on', () => {
    const siteData = buildNicheSiteData('plumbing', { businessName: 'Test' });
    expect(siteData._features.booking.enabled).toBe(false);
    expect(siteData._features.onlinePayment.enabled).toBe(true);
    expect(siteData._features.cashPayment.enabled).toBe(true);
  });

  it('mercantile defaults ordering and booking on', () => {
    const siteData = buildNicheSiteData('restaurant', { businessName: 'Test' });
    expect(siteData._features.onlineOrdering.enabled).toBe(true);
    expect(siteData._features.booking.enabled).toBe(true);
  });

  it('counsel defaults booking off, ordering off', () => {
    const siteData = buildNicheSiteData('consultant', { businessName: 'Test' });
    expect(siteData._features.booking.enabled).toBe(false);
    expect(siteData._features.onlineOrdering.enabled).toBe(false);
  });

  it('atelier defaults booking on', () => {
    const siteData = buildNicheSiteData('salon', { businessName: 'Test' });
    expect(siteData._features.booking.enabled).toBe(true);
  });

  it('user feature overrides respected', () => {
    const siteData = buildNicheSiteData('salon', {
      businessName: 'Test',
      features: { booking: { enabled: false } },
    });
    expect(siteData._features.booking.enabled).toBe(false);
  });
});

// 9. Niche → layout consistency
describe('nicheTemplateBuilders — niche→layout consistency', () => {
  it('every niche config maps to the expected layout via getLayoutForNiche', () => {
    const all = [...CRAFTSMAN_NICHES, ...COUNSEL_NICHES, ...MERCANTILE_NICHES];
    for (const niche of all) {
      const layout = getLayoutForNiche(niche.id);
      const siteData = buildNicheSiteData(niche.id, { businessName: 'Test' });
      expect(siteData._layout, `${niche.id} layout mismatch`).toBe(layout);
    }
  });

  it('craftsman niches map to craftsman layout', () => {
    expect(getLayoutForNiche('cleaning')).toBe('craftsman');
    expect(getLayoutForNiche('plumbing')).toBe('craftsman');
  });

  it('counsel niches map to counsel layout', () => {
    expect(getLayoutForNiche('consultant')).toBe('counsel');
    expect(getLayoutForNiche('freelancer')).toBe('counsel');
  });

  it('mercantile niches map to mercantile layout', () => {
    expect(getLayoutForNiche('restaurant')).toBe('mercantile');
    expect(getLayoutForNiche('product-ordering')).toBe('mercantile');
  });
});

// 10. Error handling
describe('nicheTemplateBuilders — error handling', () => {
  it('throws for unknown niche', () => {
    expect(() => buildNicheSiteData('nonexistent', { businessName: 'Test' })).toThrow();
  });
});

describe('nicheTemplateBuilders — hours, location, social seeds', () => {
  const SOCIAL_KEYS = ['facebook', 'instagram', 'whatsapp', 'tiktok', 'maps', 'website', 'linkedin'];

  it('seeds hours, location, and social around contact for every niche', () => {
    for (const nicheId of Object.keys(NICHE_CONFIGS)) {
      const siteData = buildNicheSiteData(nicheId, { businessName: 'Test' });
      const types = siteData.sections.map((s) => s.type);
      const contactIdx = types.indexOf('contact');
      expect(types[contactIdx - 2], `${nicheId} hours before contact`).toBe('hours');
      expect(types[contactIdx - 1], `${nicheId} location before contact`).toBe('location');
      expect(types[contactIdx + 1], `${nicheId} social after contact`).toBe('social');

      const hours = siteData.sections.find((s) => s.type === 'hours');
      expect(hours.content.hours).toBe(NICHE_CONFIGS[nicheId].defaultHours);

      const social = siteData.sections.find((s) => s.type === 'social');
      expect(social.content.title).toBe('Find us');
      for (const key of SOCIAL_KEYS) {
        expect(social.content).toHaveProperty(key);
        expect(siteData.social).toHaveProperty(key);
      }
    }
  });

  it('rewrites salon hero copy away from generic luxury language', () => {
    const salon = getNicheConfig('salon');
    expect(salon.heroTitle).not.toMatch(/artistry/i);
    expect(salon.heroTitle).toMatch(/hours|book/i);
    expect(salon.defaultHours).toMatch(/Tue/);
  });
});