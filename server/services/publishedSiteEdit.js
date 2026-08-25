/**
 * Inline edits for published Prisma sites.
 * Checkpoints stay on disk; site_data in the database is the source of truth.
 */

import path from 'path';
import { prisma } from '../../database/db.js';
import { parseSiteData } from '../utils/parseSiteData.js';
import { sanitizeSiteDataForStorage } from '../utils/siteDataSanitizer.js';
import { applyEditableField, getSiteDataVersion } from '../../src/utils/seamlessEditFields.js';
import { visualEditorService } from './visualEditorService.js';
import { attachSpanishLocale } from './siteTranslationService.js';
import { toPublicSiteData, preservePrivateLocation } from '../../src/utils/liveSiteContact.js';

export async function findPublishedSite(subdomain) {
  if (!subdomain) return null;
  return prisma.sites.findFirst({
    where: { OR: [{ subdomain }, { id: subdomain }] },
    select: {
      id: true,
      subdomain: true,
      user_id: true,
      site_data: true,
    },
  });
}

export function canEditPublishedSite(site, user) {
  const userId = user?.id || user?.userId;
  if (!site || !userId) return false;
  return site.user_id === userId || user?.role === 'admin';
}

function siteDirFor(subdomain) {
  return path.join(process.cwd(), 'public', 'sites', subdomain);
}

async function persistSiteData(site, siteData) {
  const sanitized = await attachSpanishLocale(sanitizeSiteDataForStorage(siteData));
  await prisma.sites.update({
    where: { id: site.id },
    data: { site_data: sanitized },
  });
  const siteDir = siteDirFor(site.subdomain);
  await visualEditorService.saveSite(siteDir, toPublicSiteData(sanitized));
  return sanitized;
}

export async function applyPublishedChanges(site, changes, expectedVersion) {
  const currentData = JSON.parse(JSON.stringify(parseSiteData(site.site_data)));
  const currentVersion = getSiteDataVersion(currentData);

  if (currentVersion !== expectedVersion) {
    return {
      success: false,
      conflict: true,
      currentVersion,
      expectedVersion,
      serverData: currentData,
    };
  }

  const siteDir = siteDirFor(site.subdomain);
  await visualEditorService.createCheckpoint(siteDir, toPublicSiteData(currentData));

  for (const change of changes) {
    applyEditableField(currentData, change.field, change.value);
  }

  currentData.version = currentVersion + 1;
  currentData.lastModified = new Date().toISOString();
  const saved = await persistSiteData(site, currentData);
  await visualEditorService.cleanupCheckpoints(siteDir);

  return {
    success: true,
    version: saved.version,
    timestamp: saved.lastModified,
  };
}

export async function restorePublishedVersion(site, versionId) {
  const currentData = JSON.parse(JSON.stringify(parseSiteData(site.site_data)));
  currentData.version = getSiteDataVersion(currentData);
  await persistSiteData(site, currentData);
  const siteDir = siteDirFor(site.subdomain);
  const result = await visualEditorService.restoreVersion(siteDir, versionId);
  const restored = preservePrivateLocation(currentData, await visualEditorService.loadSite(siteDir));
  await prisma.sites.update({
    where: { id: site.id },
    data: { site_data: sanitizeSiteDataForStorage(restored) },
  });
  return result;
}

export async function getPublishedHistory(site) {
  return visualEditorService.getVersionHistory(siteDirFor(site.subdomain));
}

export function publishedSessionInfo(site) {
  const data = parseSiteData(site.site_data);
  return {
    subdomain: site.subdomain,
    currentVersion: getSiteDataVersion(data),
    lastModified: data.lastModified || null,
    canEdit: true,
  };
}
