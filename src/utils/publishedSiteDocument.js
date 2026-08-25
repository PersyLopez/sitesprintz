/**
 * Shared live-site document builder for /view and preview.
 * composePage() + section HTML + chrome (nav/footer) + theme CSS.
 */

import { composePage } from './layoutRenderer.js';
import { renderSectionToHtml, withNativeBookingTokens } from './sectionHtmlBridge.js';
import { buildSiteNav } from '../config/operatingModel.js';
import {
  resolvePrimaryCta,
  resolveSiteAddress,
  resolveSitePhone,
  shouldRemoveBranding,
  telHref,
} from './liveSiteContact.js';

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/'/g, '&#039;');
}

function themeAccent(tokens) {
  const theme = tokens?.theme || {};
  if (theme.accentValue && String(theme.accentValue).startsWith('#')) return theme.accentValue;
  if (theme.accent && String(theme.accent).startsWith('#')) return theme.accent;
  return '#c2683a';
}

function isEmptyOptional(section) {
  if (!section || section._placeholder) return true;
  const c = section.content || {};
  const list = (value) => (Array.isArray(value) ? value : []);
  switch (section.type) {
    case 'hero':
      return !c.title && !c.subtitle;
    case 'services':
    case 'catalog':
    case 'menu':
      return list(c.items).length === 0 && list(c.sections).length === 0;
    case 'gallery':
      return false;
    case 'team':
      return list(c.members).length === 0;
    case 'testimonials':
    case 'faq':
    case 'credentials':
    case 'stats':
    case 'case-studies':
    case 'industries':
      return list(c.items).length === 0 && !c.rating;
    case 'reviews':
      return list(c.items).length === 0 && !c.rating && !c.placeId;
    case 'before-after':
      return list(c.pairs).length === 0;
    case 'about':
      return !c.body && !c.description;
    case 'hours':
      return !c.hours;
    case 'location':
      return !c.address && !c.publicGeo;
    case 'social':
      return !['facebook', 'instagram', 'whatsapp', 'tiktok', 'maps', 'website', 'linkedin', 'twitter', 'youtube']
        .some((key) => c[key]);
    case 'service-areas':
      return list(c.areas).length === 0;
    case 'process':
    case 'how-to-order':
      return list(c.steps).length === 0;
    case 'placeholder':
      return true;
    default:
      return false;
  }
}

export function getLiveSiteThemeVars(tokens = {}) {
  const theme = tokens.theme || {};
  const accent = themeAccent(tokens);
  const bg = theme.bg || '#0c0c0e';
  const text = theme.text || '#f4f2ee';
  const muted = theme.muted || '#8a8a8f';
  const surface = theme.surface || '#141417';
  const hairline = theme.hairline || 'rgba(244,242,238,.10)';
  const onAccent = theme.onAccent || '#f4f2ee';
  return {
    '--ss-bg': bg,
    '--ss-text': text,
    '--ss-muted': muted,
    '--ss-surface': surface,
    '--ss-accent': accent,
    '--ss-on-accent': onAccent,
    '--ss-hairline': hairline,
    '--primary-color': accent,
    '--bg-card': surface,
    '--bg-elevated': surface,
    '--bg-darker': bg,
    '--text-light': text,
    '--text-muted': muted,
    '--border-dark': hairline,
  };
}

