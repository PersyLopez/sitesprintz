import {
  addDays,
  blockGeometry,
  displayTitle,
  enumerateDays,
  formatDayKey,
  formatDayLabel,
  formatTime,
  groupAppointments,
  rangeForView,
  resolveHourRange,
  buildTimeSlots,
} from '../../utils/scheduleBoard';
import './ScheduleBoard.css';

function ScheduleBoard({
  columns = [],
  appointments = [],
  view = 'day',
  scope = 'mine',
  anchorDate,
  canViewTeam = true,
  canViewTeamDetails = false,
  selfStaffId,
  onAnchorChange,
  onViewChange,
  onScopeChange,
  onSelect,
  loading = false,
}) {
  const range = rangeForView(anchorDate, view);
  const days = enumerateDays(range.from, range.to);
  const hours = resolveHourRange(appointments);
  const slots = buildTimeSlots(hours.startHour, hours.endHour);
  const grid = groupAppointments(appointments, columns, days);
  const heading = view === 'week'
    ? `${formatDayLabel(range.from)} – ${formatDayLabel(range.to, { weekday: false })}`
    : formatDayLabel(range.from);

  const shift = (daysDelta) => {
    onAnchorChange?.(addDays(anchorDate, daysDelta));
  };

  return (
    <div className="schedule-board" data-testid="schedule-board">
      <div className="schedule-toolbar">
        <div className="schedule-nav">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => shift(view === 'week' ? -7 : -1)} data-testid="schedule-prev">
            Previous
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onAnchorChange?.(new Date())} data-testid="schedule-today">
            Today
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => shift(view === 'week' ? 7 : 1)} data-testid="schedule-next">
            Next
          </button>
          <h2 className="schedule-heading">{heading}</h2>
        </div>
        <div className="schedule-toggles">
          <div className="segmented" role="group" aria-label="Schedule range">
            <button
              type="button"
              className={view === 'day' ? 'active' : ''}
              aria-pressed={view === 'day'}
              onClick={() => onViewChange?.('day')}
              data-testid="schedule-view-day"
            >
              Day
            </button>
            <button
              type="button"
              className={view === 'week' ? 'active' : ''}
              aria-pressed={view === 'week'}
              onClick={() => onViewChange?.('week')}
              data-testid="schedule-view-week"
            >
              Week
            </button>
          </div>
          {canViewTeam && (
            <div className="segmented" role="group" aria-label="Whose schedule">
              <button
                type="button"
                className={scope === 'mine' ? 'active' : ''}
                aria-pressed={scope === 'mine'}
                onClick={() => onScopeChange?.('mine')}
                data-testid="schedule-scope-mine"
              >
                Mine
              </button>
              <button
                type="button"
                className={scope === 'team' ? 'active' : ''}
                aria-pressed={scope === 'team'}
                onClick={() => onScopeChange?.('team')}
                data-testid="schedule-scope-team"
              >
                Team
              </button>
            </div>
          )}
        </div>
      </div>

      {scope === 'team' && !canViewTeamDetails && (
        <p className="schedule-privacy-note">
          Team view shows when colleagues are booked. Customer details stay on each person&apos;s own schedule.
        </p>
      )}

      {loading ? (
        <div className="schedule-empty">Loading schedule…</div>
      ) : columns.length === 0 ? (
        <div className="schedule-empty">No staff on this calendar yet.</div>
      ) : view === 'day' ? (
        <DayGrid
          columns={columns}
          day={days[0]}
          grid={grid}
          hours={hours}
          slots={slots}
          selfStaffId={selfStaffId}
          canViewTeamDetails={canViewTeamDetails}
          onSelect={onSelect}
        />
      ) : (
        <WeekList
          columns={columns}
          days={days}
          grid={grid}
          selfStaffId={selfStaffId}
          canViewTeamDetails={canViewTeamDetails}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

function DayGrid({ columns, day, grid, hours, slots, selfStaffId, canViewTeamDetails, onSelect }) {
  const dayKey = formatDayKey(day);
  return (
    <div className="schedule-day-grid" style={{ gridTemplateColumns: `72px repeat(${Math.max(columns.length, 1)}, minmax(160px, 1fr))` }}>
      <div className="schedule-axis">
        {slots.map((slot) => (
          <div key={slot.minutesFromMidnight} className="schedule-axis-slot">
            {slot.label}
          </div>
        ))}
      </div>
      {columns.map((column) => {
        const items = grid[column.staffId]?.[dayKey] || [];
        return (
          <div key={column.staffId} className={`schedule-column ${column.isSelf ? 'is-self' : ''}`}>
            <div className="schedule-column-title">
              {column.staffName}{column.isSelf ? ' (you)' : ''}
            </div>
            <div className="schedule-column-body">
              {slots.map((slot) => (
                <div key={slot.minutesFromMidnight} className="schedule-slot-line" />
              ))}
              {items.map((apt) => {
                const geo = blockGeometry(apt, hours.startHour, hours.endHour);
                return (
                  <button
                    key={apt.id}
                    type="button"
                    className={`schedule-block status-${apt.status || 'confirmed'} ${apt.isSelf ? 'is-self' : ''}`}
                    style={{ top: `${geo.topPercent}%`, height: `${geo.heightPercent}%` }}
                    onClick={() => onSelect?.(apt)}
                    data-testid={`schedule-block-${apt.id}`}
                  >
                    <span className="schedule-block-time">{formatTime(apt.startTime)}</span>
                    <span className="schedule-block-title">{displayTitle(apt, { canViewTeamDetails, selfStaffId })}</span>
                    <span className="schedule-block-service">{apt.serviceName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekList({ columns, days, grid, selfStaffId, canViewTeamDetails, onSelect }) {
  return (
    <div className="schedule-week-list">
      {days.map((day) => {
        const key = formatDayKey(day);
        const dayItems = columns.flatMap((column) => (grid[column.staffId]?.[key] || []).map((apt) => ({
          ...apt,
          staffName: column.staffName,
        })));
        dayItems.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        return (
          <section key={key} className="schedule-week-day">
            <h3>{formatDayLabel(day)}</h3>
            {dayItems.length === 0 ? (
              <p className="schedule-quiet">Nothing booked</p>
            ) : (
              <ul>
                {dayItems.map((apt) => (
                  <li key={apt.id}>
                    <button
                      type="button"
                      className={`schedule-chip status-${apt.status || 'confirmed'}`}
                      onClick={() => onSelect?.(apt)}
                      data-testid={`schedule-block-${apt.id}`}
                    >
                      <span>{formatTime(apt.startTime)}</span>
                      <span>{displayTitle(apt, { canViewTeamDetails, selfStaffId })}</span>
                      <span>{apt.serviceName}</span>
                      {columns.length > 1 && <span>{apt.staffName}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default ScheduleBoard;
