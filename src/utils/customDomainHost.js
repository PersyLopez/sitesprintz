/**
 * Hostname helpers for bring-your-own domain.
 * Safe in the browser and on the server (no Node dns / import.meta).
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export function normalizeHostname(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let value = raw.trim().toLowerCase();
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  value = value.split('/')[0];
  value = value.split('?')[0];
  value = value.split('#')[0];
  value = value.split(':')[0];
  value = value.replace(/\.$/, '');
  if (value.startsWith('www.')) value = value.slice(4);
  return value;
}

export function isValidCustomDomain(host) {
  const value = normalizeHostname(host);
  if (!value || value.length > 253) return false;
  if (LOCAL_HOSTS.has(value)) return false;
  return /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(value);
}

export function getPublicSiteHost() {
  if (typeof process !== 'undefined' && process.env) {
    return normalizeHostname(
      process.env.PUBLIC_SITE_HOST
      || process.env.VITE_PUBLIC_SITE_HOST
      || 'sitesprintz.com'
    ) || 'sitesprintz.com';
  }
  return 'sitesprintz.com';
}

export function isPlatformHostname(host, publicHost = getPublicSiteHost()) {
  const value = normalizeHostname(host);
  if (!value) return true;
  if (LOCAL_HOSTS.has(value)) return true;
  const root = normalizeHostname(publicHost) || 'sitesprintz.com';
  if (value === root || value.endsWith(`.${root}`)) return true;
  if (value.endsWith('.railway.app') || value.endsWith('.vercel.app')) return true;
  if (value.includes('ngrok') || value.endsWith('.nip.io')) return true;
  return false;
}

export function hostLookupCandidates(host) {
  const apex = normalizeHostname(host);
  if (!apex) return [];
  const raw = String(host || '').trim().toLowerCase().split(':')[0];
  const withWww = apex.startsWith('www.') ? apex : `www.${apex}`;
  return [...new Set([apex, withWww, raw].filter(Boolean))];
}
