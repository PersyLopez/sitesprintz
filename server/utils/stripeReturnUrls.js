import { getFrontendOrigin } from '../services/payments/processorConnectHelpers.js';

function normalizeOrigin(value) {
  if (!value || typeof value !== 'string') return '';
  try {
    const parsed = new URL(value.trim());
    return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '');
  } catch {
    return '';
  }
}

function safeRelativePath(value) {
  if (!value || typeof value !== 'string') return null;
  const path = value.trim();
  if (!path.startsWith('/')) return null;
  if (path.startsWith('//') || path.includes('\\')) return null;
  if (path.includes('://')) return null;
  return path;
}

export function allowedRedirectOrigins(req) {
  const listed = [
    getFrontendOrigin(req),
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.SITE_URL,
    req?.headers?.origin,
    ...(process.env.CORS_ORIGINS || '').split(','),
    ...(process.env.ALLOWED_ORIGINS || '').split(','),
  ];
  return new Set(listed.map(normalizeOrigin).filter(Boolean));
}

/**
 * Absolute Stripe success/cancel/return URL for the action that started Checkout.
 * Accepts a same-origin absolute URL or a relative path; otherwise uses fallbackPath.
 */
export function resolveStripeRedirectUrl(req, provided, fallbackPath) {
  const origin = normalizeOrigin(getFrontendOrigin(req)) || 'http://localhost:5173';
  const fallback = safeRelativePath(fallbackPath) || '/dashboard';

  if (typeof provided === 'string' && provided.trim()) {
    const relative = safeRelativePath(provided.trim());
    if (relative) {
      return `${origin}${relative}`;
    }
    try {
      const parsed = new URL(provided.trim());
      const candidateOrigin = `${parsed.protocol}//${parsed.host}`;
      if (allowedRedirectOrigins(req).has(candidateOrigin)) {
        return parsed.toString();
      }
    } catch {
      // fall through to default
    }
  }

  return `${origin}${fallback}`;
}

export function subscriptionCheckoutUrls(req, { plan, draftId, successUrl, cancelUrl }) {
  const draftQuery = draftId ? `&draftId=${encodeURIComponent(draftId)}` : '';
  const successFallback = `/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}${draftQuery}`;
  const cancelFallback = draftId ? '/setup' : `/payment-cancel?plan=${plan}`;
  return {
    successUrl: resolveStripeRedirectUrl(req, successUrl, successFallback),
    cancelUrl: resolveStripeRedirectUrl(req, cancelUrl, cancelFallback),
  };
}
