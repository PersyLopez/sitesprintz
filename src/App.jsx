import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SiteProvider } from './context/SiteContext';
import { CartProvider } from './context/CartContext';

// Critical pages - load immediately (above the fold)
import Landing from './pages/Landing';
import Login from './pages/Login';

// Lazy load all other pages for code splitting
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Setup = lazy(() => import('./pages/Setup'));
const Orders = lazy(() => import('./pages/Orders'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminPlanFeatures = lazy(() => import('./pages/AdminPlanFeatures'));
const Products = lazy(() => import('./pages/Products'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ShowcaseGallery = lazy(() => import('./pages/ShowcaseGallery'));
const ShowcaseDetail = lazy(() => import('./pages/ShowcaseDetail'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const AppointmentPage = lazy(() => import('./pages/AppointmentPage'));
const BookingDashboard = lazy(() => import('./pages/BookingDashboard'));

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import LoadingFallback from './components/common/LoadingFallback';

import api from './services/api';
import { useEffect } from 'react';
import { initWebVitals } from './utils/webVitals';

function App() {
  useEffect(() => {
    api.initCsrf();
    // Initialize Core Web Vitals monitoring
    initWebVitals();
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
              <Route 
                path="/register" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading registration..." />}>
                    <Register />
                  </Suspense>
                } 
              />
              <Route 
                path="/verify-email" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <VerifyEmail />
                  </Suspense>
                } 
              />
              <Route 
                path="/forgot-password" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <ForgotPassword />
                  </Suspense>
                } 
              />
              <Route 
                path="/reset-password" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <ResetPassword />
                  </Suspense>
                } 
              />
              <Route 
                path="/oauth/callback" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <OAuthCallback />
                  </Suspense>
                } 
              />
              <Route 
                path="/showcase" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading showcase..." />}>
                    <ShowcaseGallery />
                  </Suspense>
                } 
              />
              <Route 
                path="/showcase/:subdomain" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading site..." />}>
                    <ShowcaseDetail />
                  </Suspense>
                } 
              />
              <Route 
                path="/payment-success" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <PaymentSuccess />
                  </Suspense>
                } 
              />
              <Route 
                path="/payment-cancel" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <PaymentCancel />
                  </Suspense>
                } 
              />
              <Route 
                path="/booking/user/:userId" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading booking..." />}>
                    <BookingPage />
                  </Suspense>
                } 
              />
              <Route 
                path="/booking/appointment/:confirmationCode" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading appointment..." />}>
                    <AppointmentPage />
                  </Suspense>
                } 
              />

              {/* Protected routes - Lazy loaded */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading dashboard..." />}>
                      <Dashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setup"
                element={
                  <ProtectedRoute>
                    <SiteProvider>
                      <Suspense fallback={<LoadingFallback message="Loading setup..." />}>
                        <Setup />
                      </Suspense>
                    </SiteProvider>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading orders..." />}>
                      <Orders />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading analytics..." />}>
                      <Analytics />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading products..." />}>
                      <Products />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/booking-dashboard"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading booking dashboard..." />}>
                      <BookingDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* Admin routes - Lazy loaded */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingFallback message="Loading admin panel..." />}>
                      <Admin />
                    </Suspense>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingFallback message="Loading admin analytics..." />}>
                      <Admin />
                    </Suspense>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingFallback message="Loading user management..." />}>
                      <AdminUsers />
                    </Suspense>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/plan-features"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingFallback message="Loading plan features..." />}>
                      <AdminPlanFeatures />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* 404 */}
              <Route 
                path="*" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <NotFound />
                  </Suspense>
                } 
              />
            </Routes>
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

