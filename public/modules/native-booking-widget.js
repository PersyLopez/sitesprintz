/**
 * Native Booking Widget
 *
 * Full inline booking widget for SiteSprintz templates
 * Supports: service selection, date picker, time slots, customer form, confirmation
 *
 * Usage:
 *   const widget = new NativeBookingWidget('container-id', userId);
 *   await widget.init();
 */

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeServiceName(name) {
  return String(name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function matchBookableService(services, id, name) {
  if (id) {
    const byId = services.find((service) => String(service.id) === String(id));
    if (byId) return byId;
  }
  const normalized = normalizeServiceName(name);
  if (!normalized) return null;
  return services.find((service) => normalizeServiceName(service.name) === normalized);
}

class NativeBookingWidget {
  constructor(containerId, userId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container ${containerId} not found`);
      return;
    }
    
    this.userId = userId;
    this.apiBase = `/api/booking/tenants/${userId}`;
    
    // State
    this.state = {
      step: 'services', // services, date, form, confirmation
      services: [],
      servicesLoading: true,
      selectedService: null,
      selectedDate: null,
      selectedTime: null,
      timeSlots: [],
      slotsLoading: false,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerNotes: '',
      formErrors: {},
      loading: false,
      error: null,
      appointment: null,
      pageCatalogMode: Boolean(document.querySelector('[data-ss-book-service]')),
      serviceFromPage: false,
    };
    this._pendingPagePick = null;

    this._applyPagePick = (id, name) => {
      if (!this.state.services.length) {
        this._pendingPagePick = { id, name };
        return false;
      }
      const matched = matchBookableService(this.state.services, id, name);
      this._pendingPagePick = null;
      if (!matched) return false;
      this.state.selectedService = matched;
      this.state.serviceFromPage = true;
      this.state.step = 'date';
      return true;
    };

    this._onPageBookClick = (event) => {
      const target = event.target.closest('[data-ss-book-service]');
      if (!target) return;
      event.preventDefault();
      const card = target.closest('[data-service-id]');
      const id = target.getAttribute('data-service-id') || card?.getAttribute('data-service-id');
      const name = target.getAttribute('data-service-name') || card?.getAttribute('data-service-name');
      this._applyPagePick(id, name);
      const bookingEl = document.getElementById('booking');
      if (bookingEl) bookingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.render();
    };
  }

  async init() {
    if (this.state.pageCatalogMode) {
      document.addEventListener('click', this._onPageBookClick);
    }
    await this.loadBusinessMode();
    await this.loadServices();
    this.render();
  }

  async loadBusinessMode() {
    try {
      const tenantId = this.userId;
      if (!tenantId) return;

      const response = await fetch(`/api/business-mode/${tenantId}`);
      if (!response.ok) {
        console.warn('Failed to load business mode config');
        return;
      }

      const modeConfig = await response.json();
      this.state.businessMode = modeConfig.business_mode || 'team';
      this.state.staffSelectionEnabled = modeConfig.staff_selection_enabled !== false;
    } catch (error) {
      console.warn('Business mode loading failed:', error);
      this.state.businessMode = 'team';
      this.state.staffSelectionEnabled = true;
    }
  }

  async loadServices() {
    try {
      this.state.servicesLoading = true;
      this.state.error = null;
      
      const response = await fetch(`${this.apiBase}/services`);
      if (!response.ok) {
        throw new Error('Failed to load services');
      }
      
      const data = await response.json();
      this.state.services = data.services || [];
      if (this._pendingPagePick) {
        this._applyPagePick(this._pendingPagePick.id, this._pendingPagePick.name);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
      this.state.error = 'Failed to load services. Please try again.';
    } finally {
      this.state.servicesLoading = false;
      this.render();
    }
  }

  async loadAvailability(serviceId, date) {
    try {
      this.state.slotsLoading = true;
      
      const response = await fetch(
        `${this.apiBase}/availability?service_id=${serviceId}&date=${date}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load availability');
      }
      
      const data = await response.json();
      this.state.timeSlots = data.slots || [];
    } catch (err) {
      console.error('Error fetching availability:', err);
      this.state.timeSlots = [];
    } finally {
      this.state.slotsLoading = false;
      this.render();
    }
  }

  async submitAppointment() {
    if (!this.validateForm()) {
      return;
    }

    try {
      this.state.loading = true;
      this.state.error = null;

      const bookingData = {
        service_id: this.state.selectedService.id,
        start_time: this.state.selectedTime,
        customer_name: this.state.customerName,
        customer_email: this.state.customerEmail,
        customer_phone: this.state.customerPhone || undefined,
        notes: this.state.customerNotes || undefined
      };

      const response = await fetch(`${this.apiBase}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create booking');
      }

      const data = await response.json();
      this.state.appointment = data.appointment;
      this.state.step = 'confirmation';
    } catch (err) {
      const message = err.message || 'Failed to create booking. Please try again.';
      if (/no longer available/i.test(message)) {
        this.state.selectedTime = null;
        if (this.state.selectedDate && this.state.selectedService) {
          await this.loadAvailability(this.state.selectedService.id, this.state.selectedDate);
        }
        this.state.step = 'date';
      }
      this.state.error = message;
      console.error('Error creating appointment:', err);
    } finally {
      this.state.loading = false;
      this.render();
    }
  }

  validateForm() {
    const errors = {};

    if (!this.state.customerName.trim()) {
      errors.name = 'Name is required';
    }

    if (!this.state.customerEmail.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.state.customerEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    this.state.formErrors = errors;
    return Object.keys(errors).length === 0;
  }

  handleServiceSelect(service, fromPage = false) {
    this.state.selectedService = service;
    this.state.serviceFromPage = fromPage;
    this.render();
  }

  handleCatalogServiceChange(serviceId) {
    const service = this.state.services.find((item) => String(item.id) === String(serviceId));
    if (!service) return;
    this.handleServiceSelect(service, false);
  }

  handleServiceSelectByIndex(index) {
    if (this.state.services[index]) {
      this.handleServiceSelect(this.state.services[index]);
    }
  }

  handleNextFromServices() {
    if (this.state.selectedService) {
      this.state.step = 'date';
      this.render();
    }
  }

  handleBackToServices() {
    this.state.step = 'services';
    this.state.serviceFromPage = false;
    this.state.selectedDate = null;
    this.state.selectedTime = null;
    this.state.timeSlots = [];
    this.render();
  }

  async handleDateSelect(date) {
    this.state.selectedDate = date;
    await this.loadAvailability(this.state.selectedService.id, date);
  }

  handleTimeSelect(time) {
    this.state.selectedTime = time;
    this.render();
  }

  handleNextFromTime() {
    if (this.state.selectedTime) {
      this.state.step = 'form';
      this.render();
    }
  }

  render() {
    if (!this.container) return;

    // Loading state
    if (this.state.servicesLoading && this.state.step === 'services') {
      this.container.innerHTML = `
        <div class="booking-widget" data-testid="services-loading">
          <p>Loading services...</p>
        </div>
      `;
      return;
    }

    // Error state
    if (this.state.error && this.state.step === 'services') {
      this.container.innerHTML = `
        <div class="booking-widget">
          <div data-testid="error-message" class="error">${this.state.error}</div>
          <button class="btn-primary" onclick="window.nativeBookingWidget?.loadServices()">Try Again</button>
        </div>
      `;
      return;
    }

    // Empty state
    if (this.state.services.length === 0 && this.state.step === 'services') {
      this.container.innerHTML = `
        <div class="booking-widget">
          <div data-testid="services-empty">No services available at this time.</div>
        </div>
      `;
      return;
    }

    // Step 1: Services
    if (this.state.step === 'services') {
      this.renderServices();
      return;
    }

    // Step 2: Date & Time
    if (this.state.step === 'date') {
      this.renderDatePicker();
      return;
    }

    // Step 3: Form
    if (this.state.step === 'form') {
      this.renderForm();
      return;
    }

    // Step 4: Confirmation
    if (this.state.step === 'confirmation') {
      this.renderConfirmation();
      return;
    }
  }

  renderCatalogServiceSelect(showBrowseHint = false) {
    const options = this.state.services.map((service) => {
      const selected = this.state.selectedService?.id === service.id ? 'selected' : '';
      return `<option value="${this.escapeHtml(String(service.id))}" ${selected}>${this.escapeHtml(service.name)}</option>`;
    }).join('');

    const hint = showBrowseHint && !this.state.selectedService
      ? `<p class="catalog-service-hint">Choose a service below, or <a href="#services">Browse services</a></p>`
      : '';

    return `
      <div class="catalog-service-picker">
        ${hint}
        <label for="booking-service-select">Select a service</label>
        <select id="booking-service-select" data-testid="booking-service-select" onchange="window.nativeBookingWidget?.handleCatalogServiceChange(this.value)">
          <option value="">Select a service</option>
          ${options}
        </select>
      </div>
    `;
  }

  renderServices() {
    if (this.state.pageCatalogMode) {
      const summaryHtml = this.state.selectedService ? `
        <div data-testid="booking-summary" class="booking-summary">
          <h3>Booking Summary</h3>
          <p><strong>Service:</strong> ${this.escapeHtml(this.state.selectedService.name)}</p>
          <p><strong>Price:</strong> $${(this.state.selectedService.price_cents / 100).toFixed(2)}</p>
        </div>
      ` : '';

      this.container.innerHTML = `
        <div class="booking-widget">
          <h2>Select a Service</h2>
          ${this.renderCatalogServiceSelect(true)}
          ${this.state.selectedService ? `
            <div class="actions">
              <button data-testid="next-button" class="btn-primary" onclick="window.nativeBookingWidget?.handleNextFromServices()">
                Next
              </button>
            </div>
          ` : ''}
          ${summaryHtml}
        </div>
      `;
      return;
    }

    const servicesHtml = this.state.services.map((service, index) => {
      const isSelected = this.state.selectedService?.id === service.id;
      return `
        <div
          data-testid="service-card-${service.id}"
          class="service-card ${isSelected ? 'selected' : ''}"
          onclick="window.nativeBookingWidget?.handleServiceSelectByIndex(${index})"
          tabindex="0"
          role="button"
          onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.nativeBookingWidget?.handleServiceSelectByIndex(${index})}"
        >
          <h3>${this.escapeHtml(service.name)}</h3>
          ${service.description ? `<p>${this.escapeHtml(service.description)}</p>` : ''}
          <div class="service-details">
            <span class="duration">${service.duration_minutes} min</span>
            <span class="price">$${(service.price_cents / 100).toFixed(2)}</span>
          </div>
        </div>
      `;
    }).join('');

    // Add staff selector for team mode
    const staffSelectorHtml = this.state.businessMode !== 'solo' && this.state.staffSelectionEnabled ? `
      <div id="staff-selector" class="staff-selector">
        <label for="staff-select">Choose your provider:</label>
        <select id="staff-select" data-testid="staff-select">
          <option value="">Any Available Provider</option>
          <!-- Staff options loaded dynamically -->
        </select>
      </div>
    ` : `
      <div id="owner-name" class="owner-name">
        <p>Book with us</p>
      </div>
    `;

    const summaryHtml = this.state.selectedService ? `
      <div data-testid="booking-summary" class="booking-summary">
        <h3>Booking Summary</h3>
        <p><strong>Service:</strong> ${this.escapeHtml(this.state.selectedService.name)}</p>
        <p><strong>Price:</strong> $${(this.state.selectedService.price_cents / 100).toFixed(2)}</p>
      </div>
    ` : '';

    this.container.innerHTML = `
      <div class="booking-widget">
        <h2>Select a Service</h2>
        ${staffSelectorHtml}
        <div data-testid="services-list" class="services-list">
          ${servicesHtml}
        </div>
        ${this.state.selectedService ? `
          <div class="actions">
            <button data-testid="next-button" class="btn-primary" onclick="window.nativeBookingWidget?.handleNextFromServices()">
              Next
            </button>
          </div>
        ` : ''}
        ${summaryHtml}
      </div>
    `;
  }

  renderDatePicker() {
    const catalogSelect = this.state.pageCatalogMode ? this.renderCatalogServiceSelect() : '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentMonth = this.state.currentMonth || new Date();
    const monthYear = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const firstWeekday = firstDay.getDay();
    const pad = Array.from({ length: firstWeekday }, () => '<span class="calendar-day calendar-day--pad" aria-hidden="true"></span>').join('');

    const days = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(year, month, i);
      days.push(day);
    }

    const calendarDays = days.map(day => {
      const dateString = formatLocalDate(day);
      const isPast = day < today;
      const isSelected = this.state.selectedDate === dateString;

      return `
        <button
          data-testid="date-${dateString}"
          onclick="${!isPast ? `window.nativeBookingWidget?.handleDateSelect('${dateString}')` : ''}"
          ${isPast ? 'disabled' : ''}
          class="calendar-day ${isPast ? 'disabled' : ''} ${isSelected ? 'selected' : ''}"
        >
          ${day.getDate()}
        </button>
      `;
    }).join('');

    const timeSlotsHtml = this.state.selectedDate ? (
      this.state.slotsLoading
        ? '<p data-testid="slots-loading">Loading available times...</p>'
        : this.state.timeSlots.length > 0
          ? `
      <div data-testid="time-slots" class="time-slots">
        <h3>Available Times</h3>
        ${this.state.timeSlots.map(slot => `
          <button
            data-testid="time-slot-${slot.start_time}"
            class="time-slot ${this.state.selectedTime === slot.start_time ? 'selected' : ''}"
            onclick="window.nativeBookingWidget?.handleTimeSelect('${slot.start_time}')"
            ${!slot.available ? 'disabled' : ''}
          >
            ${slot.display_time}
          </button>
        `).join('')}
        ${this.state.selectedTime ? `
          <button data-testid="next-button" class="btn-primary" onclick="window.nativeBookingWidget?.handleNextFromTime()">
            Next
          </button>
        ` : ''}
      </div>
    `
          : '<p class="booking-slots-status" data-testid="slots-empty">No times available this day. Try another date.</p>'
    ) : '';

    this.container.innerHTML = `
      <div class="booking-widget">
        <h2>Select a Date</h2>
        <button data-testid="back-button" class="btn-secondary" onclick="window.nativeBookingWidget?.handleBackToServices()">
          ← Back
        </button>
        ${catalogSelect}
        <div data-testid="date-picker" class="date-picker">
          <p>Select a date for your appointment</p>
          <div data-testid="calendar" class="calendar">
            <div class="calendar-header">
              <button onclick="window.nativeBookingWidget?.prevMonth()">←</button>
              <h3>${monthYear}</h3>
              <button onclick="window.nativeBookingWidget?.nextMonth()">→</button>
            </div>
            <div class="calendar-weekdays" aria-hidden="true">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
            <div class="calendar-grid">
              ${pad}${calendarDays}
            </div>
          </div>
        </div>
        ${timeSlotsHtml}
        ${this.state.error ? `
          <div data-testid="error-message" class="error">${this.escapeHtml(this.state.error)}</div>
        ` : ''}
      </div>
    `;
  }

  prevMonth() {
    const current = this.state.currentMonth || new Date();
    this.state.currentMonth = new Date(current.getFullYear(), current.getMonth() - 1);
    this.render();
  }

  nextMonth() {
    const current = this.state.currentMonth || new Date();
    this.state.currentMonth = new Date(current.getFullYear(), current.getMonth() + 1);
    this.render();
  }

  renderForm() {
    this.container.innerHTML = `
      <div class="booking-widget">
        <h2>Your Information</h2>
        <div data-testid="customer-form" class="customer-form">
          <div class="form-group">
            <label for="customer-name">Name *</label>
            <input
              id="customer-name"
              data-testid="customer-name"
              type="text"
              value="${this.escapeHtml(this.state.customerName)}"
              oninput="window.nativeBookingWidget.state.customerName = this.value; window.nativeBookingWidget.render()"
              class="${this.state.formErrors.name ? 'error' : ''}"
            />
            ${this.state.formErrors.name ? `
              <span data-testid="name-error" class="error-text">${this.escapeHtml(this.state.formErrors.name)}</span>
            ` : ''}
          </div>
          <div class="form-group">
            <label for="customer-email">Email *</label>
            <input
              id="customer-email"
              data-testid="customer-email"
              type="email"
              value="${this.escapeHtml(this.state.customerEmail)}"
              oninput="window.nativeBookingWidget.state.customerEmail = this.value; window.nativeBookingWidget.render()"
              class="${this.state.formErrors.email ? 'error' : ''}"
            />
            ${this.state.formErrors.email ? `
              <span data-testid="email-error" class="error-text">${this.escapeHtml(this.state.formErrors.email)}</span>
            ` : ''}
          </div>
          <div class="form-group">
            <label for="customer-phone">Phone</label>
            <input
              id="customer-phone"
              data-testid="customer-phone"
              type="tel"
              value="${this.escapeHtml(this.state.customerPhone)}"
              oninput="window.nativeBookingWidget.state.customerPhone = this.value; window.nativeBookingWidget.render()"
            />
          </div>
          <div class="form-group">
            <label for="customer-notes">Additional Notes</label>
            <textarea
              id="customer-notes"
              data-testid="customer-notes"
              rows="3"
              oninput="window.nativeBookingWidget.state.customerNotes = this.value; window.nativeBookingWidget.render()"
            >${this.escapeHtml(this.state.customerNotes)}</textarea>
          </div>
          ${this.state.error ? `
            <div data-testid="error-message" class="error">${this.escapeHtml(this.state.error)}</div>
          ` : ''}
          ${this.state.loading ? `
            <div data-testid="booking-loading">Processing your booking...</div>
          ` : ''}
          <button
            data-testid="book-now-button"
            onclick="window.nativeBookingWidget?.submitAppointment()"
            ${this.state.loading ? 'disabled' : ''}
            class="btn-primary"
          >
            ${this.state.loading ? 'Booking...' : 'Book Now'}
          </button>
        </div>
      </div>
    `;
  }

  renderConfirmation() {
    this.container.innerHTML = `
      <div class="booking-widget">
        <div data-testid="confirmation-page" class="confirmation">
          <h2>✅ Booking Confirmed!</h2>
          <div data-testid="confirmation-message" class="success-message">
            <p>Your appointment has been successfully booked.</p>
          </div>
          <div class="confirmation-details">
            <p><strong>Confirmation Code:</strong></p>
            <p data-testid="confirmation-code" class="confirmation-code">
              ${this.state.appointment?.confirmation_code || ''}
            </p>
            <p><strong>Service:</strong> ${this.escapeHtml(this.state.selectedService?.name || '')}</p>
            <p><strong>Date:</strong> ${this.state.selectedDate}</p>
            <p><strong>Time:</strong> ${this.state.selectedTime}</p>
          </div>
          <p class="email-notice">
            A confirmation email has been sent to ${this.escapeHtml(this.state.customerEmail)}
          </p>
        </div>
      </div>
    `;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  window.NativeBookingWidget = NativeBookingWidget;
}

