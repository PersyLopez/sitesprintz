/**
 * Foundation Service
 * Centralized service for managing foundation feature configuration
 * 
 * Features:
 * - Configuration management (get/update)
 * - Tier-based validation
 * - Caching for performance
 * - Default configuration generation
 * 
 * Following TDD - created to pass comprehensive test suite
 */

import { query as dbQuery } from '../../database/db.js';
import { SimpleCache } from '../utils/cache.js';

/**
 * Default foundation configuration factory
 * @param {string} tier - Subscription tier ('starter', 'pro', 'premium')
 * @returns {object} Default configuration
 */
export function getDefaultFoundationConfig(tier = 'starter') {
  const baseConfig = {
    trustSignals: {
      enabled: true,
      yearsInBusiness: 5,
      showSSLBadge: true,
      showVerifiedBadge: true,
      showPaymentIcons: true
    },
    contactForm: {
      enabled: false,
      recipientEmail: '',
      autoResponder: {
        enabled: true,
        message: 'Thank you for contacting us! We\'ll respond within 24 hours.'
      },
      fields: ['name', 'email', 'phone', 'message'],
      maxFileSize: 5242880 // 5MB
    },
    seo: {
      enabled: true,
      businessType: 'LocalBusiness',
      customMetaDescription: '',
      autoGenerateAltTags: true,
      lazyLoadImages: true
    },
    socialMedia: {
      enabled: false,
      profiles: {
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: '',
        youtube: ''
      },
      position: 'footer'
    },
    contactBar: {
      enabled: false,
      phone: '',
      email: '',
      position: 'floating',
      showOnMobile: true
    }
  };

  // Add Pro tier enhancements
  if (tier === 'pro' || tier === 'premium') {
    baseConfig.trustSignalsPro = {
      enabled: false,
      customBadges: [],
      showVisitorCount: false,
      showCustomersServed: false,
      showReviewCount: false
    };
  }

  return baseConfig;
}

export class FoundationService {
  constructor(db = null, cache = null) {
    this.db = db || { query: dbQuery };
    this.cache = cache || new SimpleCache();
    this.cacheTTL = parseInt(process.env.FOUNDATION_CACHE_TTL || '300', 10); // 5 minutes default
  }

  /**
   * Get foundation configuration for a site
   * @param {string} subdomain - Site subdomain
   * @returns {Promise<{foundation: object, plan: string, source: string}>}
   */
  async getConfig(subdomain) {
    try {
      // Check cache first
      const cacheKey = `foundation:${subdomain}`;
      const cached = this.cache.get(cacheKey);

      if (cached) {
        return { ...cached, source: 'cache' };
      }

      // Query database
      const result = await this.db.query(
        'SELECT site_data, plan FROM sites WHERE subdomain = $1',
        [subdomain]
      );

      if (result.rows.length === 0) {
        throw new Error('Site not found');
      }

      const site = result.rows[0];
      const siteData = typeof site.site_data === 'string'
        ? JSON.parse(site.site_data)
        : site.site_data;

      // Get foundation config or use defaults
      const foundation = siteData.foundation || this.getDefaultConfig(site.plan);

      const configData = {
        foundation,
        plan: site.plan
      };

      // Cache the result
      this.cache.set(cacheKey, configData, this.cacheTTL);

      return { ...configData, source: 'database' };

    } catch (error) {
      console.error(`Foundation config fetch error for ${subdomain}:`, error);
      throw error;
    }
  }

  /**
   * Update foundation configuration for a site
   * @param {string} subdomain - Site subdomain
   * @param {object} newConfig - New foundation configuration
   * @returns {Promise<{foundation: object, plan: string}>}
   */
  async updateConfig(subdomain, newConfig) {
    try {
      // Fetch current site data
      const result = await this.db.query(
        'SELECT site_data, plan FROM sites WHERE subdomain = $1',
        [subdomain]
      );

      if (result.rows.length === 0) {
        throw new Error('Site not found');
      }

      const site = result.rows[0];
      const siteData = typeof site.site_data === 'string'
        ? JSON.parse(site.site_data)
        : site.site_data;

      // Validate config
      this.validateConfig(newConfig, site.plan);

      // Update foundation config
      siteData.foundation = newConfig;

      // Save back to database
      await this.db.query(
        'UPDATE sites SET site_data = $1, updated_at = NOW() WHERE subdomain = $2',
        [JSON.stringify(siteData), subdomain]
      );

      // Invalidate cache
      this.clearCache(subdomain);

      return {
        foundation: siteData.foundation,
        plan: site.plan
      };

    } catch (error) {
      console.error(`Foundation config update error for ${subdomain}:`, error);
      throw error;
    }
  }

  /**
   * Get default configuration for a tier
   * @param {string} tier - Subscription tier
   * @returns {object} Default configuration
   */
  getDefaultConfig(tier = 'starter') {
    return getDefaultFoundationConfig(tier);
  }

  /**
   * Validate foundation configuration
   * @param {object} config - Configuration to validate
   * @param {string} tier - Subscription tier
   * @throws {Error} If validation fails
   */
  validateConfig(config, tier = 'starter') {
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration must be an object');
    }

    // Validate trust signals
    if (config.trustSignals) {
      if (config.trustSignals.yearsInBusiness !== undefined) {
        const years = config.trustSignals.yearsInBusiness;
        if (typeof years !== 'number' || years < 0) {
          throw new Error('Years in business must be non-negative');
        }
      }
    }

    // Validate contact form
    if (config.contactForm) {
      if (config.contactForm.enabled && config.contactForm.recipientEmail) {
        const email = config.contactForm.recipientEmail;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Invalid recipient email');
        }
      }
    }

    // Validate social media URLs
    if (config.socialMedia && config.socialMedia.profiles) {
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      const profiles = config.socialMedia.profiles;
      
      for (const [platform, url] of Object.entries(profiles)) {
        if (url && !urlRegex.test(url)) {
          throw new Error(`Invalid social media URL for ${platform}`);
        }
      }
    }

    // Validate tier-specific features
    if (config.trustSignalsPro) {
      if (tier === 'starter') {
        throw new Error('Feature not available in starter tier');
      }
    }

    // Additional validation can be added here
  }

  /**
   * Clear cache for a specific site or all sites
   * @param {string} subdomain - Optional subdomain to clear specific cache
   */
  clearCache(subdomain = null) {
    if (subdomain) {
      const cacheKey = `foundation:${subdomain}`;
      // Use invalidate for SimpleCache, delete for others
      if (this.cache.invalidate) {
        this.cache.invalidate(cacheKey);
      } else if (this.cache.delete) {
        this.cache.delete(cacheKey);
      }
    } else {
      // Clear all foundation-related cache entries
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getCacheStats() {
    const hits = this.cache.hits || 0;
    const misses = this.cache.misses || 0;
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;

    return {
      size: this.cache.size || 0,
      hits,
      misses,
      hitRate: parseFloat(hitRate.toFixed(2))
    };
  }
}

export default FoundationService;

