import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { draftsService } from '../../services/drafts';
import { useToast } from '../../hooks/useToast';
import './PublishModal.css';

function PublishModal({ siteData, onClose }) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [formData, setFormData] = useState({
    subdomain: '',
    plan: 'starter',
  });
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 'Free',
      features: ['Display-only site', 'Custom subdomain', 'Mobile responsive'],
    },
    {
      id: 'checkout',
      name: 'Checkout',
      price: '$29/mo',
      features: ['Everything in Starter', 'Accept payments', 'Order management'],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$99/mo',
      features: ['Everything in Checkout', 'Multi-page layouts', 'Advanced features'],
    },
  ];

  const handlePublish = async () => {
    if (!formData.subdomain) {
      showError('Please enter a subdomain');
      return;
    }

    setLoading(true);

    try {
      let draftId = siteData.draftId;
      
      // If no draft exists, save one first
      if (!draftId) {
        const draftResponse = await fetch('/api/drafts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: siteData,
            template: siteData.template
          })
        });

        if (!draftResponse.ok) {
          throw new Error('Failed to save draft before publishing');
        }

        const draftData = await draftResponse.json();
        draftId = draftData.draftId || draftData.id;
      }

      // Now publish the draft
      const publishResponse = await fetch(`/api/drafts/${draftId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: formData.plan,
          subdomain: formData.subdomain,
        })
      });

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        throw new Error(error.error || error.message || 'Failed to publish site');
      }

      const result = await publishResponse.json();
      
      showSuccess(`🎉 Site published successfully at ${formData.subdomain}.sitesprintz.com!`);
      
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
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
          <p>Choose your plan and launch your site</p>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="subdomain">Choose Your Subdomain</label>
            <div className="subdomain-input">
              <input
                type="text"
                id="subdomain"
                value={formData.subdomain}
                onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="your-business"
              />
              <span className="subdomain-suffix">.sitesprintz.com</span>
            </div>
            <small className="form-hint">Only letters, numbers, and hyphens allowed</small>
          </div>

          <div className="plans-section">
            <h3>Select Plan</h3>
            <div className="plans-grid">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`plan-card ${formData.plan === plan.id ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, plan: plan.id })}
                >
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
                  {formData.plan === plan.id && (
                    <div className="selected-badge">
                      Selected
                    </div>
                  )}
                </div>
              ))}
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
            disabled={loading || !formData.subdomain}
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

