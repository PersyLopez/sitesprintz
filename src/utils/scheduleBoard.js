/**
 * Schedule board helpers — group appointments into a day/week grid.
 * Used by staff and owner calendars.
 */

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;
const SLOT_MINUTES = 30;

export function toDateTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function startOfLocalDay(value = new Date()) {
  const date = toDateTime(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function addDays(value, days) {
  const date = new Date(startOfLocalDay(value).getTime());
  date.setDate(date.getDate() + days);
  return date;
}

export function startOfWeek(value = new Date()) {
  const date = startOfLocalDay(value);
  const weekday = date.getDay(); // 0 Sun
  const offset = weekday === 0 ? -6 : 1 - weekday; // Monday start
  return addDays(date, offset);
}

export function formatDayKey(value) {
  const date = startOfLocalDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDayLabel(value, { weekday = true } = {}) {
  const date = toDateTime(value);
  if (!date) return '';
  return date.toLocaleDateString(undefined, {
    weekday: weekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(value) {
  const date = toDateTime(value);
  if (!date) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function enumerateDays(from, to) {
  const start = startOfLocalDay(from);
  const end = startOfLocalDay(to);
  const days = [];
  let cursor = start;
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor.getTime()));
    cursor = addDays(cursor, 1);
  }
  return days.length ? days : [start];
}

export function resolveHourRange(appointments = [], {
  minHour = DEFAULT_START_HOUR,
  maxHour = DEFAULT_END_HOUR,
} = {}) {
  let start = minHour;
  let end = maxHour;
  for (const apt of appointments) {
    const begin = toDateTime(apt.startTime);
    const finish = toDateTime(apt.endTime) || begin;
    if (!begin) continue;
    start = Math.min(start, begin.getHours());
    const endHour = finish.getMinutes() > 0 || finish.getSeconds() > 0
      ? finish.getHours() + 1
      : finish.getHours();
    end = Math.max(end, endHour);
  }
  if (end <= start) end = start + 1;
  return { startHour: start, endHour: end };
}

export function buildTimeSlots(startHour, endHour, slotMinutes = SLOT_MINUTES) {
  const slots = [];
  const start = startHour * 60;
  const finish = endHour * 60;
  for (let minutes = start; minutes < finish; minutes += slotMinutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const labelDate = new Date(1970, 0, 1, hour, minute);
    slots.push({
      minutesFromMidnight: minutes,
      label: minute === 0 ? formatTime(labelDate) : '',
    });
  }
  return slots;
}

export function blockGeometry(appointment, startHour, endHour) {
  const begin = toDateTime(appointment.startTime);
  const finish = toDateTime(appointment.endTime) || begin;
  if (!begin || !finish) {
    return { topPercent: 0, heightPercent: 0 };
  }
  const rangeStart = startHour * 60;
  const rangeEnd = endHour * 60;
  const range = Math.max(rangeEnd - rangeStart, 1);
  const startMinutes = begin.getHours() * 60 + begin.getMinutes();
  const endMinutes = finish.getHours() * 60 + finish.getMinutes();
  const clampedStart = Math.max(startMinutes, rangeStart);
  const clampedEnd = Math.max(Math.min(endMinutes, rangeEnd), clampedStart + 15);
  return {
    topPercent: ((clampedStart - rangeStart) / range) * 100,
    heightPercent: ((clampedEnd - clampedStart) / range) * 100,
  };
}

export function groupAppointments(appointments = [], columns = [], days = []) {
  const dayKeys = days.map((day) => formatDayKey(day));
  const grid = {};
  for (const column of columns) {
    grid[column.staffId] = {};
    for (const key of dayKeys) {
      grid[column.staffId][key] = [];
    }
  }
  for (const apt of appointments) {
    const staffId = apt.staffId;
    const key = formatDayKey(apt.startTime);
    if (!grid[staffId]) continue;
    if (!grid[staffId][key]) grid[staffId][key] = [];
    grid[staffId][key].push(apt);
  }
  return grid;
}

export function canRevealCustomer(appointment, { canViewTeamDetails, selfStaffId } = {}) {
  if (!appointment) return false;
  if (appointment.privacy === 'full' || canViewTeamDetails) return true;
  if (appointment.privacy === 'busy') return false;
  return appointment.staffId === selfStaffId || appointment.isSelf === true;
}

export function displayTitle(appointment, options) {
  if (canRevealCustomer(appointment, options) && appointment.customerName) {
    return appointment.customerName;
  }
  return appointment.serviceName || 'Booked';
}

export function rangeForView(anchor, view) {
  if (view === 'week') {
    const from = startOfWeek(anchor);
    const to = addDays(from, 6);
    return { from, to };
  }
  const from = startOfLocalDay(anchor);
  return { from, to: from };
}

/**
 * Map owner/admin appointment rows (snake_case) plus staff list into board props.
 */
export function mapAdminAppointmentsToBoard(appointments = [], staff = []) {
  const columnMap = new Map();
  for (const member of staff) {
    if (!member?.id) continue;
    columnMap.set(member.id, {
      staffId: member.id,
      staffName: member.name || 'Staff',
      isSelf: Boolean(member.is_primary),
    });
  }

  const mapped = [];
  for (const apt of appointments) {
    if (!apt || apt.status === 'cancelled') continue;
    const staffId = apt.staff_id || apt.staffId;
    const staffName = apt.staff_name || apt.staffName || 'Staff';
    if (staffId && !columnMap.has(staffId)) {
      columnMap.set(staffId, {
        staffId,
        staffName,
        isSelf: false,
      });
    }
    mapped.push({
      id: apt.id,
      staffId,
      staffName: staffName || columnMap.get(staffId)?.staffName || 'Staff',
      startTime: apt.start_time || apt.startTime,
      endTime: apt.end_time || apt.endTime,
      serviceName: apt.service_name || apt.serviceName || 'Appointment',
      status: apt.status,
      isSelf: columnMap.get(staffId)?.isSelf === true,
      privacy: 'full',
      customerName: apt.customer_name || apt.customerName || null,
      customerPhone: apt.customer_phone || apt.customerPhone || null,
      customerEmail: apt.customer_email || apt.customerEmail || null,
      customerNotes: apt.customer_notes || apt.customerNotes || null,
    });
  }

  return {
    columns: [...columnMap.values()],
    appointments: mapped,
  };
}
