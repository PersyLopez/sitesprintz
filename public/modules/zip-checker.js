/**
 * Zip Checker Component
 * 
 * Service area validation with instant feedback and lead capture.
 * Used for: Home Services, Cleaning, Pet Care
 * 
 * Features:
 * - ZIP code validation
 * - Service area checking
 * - Instant feedback
 * - Lead capture for out-of-area
 * - Integration with quote/booking forms
 */

class ZipChecker {
  constructor(config) {
    this.config = {
      containerId: config.containerId || 'zip-checker-container',
      serviceAreas: config.serviceAreas || [], // Array of ZIP codes or ranges
      serviceAreaRanges: config.serviceAreaRanges || [], // [{ start: 10000, end: 19999 }]
      onValidZip: config.onValidZip || null,
      onInvalidZip: config.onInvalidZip || null,
      onOutOfArea: config.onOutOfArea || null,
      showLeadCapture: config.showLeadCapture !== false,
      ...config
    };
    
    this.container = null;
    this.enteredZip = null;
    this.isValid = null;
  }

  /**
   * Initialize and render the component
   */
  init() {
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`ZipChecker: Container ${this.config.containerId} not found`);
      return;
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the component
   */
  render() {
    const inputHTML = this.buildInputHTML();
    const resultHTML = this.buildResultHTML();
    
    this.container.innerHTML = `
      <div class="zip-checker">
        <h4 class="checker-title">${this.config.title || 'Check Service Availability'}</h4>
        ${this.config.description ? `<p class="checker-description">${this.config.description}</p>` : ''}
        
        <div class="zip-input-group">
          ${inputHTML}
        </div>
        
        ${resultHTML}
      </div>
      <style>
        .zip-checker {
          padding: 24px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .checker-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .checker-description {
          font-size: 0.9rem;
          color: var(--color-muted, #666);
          margin-bottom: 16px;
        }
        .zip-input-group {
          display: flex;
          gap: 8px;
        }
        .zip-input {
          flex: 1;
          padding: 12px;
          border: 2px solid var(--color-border, #ddd);
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        .zip-input:focus {
          outline: none;
          border-color: var(--color-primary, #2563eb);
        }
        .zip-input.valid {
          border-color: var(--color-success, #10b981);
        }
        .zip-input.invalid {
          border-color: var(--color-error, #ef4444);
        }
        .zip-check-btn {
          padding: 12px 24px;
          background: var(--color-primary, #2563eb);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .zip-check-btn:hover {
          background: var(--color-primary-dark, #1d4ed8);
        }
        .zip-result {
          margin-top: 16px;
          padding: 16px;
          border-radius: 6px;
          display: none;
        }
        .zip-result.show {
          display: block;
        }
        .zip-result.success {
          background: var(--color-success-light, #d1fae5);
          border-left: 4px solid var(--color-success, #10b981);
          color: var(--color-success-dark, #065f46);
        }
        .zip-result.error {
          background: var(--color-error-light, #fee2e2);
          border-left: 4px solid var(--color-error, #ef4444);
          color: var(--color-error-dark, #991b1b);
        }
        .zip-result.warning {
          background: var(--color-warning-light, #fef3c7);
          border-left: 4px solid var(--color-warning, #f59e0b);
          color: var(--color-warning-dark, #92400e);
        }
        .result-icon {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }
        .result-message {
          font-weight: 600;
          margin-bottom: 4px;
        }
        .result-description {
          font-size: 0.9rem;
          opacity: 0.9;
        }
        .lead-capture {
          margin-top: 16px;
          padding: 16px;
          background: white;
          border-radius: 6px;
        }
        .lead-capture-title {
          font-weight: 600;
          margin-bottom: 8px;
        }
        .lead-capture-description {
          font-size: 0.9rem;
          color: var(--color-muted, #666);
          margin-bottom: 12px;
        }
        .lead-input-group {
          display: flex;
          gap: 8px;
        }
        .lead-input {
          flex: 1;
          padding: 10px;
          border: 1px solid var(--color-border, #ddd);
          border-radius: 6px;
          font-size: 0.9rem;
        }
        .lead-submit-btn {
          padding: 10px 20px;
          background: var(--color-primary, #2563eb);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }
        @media (max-width: 768px) {
          .zip-input-group,
          .lead-input-group {
            flex-direction: column;
          }
          .zip-check-btn,
          .lead-submit-btn {
            width: 100%;
          }
        }
      </style>
    `;
  }

