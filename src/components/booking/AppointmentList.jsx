import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { get, del as deleteAPI } from '../../utils/api';
import { DateTime } from 'luxon';
import './AppointmentList.css';

const AppointmentList = ({ userId, onRefresh }) => {
  const { showSuccess, showError } = useToast();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [dateRange, setDateRange] = useState('all');

  // Modal states
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellingAppointment, setCancellingAppointment] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchAppointments();
    }
  }, [userId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await get(`/api/booking/admin/${userId}/appointments`, { params });
      setAppointments(response.appointments || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Failed to load appointments');
      showError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAppointments();
    if (onRefresh) onRefresh();
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedAppointment(null);
  };

  const handleOpenCancelConfirm = (appointment) => {
    setCancellingAppointment(appointment);
    setShowCancelConfirm(true);
  };

  const handleCloseCancelConfirm = () => {
    setShowCancelConfirm(false);
    setCancellingAppointment(null);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingAppointment) return;

    try {
      await deleteAPI(
        `/api/booking/tenants/${userId}/appointments/${cancellingAppointment.confirmation_code}`,
        {
          body: JSON.stringify({
            reason: 'Cancelled by admin',
            cancelled_by: 'admin',
          }),
        }
      );

      showSuccess('Appointment cancelled successfully');
      handleCloseCancelConfirm();
      await fetchAppointments();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      showError('Failed to cancel appointment');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const dt = DateTime.fromISO(dateString, { zone: 'utc' });
      return dt.toLocal().toFormat('LLL dd, yyyy h:mm a');
    } catch (err) {
      return dateString;
    }
  };

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Filter appointments
  const filteredAppointments = appointments
    .filter(apt => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        apt.customer_name?.toLowerCase().includes(searchLower) ||
        apt.customer_email?.toLowerCase().includes(searchLower) ||
        apt.confirmation_code?.toLowerCase().includes(searchLower) ||
        apt.service_name?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== 'all' && apt.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (dateRange !== 'all') {
        const aptDate = DateTime.fromISO(apt.start_time, { zone: 'utc' });
        const now = DateTime.now();

        if (dateRange === 'today') {
          if (!aptDate.hasSame(now, 'day')) return false;
        } else if (dateRange === 'week') {
          const weekAgo = now.minus({ days: 7 });
          if (aptDate < weekAgo) return false;
        } else if (dateRange === 'month') {
          const monthAgo = now.minus({ months: 1 });
          if (aptDate < monthAgo) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(a.start_time) - new Date(b.start_time);
      } else if (sortBy === 'customer') {
        return (a.customer_name || '').localeCompare(b.customer_name || '');
      } else if (sortBy === 'status') {
        return (a.status || '').localeCompare(b.status || '');
      }
      return 0;
    });

  return (
    <div className="appointment-list" data-testid="appointment-list">
      <div className="appointment-list-header">
        <h2>Appointments</h2>
        <button
          className="refresh-btn"
          onClick={handleRefresh}
          aria-label="Refresh"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="appointment-filters">
        <input
          type="text"
          placeholder="Search appointments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
          aria-label="Status"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="filter-select"
          aria-label="Date Range"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="filter-select"
          aria-label="Sort By"
        >
          <option value="date">Sort by Date</option>
          <option value="customer">Sort by Customer</option>
          <option value="status">Sort by Status</option>
        </select>
      </div>

      {/* Loading & Error States */}
      {loading && <div className="loading">Loading appointments...</div>}

      {error && <div className="error-message">{error}</div>}

      {/* Empty State */}
      {!loading && !error && filteredAppointments.length === 0 && searchTerm === '' && statusFilter === 'all' && (
        <div className="empty-state">
          <p>No appointments yet. Appointments will appear here once customers start booking!</p>
        </div>
      )}

      {!loading && !error && filteredAppointments.length === 0 && (searchTerm !== '' || statusFilter !== 'all') && (
        <div className="empty-state">
          <p>No appointments match your filters.</p>
        </div>
      )}

      {/* Appointments Table */}
      {!loading && !error && filteredAppointments.length > 0 && (
        <div className="appointments-table">
          {filteredAppointments.map(apt => (
            <div
              key={apt.id}
              className="appointment-item"
              data-testid={`appointment-item-${apt.id}`}
            >
              <div className="appointment-main">
                <div className="appointment-info">
                  <div className="appointment-customer">
                    <h3>{apt.customer_name}</h3>
                    <span className={`status-badge status-${apt.status}`}>
                      {apt.status}
                    </span>
                  </div>
                  <div className="appointment-details">
                    <div className="detail-row">
                      <span className="detail-icon">📧</span>
                      <span>{apt.customer_email}</span>
                    </div>
                    {apt.customer_phone && (
                      <div className="detail-row">
                        <span className="detail-icon">📱</span>
                        <span>{apt.customer_phone}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-icon">🔖</span>
                      <span className="confirmation-code">{apt.confirmation_code}</span>
                    </div>
                  </div>
                </div>

                <div className="appointment-service">
                  <div className="service-name">{apt.service_name}</div>
                  <div className="service-time">{formatDate(apt.start_time)}</div>
                  {apt.total_price_cents && (
                    <div className="service-price">{formatCurrency(apt.total_price_cents)}</div>
                  )}
                </div>
              </div>

              <div className="appointment-actions">
                <button
                  className="view-details-btn"
                  onClick={() => handleViewDetails(apt)}
                >
                  👁️ View Details
                </button>
                {apt.status !== 'cancelled' && (
                  <button
                    className="cancel-btn"
                    onClick={() => handleOpenCancelConfirm(apt)}
                  >
                    ❌ Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedAppointment && (
        <div className="modal-overlay" onClick={handleCloseDetails}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>Appointment Details</h3>
              <button className="close-btn" onClick={handleCloseDetails}>×</button>
            </div>

            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-group">
                  <label>Confirmation Code</label>
                  <div className="detail-value">{selectedAppointment.confirmation_code}</div>
                </div>

                <div className="detail-group">
                  <label>Status</label>
                  <div className="detail-value">
                    <span className={`status-badge status-${selectedAppointment.status}`}>
                      {selectedAppointment.status}
                    </span>
                  </div>
                </div>

                <div className="detail-group">
                  <label>Customer Name</label>
                  <div className="detail-value">{selectedAppointment.customer_name}</div>
                </div>

                <div className="detail-group">
                  <label>Email</label>
                  <div className="detail-value">{selectedAppointment.customer_email}</div>
                </div>

                {selectedAppointment.customer_phone && (
                  <div className="detail-group">
                    <label>Phone</label>
                    <div className="detail-value">{selectedAppointment.customer_phone}</div>
                  </div>
                )}

                <div className="detail-group">
                  <label>Service</label>
                  <div className="detail-value">{selectedAppointment.service_name}</div>
                </div>

                <div className="detail-group">
                  <label>Start Time</label>
                  <div className="detail-value">{formatDate(selectedAppointment.start_time)}</div>
                </div>

                <div className="detail-group">
                  <label>End Time</label>
                  <div className="detail-value">{formatDate(selectedAppointment.end_time)}</div>
                </div>

                {selectedAppointment.total_price_cents && (
                  <div className="detail-group">
                    <label>Price</label>
                    <div className="detail-value">{formatCurrency(selectedAppointment.total_price_cents)}</div>
                  </div>
                )}

                {selectedAppointment.notes && (
                  <div className="detail-group full-width">
                    <label>Notes</label>
                    <div className="detail-value">{selectedAppointment.notes}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="close-modal-btn" onClick={handleCloseDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && cancellingAppointment && (
        <div className="modal-overlay" onClick={handleCloseCancelConfirm}>
          <div
            className="modal-content small-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>Cancel Appointment</h3>
              <button className="close-btn" onClick={handleCloseCancelConfirm}>×</button>
            </div>

            <div className="modal-body">
              <p>Are you sure you want to cancel this appointment?</p>
              <div className="cancel-details">
                <div><strong>Customer:</strong> {cancellingAppointment.customer_name}</div>
                <div><strong>Service:</strong> {cancellingAppointment.service_name}</div>
                <div><strong>Time:</strong> {formatDate(cancellingAppointment.start_time)}</div>
              </div>
              <p className="warning-text">The customer will be notified via email.</p>
            </div>

            <div className="modal-actions">
              <button className="cancel-action-btn" onClick={handleCloseCancelConfirm}>
                Cancel
              </button>
              <button className="confirm-action-btn" onClick={handleConfirmCancel}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentList;

