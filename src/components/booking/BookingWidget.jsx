/**
 * Updated Booking Widget - Multi-Staff Support with Business Mode
 * Handles solo, team, and hybrid business modes flawlessly.
 * 
 * Features:
 * - Auto-detects business mode (solo vs. team)
 * - Shows "No Preference" option when enabled
 * - Respects service-specific staff assignments
 * - Intelligent load balancing for "Any Available"
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import StaffSelector from './StaffSelector';
import { post, get } from '../../utils/api';
import { shouldShowStaffSelection, resolveAutoAssignedStaffId } from '../../utils/bookingStaffFlow';
import './BookingWidget.css';

const BookingWidget = ({ userId: propUserId }) => {
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams();
  const userId = propUserId || paramUserId;

  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [currentStep, setCurrentStep] = useState('service'); // service, staff, date, details, payment, confirm
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdAppointment, setCreatedAppointment] = useState(null);
  const [searchParams] = useSearchParams();

  // Business mode state
  const [businessModeConfig, setBusinessModeConfig] = useState({
    businessMode: 'solo',
    showStaffSelection: false,
    allowNoPreference: true,
    noPreferenceText: 'Any Available',
    isSoloOperation: true
  });
  const [serviceStaff, setServiceStaff] = useState([]);
  const [resolvedStaff, setResolvedStaff] = useState(null);

  useEffect(() => {
    if (userId) {
      loadServices();
      loadBusinessModeConfig();
    }
  }, [userId]);

  // Handle return from Stripe Checkout
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const appointmentId = searchParams.get('appointment_id');
    const cancelled = searchParams.get('cancelled');

    if (cancelled === 'true') {
      setError('Payment was cancelled. Your appointment was not booked.');
      setCurrentStep('details');
      // Clean up URL
      navigate(window.location.pathname, { replace: true });
    } else if (sessionId && appointmentId) {
      // Payment successful - show confirmation
      setCreatedAppointment({ id: appointmentId, session_id: sessionId });
      setCurrentStep('confirm');
      // Clean up URL
      navigate(window.location.pathname, { replace: true });
    }
  }, [searchParams, navigate]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await get(`/api/booking/tenants/${userId}/services`);
      setServices(data.services || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load business mode configuration for the tenant
   * This determines whether staff selection is shown
   */
  const loadBusinessModeConfig = async () => {
    try {
      const data = await get(`/api/booking/tenants/${userId}/staff`);
      const staffList = data.staff || [];
      setStaff(staffList);
        
      // Infer business mode from staff count if config not available
      const isSolo = staffList.length <= 1;
      setBusinessModeConfig(prev => ({
        ...prev,
        isSoloOperation: isSolo,
        showStaffSelection: !isSolo,
        businessMode: isSolo ? 'solo' : 'team'
      }));

      if (isSolo && staffList[0]) {
        setSelectedStaff(staffList[0].id);
      }
    } catch (error) {
      console.error('Error loading business mode:', error);
    }
  };

  /**
   * Load staff available for a specific service
   * Uses the business-mode API for service-specific assignments
   */
  const loadServiceStaff = async (serviceId) => {
    try {
      const data = await get(`/api/business-mode/${userId}/services/${serviceId}/staff`);
      const serviceStaffList = data.staff || [];
      setServiceStaff(serviceStaffList);
      setBusinessModeConfig(prev => ({
        ...prev,
        showStaffSelection: data.showStaffSelection,
        allowNoPreference: data.allowNoPreference,
        noPreferenceText: data.noPreferenceText || 'Any Available',
        businessMode: data.businessMode,
        isSoloOperation: data.businessMode === 'solo' || serviceStaffList.length <= 1
      }));
      return data;
    } catch (error) {
      console.error('Error loading service staff:', error);
      return {
        staff: staff,
        showStaffSelection: staff.length > 1,
        businessMode: staff.length > 1 ? 'team' : 'solo',
        allowNoPreference: true
      };
    }
  };

  const handleServiceSelect = async (service) => {
    setSelectedService(service);

    const staffData = await loadServiceStaff(service.id);
    const qualifiedStaff = staffData?.staff || staff;
    const showPicker = shouldShowStaffSelection({
      effectiveMode: staffData?.businessMode || businessModeConfig.businessMode,
      isSoloOperation: staffData?.businessMode === 'solo' || businessModeConfig.isSoloOperation,
      showStaffSelection: staffData?.showStaffSelection,
      staffForService: qualifiedStaff,
    });

    if (showPicker) {
      setCurrentStep('staff');
    } else {
      setSelectedStaff(resolveAutoAssignedStaffId({
        isSoloOperation: staffData?.businessMode === 'solo' || businessModeConfig.isSoloOperation,
        effectiveMode: staffData?.businessMode || businessModeConfig.businessMode,
        staffForService: qualifiedStaff,
        allStaff: staff,
      }));
      setCurrentStep('date');
    }
  };

  const handleStaffSelect = (staffId) => {
    setSelectedStaff(staffId);
    setCurrentStep('date');
  };

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    
    if (selectedService && selectedStaff) {
      await loadAvailableSlots(date);
    }
  };

  const loadAvailableSlots = async (date) => {
    try {
      setLoading(true);
      const staffId = selectedStaff === 'no_preference' || selectedStaff === 'any'
        ? undefined
        : selectedStaff;
      const data = await get(`/api/booking/tenants/${userId}/availability`, {
        params: {
          service_id: selectedService.id,
          date,
          ...(staffId ? { staff_id: staffId } : {})
        }
      });
      
      setAvailableSlots(data.slots || []);
    } catch (err) {
      setError(err.message);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setCurrentStep('details');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      // Resolve staff if "no_preference" was selected
      let finalStaffId = selectedStaff;
      
      if (selectedStaff === 'no_preference' || selectedStaff === 'any' || !selectedStaff) {
        try {
          // Call the resolve-staff endpoint to get the best available staff
          const resolveResponse = await post(`/api/business-mode/${userId}/resolve-staff`, {
            serviceId: selectedService.id,
            staffId: selectedStaff,
            date: selectedDate,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          });
          
          finalStaffId = resolveResponse.staff.id;
          setResolvedStaff(resolveResponse.staff);
        } catch (resolveError) {
          console.error('Error resolving staff:', resolveError);
          // Fall back to first available staff
          if (staff.length > 0) {
            finalStaffId = staff[0].id;
          }
        }
      }

      // Create appointment
      // Prefer ISO start from slot; fall back to date + HH:mm
      const startDateTime = selectedTime.includes('T')
        ? selectedTime
        : `${selectedDate}T${selectedTime}:00`;
      
      const appointmentResponse = await post(`/api/booking/tenants/${userId}/appointments`, {
        service_id: selectedService.id,
        staff_id: finalStaffId,
        start_time: startDateTime,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        customer_notes: customerInfo.notes,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      const appointment = appointmentResponse.appointment;
      setCreatedAppointment(appointment);

      // Check if service requires payment
      if (selectedService.requires_payment && selectedService.payment_type !== 'none') {
        // Redirect to payment step
        setCurrentStep('payment');
        await initiatePayment(appointment);
      } else {
        // No payment required - go straight to confirmation
        setCurrentStep('confirm');
      }
    } catch (err) {
      console.error('Error creating appointment:', err);
      setError(err.message || 'Failed to create appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async (appointment) => {
    try {
      setLoading(true);
      setError('');

      // Determine payment type
      const paymentType = selectedService.payment_type === 'optional' ? 'full' : selectedService.payment_type;

      // Create checkout session
      const checkoutResponse = await post('/api/booking/checkout/create-session', {
        appointment_id: appointment.id,
        payment_type: paymentType
      });

      // Redirect to Stripe Checkout
      if (checkoutResponse.checkout_url) {
        window.location.href = checkoutResponse.checkout_url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (err) {
      console.error('Error initiating payment:', err);
      setError(err.message || 'Failed to initiate payment. Please try again.');
      setLoading(false);
      // Stay on payment step so user can retry
    }
  };

  // Render steps
  const renderServiceStep = () => (
    <div className="booking-step">
      <h3>Select Service</h3>
      <div className="services-grid">
        {services.map(service => (
          <button
            key={service.id}
            className="service-card"
            onClick={() => handleServiceSelect(service)}
          >
            <div className="service-name">{service.name}</div>
            <div className="service-duration">{service.duration_minutes} min</div>
            <div className="service-price">${(service.price / 100).toFixed(2)}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStaffStep = () => (
    <div className="booking-step" data-testid="staff-selection-step">
      <button className="back-button" onClick={() => setCurrentStep('service')}>
        ← Back
      </button>
      
      <h3>Choose Your Provider</h3>
      
      {/* "No Preference" option when enabled */}
      {businessModeConfig.allowNoPreference && (
        <div className="no-preference-option">
          <button
            className={`staff-card no-preference ${selectedStaff === 'no_preference' ? 'selected' : ''}`}
            onClick={() => handleStaffSelect('no_preference')}
            data-testid="no-preference-option"
          >
            <div className="no-preference-icon">🎲</div>
            <div className="staff-info">
              <div className="staff-name">{businessModeConfig.noPreferenceText}</div>
              <div className="staff-description">
                We'll assign the best available provider for your time slot
              </div>
            </div>
            {selectedStaff === 'no_preference' && <div className="staff-checkmark">✓</div>}
          </button>
        </div>
      )}
      
      {/* Divider */}
      {businessModeConfig.allowNoPreference && serviceStaff.length > 0 && (
        <div className="staff-divider">
          <span>or choose a specific provider</span>
        </div>
      )}
      
      {/* Staff Selection */}
      <StaffSelector 
        tenantId={userId}
        serviceId={selectedService?.id}
        selectedStaffId={selectedStaff}
        onStaffSelected={handleStaffSelect}
        staff={serviceStaff.length > 0 ? serviceStaff : staff}
        showHeader={false}
      />
    </div>
  );

  const renderDateTimeStep = () => (
    <div className="booking-step">
      <button className="back-button" onClick={() => setCurrentStep(businessModeConfig.showStaffSelection ? 'staff' : 'service')}>
        ← Back
      </button>
      <h3>Select Date & Time</h3>
      
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => handleDateSelect(e.target.value)}
        min={new Date().toISOString().split('T')[0]}
      />

      {selectedDate && availableSlots.length > 0 && (
        <div className="time-slots">
          {availableSlots.map(slot => {
            const slotValue = slot.start_time || slot.start || slot.time;
            const slotLabel = slot.label || slot.time || slotValue;
            return (
            <button
              key={slotValue}
              className={`time-slot ${selectedTime === slotValue ? 'selected' : ''}`}
              onClick={() => handleTimeSelect(slotValue)}
            >
              {slotLabel}
            </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderDetailsStep = () => {
    const requiresPayment = selectedService?.requires_payment && selectedService?.payment_type !== 'none';
    const paymentInfo = requiresPayment ? (
      <div className="payment-notice">
        <p><strong>Payment Required:</strong></p>
        <p>
          {selectedService.payment_type === 'deposit' 
            ? `A ${selectedService.deposit_percentage || 50}% deposit is required to secure your booking.`
            : 'Full payment is required to complete your booking.'}
        </p>
        <p className="payment-amount">
          Amount: ${selectedService.payment_type === 'deposit' 
            ? ((selectedService.price_cents * (selectedService.deposit_percentage || 50) / 100) / 100).toFixed(2)
            : (selectedService.price_cents / 100).toFixed(2)}
        </p>
      </div>
    ) : null;

    return (
      <div className="booking-step">
        <button className="back-button" onClick={() => setCurrentStep('date')}>
          ← Back
        </button>
        <h3>Your Information</h3>
        
        {paymentInfo}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              value={customerInfo.name}
              onChange={handleInputChange}
              required
              data-testid="booking-customer-name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={customerInfo.email}
              onChange={handleInputChange}
              required
              data-testid="booking-customer-email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone *</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={customerInfo.phone}
              onChange={handleInputChange}
              required
              data-testid="booking-customer-phone"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={customerInfo.notes}
              onChange={handleInputChange}
              rows="3"
              data-testid="booking-customer-notes"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            data-testid="booking-submit-button"
          >
            {loading ? 'Processing...' : requiresPayment ? 'Continue to Payment' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    );
  };

  const renderPaymentStep = () => (
    <div className="booking-step">
      <div className="payment-loading">
        <h3>Redirecting to Payment...</h3>
        <p>Please wait while we redirect you to secure payment.</p>
        <div className="spinner"></div>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="booking-step confirmation-step">
      <div className="confirmation-content">
        <div className="confirmation-icon">✓</div>
        <h2>Booking Confirmed!</h2>
        
        {createdAppointment && (
          <div className="confirmation-details">
            <p><strong>Confirmation Code:</strong> {createdAppointment.confirmation_code}</p>
            <p><strong>Service:</strong> {selectedService?.name}</p>
            <p><strong>Date & Time:</strong> {selectedDate} at {selectedTime}</p>
            <p><strong>Customer:</strong> {customerInfo.name}</p>
            
            {selectedService?.requires_payment && (
              <p className="payment-confirmed">
                ✓ Payment processed successfully
              </p>
            )}
          </div>
        )}

        <p className="confirmation-message">
          A confirmation email has been sent to <strong>{customerInfo.email}</strong>
        </p>

        <button 
          className="btn btn-primary" 
          onClick={() => {
            setCurrentStep('service');
            setCreatedAppointment(null);
            setSelectedService(null);
            setSelectedStaff(null);
            setSelectedDate('');
            setSelectedTime('');
            setCustomerInfo({ name: '', email: '', phone: '', notes: '' });
          }}
        >
          Book Another Appointment
        </button>
      </div>
    </div>
  );

  if (loading && services.length === 0) {
    return <div className="booking-widget loading">Loading booking widget...</div>;
  }

  return (
    <div className="booking-widget">
      {error && <div className="booking-error">{error}</div>}

      {currentStep === 'service' && renderServiceStep()}
      {currentStep === 'staff' && renderStaffStep()}
      {currentStep === 'date' && renderDateTimeStep()}
      {currentStep === 'details' && renderDetailsStep()}
      {currentStep === 'payment' && renderPaymentStep()}
      {currentStep === 'confirm' && renderConfirmationStep()}
    </div>
  );
};

export default BookingWidget;
