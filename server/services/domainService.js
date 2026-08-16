/**
 * Domain Service
 * Handles custom domain management, DNS verification, and SSL provisioning
 */

import { prisma } from '../../database/db.js';
import dns from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve);
const dnsResolve4 = promisify(dns.resolve4);

export class DomainService {
  constructor(db = null) {
    this.db = db || prisma;
  }

  /**
   * Add custom domain to a site
   * @param {string} subdomain - Site subdomain
   * @param {string} domain - Custom domain (e.g., example.com)
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Domain record
   */
  async addCustomDomain(subdomain, domain, userId) {
    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      throw new Error('Invalid domain format');
    }

    // Verify site belongs to user
    const site = await this.db.sites.findFirst({
      where: {
        subdomain,
        user_id: userId
      }
    });

    if (!site) {
      throw new Error('Site not found or access denied');
    }

    // Check if domain is already in use
    const existingSite = await this.db.sites.findUnique({
      where: { custom_domain: domain }
    });

    if (existingSite && existingSite.id !== site.id) {
      throw new Error('Domain is already in use by another site');
    }

    // Update site with custom domain
    const updated = await this.db.sites.update({
      where: { id: site.id },
      data: {
        custom_domain: domain,
        custom_domain_status: 'pending',
        custom_domain_verified: null
      }
    });

    return {
      domain: updated.custom_domain,
      status: updated.custom_domain_status,
      instructions: this.getDNSInstructions(subdomain)
    };
  }

  /**
   * Get DNS instructions for connecting custom domain
   * @param {string} subdomain - Site subdomain
   * @returns {Object} DNS records to add
   */
  getDNSInstructions(subdomain) {
    const siteUrl = `${subdomain}.sitesprintz.com`;
    const serverIP = process.env.SERVER_IP || 'YOUR_SERVER_IP'; // Should be set in production

    return {
      cname: {
        type: 'CNAME',
        host: 'www',
        value: siteUrl,
        description: 'Point www subdomain to your SiteSprintz site'
      },
      aRecord: {
        type: 'A',
        host: '@',
        value: serverIP,
        description: 'Point root domain to SiteSprintz server'
      },
      note: 'Add both records. The CNAME is for www.yourdomain.com, and the A record is for yourdomain.com'
    };
  }

  /**
   * Verify DNS records are correctly configured
   * @param {string} subdomain - Site subdomain
   * @returns {Promise<Object>} Verification result
   */
  async verifyDNS(subdomain) {
    const site = await this.db.sites.findUnique({
      where: { subdomain }
    });

    if (!site || !site.custom_domain) {
      throw new Error('Site does not have a custom domain configured');
    }

    const domain = site.custom_domain;
    const siteUrl = `${subdomain}.sitesprintz.com`;
    const serverIP = process.env.SERVER_IP;

    let cnameVerified = false;
    let aRecordVerified = false;

    try {
      // Check CNAME for www subdomain
      const wwwDomain = `www.${domain}`;
      const cnameRecords = await dnsResolve(wwwDomain, 'CNAME');
      cnameVerified = cnameRecords.some(record => record.includes(siteUrl));
    } catch (error) {
      // CNAME not found or error
      cnameVerified = false;
    }

    try {
      // Check A record for root domain
      if (serverIP) {
        const aRecords = await dnsResolve4(domain);
        aRecordVerified = aRecords.includes(serverIP);
      }
    } catch (error) {
      // A record not found or error
      aRecordVerified = false;
    }

    const verified = cnameVerified || aRecordVerified;
    const status = verified ? 'verified' : 'pending';

    // Update site status
    await this.db.sites.update({
      where: { id: site.id },
      data: {
        custom_domain_status: status,
        custom_domain_verified: verified ? new Date() : null
      }
    });

    return {
      verified,
      status,
      cnameVerified,
      aRecordVerified,
      domain,
      instructions: this.getDNSInstructions(subdomain)
    };
  }

  /**
   * Remove custom domain from site
   * @param {string} subdomain - Site subdomain
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Result
   */
  async removeDomain(subdomain, userId) {
    const site = await this.db.sites.findFirst({
      where: {
        subdomain,
        user_id: userId
      }
    });

    if (!site) {
      throw new Error('Site not found or access denied');
    }

    await this.db.sites.update({
      where: { id: site.id },
      data: {
        custom_domain: null,
        custom_domain_status: null,
        custom_domain_verified: null
      }
    });

    return { success: true };
  }

  /**
   * Get domain status for a site
   * @param {string} subdomain - Site subdomain
   * @returns {Promise<Object>} Domain status
   */
  async getDomainStatus(subdomain) {
    const site = await this.db.sites.findUnique({
      where: { subdomain },
      select: {
        custom_domain: true,
        custom_domain_status: true,
        custom_domain_verified: true
      }
    });

    if (!site || !site.custom_domain) {
      return {
        hasDomain: false
      };
    }

    return {
      hasDomain: true,
      domain: site.custom_domain,
      status: site.custom_domain_status,
      verified: site.custom_domain_verified !== null,
      verifiedAt: site.custom_domain_verified,
      instructions: this.getDNSInstructions(subdomain)
    };
  }
}

// Export singleton instance
export const domainService = new DomainService();

