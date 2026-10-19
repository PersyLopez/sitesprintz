/**
 * Trial expiration cron.
 * Deactivates published trials whose expires_at has passed, and warns
 * owners on day 3 and day 1 when platform billing is open.
 * Neighbor: server/jobs/booking-reminders.js
 */

import cron from 'node-cron';
import { trialService } from '../services/trialService.js';
import { platformCollectsPayments } from '../config/platformPlans.js';

export async function runTrialExpiration() {
  const deactivated = await trialService.deactivateExpiredTrials();
  if (!platformCollectsPayments()) {
    return {
      deactivated,
      warnings: { sent: 0, failed: 0, skipped: 0, errors: [] },
    };
  }
  const warnings = await trialService.sendTrialWarnings();
  return { deactivated, warnings };
}

export function startTrialExpirationJob() {
  cron.schedule('15 * * * *', async () => {
    try {
      await runTrialExpiration();
    } catch (error) {
      console.error('[TrialJob] Error:', error);
    }
  });
}
