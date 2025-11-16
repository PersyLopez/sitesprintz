import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { get, post } from '../utils/api';
import './BookingWidget.css';

const BookingWidget = () => {
  const { userId } = useParams();
  const [step, setStep] = useState('services'); // services, date, time, form, confirmation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Services data
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  
  // Selected data
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  
  // Time slots
  const [timeSlots, setTimeSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  
  // Customer data
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [formErrors, setFormErrors] = useState({});
  
  // Booking result
  const [appointment, setAppointment] = useState(null);

  // Fetch services on mount
  useEffect(() => {
    fetchServices();
  }, [userId]);

  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      setError(null);
      const response = await get(`/api/booking/tenants/${userId}/services`);
      setServices(response.services || []);
    } catch (err) {
      setError('Failed to load services. Please try again.');
      console.error('Error fetching services:', err);
    } finally {
      setServicesLoading(false);
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
  };

  const handleNextFromServices = () => {
    if (selectedService) {
      setStep('date');
    }
  };

  const handleBackToServices = () => {
    setStep('services');
    setSelectedDate(null);
    setSelectedTime(null);
    setTimeSlots([]);
  };

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    await fetchTimeSlots(date);
  };

  const fetchTimeSlots = async (date) => {
    try {
      setSlotsLoading(true);
      const response = await get(`/api/booking/tenants/${userId}/availability`, {
        params: {
          service_id: selectedService.id,
          date: date,
        },
      });
      setTimeSlots(response.slots || []);
    } catch (err) {
      console.error('Error fetching time slots:', err);
      setTimeSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
  };

  const handleNextFromTime = () => {
    if (selectedTime) {
      setStep('form');
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!customerName.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!customerEmail.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBooking = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const bookingData = {
        service_id: selectedService.id,
        date: selectedDate,
        time: selectedTime,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        notes: customerNotes,
      };

      const response = await post(
        `/api/booking/tenants/${userId}/appointments`,
        bookingData
      );

      setAppointment(response.appointment);
      setStep('confirmation');
    } catch (err) {
      setError(err.message || 'Failed to create booking. Please try again.');
      console.error('Error creating appointment:', err);
    } finally {
      setLoading(false);
    }
  };

  // Render loading state
  if (servicesLoading) {
    return (
      <div className="booking-widget">
        <div data-testid="services-loading">Loading services...</div>
      </div>
    );
  }

  // Render error state
  if (error && step === 'services') {
    return (
      <div className="booking-widget">
        <div data-testid="error-message" className="error">
          {error}
        </div>
        <button onClick={fetchServices}>Try Again</button>
      </div>
    );
  }

  // Render empty state
  if (services.length === 0 && step === 'services') {
    return (
      <div className="booking-widget">
        <div data-testid="services-empty">
          No services available at this time.
        </div>
      </div>
    );
  }

  // Step 1: Service Selection
  if (step === 'services') {
    return (
      <div className="booking-widget">
        <h2>Select a Service</h2>
        
        <div data-testid="services-list" className="services-list">
          {services.map((service) => (
            <div
              key={service.id}
              data-testid={`service-card-${service.id}`}
              className={`service-card ${selectedService?.id === service.id ? 'selected' : ''}`}
              onClick={() => handleServiceSelect(service)}
            >
              <h3>{service.name}</h3>
              {service.description && <p>{service.description}</p>}
              <div className="service-details">
                <span className="duration">{service.duration_minutes} min</span>
                <span className="price">
                  ${(service.price_cents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {selectedService && (
          <div className="actions">
            <button
              data-testid="next-button"
              onClick={handleNextFromServices}
              className="btn-primary"
            >
              Next
            </button>
          </div>
        )}

        {selectedService && (
          <div data-testid="booking-summary" className="booking-summary">
            <h3>Booking Summary</h3>
            <p><strong>Service:</strong> {selectedService.name}</p>
            <p><strong>Price:</strong> ${(selectedService.price_cents / 100).toFixed(2)}</p>
          </div>
        )}
      </div>
    );
  }

  // Step 2: Date Selection
  if (step === 'date') {
    return (
      <div className="booking-widget">
        <h2>Select a Date</h2>
        
        <button
          data-testid="back-button"
          onClick={handleBackToServices}
          className="btn-secondary"
        >
          ← Back
        </button>

        <div data-testid="date-picker" className="date-picker">
          <p>Select a date for your appointment</p>
          <DatePicker
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>

        {selectedDate && timeSlots.length > 0 && (
          <div data-testid="time-slots" className="time-slots">
            <h3>Available Times</h3>
            {timeSlots.map((slot) => (
              <button
                key={slot.time}
                data-testid={`time-slot-${slot.time}`}
                className={`time-slot ${selectedTime === slot.time ? 'selected' : ''}`}
                onClick={() => handleTimeSelect(slot.time)}
                disabled={!slot.available}
              >
                {slot.time}
              </button>
            ))}

            {selectedTime && (
              <button
                data-testid="next-button"
                onClick={handleNextFromTime}
                className="btn-primary"
              >
                Next
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Step 3: Customer Information
  if (step === 'form') {
    return (
      <div className="booking-widget">
        <h2>Your Information</h2>

        <div data-testid="customer-form" className="customer-form">
          <div className="form-group">
            <label htmlFor="customer-name">Name *</label>
            <input
              id="customer-name"
              data-testid="customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={formErrors.name ? 'error' : ''}
            />
            {formErrors.name && (
              <span data-testid="name-error" className="error-text">
                {formErrors.name}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="customer-email">Email *</label>
            <input
              id="customer-email"
              data-testid="customer-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className={formErrors.email ? 'error' : ''}
            />
            {formErrors.email && (
              <span data-testid="email-error" className="error-text">
                {formErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="customer-phone">Phone</label>
            <input
              id="customer-phone"
              data-testid="customer-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="customer-notes">Additional Notes</label>
            <textarea
              id="customer-notes"
              data-testid="customer-notes"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <div data-testid="error-message" className="error">
              {error}
            </div>
          )}

          {loading && (
            <div data-testid="booking-loading">Processing your booking...</div>
          )}

          <button
            data-testid="book-now-button"
            onClick={handleBooking}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Booking...' : 'Book Now'}
          </button>
        </div>
      </div>
    );
  }

  // Step 4: Confirmation
  if (step === 'confirmation') {
    return (
      <div className="booking-widget">
        <div data-testid="confirmation-page" className="confirmation">
          <h2>✅ Booking Confirmed!</h2>
          
          <div data-testid="confirmation-message" className="success-message">
            <p>Your appointment has been successfully booked.</p>
          </div>

          <div className="confirmation-details">
            <p><strong>Confirmation Code:</strong></p>
            <p data-testid="confirmation-code" className="confirmation-code">
              {appointment?.confirmation_code}
            </p>
            
            <p><strong>Service:</strong> {appointment?.service_name || selectedService?.name}</p>
            <p><strong>Date:</strong> {selectedDate}</p>
            <p><strong>Time:</strong> {selectedTime}</p>
          </div>

          <p className="email-notice">
            A confirmation email has been sent to {customerEmail}
          </p>
        </div>
      </div>
    );
  }

  return null;
};

// DatePicker component
const DatePicker = ({ selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthYear = currentMonth.toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  });

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(year, month, i);
      days.push(day);
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div data-testid="calendar" className="calendar">
      <div className="calendar-header">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
          ←
        </button>
        <h3>{monthYear}</h3>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
          →
        </button>
      </div>

      <div className="calendar-grid">
        {days.map((day) => {
          const dateString = day.toISOString().split('T')[0];
          const isPast = day < today;
          const isSelected = selectedDate === dateString;

          return (
            <button
              key={dateString}
              data-testid={`date-${dateString}`}
              onClick={() => !isPast && onDateSelect(dateString)}
              disabled={isPast}
              className={`calendar-day ${isPast ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BookingWidget;

