/**
 * Staff Selector Component
 * Allows customers to select a specific staff member when booking
 * 
 * Supports both fetching staff from API or receiving staff as props
 * (useful when staff has already been loaded for service-specific assignments)
 */

import React, { useState, useEffect } from 'react';
import './StaffSelector.css';

export default function StaffSelector({ 
  tenantId, 
  serviceId, 
  selectedStaffId, 
  onStaffSelected,
  disabled = false,
  // New props for business mode support
  staff: providedStaff = null,  // Pre-loaded staff array
  showHeader = true             // Whether to show the "Select Staff" header
}) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // If staff is provided as a prop, use it directly
    if (providedStaff && providedStaff.length > 0) {
      setStaff(providedStaff);
      setLoading(false);
      return;
    }
    
    // Otherwise, load from API
    loadStaff();
  }, [tenantId, serviceId, providedStaff]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/booking/staff/${tenantId}`);
      if (!response.ok) throw new Error('Failed to load staff');

      const data = await response.json();
      
      // Filter staff that can provide this service
      let filteredStaff = Array.isArray(data) ? data : data.staff || [];
      
      // Sort by display_order and default staff first
      filteredStaff = filteredStaff.sort((a, b) => {
        if (a.is_default) return -1;
        if (b.is_default) return 1;
        if (a.isPrimaryForService && !b.isPrimaryForService) return -1;
        if (!a.isPrimaryForService && b.isPrimaryForService) return 1;
        return (a.display_order || 0) - (b.display_order || 0);
      });

      setStaff(filteredStaff);

      // Don't auto-select in the new business mode flow
      // The parent component handles this decision
    } catch (err) {
      setError(err.message);
      console.error('Error loading staff:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="staff-selector loading">Loading staff members...</div>;
  }

  if (error) {
    return <div className="staff-selector error">Error: {error}</div>;
  }

  if (staff.length === 0) {
    return <div className="staff-selector empty">No staff available</div>;
  }

  return (
    <div className="staff-selector">
      {showHeader && <label className="staff-label">👤 Select Staff Member</label>}
      <div className="staff-grid">
        {staff.map((member) => (
          <button
            key={member.id}
            className={`staff-card ${selectedStaffId === member.id ? 'selected' : ''}`}
            onClick={() => onStaffSelected(member.id)}
            disabled={disabled}
            type="button"
          >
            {member.photo_url && (
              <img src={member.photo_url} alt={member.name} className="staff-photo" />
            )}
            <div className="staff-info">
              <div className="staff-name">{member.name}</div>
              {member.specialties && (
                <div className="staff-specialties">
                  {typeof member.specialties === 'string' 
                    ? member.specialties 
                    : JSON.parse(member.specialties || '[]').join(', ')}
                </div>
              )}
              {member.is_default && <div className="staff-default">Default</div>}
            </div>
            {selectedStaffId === member.id && <div className="staff-checkmark">✓</div>}
          </button>
        ))}
      </div>
      <option className="staff-note">
        Each staff member may have different availability
      </option>
    </div>
  );
}