  /**
   * Build input HTML
   */
  buildInputHTML() {
    return `
      <input type="text" 
             class="zip-input" 
             id="zip-input"
             placeholder="Enter ZIP code"
             maxlength="5"
             pattern="[0-9]{5}">
      <button class="zip-check-btn" data-action="check-zip">
        Check
      </button>
    `;
  }

  /**
   * Build result HTML
   */
  buildResultHTML() {
    if (this.isValid === null) {
      return '<div class="zip-result" id="zip-result"></div>';
    }

    const isInArea = this.isValid;
    const resultClass = isInArea ? 'success' : 'error';
    const icon = isInArea ? '✓' : '✗';
    const message = isInArea 
      ? (this.config.successMessage || 'We service your area!')
      : (this.config.errorMessage || 'Sorry, we don\'t currently service this area.');
    const description = isInArea
      ? (this.config.successDescription || 'You can proceed with booking or requesting a quote.')
      : (this.config.errorDescription || 'Please contact us to see if we can make an exception.');

    const leadCaptureHTML = !isInArea && this.config.showLeadCapture 
      ? this.buildLeadCaptureHTML() 
      : '';

    return `
      <div class="zip-result ${resultClass} show" id="zip-result">
        <div class="result-icon">${icon}</div>
        <div class="result-message">${message}</div>
        <div class="result-description">${description}</div>
        ${leadCaptureHTML}
      </div>
    `;
  }

