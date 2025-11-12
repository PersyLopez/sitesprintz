import React from 'react';
import './StatsCard.css';

function StatsCard({ icon, label, value, change, changeLabel, invertChange = false }) {
  const getChangeClass = () => {
    if (!change) return '';
    
    const isPositive = change > 0;
    // If invertChange is true (e.g., for bounce rate), flip the color logic
    if (invertChange) {
      return isPositive ? 'negative' : 'positive';
    }
    return isPositive ? 'positive' : 'negative';
  };

  const getChangeIcon = () => {
    if (!change) return '';
    return change > 0 ? '↑' : '↓';
  };

  return (
    <div className="stats-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {change !== undefined && change !== null && (
        <div className={`stat-change ${getChangeClass()}`}>
          <span className="change-icon">{getChangeIcon()}</span>
          <span className="change-value">{Math.abs(change)}%</span>
          {changeLabel && <span className="change-label"> {changeLabel}</span>}
        </div>
      )}
    </div>
  );
}

export default StatsCard;

