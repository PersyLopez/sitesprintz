/**
 * Universal Booking Widget
 * 
 * Embeddable booking component supporting multiple providers:
 * - Calendly
 * - Acuity Scheduling
 * - Square Appointments
 * - Custom URLs
 * 
 * Features:
 * - Responsive iframe embedding
 * - Loading skeleton
 * - Fallback to external link if iframe blocked
 * - Configuration via Pro template JSON
 */

class BookingWidget {
  constructor(config) {
    this.config = {
      enabled: config.enabled || false,
      provider: config.provider || 'calendly',
      url: config.url || '',
      embedMode: config.embedMode !== false, // default to true
      style: {
        height: config.style?.height || '700px',
        backgroundColor: config.style?.backgroundColor || '#ffffff',
        ...config.style
      },
      containerId: config.containerId || 'booking-widget-container'
    };
    
    this.container = null;
    this.iframe = null;
    this.isIframeBlocked = false;
  }

  /**
   * Initialize and render the booking widget
   */
  async init() {
    if (!this.config.enabled || !this.config.url) {
      console.warn('Booking widget not enabled or URL missing');
      return;
    }

    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`Container ${this.config.containerId} not found`);
      return;
    }

    // Attempt to embed iframe if embedMode is true
    if (this.config.embedMode) {
      // Show loading skeleton
      this.showLoadingSkeleton();
      
      try {
        await this.embedIframe();
      } catch (error) {
        console.error('Iframe embedding failed:', error);
        this.showFallbackLink();
      }
    } else {
      // Just show the external link
      this.showFallbackLink();
    }
  }

  /**
   * Show loading skeleton while iframe loads
   */
  showLoadingSkeleton() {
    this.container.innerHTML = `
      <div class="booking-widget-loading" style="
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 32px;
        background: ${this.config.style.backgroundColor};
        border-radius: 12px;
        min-height: ${this.config.style.height};
      ">
        <div class="skeleton-header" style="
          width: 60%;
          height: 32px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        "></div>
        <div class="skeleton-text" style="
          width: 80%;
          height: 20px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        "></div>
        <div class="skeleton-calendar" style="
          width: 100%;
          height: 400px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        "></div>
      </div>
      <style>
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      </style>
    `;
  }

  /**
   * Embed booking provider iframe
   */
  async embedIframe() {
    const embedUrl = this.getEmbedUrl();
    
    if (!embedUrl) {
      throw new Error('Invalid embed URL');
    }

    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.src = embedUrl;
    this.iframe.style.width = '100%';
    this.iframe.style.height = this.config.style.height;
    this.iframe.style.border = '0';
    this.iframe.style.borderRadius = '12px';
    this.iframe.style.backgroundColor = this.config.style.backgroundColor;
    
    // Security: sandbox the iframe
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
    
    // Accessibility
    this.iframe.setAttribute('title', 'Book an Appointment');
    this.iframe.setAttribute('loading', 'lazy');

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'booking-widget-iframe-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';

    // Add iframe
    wrapper.appendChild(this.iframe);

    // Add fallback button below iframe
    const fallbackButton = document.createElement('div');
    fallbackButton.style.marginTop = '16px';
    fallbackButton.style.textAlign = 'center';
    fallbackButton.innerHTML = `
      <a href="${this.config.url}" 
         target="_blank" 
         rel="noopener noreferrer"
         class="btn btn-secondary"
         style="display: inline-flex; align-items: center; gap: 8px;">
        <span>📅</span>
        <span>Open in New Window</span>
      </a>
    `;
    wrapper.appendChild(fallbackButton);

    // Replace loading skeleton with iframe
    this.container.innerHTML = '';
    this.container.appendChild(wrapper);

    // Listen for iframe load
    return new Promise((resolve, reject) => {
      // Use shorter timeout in test environment, full timeout in production
      const timeoutDuration = typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 100 : 10000;
      
      const timeout = setTimeout(() => {
        this.isIframeBlocked = true;
        reject(new Error('Iframe load timeout'));
      }, timeoutDuration);

      this.iframe.addEventListener('load', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.iframe.addEventListener('error', (error) => {
        clearTimeout(timeout);
        this.isIframeBlocked = true;
        reject(error);
      });
    });
  }

  /**
   * Get the embed URL based on provider
   */
  getEmbedUrl() {
    const baseUrl = this.config.url;

    switch (this.config.provider) {
      case 'calendly':
        // Calendly embed format
        if (baseUrl.includes('calendly.com')) {
          // If it's already an embed URL, use it
          if (baseUrl.includes('/embed')) {
            return baseUrl;
          }
          // Convert regular Calendly URL to embed format
          return baseUrl.replace('calendly.com/', 'calendly.com/embed/');
        }
        return baseUrl;

      case 'acuity':
        // Acuity Scheduling embed format
        if (baseUrl.includes('acuityscheduling.com')) {
          // Acuity uses iframe parameter
          if (!baseUrl.includes('embed=true')) {
            return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}embed=true`;
          }
        }
        return baseUrl;

      case 'square':
        // Square Appointments embed format
        if (baseUrl.includes('square.site')) {
          return baseUrl;
        }
        return baseUrl;

      case 'custom':
      default:
        // For custom URLs, use as-is
        return baseUrl;
    }
  }

  /**
   * Show fallback link when iframe embedding fails or is disabled
   */
  showFallbackLink() {
    this.container.innerHTML = `
      <div class="booking-widget-fallback" style="
        padding: 48px 32px;
        background: ${this.config.style.backgroundColor};
        border-radius: 12px;
        text-align: center;
      ">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 64px;">📅</span>
        </div>
        <h3 style="margin: 0 0 16px 0; font-size: 24px; color: var(--color-text, #1a1a1a);">
          Book Your Appointment
        </h3>
        <p style="margin: 0 0 24px 0; color: var(--color-muted, #666); font-size: 16px;">
          Click the button below to schedule your appointment online.
        </p>
        <a href="${this.config.url}" 
           target="_blank" 
           rel="noopener noreferrer"
           class="btn btn-primary"
           style="
             display: inline-flex;
             align-items: center;
             gap: 12px;
             padding: 16px 32px;
             font-size: 18px;
             text-decoration: none;
             background: var(--color-primary, #6366f1);
             color: white;
             border-radius: 8px;
             font-weight: 600;
             transition: all 0.2s;
           "
           onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)';"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
          <span>Book Now</span>
          <span>→</span>
        </a>
      </div>
    `;
  }

  /**
   * Destroy the widget and clean up
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.iframe = null;
  }

  /**
   * Update configuration and re-render
   */
  async update(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.init();
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookingWidget;
}

// Export as default for ES modules
if (typeof exports !== 'undefined') {
  exports.default = BookingWidget;
}

// Global export for browser
if (typeof window !== 'undefined') {
  window.BookingWidget = BookingWidget;
}

