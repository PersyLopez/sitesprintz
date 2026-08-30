import React, { useState, useEffect } from 'react';
import { laborInquiryMailto } from '../../utils/laborInquiryMailto';
import './TrialBanner.css';

function TrialBanner({ user }) {
  const [daysLeft, setDaysLeft] = useState(0);
  const [isUrgent, setIsUrgent] = useState(false);
  const supportMailto = laborInquiryMailto('optional extras');

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
              ? `Live window closing — ${daysLeft} days left`
              : `Your site is live — ${daysLeft} days remaining`}
          </h3>
          <p>
            {isUrgent
              ? 'Keep sharing your link. Email us if you want help staying online — no checkout required.'
              : 'Keep sharing your link. We’ll reach out before your live window ends — no payment needed now.'}
          </p>
        </div>
      </div>

      <div className="trial-actions">
        {supportMailto ? (
          <a href={supportMailto} className="btn btn-primary">
            ✉️ Email us
          </a>
        ) : null}
        <a href="#dashboard-main" className="btn btn-secondary">
          Keep working
        </a>
      </div>
    </div>
  );
}

export default TrialBanner;
