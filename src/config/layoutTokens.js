/**
 * Layout Tokens — Single source of truth for the "Refined Instrument" design system.
 *
 * Exports: base modes, accent palette, typography scale, spacing, radii, elevation,
 * character definitions, and the resolveTheme() function that merges user overrides
 * with layout/character/level defaults.
 */

import { getSiteTheme } from './siteThemes.js';
import { isUniqueLookTheme } from './uniqueLook.js';
import { countTeamSlots } from '../utils/businessScale.js';

// ---------------------------------------------------------------------------
// 1. Base modes
// ---------------------------------------------------------------------------

export const BASE_MODES = {
  onyx: {
    name: 'Onyx',
    bg: '#0c0c0e',
    surface: '#141417',
    text: '#f4f2ee',
    muted: '#8a8a8f',
    hairline: 'rgba(244,242,238,.10)',
  },
  ivory: {
    name: 'Ivory',
    bg: '#f6f4ef',
    surface: '#fffefb',
    text: '#1b1b1f',
    muted: '#6b6b72',
    hairline: 'rgba(27,27,31,.10)',
  },
};

// ---------------------------------------------------------------------------
// 2. Accent palette — one curated hue per category
// ---------------------------------------------------------------------------

export const REFINED_ACCENTS = {
  trade:    { name: 'Trade',    value: '#3b6ea5', niches: ['plumbing', 'electrician', 'tech-repair'] },
  workshop: { name: 'Workshop', value: '#a8763e', niches: ['auto-repair', 'tow-truck'] },
  studio:   { name: 'Studio',   value: '#7c2d2d', niches: ['salon'] },
  club:     { name: 'Club',     value: '#4a4f57', niches: ['gym'] },
  counsel:  { name: 'Counsel',  value: '#2e3a6b', niches: ['consultant', 'freelancer'] },
  hearth:   { name: 'Hearth',   value: '#2f5d43', niches: ['cleaning', 'pet-care'] },
  table:    { name: 'Table',    value: '#9a6a1f', niches: ['restaurant', 'product-ordering', 'product-showcase'] },
};

export const APPROACHABLE_ACCENTS = {
  market:  { name: 'Market',  value: '#c2683a', niches: ['food-stall', 'pop-up-food'] },
  garage:  { name: 'Garage',  value: '#a4563a', niches: ['yard-sale', 'estate-sale'] },
  stand:   { name: 'Stand',   value: '#c98a2b', niches: ['lemonade-stand', 'bake-sale'] },
  fair:    { name: 'Fair',    value: '#7a4a6b', niches: ['pop-up-shop', 'craft-market'] },
};

// Flat lookup: accent key → hex value
export const ACCENT_VALUES = Object.fromEntries(
  [
    ...Object.entries(REFINED_ACCENTS),
    ...Object.entries(APPROACHABLE_ACCENTS),
  ].map(([key, obj]) => [key, obj.value])
);

// Niche → default accent key
const NICHE_ACCENT_MAP = Object.fromEntries(
  [
    ...Object.values(REFINED_ACCENTS),
    ...Object.values(APPROACHABLE_ACCENTS),
  ].flatMap((accent) => accent.niches.map((n) => [n, accent.name.toLowerCase()]))
);

// ---------------------------------------------------------------------------
// 3. Typography scale
// ---------------------------------------------------------------------------

export const TYPOGRAPHY = {
  display: {
    refined:       { family: '"Fraunces", serif',   weights: [400, 600] },
    approachable:  { family: '"Inter", sans-serif',  weights: [600, 700] },
  },
  body:            { family: '"Inter", sans-serif',  weights: [400, 500, 600] },
  label:           { family: '"Inter", sans-serif',  weight: 500, transform: 'uppercase', letterSpacing: '0.14em', size: '0.75rem' },
  scale: {
    'display-xl': { size: '3.25rem', lineHeight: 1.08 },
    'display-lg': { size: '2.5rem',  lineHeight: 1.1  },
    h2:           { size: '1.75rem', lineHeight: 1.2  },
    h3:           { size: '1.25rem', lineHeight: 1.3  },
    'body-lg':    { size: '1.125rem', lineHeight: 1.6  },
    body:          { size: '1rem',    lineHeight: 1.65 },
    label:         { size: '0.75rem', lineHeight: 1.4  },
  },
};

// ---------------------------------------------------------------------------
// 4. Spacing, radii, elevation
// ---------------------------------------------------------------------------

export const SPACING = {
  xs: '8px',
  sm: '16px',
  md: '24px',
  lg: '40px',
  xl: '64px',
  '2xl': '96px',
};

export const SECTION_PADDING = 'clamp(64px, 8vw, 96px)';

export const RADII = {
  refined: {
    card: '0',
    input: '4px',
    button: '4px',
    pill: '9999px',
  },
  approachable: {
    card: '6px',
    input: '6px',
    button: '6px',
    pill: '9999px',
  },
};

export const ELEVATION = {
  onyx: {
    card:  '0 1px 0 rgba(244,242,238,.10) 0 8px 24px rgba(0,0,0,.18)',
    hover: 'translateY(-2px)',
  },
  ivory: {
    card:  'none',
    hover: 'translateY(-2px)',
  },
};

// ---------------------------------------------------------------------------
// 5. Characters
// ---------------------------------------------------------------------------

export const CHARACTERS = {
  refined: {
    name: 'Refined',
    defaultMode: 'onyx',
    display: TYPOGRAPHY.display.refined,
    motion: { type: 'scroll-reveal', duration: '400ms' },
    radii: RADII.refined,
  },
  approachable: {
    name: 'Approachable',
    defaultMode: 'ivory',
    display: TYPOGRAPHY.display.approachable,
    motion: { type: 'snappy-hover', duration: '200ms' },
    radii: RADII.approachable,
  },
};

