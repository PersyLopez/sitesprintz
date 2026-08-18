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
