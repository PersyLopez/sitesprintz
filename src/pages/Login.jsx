import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { getSafeRedirect, stashOAuthRedirect } from '../utils/safeRedirect';
import { useLocale } from '../i18n/LocaleContext.jsx';
import './Auth.css';

const QUERY_ERROR_MESSAGES = {
  oauth_failed: 'Google sign-in was cancelled. Please try again.',
  auth_error: 'Google sign-in failed. Please try again or use email.',
  no_user: 'Google sign-in did not return a user. Please try again.',
  auth_failed: 'Could not complete sign-in. Please try again.',
  access_denied: 'Google sign-in was denied. Please try again.'
};

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const { t } = useLocale();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    const queryError = searchParams.get('error');
    const storedError = localStorage.getItem('oauthError');
    if (queryError || storedError) {
      const message = t(`auth.oauth.${queryError}`) !== `auth.oauth.${queryError}`
        ? t(`auth.oauth.${queryError}`)
        : (QUERY_ERROR_MESSAGES[queryError] || storedError || t('auth.oauth.generic'));
      setErrors((prev) => ({ ...prev, submit: message }));
      localStorage.removeItem('oauthError');
    }
  }, [searchParams, t]);

  const validateEmail = (email) => {
    if (!email) return t('auth.emailRequired');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return t('auth.emailInvalid');
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return t('auth.passwordRequired');
    if (password.length < 6) return t('auth.passwordShort');
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({
      ...touched,
      [name]: true,
    });

    // Validate on blur
    let error = '';
    if (name === 'email') {
      error = validateEmail(value);
    } else if (name === 'password') {
      error = validatePassword(value);
    }

    if (error) {
      setErrors({
        ...errors,
        [name]: error,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate all fields
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
      });
      setTouched({
        email: true,
        password: true,
      });
      setLoading(false);
      return;
    }

    try {
      const data = await login(formData.email, formData.password);
      showSuccess(t('auth.loginOk'));

      const redirectTo = getSafeRedirect(searchParams.get('redirect'));
      if (redirectTo) {
        navigate(redirectTo);
      } else if (data.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      showError(error.message || t('auth.loginFail'));
      setErrors({
        ...errors,
        submit: error.message || t('auth.loginFail'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    stashOAuthRedirect(searchParams.get('redirect'));
    const apiUrl = import.meta.env.DEV
      ? 'http://localhost:3000/auth/google'
      : '/auth/google';
    window.location.href = apiUrl;
  };

  return (
    <div className="auth-page story-public">
      <Header />

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{t('auth.login.h')}</h1>
            <p>{t('auth.login.p')}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {errors.submit && (
              <div className="form-error" role="alert">
                <span>⚠️</span>
                <span>{errors.submit}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className={errors.email && touched.email ? 'required' : ''}>
                {t('auth.email')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="you@example.com"
                required
                disabled={loading}
                aria-invalid={errors.email && touched.email ? 'true' : 'false'}
                aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
                className={errors.email && touched.email ? 'error' : ''}
                data-testid="login-email"
              />
              {errors.email && touched.email && (
                <div className="form-error" id="email-error" role="alert">
                  <span>⚠️</span>
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password" className={errors.password && touched.password ? 'required' : ''}>
                {t('auth.password')}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="••••••••"
                required
                disabled={loading}
                aria-invalid={errors.password && touched.password ? 'true' : 'false'}
                aria-describedby={errors.password && touched.password ? 'password-error' : undefined}
                className={errors.password && touched.password ? 'error' : ''}
                data-testid="login-password"
              />
              {errors.password && touched.password && (
                <div className="form-error" id="password-error" role="alert">
                  <span>⚠️</span>
                  <span>{errors.password}</span>
                </div>
              )}
            </div>

            <div className="form-footer">
              <Link to="/forgot-password" className="link-text">
                {t('auth.forgot')}
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              data-testid="login-submit"
            >
              {loading ? (
                <>
                  <span className="loading-spinner-sm"></span>
                  {t('auth.signingIn')}
                </>
              ) : (
                t('auth.signIn')
              )}
            </button>
          </form>

          <div className="divider">
            <span>{t('auth.or')}</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn btn-secondary btn-full"
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
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="link-primary">
                {t('auth.signUp')}
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Login;
