/**
 * Tests for layoutTokens.js — TDD red-green cycles
 *
 * Seams tested:
 *   1. BASE_MODES structure (onyx, ivory)
 *   2. ACCENT_VALUES (every accent has a hex value)
 *   3. NICHE_ACCENT_MAP (every niche resolves to an accent)
 *   4. resolveTheme() — token resolution priority
 *   5. suggestLevel() — auto-detection from site data
 */

import { describe, it, expect } from 'vitest';
import {
  BASE_MODES,
  REFINED_ACCENTS,
  APPROACHABLE_ACCENTS,
  ACCENT_VALUES,
  CHARACTERS,
  TYPOGRAPHY,
  SPACING,
  RADII,
  ELEVATION,
  LEVELS,
  resolveTheme,
  suggestLevel,
} from '../../src/config/layoutTokens';

// ---------------------------------------------------------------------------
// 1. Base modes
// ---------------------------------------------------------------------------

describe('layoutTokens — Base modes', () => {
  it('defines onyx and ivory base modes with required keys', () => {
    expect(BASE_MODES.onyx).toBeDefined();
    expect(BASE_MODES.ivory).toBeDefined();

    for (const mode of ['onyx', 'ivory']) {
      const m = BASE_MODES[mode];
      expect(m).toHaveProperty('bg');
      expect(m).toHaveProperty('surface');
      expect(m).toHaveProperty('text');
      expect(m).toHaveProperty('muted');
      expect(m).toHaveProperty('hairline');
      // All values are strings (CSS values)
      expect(typeof m.bg).toBe('string');
    }
  });

  it('onyx has a darker bg than ivory', () => {
    // Onyx bg should start with #0 (very dark), ivory with #f (very light)
    expect(BASE_MODES.onyx.bg.charAt(1)).toBe('0');
    expect(BASE_MODES.ivory.bg.charAt(1)).toBe('f');
  });
});

// ---------------------------------------------------------------------------
// 2. Accent palette
// ---------------------------------------------------------------------------

