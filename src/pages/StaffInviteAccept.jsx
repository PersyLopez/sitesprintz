import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import api from '../services/api';
import './Auth.css';

function StaffInviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      validateInvitation();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [token]);

  const validateInvitation = async () => {
    try {
      setLoading(true);
      // We'll validate on the backend when accepting, but we can show a loading state
      setInvitation({ token }); // Placeholder - actual validation happens on accept
    } catch (err) {
      setError(err.message || 'Invalid invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/staff/accept/${token}`);
      return;
    }

    try {
      setAccepting(true);
      const response = await api.post('/api/staff/accept-invitation', {
        token
      });

      showSuccess('Invitation accepted! Redirecting to your dashboard...');
      setTimeout(() => {
        navigate('/staff/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Accept invitation error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to accept invitation';
      showError(errorMessage);
      setError(errorMessage);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page story-public">
        <Header />
        <main className="auth-container">
          <div className="auth-card">
            <div className="loading-message">
              <div className="spinner"></div>
              <p>Validating invitation...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="auth-page story-public">
        <Header />
        <main className="auth-container">
          <div className="auth-card">
            <div className="error-message">
              <div className="error-icon">❌</div>
              <h2>Invalid Invitation</h2>
              <p>{error}</p>
              <div className="auth-links">
                <Link to="/login" className="btn btn-primary">
                  Go to Login
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="auth-page story-public">
      <Header />
      <main className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>👋 Staff Invitation</h1>
            <p>You've been invited to join as a staff member</p>
          </div>

          {!isAuthenticated ? (
            <div className="invitation-not-logged-in">
              <p>Please log in or create an account to accept this invitation.</p>
              <div className="auth-links" style={{ marginTop: '20px' }}>
                <Link 
                  to={`/login?redirect=/staff/accept/${token}`}
                  className="btn btn-primary btn-full"
                >
                  Log In
                </Link>
                <Link 
                  to={`/register?redirect=/staff/accept/${token}`}
                  className="btn btn-secondary btn-full"
                  style={{ marginTop: '10px' }}
                >
                  Create Account
                </Link>
              </div>
            </div>
          ) : (
            <div className="invitation-logged-in">
              <p>Welcome, <strong>{user?.email}</strong>!</p>
              <p>Click the button below to accept this staff invitation.</p>
              
              {error && (
                <div className="error-message" style={{ marginTop: '20px', padding: '12px' }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleAccept}
                className="btn btn-primary btn-full"
                disabled={accepting}
                style={{ marginTop: '20px' }}
              >
                {accepting ? 'Accepting...' : 'Accept Invitation'}
              </button>
            </div>
          )}

          <div className="auth-links" style={{ marginTop: '30px' }}>
            <Link to="/">← Back to Home</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default StaffInviteAccept;



