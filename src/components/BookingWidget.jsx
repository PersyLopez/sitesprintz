import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { get, post } from '../utils/api';
import {
  shouldShowStaffSelection,
  resolveAutoAssignedStaffId,
} from '../utils/bookingStaffFlow';
import './BookingWidget.css';

const NO_PREFERENCE = 'no_preference';

function bookingSteps(showStaff) {
  return [
    { id: 'services', label: 'Service' },
    ...(showStaff ? [{ id: 'staff', label: 'Provider' }] : []),
    { id: 'date', label: 'Date & time' },
    { id: 'form', label: 'Your details' },
  ];
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatAppointmentWhen(iso, dateFallback) {
  const parsed = iso ? new Date(iso) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return dateFallback || iso || '';
}

function stepStatus(step, id, showStaff) {
  const order = showStaff
    ? ['services', 'staff', 'date', 'form', 'confirmation']
    : ['services', 'date', 'form', 'confirmation'];
  const current = order.indexOf(step);
  const index = order.indexOf(id);
  if (index < current) return 'is-done';
  if (index === current) return 'is-current';
  return '';
}

function BookingShell({ step, showStaff = false, children }) {
  const showProgress = step !== 'confirmation';
  const steps = bookingSteps(showStaff);
  return (
    <div className="booking-widget" data-testid="booking-widget">
      {showProgress && (
        <ol className="booking-progress" aria-label="Booking steps">
          {steps.map((item) => (
            <li key={item.id} className={stepStatus(step, item.id, showStaff)}>
              {item.label}
            </li>
          ))}
        </ol>
      )}
      {children}
    </div>
  );
}

const BookingWidget = ({
  userId: propUserId,
  siteId = null,
  demoMode = false,
  businessMode = 'solo',
  noPreferenceText = 'Any available',
}) => {
  const { userId: paramUserId } = useParams();
  const userId = propUserId || paramUserId;
  const [step, setStep] = useState('services'); // services, date, time, form, confirmation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const [selectedService, setSelectedService] = useState(null);
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const [timeSlots, setTimeSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const slotsRequestRef = useRef(0);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const [appointment, setAppointment] = useState(null);

  const siteQuery = siteId ? { siteId } : undefined;

  const showStaff = useMemo(() => shouldShowStaffSelection({
    effectiveMode: businessMode,
    isSoloOperation: businessMode === 'solo' || staff.length <= 1,
    showStaffSelection: businessMode === 'team',
    staffForService: staff,
  }), [businessMode, staff]);

  const selectedStaffRecord = staff.find((member) => member.id === selectedStaff);
  const selectedStaffLabel = selectedStaff === NO_PREFERENCE
    ? noPreferenceText
    : selectedStaffRecord?.name;

  useEffect(() => {
    fetchServices();
    fetchStaff();
  }, [userId, siteId]);

  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      setError(null);
      const response = await get(`/api/booking/tenants/${userId}/services`, {
        params: siteQuery,
      });
      setServices(response.services || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Failed to load services. Please try again.');
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      setStaffLoading(true);
      const response = await get(`/api/booking/tenants/${userId}/staff`, {
        params: siteQuery,
      });
      setStaff(response.staff || []);
    } catch {
      setStaff([]);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
  };

  const handleNextFromServices = () => {
    if (!selectedService) return;
    if (showStaff) {
      setStep('staff');
      return;
    }
    setSelectedStaff(resolveAutoAssignedStaffId({
      isSoloOperation: businessMode === 'solo' || staff.length <= 1,
      effectiveMode: businessMode,
      staffForService: staff,
      allStaff: staff,
    }));
    setStep('date');
  };

  const handleStaffSelect = (staffId) => {
    setSelectedStaff(staffId);
  };

  const handleNextFromStaff = () => {
    if (selectedStaff) {
      setStep('date');
    }
  };

  const handleBackToServices = () => {
    setStep('services');
    setSelectedDate(null);
    setSelectedTime(null);
    setTimeSlots([]);
  };

  const handleBackFromDate = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setTimeSlots([]);
    setStep(showStaff ? 'staff' : 'services');
  };

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setTimeSlots([]);
    await fetchTimeSlots(date);
  };

  const fetchTimeSlots = async (date) => {
    const requestId = slotsRequestRef.current + 1;
    slotsRequestRef.current = requestId;
    try {
      setSlotsLoading(true);
      const response = await get(`/api/booking/tenants/${userId}/availability`, {
        params: {
          service_id: selectedService.id,
          date,
          ...(siteId ? { siteId } : {}),
          ...(selectedStaff && selectedStaff !== NO_PREFERENCE ? { staff_id: selectedStaff } : {}),
        },
      });
      if (requestId !== slotsRequestRef.current) return;
      setTimeSlots(response.slots || []);
    } catch (err) {
      console.error('Error fetching time slots:', err);
      if (requestId !== slotsRequestRef.current) return;
      setTimeSlots([]);
    } finally {
      if (requestId === slotsRequestRef.current) {
        setSlotsLoading(false);
      }
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
        start_time: selectedTime,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        notes: customerNotes,
        ...(siteId ? { siteId } : {}),
        ...(selectedStaff && selectedStaff !== NO_PREFERENCE ? { staff_id: selectedStaff } : {}),
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

  if (servicesLoading) {
    return (
      <div className="booking-widget">
        <div data-testid="services-loading">Loading services...</div>
      </div>
    );
  }

  if (error && step === 'services') {
    return (
      <div className="booking-widget">
        <div data-testid="error-message" className="error">
          {error}
        </div>
        <button type="button" onClick={fetchServices}>Try Again</button>
      </div>
    );
  }

  if (services.length === 0 && step === 'services') {
    return (
      <div className="booking-widget">
        <div data-testid="services-empty">
          No services available at this time.
        </div>
      </div>
    );
  }

  if (step === 'services') {
    return (
      <BookingShell step={step} showStaff={showStaff}>
        <h2>Select a service</h2>

        <div data-testid="services-list" className="services-list">
          {services.map((service) => (
            <div
              key={service.id}
              data-testid={`service-card-${service.id}`}
              className={`service-card ${selectedService?.id === service.id ? 'selected' : ''}`}
              onClick={() => handleServiceSelect(service)}
              tabIndex="0"
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleServiceSelect(service);
                }
              }}
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
              type="button"
              data-testid="next-button"
              onClick={handleNextFromServices}
              className="btn-primary"
              disabled={businessMode === 'team' && staffLoading}
            >
              Continue
            </button>
          </div>
        )}

        {selectedService && (
          <div data-testid="booking-summary" className="booking-summary">
            <h3>Booking summary</h3>
            <p><strong>Service:</strong> {selectedService.name}</p>
            {selectedStaffLabel && (
              <p><strong>Provider:</strong> {selectedStaffLabel}</p>
            )}
            <p><strong>Price:</strong> ${(selectedService.price_cents / 100).toFixed(2)}</p>
          </div>
        )}
      </BookingShell>
    );
  }

  if (step === 'staff') {
    return (
      <BookingShell step={step} showStaff={showStaff}>
        <h2>Choose a provider</h2>

        <button
          type="button"
          data-testid="back-button"
          onClick={handleBackToServices}
          className="btn-secondary"
        >
          ← Back
        </button>

        <div data-testid="staff-selection-step" className="staff-list">
          <div
            data-testid="staff-card-no-preference"
            className={`service-card ${selectedStaff === NO_PREFERENCE ? 'selected' : ''}`}
            onClick={() => handleStaffSelect(NO_PREFERENCE)}
            tabIndex="0"
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStaffSelect(NO_PREFERENCE);
              }
            }}
          >
            <h3>{noPreferenceText}</h3>
            <p>We’ll match you with the next available provider.</p>
          </div>

          {staff.map((member) => (
            <div
              key={member.id}
              data-testid={`staff-card-${member.id}`}
              className={`service-card ${selectedStaff === member.id ? 'selected' : ''}`}
              onClick={() => handleStaffSelect(member.id)}
              tabIndex="0"
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStaffSelect(member.id);
                }
              }}
            >
              <h3>{member.name}</h3>
              {member.title && <p>{member.title}</p>}
            </div>
          ))}
        </div>

        {selectedStaff && (
          <div className="actions">
            <button
              type="button"
              data-testid="next-button"
              onClick={handleNextFromStaff}
              className="btn-primary"
            >
              Continue
            </button>
          </div>
        )}
      </BookingShell>
    );
  }

  if (step === 'date') {
    const visibleSlots = timeSlots.filter((slot) => slot.available !== false);

    return (
      <BookingShell step={step} showStaff={showStaff}>
        <h2>Select a date and time</h2>

        <button
          type="button"
          data-testid="back-button"
          onClick={handleBackFromDate}
          className="btn-secondary"
        >
          ← Back
        </button>

        <div data-testid="date-picker" className="date-picker">
          <p>Choose a day, then pick an open time.</p>
          <DatePicker
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>

        {selectedDate && slotsLoading && (
          <p className="booking-slots-status" data-testid="slots-loading">Finding available times…</p>
        )}

        {selectedDate && !slotsLoading && visibleSlots.length === 0 && (
          <p className="booking-slots-status" data-testid="slots-empty">
            No times available this day. Try another date.
          </p>
        )}

        {selectedDate && !slotsLoading && visibleSlots.length > 0 && (
          <div data-testid="time-slots" className="time-slots">
            <h3>Available times</h3>
            <div className="time-slot-grid">
              {visibleSlots.map((slot) => (
                <button
                  type="button"
                  key={slot.start_time}
                  data-testid={`time-slot-${slot.start_time}`}
                  className={`time-slot ${selectedTime === slot.start_time ? 'selected' : ''}`}
                  onClick={() => handleTimeSelect(slot.start_time)}
                >
                  {slot.display_time}
                </button>
              ))}
            </div>

            {selectedTime && (
              <button
                type="button"
                data-testid="next-button"
                onClick={handleNextFromTime}
                className="btn-primary"
              >
                Continue
              </button>
            )}
          </div>
        )}
      </BookingShell>
    );
  }

  if (step === 'form') {
    return (
      <BookingShell step={step} showStaff={showStaff}>
        <h2>Your information</h2>

        <button
          type="button"
          data-testid="back-button"
          onClick={() => setStep('date')}
          className="btn-secondary"
        >
          ← Back
        </button>

        <div data-testid="customer-form" className="customer-form">
          <div className="form-group">
            <label htmlFor="customer-name">Name *</label>
            <input
              id="customer-name"
              data-testid="customer-name"
              type="text"
              autoComplete="name"
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
              autoComplete="email"
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
              autoComplete="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="customer-notes">Additional notes</label>
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
            type="button"
            data-testid="book-now-button"
            onClick={handleBooking}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Booking...' : 'Confirm booking'}
          </button>
        </div>
      </BookingShell>
    );
  }

  if (step === 'confirmation') {
    const isDemo = demoMode || appointment?.demo === true;
    return (
      <BookingShell step={step} showStaff={showStaff}>
        <div data-testid="confirmation-page" className="confirmation">
          <h2>{isDemo ? 'Demo booking confirmed' : 'Booking confirmed'}</h2>

          <div data-testid="confirmation-message" className="success-message">
            <p>
              {isDemo
                ? 'Example site — your appointment was confirmed here so you can see the flow. It was not saved to a real calendar, and card payment is not available on example sites.'
                : 'Your appointment has been successfully booked.'}
            </p>
          </div>

          <div className="confirmation-details">
            <p><strong>Confirmation code:</strong></p>
            <p data-testid="confirmation-code" className="confirmation-code">
              {appointment?.confirmation_code}
            </p>

            <p><strong>Service:</strong> {appointment?.service_name || selectedService?.name}</p>
            {(appointment?.staff_name || selectedStaffLabel) && (
              <p data-testid="confirmation-staff">
                <strong>Provider:</strong> {appointment?.staff_name || selectedStaffLabel}
              </p>
            )}
            <p><strong>When:</strong> {formatAppointmentWhen(selectedTime, selectedDate)}</p>
          </div>

          {!isDemo && (
            <p className="email-notice">
              A confirmation email has been sent to {customerEmail}
            </p>
          )}
        </div>
      </BookingShell>
    );
  }

  return null;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DatePicker = ({ selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const monthYear = currentMonth.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(
      <span key={`pad-${i}`} className="calendar-day calendar-day--pad" aria-hidden="true" />
    );
  }

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum += 1) {
    const day = new Date(year, month, dayNum);
    const dateString = formatLocalDate(day);
    const isPast = day < today;
    const isSelected = selectedDate === dateString;

    cells.push(
      <button
        type="button"
        key={dateString}
        data-testid={`date-${dateString}`}
        onClick={() => !isPast && onDateSelect(dateString)}
        disabled={isPast}
        className={`calendar-day ${isPast ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
      >
        {dayNum}
      </button>
    );
  }

  return (
    <div data-testid="calendar" className="calendar">
      <div className="calendar-header">
        <button
          type="button"
          data-testid="prev-month"
          onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          disabled={isCurrentMonth}
          aria-label="Previous month"
        >
          ←
        </button>
        <h3>{monthYear}</h3>
        <button
          type="button"
          data-testid="next-month"
          onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {cells}
      </div>
    </div>
  );
};

export default BookingWidget;
