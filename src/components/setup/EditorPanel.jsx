import React, { useState } from 'react';
import { useSite } from '../../hooks/useSite';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { sitesService } from '../../services/sites';
import { isTrialingStatus } from '../../config/tiers';
import BusinessInfoForm from './forms/BusinessInfoForm';
import ServicesProductsEditor from './forms/ServicesProductsEditor';
import ContactBookingForm from './forms/ContactBookingForm';
import ThemePicker from './forms/ThemePicker';
import './EditorPanel.css';

function EditorPanel() {
  const { siteData, undo, redo, canUndo, canRedo } = useSite();
  const { user } = useAuth();
  const { showError } = useToast();
  const [activeSection, setActiveSection] = useState('essentials');
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [publishedSitesCount, setPublishedSitesCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);

  const hasActiveTrial = isTrialingStatus(user?.subscription_status);
  const hasActiveSubscription = user?.subscription_status === 'active';
  const isEligibleForTrial = publishedSitesCount === 0 && !hasActiveTrial && !hasActiveSubscription;

  const sections = [
    { id: 'essentials', label: 'Essentials', icon: '📋' },
    { id: 'design', label: 'Design', icon: '🎨' },
    { id: 'services', label: 'Services & Products', icon: '✨' },
    { id: 'contact', label: 'Contact & Booking', icon: '📞' },
  ];

  React.useEffect(() => {
    const fetchPublishedCount = async () => {
      if (!user?.id) {
        setLoadingCount(false);
        return;
      }

      try {
        const sites = await sitesService.getUserSites(user.id);
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

  React.useEffect(() => {
    if (loadingCount) return;
    setShowUpgradeBanner(false);
  }, [siteData.template, loadingCount]);

  const handleStartTrial = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/register?plan=growth';
        return;
      }

      const origin = window.location?.origin;
      const payload = {
        plan: 'growth',
        draftId: siteData.id,
      };
      if (origin) {
        payload.successUrl = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=growth&draftId=${encodeURIComponent(siteData.id || '')}`;
      }
      if (window.location?.href) {
        payload.cancelUrl = window.location.href;
      }

      const response = await fetch('/api/payments/create-subscription-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Trial/subscription start error:', error);
      showError('Failed to start trial. Please try again or contact support.');
    }
  };

  const getCtaText = () => {
    if (hasActiveTrial) {
      return { primary: '✅ Trial Active', secondary: 'Manage Subscription' };
    }
    if (isEligibleForTrial) {
      return { primary: '🚀 Start 7-Day Free Trial', secondary: 'Payment method required - no charge until trial ends' };
    }
    return { primary: '⭐ Subscribe to Growth', secondary: 'Unlock all features' };
  };

  const ctaText = getCtaText();

  const handleTabClick = (sectionId) => {
    setActiveSection(sectionId);
  };

  const handleTabKeyDown = (event) => {
    const currentIndex = sections.findIndex((section) => section.id === activeSection);
    if (currentIndex < 0) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setActiveSection(sections[(currentIndex + 1) % sections.length].id);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setActiveSection(sections[(currentIndex - 1 + sections.length) % sections.length].id);
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'essentials':
        return (
          <>
            <div className="section-header">
              <h2>📋 Essentials</h2>
              <p className="section-description">Basic information about your business</p>
            </div>
            <BusinessInfoForm />
          </>
        );
      case 'design':
        return (
          <div className="editor-section">
            <div className="section-header">
              <h2>Look</h2>
              <p className="section-description">Pick one of six contrast-checked themes. Accents and text colors are locked together.</p>
            </div>
            <ThemePicker templateId={siteData.template || siteData.templateId} />
          </div>
        );
      case 'services':
        return (
          <>
            <div className="section-header">
              <h2>✨ Services & Products</h2>
              <p className="section-description">Manage your services and product catalog</p>
            </div>
            <ServicesProductsEditor />
          </>
        );
      case 'contact':
        return (
          <>
            <div className="section-header">
              <h2>📞 Contact & Booking</h2>
              <p className="section-description">Contact information and appointment booking</p>
            </div>
            <ContactBookingForm />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="editor-panel-container">
      {showUpgradeBanner && (
        <div className="upgrade-banner">
          <div className="banner-content">
            <div className="banner-icon">
              {hasActiveTrial ? '✅' : isEligibleForTrial ? '🎯' : '⭐'}
            </div>
            <div className="banner-text">
              <h3>
                {hasActiveTrial
                  ? 'Trial Active — Starter features'
                  : isEligibleForTrial
                    ? "Start Your Free Trial!"
                    : 'Subscribe to Publish Your Site'}
              </h3>
              <p>
                {hasActiveTrial
                  ? `Your 7-day trial is active. Starter features (site, contact, hours) until ${user?.trial_expires_at ? new Date(user.trial_expires_at).toLocaleDateString() : 'trial ends'}.`
                  : isEligibleForTrial
                    ? 'Your first site qualifies for a 7-day free trial! Payment method required to start. You won\'t be charged until after your trial ends.'
                    : 'Subscribe to a plan to publish and unlock all features. Note: Free trial is only available for your first published site.'}
              </p>
            </div>
            <div className="banner-actions">
              {!hasActiveTrial && (
                <button onClick={handleStartTrial} className="btn btn-primary btn-trial">
                  {ctaText.primary}
                </button>
              )}
              <a href={hasActiveTrial ? '/dashboard' : '/#pricing'} className="btn btn-secondary-link">
                {hasActiveTrial ? 'View Dashboard' : 'Learn More'}
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="editor-header-actions">
        <div className="undo-redo-buttons">
          <button
            className="btn btn-secondary btn-sm"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Cmd+Z)"
            aria-label="Undo last change"
          >
            ↶ Undo
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Cmd+Shift+Z)"
            aria-label="Redo last undone change"
          >
            ↷ Redo
          </button>
        </div>
      </div>

      <div
        className="editor-tabs"
        role="tablist"
        aria-label="Editor sections"
        onKeyDown={handleTabKeyDown}
      >
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            id={`editor-tab-${section.id}`}
            aria-selected={activeSection === section.id}
            aria-controls={`editor-panel-${section.id}`}
            tabIndex={activeSection === section.id ? 0 : -1}
            className={`editor-tab ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => handleTabClick(section.id)}
          >
            <span className="tab-icon">{section.icon}</span>
            <span className="tab-label">{section.label}</span>
          </button>
        ))}
      </div>

      <div className="editor-content">
        <div
          role="tabpanel"
          id={`editor-panel-${activeSection}`}
          aria-labelledby={`editor-tab-${activeSection}`}
          data-section={activeSection}
        >
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
}

export default EditorPanel;
