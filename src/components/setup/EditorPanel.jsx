import React, { useState, useEffect, useRef } from 'react';
import { useSite } from '../../hooks/useSite';
import { useAuth } from '../../hooks/useAuth';
import { sitesService } from '../../services/sites';
import BusinessInfoForm from './forms/BusinessInfoForm';
import ProductsEditor from './forms/ProductsEditor';
import BookingEditor from './forms/BookingEditor';
import PaymentSettings from './forms/PaymentSettings';
import './EditorPanel.css';

function EditorPanel() {
  const { siteData, updateField, addService, updateService, deleteService } = useSite();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('business');
  const contentRef = useRef(null);
  const sectionRefs = useRef({});
  const isScrollingRef = useRef(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [publishedSitesCount, setPublishedSitesCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);

  // Check if user has Pro plan for advanced features
  // NOTE: We allow editing all features in draft mode, only gate publishing
  const isPro = user?.plan === 'pro' || user?.plan === 'business';
  const hasActiveTrial = user?.subscription_status === 'trial';
  const hasActiveSubscription = user?.subscription_status === 'active';

  // Determine trial eligibility: first site publish only
  const isEligibleForTrial = publishedSitesCount === 0 && !hasActiveTrial && !hasActiveSubscription;

  // Allow all editing - don't gate any features during draft/editing
  // Only require subscription when publishing
  const needsProAccess = false; // Always false - no gating during editing

  const sections = [
    { id: 'business', label: 'Business Info', icon: '🏢' },
    { id: 'services', label: 'Services', icon: '✨' },
    { id: 'contact', label: 'Contact', icon: '📞' },
    { id: 'colors', label: 'Colors', icon: '🎨' },
    { id: 'products', label: 'Products', icon: '🛍️' },
    { id: 'booking', label: 'Booking', icon: '📅' },
    { id: 'payments', label: 'Payments', icon: '💳' },
  ];

  // Fetch user's published sites count on mount
  useEffect(() => {
    const fetchPublishedCount = async () => {
      if (!user?.id) {
        setLoadingCount(false);
        return;
      }

      try {
        const sites = await sitesService.getUserSites(user.id);
        // Count only published sites (not drafts)
        const published = Array.isArray(sites)
          ? sites.filter(site => site.status === 'published' || site.publishedAt).length
          : 0;
        setPublishedSitesCount(published);
      } catch (error) {
        console.error('Error fetching published sites count:', error);
        setPublishedSitesCount(0);
      } finally {
        setLoadingCount(false);
      }
    };

    fetchPublishedCount();
  }, [user?.id]);

  // Don't show upgrade banner during editing - only at publish time
  useEffect(() => {
    if (loadingCount) return;
    // Never show banner during editing phase
    setShowUpgradeBanner(false);
  }, [siteData.template, loadingCount]);

  // Handle upgrade/trial start
  const handleStartTrial = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/register.html?plan=pro';
        return;
      }

      // Create checkout session with trial
      const response = await fetch('/api/payments/create-subscription-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: 'pro',
          draftId: siteData.id
        })
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Trial/subscription start error:', error);
      alert('Failed to start. Please try again or contact support.');
    }
  };

  // Get appropriate CTA text based on trial eligibility
  const getCtaText = () => {
    if (hasActiveTrial) {
      return { primary: '✅ Trial Active', secondary: 'Manage Subscription' };
    }
    if (isEligibleForTrial) {
      return { primary: '🚀 Start 15-Day Free Trial', secondary: 'No charge until trial ends' };
    }
    return { primary: '⭐ Subscribe to Pro', secondary: 'Unlock all features' };
  };

  const ctaText = getCtaText();

  // Scroll spy: Update active tab based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingRef.current || !contentRef.current) return;

      const scrollPosition = contentRef.current.scrollTop;
      const sections = Object.keys(sectionRefs.current);

      // Find which section is currently in view
      for (let i = sections.length - 1; i >= 0; i--) {
        const sectionId = sections[i];
        const element = sectionRefs.current[sectionId];

        if (element) {
          const { offsetTop } = element;
          // Consider section active if we're within 100px of it
          if (scrollPosition >= offsetTop - 100) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Smooth scroll to section when tab is clicked
  const handleTabClick = (sectionId) => {
    const element = sectionRefs.current[sectionId];
    if (element && contentRef.current) {
      isScrollingRef.current = true;

      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      setActiveSection(sectionId);

      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  };

  const renderServices = () => (
    <div className="editor-section" data-section="services" ref={el => sectionRefs.current['services'] = el}>
      <div className="section-header">
        <h2>✨ Services</h2>
        <p className="section-description">Add and manage your service offerings</p>
      </div>

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
    <div className="editor-section" data-section="contact" ref={el => sectionRefs.current['contact'] = el}>
      <div className="section-header">
        <h2>📞 Contact Information</h2>
        <p className="section-description">Update your business contact details</p>
      </div>

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
        <label htmlFor="googleMapsUrl">Google Maps URL</label>
        <input
          type="url"
          id="googleMapsUrl"
          value={siteData.social?.maps || siteData.googleMapsUrl || ''}
          onChange={(e) => updateField('social.maps', e.target.value)}
          placeholder="https://maps.google.com/..."
        />
      </div>
    </div>
  );

  const renderColors = () => (
    <div className="editor-section" data-section="colors" ref={el => sectionRefs.current['colors'] = el}>
      <div className="section-header">
        <h2>🎨 Brand Colors</h2>
        <p className="section-description">Customize your site's color scheme</p>
      </div>

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

  const handleTabClickDeprecated = (sectionId, isPro) => {
    if (isPro && !isPro) {
      // Show upgrade prompt
      alert('This is a Pro feature. Upgrade your plan to access it!');
      return;
    }
    setActiveSection(sectionId);
  };

  return (
    <div className="editor-panel-container">
      {/* Upgrade Banner - Shows when Pro template selected without Pro plan */}
      {showUpgradeBanner && (
        <div className="upgrade-banner">
          <div className="banner-content">
            <div className="banner-icon">
              {hasActiveTrial ? '✅' : isEligibleForTrial ? '🎯' : '⭐'}
            </div>
            <div className="banner-text">
              <h3>
                {hasActiveTrial
                  ? 'Trial Active - All Features Unlocked!'
                  : isEligibleForTrial
                    ? "Start Your Free Trial!"
                    : 'Subscribe to Publish Your Site'}
              </h3>
              <p>
                {hasActiveTrial
                  ? `Your 15-day trial is active. All pro features available until ${user?.trial_expires_at ? new Date(user.trial_expires_at).toLocaleDateString() : 'trial ends'}.`
                  : isEligibleForTrial
                    ? 'Your first site qualifies for a 15-day free trial! Start now to unlock Stripe payments, booking widgets, and all premium features. No charge until trial ends.'
                    : 'Subscribe to Pro to publish and unlock all features. Note: Free trial is only available for your first published site.'}
              </p>
            </div>
            <div className="banner-actions">
              {!hasActiveTrial && (
                <button onClick={handleStartTrial} className="btn btn-primary btn-trial">
                  {ctaText.primary}
                </button>
              )}
              <a href={hasActiveTrial ? '/dashboard' : '/pricing'} className="btn btn-secondary-link">
                {hasActiveTrial ? 'View Dashboard' : 'Learn More'}
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="editor-tabs">
        {sections.map((section) => (
          <button
            key={section.id}
            className={`editor-tab ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => handleTabClick(section.id)}
          >
            <span className="tab-icon">{section.icon}</span>
            <span className="tab-label">{section.label}</span>
          </button>
        ))}
      </div>

      <div className="editor-content" ref={contentRef}>
        <div data-section="business" ref={el => sectionRefs.current['business'] = el}>
          <div className="section-header">
            <h2>🏢 Business Information</h2>
            <p className="section-description">Tell us about your business</p>
          </div>
          <BusinessInfoForm />
        </div>

        {renderServices()}
        {renderContact()}
        {renderColors()}

        {/* All features now available during editing - no upgrade prompts */}
        <div data-section="products" ref={el => sectionRefs.current['products'] = el}>
          <div className="section-header">
            <h2>🛍️ Products</h2>
            <p className="section-description">Manage your product catalog</p>
          </div>
          <ProductsEditor />
        </div>

        <div data-section="booking" ref={el => sectionRefs.current['booking'] = el}>
          <div className="section-header">
            <h2>📅 Booking</h2>
            <p className="section-description">Configure appointment booking</p>
          </div>
          <BookingEditor />
        </div>

        <div data-section="payments" ref={el => sectionRefs.current['payments'] = el}>
          <div className="section-header">
            <h2>💳 Payments</h2>
            <p className="section-description">Set up payment processing</p>
          </div>
          <PaymentSettings />
        </div>
      </div>
    </div>
  );
}

// Removed renderUpgradePrompt - no longer needed

export default EditorPanel;
