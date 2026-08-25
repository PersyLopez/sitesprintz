import { describe, it, expect } from 'vitest';
import {
  buildUniqueLookTheme,
  applyUniqueLook,
  applyBrandMatch,
  isUniqueLookTheme,
} from '../../src/config/uniqueLook.js';
import { resolveTheme } from '../../src/config/layoutTokens.js';
import { composePage } from '../../src/utils/layoutRenderer.js';
import { listSiteThemes } from '../../src/config/siteThemes.js';

const VALID_LOOK = {
  mode: 'light',
  paper: '#f6f4ef',
  surface: '#fffefb',
  text: '#1b1b1f',
  muted: '#5c5c64',
  accent: '#2c4a86',
  onAccent: '#f6f4ef',
  displayFont: 'fraunces',
  bodyFont: 'inter',
  radius: 10,
};

describe('brand match and unique look', () => {
  it('keeps the public catalog at six palettes', () => {
    expect(listSiteThemes()).toHaveLength(6);
  });

  it('applies brand match from a locked palette plus logo', () => {
    const next = applyBrandMatch(
      { businessName: 'Riverside', _uniqueLook: { id: 'stale' } },
      { themeId: 'ivory-navy', logoUrl: 'https://cdn.example/logo.png', faviconUrl: '/favicon.ico' },
    );
    expect(next._themeId).toBe('ivory-navy');
    expect(next.colors.accent).toBe('#2c4a86');
    expect(next.brand.logo).toBe('https://cdn.example/logo.png');
    expect(next.favicon).toBe('/favicon.ico');
    expect(next._uniqueLook).toBeUndefined();
  });

  it('rejects brand match hex that is not a catalog id', () => {
    expect(() => applyBrandMatch({}, { themeId: '#ff00aa' })).toThrow(/locked palette/);
  });

  it('builds an AA unique look and uses it in compose', () => {
    const theme = buildUniqueLookTheme(VALID_LOOK);
    expect(isUniqueLookTheme(theme)).toBe(true);
    const siteData = applyUniqueLook({ businessName: 'Atelier' }, VALID_LOOK);
    expect(siteData._themeId).toBe('unique-look');

    const resolved = resolveTheme({
      layout: 'atelier',
      character: 'refined',
      level: 'solo',
      overrides: { uniqueLook: theme },
    });
    expect(resolved.theme.bg).toBe('#f6f4ef');
    expect(resolved.theme.accentValue).toBe('#2c4a86');
    expect(resolved.typography.display.family).toMatch(/Fraunces/);

    const page = composePage({ siteData });
    expect(page.tokens.theme.accentValue).toBe('#2c4a86');
  });

  it('rejects unique look tokens that fail AA', () => {
    expect(() => buildUniqueLookTheme({
      ...VALID_LOOK,
      text: '#eeeeee',
      muted: '#dddddd',
    })).toThrow(/AA/);
  });
});
