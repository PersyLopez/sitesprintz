import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth, user, loading } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      
      if (token) {
        // Store token
        localStorage.setItem('authToken', token);
        
        // Wait a moment for storage to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Reinitialize auth
        if (checkAuth) {
          await checkAuth();
        }
      } else {
        // No token, redirect to login
        navigate('/login', { replace: true });
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
        navigate('/dashboard', { replace: true });
      }
    }
  }, [loading, user, navigate]);

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

