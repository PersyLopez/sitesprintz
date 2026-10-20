/**
 * Per-site isolation for template-based site creation.
 *
 * Each published site gets:
 * - A deep-cloned copy of template data (never a live reference to catalog JSON)
 * - A unique subdomain and directory under public/sites/{subdomain}
 * - Path-contained file I/O (no traversal out of drafts / templates / sites roots)
 *
 * Draft JSON is stored outside public/ so unpublished business data is not
 * served by express.static.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { validateDraftId, validateSubdomain, validateTemplateId } from './validators.js';
import { toPublicSiteData } from '../../src/utils/liveSiteContact.js';
import { isPlatformHostname } from '../../src/utils/customDomainHost.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

export class PathEscapeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PathEscapeError';
    this.code = 'PATH_ESCAPE';
    this.statusCode = 400;
  }
}

export function getProjectRoot() {
  return PROJECT_ROOT;
}

export function getPrivateDraftsDir() {
  return path.join(PROJECT_ROOT, 'storage', 'drafts');
}

export function getLegacyDraftsDir() {
  return path.join(PROJECT_ROOT, 'public', 'drafts');
}

export function getTemplatesDir() {
  return path.join(PROJECT_ROOT, 'public', 'data', 'templates');
}

export function getPublishedSitesRoot() {
  return path.join(PROJECT_ROOT, 'public', 'sites');
}

/**
 * Resolve a path that must remain inside rootDir.
 * Rejects traversal, absolute segments, and NUL bytes.
 */
export function resolveContainedPath(rootDir, ...segments) {
  if (!rootDir || typeof rootDir !== 'string') {
    throw new PathEscapeError('Isolation root is required');
  }

  for (const segment of segments) {
    if (typeof segment !== 'string' || segment.length === 0) {
      throw new PathEscapeError('Invalid path segment');
    }
    if (segment.includes('\0')) {
      throw new PathEscapeError('Invalid path segment');
    }
  }

  const root = path.resolve(rootDir);
  const resolved = path.resolve(root, ...segments);
  const relative = path.relative(root, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new PathEscapeError('Path escapes isolation root');
  }

  return resolved;
}

export function isSafeSiteIdentifier(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  if (value.includes('..') || value.includes('/') || value.includes('\\') || value.includes('\0')) {
    return false;
  }
  return /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/.test(value);
}

/**
 * Document URL for a leftover live site (`/sites/:id`, trailing slash, index.html).
 * Asset paths like `/sites/:id/gallery/hero.jpg` are not documents.
 *
 * @param {string} pathname
 * @returns {string|null}
 */
export function liveSiteDocumentIdentifier(pathname) {
  const liveMatch = String(pathname || '').match(/^\/sites\/([^/]+)(?:\/index\.html)?\/?$/);
  if (!liveMatch) return null;
  const siteIdentifier = liveMatch[1];
  if (!isSafeSiteIdentifier(siteIdentifier)) return null;
  return siteIdentifier;
}

/**
 * Browser visits to the leftover `/sites/:id` page (and its index.html)
 * go to `/view/:id`. Asset paths like `/sites/:id/gallery/hero.jpg` stay.
 *
 * @param {string} pathname
 * @param {string} [originalUrl]
 * @returns {string|null}
 */
export function liveSiteRedirectTarget(pathname, originalUrl = '') {
  const siteIdentifier = liveSiteDocumentIdentifier(pathname);
  if (!siteIdentifier) return null;
  const qIndex = String(originalUrl).indexOf('?');
  const search = qIndex >= 0 ? originalUrl.slice(qIndex) : '';
  return `/view/${encodeURIComponent(siteIdentifier)}${search}`;
}

/**
 * Rewrite a crawler request for a public /view/:subdomain document to the
 * existing SSR /sites/:subdomain document, so share crawlers get the shop
 * title/og tags. Humans stay on the composed SPA.
 *
 * @param {string} pathname
 * @param {string} [originalUrl]
 * @param {boolean} [isCrawler]
 * @returns {string|null}
 */
