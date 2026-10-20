import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { TipsProvider } from './context/TipsContext';
import { StaffProvider } from './context/StaffContext';

// Marketing pages and their copy load on those routes, not with a published shop.
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SiteDashboard = lazy(() => import('./pages/SiteDashboard'));
const SiteOverview = lazy(() => import('./components/dashboard/SiteOverview'));
const SiteSettingsPanel = lazy(() => import('./components/dashboard/SiteSettingsPanel'));
// The editor draft lives on /setup. Load it with that page so a shop does not download it.
const Setup = lazy(() =>
  Promise.all([
    import('./pages/Setup'),
    import('./context/SiteContext'),
  ]).then(([setupModule, siteModule]) => ({
    default: function SetupWithSite() {
      const SetupPage = setupModule.default;
      const { SiteProvider } = siteModule;
      return (
        <SiteProvider>
          <SetupPage />
        </SiteProvider>
      );
    },
  }))
);
const Orders = lazy(() => import('./pages/Orders'));
const Inquiries = lazy(() => import('./pages/Inquiries'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminPlanFeatures = lazy(() => import('./pages/AdminPlanFeatures'));
const AdminCoupons = lazy(() => import('./pages/AdminCoupons'));
const AdminSites = lazy(() => import('./pages/AdminSites'));
const AdminCandidates = lazy(() => import('./pages/AdminCandidates'));
const AdminBuildIntakes = lazy(() => import('./pages/AdminBuildIntakes'));
const AdminTemplates = lazy(() => import('./pages/AdminTemplates'));
const TemplateEditor = lazy(() => import('./components/admin/template-editor/TemplateEditor'));
const PricingManagement = lazy(() => import('./components/admin/PricingManagement'));
const Products = lazy(() => import('./pages/Products'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ShowcaseGallery = lazy(() => import('./pages/ShowcaseGallery'));
const ShowcaseDetail = lazy(() => import('./pages/ShowcaseDetail'));
const PublishedSiteViewer = lazy(() => import('./pages/PublishedSiteViewer'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const AppointmentPage = lazy(() => import('./pages/AppointmentPage'));
const BookingDashboard = lazy(() => import('./pages/BookingDashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const FoundationSettingsPage = lazy(() => import('./pages/FoundationSettingsPage'));
const StaffInviteAccept = lazy(() => import('./pages/StaffInviteAccept'));
const ClaimSite = lazy(() => import('./pages/ClaimSite'));
const BuildIntake = lazy(() => import('./pages/BuildIntake'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const StaffAppointments = lazy(() => import('./pages/StaffAppointments'));
const StaffSchedule = lazy(() => import('./pages/StaffSchedule'));
const StaffOrders = lazy(() => import('./pages/StaffOrders'));
const TrackLookup = lazy(() => import('./pages/TrackLookup'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const TrackAppointment = lazy(() => import('./pages/TrackAppointment'));

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import LoadingFallback from './components/common/LoadingFallback';
import ErrorBoundary from './components/common/ErrorBoundary';
import CustomDomainGate from './components/published/CustomDomainGate';
import LegacySitePaneRedirect, { LegacyPublishedSiteRedirect } from './components/dashboard/LegacySitePaneRedirect';
import { LocaleProvider } from './i18n/LocaleContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

import { useEffect } from 'react';
import { initWebVitals } from './utils/webVitals';
import { syncClarity } from './utils/clarity';

function ClaritySync() {
  const { pathname } = useLocation();

  useEffect(() => {
    syncClarity({
      isProd: import.meta.env.PROD,
      hostname: window.location.hostname,
      pathname,
    });
  }, [pathname]);

  return null;
}

function App() {
  useEffect(() => {
    initWebVitals();
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <ClaritySync />
        <LocaleProvider>
        <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <TipsProvider>
              <CartProvider>
              <StaffProvider>
              <CustomDomainGate>
              <Routes>
              {/* Public routes */}
              <Route
                path="/"
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <Landing />
                  </Suspense>
                }
              />
              <Route
                path="/login"
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <Login />
                  </Suspense>
                }
              />
              <Route
                path="/about"
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <About />
                  </Suspense>
                }
              />
              <Route
                path="/contact"
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <Contact />
                  </Suspense>
                }
              />
              <Route
                path="/build"
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <BuildIntake />
                  </Suspense>
                }
              />
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
                  <Suspense fallback={<LoadingFallback title="Showcase" message="Loading showcase..." />}>
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
                path="/view/:subdomain" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading published site..." />}>
                    <PublishedSiteViewer />
                  </Suspense>
                } 
              />
              <Route
                path="/sites/:subdomain"
                element={<LegacyPublishedSiteRedirect />}
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
              <Route 
                path="/track" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <TrackLookup />
                  </Suspense>
                } 
              />
              <Route 
                path="/track/order/:token" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading order..." />}>
                    <TrackOrder />
                  </Suspense>
                } 
              />
              <Route 
                path="/track/appointment/:code" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading appointment..." />}>
                    <TrackAppointment />
                  </Suspense>
                } 
              />
              <Route 
                path="/staff/accept/:token" 
                element={
                  <Suspense fallback={<LoadingFallback message="Loading invitation..." />}>
                    <StaffInviteAccept />
                  </Suspense>
                } 
              />
              <Route
                path="/claim/:token"
                element={
                  <Suspense fallback={<LoadingFallback message="Loading claim..." />}>
                    <ClaimSite />
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
                path="/dashboard/sites/:siteId"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading site dashboard..." />}>
                      <SiteDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              >
                <Route
                  index
                  element={
                    <Suspense fallback={<LoadingFallback message="Loading overview..." />}>
                      <SiteOverview />
                    </Suspense>
                  }
                />
                <Route
                  path="orders"
                  element={
                    <Suspense fallback={<LoadingFallback message="Loading orders..." />}>
                      <Orders />
                    </Suspense>
                  }
                />
                <Route
                  path="messages"
                  element={
                    <Suspense fallback={<LoadingFallback message="Loading messages..." />}>
                      <Inquiries />
                    </Suspense>
                  }
                />
                <Route
                  path="appointments"
                  element={
                    <Suspense fallback={<LoadingFallback message="Loading appointments..." />}>
                      <BookingDashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="products"
                  element={
                    <Suspense fallback={<LoadingFallback message="Loading products..." />}>
                      <Products />
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<LoadingFallback message="Loading settings..." />}>
                      <SiteSettingsPanel />
                    </Suspense>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <Suspense fallback={<LoadingFallback message="Loading analytics..." />}>
                      <Analytics />
                    </Suspense>
                  }
                />
              </Route>
              <Route
                path="/dashboard/orders"
                element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/analytics"
                element={
                  <ProtectedRoute>
                    <Navigate to="/analytics" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/payment-settings"
                element={
                  <ProtectedRoute>
                    <Navigate to="/settings/payments" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/settings/payments"
                element={
                  <ProtectedRoute>
                    <Navigate to="/settings/payments" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/stripe"
                element={
                  <ProtectedRoute>
                    <Navigate to="/settings/payments" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setup"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading setup..." />}>
                      <Setup />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <LegacySitePaneRedirect pane="orders" />
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
                path="/analytics/:subdomain"
                element={
                  <ProtectedRoute>
                    <LegacySitePaneRedirect pane="analytics" fromParam />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings/*"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading settings..." />}>
                      <Settings />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sites/:subdomain/foundation"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading foundation settings..." />}>
                      <FoundationSettingsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <LegacySitePaneRedirect pane="products" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/booking-dashboard"
                element={
                  <ProtectedRoute>
                    <LegacySitePaneRedirect pane="appointments" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/dashboard"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading staff dashboard..." />}>
                      <StaffDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/appointments/:tenantId"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading appointments..." />}>
                      <StaffAppointments />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/schedule/:tenantId"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading schedule..." />}>
                      <StaffSchedule />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/orders/:tenantId"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading orders..." />}>
                      <StaffOrders />
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
                    <Navigate to="/admin" replace />
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
                path="/admin/sites"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingFallback message="Loading sites..." />}>
                      <AdminSites />
                    </Suspense>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/candidates"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingFallback message="Loading candidates..." />}>
                      <AdminCandidates />
                    </Suspense>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/build-intakes"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingFallback message="Loading build intakes..." />}>
                      <AdminBuildIntakes />
                    </Suspense>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/pricing"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingFallback message="Loading pricing management..." />}>
                      <PricingManagement />
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
              <Route
                path="/admin/coupons"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingFallback message="Loading coupons..." />}>
                      <AdminCoupons />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* Admin Templates */}
              <Route
                path="/admin/templates"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingFallback message="Loading templates..." />}>
                      <AdminTemplates />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* Admin Template Editor */}
              <Route
                path="/admin/templates/:templateId"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LoadingFallback message="Loading template editor..." />}>
                      <TemplateEditor />
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
              </CustomDomainGate>
            </StaffProvider>
            </CartProvider>
            </TipsProvider>
          </ToastProvider>
        </AuthProvider>
        </ThemeProvider>
        </LocaleProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

