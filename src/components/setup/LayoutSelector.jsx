import React from 'react';
import { getLayoutsForTemplate } from '../../config/templateLayouts';
import './LayoutSelector.css';

function LayoutSelector({ baseTemplate, currentLayout, onLayoutChange }) {
  const layoutConfig = getLayoutsForTemplate(baseTemplate);
  
  if (!layoutConfig) {
    return null; // No layouts available for this template
  }
  
  const { layouts, defaultLayout } = layoutConfig;
  const selectedLayout = currentLayout || defaultLayout;
  
  return (
    <div className="layout-selector">
      <div className="layout-selector-header">
        <h4>🎨 Choose Layout Style</h4>
        <p>Select the perfect layout for your business</p>
      </div>
      
      <div className="layout-options">
        {Object.entries(layouts).map(([layoutKey, layoutInfo]) => {
          const isSelected = layoutKey === selectedLayout;
          
          return (
            <div
              key={layoutKey}
              className={`layout-option ${isSelected ? 'selected' : ''}`}
              onClick={() => onLayoutChange(layoutKey)}
            >
              <div className="layout-emoji">{layoutInfo.emoji}</div>
              <div className="layout-info">
                <h5>{layoutInfo.name}</h5>
                <p className="layout-description">{layoutInfo.description}</p>
                <ul className="layout-features">
                  {layoutInfo.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx}>
                      <span>✓</span> {feature}
                    </li>
                  ))}
                </ul>
              </div>
              {isSelected && (
                <div className="selected-indicator">
                  <span>✓</span> Selected
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LayoutSelector;

