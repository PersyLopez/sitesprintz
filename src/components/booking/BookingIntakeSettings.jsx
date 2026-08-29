import React, { useState, useEffect } from 'react';
import { get, put } from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import FeeConfiguration from './FeeConfiguration';

function normalizeSettings(apiSettings, firstService) {
  return {
    scheduling_enabled: apiSettings.scheduling_enabled ?? true,
    urgent_enabled: apiSettings.urgent_enabled ?? false,
    fees_enabled: apiSettings.fees_enabled ?? false,
    payment_enabled: apiSettings.payment_enabled ?? false,
    reminders_enabled: apiSettings.enabled ?? true,
    reminder_hours: apiSettings.hoursBefore ?? 24,
    buffer_minutes: firstService?.buffer_minutes_after
      ?? firstService?.buffer_minutes_before
      ?? 15,
    default_payment_type: apiSettings.default_payment_type || 'none',
    default_deposit_percentage: apiSettings.default_deposit_percentage ?? 50,
  };
}

export default function BookingIntakeSettings({ userId, siteId }) {
  const { showError, showSuccess } = useToast();
  const siteQuery = siteId ? { siteId } : undefined;

  const [settings, setSettings] = useState({
    scheduling_enabled: true,
    urgent_enabled: false,
    fees_enabled: false,
    payment_enabled: false,
    reminders_enabled: true,
    reminder_hours: 24,
    buffer_minutes: 15,
    default_payment_type: 'none',
    default_deposit_percentage: 50,
  });
  const [firstService, setFirstService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadSettings();
  }, [userId, siteId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [apiSettings, servicesRes] = await Promise.all([
        get(`/api/booking/tenants/${userId}/reminder-settings`, { params: siteQuery }),
        get(`/api/booking/tenants/${userId}/services`, { params: siteQuery }),
      ]);
      const services = servicesRes.services || [];
      const service = services[0] || null;
      setFirstService(service);
      setSettings(normalizeSettings(apiSettings, service));
    } catch (error) {
      showError('Failed to load booking settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      setSaving(true);
      await put(
        `/api/booking/tenants/${userId}/reminder-settings`,
        {
          enabled: settings.reminders_enabled,
          hoursBefore: settings.reminder_hours,
          scheduling_enabled: settings.scheduling_enabled,
          urgent_enabled: settings.urgent_enabled,
          fees_enabled: settings.fees_enabled,
          payment_enabled: settings.payment_enabled,
          default_payment_type: settings.default_payment_type,
          default_deposit_percentage: settings.default_deposit_percentage,
        },
        { params: siteQuery }
      );

      if (settings.scheduling_enabled) {
        const servicesRes = await get(`/api/booking/tenants/${userId}/services`, { params: siteQuery });
        const services = servicesRes.services || [];
        await Promise.all(
          services.map((svc) =>
            put(
              `/api/booking/services/${svc.id}/buffer-settings`,
              {
                before: settings.buffer_minutes || 0,
                after: settings.buffer_minutes || 0,
              },
              { params: siteQuery }
            )
          )
        );
      }

      showSuccess('Settings saved successfully');
    } catch (error) {
      showError(error.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading" role="status">Loading settings...</div>;
  }

  return (
    <div className="phase2-settings-panel" data-testid="booking-intake-settings">
      <h3>Booking settings</h3>
      <p className="settings-intro">Choose what customers see when they book online.</p>

      <fieldset className="settings-fieldset">
        <legend>Scheduling</legend>
        <label className="settings-label">
          <input
            type="checkbox"
            checked={settings.scheduling_enabled}
            onChange={(e) => handleChange('scheduling_enabled', e.target.checked)}
            data-testid="scheduling-enabled-switch"
          />
          <span>Let customers book a time</span>
        </label>
        {!settings.scheduling_enabled && (
          <p className="settings-off-notice">Customers will not see time slots on your booking page.</p>
        )}
        {settings.scheduling_enabled && (
          <>
            <label className="settings-label">
              <input
                type="checkbox"
                checked={settings.reminders_enabled}
                onChange={(e) => handleChange('reminders_enabled', e.target.checked)}
                data-testid="reminders-enabled-checkbox"
              />
              <span>Send appointment reminders</span>
            </label>
            {settings.reminders_enabled && (
              <label className="settings-label with-input">
                <span>Hours before appointment:</span>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={settings.reminder_hours}
                  onChange={(e) => handleChange('reminder_hours', parseInt(e.target.value, 10) || 24)}
                  data-testid="reminder-hours-input"
                />
              </label>
            )}
            <label className="settings-label with-input">
              <span>Buffer minutes between appointments:</span>
              <input
                type="number"
                min="0"
                max="120"
                value={settings.buffer_minutes}
                onChange={(e) => handleChange('buffer_minutes', parseInt(e.target.value, 10) || 0)}
                data-testid="buffer-minutes-input"
              />
            </label>
          </>
        )}
      </fieldset>

      <fieldset className="settings-fieldset">
        <legend>Urgent requests</legend>
        <label className="settings-label">
          <input
            type="checkbox"
            checked={settings.urgent_enabled}
            onChange={(e) => handleChange('urgent_enabled', e.target.checked)}
            data-testid="urgent-enabled-switch"
          />
          <span>Allow same-day / urgent requests</span>
        </label>
        {!settings.urgent_enabled && (
          <p className="settings-off-notice">Customers will not see an option to mark a request as urgent.</p>
        )}
        {settings.urgent_enabled && (
          <p className="settings-help-text">Customers can mark a booking request as urgent when they need same-day service.</p>
        )}
      </fieldset>

      <fieldset className="settings-fieldset">
        <legend>Scheduling fees</legend>
        <label className="settings-label">
          <input
            type="checkbox"
            checked={settings.fees_enabled}
            onChange={(e) => handleChange('fees_enabled', e.target.checked)}
            data-testid="fees-enabled-switch"
          />
          <span>Charge cancellation or no-show fees</span>
        </label>
        {!settings.fees_enabled && (
          <p className="settings-off-notice">Customers will not see fee policies during booking.</p>
        )}
        {settings.fees_enabled && (
          firstService?.id ? (
            <FeeConfiguration serviceId={firstService.id} serviceName={firstService.name} />
          ) : (
            <p className="settings-help-text">
              Add a service first, then return here to set your shop&apos;s default fee rules.
            </p>
          )
        )}
      </fieldset>

      <fieldset className="settings-fieldset">
        <legend>Payment</legend>
        <label className="settings-label">
          <input
            type="checkbox"
            checked={settings.payment_enabled}
            onChange={(e) => handleChange('payment_enabled', e.target.checked)}
            data-testid="payment-enabled-switch"
          />
          <span>Require deposit or payment to book</span>
        </label>
        {!settings.payment_enabled && (
          <p className="settings-off-notice">Customers will not be asked to pay when booking.</p>
        )}
        {settings.payment_enabled && (
          <>
            <label className="settings-label with-input" htmlFor="default-payment-type">
              <span>Default payment type:</span>
              <select
                id="default-payment-type"
                value={settings.default_payment_type}
                onChange={(e) => handleChange('default_payment_type', e.target.value)}
                data-testid="default-payment-type-select"
              >
                <option value="none">No payment required</option>
                <option value="deposit">Deposit (partial payment)</option>
                <option value="full">Full payment</option>
              </select>
            </label>
            {settings.default_payment_type === 'deposit' && (
              <label className="settings-label with-input">
                <span>Deposit percentage: {settings.default_deposit_percentage}%</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={settings.default_deposit_percentage}
                  onChange={(e) => handleChange('default_deposit_percentage', parseInt(e.target.value, 10))}
                  data-testid="default-deposit-percentage-input"
                />
              </label>
            )}
          </>
        )}
      </fieldset>

      <button
        type="button"
        className="save-settings-btn"
        onClick={handleSave}
        disabled={saving}
        data-testid="save-booking-settings-btn"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
