import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { get, post } from '../../utils/api';
import './AvailabilityScheduler.css';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 0, name: 'Sunday', short: 'Sun' },
];

const DEFAULT_START_TIME = '09:00';
const DEFAULT_END_TIME = '17:00';

const AvailabilityScheduler = ({ userId }) => {
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staffId, setStaffId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Schedule state
  const [schedule, setSchedule] = useState(
    DAYS_OF_WEEK.reduce((acc, day) => ({
      ...acc,
      [day.id]: {
        enabled: false,
        startTime: DEFAULT_START_TIME,
        endTime: DEFAULT_END_TIME,
      },
    }), {})
  );

  useEffect(() => {
    if (userId) {
      fetchAvailability();
    }
  }, [userId]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch availability rules - use default staff for now
      // API expects: /api/booking/admin/:userId/staff/:staffId/availability
      const defaultStaffId = 'default-staff-id';
      const response = await get(`/api/booking/admin/${userId}/staff/${defaultStaffId}/availability`);

      if (response && response.success && Array.isArray(response.rules)) {
        setSchedule(prev => {
          const newSchedule = { ...prev };

          response.rules.forEach(rule => {
            const dayId = rule.day_of_week;
            if (newSchedule[dayId]) {
              newSchedule[dayId] = {
                enabled: rule.is_available,
                startTime: rule.start_time ? rule.start_time.slice(0, 5) : DEFAULT_START_TIME,
                endTime: rule.end_time ? rule.end_time.slice(0, 5) : DEFAULT_END_TIME
              };
            }
          });

          return newSchedule;
        });
      }

      setLoading(false);

    } catch (err) {
      console.error('Error fetching availability:', err);
      setError('Failed to load availability schedule');
      showError('Failed to load availability schedule');
      setLoading(false);
    }
  };

  const handleToggleDay = (dayId) => {
    setSchedule(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        enabled: !prev[dayId].enabled,
      },
    }));

    // Clear validation error for this day
    if (validationErrors[dayId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[dayId];
        return newErrors;
      });
    }
  };

  const handleTimeChange = (dayId, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        [field]: value,
      },
    }));

    // Clear validation error for this day
    if (validationErrors[dayId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[dayId];
        return newErrors;
      });
    }
  };

  const handleCopyToAll = () => {
    const mondaySchedule = schedule[1];

    setSchedule(prev => {
      const newSchedule = { ...prev };

      // Copy to all weekdays (Monday-Friday)
      [1, 2, 3, 4, 5].forEach(dayId => {
        newSchedule[dayId] = {
          enabled: mondaySchedule.enabled,
          startTime: mondaySchedule.startTime,
          endTime: mondaySchedule.endTime,
        };
      });

      return newSchedule;
    });

    showSuccess('Schedule copied to all weekdays');
  };

  const validateSchedule = () => {
    const errors = {};

    Object.entries(schedule).forEach(([dayId, daySchedule]) => {
      if (daySchedule.enabled) {
        const startTime = daySchedule.startTime;
        const endTime = daySchedule.endTime;

        if (!startTime || !endTime) {
          errors[dayId] = 'Start and end times are required';
        } else if (startTime >= endTime) {
          errors[dayId] = 'End time must be after start time';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateSchedule()) {
      showError('Please fix validation errors before saving');
      return;
    }

    try {
      setSaving(true);

      // Convert schedule to API format
      const scheduleRules = Object.entries(schedule)
        .filter(([_, daySchedule]) => daySchedule.enabled)
        .map(([dayId, daySchedule]) => ({
          day_of_week: parseInt(dayId),
          start_time: `${daySchedule.startTime}:00`,
          end_time: `${daySchedule.endTime}:00`,
          is_available: true,
        }));

      if (scheduleRules.length === 0) {
        showError('Please enable at least one day');
        setSaving(false);
        return;
      }

      // We need to get staff ID first
      // For now, let's use a placeholder. In real implementation:
      // 1. Fetch tenant info
      // 2. Get or create default staff
      // 3. Use that staff ID

      // Simplified for demo - you'd need actual staff ID
      const defaultStaffId = 'default-staff-id';

      await post(`/api/booking/admin/${userId}/staff/${defaultStaffId}/availability`, {
        scheduleRules,
      });

      showSuccess('Schedule saved successfully');

    } catch (err) {
      console.error('Error saving schedule:', err);
      showError('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const getDayName = (dayId) => {
    const day = DAYS_OF_WEEK.find(d => d.id === parseInt(dayId));
    return day ? day.name : '';
  };

  return (
    <div className="availability-scheduler" data-testid="availability-scheduler">
      <div className="scheduler-header">
        <h2>Weekly Schedule</h2>
        <p className="scheduler-description">
          Set your available hours for each day of the week
        </p>
      </div>

      {loading && <div className="loading">Loading schedule...</div>}

      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <>
          <div className="schedule-grid">
            {DAYS_OF_WEEK.map(day => (
              <div key={day.id} className="schedule-day">
                <div className="day-header">
                  <label className="day-toggle">
                    <input
                      type="checkbox"
                      data-testid={`day-${day.name.toLowerCase()}`}
                      checked={schedule[day.id].enabled}
                      onChange={() => handleToggleDay(day.id)}
                    />
                    <span className="day-name">{day.name}</span>
                  </label>
                </div>

                <div className="day-times">
                  <div className="time-input-group">
                    <label htmlFor={`start-${day.id}`}>Start</label>
                    <input
                      id={`start-${day.id}`}
                      type="time"
                      data-testid={`start-time-${day.name.toLowerCase()}`}
                      value={schedule[day.id].startTime}
                      onChange={(e) => handleTimeChange(day.id, 'startTime', e.target.value)}
                      disabled={!schedule[day.id].enabled}
                    />
                  </div>

                  <span className="time-separator">to</span>

                  <div className="time-input-group">
                    <label htmlFor={`end-${day.id}`}>End</label>
                    <input
                      id={`end-${day.id}`}
                      type="time"
                      data-testid={`end-time-${day.name.toLowerCase()}`}
                      value={schedule[day.id].endTime}
                      onChange={(e) => handleTimeChange(day.id, 'endTime', e.target.value)}
                      disabled={!schedule[day.id].enabled}
                    />
                  </div>
                </div>

                {validationErrors[day.id] && (
                  <div className="validation-error">
                    {validationErrors[day.id]}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="scheduler-actions">
            <button
              className="copy-all-btn"
              onClick={handleCopyToAll}
              type="button"
              data-testid="copy-all-button"
            >
              📋 Copy to all weekdays
            </button>

            <button
              className="save-btn"
              data-testid="save-schedule-button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : '💾 Save Schedule'}
            </button>
          </div>

          <div className="scheduler-tips">
            <h3>💡 Tips</h3>
            <ul>
              <li>Toggle each day on/off to set your availability</li>
              <li>Set your working hours for each day</li>
              <li>Use "Copy to all weekdays" to quickly set Mon-Fri schedule</li>
              <li>All times are in your local timezone</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default AvailabilityScheduler;

