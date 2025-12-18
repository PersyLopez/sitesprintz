import React from 'react';
import './PasswordStrengthMeter.css';

/**
 * Password Strength Meter Component
 * 
 * Displays password requirements and strength indicator
 */
export function PasswordStrengthMeter({ password = '' }) {
  const requirements = [
    { 
      label: 'At least 12 characters', 
      met: password.length >= 12 
    },
    { 
      label: 'One uppercase letter (A-Z)', 
      met: /[A-Z]/.test(password) 
    },
    { 
      label: 'One lowercase letter (a-z)', 
      met: /[a-z]/.test(password) 
    },
    { 
      label: 'One number (0-9)', 
      met: /[0-9]/.test(password) 
    },
    { 
      label: 'One special character (!@#$%^&*...)', 
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) 
    },
  ];

  // Calculate strength (0-5)
  let strength = 0;
  if (password.length >= 12) strength += 1;
  if (password.length >= 16) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;
  
  // Deduct for weak patterns
  if (/(.)\1{2,}/.test(password)) strength -= 1;
  if (/123|abc|qwe/i.test(password)) strength -= 1;
  
  strength = Math.max(0, Math.min(5, strength));

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#16a34a'];

  const allMet = requirements.every(req => req.met);

  if (!password) {
    return (
      <div className="password-strength-meter">
        <div className="password-requirements">
          <p className="requirements-title">Password Requirements:</p>
          <ul className="requirements-list">
            {requirements.map((req, idx) => (
              <li key={idx} className="requirement-item">
                <span className="requirement-icon">○</span>
                <span>{req.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="password-strength-meter">
      <div className="password-strength-bar">
        <div 
          className="strength-indicator"
          style={{ 
            width: `${(strength / 5) * 100}%`,
            backgroundColor: strengthColors[strength]
          }}
        />
      </div>
      <div className="strength-label">
        Strength: <strong style={{ color: strengthColors[strength] }}>
          {strengthLabels[strength]}
        </strong>
      </div>
      
      <div className="password-requirements">
        <p className="requirements-title">Requirements:</p>
        <ul className="requirements-list">
          {requirements.map((req, idx) => (
            <li 
              key={idx} 
              className={`requirement-item ${req.met ? 'met' : 'unmet'}`}
            >
              <span className="requirement-icon">
                {req.met ? '✓' : '○'}
              </span>
              <span>{req.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {allMet && (
        <div className="password-success">
          ✓ Password meets all requirements
        </div>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;






