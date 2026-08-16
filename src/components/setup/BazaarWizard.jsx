/**
 * BazaarWizard — 2-step wizard for pop-up / temporary selling.
 *
 * The "easy" path: a weekend yard sale or food stall gets the full online
 * business experience (catalog + ordering + location + payments) with
 * minimal config and zero ceremony.
 *
 * Steps:
 *   1. What — pick a pop-up type + business name
 *   2. Where/When — location, hours, optional "open until" end date
 *
 * No industry question, no level question — Bazaar is inherently solo.
 */

import { useState } from 'react';
import { useSite } from '../../hooks/useSite';
import { useToast } from '../../hooks/useToast';
import { BAZAAR_TYPES, buildBazaarSiteData } from '../../config/bazaarDefaults';
import './BazaarWizard.css';

const STEPS = [
  { id: 'what', title: 'What are you selling?', icon: '🛍️' },
  { id: 'where', title: 'Where & when?', icon: '📍' },
];

function BazaarWizard({ onComplete, onCancel }) {
  const { loadTemplate } = useSite();
  const { showError } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form state
  const [popUpType, setPopUpType] = useState('food-stall');
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [hours, setHours] = useState('');
  const [openUntil, setOpenUntil] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const canProceed = () => {
    if (currentStep === 0) {
      return popUpType && businessName.trim().length > 0;
    }
    return true; // Step 1 fields are all optional
  };

  const handleNext = () => {
    if (!canProceed()) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (onCancel) {
      onCancel();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const siteData = buildBazaarSiteData({
        popUpType,
        businessName: businessName.trim(),
        location: location.trim(),
        hours: hours.trim(),
        openUntil: openUntil || null,
        contactPhone: contactPhone.trim(),
      });

      await loadTemplate(siteData);

      if (onComplete) {
        onComplete(siteData);
      }
    } catch (error) {
      showError('Failed to create your pop-up site. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="bazaar-step bazaar-step-what">
            <div className="bazaar-field">
              <label htmlFor="bazaar-name">Your name or shop name</label>
              <input
                id="bazaar-name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Maria's Tacos, Smith Family Yard Sale"
                autoFocus
                data-testid="bazaar-name-input"
              />
            </div>

            <div className="bazaar-field">
              <label>What kind of pop-up is it?</label>
              <div className="bazaar-type-grid" role="radiogroup" aria-label="Pop-up type">
                {BAZAAR_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    role="radio"
                    aria-checked={popUpType === type.id}
                    className={`bazaar-type-card ${popUpType === type.id ? 'selected' : ''}`}
                    onClick={() => setPopUpType(type.id)}
                    data-testid={`bazaar-type-${type.id}`}
                  >
                    <span className="bazaar-type-icon">{type.icon}</span>
                    <span className="bazaar-type-name">{type.name}</span>
                    <span className="bazaar-type-desc">{type.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="bazaar-step bazaar-step-where">
            <div className="bazaar-field">
              <label htmlFor="bazaar-location">Where is it? (address or area)</label>
              <input
                id="bazaar-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. 123 Main St, or 'Corner of 5th & Oak'"
                data-testid="bazaar-location-input"
              />
            </div>

            <div className="bazaar-field">
              <label htmlFor="bazaar-hours">When is it? (days/hours)</label>
              <input
                id="bazaar-hours"
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. Saturday 8am–2pm"
                data-testid="bazaar-hours-input"
              />
            </div>

            <div className="bazaar-field">
              <label htmlFor="bazaar-until">Open until? (optional &mdash; shows a countdown)</label>
              <input
                id="bazaar-until"
                type="datetime-local"
                value={openUntil}
                onChange={(e) => setOpenUntil(e.target.value)}
                data-testid="bazaar-until-input"
              />
              <p className="bazaar-hint">Leave blank if it&apos;s open-ended.</p>
            </div>

            <div className="bazaar-field">
              <label htmlFor="bazaar-phone">Contact phone (optional)</label>
              <input
                id="bazaar-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="e.g. (555) 123-4567"
                data-testid="bazaar-phone-input"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bazaar-wizard" data-testid="bazaar-wizard">
      <div className="bazaar-wizard-header">
        <h1>Set up your pop-up</h1>
        <p>Get a full online shop in two steps — no account complexity.</p>
      </div>

      <div className="bazaar-progress">
        {STEPS.map((step, i) => (
          <div
            key={step.id}
            className={`bazaar-progress-step ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}`}
          >
            <span className="bazaar-progress-icon">{i < currentStep ? '✓' : step.icon}</span>
            <span className="bazaar-progress-title">{step.title}</span>
          </div>
        ))}
      </div>

      <div className="bazaar-wizard-body">
        <h2 className="bazaar-step-title">{STEPS[currentStep]?.title}</h2>
        {renderStep()}
      </div>

      <div className="bazaar-wizard-actions">
        <button
          type="button"
          className="bazaar-btn bazaar-btn-secondary"
          onClick={handleBack}
          data-testid="bazaar-back-btn"
        >
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </button>
        <button
          type="button"
          className="bazaar-btn bazaar-btn-primary"
          onClick={handleNext}
          disabled={!canProceed() || loading}
          data-testid="bazaar-next-btn"
        >
          {loading
            ? 'Creating...'
            : currentStep === STEPS.length - 1
              ? 'Create my site'
              : 'Next'}
        </button>
      </div>
    </div>
  );
}

export default BazaarWizard;