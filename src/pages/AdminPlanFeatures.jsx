import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import AdminSubnav from '../components/admin/AdminSubnav';
import Footer from '../components/layout/Footer';
import { FEATURES, PLAN_FEATURES, FEATURE_NAMES, PLAN_INFO } from '../utils/planFeatures';
import { TIER_HIERARCHY, TIERS } from '../config/tiers';
import './AdminPlanFeatures.css';

const SOFTWARE_PLANS = TIER_HIERARCHY.filter((plan) => plan !== TIERS.GROWTH_MANAGED);

function AdminPlanFeatures() {
  const { token } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Feature configuration state
  const [planFeatures, setPlanFeatures] = useState({
    trial: [...(PLAN_FEATURES.trial || [])],
    starter: [...(PLAN_FEATURES.starter || [])],
    growth: [...(PLAN_FEATURES.growth || [])],
  });

  const loadPlanFeatures = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/admin/plan-features', {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load plan features');
      }

      const data = await response.json();
      if (data.planFeatures) {
        setPlanFeatures({
          trial: [...(data.planFeatures.trial || [])],
          starter: [...(data.planFeatures.starter || [])],
          growth: [...(data.planFeatures.growth || [])],
        });
      }
    } catch (error) {
      console.error('Load plan features error:', error);
      showError('Failed to load plan features');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadPlanFeatures();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Check if a feature is enabled for a plan
  const isFeatureEnabled = (plan, feature) => {
    return planFeatures[plan]?.includes(feature) || false;
  };

  const planHierarchy = [...SOFTWARE_PLANS];

  // Toggle feature for a plan
  const toggleFeature = (plan, feature) => {
    setPlanFeatures(prev => {
      const currentFeatures = prev[plan] || [];
      const isEnabled = currentFeatures.includes(feature);
      
      let newFeatures;
      if (isEnabled) {
        // Remove feature
        newFeatures = currentFeatures.filter(f => f !== feature);
      } else {
        // Add feature
        newFeatures = [...currentFeatures, feature];
      }
      
      // Handle inheritance - if removing from lower tier, remove from higher tiers too
      // If adding to lower tier, add to higher tiers automatically
      const planIndex = planHierarchy.indexOf(plan);
      
      const updated = { ...prev };
      
      if (isEnabled) {
        // Removing: remove from this plan and all higher plans
        updated[plan] = newFeatures;
        for (let i = planIndex + 1; i < planHierarchy.length; i++) {
          const higherPlan = planHierarchy[i];
          updated[higherPlan] = (updated[higherPlan] || []).filter(f => f !== feature);
        }
      } else {
        // Adding: add to this plan and all higher plans (if they don't already have it)
        updated[plan] = newFeatures;
        for (let i = planIndex + 1; i < planHierarchy.length; i++) {
          const higherPlan = planHierarchy[i];
          if (!updated[higherPlan].includes(feature)) {
            updated[higherPlan] = [...updated[higherPlan], feature];
          }
        }
      }
      
      return updated;
    });
  };

  // Save configuration
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/plan-features', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planFeatures })
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(data.message || 'Plan features updated successfully!');
        // Reload to get fresh data
        await loadPlanFeatures();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save' }));
        throw new Error(errorData.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Save error:', error);
      showError(error.message || 'Failed to save plan features');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    if (window.confirm('Reset all plan features to defaults? This cannot be undone.')) {
      setPlanFeatures({
        trial: [...(PLAN_FEATURES.trial || [])],
        starter: [...(PLAN_FEATURES.starter || [])],
        growth: [...(PLAN_FEATURES.growth || [])],
      });
      showSuccess('Reset to defaults');
    }
  };

  // Group features by category
  const featureCategories = {
    'Core Features': [
      FEATURES.CONTACT_FORMS,
      FEATURES.SERVICE_DISPLAY,
      FEATURES.IMAGE_GALLERY,
      FEATURES.BASIC_BOOKING_LINK
    ],
    'Display Features': [
      FEATURES.STAFF_PROFILES,
      FEATURES.FAQ_SECTION,
      FEATURES.FILTERS,
      FEATURES.BEFORE_AFTER_GALLERY
    ],
    'E-commerce': [
      FEATURES.STRIPE_CHECKOUT,
      FEATURES.SHOPPING_CART,
      FEATURES.ORDER_MANAGEMENT,
      FEATURES.PRODUCT_MANAGEMENT,
      FEATURES.RECURRING_PRICING
    ],
    'Booking': [
      FEATURES.EMBEDDED_BOOKING,
      FEATURES.ADVANCED_BOOKING
    ],
    'Analytics': [
      FEATURES.SALES_ANALYTICS
    ],
    'Advanced': [
      FEATURES.LIVE_CHAT,
      FEATURES.EMAIL_AUTOMATION,
      FEATURES.CRM_INTEGRATION,
      FEATURES.MULTI_LOCATION,
      FEATURES.CUSTOM_DOMAIN,
      FEATURES.AB_TESTING,
      FEATURES.BLOG_CMS
    ]
  };

  const plans = [...SOFTWARE_PLANS];
  const planColors = {
    trial: PLAN_INFO.trial.color,
    starter: PLAN_INFO.starter.color,
    growth: PLAN_INFO.growth.color,
  };

  return (
    <div className="admin-plan-features-page">
      <Header />
      <AdminSubnav />

      <main className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Plan Features Configuration</h1>
            <p>Configure what features are available for each subscription tier</p>
          </div>
          <div className="header-actions">
            <button onClick={handleReset} className="btn btn-secondary">
              Reset to Defaults
            </button>
            <button 
              onClick={handleSave} 
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="info-banner" role="status">
          <span className="info-banner-indicator" aria-hidden="true" />
          <div>
            <strong>Note:</strong> Changes here will affect what features users can access.
            Growth Managed uses the same software features as Growth.
            Make sure to test changes before saving. Changes are saved to the database and take effect immediately.
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading plan features...</p>
          </div>
        ) : (
          <>
        {/* Plan Headers */}
        <div className="plans-header">
          <div className="feature-column-header">Feature</div>
          {plans.map(plan => (
            <div 
              key={plan} 
              className="plan-column-header"
              style={{ borderTop: `3px solid ${planColors[plan]}` }}
            >
              <div className="plan-name">{plan.charAt(0).toUpperCase() + plan.slice(1)}</div>
              <div className="plan-count">
                {planFeatures[plan]?.length || 0} features
              </div>
            </div>
          ))}
        </div>

        {/* Features by Category */}
        {Object.entries(featureCategories).map(([category, features]) => (
          <div key={category} className="feature-category">
            <h3 className="category-title">{category}</h3>
            <div className="features-table">
              {features.map(feature => (
                <div key={feature} className="feature-row">
                  <div className="feature-name-cell">
                    <span className="feature-name">{FEATURE_NAMES[feature] || feature}</span>
                    <span className="feature-id">{feature}</span>
                  </div>
                  {plans.map(plan => {
                    const enabled = isFeatureEnabled(plan, feature);
                    const planIndex = planHierarchy.indexOf(plan);
                    const lowerPlan = planIndex > 0 ? planHierarchy[planIndex - 1] : null;
                    const isInherited = lowerPlan && planFeatures[lowerPlan]?.includes(feature) && enabled;
                    
                    return (
                      <div 
                        key={plan} 
                        className={`plan-cell ${enabled ? 'enabled' : 'disabled'} ${isInherited ? 'inherited' : ''}`}
                        onClick={() => toggleFeature(plan, feature)}
                        title={isInherited ? 'Inherited from lower tier' : enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        {enabled ? (
                          <span className="feature-state feature-state-on" aria-hidden="true">On</span>
                        ) : (
                          <span className="feature-state feature-state-off" aria-hidden="true">Off</span>
                        )}
                        {isInherited && <span className="inherited-badge">Inherited</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Summary */}
        <div className="summary-section">
          <h2>Summary</h2>
          <div className="summary-grid">
            {plans.map(plan => (
              <div key={plan} className="summary-card">
                <div className="summary-plan-name" style={{ color: planColors[plan] }}>
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </div>
                <div className="summary-feature-count">
                  {planFeatures[plan]?.length || 0} features enabled
                </div>
                <div className="summary-features-list">
                  {planFeatures[plan]?.slice(0, 5).map(f => (
                    <span key={f} className="feature-tag">
                      {FEATURE_NAMES[f] || f}
                    </span>
                  ))}
                  {planFeatures[plan]?.length > 5 && (
                    <span className="feature-tag more">
                      +{planFeatures[plan].length - 5} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default AdminPlanFeatures;

