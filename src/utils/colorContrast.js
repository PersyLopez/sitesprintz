/**
 * WCAG contrast helpers for curated site themes.
 * Ratios: AA normal text 4.5:1, AA large text / UI 3:1.
 */

function hexToRgb(hex) {
  const value = String(hex || '').replace('#', '').trim();
  if (value.length !== 6) return null;
  const n = Number.parseInt(value, 16);
  if (Number.isNaN(n)) return null;
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function channelToLinear(channel) {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const r = channelToLinear(rgb.r);
  const g = channelToLinear(rgb.g);
  const b = channelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export const WCAG_AA_TEXT = 4.5;
export const WCAG_AA_LARGE = 3;

export function meetsAaText(foreground, background) {
  return contrastRatio(foreground, background) >= WCAG_AA_TEXT;
}

export function meetsAaLarge(foreground, background) {
  return contrastRatio(foreground, background) >= WCAG_AA_LARGE;
}
