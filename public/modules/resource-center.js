/**
 * Resource Center Component
 * 
 * Downloadable resources library with gated content and search.
 * Used for: Legal (legal resources), Medical (health guides), Pet Care (education)
 * 
 * Features:
 * - Downloadable resources (PDFs, guides)
 * - Gated content (email capture)
 * - Category organization
 * - Search functionality
 * - Resource preview
 */

class ResourceCenter {
  constructor(config) {
    this.config = {
      containerId: config.containerId || 'resource-center-container',
      resources: config.resources || [],
      categories: config.categories || [],
      requireEmail: config.requireEmail !== false, // Gate downloads with email
      onDownload: config.onDownload || null,
      onEmailCapture: config.onEmailCapture || null,
      ...config
    };
    
    this.container = null;
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.userEmail = null;
  }

  /**
   * Initialize and render the component
   */
  init() {
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`ResourceCenter: Container ${this.config.containerId} not found`);
      return;
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the component
   */
  render() {
    const filtersHTML = this.buildFiltersHTML();
    const resourcesHTML = this.buildResourcesHTML();
    
    this.container.innerHTML = `
      <div class="resource-center">
        <h3 class="center-title">${this.config.title || 'Resource Center'}</h3>
        ${this.config.description ? `<p class="center-description">${this.config.description}</p>` : ''}
        
        ${filtersHTML}
        ${resourcesHTML}
      </div>
      <style>
        .resource-center {
          max-width: 1000px;
          margin: 0 auto;
        }
        .center-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .center-description {
          color: var(--color-muted, #666);
          margin-bottom: 32px;
        }
        .resource-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 8px;
        }
        .search-box {
          flex: 1;
          min-width: 200px;
          padding: 12px;
          border: 1px solid var(--color-border, #ddd);
          border-radius: 6px;
          font-size: 1rem;
        }
        .category-filter {
          padding: 12px 16px;
          border: 1px solid var(--color-border, #ddd);
          border-radius: 6px;
          font-size: 1rem;
          background: white;
        }
        .resources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .resource-card {
          padding: 20px;
          background: white;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 8px;
          transition: all 0.2s;
        }
        .resource-card:hover {
          border-color: var(--color-primary, #2563eb);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .resource-icon {
          font-size: 2.5rem;
          margin-bottom: 12px;
        }
        .resource-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .resource-description {
          font-size: 0.9rem;
          color: var(--color-muted, #666);
          margin-bottom: 12px;
          line-height: 1.5;
        }
        .resource-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: 0.85rem;
          color: var(--color-muted, #666);
        }
        .resource-category {
          display: inline-block;
          padding: 4px 8px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 4px;
          font-size: 0.8rem;
        }
        .resource-download-btn {
          width: 100%;
          padding: 12px;
          background: var(--color-primary, #2563eb);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .resource-download-btn:hover {
          background: var(--color-primary-dark, #1d4ed8);
        }
        .resource-download-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .email-gate {
          padding: 24px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .email-gate-title {
          font-weight: 600;
          margin-bottom: 8px;
        }
        .email-gate-description {
          font-size: 0.9rem;
          color: var(--color-muted, #666);
          margin-bottom: 16px;
        }
        .email-input-group {
          display: flex;
          gap: 8px;
        }
        .email-input {
          flex: 1;
          padding: 12px;
          border: 1px solid var(--color-border, #ddd);
          border-radius: 6px;
          font-size: 1rem;
        }
        .email-submit-btn {
          padding: 12px 24px;
          background: var(--color-primary, #2563eb);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }
        .no-resources {
          text-align: center;
          padding: 48px;
          color: var(--color-muted, #666);
        }
        @media (max-width: 768px) {
          .resource-filters {
            flex-direction: column;
          }
          .resources-grid {
            grid-template-columns: 1fr;
          }
          .email-input-group {
            flex-direction: column;
          }
        }
      </style>
    `;
  }

  /**
   * Build filters HTML
   */
  buildFiltersHTML() {
    const categories = this.getCategories();
    
    return `
      <div class="resource-filters">
        <input type="text" 
               class="search-box" 
               placeholder="Search resources..."
               value="${this.searchQuery}">
        ${categories.length > 0 ? `
          <select class="category-filter" data-filter="category">
            <option value="all">All Categories</option>
            ${categories.map(cat => `
              <option value="${cat}" ${this.selectedCategory === cat ? 'selected' : ''}>
                ${cat}
              </option>
            `).join('')}
          </select>
        ` : ''}
      </div>
      ${this.config.requireEmail && !this.userEmail ? this.buildEmailGateHTML() : ''}
    `;
  }

