import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePlan } from '../hooks/usePlan';
import { useSiteWorkspace } from '../context/SiteWorkspaceContext';
import { get } from '../utils/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ServiceManager from '../components/booking/ServiceManager';
import AppointmentList from '../components/booking/AppointmentList';
import AvailabilityScheduler from '../components/booking/AvailabilityScheduler';
import BookingIntakeSettings from '../components/booking/BookingIntakeSettings';
import './BookingDashboard.css';

const BookingDashboard = () => {
  const { user } = useAuth();
  const { showError } = useToast();
  const { isAbove, isGrowth, isPro } = usePlan();
  const { embedded, siteId } = useSiteWorkspace();
  const siteQuery = siteId ? { siteId } : undefined;

  const [activeTab, setActiveTab] = useState('appointments');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_appointments: 0,
    pending_appointments: 0,
    confirmed_appointments: 0,
    total_revenue: 0,
    active_services: 0,
  });
  const [statsError, setStatsError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Growth plan required for native booking
  const hasBookingAccess = (typeof isAbove === 'function' && isAbove('growth')) || Boolean(isGrowth || isPro);

  useEffect(() => {
    if (!hasBookingAccess) {
      showError('Booking features require a Growth plan');
      return;
    }

    if (user?.id) {
      fetchStats();
    }
  }, [user, hasBookingAccess, siteId]);

  const fetchStats = async () => {
    try {
      console.log('Fetching booking stats...');
      setLoading(true);
      setStatsError(null);

      // Fetch appointments and services to calculate stats
      const [appointmentsRes, servicesRes] = await Promise.all([
        get(`/api/booking/admin/${user.id}/appointments`, { params: siteQuery }),
        get(`/api/booking/tenants/${user.id}/services`, { params: siteQuery }),
      ]);

      console.log('Stats fetched successfully', { appointments: appointmentsRes, services: servicesRes });

      const appointments = appointmentsRes.appointments || [];
      const services = servicesRes.services || [];

      // Calculate stats
      const pending = appointments.filter(a => a.status === 'pending').length;
      const confirmed = appointments.filter(a => a.status === 'confirmed').length;
      const revenue = appointments
        .filter(a => a.status === 'confirmed')
        .reduce((sum, a) => sum + (a.total_price_cents || 0), 0);

      setStats({
        total_appointments: appointments.length,
        pending_appointments: pending,
        confirmed_appointments: confirmed,
        total_revenue: revenue,
        active_services: services.filter(s => s.online_booking_enabled).length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStatsError('Failed to load stats');
      showError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchStats();
  };

  const handleTabChange = (tab) => {
    console.log('Switching tab to:', tab);
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleAddService = () => {
    setActiveTab('services');
  };

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Check window size for mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const PageContainer = embedded ? 'div' : 'main';

  return (
    <div className={`booking-dashboard${embedded ? ' embedded-page' : ''}`}>
      {!embedded && <Header />}

      <PageContainer className="dashboard-container" data-testid="booking-dashboard-page">
        {/* Growth Access Gate */}
        {!hasBookingAccess ? (
          <div className="access-denied">
            <div className="access-denied-card">
              <h2>Growth Feature</h2>
              <p>Booking management is available on the Growth plan.</p>
              <div className="upgrade-benefits">
                <h3>With Growth you get:</h3>
                <ul>
                  <li>Complete booking management system</li>
                  <li>Admin dashboard for appointments</li>
                  <li>Service management (CRUD)</li>
                  <li>Schedule configuration</li>
                  <li>Customer booking widget</li>
                  <li>Email notifications</li>
                  <li>Analytics and stats</li>
                </ul>
              </div>
              <button
                className="upgrade-btn"
                onClick={() => window.location.href = '/dashboard'}
              >
                Upgrade to Growth
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={`dashboard-header${embedded ? ' pane-quiet-header' : ''}`}>
              <div>
                {embedded ? (
                  <h2>Appointments</h2>
                ) : (
                  <h1>Booking Dashboard</h1>
                )}
                <span className="pro-badge">GROWTH</span>
              </div>
              <button
                className="refresh-btn"
                onClick={handleRefresh}
                aria-label="Refresh"
                data-testid="dashboard-refresh-btn"
              >
                Refresh
              </button>

              {!embedded && window.innerWidth <= 768 && (
                <button
                  className="mobile-menu-toggle"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Menu"
                  data-testid="mobile-menu-toggle"
                >
                  Menu
                </button>
              )}
            </div>

            {/* Stats Cards */}
            {loading && (
              <div className="loading" role="status">Loading...</div>
            )}

            {statsError && (
              <div className="error-message" role="alert">{statsError}</div>
            )}

            {!loading && !statsError && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total Appointments</div>
                  <div className="stat-value">{stats.total_appointments}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Pending</div>
                  <div className="stat-value">{stats.pending_appointments}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Confirmed</div>
                  <div className="stat-value">{stats.confirmed_appointments}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Revenue</div>
                  <div className="stat-value">{formatCurrency(stats.total_revenue)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Active Services</div>
                  <div className="stat-value">{stats.active_services}</div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions">
              <button
                className="action-btn"
                data-testid="add-service-button"
                onClick={handleAddService}
              >
                Add Service
              </button>
            </div>

            {/* Navigation Tabs */}
            <div
              className={`${embedded ? 'pane-subnav' : 'dashboard-tabs'}${mobileMenuOpen ? ' mobile-open' : ''}`}
              role="tablist"
              aria-label="Booking sections"
            >
              <button
                type="button"
                role="tab"
                data-testid="appointments-tab"
                className={`tab ${activeTab === 'appointments' ? 'active' : ''}`}
                aria-selected={activeTab === 'appointments'}
                onClick={() => handleTabChange('appointments')}
              >
                Appointments
              </button>
              <button
                type="button"
                role="tab"
                data-testid="services-tab"
                className={`tab ${activeTab === 'services' ? 'active' : ''}`}
                aria-selected={activeTab === 'services'}
                onClick={() => handleTabChange('services')}
              >
                Services
              </button>
              <button
                type="button"
                role="tab"
                data-testid="schedule-tab"
                className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
                aria-selected={activeTab === 'schedule'}
                onClick={() => handleTabChange('schedule')}
              >
                Schedule
              </button>
              <button
                type="button"
                role="tab"
                data-testid="settings-tab"
                className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
                aria-selected={activeTab === 'settings'}
                onClick={() => handleTabChange('settings')}
              >
                Settings
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'appointments' && (
                <AppointmentList userId={user?.id} siteId={siteId} onRefresh={fetchStats} />
              )}
              {activeTab === 'services' && (
                <ServiceManager userId={user?.id} siteId={siteId} onRefresh={fetchStats} />
              )}
              {activeTab === 'schedule' && (
                <AvailabilityScheduler userId={user?.id} siteId={siteId} />
              )}
              {activeTab === 'settings' && (
                <BookingIntakeSettings userId={user?.id} siteId={siteId} />
              )}
            </div>
          </>
        )}
      </PageContainer>

      {!embedded && <Footer />}
    </div>
  );
};

export default BookingDashboard;

