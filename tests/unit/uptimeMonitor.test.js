import { describe, it, expect } from 'vitest';
import { UPTIME_MONITOR_SPEC } from '../../scripts/uptime-monitor.js';

describe('uptime monitor spec', () => {
  it('targets production health URL with keyword and interval cap', () => {
    expect(UPTIME_MONITOR_SPEC.url).toBe('https://rightsitelight.com/api/health');
    expect(UPTIME_MONITOR_SPEC.requiredKeyword).toBe('"status":"ok"');
    expect(UPTIME_MONITOR_SPEC.betterStackCheckFrequency).toBeLessThanOrEqual(300);
    expect(UPTIME_MONITOR_SPEC.uptimeRobotInterval).toBeLessThanOrEqual(300);
    expect(UPTIME_MONITOR_SPEC.name).toBe('Right Site Light health');
  });
});
