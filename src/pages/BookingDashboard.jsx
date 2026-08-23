import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePlan } from '../hooks/usePlan';
import { useSiteWorkspace } from '../context/SiteWorkspaceContext';
import { get, put } from '../utils/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ServiceManager from '../components/booking/ServiceManager';
import AppointmentList from '../components/booking/AppointmentList';
import AvailabilityScheduler from '../components/booking/AvailabilityScheduler';
import TeamCalendar from '../components/booking/TeamCalendar';
import './BookingDashboard.css';

const BookingDashboard = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
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
  const [phase2Settings, setPhase2Settings] = useState({
    reminders_enabled: true,
    reminder_hours: 24,
    buffer_minutes: 15
  });
  const [savingPhase2, setSavingPhase2] = useState(false);

  // Growth plan required for native booking
  const hasBookingAccess = (typeof isAbove === 'function' && isAbove('growth')) || Boolean(isGrowth || isPro);

  useEffect(() => {
    if (!hasBookingAccess) {
      showError('Booking features require a Growth plan');
      return;
    }

    if (user?.id) {
      fetchStats();
      loadPhase2Settings();
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

  const handleViewCalendar = () => {
    setActiveTab('calendar');
  };

  const loadPhase2Settings = async () => {
    if (!user?.id) return;
    try {
      const settings = await get(`/api/booking/tenants/${user.id}/reminder-settings`, { params: siteQuery });
      const servicesRes = await get(`/api/booking/tenants/${user.id}/services`, { params: siteQuery });
      const firstService = (servicesRes.services || [])[0];
      setPhase2Settings({
        reminders_enabled: settings.enabled ?? true,
        reminder_hours: settings.hoursBefore ?? 24,
        buffer_minutes: firstService?.buffer_minutes_after
          ?? firstService?.buffer_minutes_before
          ?? 15
      });
    } catch (error) {
      console.error('Error loading Phase 2 settings:', error);
    }
  };

  const savePhase2Settings = async () => {
    if (!user?.id) return;
    
    try {
      setSavingPhase2(true);
      await put(`/api/booking/tenants/${user.id}/reminder-settings`, {
        enabled: phase2Settings.reminders_enabled,
        hoursBefore: phase2Settings.reminder_hours,
      });

      const servicesRes = await get(`/api/booking/tenants/${user.id}/services`, { params: siteQuery });
      const services = servicesRes.services || [];
      await Promise.all(
        services.map((svc) =>
          put(`/api/booking/services/${svc.id}/buffer-settings`, {
            before: phase2Settings.buffer_minutes || 0,
            after: phase2Settings.buffer_minutes || 0,
          })
        )
      );

      showSuccess('Settings saved successfully');
    } catch (error) {
      console.error('Error saving Phase 2 settings:', error);
      showError(error.message || 'Error saving Phase 2 settings');
    } finally {
      setSavingPhase2(false);
    }
  };

  const handlePhase2SettingChange = (field, value) => {
    setPhase2Settings(prev => ({ ...prev, [field]: value }));
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
            <div className="dashboard-header">
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
                🔄 Refresh
              </button>

              {window.innerWidth <= 768 && (
                <button
                  className="mobile-menu-toggle"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Menu"
                  data-testid="mobile-menu-toggle"
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
                data-testid="calendar-board-tab"
                className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
                onClick={() => handleTabChange('calendar')}
              >
                🗓️ Team calendar
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
              <button
                role="tab"
                data-testid="phase2-tab"
                className={`tab ${activeTab === 'phase2' ? 'active' : ''}`}
                onClick={() => handleTabChange('phase2')}
              >
                🔔 Phase 2 Settings
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'appointments' && (
                <AppointmentList userId={user?.id} siteId={siteId} onRefresh={fetchStats} />
              )}
              {activeTab === 'calendar' && (
                <TeamCalendar userId={user?.id} siteId={siteId} />
              )}
              {activeTab === 'services' && (
                <ServiceManager userId={user?.id} siteId={siteId} onRefresh={fetchStats} />
              )}
              {activeTab === 'schedule' && (
                <AvailabilityScheduler userId={user?.id} siteId={siteId} />
              )}
              {activeTab === 'phase2' && (
                <div className="phase2-settings-panel" data-testid="phase2-settings-panel">
                  <h3>🔔 Reminders & Availability Buffer</h3>
                  <p className="settings-intro">Configure phase 2 settings for your booking system.</p>

                  <fieldset className="settings-fieldset">
                    <legend>Appointment Reminders</legend>
                    <label className="settings-label">
                      <input
                        type="checkbox"
                        name="reminders_enabled"
                        checked={phase2Settings.reminders_enabled}
                        onChange={(e) => handlePhase2SettingChange('reminders_enabled', e.target.checked)}
                        data-testid="reminders-enabled-checkbox"
                      />
                      <span>Enable automated reminders</span>
                    </label>
                    {phase2Settings.reminders_enabled && (
                      <label className="settings-label with-input">
                        <span>Hours before appointment:</span>
                        <input
                          type="number"
                          name="reminder_hours"
                          min="1"
                          max="72"
                          value={phase2Settings.reminder_hours}
                          onChange={(e) => handlePhase2SettingChange('reminder_hours', parseInt(e.target.value))}
                          data-testid="reminder-hours-input"
                        />
                      </label>
                    )}
                  </fieldset>

                  <fieldset className="settings-fieldset">
                    <legend>Buffer Time Between Appointments</legend>
                    <label className="settings-label with-input">
                      <span>Minutes (for setup/cleanup):</span>
                      <input
                        type="number"
                        name="buffer_minutes"
                        min="0"
                        max="120"
                        value={phase2Settings.buffer_minutes}
                        onChange={(e) => handlePhase2SettingChange('buffer_minutes', parseInt(e.target.value))}
                        data-testid="buffer-minutes-input"
                      />
                    </label>
                  </fieldset>

                  <button
                    className="save-settings-btn"
                    onClick={savePhase2Settings}
                    disabled={savingPhase2}
                    data-testid="save-phase2-settings-btn"
                  >
                    {savingPhase2 ? '💾 Saving...' : '💾 Save Settings'}
                  </button>
                </div>
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

