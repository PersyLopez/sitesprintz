/**
 * Booking Widget Unit Tests (TDD RED Phase)
 * 
 * Testing the universal booking widget component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('BookingWidget', () => {
  let BookingWidget;
  let dom;
  let document;
  let window;
  let container;

  beforeEach(async () => {
    // Setup JSDOM
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="booking-widget-container"></div></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });
    
    global.document = dom.window.document;
    global.window = dom.window;
    document = dom.window.document;
    window = dom.window;
    
    container = document.getElementById('booking-widget-container');

    // Import the module (will fail until we create it)
    const module = await import('../../public/modules/booking-widget.js');
    BookingWidget = module.default || window.BookingWidget;
  });

  afterEach(() => {
    if (container) {
      container.innerHTML = '';
    }
    delete global.document;
    delete global.window;
  });

  describe('Constructor', () => {
    it('should create a BookingWidget instance with default config', () => {
      const widget = new BookingWidget({
        url: 'https://calendly.com/business',
      });

      expect(widget).toBeDefined();
      expect(widget.config.provider).toBe('calendly');
      expect(widget.config.embedMode).toBe(true);
      expect(widget.config.style.height).toBe('700px');
    });

    it('should accept custom configuration', () => {
      const widget = new BookingWidget({
        enabled: true,
        provider: 'acuity',
        url: 'https://acuityscheduling.com/schedule',
        embedMode: false,
        style: {
          height: '600px',
          backgroundColor: '#f0f0f0'
        }
      });

      expect(widget.config.provider).toBe('acuity');
      expect(widget.config.embedMode).toBe(false);
      expect(widget.config.style.height).toBe('600px');
      expect(widget.config.style.backgroundColor).toBe('#f0f0f0');
    });

    it('should default embedMode to true if not specified', () => {
      const widget = new BookingWidget({
        url: 'https://calendly.com/business',
      });

      expect(widget.config.embedMode).toBe(true);
    });
  });

  describe('init()', () => {
    it('should not render if not enabled', async () => {
      const widget = new BookingWidget({
        enabled: false,
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container'
      });

      await widget.init();

      expect(container.innerHTML).toBe('');
    });

    it('should not render if URL is missing', async () => {
      const widget = new BookingWidget({
        enabled: true,
        url: '',
        containerId: 'booking-widget-container'
      });

      await widget.init();

      expect(container.innerHTML).toBe('');
    });

    it('should show loading skeleton initially', () => {
      // Test the skeleton rendering directly as a unit
      const widget = new BookingWidget({
        enabled: true,
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container',
        embedMode: true
      });

      widget.container = container;
      widget.showLoadingSkeleton();

      // Check that loading skeleton appears with correct structure
      const skeleton = container.querySelector('.booking-widget-loading');
      expect(skeleton).toBeTruthy();
      expect(skeleton.querySelector('.skeleton-header')).toBeTruthy();
      expect(skeleton.querySelector('.skeleton-text')).toBeTruthy();
      expect(skeleton.querySelector('.skeleton-calendar')).toBeTruthy();
    });

    it('should render fallback link when embedMode is false', async () => {
      const widget = new BookingWidget({
        enabled: true,
        provider: 'calendly',
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container',
        embedMode: false
      });

      await widget.init();

      const fallback = container.querySelector('.booking-widget-fallback');
      expect(fallback).toBeTruthy();
      
      const link = container.querySelector('a[href="https://calendly.com/business"]');
      expect(link).toBeTruthy();
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  describe('getEmbedUrl()', () => {
    it('should convert Calendly URL to embed format', () => {
      const widget = new BookingWidget({
        provider: 'calendly',
        url: 'https://calendly.com/business/meeting',
      });

      const embedUrl = widget.getEmbedUrl();
      expect(embedUrl).toBe('https://calendly.com/embed/business/meeting');
    });

    it('should keep Calendly URL if already in embed format', () => {
      const widget = new BookingWidget({
        provider: 'calendly',
        url: 'https://calendly.com/embed/business/meeting',
      });

      const embedUrl = widget.getEmbedUrl();
      expect(embedUrl).toBe('https://calendly.com/embed/business/meeting');
    });

    it('should add embed parameter to Acuity URL', () => {
      const widget = new BookingWidget({
        provider: 'acuity',
        url: 'https://acuityscheduling.com/schedule.php',
      });

      const embedUrl = widget.getEmbedUrl();
      expect(embedUrl).toBe('https://acuityscheduling.com/schedule.php?embed=true');
    });

    it('should not duplicate embed parameter for Acuity', () => {
      const widget = new BookingWidget({
        provider: 'acuity',
        url: 'https://acuityscheduling.com/schedule.php?embed=true',
      });

      const embedUrl = widget.getEmbedUrl();
      expect(embedUrl).toBe('https://acuityscheduling.com/schedule.php?embed=true');
    });

    it('should use custom URL as-is', () => {
      const widget = new BookingWidget({
        provider: 'custom',
        url: 'https://example.com/booking',
      });

      const embedUrl = widget.getEmbedUrl();
      expect(embedUrl).toBe('https://example.com/booking');
    });

    it('should use Square URL as-is', () => {
      const widget = new BookingWidget({
        provider: 'square',
        url: 'https://square.site/book/ABC123/business',
      });

      const embedUrl = widget.getEmbedUrl();
      expect(embedUrl).toBe('https://square.site/book/ABC123/business');
    });
  });

  describe('embedIframe()', () => {
    it('should create an iframe with correct attributes', async () => {
      const widget = new BookingWidget({
        enabled: true,
        provider: 'calendly',
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container',
        style: { height: '800px' }
      });

      widget.container = container;

      // Mock iframe load event
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag) => {
        const element = originalCreateElement(tag);
        if (tag === 'iframe') {
          setTimeout(() => {
            element.dispatchEvent(new window.Event('load'));
          }, 10);
        }
        return element;
      });

      await widget.embedIframe();

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe.src).toContain('calendly.com');
      expect(iframe.style.height).toBe('800px');
      expect(iframe.style.width).toBe('100%');
      expect(iframe.style.border).toBe('0px'); // JSDOM returns '0px'
      expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
      expect(iframe.getAttribute('title')).toBe('Book an Appointment');

      document.createElement = originalCreateElement;
    });

    it('should include fallback button below iframe', async () => {
      const widget = new BookingWidget({
        enabled: true,
        provider: 'calendly',
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container'
      });

      widget.container = container;

      // Mock iframe load
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag) => {
        const element = originalCreateElement(tag);
        if (tag === 'iframe') {
          setTimeout(() => {
            element.dispatchEvent(new window.Event('load'));
          }, 10);
        }
        return element;
      });

      await widget.embedIframe();

      const fallbackButton = container.querySelector('a[href="https://calendly.com/business"]');
      expect(fallbackButton).toBeTruthy();
      expect(fallbackButton.textContent).toContain('Open in New Window');

      document.createElement = originalCreateElement;
    });

    it('should timeout after 10 seconds if iframe does not load', async () => {
      const widget = new BookingWidget({
        enabled: true,
        provider: 'calendly',
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container'
      });

      widget.container = container;

      // Don't trigger load event
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag) => {
        return originalCreateElement(tag);
      });

      await expect(widget.embedIframe()).rejects.toThrow('Iframe load timeout');

      document.createElement = originalCreateElement;
    });

    it('should reject if iframe errors', async () => {
      const widget = new BookingWidget({
        enabled: true,
        provider: 'calendly',
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container'
      });

      widget.container = container;

      // Trigger error event
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag) => {
        const element = originalCreateElement(tag);
        if (tag === 'iframe') {
          setTimeout(() => {
            element.dispatchEvent(new window.Event('error'));
          }, 10);
        }
        return element;
      });

      await expect(widget.embedIframe()).rejects.toBeDefined();
      expect(widget.isIframeBlocked).toBe(true);

      document.createElement = originalCreateElement;
    });
  });

  describe('showFallbackLink()', () => {
    it('should render fallback link with booking URL', () => {
      const widget = new BookingWidget({
        provider: 'calendly',
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container'
      });

      widget.container = container;
      widget.showFallbackLink();

      const fallback = container.querySelector('.booking-widget-fallback');
      expect(fallback).toBeTruthy();

      const link = container.querySelector('a');
      expect(link.href).toBe('https://calendly.com/business');
      expect(link.textContent).toContain('Book Now');
    });

    it('should render with custom background color', () => {
      const widget = new BookingWidget({
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container',
        style: { backgroundColor: '#f0f0f0' }
      });

      widget.container = container;
      widget.showFallbackLink();

      const fallback = container.querySelector('.booking-widget-fallback');
      // JSDOM converts hex colors to rgb format
      const bg = fallback.style.background;
      expect(bg === '#f0f0f0' || bg === 'rgb(240, 240, 240)').toBe(true);
    });
  });

  describe('destroy()', () => {
    it('should clear container and remove iframe', async () => {
      const widget = new BookingWidget({
        enabled: true,
        provider: 'calendly',
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container',
        embedMode: false
      });

      await widget.init();
      expect(container.innerHTML).not.toBe('');

      widget.destroy();
      expect(container.innerHTML).toBe('');
      expect(widget.iframe).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update configuration and re-render', async () => {
      const widget = new BookingWidget({
        enabled: true,
        provider: 'calendly',
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container',
        embedMode: false
      });

      await widget.init();

      // Verify initial render
      let link = container.querySelector('a');
      expect(link.href).toBe('https://calendly.com/business');

      // Update URL
      await widget.update({ url: 'https://calendly.com/new-business' });

      // Verify updated render
      link = container.querySelector('a');
      expect(link.href).toBe('https://calendly.com/new-business');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on iframe', async () => {
      const widget = new BookingWidget({
        enabled: true,
        provider: 'calendly',
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container'
      });

      widget.container = container;

      // Mock iframe load
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag) => {
        const element = originalCreateElement(tag);
        if (tag === 'iframe') {
          setTimeout(() => {
            element.dispatchEvent(new window.Event('load'));
          }, 10);
        }
        return element;
      });

      await widget.embedIframe();

      const iframe = container.querySelector('iframe');
      expect(iframe.getAttribute('title')).toBe('Book an Appointment');

      document.createElement = originalCreateElement;
    });

    it('should have keyboard accessible fallback link', () => {
      const widget = new BookingWidget({
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container'
      });

      widget.container = container;
      widget.showFallbackLink();

      const link = container.querySelector('a');
      expect(link.tagName).toBe('A');
      expect(link.href).toBeTruthy();
    });
  });

  describe('Security', () => {
    it('should sandbox iframe with appropriate permissions', async () => {
      const widget = new BookingWidget({
        enabled: true,
        provider: 'calendly',
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container'
      });

      widget.container = container;

      // Mock iframe load
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag) => {
        const element = originalCreateElement(tag);
        if (tag === 'iframe') {
          setTimeout(() => {
            element.dispatchEvent(new window.Event('load'));
          }, 10);
        }
        return element;
      });

      await widget.embedIframe();

      const iframe = container.querySelector('iframe');
      const sandbox = iframe.getAttribute('sandbox');
      
      expect(sandbox).toContain('allow-scripts');
      expect(sandbox).toContain('allow-same-origin');
      expect(sandbox).toContain('allow-forms');
      expect(sandbox).toContain('allow-popups');

      document.createElement = originalCreateElement;
    });

    it('should set rel="noopener noreferrer" on external links', () => {
      const widget = new BookingWidget({
        url: 'https://calendly.com/business',
        containerId: 'booking-widget-container'
      });

      widget.container = container;
      widget.showFallbackLink();

      const link = container.querySelector('a');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });
});

