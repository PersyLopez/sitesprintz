import React, { useState, useEffect, useRef } from 'react';
import { useSite } from '../../hooks/useSite';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { sitesService } from '../../services/sites';
import BusinessInfoForm from './forms/BusinessInfoForm';
import ServicesProductsEditor from './forms/ServicesProductsEditor';
import ContactBookingForm from './forms/ContactBookingForm';
import ThemePicker from './forms/ThemePicker';
import './EditorPanel.css';

function EditorPanel() {
  const { siteData, updateField, addService, updateService, deleteService, undo, redo, canUndo, canRedo } = useSite();
  const { user } = useAuth();
  const { showError } = useToast();
  const [activeSection, setActiveSection] = useState('essentials');
  const contentRef = useRef(null);
  const sectionRefs = useRef({});
  const isScrollingRef = useRef(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [publishedSitesCount, setPublishedSitesCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);

  // Growth (and legacy pro) unlock advanced publish features
  const isPro = ['growth', 'pro', 'premium'].includes(user?.plan);
  const hasActiveTrial = user?.subscription_status === 'trial';
  const hasActiveSubscription = user?.subscription_status === 'active';

  // Determine trial eligibility: first site publish only
  const isEligibleForTrial = publishedSitesCount === 0 && !hasActiveTrial && !hasActiveSubscription;

  // Allow all editing - don't gate any features during draft/editing
  // Only require subscription when publishing
  const needsProAccess = false; // Always false - no gating during editing

  const sections = [
    { id: 'essentials', label: 'Essentials', icon: '📋' },
    { id: 'design', label: 'Design', icon: '🎨' },
    { id: 'services', label: 'Services & Products', icon: '✨' },
    { id: 'contact', label: 'Contact & Booking', icon: '📞' },
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
      showError('Failed to start trial. Please try again or contact support.');
    }
  };

  // Get appropriate CTA text based on trial eligibility
  const getCtaText = () => {
    if (hasActiveTrial) {
      return { primary: '✅ Trial Active', secondary: 'Manage Subscription' };
    }
    if (isEligibleForTrial) {
      return { primary: '🚀 Start 7-Day Free Trial', secondary: 'Payment method required - no charge until trial ends' };
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

  const renderDesign = () => (
    <div className="editor-section" data-section="design" ref={el => sectionRefs.current['design'] = el}>
      <div className="section-header">
        <h2>Look</h2>
        <p className="section-description">Pick one of six contrast-checked themes. Accents and text colors are locked together.</p>
      </div>

      <ThemePicker templateId={siteData.template || siteData.templateId} />
    </div>
  );

  const handleTabClickDeprecated = (sectionId) => {
    showError('This is a Pro feature. Upgrade your plan to access it!');
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
                  ? `Your 7-day trial is active. All features available until ${user?.trial_expires_at ? new Date(user.trial_expires_at).toLocaleDateString() : 'trial ends'}.`
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
              <a href={hasActiveTrial ? '/dashboard' : '/pricing'} className="btn btn-secondary-link">
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
        <div data-section="essentials" ref={el => sectionRefs.current['essentials'] = el}>
          <div className="section-header">
            <h2>📋 Essentials</h2>
            <p className="section-description">Basic information about your business</p>
          </div>
          <BusinessInfoForm />
        </div>

        {renderDesign()}

        <div data-section="services" ref={el => sectionRefs.current['services'] = el}>
          <div className="section-header">
            <h2>✨ Services & Products</h2>
            <p className="section-description">Manage your services and product catalog</p>
          </div>
          <ServicesProductsEditor />
        </div>

        <div data-section="contact" ref={el => sectionRefs.current['contact'] = el}>
          <div className="section-header">
            <h2>📞 Contact & Booking</h2>
            <p className="section-description">Contact information and appointment booking</p>
          </div>
          <ContactBookingForm />
        </div>
      </div>
    </div>
  );
}

// Removed renderUpgradePrompt - no longer needed

export default EditorPanel;
