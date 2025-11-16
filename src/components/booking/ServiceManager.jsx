import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { get, post, put, delete as deleteAPI } from '../../utils/api';
import './ServiceManager.css';

const ServiceManager = ({ userId, onRefresh }) => {
  const { showSuccess, showError } = useToast();
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingService, setDeletingService] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: '',
    price_cents: '',
    category: 'other',
    online_booking_enabled: true,
    requires_approval: false,
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (userId) {
      fetchServices();
    }
  }, [userId]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await get(`/api/booking/tenants/${userId}/services`);
      setServices(response.services || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Failed to load services');
      showError('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Service name is required';
    }
    
    if (!formData.duration_minutes || formData.duration_minutes <= 0) {
      errors.duration_minutes = 'Duration must be greater than 0';
    }
    
    if (!formData.price_cents || formData.price_cents < 0) {
      errors.price_cents = 'Price must be 0 or greater';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      duration_minutes: '',
      price_cents: '',
      category: 'other',
      online_booking_enabled: true,
      requires_approval: false,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEditModal = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price_cents: (service.price_cents / 100).toFixed(2), // Convert to dollars for display
      category: service.category || 'other',
      online_booking_enabled: service.online_booking_enabled,
      requires_approval: service.requires_approval || false,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingService(null);
    setFormErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Convert price from dollars to cents
      const priceInCents = Math.round(parseFloat(formData.price_cents) * 100);
      
      const serviceData = {
        name: formData.name,
        description: formData.description,
        duration_minutes: parseInt(formData.duration_minutes),
        price_cents: priceInCents,
        category: formData.category,
        online_booking_enabled: formData.online_booking_enabled,
        requires_approval: formData.requires_approval,
      };

      if (editingService) {
        // Update existing service
        await put(`/api/booking/admin/${userId}/services/${editingService.id}`, serviceData);
        showSuccess('Service updated successfully');
      } else {
        // Create new service
        await post(`/api/booking/admin/${userId}/services`, serviceData);
        showSuccess('Service created successfully');
      }

      handleCloseModal();
      await fetchServices();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error saving service:', err);
      const errorMsg = editingService ? 'Failed to update service' : 'Failed to create service';
      showError(errorMsg);
    }
  };

  const handleOpenDeleteConfirm = (service) => {
    setDeletingService(service);
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingService(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingService) return;

    try {
      await deleteAPI(`/api/booking/admin/${userId}/services/${deletingService.id}`);
      showSuccess('Service deleted successfully');
      setShowDeleteConfirm(false);
      setDeletingService(null);
      await fetchServices();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error deleting service:', err);
      showError('Failed to delete service');
    }
  };

  // Filter services by search term
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="service-manager" data-testid="service-manager">
      <div className="service-manager-header">
        <h2>Services</h2>
        <div className="service-manager-actions">
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="service-search"
          />
          <button
            className="add-service-btn"
            onClick={handleOpenAddModal}
          >
            ➕ Add Service
          </button>
        </div>
      </div>

      {loading && <div className="loading">Loading services...</div>}
      
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && filteredServices.length === 0 && searchTerm === '' && (
        <div className="empty-state">
          <p>No services yet. Create your first service to get started!</p>
          <button className="add-service-btn" onClick={handleOpenAddModal}>
            ➕ Add Service
          </button>
        </div>
      )}

      {!loading && !error && filteredServices.length === 0 && searchTerm !== '' && (
        <div className="empty-state">
          <p>No services match your search.</p>
        </div>
      )}

      {!loading && !error && filteredServices.length > 0 && (
        <div className="services-grid">
          {filteredServices.map(service => (
            <div key={service.id} className="service-card">
              <div className="service-card-header">
                <h3>{service.name}</h3>
                <span className={`status-badge ${service.online_booking_enabled ? 'active' : 'inactive'}`}>
                  {service.online_booking_enabled ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {service.description && (
                <p className="service-description">{service.description}</p>
              )}
              
              <div className="service-details">
                <div className="service-detail">
                  <span className="detail-label">Duration:</span>
                  <span className="detail-value">{service.duration_minutes} min</span>
                </div>
                <div className="service-detail">
                  <span className="detail-label">Price:</span>
                  <span className="detail-value">{service.price_display || `$${(service.price_cents / 100).toFixed(2)}`}</span>
                </div>
                {service.category && (
                  <div className="service-detail">
                    <span className="detail-label">Category:</span>
                    <span className="detail-value">{service.category}</span>
                  </div>
                )}
              </div>

              <div className="service-actions">
                <button
                  className="edit-btn"
                  onClick={() => handleOpenEditModal(service)}
                  aria-label="Edit"
                >
                  ✏️ Edit
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleOpenDeleteConfirm(service)}
                  aria-label="Delete"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>{editingService ? 'Edit Service' : 'Add Service'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Service Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Haircut, Massage, Consultation"
                />
                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of the service"
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="duration_minutes">Duration (minutes) *</label>
                  <input
                    type="number"
                    id="duration_minutes"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleChange}
                    placeholder="30"
                    min="1"
                  />
                  {formErrors.duration_minutes && <span className="error-text">{formErrors.duration_minutes}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="price_cents">Price ($) *</label>
                  <input
                    type="number"
                    id="price_cents"
                    name="price_cents"
                    value={formData.price_cents}
                    onChange={handleChange}
                    placeholder="30.00"
                    step="0.01"
                    min="0"
                  />
                  {formErrors.price_cents && <span className="error-text">{formErrors.price_cents}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="hair">Hair</option>
                  <option value="beauty">Beauty</option>
                  <option value="wellness">Wellness</option>
                  <option value="fitness">Fitness</option>
                  <option value="consultation">Consultation</option>
                  <option value="repair">Repair</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="online_booking_enabled"
                    checked={formData.online_booking_enabled}
                    onChange={handleChange}
                  />
                  <span>Enable online booking</span>
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="requires_approval"
                    checked={formData.requires_approval}
                    onChange={handleChange}
                  />
                  <span>Requires approval</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div 
            className="modal-content small-modal" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="close-btn" onClick={handleCancelDelete}>×</button>
            </div>

            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{deletingService?.name}</strong>?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={handleCancelDelete}>
                Cancel
              </button>
              <button className="delete-confirm-btn" onClick={handleConfirmDelete}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManager;

