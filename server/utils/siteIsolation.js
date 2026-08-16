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

  const siteJsonPath = resolveContainedPath(siteDir, 'data', 'site.json');
  await fs.writeFile(siteJsonPath, JSON.stringify(siteData, null, 2));

  try {
    const indexSource = path.join(PROJECT_ROOT, 'public', 'site-template.html');
    const indexContent = await fs.readFile(indexSource, 'utf-8');
    await fs.writeFile(resolveContainedPath(siteDir, 'index.html'), indexContent);
  } catch {
    // index.html is optional; SSR can render from site_data
  }

  return siteDir;
}

export async function removeIsolatedSiteFiles(subdomain) {
  const siteDir = getSiteDirectory(subdomain);
  await fs.rm(siteDir, { recursive: true, force: true });
}

export function isUniqueConstraintError(error) {
  return error?.code === 'P2002';
}
