import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { get, post, put, del as deleteAPI } from '../../utils/api';
import './ServiceManager.css';

const ServiceManager = ({ userId, siteId = null, onRefresh }) => {
  const { showSuccess, showError } = useToast();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false); // data-testid added to modal overlay later
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
    // Payment fields (Phase 2)
    requires_payment: false,
    payment_type: 'none',
    deposit_percentage: 50,
  });
  const [formErrors, setFormErrors] = useState({});
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchServices();
    }
  }, [userId, siteId]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await get(`/api/booking/tenants/${userId}/services`, {
        params: siteId ? { siteId } : undefined,
      });
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
    console.log('Validating form:', formData);
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
    console.log('Validation errors:', errors);
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
      // Payment fields (Phase 2)
      requires_payment: false,
      payment_type: 'none',
      deposit_percentage: 50,
    });
    setFormErrors({});
    setShowModal(true);
    // data-testid for add service button handled in JSX
  };

  const handleOpenEditModal = async (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price_cents: (service.price_cents / 100).toFixed(2), // Convert to dollars for display
      category: service.category || 'other',
      online_booking_enabled: service.online_booking_enabled,
      requires_approval: service.requires_approval || false,
      // Payment fields (Phase 2)
      requires_payment: service.requires_payment || false,
      payment_type: service.payment_type || 'none',
      deposit_percentage: service.deposit_percentage || 50,
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

      let serviceId;
      if (editingService) {
        // Update existing service
        console.log('Updating service:', editingService.id, serviceData);
        const response = await put(`/api/booking/admin/${userId}/services/${editingService.id}`, serviceData);
        serviceId = editingService.id;
        console.log('Service updated successfully');
        showSuccess('Service updated successfully');
      } else {
        // Create new service
        console.log('Creating new service:', serviceData);
        const response = await post(`/api/booking/admin/${userId}/services`, serviceData);
        serviceId = response.service?.id;
        console.log('Service created successfully');
        showSuccess('Service created successfully');
      }

      // Save payment configuration (Phase 2)
      if (serviceId && (formData.requires_payment || editingService?.requires_payment)) {
        try {
          setSavingPayment(true);
          await put(`/api/booking/admin/${userId}/services/${serviceId}/payment`, {
            requires_payment: formData.requires_payment,
            payment_type: formData.requires_payment ? formData.payment_type : 'none',
            deposit_percentage: formData.requires_payment && formData.payment_type === 'deposit' 
              ? formData.deposit_percentage 
              : 50
          });
        } catch (err) {
          console.error('Error saving payment config:', err);
          showError('Service saved but payment configuration failed');
        } finally {
          setSavingPayment(false);
        }
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
            data-testid="service-search"
          />
          <button
            className="add-service-btn"
            data-testid="add-service-btn"
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
            <div key={service.id} className="service-card" data-testid={`service-card-${service.id}`}>
              <div className="service-card-header">
                <h3>{service.name}</h3>
                <span
                  className={`status-badge ${service.online_booking_enabled ? 'active' : 'inactive'}`}
                  data-testid={`service-status-badge-${service.id}`}
                >
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
                {service.requires_payment && (
                  <div className="service-detail">
                    <span className="detail-label">Payment:</span>
                    <span className="detail-value payment-badge">
                      {service.payment_type === 'deposit' 
                        ? `Deposit (${service.deposit_percentage || 50}%)`
                        : service.payment_type === 'full'
                        ? 'Full Payment'
                        : 'Optional'}
                    </span>
                  </div>
                )}
              </div>

              <div className="service-actions">
                <button
                  className="edit-btn"
                  data-testid="edit-btn"
                  onClick={() => handleOpenEditModal(service)}
                  aria-label="Edit"
                >
                  ✏️ Edit
                </button>
                <button
                  className="delete-btn"
                  data-testid="delete-btn"
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
        <div className="modal-overlay" data-testid="service-modal" onClick={handleCloseModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>{editingService ? 'Edit Service' : 'Add Service'}</h3>
              <button className="close-btn" onClick={handleCloseModal} data-testid="close-modal-btn">×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Service Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  data-testid="service-name"
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
                  data-testid="service-description"
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
                    data-testid="service-duration"
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
                    data-testid="service-price"
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

              {/* Payment Settings Section (Phase 2) */}
              <div className="form-section-divider"></div>
              <h4 className="form-section-title">Payment Settings</h4>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="requires_payment"
                    checked={formData.requires_payment}
                    onChange={handleChange}
                    data-testid="requires-payment-checkbox"
                  />
                  <span>Require payment at booking</span>
                </label>
                <p className="form-help-text">
                  Customers will be required to pay when booking this service
                </p>
              </div>

              {formData.requires_payment && (
                <>
                  <div className="form-group">
                    <label htmlFor="payment_type">Payment Type *</label>
                    <select
                      id="payment_type"
                      name="payment_type"
                      value={formData.payment_type}
                      onChange={handleChange}
                      data-testid="payment-type-select"
                    >
                      <option value="deposit">Deposit (partial payment)</option>
                      <option value="full">Full payment</option>
                      <option value="optional">Optional (customer chooses)</option>
                    </select>
                    <p className="form-help-text">
                      {formData.payment_type === 'deposit' && 'Customer pays a percentage upfront'}
                      {formData.payment_type === 'full' && 'Customer pays the full amount'}
                      {formData.payment_type === 'optional' && 'Customer can choose to pay or pay later'}
                    </p>
                  </div>

                  {formData.payment_type === 'deposit' && (
                    <div className="form-group">
                      <label htmlFor="deposit_percentage">
                        Deposit Percentage: {formData.deposit_percentage}%
                      </label>
                      <input
                        type="range"
                        id="deposit_percentage"
                        name="deposit_percentage"
                        min="10"
                        max="100"
                        step="5"
                        value={formData.deposit_percentage}
                        onChange={handleChange}
                        data-testid="deposit-percentage-slider"
                      />
                      <div className="deposit-preview">
                        <p>
                          <strong>Service Price:</strong> ${formData.price_cents || '0.00'}
                        </p>
                        <p>
                          <strong>Deposit Amount:</strong>{' '}
                          <span className="deposit-amount">
                            ${formData.price_cents 
                              ? ((parseFloat(formData.price_cents) * formData.deposit_percentage / 100).toFixed(2))
                              : '0.00'}
                          </span>
                        </p>
                        <p className="deposit-remaining">
                          Remaining Balance: ${formData.price_cents 
                            ? ((parseFloat(formData.price_cents) * (100 - formData.deposit_percentage) / 100).toFixed(2))
                            : '0.00'}
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.payment_type === 'full' && formData.price_cents && (
                    <div className="payment-preview">
                      <p>
                        <strong>Full Payment Amount:</strong>{' '}
                        <span className="payment-amount">${formData.price_cents}</span>
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="save-btn" 
                  data-testid="save-service-button" 
                  disabled={savingPayment}
                >
                  {savingPayment ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" data-testid="delete-confirm-modal" onClick={handleCancelDelete}>
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

