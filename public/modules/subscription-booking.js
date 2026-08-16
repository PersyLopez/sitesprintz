/**
 * Subscription Booking Component
 * 
 * Recurring service booking with discount display and calendar integration.
 * Used for: Pet Care, Cleaning, Salon, Gym (recurring memberships)
 * 
 * Features:
 * - Recurring service selection (weekly, bi-weekly, monthly)
 * - Discount display for recurring
 * - Calendar date picker for first appointment
 * - Auto-renewal messaging
 * - Integration with booking widget
 */

class SubscriptionBooking {
  constructor(config) {
    this.config = {
      containerId: config.containerId || 'subscription-booking-container',
      services: config.services || [],
      frequencies: config.frequencies || [
        { value: 'weekly', label: 'Weekly', discount: 10 },
        { value: 'bi-weekly', label: 'Bi-Weekly', discount: 5 },
        { value: 'monthly', label: 'Monthly', discount: 15 }
      ],
      basePrice: config.basePrice || 0,
      currency: config.currency || 'USD',
      bookingWidget: config.bookingWidget || null,
      onSubmit: config.onSubmit || null,
      ...config
    };
    
    this.container = null;
    this.selectedService = null;
    this.selectedFrequency = null;
    this.selectedDate = null;
  }

  /**
   * Initialize and render the component
   */
  init() {
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`SubscriptionBooking: Container ${this.config.containerId} not found`);
      return;
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the component
   */
  render() {
    const servicesHTML = this.buildServicesHTML();
    const frequencyHTML = this.buildFrequencyHTML();
    const datePickerHTML = this.buildDatePickerHTML();
    const summaryHTML = this.buildSummaryHTML();
    
    this.container.innerHTML = `
      <div class="subscription-booking">
        <h3 class="booking-title">${this.config.title || 'Book Recurring Service'}</h3>
        ${this.config.description ? `<p class="booking-description">${this.config.description}</p>` : ''}
        
        <div class="booking-steps">
          <div class="step">
            <h4 class="step-title">1. Select Service</h4>
            ${servicesHTML}
          </div>
          
          <div class="step">
            <h4 class="step-title">2. Choose Frequency</h4>
            ${frequencyHTML}
          </div>
          
          <div class="step">
            <h4 class="step-title">3. Select Start Date</h4>
            ${datePickerHTML}
          </div>
          
          ${summaryHTML}
        </div>
      </div>
      <style>
        .subscription-booking {
          max-width: 700px;
          margin: 0 auto;
        }
        .booking-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .booking-description {
          color: var(--color-muted, #666);
          margin-bottom: 32px;
        }
        .booking-steps {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .step {
          padding: 24px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 8px;
        }
        .step-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .service-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .service-card {
          padding: 20px;
          background: white;
          border: 2px solid var(--color-border, #e5e7eb);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .service-card:hover {
          border-color: var(--color-primary, #2563eb);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .service-card.selected {
          border-color: var(--color-primary, #2563eb);
          background: var(--color-primary-light, #eff6ff);
        }
        .service-name {
          font-weight: 600;
          margin-bottom: 8px;
        }
        .service-description {
          font-size: 0.9rem;
          color: var(--color-muted, #666);
          margin-bottom: 12px;
        }
        .service-price {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-primary, #2563eb);
        }
        .frequency-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }
        .frequency-card {
          padding: 16px;
          background: white;
          border: 2px solid var(--color-border, #e5e7eb);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .frequency-card:hover {
          border-color: var(--color-primary, #2563eb);
        }
        .frequency-card.selected {
          border-color: var(--color-primary, #2563eb);
          background: var(--color-primary-light, #eff6ff);
        }
        .frequency-label {
          font-weight: 600;
          margin-bottom: 4px;
        }
        .frequency-discount {
          font-size: 0.85rem;
          color: var(--color-success, #10b981);
          font-weight: 600;
        }
        .date-picker {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .date-input {
          padding: 12px;
          border: 1px solid var(--color-border, #ddd);
          border-radius: 6px;
          font-size: 1rem;
        }
        .date-note {
          font-size: 0.85rem;
          color: var(--color-muted, #666);
        }
        .booking-summary {
          padding: 24px;
          background: white;
          border: 2px solid var(--color-primary, #2563eb);
          border-radius: 8px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .summary-row.total {
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
        .auto-renewal-note {
          margin-top: 16px;
          padding: 12px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 6px;
          font-size: 0.9rem;
          color: var(--color-muted, #666);
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
          margin-top: 16px;
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
          .service-grid,
          .frequency-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  }

  /**
   * Build services HTML
   */
  buildServicesHTML() {
    if (this.config.services.length === 0) {
      return '<p class="no-services">No services available</p>';
    }

    return `
      <div class="service-grid">
        ${this.config.services.map(service => `
          <div class="service-card ${this.selectedService?.id === service.id ? 'selected' : ''}" 
               data-service-id="${service.id}">
            <div class="service-name">${service.name}</div>
            ${service.description ? `<div class="service-description">${service.description}</div>` : ''}
            <div class="service-price">${this.formatCurrency(service.price || this.config.basePrice)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Build frequency selection HTML
   */
  buildFrequencyHTML() {
    return `
      <div class="frequency-grid">
        ${this.config.frequencies.map(freq => `
          <div class="frequency-card ${this.selectedFrequency === freq.value ? 'selected' : ''}" 
               data-frequency="${freq.value}">
            <div class="frequency-label">${freq.label}</div>
            ${freq.discount ? `
              <div class="frequency-discount">Save ${freq.discount}%</div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Build date picker HTML
   */
  buildDatePickerHTML() {
    const minDate = new Date().toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    return `
      <div class="date-picker">
        <input type="date" 
               class="date-input" 
               id="start-date"
               min="${minDate}"
               max="${maxDateStr}"
               value="${this.selectedDate || ''}"
               required>
        <div class="date-note">
          Select your preferred start date. Service will automatically renew based on your selected frequency.
        </div>
      </div>
    `;
  }

  /**
   * Build summary HTML
   */
  buildSummaryHTML() {
    if (!this.selectedService || !this.selectedFrequency) {
      return '';
    }

    const service = this.selectedService;
    const frequency = this.config.frequencies.find(f => f.value === this.selectedFrequency);
    const basePrice = service.price || this.config.basePrice;
    const discount = frequency?.discount || 0;
    const discountAmount = basePrice * (discount / 100);
    const finalPrice = basePrice - discountAmount;

    return `
      <div class="booking-summary">
        <h4 class="step-title">Booking Summary</h4>
        
        <div class="summary-row">
          <span>Service:</span>
          <span>${service.name}</span>
        </div>
        
        <div class="summary-row">
          <span>Frequency:</span>
          <span>${frequency?.label || this.selectedFrequency}</span>
        </div>
        
        <div class="summary-row">
          <span>Base Price:</span>
          <span>${this.formatCurrency(basePrice)}</span>
        </div>
        
        ${discount > 0 ? `
          <div class="summary-row">
            <span>
              Discount
              <span class="discount-badge">${discount}% OFF</span>
            </span>
            <span style="color: var(--color-success, #10b981);">
              -${this.formatCurrency(discountAmount)}
            </span>
          </div>
        ` : ''}
        
        <div class="summary-row total">
          <span>Recurring Price:</span>
          <span>${this.formatCurrency(finalPrice)}</span>
        </div>
        
        ${this.selectedDate ? `
          <div class="summary-row">
            <span>Start Date:</span>
            <span>${this.formatDateDisplay(this.selectedDate)}</span>
          </div>
        ` : ''}
        
        <div class="auto-renewal-note">
          <strong>Auto-Renewal:</strong> This service will automatically renew every ${frequency?.label.toLowerCase() || this.selectedFrequency} 
          starting from your selected date. You can cancel anytime.
        </div>
        
        <button class="submit-btn" 
                type="button" 
                data-action="submit"
                ${!this.selectedDate ? 'disabled' : ''}>
          ${this.config.submitButtonText || 'Book Recurring Service'}
        </button>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Service selection
    this.container.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const serviceId = card.getAttribute('data-service-id');
        this.selectService(serviceId);
      });
    });

    // Frequency selection
    this.container.querySelectorAll('.frequency-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const frequency = card.getAttribute('data-frequency');
        this.selectFrequency(frequency);
      });
    });

    // Date picker
    const dateInput = this.container.querySelector('#start-date');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        this.selectedDate = e.target.value;
        this.updateSummary();
      });
    }

    // Submit button
    const submitBtn = this.container.querySelector('[data-action="submit"]');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.handleSubmit();
      });
    }
  }

  /**
   * Select a service
   */
  selectService(serviceId) {
    this.selectedService = this.config.services.find(s => s.id === serviceId);
    this.updateSummary();
    this.render();
    this.attachEventListeners();
  }

  /**
   * Select a frequency
   */
  selectFrequency(frequency) {
    this.selectedFrequency = frequency;
    this.updateSummary();
    this.render();
    this.attachEventListeners();
  }

  /**
   * Update summary display
   */
  updateSummary() {
    const summary = this.container.querySelector('.booking-summary');
    if (summary && this.selectedService && this.selectedFrequency) {
      summary.outerHTML = this.buildSummaryHTML();
      this.attachEventListeners();
    } else if (!summary && this.selectedService && this.selectedFrequency) {
      // Add summary if it doesn't exist
      const steps = this.container.querySelector('.booking-steps');
      if (steps) {
        steps.insertAdjacentHTML('beforeend', this.buildSummaryHTML());
        this.attachEventListeners();
      }
    }
  }

  /**
   * Handle form submission
   */
  handleSubmit() {
    if (!this.selectedService || !this.selectedFrequency || !this.selectedDate) {
      return;
    }

    const frequency = this.config.frequencies.find(f => f.value === this.selectedFrequency);
    const basePrice = this.selectedService.price || this.config.basePrice;
    const discount = frequency?.discount || 0;
    const discountAmount = basePrice * (discount / 100);
    const finalPrice = basePrice - discountAmount;

    const bookingData = {
      service: this.selectedService,
      frequency: this.selectedFrequency,
      frequencyLabel: frequency?.label,
      startDate: this.selectedDate,
      basePrice: basePrice,
      discount: discount,
      discountAmount: discountAmount,
      finalPrice: finalPrice
    };

    if (this.config.onSubmit) {
      this.config.onSubmit(bookingData);
    } else if (this.config.bookingWidget) {
      // Trigger booking widget
      this.triggerBooking(bookingData);
    } else {
      console.log('Subscription booking:', bookingData);
    }
  }

  /**
   * Trigger booking widget
   */
  triggerBooking(bookingData) {
    if (this.config.bookingWidget) {
      // Initialize booking widget with subscription data
      if (typeof this.config.bookingWidget === 'object' && this.config.bookingWidget.init) {
        this.config.bookingWidget.init();
      }
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
   * Format date for display
   */
  formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  /**
   * Get booking data
   */
  getBookingData() {
    return {
      service: this.selectedService,
      frequency: this.selectedFrequency,
      startDate: this.selectedDate
    };
  }

  /**
   * Reset booking
   */
  reset() {
    this.selectedService = null;
    this.selectedFrequency = null;
    this.selectedDate = null;
    this.render();
    this.attachEventListeners();
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubscriptionBooking;
}

// Make available globally
window.SubscriptionBooking = SubscriptionBooking;

