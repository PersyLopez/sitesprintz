import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './Auth.css';

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token || localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json',
  };
}

function ClaimSite() {
  const { token } = useParams();
  const { user, isAuthenticated, token: authToken } = useAuth();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const claimPath = `/claim/${token}`;
  const loginTo = `/login?redirect=${encodeURIComponent(claimPath)}`;
  const registerTo = `/register?redirect=${encodeURIComponent(claimPath)}`;

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

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const response = await fetch(`/api/claim/${token}/accept`, {
        method: 'POST',
        headers: authHeaders(authToken),
      });
      const data = await response.json().catch(() => ({}));
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
                  <p>Register or log in to continue. You will return to this page.</p>
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
              ) : (
                <div>
                  <p>
                    Signed in as <strong>{user?.email}</strong>. Add a card, start the 7-day trial,
                    then this site moves to your account.
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
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ClaimSite;
