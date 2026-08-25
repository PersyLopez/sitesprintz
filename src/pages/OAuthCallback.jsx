import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth';
import { paidPlanFromQuery } from '../config/tiers.js';

const ERROR_MESSAGES = {
  oauth_failed: 'Google sign-in was cancelled. Please try again.',
  auth_error: 'Google sign-in failed. Please try again or use email.',
  no_user: 'Google sign-in did not return a user. Please try again.',
  auth_failed: 'Could not complete sign-in. Please try again.',
  access_denied: 'Google sign-in was denied. Please try again.'
};

function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth, user, loading } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams.get('error');
      if (error) {
        const message = ERROR_MESSAGES[error] || 'Sign-in failed. Please try again.';
        localStorage.setItem('oauthError', message);
        navigate('/login', { replace: true });
        return;
      }

      const token = searchParams.get('token');

      if (token) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('accessToken', token);
        localStorage.setItem('token', token);
      }

      if (checkAuth) {
        await checkAuth({ allowCookieSession: !token });
      }

      if (!token) {
        const userData = await authService.getCurrentUser().catch(() => null);
        if (!userData) {
          navigate('/login', { replace: true });
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate, checkAuth]);

  // Redirect based on user role once auth is loaded
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        const plan = paidPlanFromQuery(searchParams.get('plan'));
        navigate(plan ? `/settings/billing?plan=${plan}` : '/dashboard', { replace: true });
      }
    }
  }, [loading, user, navigate, searchParams]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div className="loading-spinner"></div>
      <p>Completing sign in...</p>
    </div>
  );
}

export default OAuthCallback;

