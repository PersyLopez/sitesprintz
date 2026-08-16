import React, { useState, useEffect } from 'react';
import './SaveIndicator.css';

/**
 * SaveIndicator - Shows save status with animation
 * 
 * @param {Date|null} lastSaved - Last saved timestamp
 * @param {boolean} isSaving - Whether currently saving
 */
function SaveIndicator({ lastSaved = null, isSaving = false }) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (lastSaved) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  if (isSaving) {
    return (
      <div className="save-indicator saving" role="status" aria-live="polite">
        <span className="save-icon">💾</span>
        <span className="save-text">Saving...</span>
      </div>
    );
  }

  if (lastSaved && showAnimation) {
    return (
      <div className="save-indicator saved" role="status" aria-live="polite">
        <span className="save-icon">✓</span>
        <span className="save-text">Saved</span>
        <span className="save-time">{lastSaved.toLocaleTimeString()}</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="save-indicator saved-static" role="status" aria-live="polite">
        <span className="save-icon">💾</span>
        <span className="save-text">Last saved: {lastSaved.toLocaleTimeString()}</span>
      </div>
    );
  }

  return null;
}

export default SaveIndicator;



