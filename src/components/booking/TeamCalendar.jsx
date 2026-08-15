import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { get } from '../../utils/api';
import { addDays, mapAdminAppointmentsToBoard, rangeForView } from '../../utils/scheduleBoard';
import ScheduleBoard from './ScheduleBoard';

function TeamCalendar({ userId, siteId = null }) {
  const { showError } = useToast();
  const [view, setView] = useState('day');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [columns, setColumns] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const range = useMemo(() => rangeForView(anchorDate, view), [anchorDate, view]);
  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const params = {
          start_date: range.from.toISOString(),
          end_date: addDays(range.to, 1).toISOString(),
        };
        if (siteId) params.siteId = siteId;

        const staffParams = siteId ? { siteId } : undefined;
        const [appointmentsRes, staffRes] = await Promise.all([
          get(`/api/booking/admin/${userId}/appointments`, { params }),
          get(`/api/booking/tenants/${userId}/staff`, { params: staffParams }),
        ]);
        if (cancelled) return;
        const mapped = mapAdminAppointmentsToBoard(
          appointmentsRes.appointments || [],
          staffRes.staff || []
        );
        setColumns(mapped.columns);
        setAppointments(mapped.appointments);
      } catch (err) {
        if (!cancelled) showError('Failed to load calendar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId, siteId, view, fromMs, toMs]);

  return (
    <div className="team-calendar" data-testid="team-calendar">
      <p className="schedule-privacy-note">
        Who is booked and when. Working hours still live on the Schedule tab.
      </p>
      <ScheduleBoard
        columns={columns}
        appointments={appointments}
        view={view}
        scope="team"
        anchorDate={anchorDate}
        canViewTeam={false}
        canViewTeamDetails
        onAnchorChange={setAnchorDate}
        onViewChange={setView}
        onSelect={setSelected}
        loading={loading}
      />
      {selected && (
        <div className="schedule-detail" data-testid="schedule-detail">
          <h3>{selected.customerName || selected.serviceName}</h3>
          <p><strong>When:</strong> {selected.startTime ? new Date(selected.startTime).toLocaleString() : ''}</p>
          <p><strong>Service:</strong> {selected.serviceName}</p>
          <p><strong>With:</strong> {selected.staffName}</p>
          {selected.customerPhone && (
            <p><strong>Phone:</strong> <a href={`tel:${selected.customerPhone}`}>{selected.customerPhone}</a></p>
          )}
          {selected.customerEmail && (
            <p><strong>Email:</strong> <a href={`mailto:${selected.customerEmail}`}>{selected.customerEmail}</a></p>
          )}
          {selected.customerNotes && <p><strong>Notes:</strong> {selected.customerNotes}</p>}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default TeamCalendar;
