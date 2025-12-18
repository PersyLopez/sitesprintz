import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import { PasswordStrengthMeter } from '../components/auth/PasswordStrengthMeter';
import './Auth.css';

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const { showSuccess, showError } = useToast();
  const turnstileRef = useRef(null);
  const captchaTokenRef = useRef(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [captchaReady, setCaptchaReady] = useState(false);

  // Initialize Cloudflare Turnstile
  useEffect(() => {
    // Check if Turnstile is loaded
    if (window.turnstile) {
      setCaptchaReady(true);
      // Render Turnstile widget
      const widgetId = window.turnstile.render(turnstileRef.current, {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '',
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

      return () => {
        // Cleanup widget on unmount
        if (window.turnstile && widgetId) {
          window.turnstile.remove(widgetId);
        }
      };
    } else {
      // Wait for Turnstile to load
      const checkTurnstile = setInterval(() => {
        if (window.turnstile) {
          setCaptchaReady(true);
          clearInterval(checkTurnstile);
        }
      }, 100);

      return () => clearInterval(checkTurnstile);
    }
  }, [showError]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

    // Password validation will be handled by backend
    // Frontend validation is for UX only

    // Check CAPTCHA if site key is configured
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (siteKey && !captchaTokenRef.current) {
      showError('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, captchaTokenRef.current);
      showSuccess('Account created successfully!');
      
      // Reset CAPTCHA after successful registration
      if (window.turnstile && turnstileRef.current) {
        window.turnstile.reset();
        captchaTokenRef.current = null;
      }

      const template = searchParams.get('template');
      if (template) {
        navigate(`/setup?template=${template}`);
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
    // Google OAuth routes are on the backend server
    const apiUrl = import.meta.env.DEV
      ? 'http://localhost:3000/auth/google'
      : '/auth/google';
    window.location.href = apiUrl;
  };

  return (
    <div className="auth-page">
      <Header />

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Create Your Account</h1>
            <p>Start building your website today</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a secure password"
                required
                disabled={loading}
                minLength={12}
              />
              <PasswordStrengthMeter password={formData.password} />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                disabled={loading}
                minLength={12}
              />
            </div>

            {/* Cloudflare Turnstile CAPTCHA */}
            {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
              <div className="form-group">
                <div ref={turnstileRef} className="turnstile-widget"></div>
                {!captchaReady && (
                  <small className="form-hint">Loading security verification...</small>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner-sm"></span>
                  Creating account...
                </>
              ) : (
                'Create Account'
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
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
              <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853" />
              <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
              <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="auth-switch">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="link-primary">
                Sign in
              </Link>
            </p>
          </div>

          <p className="terms-text">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
