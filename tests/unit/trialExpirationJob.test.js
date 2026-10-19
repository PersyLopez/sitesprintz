/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node-cron', () => ({
  default: { schedule: vi.fn() },
}));

vi.mock('../../server/services/trialService.js', () => ({
  trialService: {
    deactivateExpiredTrials: vi.fn(),
    sendTrialWarnings: vi.fn(),
  },
}));

vi.mock('../../server/config/platformPlans.js', () => ({
  platformCollectsPayments: vi.fn(),
}));

import cron from 'node-cron';
import { trialService } from '../../server/services/trialService.js';
import { platformCollectsPayments } from '../../server/config/platformPlans.js';
import { runTrialExpiration, startTrialExpirationJob } from '../../server/jobs/trial-expiration.js';

describe('runTrialExpiration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trialService.deactivateExpiredTrials.mockResolvedValue({ deactivated: 1, skipped: 0, skippedDueToPayment: 0, sites: [] });
    trialService.sendTrialWarnings.mockResolvedValue({ sent: 1, failed: 0, skipped: 0, errors: [] });
  });

  it('deactivates expired trials and warns owners when billing is open', async () => {
    platformCollectsPayments.mockReturnValue(true);

    const result = await runTrialExpiration();

    expect(trialService.deactivateExpiredTrials).toHaveBeenCalledTimes(1);
    expect(trialService.sendTrialWarnings).toHaveBeenCalledTimes(1);
    expect(result.deactivated.deactivated).toBe(1);
    expect(result.warnings.sent).toBe(1);
  });

  it('still deactivates but does not email while billing is closed', async () => {
    platformCollectsPayments.mockReturnValue(false);

    const result = await runTrialExpiration();

    expect(trialService.deactivateExpiredTrials).toHaveBeenCalledTimes(1);
    expect(trialService.sendTrialWarnings).not.toHaveBeenCalled();
    expect(result.warnings.sent).toBe(0);
  });

  it('schedules the check hourly', () => {
    startTrialExpirationJob();
    expect(cron.schedule).toHaveBeenCalledWith('15 * * * *', expect.any(Function));
  });
});
