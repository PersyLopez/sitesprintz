import React, { useState } from 'react';
import './HelpPanel.css';

/**
 * HelpPanel - Slide-out help panel with contextual information
 * 
 * @param {boolean} isOpen - Whether panel is open
 * @param {Function} onClose - Close handler
 * @param {string} title - Panel title
 * @param {ReactNode} children - Panel content
 */
function HelpPanel({ isOpen, onClose, title = 'Help & Support', children }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="help-panel-overlay" onClick={onClose} />
      <div className="help-panel" role="dialog" aria-labelledby="help-panel-title">
        <div className="help-panel-header">
          <h2 id="help-panel-title">{title}</h2>
          <button
            className="help-panel-close"
            onClick={onClose}
            aria-label="Close help panel"
          >
            ✕
          </button>
        </div>
        <div className="help-panel-content">
          {children}
        </div>
      </div>
    </>
  );
}

export default HelpPanel;



