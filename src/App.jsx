import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SiteProvider } from './context/SiteContext';
import { CartProvider } from './context/CartContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Setup from './pages/Setup';
import Orders from './pages/Orders';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import AdminUsers from './pages/AdminUsers';
import Products from './pages/Products';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import OAuthCallback from './pages/OAuthCallback';
import NotFound from './pages/NotFound';
import ShowcaseGallery from './pages/ShowcaseGallery';
import ShowcaseDetail from './pages/ShowcaseDetail';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import BookingPage from './pages/BookingPage';
import AppointmentPage from './pages/AppointmentPage';
import BookingDashboard from './pages/BookingDashboard';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';

import api from './services/api';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    api.initCsrf();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              <Route path="/showcase" element={<ShowcaseGallery />} />
              <Route path="/showcase/:subdomain" element={<ShowcaseDetail />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancel" element={<PaymentCancel />} />
              <Route path="/booking/user/:userId" element={<BookingPage />} />
              <Route path="/booking/appointment/:confirmationCode" element={<AppointmentPage />} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setup"
                element={
                  <ProtectedRoute>
                    <SiteProvider>
                      <Setup />
                    </SiteProvider>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <Products />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/booking-dashboard"
                element={
                  <ProtectedRoute>
                    <BookingDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AdminUsers />
                  </AdminRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

