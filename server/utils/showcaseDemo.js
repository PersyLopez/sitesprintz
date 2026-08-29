/**
 * Gallery / showcase demo helpers.
 * Demo sites look and behave like real shops. Persistence is skipped only
 * when settings.demoMode is explicitly true.
 */

export function isShowcaseDemoSiteData(siteData) {
  return siteData?.settings?.demoMode === true;
}

export function parseSiteDataJson(site) {
  if (!site?.site_data) return {};
  if (typeof site.site_data === 'string') {
    try {
      return JSON.parse(site.site_data);
    } catch {
      return {};
    }
  }
  return site.site_data;
}

/**
 * @param {{ site_data?: unknown, subdomain?: string } | null | undefined} site
 */
export function isShowcaseDemoSite(site) {
  if (!site) return false;
  return isShowcaseDemoSiteData(parseSiteDataJson(site));
}

export function buildDemoOrderId() {
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDemoConfirmationCode() {
  return `DEMO${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** Gallery template demos: gallery-* subdomains or explicit demoMode. */
export function isShowcaseExampleSubdomain(subdomain) {
  return typeof subdomain === 'string' && subdomain.startsWith('gallery-');
}

/**
 * @param {{ subdomain?: string, site_data?: unknown } | null | undefined} site
 */
export function isShowcaseExampleSite(site) {
  if (!site) return false;
  if (isShowcaseExampleSubdomain(site.subdomain)) return true;
  return isShowcaseDemoSite(site);
}

/** Prisma where fragment: gallery examples (gallery-* or demoMode). */
export function buildShowcaseExampleWhere() {
  return {
    OR: [
      { subdomain: { startsWith: 'gallery-' } },
      { site_data: { path: ['settings', 'demoMode'], equals: true } },
    ],
  };
}

/**
 * Prisma where fragment for showcase list kind.
 * @param {string | undefined} kind — examples | clients | all (default)
 */
export function buildShowcaseKindWhere(kind) {
  if (kind === 'examples') {
    return buildShowcaseExampleWhere();
  }
  if (kind === 'clients') {
    return { NOT: buildShowcaseExampleWhere() };
  }
  return {};
}
