/**
 * Section HTML Builder
 * 
 * Converts section data into server-rendered HTML strings
 * Used by publishedSiteRenderer for static site generation
 */

import { getNamedTeamMembers, resolveTeamHeading, shouldRenderTeam } from '../../src/utils/businessScale.js';
import { sectionListHasNativeBooking } from '../../src/utils/sectionHtmlBridge.js';

class SectionHtmlBuilder {
  /**
   * Build HTML for all sections
   * @param {Object} siteData - Site data with sections array
   * @returns {string} HTML string with all sections
   */
  async buildSectionsHtml(siteData) {
    if (!siteData.sections || !Array.isArray(siteData.sections)) {
      return this._buildDefaultHeroHtml(siteData);
    }

    const enabledSections = siteData.sections
      .filter(s => s && s.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (enabledSections.length === 0) {
      return this._buildDefaultHeroHtml(siteData);
    }

    return enabledSections
      .map(section => this._buildSectionHtml(section, siteData))
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Build HTML for a single section
   * @private
   */
  _buildSectionHtml(section, siteData) {
    const { type, content = {}, id = '', settings = {} } = section;

    try {
      switch (type) {
        case 'hero':
          return this._buildHeroHtml(content, siteData, settings);
        case 'about':
          return this._buildAboutHtml(content, siteData, settings);
        case 'services':
          return this._buildServicesHtml(content, siteData, settings);
        case 'gallery':
          return this._buildGalleryHtml(content, siteData, settings);
        case 'testimonials':
          return this._buildTestimonialsHtml(content, siteData, settings);
        case 'team':
          return this._buildTeamHtml(content, siteData, settings);
        case 'faq':
          return this._buildFaqHtml(content, siteData, settings);
        case 'credentials':
          return this._buildCredentialsHtml(content, siteData, settings);
        case 'contact':
          return this._buildContactHtml(content, siteData, settings);
        case 'reviews':
          return this._buildReviewsHtml(content, siteData, settings);
        case 'menu':
          return this._buildMenuHtml(content, siteData, settings);
        case 'before-after':
          return this._buildBeforeAfterHtml(content, siteData, settings);
        case 'stats':
          return this._buildStatsHtml(content, siteData, settings);
        default:
          return null;
      }
    } catch (e) {
      console.error(`Error building HTML for section type ${type}:`, e);
      return null;
    }
  }

  /**
   * Build Hero Section HTML
   * @private
   */
  _buildHeroHtml(content, siteData, settings) {
    const title = content.title || siteData.heroTitle || siteData.businessName || 'Welcome';
    const subtitle = content.subtitle || siteData.heroSubtitle || siteData.businessDescription || '';
    const ctaText = content.ctaText || 'Get Started';
    const ctaLink = content.ctaLink || '#contact';
    const image = content.image || siteData.heroImage;

    return `
<section class="hero" style="background-image: url('${this._escapeAttr(image)}'); background-size: cover; background-position: center;">
  <div class="container">
    <div class="hero-content">
      <h1>${this._escapeHtml(title)}</h1>
      ${subtitle ? `<p>${this._escapeHtml(subtitle)}</p>` : ''}
      <a href="${this._escapeAttr(ctaLink)}" class="cta-button">${this._escapeHtml(ctaText)}</a>
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Build About Section HTML
   * @private
   */
  _buildAboutHtml(content, siteData, settings) {
    const title = content.title || 'About Us';
    const description = content.description || content.body || siteData.about?.body || '';
    const image = content.image || siteData.about?.image;

    if (!description) return null;

    return `
<section class="about">
  <div class="container">
    <h2>${this._escapeHtml(title)}</h2>
    <div class="about-content">
      ${image ? `<img src="${this._escapeAttr(image)}" alt="${this._escapeAttr(title)}" class="about-image">` : ''}
      <div class="about-text">
        ${this._sanitizeHtml(description)}
      </div>
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Build Services Section HTML
   * @private
   */
  _buildServicesHtml(content, siteData, settings) {
    const title = content.title || 'Our Services';
    const items = content.items || siteData.services || siteData.products || [];

    if (!items || items.length === 0) return null;

    const bookable = sectionListHasNativeBooking(siteData?.sections);
    const servicesHtml = items
      .map((item, index) => {
        const name = item.name || item.title || '';
        const slug = String(name || 'service').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'service';
        const serviceId = item.id ? String(item.id) : `${slug}-${index}`;
        const bookLink = bookable
          ? `<a href="#booking" data-ss-book-service data-service-id="${this._escapeAttr(serviceId)}" data-service-name="${this._escapeAttr(name)}">Book</a>`
          : '';
        return `
      <div class="service-card" data-service-id="${this._escapeAttr(serviceId)}" data-service-name="${this._escapeAttr(name)}">
        ${item.image ? `<img src="${this._escapeAttr(item.image)}" alt="${this._escapeAttr(name || 'Service')}">` : ''}
        <h3>${this._escapeHtml(name)}</h3>
        <p>${this._escapeHtml(item.description || '')}</p>
        ${item.price ? `<div class="service-price">${this._escapeHtml(item.price)}</div>` : ''}
        ${bookLink}
      </div>
      `;
      })
      .join('\n');

    return `
<section id="services" class="services">
  <div class="container">
    <h2>${this._escapeHtml(title)}</h2>
    <div class="services-grid">
      ${servicesHtml}
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Build Gallery Section HTML
   * @private
   */
  _buildGalleryHtml(content, siteData, settings) {
    const title = content.title || 'Gallery';
    const images = content.images || siteData.gallery || [];

    if (!images || images.length === 0) return null;

    const imageHtml = images
      .map(img => `<img src="${this._escapeAttr(img.src || img)}" alt="${this._escapeAttr(img.alt || 'Gallery image')}" loading="lazy">`)
      .join('\n');

    return `
<section class="gallery">
  <div class="container">
    <h2>${this._escapeHtml(title)}</h2>
    <div class="gallery-grid">
      ${imageHtml}
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Build Testimonials Section HTML
   * @private
   */
  _buildTestimonialsHtml(content, siteData, settings) {
    const title = content.title || 'What Clients Say';
    const testimonials = content.testimonials || siteData.testimonials || [];

    if (!testimonials || testimonials.length === 0) return null;

    const testimonialsHtml = testimonials
      .map(t => `
      <div class="testimonial-card">
        <div class="testimonial-rating">${this._buildStarRating(t.rating || 5)}</div>
        <p class="testimonial-text">"${this._escapeHtml(t.text || t.quote || '')}"</p>
        <p class="testimonial-author">- ${this._escapeHtml(t.author || t.name || '')}</p>
      </div>
      `)
      .join('\n');

    return `
<section class="testimonials">
  <div class="container">
    <h2>${this._escapeHtml(title)}</h2>
    <div class="testimonials-grid">
      ${testimonialsHtml}
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Build Team Section HTML
   * @private
   */
  _buildTeamHtml(content, siteData, settings) {
    const rawMembers = content.members
      || (Array.isArray(siteData.team) ? siteData.team : siteData.team?.members)
      || [];
    const members = getNamedTeamMembers(siteData, rawMembers);

    if (!shouldRenderTeam(members)) return null;

    const title = resolveTeamHeading(members, content.title);

    const membersHtml = members
      .map(m => `
      <div class="team-member">
        ${m.photo ? `<img src="${this._escapeAttr(m.photo)}" alt="${this._escapeAttr(m.name || 'Team member')}">` : ''}
        <h3>${this._escapeHtml(m.name || '')}</h3>
        <p class="team-role">${this._escapeHtml(m.role || '')}</p>
        <p class="team-bio">${this._escapeHtml(m.bio || '')}</p>
      </div>
      `)
      .join('\n');

    return `
<section class="team">
  <div class="container">
    <h2>${this._escapeHtml(title)}</h2>
    <div class="team-grid">
      ${membersHtml}
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Build FAQ Section HTML
   * @private
   */
  _buildFaqHtml(content, siteData, settings) {
    const title = content.title || 'Frequently Asked Questions';
    const items = content.items || siteData.faq || [];

    if (!items || items.length === 0) return null;

    const faqHtml = items
      .map(item => `
      <div class="faq-item">
        <h3 class="faq-question">${this._escapeHtml(item.question || '')}</h3>
        <div class="faq-answer">
          ${this._sanitizeHtml(item.answer || '')}
        </div>
      </div>
      `)
      .join('\n');

    return `
<section class="faq">
  <div class="container">
    <h2>${this._escapeHtml(title)}</h2>
    <div class="faq-list">
      ${faqHtml}
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Build Credentials Section HTML
   * @private
   */
  _buildCredentialsHtml(content, siteData, settings) {
    const title = content.title || 'Certifications & Awards';
    const items = content.items || siteData.credentials || [];

    if (!items || items.length === 0) return null;

    const credentialsHtml = items
      .map(item => `
      <div class="credential-item">
        ${item.icon ? `<img src="${this._escapeAttr(item.icon)}" alt="${this._escapeAttr(item.name || 'Credential')}">` : ''}
        <h3>${this._escapeHtml(item.name || '')}</h3>
        <p>${this._escapeHtml(item.issuer || '')}</p>
        ${item.date ? `<p class="credential-date">${this._escapeHtml(item.date)}</p>` : ''}
      </div>
      `)
      .join('\n');

    return `
<section class="credentials">
  <div class="container">
    <h2>${this._escapeHtml(title)}</h2>
    <div class="credentials-grid">
      ${credentialsHtml}
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Build Contact Section HTML
   * @private
   */
  _buildContactHtml(content, siteData, settings) {
    const email = content.email || siteData.contactEmail || siteData.businessEmail || '';
    const phone = content.phone || siteData.contactPhone || siteData.businessPhone || '';
    const address = content.address || siteData.contactAddress || siteData.businessAddress || '';
    const hours = content.hours || siteData.businessHours || '';

    if (!email && !phone && !address) return null;

    return `
<section class="contact">
  <div class="container">
    <h2>Contact Us</h2>
    <div class="contact-info">
      ${email ? `<p><strong>Email:</strong> <a href="mailto:${this._escapeAttr(email)}">${this._escapeHtml(email)}</a></p>` : ''}
      ${phone ? `<p><strong>Phone:</strong> <a href="tel:${this._escapeAttr(phone)}">${this._escapeHtml(phone)}</a></p>` : ''}
      ${address ? `<p><strong>Address:</strong> ${this._escapeHtml(address)}</p>` : ''}
      ${hours ? `<p><strong>Hours:</strong> ${this._sanitizeHtml(hours)}</p>` : ''}
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Build Reviews Section HTML (placeholder - requires JS for interactive features)
   * @private
   */
  _buildReviewsHtml(content, siteData, settings) {
    return `
<section class="reviews" data-reviews-enabled="true">
  <div class="container">
    <h2>Reviews</h2>
    <p>Customer reviews will load here</p>
  </div>
</section>
    `.trim();
  }

  /**
   * Build Menu Section HTML
   * @private
   */
  _buildMenuHtml(content, siteData, settings) {
    const title = content.title || 'Menu';
    const sections = content.sections || siteData.menu?.sections || [];

    if (!sections || sections.length === 0) return null;

    const menuHtml = sections
      .map(section => {
        const itemsHtml = (section.items || [])
          .map(item => `
          <div class="menu-item">
            <div class="menu-item-header">
              <h4>${this._escapeHtml(item.name || '')}</h4>
              ${item.price ? `<span class="menu-item-price">${this._escapeHtml(item.price)}</span>` : ''}
            </div>
            ${item.description ? `<p class="menu-item-desc">${this._escapeHtml(item.description)}</p>` : ''}
          </div>
          `)
          .join('\n');

        return `
        <div class="menu-section">
          <h3>${this._escapeHtml(section.name || '')}</h3>
          <div class="menu-items">
            ${itemsHtml}
          </div>
        </div>
        `;
      })
      .join('\n');

    return `
<section class="menu">
  <div class="container">
    <h2>${this._escapeHtml(title)}</h2>
    ${menuHtml}
  </div>
</section>
    `.trim();
  }

  /**
   * Build Before/After Section HTML
   * @private
   */
  _buildBeforeAfterHtml(content, siteData, settings) {
    const title = content.title || 'Transformations';
    const pairs = content.pairs || siteData.beforeAfter || [];

    if (!pairs || pairs.length === 0) return null;

    const pairsHtml = pairs
      .map(pair => `
      <div class="before-after-pair">
        <div class="before">
          <img src="${this._escapeAttr(pair.before)}" alt="Before">
          <p>Before</p>
        </div>
        <div class="after">
          <img src="${this._escapeAttr(pair.after)}" alt="After">
          <p>After</p>
        </div>
      </div>
      `)
      .join('\n');

    return `
<section class="before-after">
  <div class="container">
    <h2>${this._escapeHtml(title)}</h2>
    <div class="before-after-grid">
      ${pairsHtml}
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Build Stats Section HTML
   * @private
   */
  _buildStatsHtml(content, siteData, settings) {
    const stats = content.stats || siteData.stats || [];

    if (!stats || stats.length === 0) return null;

    const statsHtml = stats
      .map(stat => `
      <div class="stat-item">
        <div class="stat-number">${this._escapeHtml(stat.value || '')}</div>
        <div class="stat-label">${this._escapeHtml(stat.label || '')}</div>
      </div>
      `)
      .join('\n');

    return `
<section class="stats">
  <div class="container">
    <div class="stats-grid">
      ${statsHtml}
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Build default hero if no sections
   * @private
   */
  _buildDefaultHeroHtml(siteData) {
    const title = siteData.businessName || 'Welcome';
    const subtitle = siteData.businessDescription || '';

    return `
<section class="hero">
  <div class="container">
    <div class="hero-content">
      <h1>${this._escapeHtml(title)}</h1>
      ${subtitle ? `<p>${this._escapeHtml(subtitle)}</p>` : ''}
      <a href="#contact" class="cta-button">Get Started</a>
    </div>
  </div>
</section>
    `.trim();
  }

  /**
   * Build star rating HTML
   * @private
   */
  _buildStarRating(rating) {
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating % 1) > 0.5;
    let html = '';

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        html += '★';
      } else if (i === fullStars && hasHalfStar) {
        html += '⯨';
      } else {
        html += '☆';
      }
    }

    return html;
  }

  /**
   * Escape HTML entities
   * @private
   */
  _escapeHtml(text) {
    if (!text) return '';
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Escape HTML for attributes
   * @private
   */
  _escapeAttr(text) {
    if (!text) return '';
    
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Sanitize HTML to allow basic formatting
   * Allow basic tags: p, br, strong, em, a
   * @private
   */
  _sanitizeHtml(html) {
    if (!html) return '';

    // Basic sanitization: allow only safe tags
    let sanitized = String(html);

    // Escape script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

    return sanitized;
  }
}

// Singleton instance
const sectionHtmlBuilder = new SectionHtmlBuilder();

export { SectionHtmlBuilder, sectionHtmlBuilder };
