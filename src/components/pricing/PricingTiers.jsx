import React from 'react';
import PricingCard from './PricingCard';
import './PricingTiers.css';

function PricingTiers({ plans, onSelectPlan, highlightedPlanId }) {
  if (!plans || plans.length === 0) {
    return (
      <div className="pricing-tiers-empty">
        <p>No pricing plans available</p>
      </div>
    );
  }

  return (
    <div className="pricing-tiers-container">
      {/* Header */}
      <div className="pricing-tiers-header">
        <h2>Choose Your Plan</h2>
        <p>Select the perfect plan for your business needs</p>
      </div>

      {/* Plans Grid */}
      <div className="pricing-grid">
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            product={plan}
            highlighted={plan.id === highlightedPlanId}
            onSelect={onSelectPlan}
          />
        ))}
      </div>

      {/* Footer Note */}
      <div className="pricing-tiers-footer">
        <p>💳 All plans include a 30-day money-back guarantee</p>
        <p>🔒 Secure payment processed by Stripe</p>
      </div>
    </div>
  );
}

export default PricingTiers;