export function getLiveSiteCss(tokens = {}) {
  const theme = tokens.theme || {};
  const accent = themeAccent(tokens);
  const bg = theme.bg || '#0c0c0e';
  const text = theme.text || '#f4f2ee';
  const muted = theme.muted || '#8a8a8f';
  const surface = theme.surface || '#141417';
  const hairline = theme.hairline || 'rgba(244,242,238,.10)';
  const display = tokens.typography?.display?.family || '"Fraunces", Georgia, serif';
  const body = tokens.typography?.body?.family || '"Inter", system-ui, sans-serif';

  return `
.ss-live, .ss-live * { box-sizing: border-box; }
.ss-live {
  --ss-bg: ${bg};
  --ss-text: ${text};
  --ss-muted: ${muted};
  --ss-surface: ${surface};
  --ss-accent: ${accent};
  --ss-on-accent: ${theme.onAccent || '#f4f2ee'};
  --ss-hairline: ${hairline};
  font-family: ${body};
  background: var(--ss-bg);
  color: var(--ss-text);
  line-height: 1.65;
  min-height: 100vh;
}
.ss-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
.ss-skip {
  position: absolute; left: 12px; top: -48px; z-index: 60;
  padding: 10px 14px; background: var(--ss-accent); color: var(--ss-on-accent);
  font-weight: 600; text-decoration: none; border-radius: 4px;
}
.ss-skip:focus { top: 12px; }
.ss-live a:focus-visible, .ss-live button:focus-visible {
  outline: 2px solid var(--ss-accent); outline-offset: 3px;
}
.ss-container { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
.ss-nav {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 0;
  background: color-mix(in srgb, var(--ss-bg) 88%, transparent);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--ss-hairline);
}
.ss-nav-inner, .ss-footer-inner {
  width: min(1120px, calc(100% - 40px)); margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.ss-brand { font-family: ${display}; font-weight: 600; letter-spacing: -0.02em; color: var(--ss-text); text-decoration: none; font-size: 1.15rem; }
.ss-nav-links { display: flex; flex-wrap: wrap; gap: 8px 18px; justify-content: flex-end; }
.ss-nav-links a { color: var(--ss-muted); text-decoration: none; font-size: 0.9rem; font-weight: 500; }
.ss-nav-links a:hover { color: var(--ss-text); }
.ss-nav-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.ss-nav-phone {
  color: var(--ss-text); text-decoration: none; font-weight: 600; font-size: 0.95rem;
  white-space: nowrap;
}
.ss-nav-cta {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; padding: 10px 18px; color: var(--ss-on-accent); text-decoration: none;
  font-weight: 600; border-radius: 4px; background: var(--ss-accent); white-space: nowrap;
}
.ss-hero {
  --ss-hero-text: var(--ss-text);
  --ss-hero-muted: var(--ss-muted);
  position: relative;
  overflow: hidden;
  min-height: min(88vh, 760px);
  display: grid; place-items: center;
  padding: 96px 20px 80px;
  text-align: center;
}
.ss-hero.ss-hero--photo {
  --ss-hero-text: #f4f2ee;
  --ss-hero-muted: rgba(244,242,238,0.92);
}
.ss-hero--photo::after {
  content: "";
  position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(180deg, rgba(8,8,10,0.52) 0%, rgba(8,8,10,0.78) 100%);
}
.ss-hero-photo {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; z-index: 0;
}
.ss-photo-placeholder {
  display: grid;
  place-items: center;
  box-sizing: border-box;
  background: repeating-linear-gradient(
    -45deg,
    color-mix(in srgb, var(--ss-muted) 10%, var(--ss-surface)) 0 14px,
    color-mix(in srgb, var(--ss-muted) 20%, var(--ss-surface)) 14px 28px
  );
  border: 1px dashed color-mix(in srgb, var(--ss-muted) 40%, transparent);
}
.ss-photo-placeholder-mark {
  max-width: 16rem;
  padding: 10px 14px;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.35;
  text-transform: uppercase;
  color: var(--ss-text);
  opacity: 0.62;
  background: color-mix(in srgb, var(--ss-bg) 78%, transparent);
}
.ss-photo-placeholder--hero {
  position: absolute;
  inset: 0;
  z-index: 0;
  border: 0;
  align-items: end;
  padding-bottom: min(10vh, 72px);
}
.ss-photo-placeholder--hero .ss-photo-placeholder-mark {
  font-size: 0.8rem;
}
.ss-photo-placeholder--card {
  width: 100%;
  height: 220px;
  flex-shrink: 0;
  border-left: 0;
  border-right: 0;
  border-top: 0;
}
.ss-photo-placeholder--tile {
  min-height: 240px;
  border-radius: 4px;
}
.ss-photo-placeholder--about {
  width: 100%;
  min-height: 280px;
  border-radius: 4px;
}
.ss-hero-inner { position: relative; z-index: 2; max-width: 820px; }
.ss-hero-meta {
  display: flex; flex-wrap: wrap; justify-content: center; align-items: center;
  gap: 6px 0; margin: 0 auto 24px; max-width: 640px;
  color: var(--ss-hero-muted); font-size: 0.95rem; font-weight: 500;
}
.ss-hero-meta a { color: var(--ss-hero-text); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
.ss-eyebrow {
  text-transform: uppercase; letter-spacing: 0.16em; font-size: 0.75rem;
  font-weight: 600; margin-bottom: 16px; color: var(--ss-hero-muted);
}
.ss-hero-title {
  font-family: ${display};
  font-size: clamp(2.4rem, 6vw, 4.4rem);
  line-height: 1.08; letter-spacing: -0.03em; margin: 0 0 16px; color: var(--ss-hero-text);
  font-weight: 600;
}
.ss-hero-sub {
  font-size: clamp(1.05rem, 2vw, 1.25rem); color: var(--ss-hero-muted);
  max-width: 640px; margin: 0 auto 28px;
}
.ss-btn {
  display: inline-block; padding: 14px 28px; color: var(--ss-on-accent); text-decoration: none;
  font-weight: 600; border-radius: 4px; letter-spacing: 0.01em;
  background: var(--ss-accent);
}
.ss-section { padding: clamp(64px, 8vw, 96px) 20px; }
.ss-h2 {
  font-family: ${display}; font-size: clamp(1.7rem, 3vw, 2.3rem);
  text-align: center; margin: 0 0 40px; letter-spacing: -0.02em; font-weight: 600;
}
.ss-lead { font-size: 1.12rem; color: var(--ss-muted); max-width: 62ch; }
.ss-card-grid, .ss-gallery-grid {
  display: grid; gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}
.ss-card {
  overflow: hidden; border-radius: 4px;
  display: flex; flex-direction: column;
}
.ss-card-media, .ss-gallery-item {
  width: 100%; height: 220px; object-fit: cover; display: block;
}
.ss-card-body { padding: 20px 20px 24px; }
.ss-card-body h3 { margin: 0 0 8px; font-size: 1.15rem; }
.ss-card-body p { margin: 0 0 12px; }
.ss-price { font-size: 1.15rem; font-weight: 700; }
.ss-gallery-item { height: 240px; border-radius: 4px; }
.ss-about-grid { display: grid; gap: 40px; align-items: center; }
.ss-about-grid--media { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); }
.ss-about-media { width: 100%; min-height: 280px; object-fit: cover; border-radius: 4px; }
.ss-chips { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin: 24px 0 0; }
.ss-chips li {
  border: 1px solid var(--ss-hairline); padding: 8px 12px; border-radius: 999px;
  font-size: 0.85rem; color: var(--ss-muted);
}
.ss-contact-form {
  display: grid; gap: 16px; text-align: left;
  background: var(--ss-surface); padding: 32px; border-radius: 12px;
  border: 1px solid var(--ss-hairline);
}
.ss-field { display: grid; gap: 6px; font-weight: 600; font-size: 0.9rem; }
.ss-field span .ss-optional { font-weight: 400; color: var(--ss-muted); }
.ss-contact-form input, .ss-contact-form textarea {
  width: 100%; padding: 12px 14px; border-radius: 8px;
  border: 1px solid var(--ss-hairline); background: var(--ss-bg); color: var(--ss-text);
  font: inherit;
}
.ss-contact-form input:focus, .ss-contact-form textarea:focus {
  outline: 2px solid var(--ss-accent); outline-offset: 2px;
}
.ss-form-status { min-height: 1.25em; margin: 0; font-weight: 500; }
.ss-form-status[data-state="success"] { color: #34d399; }
.ss-form-status[data-state="error"] { color: #f87171; }
.ss-contact-form .ss-btn { justify-self: start; }
.ss-add-to-cart { cursor: pointer; border: 0; font: inherit; }
.ss-add-to-cart.is-added { filter: brightness(1.08); }
.ss-booking-mount { margin-top: 4px; }
.ss-live { padding-bottom: 76px; }
.ss-sticky-cta {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
  display: flex; gap: 8px; padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  background: var(--ss-bg);
  border-top: 1px solid var(--ss-hairline);
}
.ss-sticky-cta a {
  flex: 1; min-height: 44px; display: flex; align-items: center; justify-content: center;
  text-decoration: none; font-weight: 600; border-radius: 4px; font-size: 0.95rem;
  background: var(--ss-accent); color: var(--ss-on-accent);
}
.ss-sticky-cta a[href^="tel"] {
  background: var(--ss-surface); color: var(--ss-text);
  border: 1px solid var(--ss-hairline);
}
.ss-footer {
  border-top: 1px solid var(--ss-hairline);
  padding: 28px 0 40px; color: var(--ss-muted); font-size: 0.9rem;
}
.ss-footer-nap { display: flex; flex-wrap: wrap; gap: 8px 20px; align-items: center; }
.ss-footer-nap a { color: var(--ss-text); text-decoration: none; font-weight: 600; }
.ss-service-area-map {
  position: relative;
  width: 100%;
  max-width: 560px;
  margin: 16px auto 0;
  height: 256px;
  overflow: hidden;
  border-radius: 12px;
  background: var(--ss-surface);
}
.ss-service-area-map-tiles {
  display: grid;
  grid-template-columns: repeat(3, 256px);
  width: 768px;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.ss-service-area-map-tiles img { display: block; }
.ss-service-area-map-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.22);
  border: 2px solid rgba(37, 99, 235, 0.85);
  pointer-events: none;
}
.ss-service-area-map-attr {
  position: absolute;
  right: 8px;
  bottom: 6px;
  margin: 0;
  font-size: 0.7rem;
  color: var(--ss-muted);
}
@media (max-width: 800px) {
  .ss-about-grid--media { grid-template-columns: 1fr; }
  .ss-nav-links { display: none; }
  .ss-hero { min-height: 72vh; padding: 72px 20px 56px; }
  .ss-nav-phone { max-width: 42vw; overflow: hidden; text-overflow: ellipsis; }
}
@media (prefers-reduced-motion: reduce) {
  .ss-live * { animation: none !important; transition: none !important; }
}
`.trim();
}

