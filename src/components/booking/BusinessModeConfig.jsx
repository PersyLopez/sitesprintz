/**
 * Business Mode Configuration Component
 * 
 * Allows business owners to configure solo vs. team mode settings
 * for their booking system.
 * 
 * Features:
 * - Switch between Solo, Team, and Hybrid modes
 * - Configure "Any Available" option
 * - Customize no-preference text
 * - Shows recommendation based on current staff count
 */

import React, { useState, useEffect } from 'react';
import { get, put, post } from '../../utils/api';
import './BusinessModeConfig.css';

const BUSINESS_MODES = {
  SOLO: 'solo',
  TEAM: 'team',
  HYBRID: 'hybrid'
};

const MODE_DESCRIPTIONS = {
  [BUSINESS_MODES.SOLO]: {
    title: 'Solo Operator',
    description: 'Single person handles all appointments. No staff selection shown to customers.',
    icon: '👤',
    bestFor: 'Best for: Freelancers, solo consultants, single-stylist salons'
  },
  [BUSINESS_MODES.TEAM]: {
    title: 'Team Mode',
    description: 'Multiple staff members. Customers choose their preferred provider.',
    icon: '👥',
    bestFor: 'Best for: Salons, clinics, gyms with trainers, home service companies'
  },
  [BUSINESS_MODES.HYBRID]: {
    title: 'Hybrid Mode',
    description: 'Team exists but staff is auto-assigned. "Any Available" is default.',
    icon: '🔄',
    bestFor: 'Best for: Larger teams, dispatch-based services, when speed matters more than preference'
  }
};

