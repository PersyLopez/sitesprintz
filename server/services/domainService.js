/**
 * Domain Service
 * Connect a registrar domain, verify DNS, and resolve Host → published site.
 */

import { prisma } from '../../database/db.js';
import dns from 'dns';
import {
  getPublicSiteHost,
  hostLookupCandidates,
  isPlatformHostname,
  isValidCustomDomain,
  normalizeHostname,
} from '../../src/utils/customDomainHost.js';

const defaultResolveCname = (hostname) => dns.promises.resolveCname(hostname);
const defaultResolve4 = (hostname) => dns.promises.resolve4(hostname);

function stripDot(value) {
  return String(value || '').replace(/\.$/, '').toLowerCase();
}

function cnameHitsTarget(records, target) {
  const wanted = stripDot(target);
  return (records || []).some((record) => {
    const value = stripDot(record);
    return value === wanted || value.endsWith(`.${wanted}`);
  });
}

export class DomainService {
  constructor(db = null, resolvers = {}) {
    this.db = db || prisma;
    this.resolveCname = resolvers.resolveCname || defaultResolveCname;
    this.resolve4 = resolvers.resolve4 || defaultResolve4;
  }

  cnameTarget(subdomain) {
    return `${subdomain}.${getPublicSiteHost()}`;
  }

  getDNSInstructions(subdomain) {
    const siteUrl = this.cnameTarget(subdomain);
    const serverIP = process.env.SERVER_IP || 'YOUR_SERVER_IP';
    return {
      cname: {
        type: 'CNAME',
        host: 'www',
        value: siteUrl,
        description: 'Point www to your SiteSprintz site',
      },
      aRecord: {
        type: 'A',
        host: '@',
        value: serverIP,
        description: 'Point the root domain to the SiteSprintz server',
      },
      note: 'Add both records. HTTPS is issued at the host (Railway / Cloudflare) after DNS is live.',
    };
  }

  async addCustomDomain(subdomain, domain, userId) {
    const normalized = normalizeHostname(domain);
    if (!isValidCustomDomain(normalized) || isPlatformHostname(normalized)) {
      throw new Error('Invalid domain format');
    }

    const site = await this.db.sites.findFirst({
      where: { subdomain, user_id: userId },
    });
    if (!site) {
      throw new Error('Site not found or access denied');
    }

    const existingSite = await this.db.sites.findFirst({
      where: {
        OR: hostLookupCandidates(normalized).map((custom_domain) => ({ custom_domain })),
      },
    });
    if (existingSite && existingSite.id !== site.id) {
      throw new Error('Domain is already in use by another site');
    }

    const updated = await this.db.sites.update({
      where: { id: site.id },
      data: {
        custom_domain: normalized,
        custom_domain_status: 'pending',
        custom_domain_verified: null,
      },
    });

    return {
      hasDomain: true,
      domain: updated.custom_domain,
      status: updated.custom_domain_status,
      verified: false,
      instructions: this.getDNSInstructions(subdomain),
    };
  }

  async verifyDNS(subdomain) {
    const site = await this.db.sites.findUnique({
      where: { subdomain },
    });
    if (!site || !site.custom_domain) {
      throw new Error('Site does not have a custom domain configured');
    }

    const domain = site.custom_domain;
    const siteUrl = this.cnameTarget(subdomain);
    const serverIP = process.env.SERVER_IP;
    let cnameVerified = false;
    let aRecordVerified = false;

    try {
      const records = await this.resolveCname(`www.${domain}`);
      cnameVerified = cnameHitsTarget(records, siteUrl);
    } catch {
      cnameVerified = false;
    }

    if (!cnameVerified) {
      try {
        const apexCname = await this.resolveCname(domain);
        cnameVerified = cnameHitsTarget(apexCname, siteUrl);
      } catch {
        // apex CNAME is optional
      }
    }

    if (serverIP) {
      try {
        const aRecords = await this.resolve4(domain);
        aRecordVerified = (aRecords || []).includes(serverIP);
      } catch {
        aRecordVerified = false;
      }
    }

    const verified = cnameVerified || aRecordVerified;
    const status = verified ? 'verified' : 'pending';

    await this.db.sites.update({
      where: { id: site.id },
      data: {
        custom_domain_status: status,
        custom_domain_verified: verified ? new Date() : null,
      },
    });

    return {
      verified,
      status,
      cnameVerified,
      aRecordVerified,
      domain,
      instructions: this.getDNSInstructions(subdomain),
    };
  }

  async removeDomain(subdomain, userId) {
    const site = await this.db.sites.findFirst({
      where: { subdomain, user_id: userId },
    });
    if (!site) {
      throw new Error('Site not found or access denied');
    }

    await this.db.sites.update({
      where: { id: site.id },
      data: {
        custom_domain: null,
        custom_domain_status: null,
        custom_domain_verified: null,
      },
    });

    return { success: true, hasDomain: false };
  }

  async getDomainStatus(subdomain) {
    const site = await this.db.sites.findUnique({
      where: { subdomain },
      select: {
        custom_domain: true,
        custom_domain_status: true,
        custom_domain_verified: true,
      },
    });

    if (!site || !site.custom_domain) {
      return { hasDomain: false };
    }

    return {
      hasDomain: true,
      domain: site.custom_domain,
      status: site.custom_domain_status,
      verified: site.custom_domain_verified !== null,
      verifiedAt: site.custom_domain_verified,
      instructions: this.getDNSInstructions(subdomain),
    };
  }

  /**
   * Resolve a request Host to a published public site.
   */
  async lookupByHost(host) {
    const candidates = hostLookupCandidates(host);
    if (!candidates.length || isPlatformHostname(host)) {
      return null;
    }

    const site = await this.db.sites.findFirst({
      where: {
        custom_domain: { in: candidates },
        status: 'published',
        is_public: true,
      },
      select: {
        id: true,
        subdomain: true,
        custom_domain: true,
        custom_domain_status: true,
      },
    });

    return site || null;
  }
}

export const domainService = new DomainService();
export { normalizeHostname, isValidCustomDomain };
