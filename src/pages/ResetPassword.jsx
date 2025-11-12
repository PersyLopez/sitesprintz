import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './Auth.css';

function ResetPassword() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [validToken, setValidToken] = useState(true);

  useEffect(() => {
    // Get token from URL
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setValidToken(false);
      showError('Invalid or missing reset token');
    } else {
      setToken(tokenParam);
    }
  }, [searchParams, showError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      showError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      showError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token,
          password 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset password');
      }

      showSuccess('Password reset successful! You can now login.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      console.error('Reset password error:', error);
      showError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    return (
      <div className="auth-page">
        <Header />
        
        <main className="auth-container">
          <div className="auth-card">
            <div className="error-message">
              <div className="error-icon">❌</div>
              <h2>Invalid Reset Link</h2>
              <p>
                This password reset link is invalid or has expired.
                Please request a new one.
              </p>
              <div className="auth-links">
                <Link to="/forgot-password" className="btn btn-primary">
                  Request New Link
                </Link>
                <Link to="/login">← Back to Login</Link>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <Header />
      
      <main className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>🔒 Reset Password</h1>
            <p>Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                autoFocus
                minLength={8}
              />
              <small className="form-hint">
                Must be at least 8 characters
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={8}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <div className="auth-links">
              <Link to="/login">← Back to Login</Link>
            </div>
          </form>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default ResetPassword;
