/**
 * Curated site themes — the only supported visual customization.
 *
 * Each theme is a complete, locked token set (background, text, muted, accent,
 * button-on-accent). Users pick a theme id. They do not pick raw hex.
 *
 * Contrast is WCAG AA: body/muted vs bg ≥ 4.5:1, button label vs accent ≥ 4.5:1.
 */

import { contrastRatio, meetsAaText } from '../utils/colorContrast.js';

const ONYX = {
  bg: '#0c0c0e',
  surface: '#16161a',
  text: '#f4f2ee',
  muted: '#b8b8be',
  hairline: 'rgba(244,242,238,.12)',
  overlay: 'rgba(8,8,10,0.58)',
};

const IVORY = {
  bg: '#f6f4ef',
  surface: '#fffefb',
  text: '#1b1b1f',
  muted: '#5c5c64',
  hairline: 'rgba(27,27,31,.12)',
  overlay: 'rgba(246,244,239,0.28)',
};

/**
 * @typedef {Object} SiteTheme
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {'dark'|'light'} mode
 * @property {string[]} recommendedFor
 * @property {Object} tokens
 */

export const SITE_THEMES = {
  'onyx-ink': {
    id: 'onyx-ink',
    name: 'Onyx Ink',
    description: 'Near-black canvas, steel accent. Calm and precise.',
    mode: 'dark',
    recommendedFor: ['electrician', 'plumbing', 'tech-repair', 'consultant', 'freelancer'],
    tokens: { ...ONYX, accent: '#5b8fd4', onAccent: '#0c0c0e' },
  },
  'onyx-oxblood': {
    id: 'onyx-oxblood',
    name: 'Onyx Oxblood',
    description: 'Dark studio lighting with a deep red accent.',
    mode: 'dark',
    recommendedFor: ['salon', 'pet-care'],
    tokens: { ...ONYX, accent: '#d16b6b', onAccent: '#140808' },
  },
  'onyx-brass': {
    id: 'onyx-brass',
    name: 'Onyx Brass',
    description: 'Dark dining-room brass. Warm, not neon gold.',
    mode: 'dark',
    recommendedFor: ['restaurant', 'product-showcase', 'product-ordering'],
    tokens: { ...ONYX, accent: '#d4b36a', onAccent: '#1a1408' },
  },
  'onyx-ember': {
    id: 'onyx-ember',
    name: 'Onyx Ember',
    description: 'Workshop warmth — terracotta on charcoal.',
    mode: 'dark',
    recommendedFor: ['auto-repair', 'tow-truck', 'gym'],
    tokens: { ...ONYX, accent: '#e07a4c', onAccent: '#1a0c08' },
  },
  'ivory-navy': {
    id: 'ivory-navy',
    name: 'Ivory Navy',
    description: 'Paper-white page with ink-navy actions.',
    mode: 'light',
    recommendedFor: ['consultant', 'freelancer', 'cleaning'],
    tokens: { ...IVORY, accent: '#2c4a86', onAccent: '#f6f4ef' },
  },
  'ivory-grove': {
    id: 'ivory-grove',
    name: 'Ivory Grove',
    description: 'Soft ivory with a forest action color.',
    mode: 'light',
    recommendedFor: ['cleaning', 'pet-care', 'food-stall', 'pop-up-food', 'yard-sale', 'lemonade-stand', 'bake-sale', 'pop-up-shop', 'craft-market', 'estate-sale'],
    tokens: { ...IVORY, accent: '#2f6b4a', onAccent: '#f6f4ef' },
  },
};

export const DEFAULT_SITE_THEME_ID = 'onyx-ink';

export function normalizeSiteThemeId(themeId, niche) {
  if (themeId && SITE_THEMES[themeId]) return themeId;
  return defaultThemeIdForNiche(niche);
}

export function getSiteTheme(themeId) {
  return SITE_THEMES[themeId] || SITE_THEMES[DEFAULT_SITE_THEME_ID];
}

export function listSiteThemes() {
  return Object.values(SITE_THEMES);
}

export function getRecommendedSiteThemes(niche) {
  const all = listSiteThemes();
  if (!niche) return all;
  const recommended = all.filter((theme) => theme.recommendedFor.includes(niche));
  const rest = all.filter((theme) => !theme.recommendedFor.includes(niche));
  return [...recommended, ...rest];
}

export function colorsFromSiteTheme(themeId) {
  const theme = getSiteTheme(themeId);
  const { tokens, mode, id } = theme;
  return {
    themeId: id,
    mode,
    primary: tokens.accent,
    accent: tokens.accent,
    background: tokens.bg,
    surface: tokens.surface,
    text: tokens.text,
    textMuted: tokens.muted,
    onAccent: tokens.onAccent,
  };
}

export function getThemeContrastReport(theme) {
  const { tokens } = theme;
  return {
    id: theme.id,
    textOnBg: contrastRatio(tokens.text, tokens.bg),
    mutedOnBg: contrastRatio(tokens.muted, tokens.bg),
    textOnSurface: contrastRatio(tokens.text, tokens.surface),
    mutedOnSurface: contrastRatio(tokens.muted, tokens.surface),
    onAccentOnAccent: contrastRatio(tokens.onAccent, tokens.accent),
  };
}

export function themeMeetsAa(theme) {
  const { tokens } = theme;
  return (
    meetsAaText(tokens.text, tokens.bg)
    && meetsAaText(tokens.muted, tokens.bg)
    && meetsAaText(tokens.text, tokens.surface)
    && meetsAaText(tokens.muted, tokens.surface)
    && meetsAaText(tokens.onAccent, tokens.accent)
  );
}

export function defaultThemeIdForNiche(niche) {
  const match = listSiteThemes().find((theme) => theme.recommendedFor.includes(niche));
  return match?.id || DEFAULT_SITE_THEME_ID;
}
