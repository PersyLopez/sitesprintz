/**
 * Trial expiration middleware and utilities
 * Refactored to use TrialService (TDD implementation)
 * 
 * ♻️ REFACTOR Phase: Thin wrapper around service layer
 * Maintains backward compatibility with existing code
 */
import { query as dbQuery } from '../../database/db.js';
import { sendEmail, EmailTypes } from '../utils/email-service-wrapper.js';
import { trialService } from '../services/trialService.js';

/**
 * Check if a site's trial has expired
 * 
 * ♻️ Refactored: Now delegates to TrialService
 * 
 * @param {string} siteId - Site ID
 * @returns {Promise<{isExpired: boolean, daysRemaining: number, expiresAt: Date}>}
 */
export async function checkTrialStatus(siteId) {
  try {
    const status = await trialService.checkSiteTrialStatus(siteId);

    // Return format compatible with legacy code
    return {
      isExpired: status.isExpired,
      daysRemaining: status.daysRemaining,
      expiresAt: status.expiresAt,
      hasPaidPlan: status.hasPaidPlan
    };
  } catch (error) {
    // Maintain backward compatibility with error handling
    throw error;
  }
}

/**
 * Middleware to check trial expiration before site access
 */
export function requireActiveTrial(req, res, next) {
  // Skip for admins
  if (req.user?.role === 'admin') {
    return next();
  }

  const subdomain = req.params.subdomain || req.body.subdomain;

  if (!subdomain) {
    return res.status(400).json({ error: 'Subdomain required' });
  }

  dbQuery(`
    SELECT id, expires_at, plan
    FROM sites
    WHERE subdomain = $1
  `, [subdomain])
    .then(async (result) => {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Site not found' });
      }

      const site = result.rows[0];
      const trialStatus = await checkTrialStatus(site.id);

      if (trialStatus.isExpired) {
        return res.status(403).json({
          error: 'Trial expired',
          message: 'Your free trial has expired. Please upgrade to continue accessing your site.',
          code: 'TRIAL_EXPIRED'
        });
      }

      // Add trial info to request for use in route handlers
      req.trialStatus = trialStatus;
      req.siteId = site.id;
      next();
    })
    .catch((error) => {
      console.error('Trial check error:', error);
      res.status(500).json({ error: 'Failed to check trial status' });
    });
}

/**
 * Send trial expiration warning emails
 * Called by a scheduled job (e.g., daily cron)
 * 
 * ♻️ Refactored: Now delegates to TrialService
 */
export async function sendTrialExpirationWarnings() {
  return await trialService.sendTrialWarnings();
}

/**
 * Deactivate expired trial sites
 * Called by a scheduled job (e.g., daily cron)
 * 
 * ♻️ Refactored: Now delegates to TrialService
 */
export async function deactivateExpiredTrials() {
  const result = await trialService.deactivateExpiredTrials();

  console.log(`Deactivated ${result.deactivated} expired trial sites`);

  // Return format compatible with legacy code
  return {
    deactivated: result.deactivated,
    sites: result.sites
  };
}

export default {
  checkTrialStatus,
  requireActiveTrial,
  sendTrialExpirationWarnings,
  deactivateExpiredTrials
};