function renderNav(siteData, page) {
  const brand = siteData?.brand?.name || siteData?.businessName || 'Studio';
  const navSource = (Array.isArray(siteData?.nav) && siteData.nav.length)
    ? siteData.nav
    : buildSiteNav({
      ...siteData,
      _layout: page?.layout || siteData?._layout,
      _level: page?.level || siteData?._level,
      _niche: siteData?._niche,
      sections: page?.sections || siteData?.sections,
    });
  const links = navSource.slice(0, 6);
  const linkHtml = links
    .map((item) => `<a href="${escapeAttr(item.href || '#')}">${escapeHtml(item.label || '')}</a>`)
    .join('');
  const phone = resolveSitePhone(siteData);
  const phoneHref = telHref(phone);
  const primary = resolvePrimaryCta(siteData, page);
  const phoneLink = phoneHref
    ? `<a class="ss-nav-phone" data-testid="header-call" href="${escapeAttr(phoneHref)}">${escapeHtml(phone)}</a>`
    : '';
  const ctaLink = `<a class="ss-nav-cta" data-testid="header-cta" href="${escapeAttr(primary.href)}">${escapeHtml(primary.label)}</a>`;

  return `<a class="ss-skip" href="#main">Skip to content</a>
<nav class="ss-nav" aria-label="Site">
  <div class="ss-nav-inner">
    <a class="ss-brand" href="#main" data-editable="brand.name">${escapeHtml(brand)}</a>
    ${linkHtml ? `<div class="ss-nav-links">${linkHtml}</div>` : ''}
    <div class="ss-nav-actions">${phoneLink}${ctaLink}</div>
  </div>
</nav>`;
}

