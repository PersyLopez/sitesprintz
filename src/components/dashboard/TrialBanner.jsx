import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './TrialBanner.css';

function TrialBanner({ user }) {
  const [daysLeft, setDaysLeft] = useState(0);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (user?.trial_expires_at) {
      const expiryDate = new Date(user.trial_expires_at);
      const today = new Date();
      const diffTime = expiryDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysLeft(Math.max(0, diffDays));
      setIsUrgent(diffDays <= 3);
    }
  }, [user]);

  return (
    <div className={`trial-banner ${isUrgent ? 'urgent' : ''}`}>
      <div className="trial-content">
        <div className="trial-icon">{isUrgent ? '⚠️' : '🎁'}</div>
        <div className="trial-text">
          <h3>
            {isUrgent
              ? `Trial Ending Soon - ${daysLeft} days left!`
              : `Free Trial Active - ${daysLeft} days remaining`}
          </h3>
          <p>
            {isUrgent
              ? 'Upgrade now to keep your sites online and unlock premium features'
              : 'Enjoying SiteSprintz? Upgrade to unlock unlimited sites and premium features'}
          </p>
        </div>
      </div>
      
      <div className="trial-actions">
        <Link to="/#pricing" className="btn btn-primary">
          ⬆️ Upgrade Now
        </Link>
        <Link to="/#pricing" className="btn btn-secondary">
          Compare Plans
        </Link>
      </div>
    </div>
  );
}

export default TrialBanner;

