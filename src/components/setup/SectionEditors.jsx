/**
 * Section Editors - Components that edit specific section types
 * These wrap and adapt the orphaned admin components into the section editing pattern
 */

import React from 'react';
import { normalizeTier, TIERS } from '../../config/tiers';

/**
 * Native Booking Section Editor
 * Wrapper around BookingEditor + BusinessModeConfig
 * Edits: booking provider, business mode, staff selection settings
 */
export function NativeBookingSectionEditor({ section, onChange }) {
  const { content = {} } = section;

  const handleChange = (updates) => {
    onChange({
      ...section,
      content: { ...content, ...updates }
    });
  };

  return (
    <div className="section-editor native-booking-editor">
      <h4>Native Booking Configuration</h4>
      
      <div className="editor-group">
        <label>
          <input
            type="checkbox"
            checked={content.enabled || false}
            onChange={(e) => handleChange({ enabled: e.target.checked })}
          />
          Enable native booking on this site
        </label>
      </div>

      {content.enabled && (
        <>
          <div className="editor-group">
            <label>Booking Provider</label>
            <select
              value={content.provider || 'native'}
              onChange={(e) => handleChange({ provider: e.target.value })}
              disabled
            >
              <option value="native">Right Site Light Native Booking</option>
            </select>
          </div>

          <fieldset className="editor-group">
            <legend>Business Structure</legend>
            <p className="help-text">How many staff members handle bookings?</p>
            
            <label className="radio-option">
              <input
                type="radio"
                name="businessMode"
                value="solo"
                checked={content.businessMode === 'solo'}
                onChange={(e) => handleChange({ businessMode: e.target.value })}
              />
              <span>Solo - I handle all bookings alone</span>
            </label>

            <label className="radio-option">
              <input
                type="radio"
                name="businessMode"
                value="team"
                checked={content.businessMode === 'team'}
                onChange={(e) => handleChange({ businessMode: e.target.value })}
              />
              <span>Team - I have multiple staff members</span>
            </label>

            <label className="radio-option">
              <input
                type="radio"
                name="businessMode"
                value="hybrid"
                checked={content.businessMode === 'hybrid'}
                onChange={(e) => handleChange({ businessMode: e.target.value })}
              />
              <span>Hybrid - Team exists but auto-assigned to appointments</span>
            </label>
          </fieldset>

          {(content.businessMode === 'team' || content.businessMode === 'hybrid') && (
            <div className="editor-group">
              <label>
                <input
                  type="checkbox"
                  checked={content.allowNoPreference || true}
                  onChange={(e) => handleChange({ allowNoPreference: e.target.checked })}
                />
                Allow customers to request "No Preference" for staff
              </label>
              {content.allowNoPreference && (
                <input
                  type="text"
                  placeholder="e.g., 'Any Available Stylist'"
                  value={content.noPreferenceText || 'Any Available'}
                  onChange={(e) => handleChange({ noPreferenceText: e.target.value })}
                  className="text-input"
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Stripe Checkout Section Editor
 * Allows toggling checkout on/off and configuring checkout settings
 */
export function CheckoutSectionEditor({ section, onChange, userTier }) {
  const { content = {} } = section;
  const canAccessCheckout = normalizeTier(userTier) === TIERS.GROWTH;

  const handleChange = (updates) => {
    onChange({
      ...section,
      content: { ...content, ...updates }
    });
  };

  if (!canAccessCheckout) {
    return (
      <div className="section-editor checkout-editor locked">
        <h4>Stripe Checkout 💳</h4>
        <p className="lock-message">
          Stripe checkout is available on the Growth plan.
          <a href="/settings#billing"> Upgrade now</a>
        </p>
      </div>
    );
  }

  return (
    <div className="section-editor checkout-editor">
      <h4>Stripe Checkout Configuration</h4>

      <div className="editor-group">
        <label>
          <input
            type="checkbox"
            checked={content.allowCheckout || false}
            onChange={(e) => handleChange({ allowCheckout: e.target.checked })}
          />
          Allow customers to purchase products
        </label>
      </div>

      <div className="editor-group">
        <label>
          <input
            type="checkbox"
            checked={content.allowOrders || false}
            onChange={(e) => handleChange({ allowOrders: e.target.checked })}
          />
          Allow customers to submit orders (requires manual processing)
        </label>
      </div>

      <div className="editor-group">
        <label>Currency</label>
        <select
          value={content.currency || 'USD'}
          onChange={(e) => handleChange({ currency: e.target.value })}
        >
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
          <option value="CAD">CAD (C$)</option>
          <option value="AUD">AUD (A$)</option>
        </select>
      </div>
    </div>
  );
}

/**
 * Google Reviews Section Editor
 */
export function ReviewsSectionEditor({ section, onChange }) {
  const { content = {} } = section;

  const handleChange = (updates) => {
    onChange({
      ...section,
      content: { ...content, ...updates }
    });
  };

  return (
    <div className="section-editor reviews-editor">
      <h4>Google Reviews Configuration</h4>

      <div className="editor-group">
        <label>
          <input
            type="checkbox"
            checked={content.enabled || false}
            onChange={(e) => handleChange({ enabled: e.target.checked })}
          />
          Display Google Business reviews on this site
        </label>
      </div>

      {content.enabled && (
        <>
          <div className="editor-group">
            <label htmlFor="businessId">Google Business ID</label>
            <input
              id="businessId"
              type="text"
              value={content.businessId || ''}
              onChange={(e) => handleChange({ businessId: e.target.value })}
              placeholder="Your Google Business ID"
              className="text-input"
            />
            <small className="help-text">
              Find your ID in your Google Business profile URL
            </small>
          </div>

          <div className="editor-group">
            <label htmlFor="reviewLimit">Show Latest N Reviews</label>
            <input
              id="reviewLimit"
              type="number"
              min="1"
              max="20"
              value={content.limit || 5}
              onChange={(e) => handleChange({ limit: parseInt(e.target.value) })}
              className="number-input"
            />
          </div>

          <div className="editor-group">
            <label>
              <input
                type="checkbox"
                checked={content.showRatings || true}
                onChange={(e) => handleChange({ showRatings: e.target.checked })}
              />
              Show star ratings
            </label>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Generic Premium Module Editor
 * For modules like calculator, class scheduler, etc.
 */
export function PremiumModuleSectionEditor({ section, onChange }) {
  const { type, content = {} } = section;
  const moduleInfo = {
    'interactive-calculator': {
      name: 'Interactive Calculator',
      fields: ['title', 'description', 'inputs', 'formula']
    },
    'class-scheduler': {
      name: 'Class Schedule',
      fields: ['title', 'classes']
    },
    'subscription-booking': {
      name: 'Membership/Subscription',
      fields: ['title', 'plans']
    },
    'diagnostic-quiz': {
      name: 'Diagnostic Quiz',
      fields: ['title', 'questions']
    },
    'progress-tracker': {
      name: 'Progress Tracker',
      fields: ['title', 'stages']
    },
    'resource-center': {
      name: 'Resource Center',
      fields: ['title', 'items']
    },
    'video-gallery': {
      name: 'Video Gallery',
      fields: ['title', 'videos']
    },
    'zip-checker': {
      name: 'ZIP Code Checker',
      fields: ['title', 'serviceZips']
    },
    'enhanced-profiles': {
      name: 'Enhanced Profiles',
      fields: ['title', 'profiles']
    }
  };

  const info = moduleInfo[type];
  if (!info) return null;

  const handleChange = (updates) => {
    onChange({
      ...section,
      content: { ...content, ...updates }
    });
  };

  return (
    <div className="section-editor premium-module-editor">
      <h4>{info.name} Configuration</h4>

      <div className="editor-group">
        <label htmlFor={`${type}-title`}>Title</label>
        <input
          id={`${type}-title`}
          type="text"
          value={content.title || ''}
          onChange={(e) => handleChange({ title: e.target.value })}
          placeholder={`Enter ${info.name} title`}
          className="text-input"
        />
      </div>

      <div className="editor-note">
        <p>This section requires additional setup in the admin panel.</p>
        <a href="/admin">Go to Admin Panel →</a>
      </div>
    </div>
  );
}

/**
 * Registry of section editors by type
 */
export const SECTION_EDITORS = {
  'native-booking': NativeBookingSectionEditor,
  'checkout': CheckoutSectionEditor,
  'reviews': ReviewsSectionEditor,
  'interactive-calculator': PremiumModuleSectionEditor,
  'class-scheduler': PremiumModuleSectionEditor,
  'subscription-booking': PremiumModuleSectionEditor,
  'diagnostic-quiz': PremiumModuleSectionEditor,
  'progress-tracker': PremiumModuleSectionEditor,
  'resource-center': PremiumModuleSectionEditor,
  'video-gallery': PremiumModuleSectionEditor,
  'zip-checker': PremiumModuleSectionEditor,
  'enhanced-profiles': PremiumModuleSectionEditor
};

/**
 * Get the editor component for a section type
 */
export function getSectionEditor(sectionType) {
  return SECTION_EDITORS[sectionType] || null;
}

export default {
  NativeBookingSectionEditor,
  CheckoutSectionEditor,
  ReviewsSectionEditor,
  PremiumModuleSectionEditor,
  SECTION_EDITORS,
  getSectionEditor
};
