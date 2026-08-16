import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ProgressTimeline from '../components/tracking/ProgressTimeline';
import { usePolling } from '../hooks/usePolling';
import api from '../services/api';
import './Tracking.css';

function TrackAppointment() {
  const { code } = useParams();
  const { showError } = useToast();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Poll for updates
  const { data: updates, lastUpdated } = usePolling({
    endpoint: `/api/tracking/appointment/${code}/updates`,
    interval: 30000,
    enabled: !!appointment,
    onUpdate: (newData) => {
      if (newData.status !== appointment?.status) {
        setAppointment(prev => ({ ...prev, status: newData.status, updatedAt: newData.updatedAt }));
      }
    }
  });

  useEffect(() => {
    if (code) {
      loadAppointment();
    }
  }, [code]);

  const loadAppointment = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/tracking/appointment/${code}`);
      setAppointment(response.appointment);
    } catch (err) {
      console.error('Load appointment error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load appointment';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="tracking-page">
        <Header />
        <main className="tracking-container">
          <div className="tracking-card">
            <div className="loading-message">
              <div className="spinner"></div>
              <p>Loading appointment details...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="tracking-page">
        <Header />
        <main className="tracking-container">
          <div className="tracking-card">
            <div className="error-message">
              <div className="error-icon">❌</div>
              <h2>Appointment Not Found</h2>
              <p>{error || 'The appointment you are looking for could not be found.'}</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Define status progression
  const statuses = [
    { id: 'pending', label: 'Requested', description: 'Your appointment request has been received' },
    { id: 'confirmed', label: 'Confirmed', description: 'Your appointment has been confirmed' },
    { id: 'in-progress', label: 'In Progress', description: 'Your appointment is in progress' },
    { id: 'completed', label: 'Completed', description: 'Your appointment has been completed' },
    { id: 'cancelled', label: 'Cancelled', description: 'Your appointment has been cancelled' }
  ];

  const currentStatus = appointment.status || 'confirmed';

  return (
    <div className="tracking-page">
      <Header />
      <main className="tracking-container">
        <div className="tracking-card">
          <ProgressTimeline
            title="Track Your Appointment"
            referenceId={appointment.confirmationCode}
            currentStatus={currentStatus}
            statuses={statuses.filter(s => s.id !== 'cancelled' || currentStatus === 'cancelled')}
            updates={[
              {
                timestamp: appointment.createdAt,
                message: 'Appointment created',
                status: 'pending'
              },
              ...(appointment.updatedAt && appointment.updatedAt !== appointment.createdAt ? [{
                timestamp: appointment.updatedAt,
                message: `Status updated to ${appointment.status}`,
                status: appointment.status
              }] : []),
              ...(appointment.cancelledAt ? [{
                timestamp: appointment.cancelledAt,
                message: 'Appointment cancelled',
                status: 'cancelled'
              }] : [])
            ]}
          />

          <div className="appointment-details-section">
            <h3>Appointment Details</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Confirmation Code:</span>
                <span className="detail-value">{appointment.confirmationCode}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Service:</span>
                <span className="detail-value">{appointment.serviceName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Staff:</span>
                <span className="detail-value">{appointment.staffName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Date & Time:</span>
                <span className="detail-value">
                  {new Date(appointment.startTime).toLocaleString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`detail-value status-${appointment.status}`}>
                  {appointment.status}
                </span>
              </div>
              {appointment.totalPriceCents > 0 && (
                <div className="detail-item">
                  <span className="detail-label">Total:</span>
                  <span className="detail-value">
                    ${(appointment.totalPriceCents / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {appointment.businessName && (
              <div className="business-contact">
                <h4>Business Contact</h4>
                <p><strong>{appointment.businessName}</strong></p>
                {appointment.businessPhone && (
                  <p>📞 <a href={`tel:${appointment.businessPhone}`}>{appointment.businessPhone}</a></p>
                )}
                {appointment.businessEmail && (
                  <p>✉️ <a href={`mailto:${appointment.businessEmail}`}>{appointment.businessEmail}</a></p>
                )}
              </div>
            )}

            {lastUpdated && (
              <div className="last-updated">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default TrackAppointment;