  /**
   * Build email gate HTML
   */
  buildEmailGateHTML() {
    return `
      <div class="email-gate">
        <div class="email-gate-title">Get Access to Resources</div>
        <div class="email-gate-description">
          Enter your email to download resources and access exclusive content.
        </div>
        <div class="email-input-group">
          <input type="email" 
                 class="email-input" 
                 placeholder="your@email.com"
                 id="resource-email-input">
          <button class="email-submit-btn" data-action="submit-email">
            Get Access
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Build resources HTML
   */
  buildResourcesHTML() {
    const filteredResources = this.getFilteredResources();
    
    if (filteredResources.length === 0) {
      return `
        <div class="no-resources">
          No resources found. Try adjusting your search or filters.
        </div>
      `;
    }

    return `
      <div class="resources-grid">
        ${filteredResources.map(resource => this.buildResourceCardHTML(resource)).join('')}
      </div>
    `;
  }

  /**
   * Build resource card HTML
   */
  buildResourceCardHTML(resource) {
    const canDownload = !this.config.requireEmail || this.userEmail;
    const icon = resource.icon || this.getResourceIcon(resource.type);
    
    return `
      <div class="resource-card">
        <div class="resource-icon">${icon}</div>
        <div class="resource-title">${resource.title}</div>
        ${resource.description ? `
          <div class="resource-description">${resource.description}</div>
        ` : ''}
        <div class="resource-meta">
          <span class="resource-category">${resource.category || 'General'}</span>
          ${resource.size ? `<span>${resource.size}</span>` : ''}
        </div>
        <button class="resource-download-btn" 
                data-resource-id="${resource.id}"
                ${!canDownload ? 'disabled' : ''}>
          ${canDownload ? 'Download' : 'Sign in to Download'}
        </button>
      </div>
    `;
  }

  /**
   * Get resource icon based on type
   */
  getResourceIcon(type) {
    const icons = {
      pdf: '📄',
      guide: '📖',
      video: '🎥',
      checklist: '✅',
      template: '📋',
      ebook: '📚'
    };
    return icons[type] || '📄';
  }

  /**
   * Get categories from resources
   */
  getCategories() {
    return [...new Set(this.config.resources.map(r => r.category).filter(Boolean))];
  }

  /**
   * Get filtered resources
   */
  getFilteredResources() {
    let filtered = [...this.config.resources];

    // Filter by category
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === this.selectedCategory);
    }

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        return r.title.toLowerCase().includes(query) ||
               (r.description && r.description.toLowerCase().includes(query)) ||
               (r.tags && r.tags.some(tag => tag.toLowerCase().includes(query)));
      });
    }

    return filtered;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Search box
    const searchBox = this.container.querySelector('.search-box');
    if (searchBox) {
      searchBox.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.updateResources();
      });
    }

    // Category filter
    const categoryFilter = this.container.querySelector('[data-filter="category"]');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.selectedCategory = e.target.value;
        this.updateResources();
      });
    }

    // Email submission
    const emailSubmitBtn = this.container.querySelector('[data-action="submit-email"]');
    if (emailSubmitBtn) {
      emailSubmitBtn.addEventListener('click', () => {
        this.handleEmailSubmit();
      });
    }

    // Download buttons
    this.container.querySelectorAll('.resource-download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const resourceId = btn.getAttribute('data-resource-id');
        this.handleDownload(resourceId);
      });
    });
  }

  /**
   * Handle email submission
   */
  handleEmailSubmit() {
    const emailInput = this.container.querySelector('#resource-email-input');
    if (!emailInput) return;

    const email = emailInput.value.trim();
    if (!this.isValidEmail(email)) {
      alert('Please enter a valid email address');
      return;
    }

    this.userEmail = email;

    if (this.config.onEmailCapture) {
      this.config.onEmailCapture(email);
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Handle resource download
   */
  handleDownload(resourceId) {
    const resource = this.config.resources.find(r => r.id === resourceId);
    if (!resource) return;

    if (this.config.onDownload) {
      this.config.onDownload(resource, this.userEmail);
    } else {
      // Default: open download URL
      if (resource.url) {
        window.open(resource.url, '_blank');
      }
    }
  }

  /**
   * Update resources display
   */
  updateResources() {
    const grid = this.container.querySelector('.resources-grid');
    if (grid) {
      grid.outerHTML = this.buildResourcesHTML();
      this.attachEventListeners();
    }
  }

  /**
   * Email validation
   */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Set user email (for pre-authenticated users)
   */
  setUserEmail(email) {
    this.userEmail = email;
    this.render();
    this.attachEventListeners();
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResourceCenter;
}

// Make available globally
window.ResourceCenter = ResourceCenter;