export function crawlerPublishedDocumentUrl(pathname, originalUrl = '', isCrawler = false) {
  if (!isCrawler) return null;
  const siteIdentifier = liveViewDocumentIdentifier(pathname);
  if (!siteIdentifier) return null;
  const qIndex = String(originalUrl).indexOf('?');
  const search = qIndex >= 0 ? originalUrl.slice(qIndex) : '';
  return `/sites/${encodeURIComponent(siteIdentifier)}${search}`;
}

/**
 * Subdomain for a `/view/:subdomain` document. Asset-style deeper paths
 * (`/view/:id/data/site.json`) are not viewer documents.
 *
 * @param {string} pathname
 * @returns {string|null}
 */
export function liveViewDocumentIdentifier(pathname) {
  const viewMatch = String(pathname || '').match(/^\/view\/([^/]+)\/?$/);
  if (!viewMatch) return null;
  const siteIdentifier = viewMatch[1];
  if (!isSafeSiteIdentifier(siteIdentifier)) return null;
  return siteIdentifier;
}

/** HTML shell for a direct document load. Published /view uses the shop entry. */
export function publishedDocumentShell(pathname) {
  return liveViewDocumentIdentifier(pathname) ? 'view.html' : 'index.html';
}

/**
 * Subdomain for this document. /view/:subdomain wins. A connected customer
 * domain uses the host lookup. Platform hosts stay on the app shell.
 *
 * @param {string} pathname
 * @param {string} host
 * @param {(host: string) => Promise<{ subdomain?: string } | null>} [lookupHost]
 * @returns {Promise<string|null>}
 */
export async function resolvePublishedDocumentSubdomain(pathname, host, lookupHost) {
  const fromPath = liveViewDocumentIdentifier(pathname);
  if (fromPath) return fromPath;
  if (isPlatformHostname(host) || typeof lookupHost !== 'function') return null;
  const site = await lookupHost(host);
  const subdomain = site?.subdomain;
  if (!isSafeSiteIdentifier(subdomain)) return null;
  return subdomain;
}

/**
 * Inline the published showcase JSON the composed viewer would otherwise
 * fetch, so /view first paint renders without the extra round trip. `<` is
 * escaped inside the payload so `</script>` cannot break out of the embed.
 *
 * @param {string} html
 * @param {unknown} payload - same JSON body as GET /api/showcases/:subdomain
 * @returns {string}
 */
export function injectPublishedSiteEmbed(html, payload) {
  if (typeof html !== 'string' || !html.includes('</head>')) return html;
  const serialized = JSON.stringify(payload ?? null).replace(/</g, '\\u003c');
  const script = `<script>window.__RSL_PUBLISHED_SITE__=${serialized};</script>`;
  return html.replace('</head>', `${script}</head>`);
}

/**
 * Start the hero photo from the head so it races the stylesheet and the
 * module script. The body image stays the one the viewer paints.
 *
 * @param {string} html
 * @returns {string}
 */
export function preloadPublishedViewHero(html) {
  if (typeof html !== 'string' || !html.includes('</head>')) return html;
  if (html.includes('rel="preload" as="image"')) return html;
  const tag = html.match(/<img\b[^>]*class="ss-hero-photo"[^>]*>/i);
  const src = tag?.[0].match(/\ssrc="([^"]+)"/);
  const href = src?.[1] || '';
  if (!href || /^(?:data|javascript):/i.test(href)) return html;
  const link = `<link rel="preload" as="image" fetchpriority="high" href="${href}">`;
  return html.replace('</head>', `${link}</head>`);
}

/**
 * Put the composed shop inside #root so the browser can paint it before the
 * module script runs, and preload that shop's hero photo. An empty fragment
 * leaves the shell unchanged.
 *
 * @param {string} html
 * @param {string} fragment
 * @returns {string}
 */
export function injectPublishedViewMarkup(html, fragment) {
  if (typeof html !== 'string' || typeof fragment !== 'string' || !fragment.trim()) return html;
  const rootPattern = /<div id="root">\s*<\/div>/;
  if (!rootPattern.test(html)) return html;
  return preloadPublishedViewHero(html.replace(rootPattern, `<div id="root">${fragment}</div>`));
}

