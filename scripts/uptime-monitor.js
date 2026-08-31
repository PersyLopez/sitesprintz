#!/usr/bin/env node
/**
 * External uptime monitor setup (Better Stack or UptimeRobot).
 * Never prints API token values.
 *
 *   node scripts/uptime-monitor.js ensure
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();
export const UPTIME_MONITOR_SPEC = {
  url: 'https://rightsitelight.com/api/health',
  name: 'Right Site Light health',
  requiredKeyword: '"status":"ok"',
  betterStackCheckFrequency: 180,
  uptimeRobotInterval: 300,
  maxIntervalSeconds: 300,
};

const BETTERSTACK_API = 'https://uptime.betterstack.com/api/v2/monitors';
const UPTIMEROBOT_API = 'https://api.uptimerobot.com/v2';

const [command] = process.argv.slice(2);

function printJson(payload) {
  console.log(JSON.stringify(payload));
}

function fail(error, exitCode = 1, hint) {
  const payload = { ok: false, error };
  if (hint) payload.hint = hint;
  printJson(payload);
  process.exit(exitCode);
}

function resolveToken() {
  const betterStack = process.env.BETTERSTACK_API_TOKEN?.trim();
  if (betterStack) return { provider: 'betterstack', token: betterStack };
  const uptimeRobot = process.env.UPTIMEROBOT_API_KEY?.trim();
  if (uptimeRobot) return { provider: 'uptimerobot', token: uptimeRobot };
  return null;
}

async function betterStackRequest(token, method, path = '', body) {
  const response = await fetch(`${BETTERSTACK_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    fail(`betterstack_invalid_response_${response.status}`);
  }
  if (!response.ok) {
    fail(data?.errors?.[0]?.title || `betterstack_http_${response.status}`);
  }
  return data;
}

function betterStackDesiredBody() {
  return {
    monitor_type: 'keyword',
    url: UPTIME_MONITOR_SPEC.url,
    pronounceable_name: UPTIME_MONITOR_SPEC.name,
    required_keyword: UPTIME_MONITOR_SPEC.requiredKeyword,
    check_frequency: UPTIME_MONITOR_SPEC.betterStackCheckFrequency,
    http_method: 'GET',
    email: true,
    follow_redirects: true,
  };
}

function betterStackNeedsUpdate(attributes) {
  const desired = betterStackDesiredBody();
  return (
    attributes.monitor_type !== desired.monitor_type
    || attributes.url !== desired.url
    || attributes.required_keyword !== desired.required_keyword
    || attributes.check_frequency > UPTIME_MONITOR_SPEC.maxIntervalSeconds
    || attributes.pronounceable_name !== desired.pronounceable_name
    || String(attributes.http_method || '').toUpperCase() !== desired.http_method
    || attributes.follow_redirects !== true
  );
}

async function ensureBetterStack(token) {
  const list = await betterStackRequest(token, 'GET');
  const monitors = Array.isArray(list.data) ? list.data : [];
  const existing = monitors.find(
    (monitor) => monitor?.attributes?.url === UPTIME_MONITOR_SPEC.url,
  );

  if (existing) {
    if (!betterStackNeedsUpdate(existing.attributes || {})) {
      return { provider: 'betterstack', action: 'exists', id: String(existing.id) };
    }
    const updated = await betterStackRequest(
      token,
      'PATCH',
      `/${existing.id}`,
      betterStackDesiredBody(),
    );
    return { provider: 'betterstack', action: 'updated', id: String(updated.data?.id || existing.id) };
  }

  const created = await betterStackRequest(token, 'POST', '', betterStackDesiredBody());
  return { provider: 'betterstack', action: 'created', id: String(created.data?.id) };
}

async function uptimeRobotPost(token, endpoint, params) {
  const body = new URLSearchParams({ api_key: token, ...params });
  const response = await fetch(`${UPTIMEROBOT_API}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json();
  if (!response.ok || data.stat !== 'ok') {
    fail(data?.error?.message || `uptimerobot_http_${response.status}`);
  }
  return data;
}

function uptimeRobotDesiredParams() {
  return {
    type: '2',
    url: UPTIME_MONITOR_SPEC.url,
    friendly_name: UPTIME_MONITOR_SPEC.name,
    keyword_type: '1',
    keyword_value: UPTIME_MONITOR_SPEC.requiredKeyword,
    interval: String(UPTIME_MONITOR_SPEC.uptimeRobotInterval),
    http_method: '2',
  };
}

function uptimeRobotNeedsUpdate(monitor) {
  const desired = uptimeRobotDesiredParams();
  const interval = Number(monitor.interval);
  return (
    String(monitor.type) !== desired.type
    || monitor.url !== desired.url
    || String(monitor.keyword_type) !== desired.keyword_type
    || monitor.keyword_value !== desired.keyword_value
    || interval > UPTIME_MONITOR_SPEC.maxIntervalSeconds
    || monitor.friendly_name !== desired.friendly_name
    || String(monitor.http_method || '2') !== desired.http_method
  );
}

async function ensureUptimeRobot(token) {
  const list = await uptimeRobotPost(token, 'getMonitors', {
    format: 'json',
    logs: '0',
  });
  const monitors = Array.isArray(list.monitors) ? list.monitors : [];
  const existing = monitors.find((monitor) => monitor.url === UPTIME_MONITOR_SPEC.url);

  if (existing) {
    if (!uptimeRobotNeedsUpdate(existing)) {
      return { provider: 'uptimerobot', action: 'exists', id: String(existing.id) };
    }
    const updated = await uptimeRobotPost(token, 'editMonitor', {
      id: String(existing.id),
      ...uptimeRobotDesiredParams(),
    });
    return {
      provider: 'uptimerobot',
      action: 'updated',
      id: String(updated.monitor?.id || existing.id),
    };
  }

  const created = await uptimeRobotPost(token, 'newMonitor', uptimeRobotDesiredParams());
  return { provider: 'uptimerobot', action: 'created', id: String(created.monitor?.id) };
}

async function ensure() {
  const auth = resolveToken();
  if (!auth) {
    fail(
      'missing_token',
      2,
      'Set BETTERSTACK_API_TOKEN or UPTIMEROBOT_API_KEY',
    );
  }

  const result = auth.provider === 'betterstack'
    ? await ensureBetterStack(auth.token)
    : await ensureUptimeRobot(auth.token);

  printJson({ ok: true, ...result });
}

async function main() {
  if (command === 'ensure') {
    await ensure();
    return;
  }

  console.error('usage: uptime-monitor ensure');
  process.exit(1);
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
