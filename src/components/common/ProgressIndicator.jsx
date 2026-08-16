import React from 'react';
import './ProgressIndicator.css';

/**
 * ProgressIndicator - Shows progress for multi-step operations
 * 
 * @param {number} percentage - Progress percentage (0-100)
 * @param {string} label - Optional label text
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 * @param {boolean} showPercentage - Whether to show percentage text
 */
function ProgressIndicator({ 
  percentage = 0, 
  label = '', 
  size = 'md',
  showPercentage = false 
}) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className={`progress-indicator progress-indicator-${size}`}>
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          {showPercentage && (
            <span className="progress-percentage">{Math.round(clampedPercentage)}%</span>
          )}
        </div>
      )}
      <div className="progress-bar-wrapper">
        <div 
          className="progress-bar-fill"
          style={{ width: `${clampedPercentage}%` }}
          role="progressbar"
          aria-valuenow={clampedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || `Progress: ${Math.round(clampedPercentage)}%`}
        />
      </div>
    </div>
  );
}

export default ProgressIndicator;



