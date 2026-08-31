import { describe, it, expect } from 'vitest';
import {
  UPTIME_MONITOR_SPEC,
  uptimeRobotCreateParams,
  uptimeRobotEditParams,
} from '../../scripts/uptime-monitor.js';

describe('uptime monitor spec', () => {
  it('targets production health URL with keyword and interval cap', () => {
    expect(UPTIME_MONITOR_SPEC.url).toBe('https://rightsitelight.com/api/health');
    expect(UPTIME_MONITOR_SPEC.requiredKeyword).toBe('"status":"ok"');
    expect(UPTIME_MONITOR_SPEC.betterStackCheckFrequency).toBeLessThanOrEqual(300);
    expect(UPTIME_MONITOR_SPEC.uptimeRobotInterval).toBeLessThanOrEqual(300);
    expect(UPTIME_MONITOR_SPEC.name).toBe('Right Site Light health');
  });

  it('omits type on UptimeRobot edit because type cannot change', () => {
    const create = uptimeRobotCreateParams();
    const edit = uptimeRobotEditParams(99, { type: '2' });
    expect(create.type).toBe('2');
    expect(edit).not.toHaveProperty('type');
    expect(edit).not.toHaveProperty('http_method');
    expect(edit.id).toBe('99');
    expect(edit.keyword_value).toBe(UPTIME_MONITOR_SPEC.requiredKeyword);
  });
});