// ---------------------------------------------------------------------------
// 6. Business levels
// ---------------------------------------------------------------------------

export const LEVELS = {
  solo: {
    name: 'Solo',
    description: 'Just you — no team page, first-person copy, customers book with you directly',
  },
  studio: {
    name: 'Studio',
    description: 'A small team — show your people, let customers pick who they see',
  },
  established: {
    name: 'Established',
    description: 'A larger business — full team grid, reviews, credentials, and stats',
  },
};

// ---------------------------------------------------------------------------
// 7. Theme resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a complete theme from layout, character, level, and user overrides.
 *
 * Priority: explicit user override → layout default → character default → engine default.
 *
 * @param {Object} opts
 * @param {string} opts.layout    - Layout key (atelier, craftsman, etc.)
 * @param {string} opts.character - Character key (refined, approachable)
 * @param {string} opts.level     - Level key (solo, studio, established)
 * @param {string} [opts.niche]   - Niche key for accent auto-selection
 * @param {Object} [opts.overrides] - User overrides { themeId, mode, accent, accentValue }
 * @returns {Object} Resolved theme tokens
 */
export function resolveTheme({ layout, character, level, niche, overrides } = {}) {
  const charDef = CHARACTERS[character] || CHARACTERS.refined;
  const uniqueLook = isUniqueLookTheme(overrides?.uniqueLook) ? overrides.uniqueLook : null;
  const themeId = uniqueLook ? uniqueLook.id : overrides?.themeId;

  if (uniqueLook || themeId) {
    const siteTheme = uniqueLook || getSiteTheme(themeId);
    const tokens = siteTheme.tokens;
    const elevation = ELEVATION[siteTheme.mode === 'light' ? 'ivory' : 'onyx'];
    const displayFamily = uniqueLook?.typography?.display;
    const bodyFamily = uniqueLook?.typography?.body;
    const radii = uniqueLook?.radii
      ? { ...charDef.radii, ...uniqueLook.radii }
      : charDef.radii;
    return {
      layout,
      character,
      level,
      themeId: siteTheme.id,
      theme: {
        id: siteTheme.id,
        mode: siteTheme.mode === 'light' ? 'ivory' : 'onyx',
        accent: siteTheme.id,
        accentValue: tokens.accent,
        onAccent: tokens.onAccent,
        overlay: tokens.overlay,
        bg: tokens.bg,
        surface: tokens.surface,
        text: tokens.text,
        muted: tokens.muted,
        hairline: tokens.hairline,
      },
      typography: {
        display: displayFamily
          ? { ...charDef.display, family: displayFamily }
          : charDef.display,
        body: bodyFamily
          ? { ...TYPOGRAPHY.body, family: bodyFamily }
          : TYPOGRAPHY.body,
        label: TYPOGRAPHY.label,
        scale: TYPOGRAPHY.scale,
      },
      spacing: SPACING,
      sectionPadding: SECTION_PADDING,
      radii,
      elevation,
      motion: charDef.motion,
    };
  }

  // Resolve mode: user override > default for character
  const mode = overrides?.mode || charDef.defaultMode;
  const baseMode = BASE_MODES[mode] || BASE_MODES.onyx;

  // Resolve accent: user override > niche mapping > layout default
  const accentKey = overrides?.accent
    || (niche && NICHE_ACCENT_MAP[niche])
    || getDefaultAccentForLayout(layout, character);
  const accentValue = overrides?.accentValue
    || ACCENT_VALUES[accentKey]
    || ACCENT_VALUES.studio; // fallback

  // Resolve elevation
  const elevation = ELEVATION[mode] || ELEVATION.onyx;

  return {
    layout,
    character,
    level,
    theme: {
      mode,
      accent: accentKey,
      accentValue,
      onAccent: mode === 'ivory' ? '#f6f4ef' : '#f4f2ee',
      ...baseMode,
    },
    typography: {
      display: charDef.display,
      body: TYPOGRAPHY.body,
      label: TYPOGRAPHY.label,
      scale: TYPOGRAPHY.scale,
    },
    spacing: SPACING,
    sectionPadding: SECTION_PADDING,
    radii: charDef.radii,
    elevation,
    motion: charDef.motion,
  };
}

/**
 * Get the default accent key for a layout+character combination.
 */
function getDefaultAccentForLayout(layout, _character) {
  const defaults = {
    atelier: 'studio',
    craftsman: 'trade',
    counsel: 'counsel',
    mercantile: 'table',
    bazaar: 'market',
  };
  return defaults[layout] || 'studio';
}

// ---------------------------------------------------------------------------
// 8. Level suggestion (auto-detect from site data)
// ---------------------------------------------------------------------------

/**
 * Suggest a business level from site data signals.
 *
 * @param {Object} siteData - Site data with team, services, products, testimonials, credentials
 * @returns {'solo'|'studio'|'established'} Suggested level
 */
export function suggestLevel(siteData) {
  if (!siteData) return 'solo';

  const staff = countTeamSlots(siteData);
  const services = asItemCount(siteData.services) || asItemCount(siteData.products);
  const hasReviews = asItemCount(siteData.testimonials) > 0;
  const hasCredentials = !!(siteData.credentials || siteData.credentialsText);

  if (staff >= 6 || (hasReviews && hasCredentials && staff >= 3)) return 'established';
  if (staff >= 2 || services > 3) return 'studio';
  return 'solo';
}

function asItemCount(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') {
    if (Array.isArray(value.items)) return value.items.length;
    if (Array.isArray(value.members)) return value.members.length;
  }
  return 0;
}