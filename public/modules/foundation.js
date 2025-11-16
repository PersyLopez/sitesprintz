/**
 * SiteSprintz Foundation Features
 * 
 * Universal feature module that provides:
 * - Starter Tier: Trust signals, contact forms, SEO, social media, contact bar
 * - Pro Tier: Advanced features (plan-gated)
 * 
 * Architecture:
 * - Self-contained IIFE module
 * - Fetches configuration from API
 * - Plan-based feature gating
 * - Modular feature functions
 */

(function() {
  'use strict';

  // Extract configuration from script tag
  const currentScript = document.currentScript;
  const PLAN = currentScript ? currentScript.dataset.sitePlan : 'starter';
  const SUBDOMAIN = currentScript ? currentScript.dataset.subdomain : '';
  
  // Feature state
  let config = null;
  let initialized = false;

  /**
   * Fetch foundation configuration from API
   */
  async function loadConfig() {
    try {
      const response = await fetch(`/api/foundation/config/${SUBDOMAIN}`);
      if (!response.ok) {
        console.warn('Foundation: Failed to load config, using defaults');
        return getDefaultConfig();
      }
      const data = await response.json();
      return data.foundation || getDefaultConfig();
    } catch (error) {
      console.warn('Foundation: Error loading config:', error);
      return getDefaultConfig();
    }
  }

  /**
   * Get default configuration if API fails
   */
  function getDefaultConfig() {
    return {
      trustSignals: {
        enabled: true,
        yearsInBusiness: 5,
        showSSLBadge: true,
        showVerifiedBadge: true,
        showPaymentIcons: true
      },
      contactForm: {
        enabled: false // Disabled by default until configured
      },
      seo: {
        enabled: true,
        businessType: 'LocalBusiness',
        autoGenerateAltTags: true,
        lazyLoadImages: true
      },
      socialMedia: {
        enabled: false // Disabled until profiles added
      },
      contactBar: {
        enabled: false // Disabled until contact info added
      }
    };
  }

  /**
   * STARTER TIER FEATURES
   */

  /**
   * Trust Signals - Basic
   * Displays SSL badge, verified badge, payment icons, years in business
   */
  function initTrustSignals(config) {
    if (!config || !config.enabled) return;

    const container = document.createElement('div');
    container.className = 'foundation-trust-signals';
    container.setAttribute('role', 'complementary');
    container.setAttribute('aria-label', 'Trust indicators');

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

    if (badges.length > 0) {
      container.innerHTML = badges.join('');
      
      // Inject styles
      injectStyles(`
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
          transition: all 0.3s;
        }
        
        .trust-badge:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateY(-2px);
        }
        
        .trust-badge svg {
          color: var(--color-primary, #6366f1);
        }
        
        @media (max-width: 640px) {
          .foundation-trust-signals {
            gap: 8px;
            padding: 12px;
          }
          
          .trust-badge {
            font-size: 0.8rem;
            padding: 6px 10px;
          }
          
          .trust-badge svg {
            width: 16px;
            height: 16px;
          }
        }
      `);

      // Append to page (after hero or first section)
      const hero = document.querySelector('.hero, .container > section:first-child');
      if (hero && hero.parentNode) {
        hero.parentNode.insertBefore(container, hero.nextSibling);
      } else {
        const main = document.querySelector('.container, main, body > div');
        if (main) main.appendChild(container);
      }
    }
  }

  /**
   * Contact Form - Basic
   * Displays a simple contact form with validation
   */
  function initContactForm(config) {
    if (!config || !config.enabled || !config.recipientEmail) return;

    // Check if a form already exists
    if (document.querySelector('.foundation-contact-form')) return;

    const formHtml = `
      <section class="foundation-contact-section" id="contact">
        <h2>Get In Touch</h2>
        <form class="foundation-contact-form" novalidate>
          <div class="form-group">
            <label for="fc-name">Name *</label>
            <input type="text" id="fc-name" name="name" required>
          </div>
          
          <div class="form-group">
            <label for="fc-email">Email *</label>
            <input type="email" id="fc-email" name="email" required>
          </div>
          
          <div class="form-group">
            <label for="fc-phone">Phone</label>
            <input type="tel" id="fc-phone" name="phone">
          </div>
          
          <div class="form-group">
            <label for="fc-message">Message *</label>
            <textarea id="fc-message" name="message" rows="5" required></textarea>
          </div>
          
          ${config.fields && config.fields.includes('file') ? `
          <div class="form-group">
            <label for="fc-file">Attachment</label>
            <input type="file" id="fc-file" name="file" accept="image/*,application/pdf">
            <small>Max ${Math.round((config.maxFileSize || 5242880) / 1048576)}MB</small>
          </div>
          ` : ''}
          
          <!-- Honeypot for spam protection -->
          <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
          
          <button type="submit" class="btn btn-primary">Send Message</button>
          
          <div class="form-message" role="alert" aria-live="polite"></div>
        </form>
      </section>
    `;

    const container = document.createElement('div');
    container.innerHTML = formHtml;

    // Inject styles
    injectStyles(`
      .foundation-contact-section {
        padding: var(--spacing-xl, 48px) 0;
        max-width: 600px;
        margin: 0 auto;
      }
      
      .foundation-contact-section h2 {
        font-size: 2rem;
        margin-bottom: 24px;
        text-align: center;
      }
      
      .foundation-contact-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .form-group label {
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--color-text, #f8fafc);
      }
      
      .form-group input,
      .form-group textarea {
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        color: var(--color-text, #f8fafc);
        font-family: inherit;
        font-size: 1rem;
        transition: all 0.3s;
      }
      
      .form-group input:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: var(--color-primary, #6366f1);
        background: rgba(255, 255, 255, 0.08);
      }
      
      .form-group small {
        font-size: 0.75rem;
        color: var(--color-muted, #94a3b8);
      }
      
      .form-message {
        padding: 12px;
        border-radius: 6px;
        font-size: 0.875rem;
        display: none;
      }
      
      .form-message.success {
        display: block;
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      
      .form-message.error {
        display: block;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
    `);

    // Add form submission handler
    const form = container.querySelector('.foundation-contact-form');
    const messageEl = container.querySelector('.form-message');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Check honeypot
      if (form.elements.website.value) {
        console.log('Spam detected');
        return;
      }

      // Basic validation
      const name = form.elements.name.value.trim();
      const email = form.elements.email.value.trim();
      const message = form.elements.message.value.trim();

      if (!name || !email || !message) {
        showMessage('Please fill in all required fields.', 'error');
        return;
      }

      if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address.', 'error');
        return;
      }

      // Disable submit button
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        const formData = {
          name,
          email,
          phone: form.elements.phone.value.trim(),
          message,
          subdomain: SUBDOMAIN
        };

        const response = await fetch('/api/foundation/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          showMessage(
            config.autoResponder && config.autoResponder.enabled 
              ? config.autoResponder.message 
              : 'Thank you! We\'ll be in touch soon.',
            'success'
          );
          form.reset();
        } else {
          throw new Error('Failed to send message');
        }
      } catch (error) {
        console.error('Form submission error:', error);
        showMessage('Sorry, something went wrong. Please try again later.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    });

    function showMessage(text, type) {
      messageEl.textContent = text;
      messageEl.className = `form-message ${type}`;
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Append to page
    const main = document.querySelector('.container, main');
    if (main) main.appendChild(container.firstElementChild);
  }

  /**
   * SEO - Basic
   * Applies lazy loading to images (meta tags handled server-side)
   */
  function initSEO(config) {
    if (!config || !config.enabled) return;

    // Lazy load images
    if (config.lazyLoadImages) {
      const images = document.querySelectorAll('img:not([loading])');
      images.forEach(img => {
        img.loading = 'lazy';
      });
    }

    // Auto-generate alt tags if missing
    if (config.autoGenerateAltTags) {
      const imagesWithoutAlt = document.querySelectorAll('img:not([alt]), img[alt=""]');
      imagesWithoutAlt.forEach(img => {
        const src = img.src || '';
        const filename = src.split('/').pop().split('.')[0];
        const altText = filename.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        img.alt = altText || 'Image';
      });
    }
  }

  /**
   * Social Media - Basic
   * Displays social media links
   */
  function initSocialMedia(config) {
    if (!config || !config.enabled || !config.profiles) return;

    const profiles = config.profiles;
    const hasProfiles = Object.values(profiles).some(url => url);
    
    if (!hasProfiles) return;

    const socialIcons = {
      facebook: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
      instagram: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
      twitter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>`,
      linkedin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
      youtube: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
    };

    const links = [];
    Object.entries(profiles).forEach(([platform, url]) => {
      if (url && socialIcons[platform]) {
        links.push(`
          <a href="${url}" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="${platform}">
            ${socialIcons[platform]}
          </a>
        `);
      }
    });

    if (links.length === 0) return;

    const container = document.createElement('div');
    container.className = 'foundation-social-links';
    container.innerHTML = links.join('');

    injectStyles(`
      .foundation-social-links {
        display: flex;
        gap: 12px;
        padding: 24px 0;
        justify-content: center;
      }
      
      .social-link {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        color: var(--color-text, #f8fafc);
        transition: all 0.3s;
      }
      
      .social-link:hover {
        background: var(--color-primary, #6366f1);
        border-color: var(--color-primary, #6366f1);
        transform: translateY(-3px);
      }
      
      .social-link svg {
        width: 20px;
        height: 20px;
      }
    `);

    // Append based on position
    const footer = document.querySelector('footer');
    if (config.position === 'header') {
      const header = document.querySelector('header .container');
      if (header) header.appendChild(container);
    } else if (footer) {
      footer.insertBefore(container, footer.firstChild);
    } else {
      const main = document.querySelector('.container, main');
      if (main) main.appendChild(container);
    }
  }

  /**
   * Contact Bar - Basic
   * Displays floating contact buttons
   */
  function initContactBar(config) {
    if (!config || !config.enabled) return;
    if (!config.phone && !config.email) return;

    const buttons = [];

    if (config.phone) {
      buttons.push(`
        <a href="tel:${config.phone}" class="contact-bar-btn" aria-label="Call us">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span>Call</span>
        </a>
      `);
    }

    if (config.email) {
      buttons.push(`
        <a href="mailto:${config.email}" class="contact-bar-btn" aria-label="Email us">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>Email</span>
        </a>
      `);
    }

    if (buttons.length === 0) return;

    const container = document.createElement('div');
    container.className = `foundation-contact-bar ${config.position || 'floating'}`;
    container.innerHTML = buttons.join('');

    injectStyles(`
      .foundation-contact-bar {
        display: flex;
        gap: 12px;
        z-index: 999;
      }
      
      .foundation-contact-bar.floating {
        position: fixed;
        bottom: 24px;
        right: 24px;
        flex-direction: column;
      }
      
      .foundation-contact-bar.fixed {
        position: sticky;
        top: 0;
        background: rgba(10, 10, 15, 0.95);
        backdrop-filter: blur(10px);
        padding: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        justify-content: center;
      }
      
      .contact-bar-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        background: var(--color-primary, #6366f1);
        color: white;
        border-radius: 50px;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.875rem;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        transition: all 0.3s;
      }
      
      .contact-bar-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
      }
      
      .foundation-contact-bar.floating .contact-bar-btn {
        width: 60px;
        height: 60px;
        padding: 0;
        border-radius: 50%;
      }
      
      .foundation-contact-bar.floating .contact-bar-btn span {
        display: none;
      }
      
      @media (max-width: 640px) {
        .foundation-contact-bar.floating {
          bottom: 16px;
          right: 16px;
        }
        
        .contact-bar-btn {
          font-size: 0.8rem;
          padding: 10px 14px;
        }
        
        ${config.showOnMobile === false ? '.foundation-contact-bar.floating { display: none; }' : ''}
      }
    `);

    document.body.appendChild(container);
  }

  /**
   * PRO TIER FEATURES
   * Only loaded if plan is 'pro' or 'premium'
   */

  /**
   * Trust Signals - Pro
   * Advanced trust signals with custom badges, visitor count, etc.
   */
  function initTrustSignalsPro(config) {
    if (PLAN !== 'pro' && PLAN !== 'premium') return;
    if (!config || !config.enabled) return;

    // TODO: Implement Pro trust signals
    // - Custom badge uploads
    // - Live visitor count
    // - Customer served counter
    // - 5-star review count
    console.log('Foundation: Trust Signals Pro - Coming soon');
  }

  /**
   * Utility: Inject CSS styles once
   */
  const injectedStyles = new Set();
  function injectStyles(css) {
    const hash = btoa(css).substring(0, 16);
    if (injectedStyles.has(hash)) return;
    
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    injectedStyles.add(hash);
  }

  /**
   * Initialize all features
   */
  async function init() {
    if (initialized) return;
    initialized = true;

    console.log(`Foundation: Initializing for ${PLAN} plan`);

    // Load configuration
    config = await loadConfig();

    // Initialize Starter features
    initTrustSignals(config.trustSignals);
    initContactForm(config.contactForm);
    initSEO(config.seo);
    initSocialMedia(config.socialMedia);
    initContactBar(config.contactBar);

    // Initialize Pro features (gated)
    if (PLAN === 'pro' || PLAN === 'premium') {
      initTrustSignalsPro(config.trustSignalsPro);
      // More Pro features will be added here
    }

    console.log('Foundation: Initialization complete');
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

