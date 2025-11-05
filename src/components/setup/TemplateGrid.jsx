import React from 'react';
import './TemplateGrid.css';

function TemplateGrid({ templates, selectedTemplate, onSelect }) {
  const groupedTemplates = templates.reduce((acc, template) => {
    const tier = template.tier || 'Starter';
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(template);
    return acc;
  }, {});

  const tiers = ['Pro', 'Checkout', 'Starter'];

  return (
    <div className="template-grid-container">
      {tiers.map(tier => {
        const tierTemplates = groupedTemplates[tier] || [];
        if (tierTemplates.length === 0) return null;
        
        return (
          <div key={tier} className="template-tier-section">
            <div className="tier-header">
              <h3>{tier} Templates</h3>
              <span className="tier-badge">{tierTemplates.length}</span>
            </div>
            
            <div className="template-cards">
              {tierTemplates.map(template => (
                <div
                  key={template.id || template.template}
                  className={`template-card ${selectedTemplate === (template.id || template.template) ? 'selected' : ''}`}
                  onClick={() => onSelect(template)}
                >
                  <div className="template-preview">
                    {template.preview || template.heroImage ? (
                      <img 
                        src={template.preview || template.heroImage} 
                        alt={template.name || template.businessName}
                      />
                    ) : (
                      <div className="preview-placeholder">
                        <span>{template.icon || '🌐'}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="template-info">
                    <h4>{template.name || template.businessName}</h4>
                    <p>{template.description || `${template.type || 'Business'} template`}</p>
                  </div>
                  
                  {selectedTemplate === (template.id || template.template) && (
                    <div className="selected-indicator">
                      <span>✓</span> Selected
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TemplateGrid;

