import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { api } from '../../services/api';
import { PRICING_CONFIG, PLATFORM_SUPPORT_EMAIL } from '../../config/pricing.config';
import { getPublishedSiteUrl } from '../../utils/siteWorkspace';
import './PublishModal.css';

function PublishModal({ siteData, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isEligibleForTrial, setIsEligibleForTrial] = useState(false);
  const [checkingTrialEligibility, setCheckingTrialEligibility] = useState(true);

  const trialDays = PRICING_CONFIG.trial.duration;
  const trialLabel = `Free for ${trialDays} days — no card required`;

  const getTemplateRequiredPlan = () => {
    const templateId = siteData.template || siteData.id || '';
    const tier = siteData.tier || siteData.plan || '';
    if (tier === 'Premium' || tier === 'premium') return 'growth';
    if (tier === 'Pro' || tier === 'pro') return 'growth';
    if (tier === 'Growth' || tier === 'growth') return 'growth';
    if (templateId.endsWith('-pro') || templateId.endsWith('-premium')) return 'growth';

    const commerceTemplates = ['product-ordering', 'restaurant-ordering', 'product-showcase'];
    if (commerceTemplates.includes(templateId)) return 'growth';

    const bookingHeavy = ['salon', 'gym', 'cleaning', 'pet-care', 'tech-repair', 'electrician', 'auto-repair', 'plumbing', 'tow-truck'];
    if (bookingHeavy.includes(templateId)) return 'growth';

    return 'starter';
  };

  const requiredPlan = getTemplateRequiredPlan();
  const [formData, setFormData] = useState({ plan: requiredPlan });
  const [loading, setLoading] = useState(false);
  const [billablePublishedCount, setBillablePublishedCount] = useState(0);
  const [collectsPayments, setCollectsPayments] = useState(false);

  const plans = [
    {
      id: 'starter',
      name: PRICING_CONFIG.tiers.starter.name,
      price: `$${PRICING_CONFIG.tiers.starter.price}/mo`,
      features: PRICING_CONFIG.tiers.starter.summary,
      trialPrice: trialLabel,
    },
    {
      id: 'growth',
      name: PRICING_CONFIG.tiers.growth.name,
      price: `$${PRICING_CONFIG.tiers.growth.price}/mo`,
      features: PRICING_CONFIG.tiers.growth.summary,
      trialPrice: trialLabel,
      popular: true,
    },
  ];

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.billing?.collectsPayments != null) {
          setCollectsPayments(Boolean(data.billing.collectsPayments));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const checkTrialEligibility = async () => {
      try {
        const sitesResponse = await api.get('/api/sites');
        const sites = Array.isArray(sitesResponse)
          ? sitesResponse
          : (sitesResponse?.data?.sites || sitesResponse?.sites || []);
        const publishedSites = sites.filter((site) => {
          const subdomain = site.subdomain || '';
          return site.status === 'published' && !subdomain.startsWith('gallery-');
        });
        setBillablePublishedCount(publishedSites.length);
        setIsEligibleForTrial(publishedSites.length === 0);
      } catch (error) {
        console.error('Error checking trial eligibility:', error);
        setIsEligibleForTrial(false);
      } finally {
        setCheckingTrialEligibility(false);
      }
    };

    checkTrialEligibility();
  }, []);

  const startAdditionalSiteCheckout = async (draftId) => {
    const checkout = await api.post('/api/payments/create-subscription-checkout', {
      plan: formData.plan,
      additionalSite: true,
      draftId,
    });
    const url = checkout.url || checkout.data?.url;
    if (!url) {
      throw new Error(checkout.error || 'Failed to start checkout for this site.');
    }
    window.location.href = url;
  };

  const handlePublish = async () => {
    if (!user?.email) {
      showError('Please log in to publish your site');
      return;
    }

    if (!siteData.brand?.name && !siteData.businessName) {
      showError('Please add your business name before publishing');
      return;
    }

    setLoading(true);
    let createdDraftId = null;

    try {
      const phone = siteData.contact?.phone || siteData.brand?.phone || siteData.contactPhone || '';
      const email = siteData.contact?.email || siteData.brand?.email || siteData.contactEmail || '';
      const cleanPhone = phone.trim();
      const isValidPhone = cleanPhone && /^[\+]?[1-9][\d\s\-\(\)]{7,}$/.test(cleanPhone);
      const cleanEmail = email.trim();
      const isValidEmail = cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

      const draftData = {
        templateId: siteData.template || siteData.id || siteData._niche,
        businessData: {
          businessName: siteData.brand?.name || siteData.businessName,
          heroTitle: siteData.hero?.title || siteData.heroTitle,
          heroSubtitle: siteData.hero?.subtitle || siteData.heroSubtitle,
          heroImage: siteData.hero?.image || siteData.heroImage,
          ...(isValidEmail && { email: cleanEmail }),
          ...(isValidPhone && { phone: cleanPhone }),
          address: siteData.contact?.address || siteData.contactAddress,
          businessHours: siteData.contact?.hours || siteData.businessHours,
          websiteUrl: siteData.social?.website || siteData.websiteUrl,
          facebookUrl: siteData.social?.facebook || siteData.facebookUrl,
          instagramUrl: siteData.social?.instagram || siteData.instagramUrl,
          googleMapsUrl: siteData.social?.maps || siteData.googleMapsUrl,
          whatsappUrl: siteData.social?.whatsapp,
          tiktokUrl: siteData.social?.tiktok,
          linkedinUrl: siteData.social?.linkedin,
          services: siteData.services || siteData.products || [],
          colors: siteData.colors || siteData.themeVars,
          templateSpecific: siteData.custom || {},
          sections: siteData.sections,
          gallery: siteData.gallery,
          faq: siteData.faq,
          team: siteData.team,
          booking: siteData.booking,
          menu: siteData.menu,
          products: siteData.products,
          testimonials: siteData.testimonials,
          contact: siteData.contact,
          brand: siteData.brand,
          hero: siteData.hero,
          features: siteData.features,
          settings: siteData.settings,
          beforeAfter: siteData.beforeAfter,
          hours: siteData.hours || siteData.contact?.hours,
          social: siteData.social,
          nav: siteData.nav,
          _layout: siteData._layout,
          _level: siteData._level,
          _niche: siteData._niche,
          _features: siteData._features,
          _operatingModel: siteData._operatingModel,
          _theme: siteData._theme,
          _themeId: siteData._themeId
        }
      };

      const { draftId } = await api.post('/api/drafts', draftData);
      createdDraftId = draftId;

      const result = await api.post(`/api/drafts/${draftId}/publish`, {
        plan: formData.plan,
        email: user.email
      });

      const subdomain = result.subdomain || result.site?.subdomain;
      const siteUrl = result.url || getPublishedSiteUrl(subdomain) || `/view/${encodeURIComponent(subdomain)}`;

      if (isEligibleForTrial) {
        showSuccess(`Your site is live for ${trialDays} days — no card required.`);
      } else {
        showSuccess('Site published successfully!');
      }

      const linkNotification = document.createElement('div');
      linkNotification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        padding: 20px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
      `;
      linkNotification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px;">✅ Your site is live!</div>
        <a href="${siteUrl}" target="_blank" style="color: white; text-decoration: underline; word-break: break-all;">
          ${siteUrl}
        </a>
      `;
      document.body.appendChild(linkNotification);

      setTimeout(() => {
        linkNotification.style.transition = 'opacity 0.3s';
        linkNotification.style.opacity = '0';
        setTimeout(() => linkNotification.remove(), 300);
      }, 8000);

      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      console.error('Publish error:', error);
      const code = error.payload?.code;
      if (code === 'SUBSCRIPTION_REQUIRED') {
        if (collectsPayments === false) {
          showError(`One live site for now. Email ${PLATFORM_SUPPORT_EMAIL} to publish another.`);
          return;
        }
        try {
          await startAdditionalSiteCheckout(createdDraftId);
          return;
        } catch (checkoutError) {
          showError(checkoutError.message || 'Pay for another plan to publish this site.');
          return;
        }
      }
      showError(error.message || 'Failed to publish site. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content publish-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-header">
          <h2>🚀 Publish Your Website</h2>
          <p>Choose your plan and launch {siteData.brand?.name || siteData.businessName || 'your site'}</p>
        </div>
        <div className="modal-body">
          {isEligibleForTrial && !checkingTrialEligibility && (
            <div className="trial-notice" data-testid="live-trial-notice">
              <p>
                Your first site goes live for {trialDays} days with no payment method. Subscribe before the trial ends to keep it online.
              </p>
            </div>
          )}

          {billablePublishedCount > 0 && collectsPayments !== false && (
            <div className="trial-notice" data-testid="additional-site-pay-notice">
              <p>Each plan covers one live site. Publishing this one starts checkout for another plan.</p>
            </div>
          )}

          {billablePublishedCount > 0 && collectsPayments === false && (
            <div className="trial-notice" data-testid="additional-site-billing-closed">
              <p>
                One live site for now. Email{' '}
                <a href={`mailto:${PLATFORM_SUPPORT_EMAIL}`}>{PLATFORM_SUPPORT_EMAIL}</a> to publish another.
              </p>
            </div>
          )}

          <div className="plans-grid">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`plan-card ${formData.plan === plan.id ? 'selected' : ''} ${plan.popular ? 'plan-card--popular' : ''}`}
                onClick={() => setFormData({ ...formData, plan: plan.id })}
              >
                <h4>{plan.name}</h4>
                <div className="plan-price">
                  {isEligibleForTrial ? plan.trialPrice : plan.price}
                </div>
                {isEligibleForTrial && (
                  <div className="trial-label">Then {plan.price}</div>
                )}
                <ul className="plan-features">
                  {plan.features.map((f, i) => <li key={i}>✓ {f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            onClick={handlePublish}
            className="btn btn-primary"
            disabled={loading || checkingTrialEligibility}
            data-testid="publish-submit"
          >
            {loading ? 'Publishing...' : isEligibleForTrial ? `🚀 Publish — ${trialDays}-Day Trial` : '🚀 Publish Site'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublishModal;
