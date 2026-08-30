import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { api } from '../../services/api';
import { initializeStripe } from '../../utils/stripe';
import { PRICING_CONFIG } from '../../config/pricing.config';
import { getPublishedSiteUrl } from '../../utils/siteWorkspace';
import './PublishModal.css';

function PublishModal({ siteData, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const cardElementRef = useRef(null);
  const stripeInstanceRef = useRef(null);
  const [stripePublishableKey, setStripePublishableKey] = useState(null);
  const [isEligibleForTrial, setIsEligibleForTrial] = useState(false);
  const [checkingTrialEligibility, setCheckingTrialEligibility] = useState(true);
  const [paymentMethodCollected, setPaymentMethodCollected] = useState(false);
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState(null);
  const [collectingPayment, setCollectingPayment] = useState(false);

  const getTemplateRequiredPlan = () => {
    const templateId = siteData.template || siteData.id || '';
    const tier = siteData.tier || siteData.plan || '';
    if (tier === 'Premium' || tier === 'premium') return 'growth';
    if (tier === 'Pro' || tier === 'pro') return 'growth';
    if (tier === 'Growth' || tier === 'growth') return 'growth';
    if (templateId.endsWith('-pro') || templateId.endsWith('-premium')) return 'growth';

    // Checkout / ordering templates need Growth (cart + Stripe), not Pro
    const commerceTemplates = ['product-ordering', 'restaurant-ordering', 'product-showcase'];
    if (commerceTemplates.includes(templateId)) return 'growth';

    const bookingHeavy = ['salon', 'gym', 'cleaning', 'pet-care', 'tech-repair', 'electrician', 'auto-repair', 'plumbing', 'tow-truck'];
    if (bookingHeavy.includes(templateId)) return 'growth';

    return 'starter';
  };

  const requiredPlan = getTemplateRequiredPlan();
  const [formData, setFormData] = useState({ plan: requiredPlan });
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      id: 'starter',
      name: PRICING_CONFIG.tiers.starter.name,
      price: `$${PRICING_CONFIG.tiers.starter.price}/mo`,
      features: PRICING_CONFIG.tiers.starter.summary,
      trialPrice: 'Free for 7 days',
    },
    {
      id: 'growth',
      name: PRICING_CONFIG.tiers.growth.name,
      price: `$${PRICING_CONFIG.tiers.growth.price}/mo`,
      features: PRICING_CONFIG.tiers.growth.summary,
      trialPrice: 'Free for 7 days',
      popular: true,
    },
  ];

  // Check trial eligibility and get Stripe publishable key
  useEffect(() => {
    const checkTrialEligibility = async () => {
      try {
        // Check if user has published sites
        const sitesResponse = await api.get('/api/sites');
        // API returns { success: true, data: { sites: [...] } } or { sites: [...] }
        const sites = Array.isArray(sitesResponse) 
          ? sitesResponse 
          : (sitesResponse?.data?.sites || sitesResponse?.sites || []);
        const publishedSites = sites.filter(site => site.status === 'published');
        setIsEligibleForTrial(publishedSites.length === 0);

        // Get Stripe publishable key
        const configResponse = await api.get('/api/payments/config');
        if (configResponse.publishableKey) {
          setStripePublishableKey(configResponse.publishableKey);
          // Initialize Stripe
          const stripe = await initializeStripe(configResponse.publishableKey);
          stripeInstanceRef.current = stripe;
        }
      } catch (error) {
        console.error('Error checking trial eligibility:', error);
        setIsEligibleForTrial(false);
      } finally {
        setCheckingTrialEligibility(false);
      }
    };

    checkTrialEligibility();
  }, []);

  // Initialize Stripe card element when publishable key is available
  useEffect(() => {
    if (stripePublishableKey && stripeInstanceRef.current && isEligibleForTrial && !paymentMethodCollected) {
      const stripe = stripeInstanceRef.current;
      const elements = stripe.elements();
      const cardElement = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
          invalid: {
            color: '#9e2146',
          },
        },
      });

      if (cardElementRef.current) {
        cardElement.mount(cardElementRef.current);
      }

      return () => {
        if (cardElement) {
          cardElement.unmount();
        }
      };
    }
  }, [stripePublishableKey, isEligibleForTrial, paymentMethodCollected]);

  const collectPaymentMethod = async () => {
    if (!stripeInstanceRef.current || !isEligibleForTrial) {
      return null;
    }

    setCollectingPayment(true);

    try {
      // Create Setup Intent
      const setupIntentResponse = await api.post('/api/payments/trial/setup-intent', {
        plan: formData.plan
      });

      const { clientSecret } = setupIntentResponse;

      if (!clientSecret) {
        throw new Error('Failed to create setup intent');
      }

      setSetupIntentClientSecret(clientSecret);

      // Confirm Setup Intent with card element
      const stripe = stripeInstanceRef.current;
      const elements = stripe.elements();
      const cardElement = elements.getElement('card');

      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setPaymentMethodCollected(true);
      return setupIntent.payment_method;
    } catch (error) {
      console.error('Payment method collection error:', error);
      showError(error.message || 'Failed to collect payment method. Please try again.');
      throw error;
    } finally {
      setCollectingPayment(false);
    }
  };

  const createTrialSubscription = async (paymentMethodId, draftId = null) => {
    try {
      const subscriptionResponse = await api.post('/api/payments/trial/create-subscription', {
        plan: formData.plan,
        paymentMethodId: paymentMethodId,
        draftId: draftId
      });

      return subscriptionResponse;
    } catch (error) {
      console.error('Subscription creation error:', error);
      showError(error.message || 'Failed to create subscription. Please try again.');
      throw error;
    }
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
          // Persist editor content so Starter/Growth features survive publish
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

      // If eligible for trial and payment method not collected yet, collect it now
      if (isEligibleForTrial && !paymentMethodCollected) {
        try {
          const paymentMethodId = await collectPaymentMethod();
          if (!paymentMethodId) {
            return; // Error already shown
          }
          // Create subscription with trial (pass draftId for reference)
          await createTrialSubscription(paymentMethodId, draftId);
          showSuccess('Payment method saved. Starting your 7-day free trial!');
        } catch (error) {
          // Error already shown
          return;
        }
      }

      const result = await api.post(`/api/drafts/${draftId}/publish`, {
        plan: formData.plan,
        email: user.email
      });

      const subdomain = result.subdomain || result.site?.subdomain;
      const siteUrl = result.url || getPublishedSiteUrl(subdomain) || `/view/${encodeURIComponent(subdomain)}`;

      showSuccess(`🎉 Site published successfully!`);

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
          {isEligibleForTrial && (
            <div className="trial-notice">
              <div className="trial-badge">7-day free trial</div>
              <p>Add a card to publish. You won’t be charged until the trial ends.</p>
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

          {/* Payment Method Collection for Trial */}
          {isEligibleForTrial && !paymentMethodCollected && stripePublishableKey && (
            <div className="payment-method-section">
              <h4>💳 Payment Method Required</h4>
              <p>We need a payment method to start your free trial. You won't be charged until after 7 days.</p>
              <div id="card-element" ref={cardElementRef} className="card-element-container"></div>
              <div id="card-errors" className="card-errors" role="alert"></div>
              {collectingPayment && (
                <div className="payment-loading">Processing payment method...</div>
              )}
            </div>
          )}

          {isEligibleForTrial && paymentMethodCollected && (
            <div className="payment-success">
              <span className="status-icon">✓</span>
              <span>Payment method saved. Your trial will start when you publish.</span>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button 
            onClick={handlePublish} 
            className="btn btn-primary" 
            disabled={loading || collectingPayment || (isEligibleForTrial && !paymentMethodCollected && stripePublishableKey)}
          >
            {loading ? 'Publishing...' : collectingPayment ? 'Processing...' : isEligibleForTrial ? '🚀 Start Trial & Publish' : '🚀 Publish Site'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublishModal;
