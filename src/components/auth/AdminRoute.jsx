import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function AdminRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    console.log('AdminRoute: loading...');
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('AdminRoute: not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check if user has admin role
  console.log('AdminRoute: user object:', JSON.stringify(user));
  console.log('AdminRoute: user role:', user?.role);
  if (user?.role !== 'admin') {
    console.log('AdminRoute: user not admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('AdminRoute: access granted');
  return children;
}

export default AdminRoute;

