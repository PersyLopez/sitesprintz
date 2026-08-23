import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStaff } from '../context/StaffContext';
import { useToast } from '../hooks/useToast';
import { usePolling } from '../hooks/usePolling';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import api from '../services/api';
import './StaffDashboard.css';

function StaffDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { assignments, selectedTenant, setSelectedTenant, loading: contextLoading } = useStaff();
  const { showError } = useToast();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Poll for dashboard updates
  const { data: polledData, lastUpdated } = usePolling({
    endpoint: selectedTenant ? `/api/staff/dashboard/${selectedTenant}` : null,
    interval: 30000,
    enabled: !!selectedTenant && isAuthenticated,
    onUpdate: (newData) => {
      setDashboardData(newData.dashboard);
    }
  });

  useEffect(() => {
    if (polledData?.dashboard) {
      setDashboardData(polledData.dashboard);
    }
  }, [polledData]);

  useEffect(() => {
    if (isAuthenticated && selectedTenant) {
      loadDashboard();
    } else if (isAuthenticated && assignments.length > 0 && !selectedTenant) {
      setSelectedTenant(assignments[0].tenantId);
    }
  }, [isAuthenticated, selectedTenant, assignments]);

  const loadDashboard = async () => {
    if (!selectedTenant) return;

    try {
      setLoading(true);
      const response = await api.get(`/api/staff/dashboard/${selectedTenant}`);
      setDashboardData(response.dashboard);
    } catch (err) {
      console.error('Load dashboard error:', err);
      showError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="staff-dashboard">
        <Header />
        <main className="dashboard-container">
          <div className="dashboard-card">
            <p>Please log in to access your staff dashboard.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!contextLoading && assignments.length === 0) {
    return (
      <div className="staff-dashboard">
        <Header />
        <main className="dashboard-container">
          <div className="dashboard-card">
            <div className="empty-state">
              <h2>No Staff Assignments</h2>
              <p>You haven't been assigned to any businesses yet.</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (contextLoading || loading) {
    return (
      <div className="staff-dashboard">
        <Header />
        <main className="dashboard-container">
          <div className="dashboard-card">
            <div className="loading-message">
              <div className="spinner"></div>
              <p>Loading dashboard...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentAssignment = assignments.find(a => a.tenantId === selectedTenant);

  return (
    <div className="staff-dashboard">
      <Header />
      <main className="dashboard-container">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <h1>Staff Dashboard</h1>
            {assignments.length > 1 && (
              <div className="tenant-selector">
                <label htmlFor="tenant-select">Business:</label>
                <select
                  id="tenant-select"
                  value={selectedTenant || ''}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="form-control"
                >
                  {assignments.map(assignment => (
                    <option key={assignment.tenantId} value={assignment.tenantId}>
                      {assignment.tenant?.business_name || 'Unknown Business'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {currentAssignment && (
            <div className="assignment-info">
              <p>
                <strong>Role:</strong> {currentAssignment.role}
              </p>
              <p>
                <strong>Business:</strong> {currentAssignment.tenant?.business_name}
              </p>
            </div>
          )}

          {dashboardData && (
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-value">{dashboardData.todayAppointments || 0}</div>
                <div className="stat-label">Today's Appointments</div>
              </div>
              {currentAssignment?.permissions?.canViewOrders && (
                <div className="stat-card">
                  <div className="stat-value">{dashboardData.newOrdersCount || 0}</div>
                  <div className="stat-label">New Orders</div>
                </div>
              )}
            </div>
          )}

          <div className="dashboard-actions">
            <button
              type="button"
              data-testid="open-schedule"
              onClick={() => navigate(`/staff/schedule/${selectedTenant}`)}
              className="btn btn-primary"
            >
              Open schedule
            </button>
            <button
              type="button"
              onClick={() => navigate(`/staff/appointments/${selectedTenant}`)}
              className="btn btn-secondary"
            >
              View Appointments
            </button>
            {currentAssignment?.permissions?.canViewOrders && (
              <button
                type="button"
                onClick={() => navigate(`/staff/orders/${selectedTenant}`)}
                className="btn btn-secondary"
              >
                View Orders
              </button>
            )}
          </div>

          {dashboardData?.upcomingAppointments && dashboardData.upcomingAppointments.length > 0 && (
            <div className="upcoming-section">
              <h3>Upcoming Appointments</h3>
              <div className="appointments-list">
                {dashboardData.upcomingAppointments.slice(0, 5).map(apt => (
                  <div key={apt.id} className="appointment-item">
                    <div className="appointment-time">
                      {new Date(apt.startTime).toLocaleString()}
                    </div>
                    <div className="appointment-details">
                      <strong>{apt.customerName}</strong> - {apt.serviceName}
                    </div>
                    <div className="appointment-status status-{apt.status}">
                      {apt.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lastUpdated && (
            <div className="last-updated">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default StaffDashboard;



