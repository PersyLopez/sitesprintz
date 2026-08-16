import React, { useState, useEffect } from 'react';
import './FieldValidation.css';

/**
 * FieldValidation - Wrapper for form fields with validation
 * 
 * @param {string} value - Field value
 * @param {Function} validator - Validation function
 * @param {string} errorMessage - Error message to show
 * @param {number} maxLength - Maximum length
 * @param {string} recommendedLength - Recommended length hint
 * @param {ReactNode} children - Input element
 */
function FieldValidation({
  value = '',
  validator,
  errorMessage,
  maxLength,
  recommendedLength,
  children,
  className = ''
}) {
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (touched && validator) {
      const result = validator(value);
      setError(result ? null : errorMessage);
    }
  }, [value, touched, validator, errorMessage]);

  const handleBlur = () => {
    setTouched(true);
    if (validator) {
      const result = validator(value);
      setError(result ? null : errorMessage);
    }
  };

  const showCharCount = maxLength !== undefined;
  const charCount = value?.length || 0;
  const isNearLimit = maxLength && charCount > maxLength * 0.8;

  return (
    <div className={`field-validation ${className} ${error ? 'has-error' : ''}`}>
      <div className="field-wrapper" onBlur={handleBlur}>
        {children}
        {showCharCount && (
          <div className={`char-count ${isNearLimit ? 'near-limit' : ''}`}>
            {charCount} / {maxLength}
          </div>
        )}
      </div>
      {error && touched && (
        <div className="field-error" role="alert">
          {error}
        </div>
      )}
      {recommendedLength && !error && (
        <div className="field-hint">
          Recommended: {recommendedLength} characters
        </div>
      )}
    </div>
  );
}

export default FieldValidation;



