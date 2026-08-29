import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { PasswordStrengthMeter } from '../components/auth/PasswordStrengthMeter';
import { getSafeRedirect, stashOAuthRedirect } from '../utils/safeRedirect';
import { paidPlanFromQuery } from '../config/tiers.js';
import { PLATFORM_SUPPORT_EMAIL } from '../config/pricing.config';
import { useLocale } from '../i18n/LocaleContext.jsx';
import './Auth.css';

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const { showSuccess, showError } = useToast();
  const { t, locale } = useLocale();
  const turnstileRef = useRef(null);
  const captchaTokenRef = useRef(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(
    () => import.meta.env.VITE_TURNSTILE_SITE_KEY || '',
  );
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [inviteOnly, setInviteOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data?.beta?.enabled && data.beta.allowSignups === false) {
          setInviteOnly(true);
        }
        if (typeof data.turnstileSiteKey === 'string' && data.turnstileSiteKey.trim()) {
          setTurnstileSiteKey(data.turnstileSiteKey.trim());
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const storedError = localStorage.getItem('oauthError');
    if (storedError) {
      showError(storedError);
      localStorage.removeItem('oauthError');
    }
  }, [showError]);

  const safeRedirect = getSafeRedirect(searchParams.get('redirect'));
  const loginLinkTo = safeRedirect
    ? `/login?redirect=${encodeURIComponent(safeRedirect)}`
    : searchParams.get('template')
      ? `/login?template=${searchParams.get('template')}`
      : '/login';

  useEffect(() => {
    const siteKey = turnstileSiteKey;
    if (!siteKey) {
      setCaptchaReady(true);
      return undefined;
    }

    setCaptchaReady(false);
    let widgetId = null;
    let cancelled = false;

    const mountWidget = () => {
      if (cancelled || widgetId != null) return true;
      const container = turnstileRef.current;
      if (!window.turnstile || !(container instanceof HTMLElement)) return false;
      try {
        widgetId = window.turnstile.render(container, {
          sitekey: siteKey,
          appearance: 'always',
          language: locale === 'es' ? 'es' : 'auto',
          callback: (token) => {
            captchaTokenRef.current = token;
          },
          'error-callback': () => {
            captchaTokenRef.current = null;
            showError('CAPTCHA verification failed. Please try again.');
          },
          'expired-callback': () => {
            captchaTokenRef.current = null;
          },
        });
        setCaptchaReady(true);
        return true;
      } catch {
        return false;
      }
    };

    if (mountWidget()) {
      return () => {
        cancelled = true;
        if (widgetId != null && window.turnstile) {
          window.turnstile.remove(widgetId);
        }
      };
    }

    const intervalId = setInterval(() => {
      if (mountWidget()) clearInterval(intervalId);
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      if (widgetId != null && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [showError, turnstileSiteKey, locale]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (inviteOnly) {
      showError('Signups are invite-only during closed beta');
      return;
    }

    // Validate email
    if (!formData.email) {
      showError('Email is required');
      return;
    }

    // Validate password
    if (!formData.password) {
      showError('Password is required');
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    // Require explicit acceptance of the legal agreements (clickwrap)
    if (!acceptedTerms) {
      showError('Please accept the Terms, Privacy Policy, and Third-Party Services Disclosure to continue');
      return;
    }

    // Password validation will be handled by backend
    // Frontend validation is for UX only

    // Production builds with a site key require a token. Vitest and `vite` dev
    // (MODE !== production) skip this so agents can still exercise /register
    // locally. Production agents log in as seeded testers instead.
    const siteKey = turnstileSiteKey;
    if (import.meta.env.PROD && siteKey && !captchaTokenRef.current) {
      showError('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, captchaTokenRef.current, acceptedTerms);
      showSuccess('Account created successfully!');

      // Reset CAPTCHA after successful registration
      if (window.turnstile && turnstileRef.current) {
        window.turnstile.reset();
        captchaTokenRef.current = null;
      }

      const redirectTo = getSafeRedirect(searchParams.get('redirect'));
      const template = searchParams.get('template');
      const plan = paidPlanFromQuery(searchParams.get('plan'));
      if (redirectTo) {
        navigate(redirectTo);
      } else if (template) {
        navigate(`/setup?template=${template}`);
      } else if (plan) {
        navigate(`/settings/billing?plan=${plan}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      // Handle password validation errors from backend
      const errorData = error.response?.data || error;
      if (errorData.passwordErrors && Array.isArray(errorData.passwordErrors)) {
        showError(errorData.passwordErrors.join('. '));
      } else {
        showError(errorData.error || error.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    stashOAuthRedirect(searchParams.get('redirect'));
    const apiUrl = import.meta.env.DEV
      ? 'http://localhost:3000/auth/google'
      : '/auth/google';
    const plan = paidPlanFromQuery(searchParams.get('plan'));
    window.location.href = plan ? `${apiUrl}?plan=${encodeURIComponent(plan)}` : apiUrl;
  };

  return (
    <div className="auth-page story-public">
      <Header />

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{t('auth.register.h')}</h1>
            <p>{t('auth.register.p')}</p>
          </div>

          {inviteOnly && (
            <div
              className="auth-notice"
              data-testid="register-invite-only"
              role="alert"
              style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                color: '#92400e',
              }}
            >
              Signups are invite-only during our closed beta.{' '}
              Write{' '}
              <a href={`mailto:${PLATFORM_SUPPORT_EMAIL}`}>{PLATFORM_SUPPORT_EMAIL}</a>
              {' '}if you need access.
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="email">{t('auth.email')}</label>
              <input
                type="email"
                id="email"
                name="email"
                data-testid="register-email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                disabled={loading || inviteOnly}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('auth.password')}</label>
              <input
                type="password"
                id="password"
                name="password"
                data-testid="register-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a secure password"
                required
                disabled={loading || inviteOnly}
                minLength={12}
              />
              <PasswordStrengthMeter password={formData.password} />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                data-testid="register-confirm-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                disabled={loading || inviteOnly}
                minLength={12}
              />
            </div>

            {/* Cloudflare Turnstile CAPTCHA */}
            {turnstileSiteKey && (
              <div className="form-group">
                <div ref={turnstileRef} className="turnstile-widget" data-testid="register-turnstile"></div>
                {!captchaReady && (
                  <small className="form-hint">Loading security verification...</small>
                )}
              </div>
            )}

            <div className="form-group form-consent">
              <label className="consent-label">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  data-testid="register-accept-terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  disabled={loading || inviteOnly}
                  required
                />
                <span>
                  I have read and agree to the{' '}
                  <a href="/legal/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>,{' '}
                  <a href="/legal/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, and{' '}
                  <a href="/legal/third-party-services" target="_blank" rel="noopener noreferrer">
                    Third-Party Services &amp; Data Handling Disclosure
                  </a>
                  . I understand that sensitive information such as payments and login data is processed by independent
                  third-party providers, and that SiteSprintz&apos;s liability is limited as described in those documents.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              data-testid="register-submit"
              disabled={loading || inviteOnly || !acceptedTerms}
            >
              {loading ? (
                <>
                  <span className="loading-spinner-sm"></span>
                  {t('auth.creating')}
                </>
              ) : (
                t('auth.create')
              )}
            </button>
          </form>

          <div className="divider">
            <span>or</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="btn btn-secondary btn-full"
            disabled={inviteOnly || !acceptedTerms}
            title={inviteOnly ? 'Signups are invite-only during closed beta' : (!acceptedTerms ? 'Accept the agreements above to continue' : undefined)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
              <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853" />
              <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
              <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335" />
            </svg>
            {t('auth.google')}
          </button>

          <div className="auth-switch">
            <p>
              {t('auth.haveAccount')}{' '}
              <Link to={loginLinkTo} className="link-primary">
                {t('auth.signIn')}
              </Link>
            </p>
          </div>

          <p className="terms-text">
            Sensitive data (payments, login) is handled by independent third parties under their own terms.
            SiteSprintz is currently in beta and provided &ldquo;as is.&rdquo;
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Register;
