/**
 * Foundation Settings Component
 * 
 * Dashboard UI for configuring foundation features:
 * - Trust Signals
 * - Contact Forms
 * - SEO
 * - Social Media
 * - Contact Bar
 */
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import FoundationPreview from './FoundationPreview';
import './FoundationSettings.css';

const SOCIAL_PROFILE_FIELDS = [
  { key: 'facebook', label: 'Facebook URL', placeholder: 'https://facebook.com/yourbusiness' },
  { key: 'instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/yourbusiness' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/15551234567', inputType: 'text' },
  { key: 'tiktok', label: 'TikTok URL', placeholder: 'https://tiktok.com/@yourbusiness' },
  { key: 'maps', label: 'Google Maps URL', placeholder: 'https://maps.google.com/...' },
  { key: 'website', label: 'Website URL', placeholder: 'https://yourbusiness.com' },
  { key: 'linkedin', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/company/yourbusiness' },
];

const DEFAULT_SOCIAL_PROFILES = {
  facebook: '',
  instagram: '',
  whatsapp: '',
  tiktok: '',
  maps: '',
  website: '',
  linkedin: '',
};

function filledSocial(source = {}) {
  const out = {};
  for (const key of Object.keys(DEFAULT_SOCIAL_PROFILES)) {
    if (source[key]) out[key] = source[key];
  }
  if (source.maps || source.googleMapsUrl) out.maps = source.maps || source.googleMapsUrl;
  if (source.twitter) out.twitter = source.twitter;
  if (source.youtube) out.youtube = source.youtube;
  return out;
}

function configFromSite(site) {
  const base = site?.site_data?.foundation || getDefaultConfig();
  return {
    ...base,
    socialMedia: {
      ...getDefaultConfig().socialMedia,
      ...base.socialMedia,
      profiles: {
        ...DEFAULT_SOCIAL_PROFILES,
        ...base.socialMedia?.profiles,
        ...filledSocial(site?.site_data?.social),
      },
    },
  };
}

export default function FoundationSettings({ site, onUpdate }) {
  const [config, setConfig] = useState(() => configFromSite(site));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('trustSignals');
  const [showPreview, setShowPreview] = useState(true);

  const isGrowth = site.plan === 'growth' || site.plan === 'pro' || site.plan === 'premium';
  const isPro = isGrowth; // legacy alias

  // Load initial config — siteData.social wins so Foundation cannot drift
  useEffect(() => {
    setConfig(configFromSite(site));
  }, [site]);

  // Save configuration
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const data = await api.put(`/api/foundation/config/${site.subdomain}`, { foundation: config });
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      if (onUpdate) onUpdate(data.foundation);
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Update a specific feature config
  const updateFeature = (feature, updates) => {
    setConfig(prev => ({
      ...prev,
      [feature]: {
        ...(prev[feature] || {}),
        ...updates
      }
    }));
  };

  return (
    <div className="foundation-settings-with-preview">
      {/* Preview Toggle (Mobile) */}
      <div className="preview-toggle-mobile">
        <button
          className={`toggle-btn ${showPreview ? 'active' : ''}`}
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? '📝 Edit' : '👁️ Preview'}
        </button>
      </div>

      {/* Settings Panel */}
      <div className={`foundation-settings ${showPreview ? 'with-preview' : ''}`}>
        <div className="settings-header">
          <h2>Foundation Features</h2>
          <p>Configure core features for your website</p>

          {/* Desktop Preview Toggle */}
          <button
            className="preview-toggle-desktop"
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? 'Hide Preview' : 'Show Preview'}
          >
            {showPreview ? '👁️ Hide Preview' : '👁️ Show Preview'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button
            className={activeTab === 'trustSignals' ? 'active' : ''}
            onClick={() => setActiveTab('trustSignals')}
          >
            Trust Signals
          </button>
          <button
            className={activeTab === 'contactForm' ? 'active' : ''}
            onClick={() => setActiveTab('contactForm')}
          >
            Contact Form
          </button>
          <button
            className={activeTab === 'seo' ? 'active' : ''}
            onClick={() => setActiveTab('seo')}
          >
            SEO
          </button>
          <button
            className={activeTab === 'socialMedia' ? 'active' : ''}
            onClick={() => setActiveTab('socialMedia')}
          >
            Social Media
          </button>
          <button
            className={activeTab === 'contactBar' ? 'active' : ''}
            onClick={() => setActiveTab('contactBar')}
          >
            Contact Bar
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {/* Trust Signals Tab */}
          {activeTab === 'trustSignals' && (
            <div className="settings-panel">
              <h3>Trust Signals</h3>
              <p className="panel-description">
                Display trust badges to increase credibility and conversions
              </p>

              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={config.trustSignals?.enabled || false}
                    onChange={(e) => updateFeature('trustSignals', { enabled: e.target.checked })}
                  />
                  <span>Enable Trust Signals</span>
                </label>
              </div>

              {config.trustSignals?.enabled && (
                <>
                  <div className="form-group">
                    <label>
                      Years in Business
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={config.trustSignals?.yearsInBusiness || 0}
                        onChange={(e) => updateFeature('trustSignals', { yearsInBusiness: parseInt(e.target.value) })}
                      />
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={config.trustSignals?.showSSLBadge !== false}
                        onChange={(e) => updateFeature('trustSignals', { showSSLBadge: e.target.checked })}
                      />
                      <span>Show SSL Secure Badge</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={config.trustSignals?.showVerifiedBadge !== false}
                        onChange={(e) => updateFeature('trustSignals', { showVerifiedBadge: e.target.checked })}
                      />
                      <span>Show Verified Business Badge</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={config.trustSignals?.showPaymentIcons !== false}
                        onChange={(e) => updateFeature('trustSignals', { showPaymentIcons: e.target.checked })}
                      />
                      <span>Show Payment Security Icons</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Contact Form Tab */}
          {activeTab === 'contactForm' && (
            <div className="settings-panel">
              <h3>Contact Form</h3>
              <p className="panel-description">
                Capture leads with a professional contact form
              </p>

              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={config.contactForm?.enabled || false}
                    onChange={(e) => updateFeature('contactForm', { enabled: e.target.checked })}
                  />
                  <span>Enable Contact Form</span>
                </label>
              </div>

              {config.contactForm?.enabled && (
                <>
                  <div className="form-group">
                    <label>
                      Recipient Email *
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={config.contactForm?.recipientEmail || ''}
                        onChange={(e) => updateFeature('contactForm', { recipientEmail: e.target.value })}
                        required
                      />
                    </label>
                    <small>Where should form submissions be sent?</small>
                  </div>

                  <div className="form-group">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={config.contactForm?.autoResponder?.enabled !== false}
                        onChange={(e) => updateFeature('contactForm', {
                          autoResponder: {
                            ...config.contactForm?.autoResponder,
                            enabled: e.target.checked
                          }
                        })}
                      />
                      <span>Enable Auto-Responder</span>
                    </label>
                  </div>

                  {config.contactForm?.autoResponder?.enabled !== false && (
                    <div className="form-group">
                      <label>
                        Auto-Responder Message
                        <textarea
                          rows="3"
                          placeholder="Thank you for contacting us! We'll respond within 24 hours."
                          value={config.contactForm?.autoResponder?.message || ''}
                          onChange={(e) => updateFeature('contactForm', {
                            autoResponder: {
                              ...config.contactForm?.autoResponder,
                              message: e.target.value
                            }
                          })}
                        />
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="settings-panel">
              <h3>SEO Optimization</h3>
              <p className="panel-description">
                Improve your search engine rankings automatically
              </p>

              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={config.seo?.enabled !== false}
                    onChange={(e) => updateFeature('seo', { enabled: e.target.checked })}
                  />
                  <span>Enable SEO Features</span>
                </label>
              </div>

              {config.seo?.enabled !== false && (
                <>
                  <div className="form-group">
                    <label>
                      Business Type
                      <select
                        value={config.seo?.businessType || 'LocalBusiness'}
                        onChange={(e) => updateFeature('seo', { businessType: e.target.value })}
                      >
                        <option value="LocalBusiness">Local Business</option>
                        <option value="Restaurant">Restaurant</option>
                        <option value="BeautySalon">Beauty Salon</option>
                        <option value="ExerciseGym">Gym / Fitness</option>
                        <option value="AutoRepair">Auto Repair</option>
                        <option value="Plumber">Plumbing</option>
                        <option value="Electrician">Electrical</option>
                        <option value="ProfessionalService">Professional Service</option>
                      </select>
                    </label>
                    <small>Used for schema.org markup</small>
                  </div>

                  <div className="form-group">
                    <label>
                      Custom Meta Description
                      <textarea
                        rows="2"
                        placeholder="A brief description of your business for search engines..."
                        value={config.seo?.customMetaDescription || ''}
                        onChange={(e) => updateFeature('seo', { customMetaDescription: e.target.value })}
                        maxLength="160"
                      />
                    </label>
                    <small>{(config.seo?.customMetaDescription || '').length}/160 characters</small>
                  </div>

                  <div className="form-group">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={config.seo?.autoGenerateAltTags !== false}
                        onChange={(e) => updateFeature('seo', { autoGenerateAltTags: e.target.checked })}
                      />
                      <span>Auto-generate image alt tags</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={config.seo?.lazyLoadImages !== false}
                        onChange={(e) => updateFeature('seo', { lazyLoadImages: e.target.checked })}
                      />
                      <span>Enable image lazy loading</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Social Media Tab */}
          {activeTab === 'socialMedia' && (
            <div className="settings-panel">
              <h3>Social Media</h3>
              <p className="panel-description">
                Connect your social media profiles
              </p>

              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={config.socialMedia?.enabled || false}
                    onChange={(e) => updateFeature('socialMedia', { enabled: e.target.checked })}
                  />
                  <span>Enable Social Media Links</span>
                </label>
              </div>

              {config.socialMedia?.enabled && (
                <>
                  {SOCIAL_PROFILE_FIELDS.map((field) => (
                    <div className="form-group" key={field.key}>
                      <label>
                        {field.label}
                        <input
                          type={field.inputType || 'url'}
                          placeholder={field.placeholder}
                          value={config.socialMedia?.profiles?.[field.key] || ''}
                          onChange={(e) => updateFeature('socialMedia', {
                            profiles: {
                              ...config.socialMedia?.profiles,
                              [field.key]: e.target.value
                            }
                          })}
                        />
                      </label>
                    </div>
                  ))}

                  <div className="form-group">
                    <label>
                      Display Position
                      <select
                        value={config.socialMedia?.position || 'footer'}
                        onChange={(e) => updateFeature('socialMedia', { position: e.target.value })}
                      >
                        <option value="header">Header</option>
                        <option value="footer">Footer</option>
                      </select>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Contact Bar Tab */}
          {activeTab === 'contactBar' && (
            <div className="settings-panel">
              <h3>Contact Bar</h3>
              <p className="panel-description">
                Quick access buttons for customers to reach you
              </p>

              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={config.contactBar?.enabled || false}
                    onChange={(e) => updateFeature('contactBar', { enabled: e.target.checked })}
                  />
                  <span>Enable Contact Bar</span>
                </label>
              </div>

              {config.contactBar?.enabled && (
                <>
                  <div className="form-group">
                    <label>
                      Phone Number
                      <input
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={config.contactBar?.phone || ''}
                        onChange={(e) => updateFeature('contactBar', { phone: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="form-group">
                    <label>
                      Email Address
                      <input
                        type="email"
                        placeholder="contact@yourbusiness.com"
                        value={config.contactBar?.email || ''}
                        onChange={(e) => updateFeature('contactBar', { email: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="form-group">
                    <label>
                      Display Style
                      <select
                        value={config.contactBar?.position || 'floating'}
                        onChange={(e) => updateFeature('contactBar', { position: e.target.value })}
                      >
                        <option value="floating">Floating Buttons (Bottom Right)</option>
                        <option value="fixed">Fixed Bar (Top)</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={config.contactBar?.showOnMobile !== false}
                        onChange={(e) => updateFeature('contactBar', { showOnMobile: e.target.checked })}
                      />
                      <span>Show on Mobile Devices</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Save Button & Messages */}
        <div className="settings-footer">
          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="preview-panel">
          <FoundationPreview site={site} config={config} />
        </div>
      )}
    </div>
  );
}

function getDefaultConfig() {
  return {
    trustSignals: {
      enabled: true,
      yearsInBusiness: 5,
      showSSLBadge: true,
      showVerifiedBadge: true,
      showPaymentIcons: true
    },
    contactForm: {
      enabled: false,
      recipientEmail: '',
      autoResponder: {
        enabled: true,
        message: 'Thank you for contacting us! We\'ll respond within 24 hours.'
      }
    },
    seo: {
      enabled: true,
      businessType: 'LocalBusiness',
      customMetaDescription: '',
      autoGenerateAltTags: true,
      lazyLoadImages: true
    },
    socialMedia: {
      enabled: false,
      profiles: { ...DEFAULT_SOCIAL_PROFILES },
      position: 'footer'
    },
    contactBar: {
      enabled: false,
      phone: '',
      email: '',
      position: 'floating',
      showOnMobile: true
    }
  };
}

