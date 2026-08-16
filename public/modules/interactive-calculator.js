/**
 * Interactive Calculator Component
 * 
 * Real-time pricing calculator for various use cases:
 * - Room-by-room pricing (Cleaning)
 * - Instant quote by service (Home Services, Tech Repair)
 * - Package builder with real-time totals
 * - Add-on checkbox selections
 * 
 * Features:
 * - Multiple calculation types
 * - Real-time total updates
 * - Add-on selections
 * - Discount application
 * - Form submission integration
 */

class InteractiveCalculator {
  constructor(config) {
    this.config = {
      containerId: config.containerId || 'calculator-container',
      type: config.type || 'room-by-room', // 'room-by-room', 'service-quote', 'package-builder', 'add-ons'
      basePrice: config.basePrice || 0,
      items: config.items || [], // rooms, services, packages, add-ons
      currency: config.currency || 'USD',
      showTotal: config.showTotal !== false,
      showSubmitButton: config.showSubmitButton !== false,
      onSubmit: config.onSubmit || null,
      discount: config.discount || null, // { type: 'percentage'|'fixed', value: number }
      ...config
    };
    
    this.container = null;
    this.selectedItems = {};
    this.total = 0;
  }

  /**
   * Initialize and render the calculator
   */
  init() {
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`InteractiveCalculator: Container ${this.config.containerId} not found`);
      return;
    }

    this.render();
    this.attachEventListeners();
    this.calculateTotal();
  }

  /**
   * Render the calculator UI
   */
  render() {
    const calculatorHTML = this.buildCalculatorHTML();
    
    this.container.innerHTML = `
      <div class="interactive-calculator">
        ${calculatorHTML}
        ${this.config.showTotal ? this.buildTotalHTML() : ''}
        ${this.config.showSubmitButton ? this.buildSubmitButtonHTML() : ''}
      </div>
      <style>
        .interactive-calculator {
          max-width: 800px;
          margin: 0 auto;
        }
        .calculator-items {
          display: grid;
          gap: 16px;
          margin-bottom: 24px;
        }
        .calculator-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: var(--color-surface, #f8f9fa);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 8px;
          transition: all 0.2s;
        }
        .calculator-item:hover {
          border-color: var(--color-primary, #2563eb);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .calculator-item.selected {
          background: var(--color-primary-light, #eff6ff);
          border-color: var(--color-primary, #2563eb);
        }
        .item-info {
          flex: 1;
        }
        .item-name {
          font-weight: 600;
          margin-bottom: 4px;
        }
        .item-description {
          font-size: 0.9rem;
          color: var(--color-muted, #666);
        }
        .item-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .item-price {
          font-weight: 600;
          color: var(--color-primary, #2563eb);
          min-width: 80px;
          text-align: right;
        }
        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .qty-btn {
          width: 32px;
          height: 32px;
          border: 1px solid var(--color-border, #ddd);
          background: white;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .qty-btn:hover {
          background: var(--color-surface-hover, #f5f5f5);
        }
        .qty-value {
          min-width: 40px;
          text-align: center;
          font-weight: 600;
        }
        .checkbox-control {
          width: 24px;
          height: 24px;
          cursor: pointer;
        }
        .calculator-total {
          padding: 24px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .total-row.final {
          font-size: 1.25rem;
          font-weight: 700;
          padding-top: 16px;
          border-top: 2px solid var(--color-border, #e5e7eb);
          margin-top: 16px;
        }
        .discount-badge {
          display: inline-block;
          padding: 4px 8px;
          background: var(--color-success, #10b981);
          color: white;
          border-radius: 4px;
          font-size: 0.85rem;
          margin-left: 8px;
        }
        .submit-btn {
          width: 100%;
          padding: 16px;
          background: var(--color-primary, #2563eb);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .submit-btn:hover {
          background: var(--color-primary-dark, #1d4ed8);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .calculator-item {
            flex-direction: column;
            align-items: stretch;
          }
          .item-controls {
            justify-content: space-between;
            margin-top: 12px;
          }
        }
      </style>
    `;
  }

  /**
   * Build calculator items HTML based on type
   */
  buildCalculatorHTML() {
    switch (this.config.type) {
      case 'room-by-room':
        return this.buildRoomByRoomHTML();
      case 'service-quote':
        return this.buildServiceQuoteHTML();
      case 'package-builder':
        return this.buildPackageBuilderHTML();
      case 'add-ons':
        return this.buildAddOnsHTML();
      default:
        return this.buildRoomByRoomHTML();
    }
  }

  /**
   * Build room-by-room calculator
   */
  buildRoomByRoomHTML() {
    const rooms = this.config.items || [];
    
    return `
      <div class="calculator-items">
        ${rooms.map((room, index) => `
          <div class="calculator-item" data-item-id="${room.id || index}">
            <div class="item-info">
              <div class="item-name">${room.name}</div>
              ${room.description ? `<div class="item-description">${room.description}</div>` : ''}
            </div>
            <div class="item-controls">
              <div class="item-price">$${room.price || 0}</div>
              <div class="quantity-controls">
                <button class="qty-btn" data-action="decrease" data-item-id="${room.id || index}">-</button>
                <span class="qty-value" data-item-id="${room.id || index}">${this.selectedItems[room.id || index] || 0}</span>
                <button class="qty-btn" data-action="increase" data-item-id="${room.id || index}">+</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Build service quote calculator
   */
  buildServiceQuoteHTML() {
    const services = this.config.items || [];
    
    return `
      <div class="calculator-items">
        ${services.map((service, index) => `
          <div class="calculator-item" data-item-id="${service.id || index}">
            <div class="item-info">
              <div class="item-name">${service.name}</div>
              ${service.description ? `<div class="item-description">${service.description}</div>` : ''}
              ${service.duration ? `<div class="item-description">Duration: ${service.duration}</div>` : ''}
            </div>
            <div class="item-controls">
              <div class="item-price">$${service.price || 0}</div>
              <input type="checkbox" 
                     class="checkbox-control" 
                     data-item-id="${service.id || index}"
                     ${this.selectedItems[service.id || index] ? 'checked' : ''}>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Build package builder calculator
   */
  buildPackageBuilderHTML() {
    const packages = this.config.items || [];
    
    return `
      <div class="calculator-items">
        ${packages.map((pkg, index) => `
          <div class="calculator-item ${this.selectedItems[pkg.id || index] ? 'selected' : ''}" 
               data-item-id="${pkg.id || index}">
            <div class="item-info">
              <div class="item-name">${pkg.name}</div>
              ${pkg.description ? `<div class="item-description">${pkg.description}</div>` : ''}
              ${pkg.features ? `
                <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.9rem;">
                  ${pkg.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
            <div class="item-controls">
              <div class="item-price">
                ${pkg.originalPrice ? `
                  <span style="text-decoration: line-through; color: var(--color-muted, #999); margin-right: 8px;">
                    $${pkg.originalPrice}
                  </span>
                ` : ''}
                $${pkg.price || 0}
              </div>
              <input type="radio" 
                     name="package-selection" 
                     class="checkbox-control" 
                     data-item-id="${pkg.id || index}"
                     ${this.selectedItems[pkg.id || index] ? 'checked' : ''}>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Build add-ons calculator
   */
  buildAddOnsHTML() {
    const addOns = this.config.items || [];
    
    return `
      <div class="calculator-items">
        ${addOns.map((addOn, index) => `
          <div class="calculator-item ${this.selectedItems[addOn.id || index] ? 'selected' : ''}" 
               data-item-id="${addOn.id || index}">
            <div class="item-info">
              <div class="item-name">${addOn.name}</div>
              ${addOn.description ? `<div class="item-description">${addOn.description}</div>` : ''}
            </div>
            <div class="item-controls">
              <div class="item-price">+$${addOn.price || 0}</div>
              <input type="checkbox" 
                     class="checkbox-control" 
                     data-item-id="${addOn.id || index}"
                     ${this.selectedItems[addOn.id || index] ? 'checked' : ''}>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Build total display HTML
   */
  buildTotalHTML() {
    const subtotal = this.calculateSubtotal();
    const discount = this.calculateDiscount(subtotal);
    const total = subtotal - discount;

    return `
      <div class="calculator-total">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${this.formatCurrency(subtotal)}</span>
        </div>
        ${discount > 0 ? `
          <div class="total-row">
            <span>
              Discount
              ${this.config.discount?.type === 'percentage' ? `(${this.config.discount.value}%)` : ''}
              <span class="discount-badge">SAVED</span>
            </span>
            <span style="color: var(--color-success, #10b981);">-${this.formatCurrency(discount)}</span>
          </div>
        ` : ''}
        <div class="total-row final">
          <span>Total:</span>
          <span>${this.formatCurrency(total)}</span>
        </div>
      </div>
    `;
  }

  /**
   * Build submit button HTML
   */
  buildSubmitButtonHTML() {
    return `
      <button class="submit-btn" type="button" data-action="submit">
        ${this.config.submitButtonText || 'Get Quote'}
      </button>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Quantity controls
    this.container.querySelectorAll('[data-action="increase"], [data-action="decrease"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-action');
        const itemId = btn.getAttribute('data-item-id');
        this.updateQuantity(itemId, action === 'increase' ? 1 : -1);
      });
    });

    // Checkbox/radio controls
    this.container.querySelectorAll('.checkbox-control').forEach(control => {
      control.addEventListener('change', (e) => {
        const itemId = control.getAttribute('data-item-id');
        if (control.type === 'radio') {
          // Radio: only one selected
          this.selectedItems = {};
          this.selectedItems[itemId] = true;
        } else {
          // Checkbox: toggle
          this.selectedItems[itemId] = control.checked;
        }
        this.calculateTotal();
        this.updateTotalDisplay();
      });
    });

    // Submit button
    const submitBtn = this.container.querySelector('[data-action="submit"]');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.handleSubmit();
      });
    }
  }

  /**
   * Update quantity for an item
   */
  updateQuantity(itemId, delta) {
    const currentQty = this.selectedItems[itemId] || 0;
    const newQty = Math.max(0, currentQty + delta);
    
    if (newQty === 0) {
      delete this.selectedItems[itemId];
    } else {
      this.selectedItems[itemId] = newQty;
    }

    // Update UI
    const qtyValue = this.container.querySelector(`.qty-value[data-item-id="${itemId}"]`);
    if (qtyValue) {
      qtyValue.textContent = newQty;
    }

    this.calculateTotal();
    this.updateTotalDisplay();
  }

  /**
   * Calculate subtotal
   */
  calculateSubtotal() {
    let subtotal = this.config.basePrice || 0;

    Object.entries(this.selectedItems).forEach(([itemId, quantity]) => {
      const item = this.config.items.find(i => (i.id || this.config.items.indexOf(i).toString()) === itemId);
      if (item) {
        const qty = typeof quantity === 'boolean' ? 1 : quantity;
        subtotal += (item.price || 0) * qty;
      }
    });

    return subtotal;
  }

  /**
   * Calculate discount
   */
  calculateDiscount(subtotal) {
    if (!this.config.discount) return 0;

    if (this.config.discount.type === 'percentage') {
      return subtotal * (this.config.discount.value / 100);
    } else if (this.config.discount.type === 'fixed') {
      return this.config.discount.value;
    }

    return 0;
  }

  /**
   * Calculate total
   */
  calculateTotal() {
    const subtotal = this.calculateSubtotal();
    const discount = this.calculateDiscount(subtotal);
    this.total = subtotal - discount;
    return this.total;
  }

  /**
   * Update total display
   */
  updateTotalDisplay() {
    if (!this.config.showTotal) return;

    const totalContainer = this.container.querySelector('.calculator-total');
    if (totalContainer) {
      totalContainer.outerHTML = this.buildTotalHTML();
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.config.currency
    }).format(amount);
  }

  /**
   * Handle form submission
   */
  handleSubmit() {
    const data = {
      type: this.config.type,
      selectedItems: this.selectedItems,
      subtotal: this.calculateSubtotal(),
      discount: this.calculateDiscount(this.calculateSubtotal()),
      total: this.total,
      items: this.config.items.filter((item, index) => {
        const itemId = item.id || index.toString();
        return this.selectedItems[itemId];
      })
    };

    if (this.config.onSubmit) {
      this.config.onSubmit(data);
    } else {
      console.log('Calculator submission:', data);
    }
  }

  /**
   * Get current total
   */
  getTotal() {
    return this.total;
  }

  /**
   * Get selected items
   */
  getSelectedItems() {
    return this.selectedItems;
  }

  /**
   * Reset calculator
   */
  reset() {
    this.selectedItems = {};
    this.total = 0;
    this.render();
    this.attachEventListeners();
    this.calculateTotal();
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InteractiveCalculator;
}

// Make available globally
window.InteractiveCalculator = InteractiveCalculator;

