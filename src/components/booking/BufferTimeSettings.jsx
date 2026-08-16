/**
 * Buffer Time Settings Component
 * Admin UI for configuring buffer times between appointments
 */

import React, { useState, useEffect } from 'react';
import './BufferTimeSettings.css';

export default function BufferTimeSettings({ serviceId, serviceName }) {
  const [settings, setSettings] = useState({
    before: 0,
    after: 0
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, [serviceId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/booking/services/${serviceId}/buffer-settings`);
      if (!response.ok) throw new Error('Failed to load settings');
      const data = await response.json();
      setSettings(data);
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

      const response = await fetch(`/api/booking/services/${serviceId}/buffer-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          before: parseInt(settings.before),
          after: parseInt(settings.after)
        })
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setMessage('✅ Buffer time settings saved');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="buffer-time-settings">
      <div className="settings-header">
        <h4>⏱️ Buffer Time: {serviceName}</h4>
        <p>Add break time before and after appointments</p>
      </div>

      <div className="settings-group">
        <label htmlFor="buffer-before">Buffer time BEFORE appointment</label>
        <div className="input-group">
          <input
            id="buffer-before"
            type="number"
            min="0"
            max="120"
            value={settings.before}
            onChange={(e) => setSettings({ ...settings, before: e.target.value })}
            disabled={loading}
          />
          <span>minutes</span>
        </div>
        <small>Time reserved before appointment starts</small>
      </div>

      <div className="settings-group">
        <label htmlFor="buffer-after">Buffer time AFTER appointment</label>
        <div className="input-group">
          <input
            id="buffer-after"
            type="number"
            min="0"
            max="120"
            value={settings.after}
            onChange={(e) => setSettings({ ...settings, after: e.target.value })}
            disabled={loading}
          />
          <span>minutes</span>
        </div>
        <small>Time reserved after appointment ends</small>
      </div>

      <div className="settings-preview">
        <strong>Example:</strong>
        <div className="timeline">
          {settings.before > 0 && (
            <div className="buffer-block buffer-before">
              Buffer {settings.before}m before
            </div>
          )}
          <div className="service-block">
            Service Duration
          </div>
          {settings.after > 0 && (
            <div className="buffer-block buffer-after">
              Buffer {settings.after}m after
            </div>
          )}
        </div>
      </div>

      {message && <div className="settings-message success">{message}</div>}
      {error && <div className="settings-message error">{error}</div>}

      <div className="settings-actions">
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : 'Save Buffer Time'}
        </button>
      </div>
    </div>
  );
}


