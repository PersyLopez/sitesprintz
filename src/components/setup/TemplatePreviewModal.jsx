import React, { useState } from 'react';
import './TemplatePreviewModal.css';

function TemplatePreviewModal({ template, onClose, onSelect }) {
  const [viewMode, setViewMode] = useState('desktop'); // desktop, tablet, mobile

  if (!template) return null;

  const tier = template.tier || template.plan || 'Starter';
  const category = template.category || 'Other';

  const getCategoryIcon = (cat) => {
    const icons = {
      'Food & Dining': '🍽️',
      'Beauty & Wellness': '💇',
      'Fitness & Health': '💪',
      'Professional Services': '💼',
      'Home Services': '🏠',
      'Pet Services': '🐾',
      'Technology': '💻',
      'Retail': '🛍️',
      'Automotive': '🚗',
      'Healthcare': '🏥',
      'Legal': '⚖️',
      'Real Estate': '🏘️',
      'Basic': '🌐',
      'Other': '📄'
    };
    return icons[cat] || '📄';
  };

  const features = template.features || [
    'Responsive design',
    'Contact form',
    'Service listings',
    'Business hours',
    'Social media links'
  ];

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="preview-modal-header">
          <div className="template-title-info">
            <h2>
              {getCategoryIcon(category)} {template.name || template.businessName}
            </h2>
            <div className="template-badges">
              <span className={`tier-badge tier-${tier.toLowerCase()}`}>
                {tier} Plan
              </span>
              <span className="category-badge">
                {category}
              </span>
            </div>
          </div>
          
          <button className="close-preview-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Device Toggle */}
        <div className="device-toggle">
          <button
            className={`device-btn ${viewMode === 'desktop' ? 'active' : ''}`}
            onClick={() => setViewMode('desktop')}
            title="Desktop View"
          >
            🖥️ Desktop
          </button>
          <button
            className={`device-btn ${viewMode === 'tablet' ? 'active' : ''}`}
            onClick={() => setViewMode('tablet')}
            title="Tablet View"
          >
            📱 Tablet
          </button>
          <button
            className={`device-btn ${viewMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setViewMode('mobile')}
            title="Mobile View"
          >
            📱 Mobile
          </button>
        </div>

        {/* Preview Container */}
        <div className={`preview-container view-${viewMode}`}>
          <div className="preview-frame">
            {template.preview || template.heroImage || template.hero?.image ? (
              <img
                src={template.preview || template.heroImage || template.hero?.image}
                alt={template.name || template.businessName}
                className="preview-image"
              />
            ) : (
              <div className="preview-placeholder">
                <span className="placeholder-icon">{template.icon || getCategoryIcon(category)}</span>
                <p>Preview not available</p>
              </div>
            )}
          </div>
        </div>

        {/* Template Details */}
        <div className="preview-details">
          <div className="details-section">
            <h3>About This Template</h3>
            <p>{template.description || template.brand?.tagline || `Professional ${category} template perfect for your business`}</p>
          </div>

          <div className="details-section">
            <h3>Features Included</h3>
            <ul className="features-list">
              {features.map((feature, index) => (
                <li key={index}>
                  <span className="feature-icon">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {template.demoData && (
            <div className="details-section">
              <h3>What You Get</h3>
              <div className="demo-stats">
                {template.demoData.services && (
                  <div className="stat-item">
                    <span className="stat-number">{template.demoData.services.length}</span>
                    <span className="stat-label">Pre-filled Services</span>
                  </div>
                )}
                {template.demoData.menu && (
                  <div className="stat-item">
                    <span className="stat-number">{template.demoData.menu.length}</span>
                    <span className="stat-label">Menu Items</span>
                  </div>
                )}
                <div className="stat-item">
                  <span className="stat-number">✨</span>
                  <span className="stat-label">Ready to Customize</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="preview-modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Keep Looking
          </button>
          <button
            onClick={() => {
              onSelect(template);
              onClose();
            }}
            className="btn btn-primary btn-lg"
          >
            Use This Template →
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplatePreviewModal;

