/**
 * Reminder Settings Component
 * Admin UI for configuring appointment reminders
 */

import React, { useState, useEffect } from 'react';
import { get, put } from '../../utils/api';
import './ReminderSettings.css';

export default function ReminderSettings({ tenantId }) {
  const [settings, setSettings] = useState({
    enabled: true,
    hoursBefore: 24,
    template: 'default'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenantId) loadSettings();
  }, [tenantId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await get(`/api/booking/tenants/${tenantId}/reminder-settings`);
      setSettings({
        enabled: data.enabled ?? true,
        hoursBefore: data.hoursBefore ?? 24,
        template: data.template || 'default'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      await put(`/api/booking/tenants/${tenantId}/reminder-settings`, settings);
      setMessage('Reminder settings saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !settings.enabled) {
    return <div className="reminder-loading">Loading...</div>;
  }

  return (
    <div className="reminder-settings">
      <div className="settings-header">
        <h3>📧 Appointment Reminders</h3>
        <p>Automatically send reminder emails before appointments</p>
      </div>

      <div className="settings-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            disabled={loading}
          />
          <span>Enable reminder emails</span>
        </label>
      </div>

      {settings.enabled && (
        <>
          <div className="settings-group">
            <label htmlFor="hours-before">Send reminder</label>
            <div className="input-group">
              <input
                id="hours-before"
                type="number"
                min="1"
                max="72"
                value={settings.hoursBefore}
                onChange={(e) => setSettings({ ...settings, hoursBefore: parseInt(e.target.value) })}
                disabled={loading}
              />
              <span>hours before appointment</span>
            </div>
            <small>Recommended: 24 hours (1 day)</small>
          </div>

          <div className="settings-info">
            <strong>How it works:</strong>
            <ul>
              <li>Reminders are sent automatically 24 hours before each confirmed appointment</li>
              <li>Emails include appointment details and confirmation code</li>
              <li>Customers receive reminders based on their booking email address</li>
              <li>System checks every 15 minutes for upcoming appointments</li>
            </ul>
          </div>
        </>
      )}

      {message && <div className="settings-message success">{message}</div>}
      {error && <div className="settings-message error">{error}</div>}

      <div className="settings-actions">
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}


