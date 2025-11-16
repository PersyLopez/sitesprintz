/**
 * Unit Tests for Analytics Tracker (Client-Side)
 * TDD Approach: RED phase - Define tests first
 * 
 * Analytics Tracker should:
 * - Automatically track page views on load
 * - Track conversions (button clicks, form submits)
 * - Send data to backend API
 * - Handle offline scenarios with queue
 * - Respect Do Not Track (DNT) headers
 * - Be lightweight and non-blocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let AnalyticsTracker;
let window, document, navigator;

describe('AnalyticsTracker', () => {
  beforeEach(async () => {
    // Setup JSDOM
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://mybusiness.sitesprintz.com/menu',
      pretendToBeVisual: true,
    });
    
    window = dom.window;
    document = dom.window.document;
    navigator = dom.window.navigator;
    
    global.window = window;
    global.document = document;
    global.navigator = navigator;
    global.fetch = vi.fn();
    
    // Mock window.siteData (injected by server)
    window.siteData = {
      subdomain: 'mybusiness',
      plan: 'Pro'
    };

    // Import the tracker
    const module = await import('../../public/modules/analytics-tracker.js');
    AnalyticsTracker = module.default || window.AnalyticsTracker;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.navigator;
    delete global.fetch;
  });

  describe('Initialization', () => {
    it('should create a tracker instance', () => {
      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        endpoint: '/api/analytics'
      });

      expect(tracker).toBeDefined();
      expect(tracker.config.subdomain).toBe('mybusiness');
    });

    it('should auto-track page view on init', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: true
      });

      await tracker.init();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/pageview'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      );
    });

    it('should not track if DNT (Do Not Track) is enabled', async () => {
      Object.defineProperty(navigator, 'doNotTrack', {
        value: '1',
        configurable: true
      });

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: true
      });

      await tracker.init();

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should respect disabled analytics setting', async () => {
      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        enabled: false,
        autoTrack: true
      });

      await tracker.init();

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('trackPageView()', () => {
    it('should send page view data to backend', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: false
      });

      await tracker.trackPageView();

      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/pageview',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subdomain":"mybusiness"')
        })
      );

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.path).toBe('/menu');
      expect(callBody.userAgent).toBeDefined();
      expect(callBody.referrer).toBeDefined();
    });

    it('should queue page view if offline', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: false
      });

      await tracker.trackPageView();

      // Should be in offline queue
      expect(tracker.offlineQueue.length).toBe(1);
      expect(tracker.offlineQueue[0].type).toBe('pageview');
    });
  });

  describe('trackConversion()', () => {
    it('should track contact form submission', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: false
      });

      await tracker.trackConversion('contact_form_submit', {
        formType: 'quote_request'
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/conversion',
        expect.objectContaining({
          method: 'POST'
        })
      );

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.type).toBe('contact_form_submit');
      expect(callBody.metadata.formType).toBe('quote_request');
    });

    it('should track booking widget clicks', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: false
      });

      await tracker.trackConversion('booking_click');

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.type).toBe('booking_click');
    });

    it('should queue conversion if offline', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: false
      });

      await tracker.trackConversion('phone_click');

      expect(tracker.offlineQueue.length).toBe(1);
      expect(tracker.offlineQueue[0].type).toBe('conversion');
    });
  });

  describe('Auto-tracking', () => {
    it('should auto-track external link clicks', async () => {
      global.fetch.mockResolvedValue({ ok: true });

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: true
      });

      await tracker.init();

      // Create and click external link
      const link = document.createElement('a');
      link.href = 'https://external.com';
      link.textContent = 'External Link';
      document.body.appendChild(link);

      link.click();

      // Wait for async tracking
      await new Promise(resolve => setTimeout(resolve, 10));

      const conversionCalls = fetch.mock.calls.filter(call => 
        call[0].includes('/conversion')
      );
      expect(conversionCalls.length).toBeGreaterThan(0);
    });

    it('should auto-track email link clicks', async () => {
      global.fetch.mockResolvedValue({ ok: true });

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: true
      });

      await tracker.init();

      const emailLink = document.createElement('a');
      emailLink.href = 'mailto:contact@mybusiness.com';
      document.body.appendChild(emailLink);

      emailLink.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      const conversionCalls = fetch.mock.calls.filter(call => 
        call[0].includes('/conversion') &&
        call[1].body.includes('email_click')
      );
      expect(conversionCalls.length).toBeGreaterThan(0);
    });

    it('should auto-track phone link clicks', async () => {
      global.fetch.mockResolvedValue({ ok: true });

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: true
      });

      await tracker.init();

      const phoneLink = document.createElement('a');
      phoneLink.href = 'tel:+15551234567';
      document.body.appendChild(phoneLink);

      phoneLink.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      const conversionCalls = fetch.mock.calls.filter(call => 
        call[0].includes('/conversion') &&
        call[1].body.includes('phone_click')
      );
      expect(conversionCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Offline Queue', () => {
    it('should retry queued events when back online', async () => {
      // First call fails (offline)
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      // Second call succeeds (online)
      global.fetch.mockResolvedValueOnce({ ok: true });

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: false
      });

      // Track while offline
      await tracker.trackPageView();
      expect(tracker.offlineQueue.length).toBe(1);

      // Simulate coming back online
      await tracker.flushOfflineQueue();

      expect(tracker.offlineQueue.length).toBe(0);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should limit offline queue size', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: false,
        maxQueueSize: 5
      });

      // Try to queue 10 events
      for (let i = 0; i < 10; i++) {
        await tracker.trackPageView();
      }

      // Should only keep the last 5
      expect(tracker.offlineQueue.length).toBe(5);
    });
  });

  describe('Privacy & Performance', () => {
    it('should not track sensitive data in URLs', async () => {
      // Test the sanitizePath method directly since we can't redefine location in JSDOM
      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: false
      });

      // Test that sanitizePath removes query parameters
      const sensitiveUrl = '/contact?email=user@example.com&token=secret123';
      const sanitized = tracker.sanitizePath(sensitiveUrl);

      expect(sanitized).toBe('/contact');
      expect(sanitized).not.toContain('email');
      expect(sanitized).not.toContain('token');
    });

    it('should be non-blocking (fire and forget)', async () => {
      // Simulate slow network
      global.fetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true }), 1000))
      );

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: false
      });

      const startTime = Date.now();
      tracker.trackPageView(); // Don't await
      const endTime = Date.now();

      // Should return immediately (non-blocking)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should use sendBeacon for page unload tracking', () => {
      navigator.sendBeacon = vi.fn();

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: false
      });

      tracker.trackPageView({ useBeacon: true });

      expect(navigator.sendBeacon).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API Error'));

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: false
      });

      // Should not throw
      await expect(tracker.trackPageView()).resolves.not.toThrow();
    });

    it('should handle malformed responses gracefully', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const tracker = new AnalyticsTracker({
        subdomain: 'mybusiness',
        autoTrack: false
      });

      await expect(tracker.trackPageView()).resolves.not.toThrow();
    });
  });
});

