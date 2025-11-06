import React from 'react';
import './PricingCard.css';

function PricingCard({ 
  product,
  highlighted = false,
  onSelect
}) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  const getBillingPeriodLabel = (period) => {
    const labels = {
      'monthly': 'month',
      'yearly': 'year',
      'weekly': 'week',
      'daily': 'day'
    };
    return labels[period] || period;
  };

  const calculateSavings = () => {
    if (product.compareAtPrice && product.compareAtPrice > product.price) {
      const savings = product.compareAtPrice - product.price;
      const percentage = Math.round((savings / product.compareAtPrice) * 100);
      return { amount: savings, percentage };
    }
    return null;
  };

  const savings = calculateSavings();
  const isRecurring = product.billingPeriod && product.billingPeriod !== 'one-time';
  const periodLabel = isRecurring ? getBillingPeriodLabel(product.billingPeriod) : null;

  return (
    <div className={`pricing-card ${highlighted ? 'highlighted' : ''} ${product.featured ? 'featured' : ''}`}>
      {/* Featured Badge */}
      {product.featured && (
        <div className="featured-badge">
          ⭐ Most Popular
        </div>
      )}

      {/* Header */}
      <div className="pricing-header">
        <h3 className="plan-name">{product.name}</h3>
        {product.description && (
          <p className="plan-description">{product.description}</p>
        )}
      </div>

      {/* Price */}
      <div className="pricing-amount">
        <span className="price-value">{formatPrice(product.price)}</span>
        {isRecurring && (
          <span className="price-period">/ {periodLabel}</span>
        )}
      </div>

      {/* Savings Badge */}
      {savings && (
        <div className="savings-badge">
          Save {savings.percentage}% (${savings.amount})
        </div>
      )}

      {/* Compare At Price */}
      {product.compareAtPrice && product.compareAtPrice > product.price && (
        <div className="compare-price">
          Regular: <span className="strikethrough">{formatPrice(product.compareAtPrice)}</span>
        </div>
      )}

      {/* Features List */}
      {product.features && product.features.length > 0 && (
        <ul className="features-list">
          {product.features.map((feature, index) => (
            <li key={index} className="feature-item">
              <span className="feature-icon">✓</span>
              <span className="feature-text">{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA Button */}
      {onSelect && (
        <button
          onClick={() => onSelect(product)}
          className={`btn ${highlighted ? 'btn-primary' : 'btn-secondary'} btn-block btn-cta`}
        >
          {product.ctaText || 'Select Plan'} →
        </button>
      )}

      {/* Trial Info */}
      {product.trialDays && (
        <div className="trial-info">
          🎁 {product.trialDays}-day free trial
        </div>
      )}
    </div>
  );
}

export default PricingCard;

