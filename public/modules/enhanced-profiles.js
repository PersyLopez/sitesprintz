/**
 * Enhanced Profiles Component
 * 
 * Extended provider/staff profiles with credentials, specializations, and social links.
 * Used for: Medical, Legal, Salon, Gym, Pet Care
 * 
 * Features:
 * - Extended bio fields
 * - Credentials/certifications display
 * - Specializations
 * - Photo gallery per provider
 * - Social links
 * - Contact information
 */

class EnhancedProfiles {
  constructor(config) {
    this.config = {
      containerId: config.containerId || 'enhanced-profiles-container',
      profiles: config.profiles || [],
      layout: config.layout || 'grid', // 'grid' or 'list'
      showCredentials: config.showCredentials !== false,
      showSpecializations: config.showSpecializations !== false,
      showSocialLinks: config.showSocialLinks !== false,
      ...config
    };
    
    this.container = null;
  }

  /**
   * Initialize and render the component
   */
  init() {
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`EnhancedProfiles: Container ${this.config.containerId} not found`);
      return;
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the component
   */
  render() {
    const profilesHTML = this.buildProfilesHTML();
    
    this.container.innerHTML = `
      <div class="enhanced-profiles">
        ${this.config.title ? `<h3 class="profiles-title">${this.config.title}</h3>` : ''}
        ${this.config.description ? `<p class="profiles-description">${this.config.description}</p>` : ''}
        
        <div class="profiles-${this.config.layout}">
          ${profilesHTML}
        </div>
      </div>
      <style>
        .enhanced-profiles {
          max-width: 1200px;
          margin: 0 auto;
        }
        .profiles-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .profiles-description {
          color: var(--color-muted, #666);
          margin-bottom: 32px;
        }
        .profiles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }
        .profiles-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .profile-card {
          background: white;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }
        .profile-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        .profile-header {
          position: relative;
        }
        .profile-image {
          width: 100%;
          height: 300px;
          object-fit: cover;
        }
        .profile-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          padding: 6px 12px;
          background: var(--color-primary, #2563eb);
          color: white;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .profile-content {
          padding: 24px;
        }
        .profile-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .profile-title {
          font-size: 1rem;
          color: var(--color-primary, #2563eb);
          margin-bottom: 12px;
        }
        .profile-bio {
          color: var(--color-muted, #666);
          line-height: 1.6;
          margin-bottom: 16px;
        }
        .profile-credentials {
          margin-bottom: 16px;
        }
        .credentials-title {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--color-text, #333);
        }
        .credentials-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .credential-badge {
          padding: 4px 10px;
          background: var(--color-surface, #f8f9fa);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 4px;
          font-size: 0.85rem;
        }
        .profile-specializations {
          margin-bottom: 16px;
        }
        .specializations-title {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--color-text, #333);
        }
        .specializations-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .specialization-tag {
          padding: 4px 10px;
          background: var(--color-primary-light, #eff6ff);
          color: var(--color-primary, #2563eb);
          border-radius: 4px;
          font-size: 0.85rem;
        }
        .profile-contact {
          margin-bottom: 16px;
        }
        .contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 0.9rem;
          color: var(--color-text, #333);
        }
        .contact-icon {
          width: 20px;
          text-align: center;
        }
        .profile-social {
          display: flex;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid var(--color-border, #e5e7eb);
        }
        .social-link {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-surface, #f8f9fa);
          border-radius: 50%;
          text-decoration: none;
          color: var(--color-text, #333);
          transition: all 0.2s;
        }
        .social-link:hover {
          background: var(--color-primary, #2563eb);
          color: white;
          transform: translateY(-2px);
        }
        .profile-gallery {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--color-border, #e5e7eb);
        }
        .gallery-title {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .gallery-image {
          width: 100%;
          height: 80px;
          object-fit: cover;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .gallery-image:hover {
          opacity: 0.8;
          transform: scale(1.05);
        }
        .profiles-list .profile-card {
          display: flex;
          flex-direction: row;
        }
        .profiles-list .profile-header {
          width: 300px;
          flex-shrink: 0;
        }
        .profiles-list .profile-image {
          height: 100%;
        }
        @media (max-width: 768px) {
          .profiles-grid {
            grid-template-columns: 1fr;
          }
          .profiles-list .profile-card {
            flex-direction: column;
          }
          .profiles-list .profile-header {
            width: 100%;
          }
        }
      </style>
    `;
  }

