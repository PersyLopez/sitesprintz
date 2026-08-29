import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import PublicPageLayout from '../components/layout/PublicPageLayout';
import { useAuth } from '../hooks/useAuth';
import { PLATFORM_SUPPORT_EMAIL } from '../config/pricing.config';
import './PaymentPages.css';

const PLAN_LABELS = {
  starter: 'Starter',
  growth: 'Growth',
};

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token, checkAuth } = useAuth();
  const sessionId = searchParams.get('session_id');
  const draftId = searchParams.get('draftId');

  const [status, setStatus] = useState('loading');
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  const confirmPayment = useCallback(async () => {
    if (!sessionId) return;

    const authToken = token || localStorage.getItem('accessToken') || localStorage.getItem('authToken');
    if (!authToken) {
      setStatus('error');
      setError('Please sign in to confirm your subscription.');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const response = await fetch('/api/payments/confirm-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not confirm payment');
      }

      setPlan(data.plan);
      setStatus('confirmed');
      if (checkAuth) {
        await checkAuth();
      }
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Could not confirm your subscription. Please try again.');
    }
  }, [sessionId, token, checkAuth]);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    confirmPayment();
  }, [sessionId, navigate, confirmPayment]);

  const continueTo = draftId ? '/setup' : '/dashboard';
  const planLabel = PLAN_LABELS[plan] || plan;

  return (
    <PublicPageLayout className="payment-success-page">
      <div className="payment-result-page">
        <div className="payment-result-card" data-testid="payment-success-card">
          {status === 'loading' && (
            <>
              <h1>Confirming payment…</h1>
              <p>Please wait while we activate your subscription.</p>
            </>
          )}

          {status === 'confirmed' && (
            <>
              <h1>Payment successful</h1>
              <p>Thank you for subscribing to SiteSprintz.</p>
              <p>
                Plan: <span className="payment-result-status" data-testid="payment-success-plan">{planLabel}</span>
              </p>
              <p>Status: <span className="payment-result-status" data-testid="payment-success-status">Active</span></p>
              <div className="payment-result-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate(continueTo)}
                  data-testid="payment-success-continue"
                >
                  {draftId ? 'Continue setup' : 'Go to dashboard'}
                </button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <h1>Confirmation failed</h1>
              <p className="payment-result-error" data-testid="payment-success-error">{error}</p>
              <div className="payment-result-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmPayment}
                  data-testid="payment-success-retry"
                >
                  Retry confirmation
                </button>
                <Link to="/settings/billing" className="btn btn-secondary">
                  Billing settings
                </Link>
              </div>
              <p>
                Still stuck?{' '}
                <a href={`mailto:${PLATFORM_SUPPORT_EMAIL}`}>{PLATFORM_SUPPORT_EMAIL}</a>
              </p>
            </>
          )}
        </div>
      </div>
    </PublicPageLayout>
  );
};

export default PaymentSuccess;
