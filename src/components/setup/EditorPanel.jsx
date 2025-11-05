import React, { useState } from 'react';
import { useSite } from '../../hooks/useSite';
import BusinessInfoForm from './forms/BusinessInfoForm';
import './EditorPanel.css';

function EditorPanel() {
  const { siteData, updateField, addService, updateService, deleteService } = useSite();
  const [activeSection, setActiveSection] = useState('business');

  const sections = [
    { id: 'business', label: 'Business Info', icon: '🏢' },
    { id: 'services', label: 'Services', icon: '✨' },
    { id: 'contact', label: 'Contact', icon: '📞' },
    { id: 'colors', label: 'Colors', icon: '🎨' },
  ];

  const renderServices = () => (
    <div className="editor-section">
      <div className="services-header">
        <h3>Your Services</h3>
        <button
          onClick={() => addService({
            name: '',
            description: '',
            price: '',
          })}
          className="btn btn-primary btn-sm"
        >
          + Add Service
        </button>
      </div>

      {siteData.services && siteData.services.length > 0 ? (
        <div className="services-list">
          {siteData.services.map((service) => (
            <div key={service.id} className="service-item">
              <div className="form-group">
                <input
                  type="text"
                  value={service.name || service.title || ''}
                  onChange={(e) => updateService(service.id, { name: e.target.value, title: e.target.value })}
                  placeholder="Service name"
                />
              </div>

              <div className="form-group">
                <textarea
                  value={service.description || ''}
                  onChange={(e) => updateService(service.id, { description: e.target.value })}
                  placeholder="Service description"
                  rows={2}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <input
                    type="text"
                    value={service.price || ''}
                    onChange={(e) => updateService(service.id, { price: e.target.value })}
                    placeholder="$99"
                  />
                </div>

                <button
                  onClick={() => deleteService(service.id)}
                  className="btn btn-danger btn-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-services">
          <p>No services added yet. Click "Add Service" to get started.</p>
        </div>
      )}
    </div>
  );

  const renderContact = () => (
    <div className="editor-section">
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
    </div>
  );

  const renderColors = () => (
    <div className="editor-section">
      <div className="form-group">
        <label htmlFor="primaryColor">Primary Color</label>
        <div className="color-input-group">
          <input
            type="color"
            id="primaryColor"
            value={siteData.themeVars?.['color-primary'] || siteData.colors?.primary || '#06b6d4'}
            onChange={(e) => updateField('themeVars.color-primary', e.target.value)}
          />
          <input
            type="text"
            value={siteData.themeVars?.['color-primary'] || siteData.colors?.primary || '#06b6d4'}
            onChange={(e) => updateField('themeVars.color-primary', e.target.value)}
            placeholder="#06b6d4"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="accentColor">Accent Color</label>
        <div className="color-input-group">
          <input
            type="color"
            id="accentColor"
            value={siteData.themeVars?.['color-accent'] || siteData.colors?.accent || '#14b8a6'}
            onChange={(e) => updateField('themeVars.color-accent', e.target.value)}
          />
          <input
            type="text"
            value={siteData.themeVars?.['color-accent'] || siteData.colors?.accent || '#14b8a6'}
            onChange={(e) => updateField('themeVars.color-accent', e.target.value)}
            placeholder="#14b8a6"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="editor-panel-container">
      <div className="editor-tabs">
        {sections.map((section) => (
          <button
            key={section.id}
            className={`editor-tab ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span className="tab-icon">{section.icon}</span>
            <span className="tab-label">{section.label}</span>
          </button>
        ))}
      </div>

      <div className="editor-content">
        {activeSection === 'business' && <BusinessInfoForm />}
        {activeSection === 'services' && renderServices()}
        {activeSection === 'contact' && renderContact()}
        {activeSection === 'colors' && renderColors()}
      </div>
    </div>
  );
}

export default EditorPanel;
