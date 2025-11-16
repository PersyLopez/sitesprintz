/**
 * Analytics Tracker (Client-Side)
 * Lightweight, privacy-focused analytics for Pro sites
 * 
 * Features:
 * - Auto-tracks page views
 * - Tracks conversions (clicks, form submits)
 * - Offline queue with retry
 * - Respects Do Not Track (DNT)
 * - Non-blocking fire-and-forget
 * - No PII tracking
 */

class AnalyticsTracker {
  constructor(config = {}) {
    this.config = {
      subdomain: config.subdomain || window.siteData?.subdomain,
      endpoint: config.endpoint || '/api/analytics',
      autoTrack: config.autoTrack !== false, // default true
      enabled: config.enabled !== false, // default true
      maxQueueSize: config.maxQueueSize || 50,
      retryDelay: config.retryDelay || 5000 // 5 seconds
    };

    this.offlineQueue = [];
    this.isOnline = navigator.onLine;
    this.dnt = this.checkDoNotTrack();
  }

  /**
   * Check if Do Not Track is enabled
   */
  checkDoNotTrack() {
    return navigator.doNotTrack === '1' || 
           navigator.doNotTrack === 'yes' ||
           window.doNotTrack === '1';
  }

  /**
   * Initialize tracker
   */
  async init() {
    if (!this.config.enabled || this.dnt) {
      return;
    }

    // Setup online/offline listeners
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Setup auto-tracking
    if (this.config.autoTrack) {
      this.setupAutoTracking();
      
      // Track initial page view
      await this.trackPageView();
    }

    // Setup beforeunload for queued events
    window.addEventListener('beforeunload', () => {
      this.flushOfflineQueue({ useBeacon: true });
    });
  }

  /**
   * Setup automatic event tracking
   */
  setupAutoTracking() {
    // Track clicks on links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href') || '';

      // Track email clicks
      if (href.startsWith('mailto:')) {
        this.trackConversion('email_click', {
          element: 'link'
        });
      }
      // Track phone clicks
      else if (href.startsWith('tel:')) {
        this.trackConversion('phone_click', {
          element: 'link'
        });
      }
      // Track external links
      else if (href.startsWith('http') && !href.includes(window.location.hostname)) {
        this.trackConversion('external_link_click', {
          url: href
        });
      }
      // Track booking widget clicks
      else if (link.closest('.booking-widget') || href.includes('#booking')) {
        this.trackConversion('booking_click', {
          element: 'link'
        });
      }
    }, { passive: true });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (!form || form.tagName !== 'FORM') return;

      const formType = form.id || form.className || 'unknown';
      this.trackConversion('contact_form_submit', {
        formType
      });
    }, { passive: true });
  }

  /**
   * Track a page view
   */
  async trackPageView(options = {}) {
    if (!this.config.enabled || this.dnt) {
      return;
    }

    const data = {
      subdomain: this.config.subdomain,
      path: this.sanitizePath(window.location.pathname),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    };

    return this.send('pageview', data, options);
  }

  /**
   * Track a conversion event
   */
  async trackConversion(type, metadata = {}, options = {}) {
    if (!this.config.enabled || this.dnt) {
      return;
    }

    const data = {
      subdomain: this.config.subdomain,
      type,
      value: 0,
      metadata,
      timestamp: new Date().toISOString()
    };

    return this.send('conversion', data, options);
  }

  /**
   * Send data to backend
   */
  async send(eventType, data, options = {}) {
    const url = `${this.config.endpoint}/${eventType}`;

    // Use sendBeacon if requested (for unload events)
    if (options.useBeacon && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }

    // Fire-and-forget fetch (non-blocking)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // If offline or error, queue for later
      this.queueEvent(eventType, data);
    }
  }

  /**
   * Queue event for offline retry
   */
  queueEvent(type, data) {
    this.offlineQueue.push({ type, data, timestamp: Date.now() });

    // Limit queue size (FIFO)
    if (this.offlineQueue.length > this.config.maxQueueSize) {
      this.offlineQueue = this.offlineQueue.slice(-this.config.maxQueueSize);
    }
  }

  /**
   * Flush offline queue
   */
  async flushOfflineQueue(options = {}) {
    if (this.offlineQueue.length === 0) {
      return;
    }

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const event of queue) {
      try {
        await this.send(event.type, event.data, options);
      } catch (error) {
        // If still fails, requeue
        this.queueEvent(event.type, event.data);
      }
    }
  }

  /**
   * Sanitize path to remove PII
   */
  sanitizePath(path) {
    try {
      // Remove query parameters that might contain sensitive data
      const url = new URL(path, window.location.origin);
      return url.pathname;
    } catch {
      return path.split('?')[0];
    }
  }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsTracker;
}

// Export as default for ES modules
if (typeof exports !== 'undefined') {
  exports.default = AnalyticsTracker;
}

// Global export for browser
if (typeof window !== 'undefined') {
  window.AnalyticsTracker = AnalyticsTracker;
}

