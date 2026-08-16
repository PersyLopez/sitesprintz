import React from 'react';
import './ProgressBar.css';

function ProgressBar({ percentage, label, showPercentage = true, size = 'default' }) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className={`progress-bar-container progress-${size}`} role="progressbar" 
         aria-valuenow={clampedPercentage} 
         aria-valuemin="0" 
         aria-valuemax="100"
         aria-label={label || `Progress: ${clampedPercentage}%`}>
      {label && <div className="progress-label">{label}</div>}
      <div className="progress-bar-wrapper">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
      {showPercentage && (
        <div className="progress-percentage">{Math.round(clampedPercentage)}%</div>
      )}
    </div>
  );
}

export default ProgressBar;

