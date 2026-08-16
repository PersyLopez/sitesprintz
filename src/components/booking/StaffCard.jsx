/**
 * Staff Card Component
 * Display staff member details and availability
 */

import React, { useState, useEffect } from 'react';
import './StaffCard.css';

export default function StaffCard({ 
  staffId, 
  staffName,
  email,
  phone,
  photoUrl,
  specialties,
  bio,
  isDefault,
  onSelect,
  selected = false,
  showAvailability = false 
}) {
  const [availability, setAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  useEffect(() => {
    if (showAvailability && selected) {
      loadAvailability();
    }
  }, [selected, showAvailability]);

  const loadAvailability = async () => {
    try {
      setLoadingAvailability(true);
      const today = new Date().toISOString().split('T')[0];
      
      // In production, would fetch actual availability
      // const response = await fetch(`/api/booking/availability/${serviceId}/${staffId}?date=${today}`);
      // setAvailability(await response.json());
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  return (
    <div className={`staff-card ${selected ? 'selected' : ''}`}>
      <div className="staff-card-header">
        {photoUrl && (
          <img src={photoUrl} alt={staffName} className="staff-card-photo" />
        )}
        {!photoUrl && (
          <div className="staff-card-avatar">{staffName.charAt(0)}</div>
        )}
        <div className="staff-card-title">
          <h4>{staffName}</h4>
          {isDefault && <span className="default-badge">Default</span>}
        </div>
      </div>

      <div className="staff-card-body">
        {bio && <p className="staff-bio">{bio}</p>}
        
        {specialties && (
          <div className="staff-specialties">
            {typeof specialties === 'string' 
              ? specialties 
              : (Array.isArray(specialties) ? specialties.join(', ') : '')}
          </div>
        )}

        {email && (
          <div className="staff-contact">
            <span className="contact-label">Email:</span>
            <a href={`mailto:${email}`}>{email}</a>
          </div>
        )}

        {phone && (
          <div className="staff-contact">
            <span className="contact-label">Phone:</span>
            <a href={`tel:${phone}`}>{phone}</a>
          </div>
        )}
      </div>

      {onSelect && (
        <div className="staff-card-footer">
          <button 
            className={`btn ${selected ? 'btn-selected' : 'btn-select'}`}
            onClick={onSelect}
          >
            {selected ? '✓ Selected' : 'Select'}
          </button>
        </div>
      )}
    </div>
  );
}