/**
 * Strip marketing-shell third parties that published /view documents never
 * need: the Cloudflare Turnstile script (Register-only) and Unsplash
 * preconnect/dns-prefetch hints. Fonts, canonical, and og tags stay.
 *
 * @param {string} html
 * @returns {string}
 */
export function stripPublishedViewThirdParties(html) {
  if (typeof html !== 'string') return html;
  return html
    .replace(/<script[^>]*challenges\.cloudflare\.com\/turnstile[^>]*>\s*<\/script>\s*/g, '')
    .replace(/<link[^>]*href="https:\/\/images\.unsplash\.com"[^>]*>\s*/g, '');
}

/**
 * Let the hero photo use the connection before the shop's JavaScript.
 * The module entry and its preloads stay in the document; they load at a
 * lower priority than the image preload added after this step.
 *
 * @param {string} html
 * @returns {string}
 */
export function yieldPublishedViewModules(html) {
  if (typeof html !== 'string') return html;
  const lower = (tag, name) => (
    new RegExp(`\\sfetchpriority=`).test(tag) ? tag : tag.replace(name, `${name} fetchpriority="low"`)
  );
  return html
    .replace(/<link\b[^>]*\srel="modulepreload"[^>]*>/g, (tag) => lower(tag, '<link'))
    .replace(/<script\b[^>]*\stype="module"[^>]*>/g, (tag) => lower(tag, '<script'));
}

/**
 * Make the Inter font stylesheet non-blocking on published /view documents:
 * the link loads with media="print" then swaps to all on load, with a
 * noscript copy so the blocking tag still applies without JS. Preconnect
 * hints and marketing pages are untouched. Module preloads yield to the hero.
 *
 * @param {string} html
 * @returns {string}
 */
export function deferPublishedViewFonts(html) {
  if (typeof html !== 'string') return html;
  const fontLinkPattern = /<link[^>]*href="https:\/\/fonts\.googleapis\.com\/css2[^"]*"[^>]*rel="stylesheet"[^>]*>/g;
  const deferred = html.replace(fontLinkPattern, (link) => {
    const asyncLink = link.replace(' rel="stylesheet"', ' rel="stylesheet" media="print" onload="this.media=\'all\'"');
    return `${asyncLink}\n    <noscript>${link}</noscript>`;
  });
  return yieldPublishedViewModules(deferred);
}

/** Same family the composed viewer requests after mount. */
export const PUBLISHED_VIEW_DISPLAY_FONT_HREF = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap';

/**
 * Start Fraunces with the /view document when the shop's CSS uses it.
 * An Inter-only shop does not download that face. Non-blocking, same id the
 * viewer checks so it does not add a second stylesheet. Shell Inter stays
 * the body face.
 *
 * @param {string} html
 * @returns {string}
 */
export function preloadPublishedViewDisplayFont(html) {
  if (typeof html !== 'string' || !html.includes('</head>')) return html;
  if (html.includes('id="ss-live-fonts"')) return html;
  if (!/font-family:[^;}{]*Fraunces/i.test(html)) return html;
  const asyncLink = `<link id="ss-live-fonts" rel="stylesheet" media="print" onload="this.media='all'" href="${PUBLISHED_VIEW_DISPLAY_FONT_HREF}">`;
  const noscript = `<noscript><link rel="stylesheet" href="${PUBLISHED_VIEW_DISPLAY_FONT_HREF}"></noscript>`;
  return html.replace('</head>', `${asyncLink}\n    ${noscript}\n</head>`);
}

export function deepClone(value) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON clone for values structuredClone rejects
    }
  }
  return JSON.parse(JSON.stringify(value));
}

/**
 * Deep-clone template/site JSON and stamp this instance's identity so the
 * catalog template is never mutated or confused with a tenant site.
 */
export function cloneIsolatedSiteData(source, { siteId, subdomain, templateId } = {}) {
  const cloned = deepClone(source) || {};

  cloned._isolation = {
    siteId: siteId || subdomain || cloned._isolation?.siteId || null,
    subdomain: subdomain || cloned._isolation?.subdomain || null,
    sourceTemplateId: templateId || cloned._isolation?.sourceTemplateId || cloned.template || cloned.id || null,
    isolatedAt: new Date().toISOString()
  };

  if (siteId || subdomain) {
    cloned.siteId = siteId || subdomain;
  }

  return cloned;
}

