import { isPlatformHostname } from './customDomainHost';

const DEFAULT_CLARITY_PROJECT_ID = 'yer91x2gqo';
const CLARITY_SCRIPT_PREFIX = 'https://www.clarity.ms/tag/';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const MARKETING_PATHS = new Set([
  '/',
  '/about',
  '/contact',
  '/build',
  '/login',
  '/register',
  '/showcase',
]);

export const CLARITY_PROJECT_ID =
  typeof import.meta.env?.VITE_CLARITY_PROJECT_ID === 'string'
    && import.meta.env.VITE_CLARITY_PROJECT_ID.trim()
    ? import.meta.env.VITE_CLARITY_PROJECT_ID.trim()
    : DEFAULT_CLARITY_PROJECT_ID;

export function isClarityMarketingPath(pathname) {
  const path = typeof pathname === 'string' ? pathname.replace(/\/+$/, '') || '/' : '';
  return MARKETING_PATHS.has(path) || /^\/showcase\/[^/]+$/.test(path);
}

export function shouldLoadClarity({ isProd, hostname, pathname }) {
  const normalizedHostname = typeof hostname === 'string' ? hostname.toLowerCase() : '';
  return Boolean(
    isProd
      && !LOCAL_HOSTS.has(normalizedHostname)
      && isPlatformHostname(hostname)
      && isClarityMarketingPath(pathname)
  );
}

export function syncClarity({ isProd, hostname, pathname }) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (!shouldLoadClarity({ isProd, hostname, pathname })) {
    if (typeof window.clarity === 'function') window.clarity('stop');
    return;
  }

  // Official tag calls window.clarity("start", ...) before clarity.js loads.
  window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };

  const selector = `script[data-clarity-project="${CLARITY_PROJECT_ID}"]`;
  if (document.querySelector(selector)) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `${CLARITY_SCRIPT_PREFIX}${CLARITY_PROJECT_ID}`;
  script.dataset.clarityProject = CLARITY_PROJECT_ID;
  document.head.appendChild(script);
}

export default {
  CLARITY_PROJECT_ID,
  isClarityMarketingPath,
  shouldLoadClarity,
  syncClarity,
};
