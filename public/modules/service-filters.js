/**
 * Service Filters Component
 * 
 * Multi-criteria filtering for services, products, classes, etc.
 * Supports: category, price range, duration, pet type, dietary restrictions, etc.
 * 
 * Features:
 * - Multiple filter types (category, price, duration, custom attributes)
 * - Real-time filtering
 * - Active filter display
 * - Clear all filters
 * - Responsive design
 */

class ServiceFilters {
  constructor(config) {
    this.config = {
      containerId: config.containerId || 'service-filters-container',
      items: config.items || [],
      filters: config.filters || ['category'], // ['category', 'price', 'duration', 'petType', 'dietary']
      filterConfig: config.filterConfig || {},
      onChange: config.onChange || null,
      showActiveFilters: config.showActiveFilters !== false,
      showClearButton: config.showClearButton !== true,
      ...config
    };
    
    this.container = null;
    this.activeFilters = {};
    this.filteredItems = [...this.config.items];
  }

  /**
   * Initialize and render the filter component
   */
  init() {
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`ServiceFilters: Container ${this.config.containerId} not found`);
      return;
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the filter UI
   */
  render() {
    const filtersHTML = this.buildFiltersHTML();
    const activeFiltersHTML = this.buildActiveFiltersHTML();
    
    this.container.innerHTML = `
      <div class="service-filters">
        ${activeFiltersHTML}
        <div class="filter-controls">
          ${filtersHTML}
        </div>
      </div>
      <style>
        .service-filters {
          margin-bottom: 24px;
        }
        .filter-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        .filter-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .filter-group-label {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--color-text, #333);
          margin-right: 8px;
        }
        .filter-btn {
          padding: 8px 16px;
          border: 1px solid var(--color-border, #ddd);
          background: var(--color-surface, #fff);
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .filter-btn:hover {
          background: var(--color-surface-hover, #f5f5f5);
          border-color: var(--color-primary, #2563eb);
        }
        .filter-btn.active {
          background: var(--color-primary, #2563eb);
          color: white;
          border-color: var(--color-primary, #2563eb);
        }
        .filter-range {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .filter-range input {
          padding: 6px 12px;
          border: 1px solid var(--color-border, #ddd);
          border-radius: 4px;
          width: 80px;
        }
        .active-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
          padding: 12px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 8px;
        }
        .active-filter-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: var(--color-primary, #2563eb);
          color: white;
          border-radius: 16px;
          font-size: 0.85rem;
        }
        .active-filter-tag .remove {
          cursor: pointer;
          font-weight: bold;
          opacity: 0.8;
        }
        .active-filter-tag .remove:hover {
          opacity: 1;
        }
        .clear-filters-btn {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid var(--color-border, #ddd);
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          color: var(--color-text, #666);
        }
        .clear-filters-btn:hover {
          background: var(--color-surface-hover, #f5f5f5);
        }
        @media (max-width: 768px) {
          .filter-controls {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-group {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-btn {
            width: 100%;
          }
        }
      </style>
    `;
  }

  /**
   * Build filter controls HTML
   */
  buildFiltersHTML() {
    let html = '';

    this.config.filters.forEach(filterType => {
      const filterData = this.getFilterData(filterType);
      if (!filterData || filterData.options.length === 0) return;

      html += `
        <div class="filter-group" data-filter-type="${filterType}">
          <span class="filter-group-label">${filterData.label}:</span>
          ${this.buildFilterButtons(filterType, filterData)}
        </div>
      `;
    });

    if (this.config.showClearButton && Object.keys(this.activeFilters).length > 0) {
      html += `
        <button class="clear-filters-btn" data-action="clear-all">
          Clear All
        </button>
      `;
    }

    return html;
  }

  /**
   * Build filter buttons for a specific filter type
   */
  buildFilterButtons(filterType, filterData) {
    if (filterType === 'price') {
      return this.buildPriceRangeFilter(filterData);
    }

    let buttons = '';
    if (filterData.showAll !== false) {
      const isActive = !this.activeFilters[filterType];
      buttons += `
        <button class="filter-btn ${isActive ? 'active' : ''}" 
                data-filter-type="${filterType}" 
                data-filter-value="all">
          All
        </button>
      `;
    }

    filterData.options.forEach(option => {
      const isActive = this.activeFilters[filterType] === option.value;
      buttons += `
        <button class="filter-btn ${isActive ? 'active' : ''}" 
                data-filter-type="${filterType}" 
                data-filter-value="${option.value}">
          ${option.label}
        </button>
      `;
    });

    return buttons;
  }

  /**
   * Build price range filter
   */
  buildPriceRangeFilter(filterData) {
    const minPrice = this.activeFilters.price?.min || filterData.min || 0;
    const maxPrice = this.activeFilters.price?.max || filterData.max || 1000;

    return `
      <div class="filter-range">
        <input type="number" 
               class="price-min" 
               placeholder="Min" 
               value="${minPrice}" 
               min="${filterData.min || 0}" 
               max="${filterData.max || 1000}">
        <span>-</span>
        <input type="number" 
               class="price-max" 
               placeholder="Max" 
               value="${maxPrice}" 
               min="${filterData.min || 0}" 
               max="${filterData.max || 1000}">
      </div>
    `;
  }

