/**
 * Multi-Step Form Component
 * 
 * Multi-step form with conditional logic, progress tracking, and validation.
 * Used for: case evaluation (Legal), patient intake (Medical), quote requests (Home Services), diagnostics (Tech Repair)
 * 
 * Features:
 * - Conditional logic (show/hide steps based on answers)
 * - Progress indicator
 * - Field validation per step
 * - Data persistence (localStorage)
 * - Email/webhook submission
 * - Step navigation (next/previous)
 */

class MultiStepForm {
  constructor(config) {
    this.config = {
      containerId: config.containerId || 'multi-step-form-container',
      steps: config.steps || [],
      onSubmit: config.onSubmit || null,
      persistData: config.persistData !== false, // Save to localStorage
      storageKey: config.storageKey || 'multistep-form-data',
      showProgress: config.showProgress !== false,
      allowBackNavigation: config.allowBackNavigation !== true,
      ...config
    };
    
    this.container = null;
    this.currentStep = 0;
    this.formData = {};
    this.validationErrors = {};
  }

  /**
   * Initialize and render the form
   */
  init() {
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`MultiStepForm: Container ${this.config.containerId} not found`);
      return;
    }

    // Load persisted data if available
    if (this.config.persistData) {
      this.loadPersistedData();
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the form
   */
  render() {
    const progressHTML = this.config.showProgress ? this.buildProgressHTML() : '';
    const stepHTML = this.buildCurrentStepHTML();
    
    this.container.innerHTML = `
      <div class="multi-step-form">
        ${progressHTML}
        <form class="step-form" data-step="${this.currentStep}">
          ${stepHTML}
        </form>
      </div>
      <style>
        .multi-step-form {
          max-width: 600px;
          margin: 0 auto;
        }
        .form-progress {
          margin-bottom: 32px;
        }
        .progress-bar {
          height: 4px;
          background: var(--color-surface, #e5e7eb);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .progress-fill {
          height: 100%;
          background: var(--color-primary, #2563eb);
          transition: width 0.3s;
        }
        .progress-steps {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: var(--color-muted, #666);
        }
        .progress-step {
          flex: 1;
          text-align: center;
        }
        .progress-step.active {
          color: var(--color-primary, #2563eb);
          font-weight: 600;
        }
        .progress-step.completed {
          color: var(--color-success, #10b981);
        }
        .step-form {
          background: var(--color-surface, #fff);
          padding: 32px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .step-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .step-description {
          color: var(--color-muted, #666);
          margin-bottom: 24px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .form-label .required {
          color: var(--color-error, #ef4444);
        }
        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--color-border, #ddd);
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: var(--color-primary, #2563eb);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .form-textarea {
          min-height: 120px;
          resize: vertical;
        }
        .form-error {
          color: var(--color-error, #ef4444);
          font-size: 0.85rem;
          margin-top: 4px;
        }
        .form-radio-group,
        .form-checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .radio-option,
        .checkbox-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border: 1px solid var(--color-border, #ddd);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .radio-option:hover,
        .checkbox-option:hover {
          border-color: var(--color-primary, #2563eb);
          background: var(--color-surface-hover, #f8f9fa);
        }
        .radio-option input[type="radio"],
        .checkbox-option input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }
        .form-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 32px;
          gap: 12px;
        }
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: var(--color-primary, #2563eb);
          color: white;
        }
        .btn-primary:hover {
          background: var(--color-primary-dark, #1d4ed8);
        }
        .btn-secondary {
          background: var(--color-surface, #f8f9fa);
          color: var(--color-text, #333);
          border: 1px solid var(--color-border, #ddd);
        }
        .btn-secondary:hover {
          background: var(--color-surface-hover, #e5e7eb);
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .step-form {
            padding: 24px;
          }
          .form-actions {
            flex-direction: column;
          }
          .btn {
            width: 100%;
          }
        }
      </style>
    `;
  }

  /**
   * Build progress indicator
   */
  buildProgressHTML() {
    const totalSteps = this.config.steps.length;
    const progress = ((this.currentStep + 1) / totalSteps) * 100;

    return `
      <div class="form-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-steps">
          ${this.config.steps.map((step, index) => `
            <div class="progress-step ${index === this.currentStep ? 'active' : ''} ${index < this.currentStep ? 'completed' : ''}">
              ${step.title || `Step ${index + 1}`}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Build current step HTML
   */
  buildCurrentStepHTML() {
    const step = this.config.steps[this.currentStep];
    if (!step) return '';

    const fieldsHTML = step.fields.map(field => this.buildFieldHTML(field)).join('');
    const actionsHTML = this.buildActionsHTML();

    return `
      <div class="step-title">${step.title || `Step ${this.currentStep + 1}`}</div>
      ${step.description ? `<div class="step-description">${step.description}</div>` : ''}
      ${fieldsHTML}
      ${actionsHTML}
    `;
  }

  /**
   * Build field HTML
   */
  buildFieldHTML(field) {
    const value = this.formData[field.name] || field.defaultValue || '';
    const error = this.validationErrors[field.name];
    const required = field.required ? '<span class="required">*</span>' : '';

    let fieldHTML = '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        fieldHTML = `
          <input type="${field.type}" 
                 name="${field.name}" 
                 class="form-input ${error ? 'error' : ''}"
                 placeholder="${field.placeholder || ''}"
                 value="${value}"
                 ${field.required ? 'required' : ''}
                 ${field.min ? `min="${field.min}"` : ''}
                 ${field.max ? `max="${field.max}"` : ''}>
        `;
        break;

      case 'textarea':
        fieldHTML = `
          <textarea name="${field.name}" 
                    class="form-textarea ${error ? 'error' : ''}"
                    placeholder="${field.placeholder || ''}"
                    ${field.required ? 'required' : ''}
                    rows="${field.rows || 4}">${value}</textarea>
        `;
        break;

      case 'select':
        fieldHTML = `
          <select name="${field.name}" 
                  class="form-select ${error ? 'error' : ''}"
                  ${field.required ? 'required' : ''}>
            ${field.placeholder ? `<option value="">${field.placeholder}</option>` : ''}
            ${field.options.map(opt => `
              <option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('')}
          </select>
        `;
        break;

      case 'radio':
        fieldHTML = `
          <div class="form-radio-group">
            ${field.options.map(opt => `
              <label class="radio-option">
                <input type="radio" 
                       name="${field.name}" 
                       value="${opt.value}"
                       ${value === opt.value ? 'checked' : ''}
                       ${field.required ? 'required' : ''}>
                <span>${opt.label}</span>
              </label>
            `).join('')}
          </div>
        `;
        break;

      case 'checkbox':
        const checkedValues = Array.isArray(value) ? value : [];
        fieldHTML = `
          <div class="form-checkbox-group">
            ${field.options.map(opt => `
              <label class="checkbox-option">
                <input type="checkbox" 
                       name="${field.name}[]" 
                       value="${opt.value}"
                       ${checkedValues.includes(opt.value) ? 'checked' : ''}>
                <span>${opt.label}</span>
              </label>
            `).join('')}
          </div>
        `;
        break;
    }

    return `
      <div class="form-group">
        <label class="form-label">
          ${field.label} ${required}
        </label>
        ${fieldHTML}
        ${error ? `<div class="form-error">${error}</div>` : ''}
        ${field.helpText ? `<div style="font-size: 0.85rem; color: var(--color-muted, #666); margin-top: 4px;">${field.helpText}</div>` : ''}
      </div>
    `;
  }

  /**
   * Build action buttons
   */
  buildActionsHTML() {
    const isFirstStep = this.currentStep === 0;
    const isLastStep = this.currentStep === this.config.steps.length - 1;

    return `
      <div class="form-actions">
        ${!isFirstStep && this.config.allowBackNavigation ? `
          <button type="button" class="btn btn-secondary" data-action="previous">
            Previous
          </button>
        ` : '<div></div>'}
        <button type="button" class="btn btn-primary" data-action="${isLastStep ? 'submit' : 'next'}">
          ${isLastStep ? (this.config.submitButtonText || 'Submit') : 'Next'}
        </button>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Form inputs - save data on change
    this.container.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('change', (e) => {
        this.saveFieldData(input);
      });
      input.addEventListener('blur', (e) => {
        this.validateField(input);
      });
    });

    // Navigation buttons
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-action');
        if (action === 'next') {
          this.nextStep();
        } else if (action === 'previous') {
          this.previousStep();
        } else if (action === 'submit') {
          this.handleSubmit();
        }
      });
    });
  }

  /**
   * Save field data
   */
  saveFieldData(input) {
    const name = input.name.replace('[]', '');
    let value;

    if (input.type === 'checkbox') {
      // Handle checkbox arrays
      const checkboxes = this.container.querySelectorAll(`input[name="${input.name}"]`);
      value = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    } else if (input.type === 'radio') {
      value = input.checked ? input.value : this.formData[name];
    } else {
      value = input.value;
    }

    this.formData[name] = value;

    // Persist to localStorage
    if (this.config.persistData) {
      this.persistData();
    }
  }

  /**
   * Validate field
   */
  validateField(input) {
    const name = input.name.replace('[]', '');
    const step = this.config.steps[this.currentStep];
    const field = step.fields.find(f => f.name === name);

    if (!field) return true;

    let error = null;

    // Required validation
    if (field.required) {
      if (input.type === 'checkbox') {
        const checked = this.container.querySelectorAll(`input[name="${input.name}"]:checked`).length > 0;
        if (!checked) error = 'This field is required';
      } else if (!input.value.trim()) {
        error = 'This field is required';
      }
    }

    // Type-specific validation
    if (!error && input.value) {
      if (field.type === 'email' && !this.isValidEmail(input.value)) {
        error = 'Please enter a valid email address';
      } else if (field.type === 'tel' && !this.isValidPhone(input.value)) {
        error = 'Please enter a valid phone number';
      } else if (field.type === 'number') {
        const num = parseFloat(input.value);
        if (isNaN(num)) {
          error = 'Please enter a valid number';
        } else {
          if (field.min !== undefined && num < field.min) {
            error = `Minimum value is ${field.min}`;
          }
          if (field.max !== undefined && num > field.max) {
            error = `Maximum value is ${field.max}`;
          }
        }
      }
    }

    // Custom validation
    if (!error && field.validate && typeof field.validate === 'function') {
      const customError = field.validate(input.value, this.formData);
      if (customError) error = customError;
    }

    // Update error display
    if (error) {
      this.validationErrors[name] = error;
      input.classList.add('error');
      const errorDiv = input.parentElement.querySelector('.form-error');
      if (errorDiv) {
        errorDiv.textContent = error;
      } else {
        const errorEl = document.createElement('div');
        errorEl.className = 'form-error';
        errorEl.textContent = error;
        input.parentElement.appendChild(errorEl);
      }
    } else {
      delete this.validationErrors[name];
      input.classList.remove('error');
      const errorDiv = input.parentElement.querySelector('.form-error');
      if (errorDiv) errorDiv.remove();
    }

    return !error;
  }

  /**
   * Validate current step
   */
  validateCurrentStep() {
    const step = this.config.steps[this.currentStep];
    let isValid = true;

    step.fields.forEach(field => {
      const input = this.container.querySelector(`[name="${field.name}"], [name="${field.name}[]"]`);
      if (input) {
        if (!this.validateField(input)) {
          isValid = false;
        }
      }
    });

    return isValid;
  }

  /**
   * Move to next step
   */
  nextStep() {
    if (!this.validateCurrentStep()) {
      return;
    }

    // Check conditional logic
    const step = this.config.steps[this.currentStep];
    if (step.conditional) {
      const shouldShow = this.evaluateCondition(step.conditional);
      if (!shouldShow) {
        // Skip this step
        this.currentStep++;
        if (this.currentStep < this.config.steps.length) {
          this.nextStep(); // Recursively check next step
        }
        return;
      }
    }

    if (this.currentStep < this.config.steps.length - 1) {
      this.currentStep++;
      this.render();
      this.attachEventListeners();
    }
  }

  /**
   * Move to previous step
   */
  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.render();
      this.attachEventListeners();
    }
  }

  /**
   * Evaluate conditional logic
   */
  evaluateCondition(conditional) {
    const { field, operator, value } = conditional;
    const fieldValue = this.formData[field];

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'notEquals':
        return fieldValue !== value;
      case 'contains':
        return Array.isArray(fieldValue) ? fieldValue.includes(value) : fieldValue?.includes(value);
      case 'greaterThan':
        return parseFloat(fieldValue) > parseFloat(value);
      case 'lessThan':
        return parseFloat(fieldValue) < parseFloat(value);
      default:
        return true;
    }
  }

  /**
   * Handle form submission
   */
  handleSubmit() {
    if (!this.validateCurrentStep()) {
      return;
    }

    // Collect all form data
    const finalData = { ...this.formData };

    if (this.config.onSubmit) {
      this.config.onSubmit(finalData);
    } else {
      console.log('Form submission:', finalData);
    }

    // Clear persisted data
    if (this.config.persistData) {
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * Persist data to localStorage
   */
  persistData() {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify({
        formData: this.formData,
        currentStep: this.currentStep
      }));
    } catch (e) {
      console.warn('Failed to persist form data:', e);
    }
  }

  /**
   * Load persisted data
   */
  loadPersistedData() {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.formData = data.formData || {};
        this.currentStep = data.currentStep || 0;
      }
    } catch (e) {
      console.warn('Failed to load persisted form data:', e);
    }
  }

  /**
   * Email validation
   */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Phone validation
   */
  isValidPhone(phone) {
    return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  /**
   * Get form data
   */
  getFormData() {
    return { ...this.formData };
  }

  /**
   * Reset form
   */
  reset() {
    this.formData = {};
    this.validationErrors = {};
    this.currentStep = 0;
    if (this.config.persistData) {
      localStorage.removeItem(this.config.storageKey);
    }
    this.render();
    this.attachEventListeners();
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MultiStepForm;
}

// Make available globally
window.MultiStepForm = MultiStepForm;

