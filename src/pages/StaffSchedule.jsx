import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePolling } from '../hooks/usePolling';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ScheduleBoard from '../components/booking/ScheduleBoard';
import api from '../services/api';
import { addDays, rangeForView } from '../utils/scheduleBoard';
import './StaffDashboard.css';

function StaffSchedule() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showError, showSuccess } = useToast();
  const [view, setView] = useState('day');
  const [scope, setScope] = useState('mine');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [schedule, setSchedule] = useState(null);
  const [selected, setSelected] = useState(null);

  const range = useMemo(() => rangeForView(anchorDate, view), [anchorDate, view]);
  const pollParams = useMemo(() => ({
    from: range.from.toISOString(),
    to: addDays(range.to, 1).toISOString(),
    scope,
  }), [range.from, range.to, scope]);

  const { data: polledData, loading, error } = usePolling({
    endpoint: tenantId && isAuthenticated ? `/api/staff/schedule/${tenantId}` : null,
    interval: 30000,
    enabled: Boolean(tenantId && isAuthenticated),
    params: pollParams,
    onUpdate: (newData) => {
      if (newData?.schedule) setSchedule(newData.schedule);
    },
  });

  useEffect(() => {
    if (polledData?.schedule) setSchedule(polledData.schedule);
  }, [polledData]);

  useEffect(() => {
    if (error && !schedule) showError('Failed to load schedule');
  }, [error, schedule, showError]);

  const handleStatusUpdate = async (appointmentId, status) => {
    try {
      await api.put(`/api/staff/appointments/${appointmentId}/status`, { status, tenantId });
      showSuccess('Appointment updated');
      setSelected((current) => current ? { ...current, status } : current);
      setSchedule((current) => {
        if (!current) return current;
        return {
          ...current,
          appointments: current.appointments.map((apt) => (
            apt.id === appointmentId ? { ...apt, status } : apt
          )),
        };
      });
    } catch (err) {
      showError('Failed to update appointment');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="staff-dashboard">
        <Header />
        <main className="dashboard-container">
          <div className="dashboard-card">
            <p>Please log in to view the schedule.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const canViewTeam = Boolean(schedule?.hasTeam);

  return (
    <div className="staff-dashboard">
      <Header />
      <main className="dashboard-container">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <h1>Schedule</h1>
            <div className="dashboard-actions" style={{ marginBottom: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/staff/dashboard')}>
                Dashboard
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(`/staff/appointments/${tenantId}`)}>
                Appointment list
              </button>
            </div>
          </div>

          <p className="assignment-info">
            Your day by default. Switch to Team to see coverage without sharing colleague customer details.
          </p>

          <ScheduleBoard
            columns={schedule?.columns || []}
            appointments={schedule?.appointments || []}
            view={view}
            scope={scope}
            anchorDate={anchorDate}
            canViewTeam={canViewTeam}
            canViewTeamDetails={Boolean(schedule?.canViewTeamDetails)}
            selfStaffId={schedule?.selfStaffId}
            onAnchorChange={setAnchorDate}
            onViewChange={setView}
            onScopeChange={setScope}
            onSelect={setSelected}
            loading={loading}
          />

          {selected && (
            <div className="schedule-detail" data-testid="schedule-detail">
              <h3>{selected.customerName || selected.serviceName}</h3>
              <p><strong>When:</strong> {new Date(selected.startTime).toLocaleString()}</p>
              <p><strong>Service:</strong> {selected.serviceName}</p>
              <p><strong>With:</strong> {selected.staffName}</p>
              {selected.privacy === 'full' ? (
                <>
                  {selected.customerPhone && (
                    <p><strong>Phone:</strong> <a href={`tel:${selected.customerPhone}`}>{selected.customerPhone}</a></p>
                  )}
                  {selected.customerEmail && (
                    <p><strong>Email:</strong> <a href={`mailto:${selected.customerEmail}`}>{selected.customerEmail}</a></p>
                  )}
                  {selected.customerNotes && <p><strong>Notes:</strong> {selected.customerNotes}</p>}
                  <div className="appointment-actions">
                    {selected.status === 'confirmed' && selected.isSelf && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate(selected.id, 'in-progress')}>
                        Mark in progress
                      </button>
                    )}
                    {selected.status === 'in-progress' && selected.isSelf && (
                      <button type="button" className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(selected.id, 'completed')}>
                        Mark completed
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p>This slot is covered by {selected.staffName}. Open your own schedule for customer details.</p>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default StaffSchedule;
