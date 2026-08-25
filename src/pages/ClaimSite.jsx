import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import LaborExtrasNote from '../components/pricing/LaborExtrasNote';
import './Auth.css';

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token || localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json',
  };
}

function hasGrowthClaimSubscription(user) {
  const status = user?.subscriptionStatus || user?.subscription_status;
  if (status !== 'trialing' && status !== 'active') {
    return false;
  }
  const plan = user?.subscriptionPlan || user?.subscription_plan || user?.plan;
  return plan === 'growth' || plan === 'growth_managed' || plan === 'pro' || plan === 'premium';
}

function ClaimSite() {
  const { token } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, token: authToken, setUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [claimPlan, setClaimPlan] = useState('growth');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [completingTrial, setCompletingTrial] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [subscriptionReady, setSubscriptionReady] = useState(false);
  const [needsTrial, setNeedsTrial] = useState(false);

  const claimPath = `/claim/${token}`;
  const loginTo = `/login?redirect=${encodeURIComponent(claimPath)}`;
  const registerTo = `/register?plan=growth&redirect=${encodeURIComponent(claimPath)}`;
  const subscribed =
    subscriptionReady || (isAuthenticated && hasGrowthClaimSubscription(user));

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/claim/${token}`);
        if (response.status === 404) {
          throw new Error('not-found');
        }
        if (response.status === 410) {
          throw new Error('expired');
        }
        if (!response.ok) {
          throw new Error('lookup-failed');
        }
        const data = await response.json();
        if (!cancelled) {
          setPreview(data);
        }
      } catch (err) {
        if (!cancelled) {
          setPreview(null);
          if (err.message === 'expired') {
            setError('This claim link has expired.');
          } else {
            setError('This claim link is not available.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (token) {
      loadPreview();
    } else {
      setError('This claim link is not available.');
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId || !isAuthenticated || !token) {
      return undefined;
    }

    let cancelled = false;

    async function completeTrial() {
      setCompletingTrial(true);
      try {
        const response = await fetch(`/api/claim/${token}/trial-complete`, {
          method: 'POST',
          headers: authHeaders(authToken),
          body: JSON.stringify({ sessionId }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Failed to confirm trial');
        }
        if (!cancelled) {
          setSubscriptionReady(true);
          setNeedsTrial(false);
          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  subscriptionStatus: data.subscriptionStatus,
                  subscription_status: data.subscriptionStatus,
                  plan: data.plan || 'growth',
                  subscriptionPlan: data.plan || 'growth',
                  subscription_plan: data.plan || 'growth',
                }
              : prev
          );
          showSuccess('Your 7-day trial is active. You can claim this site now.');
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('session_id');
          setSearchParams(nextParams, { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          showError(err.message || 'Failed to confirm trial');
        }
      } finally {
        if (!cancelled) setCompletingTrial(false);
      }
    }

    completeTrial();

    return () => {
      cancelled = true;
    };
  }, [searchParams, isAuthenticated, token, authToken, setUser, showSuccess, showError, setSearchParams]);

  const handleStartTrial = async () => {
    setStartingTrial(true);
    try {
      const response = await fetch(`/api/claim/${token}/trial-checkout`, {
        method: 'POST',
        headers: authHeaders(authToken),
          body: JSON.stringify({ plan: claimPlan }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start trial checkout');
      }
      if (data.alreadySubscribed) {
        setSubscriptionReady(true);
        setNeedsTrial(false);
        return;
      }
      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (err) {
      showError(err.message || 'Failed to start trial checkout');
    } finally {
      setStartingTrial(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const response = await fetch(`/api/claim/${token}/accept`, {
        method: 'POST',
        headers: authHeaders(authToken),
      });
      const data = await response.json().catch(() => ({}));
      if (
        response.status === 403 &&
        (data.code === 'SUBSCRIPTION_REQUIRED' || data.code === 'GROWTH_REQUIRED')
      ) {
        setNeedsTrial(true);
        setSubscriptionReady(false);
        throw new Error(data.error || 'Start a 7-day Growth trial before claiming this site');
      }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim site');
      }
      showSuccess('This site is now on your account.');
    } catch (err) {
      showError(err.message || 'Failed to claim site');
    } finally {
      setAccepting(false);
    }
  };

  const showTrialFlow = isAuthenticated && (!subscribed || needsTrial);

  return (
    <div className="auth-page story-public">
      <Header />
      <main className="auth-container">
        <div className="auth-card">
          {loading ? (
            <div className="loading-message">
              <div className="spinner"></div>
              <p>Loading your site...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <h2>Claim link unavailable</h2>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <div className="auth-header">
                <h1>{preview?.businessName || 'Your site'}</h1>
                <p>This site was prepared for you</p>
              </div>

              {!isAuthenticated ? (
                <div>
                  <p>
                    Register or log in to continue. Pick Growth ($35/month, you edit) or Growth
                    Managed ($75/month, we take the list) after a 7-day trial. No setup fee.
                    Brochure Starter sites are self-serve.
                  </p>
                  <div className="auth-links" style={{ marginTop: '20px' }}>
                    <Link to={registerTo} className="btn btn-primary btn-full" data-testid="claim-register">
                      Create account
                    </Link>
                    <Link
                      to={loginTo}
                      className="btn btn-secondary btn-full"
                      data-testid="claim-login"
                      style={{ marginTop: '10px' }}
                    >
                      Log in
                    </Link>
                  </div>
                </div>
              ) : showTrialFlow ? (
                <div>
                  <p>
                    Signed in as <strong>{user?.email}</strong>. Add a card to start a 7-day trial.
                    Choose DIY Growth or Growth Managed. Booking and checkout stay on this site.
                    No setup fee.
                  </p>
                  <fieldset style={{ marginTop: '16px', border: 0, padding: 0 }}>
                    <legend className="sr-only">Hosting plan</legend>
                    <label data-testid="claim-plan-growth" style={{ display: 'block' }}>
                      <input
                        type="radio"
                        name="claim-plan"
                        value="growth"
                        checked={claimPlan === 'growth'}
                        onChange={() => setClaimPlan('growth')}
                      />
                      {' '}Growth — $35/month, you edit
                    </label>
                    <label data-testid="claim-plan-growth-managed" style={{ display: 'block', marginTop: '8px' }}>
                      <input
                        type="radio"
                        name="claim-plan"
                        value="growth_managed"
                        checked={claimPlan === 'growth_managed'}
                        onChange={() => setClaimPlan('growth_managed')}
                      />
                      {' '}Growth Managed — $75/month, we take the list
                    </label>
                  </fieldset>
                  <button
                    type="button"
                    className="btn btn-primary btn-full"
                    onClick={handleStartTrial}
                    disabled={startingTrial || completingTrial}
                    data-testid="claim-start-trial"
                    style={{ marginTop: '20px' }}
                  >
                    {startingTrial || completingTrial ? 'Starting trial...' : 'Start 7-day trial'}
                  </button>
                </div>
              ) : (
                <div>
                  <p>
                    Signed in as <strong>{user?.email}</strong>. Your trial is active — claim this
                    site to move it to your account.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-full"
                    onClick={handleAccept}
                    disabled={accepting}
                    data-testid="claim-accept"
                    style={{ marginTop: '20px' }}
                  >
                    {accepting ? 'Claiming...' : 'Claim this site'}
                  </button>
                </div>
              )}
            </>
          )}
          {!loading && !error && <LaborExtrasNote compact variant="claim" />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ClaimSite;
