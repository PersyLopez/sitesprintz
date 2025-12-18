/**
 * ServiceRequestForm Component
 * 
 * Main form component for service requests. Renders base fields and
 * dynamically renders niche-specific fields based on template.
 */

import React from 'react';
import { useServiceRequestForm } from '../../hooks/useServiceRequestForm';
import NicheFieldRenderer from './NicheFieldRenderer';
import './ServiceRequestForm.css';

export function ServiceRequestForm({ templateId, subdomain, onSuccess, className = '' }) {
  const form = useServiceRequestForm(templateId, subdomain);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate before submitting
    const validation = form.validateForm();
    if (!validation.isValid) {
      // Error will be set by the form hook's submitRequest
      return;
    }

    const result = await form.submitRequest();
    if (result.success && onSuccess) {
      onSuccess(result.data);
    }
  };

  if (form.fetchingFields) {
    return (
      <div className={`service-request-form loading ${className}`}>
        <div className="loading-spinner">Loading form...</div>
      </div>
    );
  }

  return (
    <form 
      className={`service-request-form ${className}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <h3 className="form-title">Request Service</h3>

      {/* Base Fields - All niches */}
      <div className="form-section">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">
              Name <span className="required" aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.formData.name || ''}
              onChange={(e) => form.updateField('name', e.target.value)}
              required
              aria-required="true"
              aria-describedby={form.errors?.name ? "name-error" : undefined}
              placeholder="Your full name"
            />
            {form.errors?.name && (
              <div id="name-error" className="form-error" role="alert">
                {form.errors.name}
              </div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="email">
              Email <span className="required" aria-label="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.formData.email || ''}
              onChange={(e) => form.updateField('email', e.target.value)}
              required
              aria-required="true"
              aria-describedby={form.errors?.email ? "email-error" : undefined}
              placeholder="your@email.com"
            />
            {form.errors?.email && (
              <div id="email-error" className="form-error" role="alert">
                {form.errors.email}
              </div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={form.formData.phone || ''}
              onChange={(e) => form.updateField('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </div>

      {/* Date/Time Picker */}
      <div className="form-section">
        <h4 className="section-title">Preferred Date & Time</h4>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="preferred_date">Preferred Date</label>
            <input
              type="date"
              id="preferred_date"
              name="preferred_date"
              value={form.formData.preferred_date || ''}
              onChange={(e) => form.updateField('preferred_date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="form-group">
            <label htmlFor="preferred_time">Preferred Time</label>
            <input
              type="time"
              id="preferred_time"
              name="preferred_time"
              value={form.formData.preferred_time || ''}
              onChange={(e) => form.updateField('preferred_time', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Niche-Specific Fields */}
      {form.nicheFields.length > 0 && (
        <div className="form-section">
          <h4 className="section-title">Additional Information</h4>
          <NicheFieldRenderer
            fields={form.nicheFields}
            formData={form.formData}
            updateField={form.updateField}
          />
        </div>
      )}

      {/* Message Field */}
      <div className="form-section">
        <div className="form-group">
          <label htmlFor="message">Additional Message</label>
          <textarea
            id="message"
            name="message"
            value={form.formData.message || ''}
            onChange={(e) => form.updateField('message', e.target.value)}
            rows={4}
            placeholder="Any additional information or special requests..."
          />
        </div>
      </div>

      {/* Error Message */}
      {form.error && (
        <div className="form-error" role="alert" aria-live="polite">
          {form.error}
        </div>
      )}

      {/* Success Message */}
      {form.success && (
        <div className="form-success" role="alert">
          <strong>Success!</strong> Your request has been submitted. We'll contact you soon.
        </div>
      )}

      {/* Submit Button */}
      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={form.loading}
        >
          {form.loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
}

export default ServiceRequestForm;

