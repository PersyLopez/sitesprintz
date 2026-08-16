/**
 * Recurring Appointment Selector Component
 * Allows customers to set up recurring appointments
 */

import React, { useState } from 'react';
import './RecurringSelector.css';

export default function RecurringSelector({ 
  onRecurrenceSelected,
  disabled = false 
}) {
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [occurrences, setOccurrences] = useState(4);
  const [endDate, setEndDate] = useState('');

  const handleApply = () => {
    if (!isRecurring) {
      onRecurrenceSelected(null);
      return;
    }

    onRecurrenceSelected({
      type: recurrenceType,
      occurrences: occurrences || null,
      endDate: endDate || null
    });
  };

  return (
    <div className="recurring-selector">
      <div className="recurring-header">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            disabled={disabled}
          />
          <span>Make this a recurring appointment</span>
        </label>
      </div>

      {isRecurring && (
        <div className="recurring-options">
          <div className="option-group">
            <label htmlFor="recurrence-type">Repeat every</label>
            <select
              id="recurrence-type"
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value)}
              disabled={disabled}
            >
              <option value="weekly">Week</option>
              <option value="monthly">Month</option>
            </select>
          </div>

          <div className="option-group">
            <label>For how long?</label>
            <div className="duration-options">
              <label className="radio-label">
                <input
                  type="radio"
                  value="occurrences"
                  checked={!endDate}
                  onChange={() => setEndDate('')}
                />
                <span>{occurrences} times</span>
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={occurrences}
                onChange={(e) => setOccurrences(parseInt(e.target.value))}
                className="occurrence-input"
              />
            </div>

            <div className="duration-options">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={!!endDate}
                  onChange={() => setOccurrences(null)}
                />
                <span>Until date</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!endDate}
              />
            </div>
          </div>

          <div className="recurring-preview">
            <strong>Summary:</strong>
            <p>
              {recurrenceType === 'weekly' ? 'Every week' : 'Every month'}
              {endDate 
                ? ` until ${new Date(endDate).toLocaleDateString()}`
                : ` for ${occurrences} times`
              }
            </p>
          </div>
        </div>
      )}

      <div className="recurring-actions">
        <button
          onClick={handleApply}
          disabled={disabled}
          className="btn btn-primary"
        >
          {isRecurring ? 'Continue with recurring' : 'Continue (one-time)'}
        </button>
      </div>
    </div>
  );
}


