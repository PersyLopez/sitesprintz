import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePolling } from '../hooks/usePolling';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import api from '../services/api';
import './StaffDashboard.css';

function StaffAppointments() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Poll for appointments
  const { data: polledData, lastUpdated } = usePolling({
    endpoint: `/api/staff/appointments/${tenantId}`,
    interval: 15000,
    enabled: !!tenantId && isAuthenticated,
    params: { status: statusFilter, date: dateFilter },
    onUpdate: (newData) => {
      setAppointments(newData.appointments || []);
    }
  });

  useEffect(() => {
    if (polledData?.appointments) {
      setAppointments(polledData.appointments);
    }
  }, [polledData]);

  useEffect(() => {
    if (tenantId && isAuthenticated) {
      loadAppointments();
    }
  }, [tenantId, statusFilter, dateFilter, isAuthenticated]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;

      const response = await api.get(`/api/staff/appointments/${tenantId}`, { params });
      setAppointments(response.appointments || []);
    } catch (err) {
      console.error('Load appointments error:', err);
      showError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      await api.put(`/api/staff/appointments/${appointmentId}/status`, {
        status: newStatus,
        tenantId
      });
      showSuccess('Appointment status updated');
      loadAppointments();
    } catch (err) {
      console.error('Update status error:', err);
      showError('Failed to update appointment status');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="staff-dashboard">
        <Header />
        <main className="dashboard-container">
          <div className="dashboard-card">
            <p>Please log in to view appointments.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="staff-dashboard">
      <Header />
      <main className="dashboard-container">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <h1>My Appointments</h1>
            <div className="dashboard-actions" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate(`/staff/schedule/${tenantId}`)}
              >
                Open schedule
              </button>
              <button
                type="button"
                onClick={() => navigate('/staff/dashboard')}
                className="btn btn-secondary"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

          <div className="filters">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="form-control"
              placeholder="Filter by date"
            />
          </div>

          {loading ? (
            <div className="loading-message">
              <div className="spinner"></div>
              <p>Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="empty-state">
              <p>No appointments found.</p>
            </div>
          ) : (
            <div className="appointments-list">
              {appointments.map(apt => (
                <div key={apt.id} className="appointment-card">
                  <div className="appointment-header">
                    <div className="appointment-time">
                      {new Date(apt.startTime).toLocaleString()}
                    </div>
                    <div className={`appointment-status status-${apt.status}`}>
                      {apt.status}
                    </div>
                  </div>
                  <div className="appointment-details">
                    <p><strong>Customer:</strong> {apt.customerName}</p>
                    <p><strong>Service:</strong> {apt.serviceName}</p>
                    {apt.customerPhone && (
                      <p><strong>Phone:</strong> <a href={`tel:${apt.customerPhone}`}>{apt.customerPhone}</a></p>
                    )}
                    {apt.customerEmail && (
                      <p><strong>Email:</strong> <a href={`mailto:${apt.customerEmail}`}>{apt.customerEmail}</a></p>
                    )}
                    {apt.customerNotes && (
                      <p><strong>Notes:</strong> {apt.customerNotes}</p>
                    )}
                    {apt.totalPriceCents > 0 && (
                      <p><strong>Total:</strong> ${(apt.totalPriceCents / 100).toFixed(2)}</p>
                    )}
                  </div>
                  <div className="appointment-actions">
                    {apt.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusUpdate(apt.id, 'in-progress')}
                        className="btn btn-primary btn-sm"
                      >
                        Mark In Progress
                      </button>
                    )}
                    {apt.status === 'in-progress' && (
                      <button
                        onClick={() => handleStatusUpdate(apt.id, 'completed')}
                        className="btn btn-success btn-sm"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
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

export default StaffAppointments;



