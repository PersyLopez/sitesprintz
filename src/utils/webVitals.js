/**
 * Core Web Vitals Monitoring
 * 
 * Tracks and reports Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay) / INP (Interaction to Next Paint)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 * 
 * Sends metrics to Google Analytics 4 if available
 */

// Check if web-vitals is available (will be installed)
let getCLS, getFID, getFCP, getLCP, getTTFB, onINP;

try {
  // Try to import web-vitals (will be installed via npm)
  const webVitals = require('web-vitals');
  getCLS = webVitals.getCLS;
  getFID = webVitals.getFID;
  getFCP = webVitals.getFCP;
  getLCP = webVitals.getLCP;
  getTTFB = webVitals.getTTFB;
  onINP = webVitals.onINP;
} catch (e) {
  // web-vitals not installed yet - will be added to package.json
  console.warn('web-vitals not installed. Run: npm install web-vitals');
}

/**
 * Send metric to Google Analytics 4
 */
function sendToGA(metric) {
  // Only send in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Web Vitals]', metric.name, ':', metric.value.toFixed(2), metric.rating);
    return;
  }

  // Send to Google Analytics 4 if available
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

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', {
      name: metric.name,
      value: metric.value.toFixed(2),
      rating: metric.rating,
      id: metric.id,
    });
  }
}

/**
 * Initialize Core Web Vitals tracking
 */
export function initWebVitals() {
  if (!getCLS || !getFID || !getFCP || !getLCP || !getTTFB) {
    console.warn('Web Vitals not available. Install: npm install web-vitals');
    return;
  }

  // Track LCP (Largest Contentful Paint)
  // Target: < 2.5s
  getLCP((metric) => {
    sendToGA(metric);
    
    // Log warning if LCP is poor
    if (metric.value > 2500) {
      console.warn(`⚠️ LCP is ${metric.value.toFixed(0)}ms (target: <2500ms)`);
    }
  });

  // Track FID (First Input Delay) - deprecated, use INP instead
  // Target: < 100ms
  getFID((metric) => {
    sendToGA(metric);
    
    if (metric.value > 100) {
      console.warn(`⚠️ FID is ${metric.value.toFixed(0)}ms (target: <100ms)`);
    }
  });

  // Track INP (Interaction to Next Paint) - preferred over FID
  // Target: < 200ms
  if (onINP) {
    onINP((metric) => {
      sendToGA(metric);
      
      if (metric.value > 200) {
        console.warn(`⚠️ INP is ${metric.value.toFixed(0)}ms (target: <200ms)`);
      }
    });
  }

  // Track CLS (Cumulative Layout Shift)
  // Target: < 0.1
  getCLS((metric) => {
    sendToGA(metric);
    
    if (metric.value > 0.1) {
      console.warn(`⚠️ CLS is ${metric.value.toFixed(3)} (target: <0.1)`);
    }
  });

  // Track FCP (First Contentful Paint)
  // Target: < 1.8s
  getFCP((metric) => {
    sendToGA(metric);
    
    if (metric.value > 1800) {
      console.warn(`⚠️ FCP is ${metric.value.toFixed(0)}ms (target: <1800ms)`);
    }
  });

  // Track TTFB (Time to First Byte)
  // Target: < 800ms
  getTTFB((metric) => {
    sendToGA(metric);
    
    if (metric.value > 800) {
      console.warn(`⚠️ TTFB is ${metric.value.toFixed(0)}ms (target: <800ms)`);
    }
  });
}

/**
 * Get current Web Vitals metrics (for debugging)
 */
export function getWebVitalsMetrics() {
  return {
    lcp: null, // Will be populated by getLCP callback
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

