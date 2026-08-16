/**
 * Core Web Vitals Monitoring
 *
 * Tracks and reports Core Web Vitals metrics via web-vitals v4+:
 * - LCP, CLS, FCP, TTFB, INP (FID when available)
 * Sends metrics to Google Analytics 4 if available.
 */

const isDev =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV;

/**
 * Send metric to Google Analytics 4
 */
function sendToGA(metric) {
  if (isDev) {
    // Quiet in dev — only log ratings that need attention
    if (metric.rating === 'poor') {
      console.warn(`[Web Vitals] ${metric.name}: ${Number(metric.value).toFixed(2)} (${metric.rating})`);
    }
    return;
  }

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.value),
      non_interaction: true,
      metric_rating: metric.rating,
      metric_value: metric.value,
      metric_delta: metric.delta,
    });
  }
}

/**
 * Initialize Core Web Vitals tracking (async ESM import — no require()).
 */
export async function initWebVitals() {
  if (typeof window === 'undefined') return;

  try {
    const webVitals = await import('web-vitals');
    const { onCLS, onFCP, onLCP, onTTFB, onINP, onFID } = webVitals;

    if (onLCP) onLCP(sendToGA);
    if (onCLS) onCLS(sendToGA);
    if (onFCP) onFCP(sendToGA);
    if (onTTFB) onTTFB(sendToGA);
    if (onINP) onINP(sendToGA);
    // FID deprecated in v4 but still exported for older browsers
    if (onFID) onFID(sendToGA);
  } catch {
    // Optional dependency — stay silent if missing or blocked
  }
}

/**
 * Placeholder for debugging hooks
 */
export function getWebVitalsMetrics() {
  return {
    lcp: null,
    fid: null,
    inp: null,
    cls: null,
    fcp: null,
    ttfb: null,
  };
}

export default {
  initWebVitals,
  getWebVitalsMetrics,
};
