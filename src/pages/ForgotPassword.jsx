import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { PLATFORM_SUPPORT_EMAIL } from '../config/pricing.config';
import './Auth.css';

function ForgotPassword() {
  const { showSuccess, showError } = useToast();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      showError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token', {
        credentials: 'include'
      });
      
      if (!csrfResponse.ok) {
        throw new Error('Failed to get CSRF token');
      }
      
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      // Step 2: Send password reset request with CSRF token
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send reset email');
      }

      setSent(true);
      showSuccess('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Forgot password error:', error);
      showError(error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page story-public">
      <Header />
      
      <main className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>🔑 {t('auth.forgot.h')}</h1>
            <p>{t('auth.forgot.p')}</p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">{t('auth.forgot.email')}</label>
                <input
                  type="email"
                  id="email"
                  data-testid="forgot-password-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-full"
                data-testid="forgot-password-submit"
                disabled={loading}
              >
                {loading ? t('auth.forgot.sending') : t('auth.forgot.send')}
              </button>

              <div className="auth-links">
                <Link to="/login">{t('auth.forgot.back')}</Link>
              </div>
            </form>
          ) : (
            <div className="success-message" data-testid="forgot-password-success">
              <div className="success-icon">✅</div>
              <h2>{t('auth.forgot.check')}</h2>
              <p>
                {t('auth.forgot.sent', { email })}
              </p>
              <p className="text-muted">
                {t('auth.forgot.spam')}{' '}
                <button 
                  onClick={() => setSent(false)}
                  className="link-button"
                  data-testid="forgot-password-try-again"
                >
                  {t('auth.forgot.retry')}
                </button>
              </p>
              <p className="text-muted">
                {t('auth.forgot.supportLead')}{' '}
                <a href={`mailto:${PLATFORM_SUPPORT_EMAIL}`}>{PLATFORM_SUPPORT_EMAIL}</a>
              </p>
              <div className="auth-links">
                <Link to="/login">{t('auth.forgot.back')}</Link>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default ForgotPassword;