  /**
   * Get filter data for a specific filter type
   */
  getFilterData(filterType) {
    // Check if custom config provided
    if (this.config.filterConfig[filterType]) {
      return this.config.filterConfig[filterType];
    }

    // Auto-generate from items
    const items = this.config.items;
    const data = {
      label: this.getFilterLabel(filterType),
      options: [],
      showAll: true
    };

    if (filterType === 'category') {
      const categories = [...new Set(items.map(item => item.category).filter(Boolean))];
      data.options = categories.map(cat => ({ value: cat, label: cat }));
    } else if (filterType === 'price') {
      const prices = items.map(item => item.price || 0).filter(p => p > 0);
      data.min = Math.min(...prices);
      data.max = Math.max(...prices);
    } else if (filterType === 'duration') {
      const durations = [...new Set(items.map(item => item.duration).filter(Boolean))];
      data.options = durations.map(dur => ({ value: dur, label: `${dur} min` }));
    } else if (filterType === 'petType') {
      const petTypes = [...new Set(items.flatMap(item => item.petType || []).filter(Boolean))];
      data.options = petTypes.map(type => ({ value: type, label: type }));
    } else if (filterType === 'dietary') {
      const dietary = [...new Set(items.flatMap(item => item.dietary || []).filter(Boolean))];
      data.options = dietary.map(d => ({ value: d, label: d }));
    } else {
      // Custom attribute
      const values = [...new Set(items.map(item => item[filterType]).filter(Boolean))];
      data.options = values.map(val => ({ value: val, label: val }));
    }

    return data;
  }

  /**
   * Get human-readable label for filter type
   */
  getFilterLabel(filterType) {
    const labels = {
      category: 'Category',
      price: 'Price',
      duration: 'Duration',
      petType: 'Pet Type',
      dietary: 'Dietary',
      instructor: 'Instructor',
      location: 'Location'
    };
    return labels[filterType] || filterType.charAt(0).toUpperCase() + filterType.slice(1);
  }

  /**
   * Build active filters display
   */
  buildActiveFiltersHTML() {
    if (!this.config.showActiveFilters || Object.keys(this.activeFilters).length === 0) {
      return '';
    }

    let tags = '';
    Object.entries(this.activeFilters).forEach(([filterType, value]) => {
      if (filterType === 'price' && typeof value === 'object') {
        tags += `
          <span class="active-filter-tag">
            Price: $${value.min} - $${value.max}
            <span class="remove" data-filter-type="${filterType}">×</span>
          </span>
        `;
      } else if (value !== 'all' && value !== null) {
        const label = this.getFilterValueLabel(filterType, value);
        tags += `
          <span class="active-filter-tag">
            ${this.getFilterLabel(filterType)}: ${label}
            <span class="remove" data-filter-type="${filterType}">×</span>
          </span>
        `;
      }
    });

    return tags ? `<div class="active-filters">${tags}</div>` : '';
  }

  /**
   * Get label for a filter value
   */
  getFilterValueLabel(filterType, value) {
    const filterData = this.getFilterData(filterType);
    if (filterData && filterData.options) {
      const option = filterData.options.find(opt => opt.value === value);
      return option ? option.label : value;
    }
    return value;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Filter buttons
    this.container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filterType = btn.getAttribute('data-filter-type');
        const filterValue = btn.getAttribute('data-filter-value');
        this.applyFilter(filterType, filterValue === 'all' ? null : filterValue);
      });
    });

    // Price range inputs
    this.container.querySelectorAll('.price-min, .price-max').forEach(input => {
      input.addEventListener('change', (e) => {
        const minInput = this.container.querySelector('.price-min');
        const maxInput = this.container.querySelector('.price-max');
        const min = parseFloat(minInput.value) || 0;
        const max = parseFloat(maxInput.value) || 1000;
        this.applyFilter('price', { min, max });
      });
    });

    // Remove active filter tags
    this.container.querySelectorAll('.active-filter-tag .remove').forEach(removeBtn => {
      removeBtn.addEventListener('click', (e) => {
        const filterType = removeBtn.getAttribute('data-filter-type');
        this.applyFilter(filterType, null);
      });
    });

    // Clear all button
    const clearBtn = this.container.querySelector('[data-action="clear-all"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }
  }

  /**
   * Apply a filter
   */
  applyFilter(filterType, value) {
    if (value === null || value === undefined) {
      delete this.activeFilters[filterType];
    } else {
      this.activeFilters[filterType] = value;
    }

    this.filterItems();
    this.render();
    this.attachEventListeners();

    // Trigger onChange callback
    if (this.config.onChange) {
      this.config.onChange(this.filteredItems, this.activeFilters);
    }
  }

  /**
   * Filter items based on active filters
   */
  filterItems() {
    this.filteredItems = this.config.items.filter(item => {
      return this.config.filters.every(filterType => {
        if (!this.activeFilters[filterType]) return true;

        const filterValue = this.activeFilters[filterType];

        if (filterType === 'category') {
          return item.category === filterValue;
        } else if (filterType === 'price') {
          const price = item.price || 0;
          return price >= filterValue.min && price <= filterValue.max;
        } else if (filterType === 'duration') {
          return item.duration === filterValue;
        } else if (filterType === 'petType') {
          return (item.petType || []).includes(filterValue);
        } else if (filterType === 'dietary') {
          return (item.dietary || []).includes(filterValue);
        } else {
          // Custom attribute
          return item[filterType] === filterValue;
        }
      });
    });
  }

  /**
   * Clear all filters
   */
  clearAllFilters() {
    this.activeFilters = {};
    this.filterItems();
    this.render();
    this.attachEventListeners();

    if (this.config.onChange) {
      this.config.onChange(this.filteredItems, {});
    }
  }

  /**
   * Get filtered items
   */
  getFilteredItems() {
    return this.filteredItems;
  }

  /**
   * Update items (useful for dynamic content)
   */
  updateItems(newItems) {
    this.config.items = newItems;
    this.filterItems();
    this.render();
    this.attachEventListeners();
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ServiceFilters;
}

// Make available globally
window.ServiceFilters = ServiceFilters;