  /**
   * Build profiles HTML
   */
  buildProfilesHTML() {
    if (this.config.profiles.length === 0) {
      return `
        <div style="text-align: center; padding: 48px; color: var(--color-muted, #666);">
          No profiles available.
        </div>
      `;
    }

    return this.config.profiles.map(profile => this.buildProfileCardHTML(profile)).join('');
  }

  /**
   * Build profile card HTML
   */
  buildProfileCardHTML(profile) {
    const credentialsHTML = this.buildCredentialsHTML(profile);
    const specializationsHTML = this.buildSpecializationsHTML(profile);
    const contactHTML = this.buildContactHTML(profile);
    const socialHTML = this.buildSocialHTML(profile);
    const galleryHTML = this.buildGalleryHTML(profile);

    return `
      <div class="profile-card">
        <div class="profile-header">
          ${profile.image ? `
            <img src="${profile.image}" alt="${profile.name}" class="profile-image">
          ` : `
            <div class="profile-image" style="background: var(--color-surface, #f8f9fa); display: flex; align-items: center; justify-content: center; color: var(--color-muted, #666);">
              ${profile.name.charAt(0).toUpperCase()}
            </div>
          `}
          ${profile.badge ? `
            <div class="profile-badge">${profile.badge}</div>
          ` : ''}
        </div>
        <div class="profile-content">
          <div class="profile-name">${profile.name}</div>
          ${profile.title ? `<div class="profile-title">${profile.title}</div>` : ''}
          ${profile.bio ? `<div class="profile-bio">${profile.bio}</div>` : ''}
          
          ${credentialsHTML}
          ${specializationsHTML}
          ${contactHTML}
          ${socialHTML}
          ${galleryHTML}
        </div>
      </div>
    `;
  }

  /**
   * Build credentials HTML
   */
  buildCredentialsHTML(profile) {
    if (!this.config.showCredentials || !profile.credentials || profile.credentials.length === 0) {
      return '';
    }

    return `
      <div class="profile-credentials">
        <div class="credentials-title">Credentials & Certifications</div>
        <div class="credentials-list">
          ${profile.credentials.map(cred => `
            <span class="credential-badge">${cred}</span>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Build specializations HTML
   */
  buildSpecializationsHTML(profile) {
    if (!this.config.showSpecializations || !profile.specializations || profile.specializations.length === 0) {
      return '';
    }

    return `
      <div class="profile-specializations">
        <div class="specializations-title">Specializations</div>
        <div class="specializations-list">
          ${profile.specializations.map(spec => `
            <span class="specialization-tag">${spec}</span>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Build contact HTML
   */
  buildContactHTML(profile) {
    if (!profile.email && !profile.phone) {
      return '';
    }

    return `
      <div class="profile-contact">
        ${profile.email ? `
          <div class="contact-item">
            <span class="contact-icon">✉</span>
            <a href="mailto:${profile.email}">${profile.email}</a>
          </div>
        ` : ''}
        ${profile.phone ? `
          <div class="contact-item">
            <span class="contact-icon">📞</span>
            <a href="tel:${profile.phone}">${profile.phone}</a>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Build social links HTML
   */
  buildSocialHTML(profile) {
    if (!this.config.showSocialLinks || !profile.social || Object.keys(profile.social).length === 0) {
      return '';
    }

    const socialIcons = {
      linkedin: '💼',
      twitter: '🐦',
      facebook: '📘',
      instagram: '📷',
      website: '🌐'
    };

    return `
      <div class="profile-social">
        ${Object.entries(profile.social).map(([platform, url]) => `
          <a href="${url}" 
             target="_blank" 
             rel="noopener noreferrer" 
             class="social-link"
             title="${platform}">
            ${socialIcons[platform] || '🔗'}
          </a>
        `).join('')}
      </div>
    `;
  }

  /**
   * Build gallery HTML
   */
  buildGalleryHTML(profile) {
    if (!profile.gallery || profile.gallery.length === 0) {
      return '';
    }

    return `
      <div class="profile-gallery">
        <div class="gallery-title">Gallery</div>
        <div class="gallery-grid">
          ${profile.gallery.slice(0, 6).map(image => `
            <img src="${image.url || image}" 
                 alt="${image.alt || profile.name}" 
                 class="gallery-image"
                 data-image-src="${image.url || image}">
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Gallery image clicks (could open lightbox)
    this.container.querySelectorAll('.gallery-image').forEach(img => {
      img.addEventListener('click', (e) => {
        const src = img.getAttribute('data-image-src');
        // Could open lightbox modal here
        console.log('Gallery image clicked:', src);
      });
    });
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedProfiles;
}

// Make available globally
window.EnhancedProfiles = EnhancedProfiles;

