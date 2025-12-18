/**
 * useServiceRequestForm Hook
 * 
 * Custom React hook for managing service request form state and submission.
 * Handles fetching niche-specific fields and form submission.
 */

import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Custom hook for service request forms
 * @param {string} templateId - Template ID (e.g., 'restaurant', 'auto-repair')
 * @param {string} subdomain - Site subdomain
 * @returns {object} Form state and handlers
 */
export function useServiceRequestForm(templateId, subdomain) {
  const [formData, setFormData] = useState({});
  const [nicheFields, setNicheFields] = useState([]);
  const [requiredFields, setRequiredFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingFields, setFetchingFields] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch niche-specific fields on mount
  useEffect(() => {
    if (!templateId) {
      setFetchingFields(false);
      return;
    }

    const fetchFields = async () => {
      try {
        setFetchingFields(true);
        const response = await api.get(`/api/service-requests/fields/${templateId}`);
        setNicheFields(response.data.nicheFields || []);
        setRequiredFields(response.data.requiredFields || []);
      } catch (err) {
        console.error('Failed to fetch template fields:', err);
        // Graceful degradation: use basic fields
        setNicheFields([]);
        setRequiredFields(['name', 'email', 'phone']);
      } finally {
        setFetchingFields(false);
      }
    };

    fetchFields();
  }, [templateId]);

  /**
   * Update a single form field
   * @param {string} name - Field name
   * @param {any} value - Field value
   */
  const updateField = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  /**
   * Update multiple fields at once
   * @param {object} fields - Object of field name/value pairs
   */
  const updateFields = (fields) => {
    setFormData(prev => ({ ...prev, ...fields }));
    if (error) setError(null);
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData({});
    setError(null);
    setSuccess(false);
  };

  /**
   * Submit the form
   * @returns {Promise<object>} Submission result
   */
  const submitRequest = async () => {
    if (!subdomain) {
      setError('Subdomain is required');
      return { success: false, error: 'Subdomain is required' };
    }

    if (!templateId) {
      setError('Template ID is required');
      return { success: false, error: 'Template ID is required' };
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await api.post('/api/service-requests/submit', {
        subdomain,
        templateId,
        ...formData
      });

      setSuccess(true);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Submission failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate form data
   * @returns {object} Validation result with isValid and errors
   */
  const validateForm = () => {
    const errors = {};

    // Validate required base fields
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Name is required (at least 2 characters)';
    }

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Phone is usually optional, but validate format if provided
    if (formData.phone && !/^[\+]?[1-9][\d\s\-\(\)]{7,20}$/.test(formData.phone)) {
      errors.phone = 'Invalid phone number format';
    }

    // Validate required niche fields
    requiredFields.forEach(fieldName => {
      if (fieldName !== 'name' && fieldName !== 'email' && fieldName !== 'phone') {
        if (!formData[fieldName]) {
          errors[fieldName] = `${fieldName} is required`;
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  return {
    // State
    formData,
    nicheFields,
    requiredFields,
    loading,
    fetchingFields,
    error,
    success,
    
    // Actions
    updateField,
    updateFields,
    resetForm,
    submitRequest,
    validateForm
  };
}

export default useServiceRequestForm;