  /**
   * Build lead capture HTML
   */
  buildLeadCaptureHTML() {
    return `
      <div class="lead-capture">
        <div class="lead-capture-title">Interested in our services?</div>
        <div class="lead-capture-description">
          Enter your email and we'll notify you when we expand to your area.
        </div>
        <div class="lead-input-group">
          <input type="email" 
                 class="lead-input" 
                 id="lead-email-input"
                 placeholder="your@email.com">
          <button class="lead-submit-btn" data-action="submit-lead">
            Notify Me
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // ZIP input - allow Enter key
    const zipInput = this.container.querySelector('#zip-input');
    if (zipInput) {
      zipInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.checkZip();
        }
      });

      // Format input (numbers only)
      zipInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5);
      });
    }

    // Check button
    const checkBtn = this.container.querySelector('[data-action="check-zip"]');
    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        this.checkZip();
      });
    }

    // Lead capture submit
    const leadSubmitBtn = this.container.querySelector('[data-action="submit-lead"]');
    if (leadSubmitBtn) {
      leadSubmitBtn.addEventListener('click', () => {
        this.handleLeadCapture();
      });
    }
  }

  /**
   * Check ZIP code
   */
  checkZip() {
    const zipInput = this.container.querySelector('#zip-input');
    if (!zipInput) return;

    const zip = zipInput.value.trim();
    
    if (!this.isValidZipFormat(zip)) {
      this.showResult(false, 'Please enter a valid 5-digit ZIP code.');
      return;
    }

    this.enteredZip = zip;
    const isInArea = this.isZipInServiceArea(zip);
    this.isValid = isInArea;

    this.updateResult();

    // Trigger callbacks
    if (isInArea && this.config.onValidZip) {
      this.config.onValidZip(zip);
    } else if (!isInArea) {
      if (this.config.onInvalidZip) {
        this.config.onInvalidZip(zip);
      }
      if (this.config.onOutOfArea) {
        this.config.onOutOfArea(zip);
      }
    }
  }

  /**
   * Check if ZIP is in service area
   */
  isZipInServiceArea(zip) {
    const zipNum = parseInt(zip, 10);
    
    // Check exact matches
    if (this.config.serviceAreas.includes(zip)) {
      return true;
    }

    // Check ranges
    for (const range of this.config.serviceAreaRanges) {
      if (zipNum >= range.start && zipNum <= range.end) {
        return true;
      }
    }

    // Check custom function
    if (this.config.checkFunction && typeof this.config.checkFunction === 'function') {
      return this.config.checkFunction(zip);
    }

    return false;
  }

  /**
   * Validate ZIP format
   */
  isValidZipFormat(zip) {
    return /^\d{5}$/.test(zip);
  }

  /**
   * Show result
   */
  showResult(isValid, customMessage = null) {
    this.isValid = isValid;
    this.updateResult(customMessage);
  }

  /**
   * Update result display
   */
  updateResult(customMessage = null) {
    const resultContainer = this.container.querySelector('#zip-result');
    if (!resultContainer) return;

    const isInArea = this.isValid;
    const resultClass = isInArea ? 'success' : 'error';
    const icon = isInArea ? '✓' : '✗';
    const message = customMessage || (isInArea 
      ? (this.config.successMessage || 'We service your area!')
      : (this.config.errorMessage || 'Sorry, we don\'t currently service this area.'));
    const description = isInArea
      ? (this.config.successDescription || 'You can proceed with booking or requesting a quote.')
      : (this.config.errorDescription || 'Please contact us to see if we can make an exception.');

    const leadCaptureHTML = !isInArea && this.config.showLeadCapture 
      ? this.buildLeadCaptureHTML() 
      : '';

    resultContainer.className = `zip-result ${resultClass} show`;
    resultContainer.innerHTML = `
      <div class="result-icon">${icon}</div>
      <div class="result-message">${message}</div>
      <div class="result-description">${description}</div>
      ${leadCaptureHTML}
    `;

    // Update input styling
    const zipInput = this.container.querySelector('#zip-input');
    if (zipInput) {
      zipInput.classList.remove('valid', 'invalid');
      if (this.isValid !== null) {
        zipInput.classList.add(this.isValid ? 'valid' : 'invalid');
      }
    }

    // Re-attach lead capture listeners
    const leadSubmitBtn = this.container.querySelector('[data-action="submit-lead"]');
    if (leadSubmitBtn) {
      leadSubmitBtn.addEventListener('click', () => {
        this.handleLeadCapture();
      });
    }
  }

  /**
   * Handle lead capture
   */
  handleLeadCapture() {
    const emailInput = this.container.querySelector('#lead-email-input');
    if (!emailInput) return;

    const email = emailInput.value.trim();
    if (!this.isValidEmail(email)) {
      alert('Please enter a valid email address');
      return;
    }

    const leadData = {
      email: email,
      zip: this.enteredZip,
      timestamp: new Date().toISOString()
    };

    if (this.config.onOutOfArea) {
      this.config.onOutOfArea(this.enteredZip, leadData);
    }

    // Show success message
    emailInput.value = '';
    this.container.querySelector('.lead-capture').innerHTML = `
      <div style="text-align: center; padding: 16px; color: var(--color-success, #10b981);">
        ✓ Thank you! We'll notify you when we expand to your area.
      </div>
    `;
  }

  /**
   * Email validation
   */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Get entered ZIP
   */
  getZip() {
    return this.enteredZip;
  }

  /**
   * Check if ZIP is valid
   */
  isValidZip() {
    return this.isValid;
  }

  /**
   * Reset checker
   */
  reset() {
    this.enteredZip = null;
    this.isValid = null;
    const zipInput = this.container.querySelector('#zip-input');
    if (zipInput) {
      zipInput.value = '';
      zipInput.classList.remove('valid', 'invalid');
    }
    const resultContainer = this.container.querySelector('#zip-result');
    if (resultContainer) {
      resultContainer.className = 'zip-result';
      resultContainer.innerHTML = '';
    }
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZipChecker;
}

// Make available globally
window.ZipChecker = ZipChecker;

