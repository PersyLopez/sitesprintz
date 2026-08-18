/**
 * Curated site themes — locked palettes with WCAG AA contrast.
 */

import { describe, it, expect } from 'vitest';
import {
  SITE_THEMES,
  DEFAULT_SITE_THEME_ID,
  listSiteThemes,
  getSiteTheme,
  getRecommendedSiteThemes,
  colorsFromSiteTheme,
  themeMeetsAa,
  defaultThemeIdForNiche,
  normalizeSiteThemeId,
} from '../../src/config/siteThemes';
import { resolveTheme } from '../../src/config/layoutTokens';
import { composePage } from '../../src/utils/layoutRenderer';
import { buildLiveSiteMarkup } from '../../src/utils/publishedSiteDocument';
import { renderSectionToHtml } from '../../src/utils/sectionHtmlBridge';

describe('siteThemes catalog', () => {
  it('exposes exactly six locked themes', () => {
    expect(listSiteThemes()).toHaveLength(6);
    expect(Object.keys(SITE_THEMES)).toEqual([
      'onyx-ink',
      'onyx-oxblood',
      'onyx-brass',
      'onyx-ember',
      'ivory-navy',
      'ivory-grove',
    ]);
  });

  it('meets WCAG AA for every theme token pair', () => {
    for (const theme of listSiteThemes()) {
      expect(themeMeetsAa(theme), theme.id).toBe(true);
    }
  });

  it('maps colorsFromSiteTheme from locked tokens, not freeform hex', () => {
    const colors = colorsFromSiteTheme('ivory-navy');
    expect(colors.themeId).toBe('ivory-navy');
    expect(colors.mode).toBe('light');
    expect(colors.accent).toBe('#2c4a86');
    expect(colors.onAccent).toBe('#f6f4ef');
    expect(colors.background).toBe('#f6f4ef');
  });

  it('falls back to the default theme for unknown ids', () => {
    expect(getSiteTheme('tech-cyan').id).toBe(DEFAULT_SITE_THEME_ID);
    expect(normalizeSiteThemeId('custom', 'salon')).toBe('onyx-oxblood');
    expect(normalizeSiteThemeId('onyx-brass', 'salon')).toBe('onyx-brass');
  });

  it('recommends matching themes first for a niche', () => {
    const ordered = getRecommendedSiteThemes('salon');
    expect(ordered[0].id).toBe('onyx-oxblood');
    expect(defaultThemeIdForNiche('salon')).toBe('onyx-oxblood');
    expect(defaultThemeIdForNiche('food-stall')).toBe('ivory-grove');
  });
});

describe('siteThemes in compose and live markup', () => {
  it('resolveTheme with themeId returns locked tokens', () => {
    const tokens = resolveTheme({
      layout: 'counsel',
      character: 'refined',
      level: 'established',
      overrides: { themeId: 'ivory-navy' },
    });
    expect(tokens.theme.bg).toBe('#f6f4ef');
    expect(tokens.theme.text).toBe('#1b1b1f');
    expect(tokens.theme.accentValue).toBe('#2c4a86');
    expect(tokens.theme.onAccent).toBe('#f6f4ef');
  });

  it('composePage uses _themeId over niche accent defaults', () => {
    const page = composePage({
      siteData: {
        businessName: 'Northstar',
        _niche: 'consultant',
        _themeId: 'ivory-navy',
        heroTitle: 'Clarity for operators',
        contactEmail: 'hello@northstar.test',
      },
      niche: 'consultant',
      level: 'established',
    });
    expect(page.tokens.themeId).toBe('ivory-navy');
    expect(page.tokens.theme.mode).toBe('ivory');
    expect(page.tokens.theme.accentValue).toBe('#2c4a86');
  });

  it('live markup uses on-accent for buttons and photo overlay for heroes', () => {
    const { css, html } = buildLiveSiteMarkup({
      businessName: 'Luxe Beauty Studio',
      brand: { name: 'Luxe Beauty Studio' },
      _layout: 'atelier',
      _niche: 'salon',
      _themeId: 'onyx-oxblood',
      hero: {
        title: 'Quiet luxury',
        subtitle: 'Color, cut, and care',
        image: 'https://example.com/salon.jpg',
      },
      contact: { email: 'hello@luxe.test' },
    });
    expect(css).toContain('--ss-on-accent: #140808');
    expect(css).toContain('--ss-accent:');
    expect(html).toContain('ss-hero--photo');
    expect(css).toContain('rgba(8,8,10,0.78)');
    expect(html).toContain('ss-hero-photo');
    expect(html).toContain('width="1600"');
  });

  it('canvas heroes (no photo) use theme text, not forced white', () => {
    const html = renderSectionToHtml({
      type: 'hero',
      content: { title: 'Advisory', subtitle: 'For operators', ctaText: 'Call' },
    }, resolveTheme({
      layout: 'counsel',
      character: 'refined',
      overrides: { themeId: 'ivory-navy' },
    }));
    expect(html).not.toContain('ss-hero--photo');
    expect(html).toContain('background: #f6f4ef');
    expect(html).not.toMatch(/color: #fff/);
  });
});
