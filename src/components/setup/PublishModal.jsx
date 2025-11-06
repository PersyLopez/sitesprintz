import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { draftsService } from '../../services/drafts';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import './PublishModal.css';

function PublishModal({ siteData, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  // Detect template tier and set default plan accordingly
  const getTemplateRequiredPlan = () => {
    const templateId = siteData.template || siteData.id || '';
    
    // Check template tier from metadata (most reliable)
    const tier = siteData.tier || siteData.plan || '';
    if (tier === 'Premium') {
      return 'premium';
    }
    if (tier === 'Pro') {
      return 'pro';
    }
    
    // Check if it's a Pro template by ID suffix
    if (templateId.endsWith('-pro')) {
      return 'pro';
    }
    
    // Pro templates with payment processing
    const proTemplates = ['product-ordering', 'restaurant-ordering'];
    if (proTemplates.includes(templateId)) {
      return 'pro';
    }
    
    // Premium templates
    const premiumTemplates = ['home-services-premium', 'medical-premium', 'legal-premium', 'real-estate-premium'];
    if (premiumTemplates.includes(templateId)) {
      return 'premium';
    }
    
    // Default to starter
    return 'starter';
  };
  
  const requiredPlan = getTemplateRequiredPlan();
  
  const [formData, setFormData] = useState({
    plan: requiredPlan, // Default to template's required plan
  });
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 'Free',
      features: ['Display-only site', 'Custom subdomain', 'Mobile responsive', 'Contact forms'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$25-49/mo',
      features: ['Everything in Starter', 'Stripe payments', 'Order management', 'Embedded booking'],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$99/mo',
      features: ['Everything in Pro', 'Multi-page layouts', 'Live chat', 'Advanced features'],
    },
  ];

  const handlePublish = async () => {
    if (!user || !user.email) {
      showError('Please log in to publish your site');
      return;
    }

    if (!siteData.brand?.name && !siteData.businessName) {
      showError('Please add your business name before publishing');
      return;
    }

    // Check if paid plan and user needs to pay
    if (formData.plan !== 'starter' && !user.subscription) {
      // TODO: Show payment modal or redirect to payment
      showError(`${formData.plan === 'pro' ? 'Pro' : 'Premium'} plan requires a subscription. Payment integration coming soon!`);
      // For now, we'll allow it (since we disabled subscription checks)
      // setShowPayment(true);
      // return;
    }

    setLoading(true);

    try {
      // Prepare draft data - match server expectations
      // Get phone from various possible locations
      const phone = siteData.contact?.phone || siteData.brand?.phone || siteData.contactPhone || '';
      const email = siteData.contact?.email || siteData.brand?.email || siteData.contactEmail || '';
      
      // Clean up phone - remove if empty or invalid format
      const cleanPhone = phone.trim();
      const isValidPhone = cleanPhone && /^[\+]?[1-9][\d\s\-\(\)]{7,}$/.test(cleanPhone);
      
      // Clean up email - remove if empty or invalid format
      const cleanEmail = email.trim();
      const isValidEmail = cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
      
      const draftData = {
        templateId: siteData.template || siteData.id,
        businessData: {
          businessName: siteData.brand?.name || siteData.businessName,
          heroTitle: siteData.hero?.title || siteData.heroTitle,
          heroSubtitle: siteData.hero?.subtitle || siteData.heroSubtitle,
          heroImage: siteData.hero?.image || siteData.heroImage,
          // Only include email if it's valid
          ...(isValidEmail && { email: cleanEmail }),
          // Only include phone if it's valid
          ...(isValidPhone && { phone: cleanPhone }),
          address: siteData.contact?.address || siteData.contactAddress,
          businessHours: siteData.contact?.hours || siteData.businessHours,
          websiteUrl: siteData.social?.website || siteData.websiteUrl,
          facebookUrl: siteData.social?.facebook || siteData.facebookUrl,
          instagramUrl: siteData.social?.instagram || siteData.instagramUrl,
          googleMapsUrl: siteData.social?.maps || siteData.googleMapsUrl,
          services: siteData.services || siteData.products || [],
          colors: siteData.colors || siteData.themeVars,
          templateSpecific: siteData.custom || {}
        }
      };
      
      // Create draft first
      const draftResponse = await fetch('/api/drafts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(draftData)
      });

      if (!draftResponse.ok) {
        const errorData = await draftResponse.json();
        throw new Error(errorData.error || 'Failed to save draft before publishing');
      }

      const { draftId } = await draftResponse.json();

      // Now publish the draft
      const publishResponse = await fetch(`/api/drafts/${draftId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: formData.plan,
          email: user.email
        })
      });

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        throw new Error(error.error || error.message || 'Failed to publish site');
      }

      const result = await publishResponse.json();
      const subdomain = result.subdomain || result.site?.subdomain;
      const siteUrl = result.url || `http://localhost:3000/sites/${subdomain}/`;
      
      showSuccess(`🎉 Site published successfully!`);
      
      // Show clickable link in a custom notification
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
        <div style="margin-top: 12px; font-size: 0.9rem; opacity: 0.9;">
          Click to view your published site
        </div>
      `;
      document.body.appendChild(linkNotification);
      
      setTimeout(() => {
        linkNotification.style.transition = 'opacity 0.3s';
        linkNotification.style.opacity = '0';
        setTimeout(() => linkNotification.remove(), 300);
      }, 8000);
      
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
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
          {requiredPlan !== 'starter' && (
            <div className="plan-requirement-notice">
              <span className="notice-icon">ℹ️</span>
              This template requires the <strong>{requiredPlan === 'pro' ? 'Pro' : 'Premium'}</strong> plan
            </div>
          )}
        </div>

        <div className="modal-body">
          <div className="plans-section">
            <h3>Select Plan</h3>
            <div className="plans-grid">
              {plans.map((plan) => {
                const isPlanRequired = requiredPlan === plan.id;
                const isPlanDisabled = requiredPlan !== 'starter' && plan.id === 'starter';
                
                return (
                  <div
                    key={plan.id}
                    className={`plan-card ${formData.plan === plan.id ? 'selected' : ''} ${isPlanRequired ? 'required' : ''} ${isPlanDisabled ? 'disabled' : ''}`}
                    onClick={() => !isPlanDisabled && setFormData({ ...formData, plan: plan.id })}
                  >
                    {isPlanRequired && (
                      <div className="required-badge">
                        Required for this template
                      </div>
                    )}
                    {isPlanDisabled && (
                      <div className="disabled-badge">
                        Not available for this template
                      </div>
                    )}
                    <div className="plan-header">
                      <h4>{plan.name}</h4>
                      <div className="plan-price">{plan.price}</div>
                    </div>
                    <ul className="plan-features">
                      {plan.features.map((feature, index) => (
                        <li key={index}>
                          <span>✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                    {formData.plan === plan.id && !isPlanRequired && (
                      <div className="selected-badge">
                        Selected
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handlePublish}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner-sm"></span>
                Publishing...
              </>
            ) : (
              <>
                🚀 Publish Site
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublishModal;