export function slugifySubdomain(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);
}

function randomSubdomainSuffix() {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Allocate a unique, valid, non-reserved subdomain.
 * @param {string} businessName
 * @param {(slug: string) => Promise<boolean>} existsFn - true if subdomain is taken
 */
export async function allocateUniqueSubdomain(businessName, existsFn, { maxAttempts = 10 } = {}) {
  const base = slugifySubdomain(businessName);
  const fallback = `biz-${randomSubdomainSuffix()}`;
  const initialCheck = validateSubdomain(base);
  let candidate = initialCheck.valid ? initialCheck.value : fallback;
  const stem = slugifySubdomain(candidate).substring(0, 40) || 'biz';

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const validation = validateSubdomain(candidate);
    if (validation.valid) {
      const taken = existsFn ? await existsFn(validation.value) : false;
      if (!taken) {
        return validation.value;
      }
    }

    candidate = `${stem}-${randomSubdomainSuffix()}`;
  }

  throw new Error('Unable to allocate a unique subdomain');
}

export function getDraftFilePath(draftId) {
  const validation = validateDraftId(draftId);
  if (!validation.valid) {
    throw new PathEscapeError(validation.error);
  }
  return resolveContainedPath(getPrivateDraftsDir(), `${validation.value}.json`);
}

export function getLegacyDraftFilePath(draftId) {
  const validation = validateDraftId(draftId);
  if (!validation.valid) {
    throw new PathEscapeError(validation.error);
  }
  return resolveContainedPath(getLegacyDraftsDir(), `${validation.value}.json`);
}

export function getTemplateFilePath(templateId) {
  const validation = validateTemplateId(templateId);
  if (!validation.valid) {
    throw new PathEscapeError(validation.error);
  }
  return resolveContainedPath(getTemplatesDir(), `${validation.value}.json`);
}

export function getSiteDirectory(subdomain) {
  const validation = validateSubdomain(subdomain);
  if (!validation.valid) {
    throw new PathEscapeError(validation.error);
  }
  return resolveContainedPath(getPublishedSitesRoot(), validation.value);
}

export async function readDraftFile(draftId) {
  try {
    return await fs.readFile(getDraftFilePath(draftId), 'utf-8');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    return fs.readFile(getLegacyDraftFilePath(draftId), 'utf-8');
  }
}

export async function writeDraftFile(draftId, contents) {
  const filePath = getDraftFilePath(draftId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents);
}

export async function deleteDraftFile(draftId) {
  let deleted = false;
  for (const filePath of [getDraftFilePath(draftId), getLegacyDraftFilePath(draftId)]) {
    try {
      await fs.unlink(filePath);
      deleted = true;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }
  return deleted;
}

export async function loadTemplateCopy(templateId) {
  const templatePath = getTemplateFilePath(templateId);
  const raw = await fs.readFile(templatePath, 'utf-8');
  return deepClone(JSON.parse(raw));
}

export async function writeIsolatedSiteFiles(subdomain, siteData) {
  const siteDir = getSiteDirectory(subdomain);
  await fs.mkdir(resolveContainedPath(siteDir, 'data'), { recursive: true });

  const publicData = toPublicSiteData(siteData);
  const siteJsonPath = resolveContainedPath(siteDir, 'data', 'site.json');
  await fs.writeFile(siteJsonPath, JSON.stringify(publicData, null, 2));

  const { default: publishedSiteRenderer } = await import('../services/publishedSiteRenderer.js');
  const indexHtml = await publishedSiteRenderer.render(siteData, { siteIdentifier: subdomain });
  await fs.writeFile(resolveContainedPath(siteDir, 'index.html'), indexHtml);

  return siteDir;
}

export async function removeIsolatedSiteFiles(subdomain) {
  const siteDir = getSiteDirectory(subdomain);
  await fs.rm(siteDir, { recursive: true, force: true });
}

export function isUniqueConstraintError(error) {
  return error?.code === 'P2002';
}
