import React from 'react';
import { useSite } from '../../../hooks/useSite';
import './BookingEditor.css';

function BookingEditor() {
  const { siteData, updateNestedField } = useSite();
  
  const booking = siteData.booking || {
    enabled: false,
    provider: 'calendly',
    url: '',
    style: 'inline'
  };

  const updateBooking = (field, value) => {
    updateNestedField(`booking.${field}`, value);
  };

  const providers = [
    { value: 'calendly', label: 'Calendly', icon: '📅' },
    { value: 'acuity', label: 'Acuity Scheduling', icon: '🗓️' },
    { value: 'square', label: 'Square Appointments', icon: '🔲' },
    { value: 'calcom', label: 'Cal.com', icon: '📆' }
  ];

  return (
    <div className="booking-editor">
      <div className="editor-header">
        <div>
          <h3>📅 Booking Configuration</h3>
          <p className="editor-subtitle">Set up online appointment booking</p>
        </div>
      </div>

      <div className="form-group">
        <label className="checkbox-label main-toggle">
          <input
            type="checkbox"
            checked={booking.enabled}
            onChange={(e) => updateBooking('enabled', e.target.checked)}
          />
          <span>Enable booking widget on your site</span>
        </label>
      </div>

      {booking.enabled && (
        <div className="booking-config">
          <div className="form-group">
            <label>Booking Provider</label>
            <p className="form-help">Choose your preferred booking platform</p>
            <div className="provider-grid">
              {providers.map((provider) => (
                <button
                  key={provider.value}
                  type="button"
                  className={`provider-option ${booking.provider === provider.value ? 'selected' : ''}`}
                  onClick={() => updateBooking('provider', provider.value)}
                >
                  <span className="provider-icon">{provider.icon}</span>
                  <span className="provider-label">{provider.label}</span>
                  {booking.provider === provider.value && (
                    <span className="selected-badge">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Booking URL *</label>
            <input
              type="url"
              value={booking.url}
              onChange={(e) => updateBooking('url', e.target.value)}
              placeholder={`e.g., https://calendly.com/yourbusiness/30min`}
            />
            <small className="form-help">
              Get your booking URL from your {providers.find(p => p.value === booking.provider)?.label} account
            </small>
          </div>

          <div className="form-group">
            <label>Display Style</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  value="inline"
                  checked={booking.style === 'inline'}
                  onChange={(e) => updateBooking('style', e.target.value)}
                />
                <div className="radio-content">
                  <strong>Inline (Embedded)</strong>
                  <span>Widget appears directly on your page</span>
                </div>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="popup"
                  checked={booking.style === 'popup'}
                  onChange={(e) => updateBooking('style', e.target.value)}
                />
                <div className="radio-content">
                  <strong>Popup (Modal)</strong>
                  <span>Opens in a modal window when clicked</span>
                </div>
              </label>
            </div>
          </div>

          {booking.url && (
            <div className="booking-preview">
              <h4>Preview</h4>
              <div className="preview-box">
                <div className="preview-content">
                  <span className="preview-icon">
                    {providers.find(p => p.value === booking.provider)?.icon}
                  </span>
                  <div className="preview-text">
                    <p><strong>Booking widget will appear here</strong></p>
                    <small>
                      {booking.style === 'inline' 
                        ? 'Embedded inline on your page' 
                        : 'Opens in popup when button is clicked'}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="editor-tip">
        <span className="tip-icon">💡</span>
        <div>
          <strong>Pro Feature:</strong> Embedded booking widgets keep visitors on your site,
          improving conversion rates by up to 25% compared to external links.
        </div>
      </div>
    </div>
  );
}

export default BookingEditor;

