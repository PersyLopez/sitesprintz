/**
 * 🟢 PHASE 3 TDD: Trial Service - Implementation
 * 
 * Pure business logic for trial expiration management
 * Designed to pass all 75+ tests written in RED phase
 * 
 * Features:
 * - Timezone-safe date calculations (UTC)
 * - Race condition prevention (atomic transactions)
 * - Email idempotency (no duplicates)
 * - Graceful error handling
 * - Comprehensive audit logging
 */

import { prisma } from '../../database/db.js';
import { emailService, EmailTemplates } from './emailService.js';

export class TrialService {
  constructor(db = null, emailSvc = null) {
    // Dependency injection for testability
    this.db = db || prisma;
    this.emailService = emailSvc || emailService;
  }

  /**
   * Calculate days remaining until trial expiration (timezone-safe)
   * Uses UTC to avoid timezone/DST issues
   * 
   * @param {Date|string} expiresAt - Expiration date
   * @param {Date} now - Current date (defaults to now, injectable for testing)
   * @returns {number} Days remaining (0 if expired, rounds up)
   */
  calculateDaysRemaining(expiresAt, now = new Date()) {
    // Handle null/undefined
    if (!expiresAt) return 0;

    // Parse date if string
    const expiry = this.parseDate(expiresAt);
    if (!expiry || isNaN(expiry.getTime())) return 0;

    // Convert to UTC midnight for consistent day calculation
    const expiryUTC = Date.UTC(
      expiry.getUTCFullYear(),
      expiry.getUTCMonth(),
      expiry.getUTCDate()
    );

    const nowUTC = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );

