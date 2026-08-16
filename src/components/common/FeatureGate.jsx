/**
 * Feature Gating Components
 * 
 * Used to conditionally render features based on user's subscription tier.
 * Shows upgrade prompts for locked features.
 */

import React from 'react';
import { hasFeature, getRequiredPlan, FEATURE_NAMES, PLAN_INFO } from '../../utils/planFeatures.js';
import { hasTemplateFeatureAccess, getRequiredTierForFeature } from '../../utils/templateFeatures.js';
import './FeatureGate.css';

/**
 * FeatureGate - Wraps content that requires a specific tier
 * 
 * @param {string} feature - Feature key from FEATURES constant
 * @param {string} userPlan - User's current plan
 * @param {React.ReactNode} children - Content to show if feature is available
 * @param {string} upgradeMessage - Custom upgrade message
 * @param {boolean} showPreview - Show blurred preview of locked content
 * @param {Function} onUpgradeClick - Callback when upgrade button is clicked
 */
export function FeatureGate({ 
  feature, 
  userPlan, 
  children, 
  upgradeMessage,
  showPreview = false,
  onUpgradeClick
}) {
  const hasAccess = hasFeature(userPlan, feature);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  const requiredPlan = getRequiredPlan(feature);
  const featureName = FEATURE_NAMES[feature] || feature;
  const planInfo = PLAN_INFO[requiredPlan];
  
  if (showPreview) {
    return (
      <div className="feature-gate-preview">
        <div className="feature-gate-preview-content">
          {children}
        </div>
        <div className="feature-gate-overlay">
          <UpgradePrompt 
            featureName={featureName}
            requiredPlan={requiredPlan}
            planInfo={planInfo}
            message={upgradeMessage}
            onUpgradeClick={onUpgradeClick}
          />
        </div>
      </div>
    );
  }
  
  return (
    <UpgradePrompt 
      featureName={featureName}
      requiredPlan={requiredPlan}
      planInfo={planInfo}
      message={upgradeMessage}
      onUpgradeClick={onUpgradeClick}
    />
  );
}

/**
 * TemplateFeatureGate - Wraps template-specific features
 * Uses the template feature tier requirements
 */
export function TemplateFeatureGate({ 
  feature, 
  userTier, 
  children, 
  upgradeMessage,
  showPreview = false,
  onUpgradeClick
}) {
  const hasAccess = hasTemplateFeatureAccess(feature, userTier);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  const requiredTier = getRequiredTierForFeature(feature);
  const planInfo = PLAN_INFO[requiredTier];
  
  // Format feature name for display
  const featureName = feature
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
  
  if (showPreview) {
    return (
      <div className="feature-gate-preview">
        <div className="feature-gate-preview-content">
          {children}
        </div>
        <div className="feature-gate-overlay">
          <UpgradePrompt 
            featureName={featureName}
            requiredPlan={requiredTier}
            planInfo={planInfo}
            message={upgradeMessage}
            onUpgradeClick={onUpgradeClick}
          />
        </div>
      </div>
    );
  }
  
  return (
    <UpgradePrompt 
      featureName={featureName}
      requiredPlan={requiredTier}
      planInfo={planInfo}
      message={upgradeMessage}
      onUpgradeClick={onUpgradeClick}
    />
  );
}

/**
 * UpgradePrompt - Displays upgrade CTA for locked features
 */
export function UpgradePrompt({ 
  featureName, 
  requiredPlan, 
  planInfo,
  message,
  onUpgradeClick,
  compact = false
}) {
  const defaultMessage = `Upgrade to ${planInfo?.name || requiredPlan} to unlock ${featureName}`;
  
  if (compact) {
    return (
      <div className="upgrade-prompt-compact">
        <span className="upgrade-prompt-icon">🔒</span>
        <span className="upgrade-prompt-text">
          {message || `Unlock with ${planInfo?.name || requiredPlan}`}
        </span>
        <button 
          className="upgrade-prompt-btn-compact"
          onClick={onUpgradeClick}
        >
          Upgrade
        </button>
      </div>
    );
  }
  
  return (
    <div className="upgrade-prompt">
      <div className="upgrade-prompt-icon-large">🔒</div>
      <h3 className="upgrade-prompt-title">{featureName}</h3>
      <p className="upgrade-prompt-message">{message || defaultMessage}</p>
      {planInfo && (
        <div className="upgrade-prompt-plan-info">
          <span className="upgrade-prompt-plan-name" style={{ color: planInfo.color }}>
            {planInfo.name}
          </span>
          <span className="upgrade-prompt-plan-price">
            ${planInfo.price}/month
          </span>
        </div>
      )}
      <button 
        className="upgrade-prompt-btn"
        onClick={onUpgradeClick}
        style={{ backgroundColor: planInfo?.color }}
      >
        {planInfo?.ctaText || `Upgrade to ${planInfo?.name}`}
      </button>
    </div>
  );
}

/**
 * LockedFeatureBadge - Small badge showing feature is locked
 */
export function LockedFeatureBadge({ requiredPlan, onClick }) {
  const planInfo = PLAN_INFO[requiredPlan];
  
  return (
    <span 
      className="locked-feature-badge"
      onClick={onClick}
      style={{ backgroundColor: planInfo?.color }}
    >
      🔒 {planInfo?.name || requiredPlan}
    </span>
  );
}

/**
 * FeatureComingSoon - Badge for features in development
 */
export function FeatureComingSoon({ featureName }) {
  return (
    <div className="feature-coming-soon">
      <span className="coming-soon-icon">🚀</span>
      <span className="coming-soon-text">
        {featureName} coming soon!
      </span>
    </div>
  );
}

export default FeatureGate;