describe('layoutTokens — Accent palette', () => {
  it('every refined accent has a name and hex value', () => {
    for (const [key, accent] of Object.entries(REFINED_ACCENTS)) {
      expect(accent.name).toBeTruthy();
      expect(accent.value).toMatch(/^#[0-9a-f]{6}$/i);
      expect(Array.isArray(accent.niches)).toBe(true);
      expect(accent.niches.length).toBeGreaterThan(0);
    }
  });

  it('every approachable accent has a name and hex value', () => {
    for (const [key, accent] of Object.entries(APPROACHABLE_ACCENTS)) {
      expect(accent.name).toBeTruthy();
      expect(accent.value).toMatch(/^#[0-9a-f]{6}$/i);
      expect(Array.isArray(accent.niches)).toBe(true);
      expect(accent.niches.length).toBeGreaterThan(0);
    }
  });

  it('ACCENT_VALUES contains every accent key mapped to its hex value', () => {
    const allKeys = [
      ...Object.keys(REFINED_ACCENTS),
      ...Object.keys(APPROACHABLE_ACCENTS),
    ];
    for (const key of allKeys) {
      expect(ACCENT_VALUES[key]).toBeDefined();
      expect(ACCENT_VALUES[key]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('no two accent values are identical (each niche gets a distinct color)', () => {
    const values = Object.values(ACCENT_VALUES);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

// ---------------------------------------------------------------------------
// 3. Characters
// ---------------------------------------------------------------------------

describe('layoutTokens — Characters', () => {
  it('defines refined and approachable characters', () => {
    expect(CHARACTERS.refined).toBeDefined();
    expect(CHARACTERS.approachable).toBeDefined();
  });

  it('refined defaults to onyx mode', () => {
    expect(CHARACTERS.refined.defaultMode).toBe('onyx');
  });

  it('approachable defaults to ivory mode', () => {
    expect(CHARACTERS.approachable.defaultMode).toBe('ivory');
  });

  it('each character has display typography, motion, and radii', () => {
    for (const key of ['refined', 'approachable']) {
      const c = CHARACTERS[key];
      expect(c.display).toBeDefined();
      expect(c.motion).toBeDefined();
      expect(c.radii).toBeDefined();
      expect(c.radii.card).toBeDefined();
      expect(c.radii.input).toBeDefined();
      expect(c.radii.pill).toBe('9999px');
    }
  });

  it('refined has sharp cards (0 radius), approachable has rounded cards', () => {
    expect(CHARACTERS.refined.radii.card).toBe('0');
    expect(CHARACTERS.approachable.radii.card).toBe('6px');
  });
});

// ---------------------------------------------------------------------------
// 4. Typography
// ---------------------------------------------------------------------------

describe('layoutTokens — Typography', () => {
  it('has a complete type scale from display-xl to label', () => {
    const requiredSteps = ['display-xl', 'display-lg', 'h2', 'h3', 'body-lg', 'body', 'label'];
    for (const step of requiredSteps) {
      expect(TYPOGRAPHY.scale[step]).toBeDefined();
      expect(TYPOGRAPHY.scale[step].size).toBeDefined();
      expect(TYPOGRAPHY.scale[step].lineHeight).toBeDefined();
    }
  });

  it('label has uppercase tracking', () => {
    expect(TYPOGRAPHY.label.transform).toBe('uppercase');
    expect(TYPOGRAPHY.label.letterSpacing).toBe('0.14em');
  });
});

// ---------------------------------------------------------------------------
// 5. Spacing, radii, elevation
// ---------------------------------------------------------------------------

describe('layoutTokens — Spacing and radii', () => {
  it('spacing scale follows 8px baseline', () => {
    // Values should be multiples of 8 (when parsed as integers)
    for (const [key, val] of Object.entries(SPACING)) {
      const px = parseInt(val, 10);
      expect(px % 8).toBe(0);
    }
  });

  it('onyx elevation includes shadow, ivory has none', () => {
    expect(ELEVATION.onyx.card).toContain('rgba');
    expect(ELEVATION.ivory.card).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// 6. resolveTheme() — token resolution priority
// ---------------------------------------------------------------------------

describe('layoutTokens — resolveTheme()', () => {
  it('returns a complete theme object with all required keys', () => {
    const theme = resolveTheme({
      layout: 'atelier',
      character: 'refined',
      level: 'solo',
    });

    expect(theme.layout).toBe('atelier');
    expect(theme.character).toBe('refined');
    expect(theme.level).toBe('solo');
    expect(theme.theme.mode).toBe('onyx');
    expect(theme.theme.accent).toBeDefined();
    expect(theme.theme.accentValue).toBeDefined();
    expect(theme.theme.bg).toBeDefined();
    expect(theme.typography).toBeDefined();
    expect(theme.spacing).toBeDefined();
    expect(theme.radii).toBeDefined();
    expect(theme.elevation).toBeDefined();
    expect(theme.motion).toBeDefined();
  });

  it('defaults to refined/onyx when no character given', () => {
    const theme = resolveTheme({
      layout: 'atelier',
      character: 'refined',
      level: 'solo',
    });
    expect(theme.theme.mode).toBe('onyx');
    expect(theme.theme.bg).toBe(BASE_MODES.onyx.bg);
  });

  it('resolves ivory for approachable character', () => {
    const theme = resolveTheme({
      layout: 'bazaar',
      character: 'approachable',
      level: 'solo',
    });
    expect(theme.theme.mode).toBe('ivory');
    expect(theme.theme.bg).toBe(BASE_MODES.ivory.bg);
  });

  it('user override of mode takes priority over character default', () => {
    // A refined layout user explicitly choosing light mode
    const theme = resolveTheme({
      layout: 'atelier',
      character: 'refined',
      level: 'solo',
      overrides: { mode: 'ivory' },
    });
    expect(theme.theme.mode).toBe('ivory');
    expect(theme.theme.bg).toBe(BASE_MODES.ivory.bg);
  });

  it('resolves accent from niche mapping', () => {
    const theme = resolveTheme({
      layout: 'atelier',
      character: 'refined',
      level: 'studio',
      niche: 'salon',
    });
    expect(theme.theme.accent).toBe('studio');
    expect(theme.theme.accentValue).toBe('#7c2d2d');
  });

  it('resolves accent from layout default when no niche given', () => {
    const theme = resolveTheme({
      layout: 'mercantile',
      character: 'refined',
      level: 'studio',
    });
    expect(theme.theme.accent).toBe('table');
  });

  it('user override of accent takes priority over niche mapping', () => {
    const theme = resolveTheme({
      layout: 'atelier',
      character: 'refined',
      level: 'studio',
      niche: 'salon',
      overrides: { accent: 'trade', accentValue: '#3b6ea5' },
    });
    expect(theme.theme.accent).toBe('trade');
    expect(theme.theme.accentValue).toBe('#3b6ea5');
  });

  it('each layout gets a sensible default accent', () => {
    const layouts = ['atelier', 'craftsman', 'counsel', 'mercantile', 'bazaar'];
    const accents = layouts.map((l) =>
      resolveTheme({ layout: l, character: 'refined', level: 'solo' }).theme.accent
    );
    // All defaults are distinct
    expect(new Set(accents).size).toBe(layouts.length);
  });

  it('approachable character uses snappy motion', () => {
    const theme = resolveTheme({
      layout: 'bazaar',
      character: 'approachable',
      level: 'solo',
    });
    expect(theme.motion.type).toBe('snappy-hover');
    expect(theme.motion.duration).toBe('200ms');
  });

  it('refined character uses scroll-reveal motion', () => {
    const theme = resolveTheme({
      layout: 'atelier',
      character: 'refined',
      level: 'solo',
    });
    expect(theme.motion.type).toBe('scroll-reveal');
  });

  it('locks a curated site theme and ignores raw accent overrides', () => {
    const theme = resolveTheme({
      layout: 'atelier',
      character: 'refined',
      level: 'studio',
      niche: 'salon',
      overrides: { themeId: 'ivory-navy', accent: 'studio', accentValue: '#7c2d2d' },
    });
    expect(theme.themeId).toBe('ivory-navy');
    expect(theme.theme.mode).toBe('ivory');
    expect(theme.theme.bg).toBe('#f6f4ef');
    expect(theme.theme.accentValue).toBe('#2c4a86');
    expect(theme.theme.onAccent).toBe('#f6f4ef');
    expect(theme.theme.accentValue).not.toBe('#7c2d2d');
  });
});

// ---------------------------------------------------------------------------
// 7. suggestLevel() — auto-detection
// ---------------------------------------------------------------------------

describe('layoutTokens — suggestLevel()', () => {
  it('returns solo for empty data', () => {
    expect(suggestLevel(null)).toBe('solo');
    expect(suggestLevel({})).toBe('solo');
    expect(suggestLevel({ team: [], services: [] })).toBe('solo');
  });

  it('returns solo for 1 staff member with few services', () => {
    expect(suggestLevel({ team: [{}], services: [{}] })).toBe('solo');
  });

  it('returns studio for 2-5 staff or 4+ services', () => {
    expect(suggestLevel({ team: [{}, {}], services: [] })).toBe('studio');
    expect(suggestLevel({ team: [], services: [{}, {}, {}, {}] })).toBe('studio');
    expect(suggestLevel({ team: [{}, {}, {}, {}, {}], services: [] })).toBe('studio');
  });

  it('returns established for 6+ staff', () => {
    const team6 = Array.from({ length: 6 }, () => ({}));
    expect(suggestLevel({ team: team6 })).toBe('established');
  });

  it('returns established for 3+ staff with reviews AND credentials', () => {
    const team3 = Array.from({ length: 3 }, () => ({}));
    expect(
      suggestLevel({ team: team3, testimonials: [{}], credentialsText: 'Certified' })
    ).toBe('established');
  });

  it('does not return established for 3 staff with reviews but no credentials', () => {
    const team3 = Array.from({ length: 3 }, () => ({}));
    expect(suggestLevel({ team: team3, testimonials: [{}] })).toBe('studio');
  });

  it('counts catalog-shaped { members } the same as a team array', () => {
    expect(suggestLevel({ team: { members: [{}, {}] } })).toBe('studio');
    expect(suggestLevel({ team: { members: [{}] } })).toBe('solo');
  });

  it('honors an explicit teamSize hint', () => {
    expect(suggestLevel({ teamSize: 6, team: [] })).toBe('established');
  });

  it('counts products as services when services is absent', () => {
    expect(suggestLevel({ products: [{}, {}, {}, {}] })).toBe('studio');
  });
});