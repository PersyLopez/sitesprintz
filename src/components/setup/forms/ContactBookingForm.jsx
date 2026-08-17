import React, { useState } from 'react';
import { useSite } from '../../../hooks/useSite';
import './ContactBookingForm.css';

function ContactBookingForm() {
  const { siteData, updateField, updateNestedField } = useSite();
  const [showBooking, setShowBooking] = useState(
    siteData.booking?.enabled || false
  );

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
    <div className="contact-booking-form">
      {/* Contact Section */}
      <div className="form-section">
        <h3>Contact Information</h3>
        <p className="section-subtitle">How customers can reach you</p>

        <div className="form-group">
          <label htmlFor="contactEmail">Email</label>
          <input
            type="email"
            id="contactEmail"
            value={siteData.contact?.email || siteData.contactEmail || ''}
            onChange={(e) => updateField('contact.email', e.target.value)}
            placeholder="contact@yourbusiness.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="contactPhone">Phone</label>
          <input
            type="tel"
            id="contactPhone"
            value={siteData.contact?.phone || siteData.contactPhone || ''}
            onChange={(e) => updateField('contact.phone', e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>

        <div className="form-group">
          <label htmlFor="contactAddress">Address</label>
          <textarea
            id="contactAddress"
            value={siteData.contact?.address || siteData.contactAddress || ''}
            onChange={(e) => updateField('contact.address', e.target.value)}
            placeholder="123 Main St, City, State 12345"
            rows={2}
          />
        </div>

        <div className="form-group">
          <label htmlFor="businessHours">Business Hours</label>
          <textarea
            id="businessHours"
            value={siteData.contact?.hours || siteData.businessHours || ''}
            onChange={(e) => updateField('contact.hours', e.target.value)}
            placeholder="Mon-Fri: 9am-5pm"
            rows={2}
          />
        </div>

        <div className="form-group">
          <label htmlFor="facebookUrl">Facebook URL</label>
          <input
            type="url"
            id="facebookUrl"
            value={siteData.social?.facebook || siteData.facebookUrl || ''}
            onChange={(e) => updateField('social.facebook', e.target.value)}
            placeholder="https://facebook.com/yourbusiness"
          />
        </div>

        <div className="form-group">
          <label htmlFor="instagramUrl">Instagram URL</label>
          <input
            type="url"
            id="instagramUrl"
            value={siteData.social?.instagram || siteData.instagramUrl || ''}
            onChange={(e) => updateField('social.instagram', e.target.value)}
            placeholder="https://instagram.com/yourbusiness"
          />
        </div>

        <div className="form-group">
          <label htmlFor="whatsappUrl">WhatsApp</label>
          <input
            type="text"
            id="whatsappUrl"
            value={siteData.social?.whatsapp || ''}
            onChange={(e) => updateField('social.whatsapp', e.target.value)}
            placeholder="phone or https://wa.me/..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="tiktokUrl">TikTok URL</label>
          <input
            type="url"
            id="tiktokUrl"
            value={siteData.social?.tiktok || ''}
            onChange={(e) => updateField('social.tiktok', e.target.value)}
            placeholder="https://tiktok.com/@yourbusiness"
          />
        </div>

        <div className="form-group">
          <label htmlFor="googleMapsUrl">Google Maps URL</label>
          <input
            type="url"
            id="googleMapsUrl"
            value={siteData.social?.maps || siteData.googleMapsUrl || ''}
            onChange={(e) => updateField('social.maps', e.target.value)}
            placeholder="https://maps.google.com/..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="websiteUrl">Website URL</label>
          <input
            type="url"
            id="websiteUrl"
            value={siteData.social?.website || ''}
            onChange={(e) => updateField('social.website', e.target.value)}
            placeholder="https://yourbusiness.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="linkedinUrl">LinkedIn URL</label>
          <input
            type="url"
            id="linkedinUrl"
            value={siteData.social?.linkedin || ''}
            onChange={(e) => updateField('social.linkedin', e.target.value)}
            placeholder="https://linkedin.com/company/yourbusiness"
          />
        </div>
      </div>

      {/* Booking Section */}
      <div className="form-section booking-section">
        <div className="section-toggle">
          <div>
            <h3>📅 Appointment Booking</h3>
            <p className="section-subtitle">Enable online booking for appointments</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={booking.enabled}
              onChange={(e) => {
                updateBooking('enabled', e.target.checked);
                setShowBooking(e.target.checked);
              }}
            />
            <span className="toggle-slider"></span>
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
      </div>
    </div>
  );
}

export default ContactBookingForm;



