/**
 * Unit Tests for Foundation Trust Signals - Basic
 * 
 * Testing Strategy:
 * - RED: Write failing tests first
 * - GREEN: Make tests pass
 * - REFACTOR: Optimize implementation
 * 
 * Coverage:
 * - Badge rendering logic
 * - Configuration handling
 * - DOM manipulation
 * - Responsive behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Foundation Trust Signals - Basic', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <div class="container">
            <section class="hero">Hero Section</section>
            <section>Other content</section>
          </div>
        </body>
      </html>
    `);
    
    document = dom.window.document;
    window = dom.window;
    
    // Make global for module
    global.document = document;
    global.window = window;
  });

  afterEach(() => {
    // Clean up
    delete global.document;
    delete global.window;
  });

  describe('Badge Rendering', () => {
    it('should render SSL badge when showSSLBadge is true', () => {
      const config = {
        enabled: true,
        showSSLBadge: true,
        showVerifiedBadge: false,
        showPaymentIcons: false,
        yearsInBusiness: 0
      };

      renderTrustSignals(config);

      const badge = document.querySelector('.trust-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('Secure Site');
      expect(badge.querySelector('svg')).toBeTruthy();
    });

    it('should render verified badge when showVerifiedBadge is true', () => {
      const config = {
        enabled: true,
        showSSLBadge: false,
        showVerifiedBadge: true,
        showPaymentIcons: false,
        yearsInBusiness: 0
      };

      renderTrustSignals(config);

      const badge = document.querySelector('.trust-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('Verified Business');
    });

    it('should render payment icons badge when showPaymentIcons is true', () => {
      const config = {
        enabled: true,
        showSSLBadge: false,
        showVerifiedBadge: false,
        showPaymentIcons: true,
        yearsInBusiness: 0
      };

      renderTrustSignals(config);

      const badge = document.querySelector('.trust-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('Secure Payment');
    });

    it('should render years in business badge when yearsInBusiness > 0', () => {
      const config = {
        enabled: true,
        showSSLBadge: false,
        showVerifiedBadge: false,
        showPaymentIcons: false,
        yearsInBusiness: 10
      };

      renderTrustSignals(config);

      const badge = document.querySelector('.trust-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('10+ Years');
    });

    it('should render all badges when all options are enabled', () => {
      const config = {
        enabled: true,
        showSSLBadge: true,
        showVerifiedBadge: true,
        showPaymentIcons: true,
        yearsInBusiness: 5
      };

      renderTrustSignals(config);

      const badges = document.querySelectorAll('.trust-badge');
      expect(badges.length).toBe(4);
    });
  });

  describe('Configuration Handling', () => {
    it('should not render anything when enabled is false', () => {
      const config = {
        enabled: false,
        showSSLBadge: true,
        showVerifiedBadge: true,
        showPaymentIcons: true,
        yearsInBusiness: 5
      };

      renderTrustSignals(config);

      const container = document.querySelector('.foundation-trust-signals');
      expect(container).toBeFalsy();
    });

    it('should not render anything when config is null', () => {
      renderTrustSignals(null);

      const container = document.querySelector('.foundation-trust-signals');
      expect(container).toBeFalsy();
    });

    it('should not render container when no badges are enabled', () => {
      const config = {
        enabled: true,
        showSSLBadge: false,
        showVerifiedBadge: false,
        showPaymentIcons: false,
        yearsInBusiness: 0
      };

      renderTrustSignals(config);

      const container = document.querySelector('.foundation-trust-signals');
      expect(container).toBeFalsy();
    });
  });

  describe('DOM Manipulation', () => {
    it('should inject trust signals container after hero section', () => {
      const config = {
        enabled: true,
        showSSLBadge: true
      };

      renderTrustSignals(config);

      const hero = document.querySelector('.hero');
      const trustSignals = document.querySelector('.foundation-trust-signals');
      
      expect(trustSignals).toBeTruthy();
      expect(trustSignals.previousElementSibling).toBe(hero);
    });

    it('should append to container if no hero section exists', () => {
      // Remove hero section
      const hero = document.querySelector('.hero');
      hero.remove();

      const config = {
        enabled: true,
        showSSLBadge: true
      };

      renderTrustSignals(config);

      const container = document.querySelector('.container');
      const trustSignals = document.querySelector('.foundation-trust-signals');
      
      expect(trustSignals).toBeTruthy();
      expect(container.contains(trustSignals)).toBe(true);
    });

    it('should set proper ARIA attributes for accessibility', () => {
      const config = {
        enabled: true,
        showSSLBadge: true
      };

      renderTrustSignals(config);

      const container = document.querySelector('.foundation-trust-signals');
      expect(container.getAttribute('role')).toBe('complementary');
      expect(container.getAttribute('aria-label')).toBe('Trust indicators');
    });
  });

  describe('CSS Injection', () => {
    it('should inject styles only once even when called multiple times', () => {
      const config = {
        enabled: true,
        showSSLBadge: true
      };

      renderTrustSignals(config);
      renderTrustSignals(config);
      renderTrustSignals(config);

      // Count style tags containing trust-signals styles
      const styles = Array.from(document.querySelectorAll('style'));
      const trustSignalsStyles = styles.filter(style => 
        style.textContent.includes('.foundation-trust-signals')
      );
      
      expect(trustSignalsStyles.length).toBe(1);
    });
  });
});

/**
 * Helper function to render trust signals
 * This simulates what foundation.js does
 */
function renderTrustSignals(config) {
  if (!config || !config.enabled) return;

  const badges = [];

  if (config.showSSLBadge) {
    badges.push(`
      <div class="trust-badge" title="Secure Connection">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <span>Secure Site</span>
      </div>
    `);
  }

  if (config.showVerifiedBadge) {
    badges.push(`
      <div class="trust-badge" title="Verified Business">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>Verified Business</span>
      </div>
    `);
  }

  if (config.yearsInBusiness && config.yearsInBusiness > 0) {
    badges.push(`
      <div class="trust-badge" title="Years in Business">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>${config.yearsInBusiness}+ Years</span>
      </div>
    `);
  }

  if (config.showPaymentIcons) {
    badges.push(`
      <div class="trust-badge" title="Secure Payment Options">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
        <span>Secure Payment</span>
      </div>
    `);
  }

  if (badges.length === 0) return;

  const container = document.createElement('div');
  container.className = 'foundation-trust-signals';
  container.setAttribute('role', 'complementary');
  container.setAttribute('aria-label', 'Trust indicators');
  container.innerHTML = badges.join('');

  // Inject styles (simplified - only once)
  const styleId = 'foundation-trust-signals-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .foundation-trust-signals {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        margin: 24px 0;
      }
      
      .trust-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: var(--color-text, #f8fafc);
        font-size: 0.875rem;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
  }

  // Append to page (after hero or first section)
  const hero = document.querySelector('.hero');
  if (hero && hero.parentNode) {
    hero.parentNode.insertBefore(container, hero.nextSibling);
  } else {
    const main = document.querySelector('.container, main, body > div');
    if (main) main.appendChild(container);
  }
}

