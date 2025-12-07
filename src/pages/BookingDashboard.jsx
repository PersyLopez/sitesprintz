import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePlan } from '../hooks/usePlan';
import { get } from '../utils/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ServiceManager from '../components/booking/ServiceManager';
import AppointmentList from '../components/booking/AppointmentList';
import AvailabilityScheduler from '../components/booking/AvailabilityScheduler';
import './BookingDashboard.css';

const BookingDashboard = () => {
  const { user } = useAuth();
  const { showError } = useToast();
  const { isPro, isPremium, plan } = usePlan();

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

  // Check if user has access to booking features (Pro+ only)
  const hasBookingAccess = isPro || isPremium || plan === 'checkout';

  useEffect(() => {
    if (!hasBookingAccess) {
      showError('Booking features require a Pro or higher subscription');
      return;
    }

    if (user?.id) {
      fetchStats();
    }
  }, [user, hasBookingAccess]);

  const fetchStats = async () => {
    try {
      console.log('Fetching booking stats...');
      setLoading(true);
      setStatsError(null);

      // Fetch appointments and services to calculate stats
      const [appointmentsRes, servicesRes] = await Promise.all([
        get(`/api/booking/admin/${user.id}/appointments`),
        get(`/api/booking/tenants/${user.id}/services`),
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

  const handleViewCalendar = () => {
    setActiveTab('appointments');
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

  return (
    <div className="booking-dashboard">
      <Header />

      <div className="dashboard-container">
        {/* Pro+ Access Gate */}
        {!hasBookingAccess ? (
          <div className="access-denied">
            <div className="access-denied-card">
              <h2>🔒 Pro Feature</h2>
              <p>Booking management is available with Pro or higher plans.</p>
              <div className="upgrade-benefits">
                <h3>With Pro you get:</h3>
                <ul>
                  <li>✅ Complete booking management system</li>
                  <li>✅ Admin dashboard for appointments</li>
                  <li>✅ Service management (CRUD)</li>
                  <li>✅ Schedule configuration</li>
                  <li>✅ Customer booking widget</li>
                  <li>✅ Email notifications</li>
                  <li>✅ Analytics and stats</li>
                </ul>
              </div>
              <button
                className="upgrade-btn"
                onClick={() => window.location.href = '/dashboard'}
              >
                ⬆️ Upgrade to Pro
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="dashboard-header">
              <div>
                <h1>Booking Dashboard</h1>
                <span className="pro-badge">PRO</span>
              </div>
              <button
                className="refresh-btn"
                onClick={handleRefresh}
                aria-label="Refresh"
                data-testid="dashboard-refresh-btn"
              >
                🔄 Refresh
              </button>

              {window.innerWidth <= 768 && (
                <button
                  className="mobile-menu-toggle"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Menu"
                >
                  ☰ Menu
                </button>
              )}
            </div>

            {/* Stats Cards */}
            {loading && <div className="loading">Loading...</div>}

            {statsError && (
              <div className="error-message">{statsError}</div>
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
                ➕ Add Service
              </button>
              <button
                className="action-btn"
                onClick={handleViewCalendar}
              >
                📅 View Calendar
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className={`dashboard-tabs ${mobileMenuOpen ? 'mobile-open' : ''}`}>
              <button
                role="tab"
                data-testid="appointments-tab"
                className={`tab ${activeTab === 'appointments' ? 'active' : ''}`}
                onClick={() => handleTabChange('appointments')}
              >
                📅 Appointments
              </button>
              <button
                role="tab"
                data-testid="services-tab"
                className={`tab ${activeTab === 'services' ? 'active' : ''}`}
                onClick={() => handleTabChange('services')}
              >
                🛠️ Services
              </button>
              <button
                role="tab"
                data-testid="schedule-tab"
                className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
                onClick={() => handleTabChange('schedule')}
              >
                ⏰ Schedule
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'appointments' && (
                <AppointmentList userId={user?.id} onRefresh={fetchStats} />
              )}
              {activeTab === 'services' && (
                <ServiceManager userId={user?.id} onRefresh={fetchStats} />
              )}
              {activeTab === 'schedule' && (
                <AvailabilityScheduler userId={user?.id} />
              )}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BookingDashboard;

