import { SITE_THEMES, colorsFromSiteTheme, themeMeetsAa } from './siteThemes.js';

const HEX = /^#[0-9a-fA-F]{6}$/;
const DISPLAY_FONTS = {
  fraunces: { family: '"Fraunces", serif', key: 'fraunces' },
  inter: { family: '"Inter", sans-serif', key: 'inter' },
};
const BODY_FONTS = {
  inter: { family: '"Inter", sans-serif', key: 'inter' },
};

function requireHex(value, label) {
  if (!HEX.test(String(value || ''))) {
    const error = new Error(`${label} must be a 6-digit hex color`);
    error.code = 'INVALID_HEX';
    throw error;
  }
  return String(value).toLowerCase();
}

/**
 * Site-specific Unique look. Not a public ThemePicker id. AA is required.
 * @param {object} spec
 */
export function buildUniqueLookTheme(spec = {}) {
  const mode = spec.mode === 'light' ? 'light' : 'dark';
  const display = DISPLAY_FONTS[spec.displayFont] || DISPLAY_FONTS.fraunces;
  const body = BODY_FONTS[spec.bodyFont] || BODY_FONTS.inter;
  const radius = Number(spec.radius);
  const safeRadius = Number.isFinite(radius) ? Math.min(24, Math.max(0, radius)) : 8;

  const tokens = {
    bg: requireHex(spec.paper || spec.bg, 'paper'),
    surface: requireHex(spec.surface || spec.paper || spec.bg, 'surface'),
    text: requireHex(spec.text, 'text'),
    muted: requireHex(spec.muted, 'muted'),
    accent: requireHex(spec.accent, 'accent'),
    onAccent: requireHex(spec.onAccent, 'onAccent'),
    hairline: mode === 'light' ? 'rgba(27,27,31,.12)' : 'rgba(244,242,238,.12)',
    overlay: mode === 'light' ? 'rgba(246,244,239,0.28)' : 'rgba(8,8,10,0.58)',
  };

  const theme = {
    id: 'unique-look',
    name: 'Unique look',
    mode,
    tokens,
    typography: {
      display: display.family,
      body: body.family,
    },
    radii: { card: `${safeRadius}px` },
  };

  if (!themeMeetsAa(theme)) {
    const error = new Error('Unique look must meet WCAG AA contrast');
    error.code = 'AA_FAIL';
    throw error;
  }

  return theme;
}

export function isUniqueLookTheme(value) {
  return Boolean(value && value.id === 'unique-look' && value.tokens && themeMeetsAa(value));
}

export function colorsFromUniqueLook(theme) {
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

export function applyUniqueLook(siteData, spec) {
  const theme = buildUniqueLookTheme(spec);
  return {
    ...siteData,
    _themeId: 'unique-look',
    _uniqueLook: theme,
    colors: colorsFromUniqueLook(theme),
  };
}

/**
 * Brand match: locked public palette + logo/favicon. Never a freeform hex picker.
 */
export function applyBrandMatch(siteData, { themeId, logoUrl, faviconUrl } = {}) {
  if (!themeId || !SITE_THEMES[themeId]) {
    const error = new Error('Brand match must use a locked palette');
    error.code = 'INVALID_THEME';
    throw error;
  }
  const next = {
    ...siteData,
    _themeId: themeId,
    colors: colorsFromSiteTheme(themeId),
  };
  delete next._uniqueLook;
  if (logoUrl) {
    next.brand = { ...(siteData.brand || {}), logo: logoUrl };
  }
  if (faviconUrl) {
    next.favicon = faviconUrl;
  }
  return next;
}
