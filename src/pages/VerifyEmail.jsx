import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import { useToast } from '../hooks/useToast';
import './Auth.css';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [status, setStatus] = useState('verifying'); // verifying, success, error, expired
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      setLoading(false);
      return;
    }

    // Verify email
    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch(`/api/auth/verify-email?token=${token}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        showSuccess('Email verified! Your account is now active.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || data.message || 'Verification failed');
        showError(data.error || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to verify email. Please try again.');
      showError('Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const email = searchParams.get('email');
    if (!email) {
      showError('Email address is required to resend verification');
      return;
    }

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(data.message || 'Verification email sent!');
      } else {
        showError(data.error || 'Failed to resend verification email');
      }
    } catch (error) {
      showError('Failed to resend verification email');
    }
  };

  return (
    <div className="auth-page">
      <Header />

      <div className="auth-container">
        <div className="auth-card">
          {loading ? (
            <div className="verification-status">
              <div className="loading-spinner"></div>
              <h1>Verifying your email...</h1>
              <p>Please wait while we verify your email address.</p>
            </div>
          ) : status === 'success' ? (
            <div className="verification-status success">
              <div className="success-icon">✓</div>
              <h1>Email Verified! 🎉</h1>
              <p>{message}</p>
              <p className="redirect-message">Redirecting to login...</p>
              <Link to="/login" className="btn btn-primary btn-full">
                Go to Login
              </Link>
            </div>
          ) : (
            <div className="verification-status error">
              <div className="error-icon">✗</div>
              <h1>Verification Failed</h1>
              <p>{message}</p>
              
              {message.includes('expired') && (
                <div className="resend-section">
                  <p>Your verification link has expired. Request a new one:</p>
                  <button onClick={handleResend} className="btn btn-secondary btn-full">
                    Resend Verification Email
                  </button>
                </div>
              )}
              
              <div className="auth-switch">
                <p>
                  <Link to="/login" className="link-primary">
                    Go to Login
                  </Link>
                  {' or '}
                  <Link to="/register" className="link-primary">
                    Create New Account
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;