    // Calculate difference in days
    const msRemaining = expiryUTC - nowUTC;
    const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);

    // If expiry is in the past, return 0
    if (daysRemaining < 0) return 0;

    // If same day (daysRemaining === 0), count as 1 day (you have today!)
    // Otherwise, round up (partial day = 1 day)
    return daysRemaining === 0 ? 1 : Math.ceil(daysRemaining);
  }

  /**
   * Parse date string or Date object safely
   * @private
   */
  parseDate(date) {
    if (date instanceof Date) return date;
    if (typeof date === 'string' || typeof date === 'number') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

  /**
   * Check if trial is expired
   * 
   * @param {Date|string} expiresAt - Expiration date
   * @param {Date} now - Current date
   * @returns {boolean} True if expired
   */
  isTrialExpired(expiresAt, now = new Date()) {
    const daysRemaining = this.calculateDaysRemaining(expiresAt, now);
    return daysRemaining === 0;
  }

  /**
   * Get comprehensive trial status
   * 
   * @param {Date|string} expiresAt - Expiration date
   * @param {Date} now - Current date
   * @returns {Object} Status object
   */
  getTrialStatus(expiresAt, now = new Date()) {
    const daysRemaining = this.calculateDaysRemaining(expiresAt, now);
    const isExpired = daysRemaining === 0;

    let status = 'active';
    if (isExpired) {
      status = 'expired';
    } else if (daysRemaining <= 3) {
      status = 'expiring_soon';
    }

    return {
      isExpired,
      daysRemaining,
      expiresAt: this.parseDate(expiresAt),
      status
    };
  }

  /**
   * Check if warning email should be sent (day 3 or day 1)
   * 
   * @param {number} daysRemaining - Days remaining
   * @returns {boolean} True if warning should be sent
   */
  shouldSendWarning(daysRemaining) {
    return daysRemaining === 3 || daysRemaining === 1;
  }

  /**
   * Check site trial status from database
   * 
   * @param {string} siteId - Site ID
   * @returns {Promise<Object>} Trial status with access info
   */
  async checkSiteTrialStatus(siteId) {
    const site = await this.db.sites.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        expires_at: true,
        plan: true,
        status: true
      }
    });

    if (!site) {
      throw new Error('Site not found');
    }

    // Paid plans bypass trial expiration
    if (site.plan && site.plan !== 'trial') {
      return {
        canAccess: true,
        isExpired: false,
        hasPaidPlan: true,
        plan: site.plan,
        daysRemaining: Infinity
      };
    }

    // No expiration date = no trial limit
    if (!site.expires_at) {
      return {
        canAccess: true,
        isExpired: false,
        daysRemaining: 0,
        reason: 'NO_EXPIRATION'
      };
    }

    // Check trial status
    const trialStatus = this.getTrialStatus(site.expires_at);

    return {
      canAccess: !trialStatus.isExpired,
      isExpired: trialStatus.isExpired,
      daysRemaining: trialStatus.daysRemaining,
      expiresAt: trialStatus.expiresAt,
      status: trialStatus.status,
      reason: trialStatus.isExpired ? 'TRIAL_EXPIRED' : null
    };
  }

  /**
   * Send trial expiration warning emails
   * Only sends on day 3 and day 1 before expiration
   * Prevents duplicate sends
   * 
   * @returns {Promise<Object>} Results summary
   */
  async sendTrialWarnings() {
    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    try {
      // Find sites expiring in 3 days or less
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      const sites = await this.db.sites.findMany({
        where: {
          OR: [
            { plan: null },
            { plan: 'trial' }
          ],
          expires_at: {
            not: null,
            gt: new Date(),
            lte: threeDaysFromNow
          },
          status: { not: 'expired' }
        },
        include: {
          users: {
            select: {
              email: true,
              id: true
            }
          }
        }
      });

      for (const site of sites) {
        try {
          const daysRemaining = this.calculateDaysRemaining(site.expires_at);

          // Only send on day 3 and day 1
          if (!this.shouldSendWarning(daysRemaining)) {
            results.skipped++;
            continue;
          }

          // Check if warning already sent recently (within last 24 hours)
          if (site.warning_sent_at) {
            const hoursSinceWarning = (Date.now() - new Date(site.warning_sent_at).getTime()) / (1000 * 60 * 60);
            if (hoursSinceWarning <= 24) {
              results.skipped++;
              continue;
            }
          }

          // Parse site data
          const siteData = typeof site.site_data === 'string'
            ? JSON.parse(site.site_data)
            : site.site_data;

          const businessName = siteData?.brand?.name || 'Your Business';

          // Send email
          await this.emailService.sendTrialEmail({
            to: site.users.email,
            type: 'expiring',
            trialData: {
              businessName,
              daysRemaining,
              subdomain: site.subdomain,
              upgradeUrl: `${process.env.SITE_URL || 'http://localhost:3000'}/dashboard?action=upgrade`,
              siteUrl: `${process.env.SITE_URL || 'http://localhost:3000'}/sites/${site.subdomain}/`
            }
          });

          // Mark warning as sent
          await this.db.sites.update({
            where: { id: site.id },
            data: {
              warning_sent_at: new Date(),
              updated_at: new Date()
            }
          });

          results.sent++;
        } catch (error) {
          console.error(`Failed to send trial warning for site ${site.id}:`, error);
          results.failed++;
          results.errors.push({
            siteId: site.id,
            error: error.message
          });
        }
      }
    } catch (error) {
      console.error('Error in sendTrialWarnings:', error);
      throw error;
    }

    return results;
  }

  /**
   * Deactivate expired trial sites
   * Uses atomic transaction to prevent race conditions
   * Checks for concurrent payment upgrades
   * Creates audit log entries
   * 
   * @returns {Promise<Object>} Deactivation results
   */
  async deactivateExpiredTrials() {
    const results = {
      deactivated: 0,
      skipped: 0,
      skippedDueToPayment: 0,
      sites: []
    };

    try {
      await this.db.$transaction(async (tx) => {
        // Lock rows to prevent race conditions (FOR UPDATE)
        // Prisma doesn't support FOR UPDATE in findMany, so we use raw query
        const expiredSites = await tx.$queryRaw`
          SELECT id, subdomain, plan, user_id
          FROM sites
          WHERE 
            (plan IS NULL OR plan = 'trial')
            AND expires_at IS NOT NULL
            AND expires_at < NOW()
            AND status != 'expired'
          FOR UPDATE
        `;

        for (const site of expiredSites) {
          // Double-check: ensure user hasn't upgraded during this transaction
          const hasSubscription = await tx.subscriptions.findFirst({
            where: {
              user_id: site.user_id,
              status: { in: ['active', 'trialing'] }
            }
          });

          if (hasSubscription) {
            // User upgraded! Don't deactivate
            results.skippedDueToPayment++;
            continue;
          }

          // Site plan changed? Skip
          if (site.plan && site.plan !== 'trial') {
            results.skipped++;
            continue;
          }

          // Deactivate site
          await tx.sites.update({
            where: { id: site.id },
            data: {
              status: 'expired',
              updated_at: new Date()
            }
          });

          // Create audit log entry
          await tx.audit_logs.create({
            data: {
              action: 'trial_expired_deactivation',
              entity_type: 'site',
              entity_id: site.id,
              metadata: JSON.stringify({
                subdomain: site.subdomain,
                reason: 'trial_expired',
                automated: true
              }),
              created_at: new Date()
            }
          });

          results.deactivated++;
          results.sites.push({
            id: site.id,
            subdomain: site.subdomain
          });
        }
      });

      console.log(`Trial deactivation complete: ${results.deactivated} deactivated, ${results.skipped} skipped`);
    } catch (error) {
      console.error('Error deactivating expired trials:', error);
      throw error;
    }

    return results;
  }
}

// Export singleton instance for convenience
export const trialService = new TrialService();

// Export class for testing with dependency injection
export default TrialService;

