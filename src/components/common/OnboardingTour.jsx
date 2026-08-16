import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './OnboardingTour.css';

/**
 * OnboardingTour - Interactive step-by-step tour with spotlight overlays
 * 
 * @param {Array} steps - Array of tour steps with { target, title, content, position }
 * @param {Function} onComplete - Callback when tour completes
 * @param {Function} onSkip - Callback when tour is skipped
 * @param {boolean} showOnMount - Whether to show tour automatically
 */
function OnboardingTour({ 
  steps = [], 
  onComplete, 
  onSkip,
  showOnMount = false 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(showOnMount);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const navigate = useNavigate();
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isVisible && steps.length > 0) {
      updateSpotlight();
      window.addEventListener('resize', updateSpotlight);
      return () => window.removeEventListener('resize', updateSpotlight);
    }
  }, [isVisible, currentStep, steps]);

  const updateSpotlight = () => {
    if (currentStep >= steps.length) return;
    
    const step = steps[currentStep];
    if (!step.target) {
      setSpotlightRect(null);
      return;
    }

    const element = typeof step.target === 'string' 
      ? document.querySelector(step.target)
      : step.target;

    if (element) {
      const rect = element.getBoundingClientRect();
      setSpotlightRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    } else {
      setSpotlightRect(null);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    if (onComplete) onComplete();
    // Mark tour as completed
    localStorage.setItem('onboardingTourCompleted', 'true');
  };

  const handleSkip = () => {
    setIsVisible(false);
    if (onSkip) onSkip();
    localStorage.setItem('onboardingTourCompleted', 'true');
  };

  if (!isVisible || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <div className="onboarding-tour-overlay" ref={overlayRef}>
      {/* Spotlight effect */}
      {spotlightRect && (
        <div
          className="onboarding-spotlight"
          style={{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`,
          }}
        />
      )}

      {/* Tooltip */}
      <div 
        className="onboarding-tooltip"
        style={step.position || {}}
      >
        <div className="tooltip-header">
          <h3>{step.title}</h3>
          <span className="tooltip-step">
            {currentStep + 1} / {steps.length}
          </span>
        </div>
        <div className="tooltip-content">
          {typeof step.content === 'string' ? <p>{step.content}</p> : step.content}
        </div>
        <div className="tooltip-actions">
          {currentStep > 0 && (
            <button 
              className="btn btn-secondary"
              onClick={handlePrevious}
            >
              ← Previous
            </button>
          )}
          <div className="tooltip-actions-right">
            <button 
              className="btn btn-secondary"
              onClick={handleSkip}
            >
              Skip Tour
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? 'Get Started →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;



