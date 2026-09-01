import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import LaborExtrasNote from '../components/pricing/LaborExtrasNote';
import { PLATFORM_SUPPORT_EMAIL } from '../config/pricing.config';
import './Auth.css';

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token || localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json',
  };
}

function hasMatchingClaimSubscription(user, sitePlan) {
  const status = user?.subscriptionStatus || user?.subscription_status;
  if (status !== 'active') {
    return false;
  }
  const plan = user?.subscriptionPlan || user?.subscription_plan || user?.plan;
  const growth = plan === 'growth' || plan === 'growth_managed' || plan === 'pro' || plan === 'premium';
  if (sitePlan === 'starter') {
    return plan === 'starter' || growth;
  }
  return growth;
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
  const [collectsPayments, setCollectsPayments] = useState(false);

  const inboundStarter = preview?.recommendedPlan === 'starter';
  const claimPath = `/claim/${token}`;
  const loginTo = `/login?redirect=${encodeURIComponent(claimPath)}`;
  const registerPlan = inboundStarter ? 'starter' : 'growth';
  const registerTo = `/register?plan=${registerPlan}&redirect=${encodeURIComponent(claimPath)}`;
  const subscribed =
    subscriptionReady || (isAuthenticated && hasMatchingClaimSubscription(user, preview?.recommendedPlan));

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.billing?.collectsPayments != null) {
          setCollectsPayments(Boolean(data.billing.collectsPayments));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
          if (data?.recommendedPlan === 'starter') {
            setClaimPlan('starter');
          }
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
          throw new Error(data.error || 'Failed to confirm subscription');
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
          showSuccess('Your plan is active. You can claim this site now.');
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('session_id');
          setSearchParams(nextParams, { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          showError(err.message || 'Failed to confirm subscription');
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
        throw new Error(data.error || 'Failed to start checkout');
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
      showError(err.message || 'Failed to start checkout');
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
        throw new Error(data.error || 'Subscribe to Growth before claiming this site');
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
              <p>
                Need help?{' '}
                <a href={`mailto:${PLATFORM_SUPPORT_EMAIL}`}>{PLATFORM_SUPPORT_EMAIL}</a>
              </p>
            </div>
          ) : (
            <>
              <div className="auth-header">
                <h1>{preview?.businessName || 'Your site'}</h1>
                <p>This site was prepared for you</p>
                <p>
                  We already checked that the live page, photos, and booking or checkout on this
                  site work.
                </p>
              </div>

              {!isAuthenticated ? (
                <div>
                  <p>
                    Create an account or log in with the email you want this site owned under.
                    {collectsPayments === false
                      ? ' Platform billing is not open yet — email us after you sign in to claim this site.'
                      : inboundStarter
                        ? ' Subscribe to Starter ($10/month) or Growth ($35/month) to claim this page.'
                        : ' Subscribe to Growth ($35/month, you edit) or Growth Managed ($75/month, we set it up and keep the list updated).'}
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
                  {collectsPayments === false ? (
                    <div data-testid="claim-billing-closed">
                      <p>
                        Platform billing is not open yet. Contact us to claim this site — your live
                        preview stays up on the no-card trial.
                      </p>
                      <p style={{ marginTop: '16px' }}>
                        <a href={`mailto:${PLATFORM_SUPPORT_EMAIL}`}>{PLATFORM_SUPPORT_EMAIL}</a>
                      </p>
                    </div>
                  ) : (
                    <>
                  <p>
                    Signed in as <strong>{user?.email}</strong>. That email will own this site.
                    {inboundStarter
                      ? ' Subscribe to Starter or Growth to claim it.'
                      : ' Subscribe to Growth or Growth Managed to claim it.'}
                    {' '}If you have a coupon, add it on the payment screen. Booking and checkout stay on this site.
                  </p>
                  <fieldset style={{ marginTop: '16px', border: 0, padding: 0 }}>
                    <legend className="sr-only">Hosting plan</legend>
                    {inboundStarter ? (
                    <label data-testid="claim-plan-starter" style={{ display: 'block', marginBottom: '8px' }}>
                      <input
                        type="radio"
                        name="claim-plan"
                        value="starter"
                        checked={claimPlan === 'starter'}
                        onChange={() => setClaimPlan('starter')}
                      />
                      {' '}Starter — $10/month, brochure page
                    </label>
                    ) : null}
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
                      {' '}Growth Managed — $75/month, we set it up and keep the list updated
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
                    {startingTrial || completingTrial ? 'Opening checkout...' : 'Subscribe to claim'}
                  </button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <p>
                    Signed in as <strong>{user?.email}</strong>. Your plan is active — claim this
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
