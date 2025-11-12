import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './Auth.css';

function ForgotPassword() {
  const { showSuccess, showError } = useToast();
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
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Failed to send reset email');
      }

      setSent(true);
      showSuccess('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Forgot password error:', error);
      showError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Header />
      
      <main className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>🔑 Forgot Password</h1>
            <p>Enter your email and we'll send you a reset link</p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
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
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="auth-links">
                <Link to="/login">← Back to Login</Link>
              </div>
            </form>
          ) : (
            <div className="success-message">
              <div className="success-icon">✅</div>
              <h2>Check Your Email</h2>
              <p>
                We've sent a password reset link to <strong>{email}</strong>.
                Click the link in the email to reset your password.
              </p>
              <p className="text-muted">
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  onClick={() => setSent(false)}
                  className="link-button"
                >
                  try again
                </button>
              </p>
              <div className="auth-links">
                <Link to="/login">← Back to Login</Link>
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