function renderFooter(siteData) {
  const brand = siteData?.brand?.name || siteData?.businessName || '';
  const phone = resolveSitePhone(siteData);
  const phoneHref = telHref(phone);
  const address = resolveSiteAddress(siteData);
  const nap = [
    brand ? `<span>${escapeHtml(brand)}</span>` : '',
    phoneHref ? `<a data-testid="footer-call" href="${escapeAttr(phoneHref)}">${escapeHtml(phone)}</a>` : '',
    address ? `<span data-testid="footer-address">${escapeHtml(address)}</span>` : '',
  ].filter(Boolean).join('');
  const badge = shouldRemoveBranding(siteData)
    ? ''
    : '<span data-testid="sitesprintz-badge">Made with SiteSprintz</span>';

  return `<footer class="ss-footer">
  <div class="ss-footer-inner">
    <div class="ss-footer-nap">${nap}</div>
    ${badge}
  </div>
</footer>`;
}

/**
 * Sticky Call / Book / Quote bar. Omitted only when there is no phone and
 * no in-page action target.
 */
export function buildStickyCtaBar(siteData, page) {
  const primary = resolvePrimaryCta(siteData, page);
  const phoneHref = telHref(resolveSitePhone(siteData));
  const actions = [];

  actions.push({ href: primary.href, label: primary.label, testId: primary.stickyTestId });

  if (phoneHref) {
    actions.unshift({ href: phoneHref, label: 'Call', testId: 'sticky-cta-call' });
  }

  if (!actions.length) return '';

  const links = actions
    .map((action) => `<a data-testid="${escapeAttr(action.testId)}" href="${escapeAttr(action.href)}">${escapeHtml(action.label)}</a>`)
    .join('');

  return `<nav class="ss-sticky-cta" data-testid="sticky-cta-bar" aria-label="Quick actions">${links}</nav>`;
}

export function buildLiveSiteMarkup(siteData, options = {}) {
  const page = composePage({
    siteData,
    layout: options.layout || siteData?._layout,
    character: options.character || siteData?._character,
    level: options.level || siteData?._level,
    niche: options.niche || siteData?._niche,
    overrides: options.overrides || {},
  });

  const enabledSections = (page.sections || [])
    .filter((section) => section && section.enabled !== false && !isEmptyOptional(section));
  const renderTokens = withNativeBookingTokens(page.tokens, enabledSections);

  const sectionsHtml = enabledSections
    .map((section) => renderSectionToHtml(section, renderTokens))
    .filter(Boolean)
    .join('\n');

  const css = getLiveSiteCss(page.tokens);
  const needsMap = enabledSections.some((section) => section?.content?.publicGeo);
  const mapScript = needsMap
    ? '<script src="/vendor/service-area-map.js" defer></script>'
    : '';
  const html = `${renderNav(siteData, page)}
<main id="main" class="ss-main">
  ${sectionsHtml}
</main>
${renderFooter(siteData)}
${buildStickyCtaBar(siteData, page)}
${mapScript}`;

  return { css, html, page, tokens: page.tokens };
}
