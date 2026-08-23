import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import PublicPageLayout from '../components/layout/PublicPageLayout';
import './PaymentPages.css';

const PaymentCancel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');
  const returnTo = draftId ? '/setup' : '/dashboard';

  return (
    <PublicPageLayout className="payment-cancel-page">
      <div className="payment-result-page">
        <div className="payment-result-card" data-testid="payment-cancel-card">
          <h1>Payment cancelled</h1>
          <p>Your subscription checkout was not completed.</p>
          <p>No charges were made.</p>
          <div className="payment-result-actions">
            <Link to="/#pricing" className="btn btn-primary" data-testid="payment-cancel-pricing">
              View plans
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(returnTo)}
              data-testid="payment-cancel-return"
            >
              {draftId ? 'Return to setup' : 'Return to dashboard'}
            </button>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  );
};

export default PaymentCancel;
