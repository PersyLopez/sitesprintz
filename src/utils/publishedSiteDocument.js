/**
 * Shared live-site document builder for /view and preview.
 * composePage() + section HTML + chrome (nav/footer) + theme CSS.
 */

import { composePage } from './layoutRenderer.js';
import { renderSectionToHtml } from './sectionHtmlBridge.js';
import { buildSiteNav } from '../config/operatingModel.js';

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
      return list(c.images).length === 0;
    case 'team':
      return list(c.members).length === 0;
    case 'testimonials':
    case 'faq':
    case 'credentials':
    case 'stats':
    case 'case-studies':
    case 'industries':
    case 'reviews':
      return list(c.items).length === 0 && !c.rating;
    case 'before-after':
      return list(c.pairs).length === 0;
    case 'about':
      return !c.body && !c.description;
    case 'hours':
      return !c.hours;
    case 'location':
      return !c.address;
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
.ss-hero {
  --ss-hero-text: var(--ss-text);
  --ss-hero-muted: var(--ss-muted);
  min-height: min(88vh, 760px);
  display: grid; place-items: center;
  padding: 96px 20px 80px;
  text-align: center;
}
.ss-hero.ss-hero--photo {
  --ss-hero-text: #f4f2ee;
  --ss-hero-muted: rgba(244,242,238,0.88);
}
.ss-hero-inner { max-width: 820px; }
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
.ss-footer {
  border-top: 1px solid var(--ss-hairline);
  padding: 28px 0 40px; color: var(--ss-muted); font-size: 0.9rem;
}
@media (max-width: 800px) {
  .ss-about-grid--media { grid-template-columns: 1fr; }
  .ss-nav-links { display: none; }
  .ss-hero { min-height: 72vh; padding: 72px 20px 56px; }
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
  return `<nav class="ss-nav" aria-label="Site">
  <div class="ss-nav-inner">
    <a class="ss-brand" href="#top">${escapeHtml(brand)}</a>
    ${linkHtml ? `<div class="ss-nav-links">${linkHtml}</div>` : ''}
  </div>
</nav>`;
}

function renderFooter(siteData) {
  const brand = siteData?.brand?.name || siteData?.businessName || '';
  return `<footer class="ss-footer">
  <div class="ss-footer-inner">
    <span>${escapeHtml(brand)}</span>
    <span>Made with SiteSprintz</span>
  </div>
</footer>`;
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

  const sectionsHtml = (page.sections || [])
    .filter((section) => section && section.enabled !== false && !isEmptyOptional(section))
    .map((section) => renderSectionToHtml(section, page.tokens))
    .filter(Boolean)
    .join('\n');

  const css = getLiveSiteCss(page.tokens);
  const html = `${renderNav(siteData, page)}
<main id="top" class="ss-main">
  ${sectionsHtml}
</main>
${renderFooter(siteData)}`;

  return { css, html, page, tokens: page.tokens };
}