export default function BusinessModeConfig({ tenantId, onConfigUpdated }) {
  const [config, setConfig] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (tenantId) {
      loadConfig();
      loadSuggestion();
    }
  }, [tenantId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await get(`/api/business-mode/${tenantId}/config`);
      setConfig(response.config);
    } catch (err) {
      setError('Failed to load configuration');
      console.error('Error loading business mode config:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestion = async () => {
    try {
      const response = await get(`/api/business-mode/${tenantId}/suggest`);
      setSuggestion(response.suggestion);
    } catch (err) {
      console.error('Error loading suggestion:', err);
    }
  };

  const handleModeChange = async (newMode) => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const response = await put(`/api/business-mode/${tenantId}/config`, {
        businessMode: newMode,
        // Auto-adjust staff selection based on mode
        staffSelectionEnabled: newMode === BUSINESS_MODES.TEAM,
        allowNoPreference: newMode !== BUSINESS_MODES.SOLO
      });

      setConfig(response.config);
      setSuccessMessage('Business mode updated successfully!');
      onConfigUpdated?.(response.config);

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to update business mode');
      console.error('Error updating mode:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = async (setting, value) => {
    try {
      setSaving(true);
      setError('');

      const response = await put(`/api/business-mode/${tenantId}/config`, {
        [setting]: value
      });

      setConfig(response.config);
      onConfigUpdated?.(response.config);
    } catch (err) {
      setError('Failed to update setting');
      console.error('Error updating setting:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleMigrateToTeam = async () => {
    if (!confirm('This will set up team mode and assign all staff to all services. Continue?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await post(`/api/business-mode/${tenantId}/migrate-to-team`);
      setSuccessMessage(`Migrated to team mode! ${response.servicesUpdated} services updated with ${response.staffCount} staff.`);
      
      await loadConfig();
      await loadSuggestion();
      onConfigUpdated?.(config);

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to migrate to team mode');
      console.error('Error migrating:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="business-mode-config loading">
        <div className="loading-spinner"></div>
        <p>Loading configuration...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="business-mode-config error">
        <p>Could not load business mode configuration</p>
      </div>
    );
  }

  return (
    <div className="business-mode-config" data-testid="business-mode-config">
      <div className="config-header">
        <h2>📋 Business Mode Configuration</h2>
        <p className="subtitle">
          Configure how your booking system handles staff assignments
        </p>
      </div>

      {error && (
        <div className="alert alert-error" data-testid="config-error">
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" data-testid="config-success">
          ✅ {successMessage}
        </div>
      )}

      {/* Suggestion Banner */}
      {suggestion && suggestion.suggestedMode !== config.configuredMode && (
        <div className="suggestion-banner" data-testid="mode-suggestion">
          <div className="suggestion-icon">💡</div>
          <div className="suggestion-content">
            <strong>Recommendation:</strong>
            <p>{suggestion.recommendation}</p>
            <p className="suggestion-stats">
              You have {suggestion.staffCount} staff members and {suggestion.serviceCount} services.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => handleModeChange(suggestion.suggestedMode)}
            disabled={saving}
          >
            Apply Suggestion
          </button>
        </div>
      )}

      {/* Mode Selection */}
      <div className="mode-selection">
        <h3>Select Your Business Mode</h3>
        <div className="mode-cards">
          {Object.entries(MODE_DESCRIPTIONS).map(([mode, info]) => (
            <div
              key={mode}
              className={`mode-card ${config.configuredMode === mode ? 'selected' : ''} ${config.isSoloOperation && mode !== BUSINESS_MODES.SOLO ? 'disabled' : ''}`}
              onClick={() => {
                if (config.isSoloOperation && mode !== BUSINESS_MODES.SOLO) {
                  alert('Add more staff members to enable team modes');
                  return;
                }
                handleModeChange(mode);
              }}
              data-testid={`mode-card-${mode}`}
            >
              <div className="mode-icon">{info.icon}</div>
              <h4>{info.title}</h4>
              <p>{info.description}</p>
              <span className="best-for">{info.bestFor}</span>
              {config.configuredMode === mode && (
                <div className="selected-badge">✓ Active</div>
              )}
              {config.isSoloOperation && mode !== BUSINESS_MODES.SOLO && (
                <div className="disabled-badge">Requires 2+ staff</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Status */}
      <div className="status-section">
        <h3>Current Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Configured Mode</span>
            <span className="status-value">{MODE_DESCRIPTIONS[config.configuredMode]?.title}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Effective Mode</span>
            <span className="status-value">{MODE_DESCRIPTIONS[config.effectiveMode]?.title}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Active Staff</span>
            <span className="status-value">{config.staffCount}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Staff Selection</span>
            <span className="status-value">{config.showStaffSelection ? '✅ Enabled' : '❌ Disabled'}</span>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      {config.configuredMode !== BUSINESS_MODES.SOLO && (
        <div className="advanced-settings">
          <h3>Advanced Settings</h3>

          <div className="setting-row">
            <div className="setting-info">
              <label htmlFor="staff-selection">Enable Staff Selection</label>
              <p className="setting-description">
                Allow customers to choose a specific staff member when booking
              </p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                id="staff-selection"
                checked={config.staffSelectionEnabled}
                onChange={(e) => handleSettingChange('staffSelectionEnabled', e.target.checked)}
                disabled={saving}
                data-testid="staff-selection-toggle"
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <label htmlFor="no-preference">Show "Any Available" Option</label>
              <p className="setting-description">
                Offer an option for customers who don't have a preference
              </p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                id="no-preference"
                checked={config.allowNoPreference}
                onChange={(e) => handleSettingChange('allowNoPreference', e.target.checked)}
                disabled={saving}
                data-testid="no-preference-toggle"
              />
              <span className="slider"></span>
            </label>
          </div>

          {config.allowNoPreference && (
            <div className="setting-row">
              <div className="setting-info">
                <label htmlFor="no-preference-text">"No Preference" Label</label>
                <p className="setting-description">
                  Customize what the "any available" option says (e.g., "Any Stylist", "First Available")
                </p>
              </div>
              <input
                type="text"
                id="no-preference-text"
                value={config.noPreferenceText || 'Any Available'}
                onChange={(e) => handleSettingChange('noPreferenceText', e.target.value)}
                disabled={saving}
                className="text-input"
                maxLength={100}
                data-testid="no-preference-text-input"
              />
            </div>
          )}
        </div>
      )}

      {/* Migration Action */}
      {config.staffCount >= 2 && config.configuredMode === BUSINESS_MODES.SOLO && (
        <div className="migration-section">
          <h3>Ready for Team Mode?</h3>
          <p>
            You have {config.staffCount} staff members but are running in Solo mode.
            Migrate to Team mode to let customers choose their preferred provider.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleMigrateToTeam}
            disabled={saving}
            data-testid="migrate-button"
          >
            {saving ? 'Migrating...' : '🚀 Migrate to Team Mode'}
          </button>
        </div>
      )}

      {/* Help Section */}
      <div className="help-section">
        <h3>💡 Understanding Business Modes</h3>
        <div className="help-grid">
          <div className="help-item">
            <strong>Solo Mode</strong>
            <p>Perfect for one-person operations. Customers book appointments directly without seeing staff options.</p>
          </div>
          <div className="help-item">
            <strong>Team Mode</strong>
            <p>Customers can browse and select their preferred staff member. Great for salons, clinics, and gyms.</p>
          </div>
          <div className="help-item">
            <strong>Hybrid Mode</strong>
            <p>Staff exists but assignments are automatic. Good for dispatch services or when speed is priority.</p>
          </div>
          <div className="help-item">
            <strong>"Any Available" Option</strong>
            <p>When enabled, customers can choose "No Preference" and the system auto-assigns the least busy available staff.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


