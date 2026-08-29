import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { get, post } from '../utils/api';
import {
  shouldShowStaffSelection,
  resolveAutoAssignedStaffId,
} from '../utils/bookingStaffFlow';
import {
  formatVisitorFeeNoticeLines,
  hasEnabledVisitorFeePolicies,
} from '../utils/visitorExperience';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { tLive } from '../i18n/liveChrome/index.js';
import './BookingWidget.css';

const NO_PREFERENCE = 'no_preference';

function serviceRequiresCheckout(service) {
  return Boolean(service?.requires_payment) && service?.payment_type && service.payment_type !== 'none';
}

function checkoutPaymentType(service) {
  return service?.payment_type === 'optional' ? 'full' : service.payment_type;
}

function depositDueCents(service) {
  const price = Number(service?.price_cents) || 0;
  if (service?.payment_type === 'deposit') {
    const pct = Number(service.deposit_percentage) || 50;
    return Math.round(price * (pct / 100));
  }
  return price;
}

function useLiveT() {
  const { locale } = useLocale();
  return {
    locale,
    t: (key, vars) => tLive(locale, key, vars),
  };
}

function bookingSteps(showStaff, t, skipServiceStep = false) {
  const steps = [];
  if (!skipServiceStep) {
    steps.push({ id: 'services', label: t('booking.service') });
  }
  if (showStaff) steps.push({ id: 'staff', label: t('booking.provider') });
  steps.push({ id: 'date', label: t('booking.datetime') });
  steps.push({ id: 'form', label: t('booking.details') });
  return steps;
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

function stepStatus(step, id, showStaff, skipServiceStep = false) {
  const order = showStaff
    ? (skipServiceStep
      ? ['staff', 'date', 'form', 'confirmation']
      : ['services', 'staff', 'date', 'form', 'confirmation'])
    : (skipServiceStep
      ? ['date', 'form', 'confirmation']
      : ['services', 'date', 'form', 'confirmation']);
  const current = order.indexOf(step);
  const index = order.indexOf(id);
  if (index < current) return 'is-done';
  if (index === current) return 'is-current';
  return '';
}

function normalizeServiceName(name) {
  return String(name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function matchBookableService(services, id, name) {
  if (id) {
    const byId = services.find((service) => String(service.id) === String(id));
    if (byId) return byId;
  }
  const normalized = normalizeServiceName(name);
  if (!normalized) return null;
  return services.find((service) => normalizeServiceName(service.name) === normalized);
}

function advanceAfterServicePick({
  showStaff,
  businessMode,
  staff,
  setSelectedStaff,
  setStep,
}) {
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
}

function BookingShell({ step, showStaff = false, skipServiceStep = false, children }) {
  const { t } = useLiveT();
  const showProgress = step !== 'confirmation';
  const steps = bookingSteps(showStaff, t, skipServiceStep);
  return (
    <div className="booking-widget" data-testid="booking-widget">
      {showProgress && (
        <ol className="booking-progress" aria-label={t('bookingSteps')}>
          {steps.map((item) => (
            <li key={item.id} className={stepStatus(step, item.id, showStaff, skipServiceStep)}>
              {item.label}
            </li>
          ))}
        </ol>
      )}
      {children}
    </div>
  );
}

function CatalogServiceSelect({ services, selectedService, onChange, t, showBrowseHint = false }) {
  return (
    <div className="catalog-service-picker">
      {showBrowseHint && !selectedService && (
        <p className="catalog-service-hint">
          {t('booking.chooseFromList')}{' '}
          <a href="#services">{t('booking.browseServices')}</a>
        </p>
      )}
      <label className="catalog-service-label" htmlFor="booking-service-select">
        {t('booking.selectService')}
      </label>
      <select
        id="booking-service-select"
        data-testid="booking-service-select"
        value={selectedService?.id || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t('booking.selectService')}</option>
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name}
          </option>
        ))}
      </select>
    </div>
  );
}

const BookingWidget = ({
  userId: propUserId,
  siteId = null,
  demoMode = false,
  businessMode = 'solo',
  noPreferenceText = 'Any available',
  pageCatalogMode = false,
  feesEnabled = false,
}) => {
  const { userId: paramUserId } = useParams();
  const userId = propUserId || paramUserId;
  const { locale, t } = useLiveT();
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
  const [serviceFromPage, setServiceFromPage] = useState(false);
  const [feeNoticeLines, setFeeNoticeLines] = useState([]);
  const pendingPagePickRef = useRef(null);

  const siteQuery = siteId ? { siteId } : undefined;

  const showStaff = useMemo(() => shouldShowStaffSelection({
    effectiveMode: businessMode,
    isSoloOperation: businessMode === 'solo' || staff.length <= 1,
    showStaffSelection: businessMode === 'team',
    staffForService: staff,
  }), [businessMode, staff]);

  const selectedStaffRecord = staff.find((member) => member.id === selectedStaff);
  const selectedStaffLabel = selectedStaff === NO_PREFERENCE
    ? (noPreferenceText === 'Any available' ? t('booking.any') : noPreferenceText)
    : selectedStaffRecord?.name;

  const skipServiceStep = pageCatalogMode && serviceFromPage && Boolean(selectedService);

  useEffect(() => {
    fetchServices();
    fetchStaff();
  }, [userId, siteId]);

  useEffect(() => {
    if (!pageCatalogMode) return undefined;

    const applyPick = (detail) => {
      if (!detail) return;
      if (!services.length) {
        pendingPagePickRef.current = detail;
        return;
      }
      const matched = matchBookableService(services, detail.id, detail.name);
      pendingPagePickRef.current = null;
      if (!matched) return;
      setSelectedService(matched);
      setServiceFromPage(true);
      advanceAfterServicePick({
        showStaff,
        businessMode,
        staff,
        setSelectedStaff,
        setStep,
      });
    };

    if (pendingPagePickRef.current) {
      applyPick(pendingPagePickRef.current);
    }

    const onPagePick = (event) => applyPick(event.detail || {});
    window.addEventListener('ss-book-service-select', onPagePick);
    return () => window.removeEventListener('ss-book-service-select', onPagePick);
  }, [pageCatalogMode, services, showStaff, businessMode, staff]);

  useEffect(() => {
    if (!selectedService?.id) {
      setFeeNoticeLines([]);
      return undefined;
    }

    let cancelled = false;
    const loadFeeNotice = async () => {
      try {
        const policies = await get(`/api/booking/services/${selectedService.id}/fee-policies`);
        if (cancelled) return;
        const shopFeesOn = feesEnabled || policies?.feesEnabled === true;
        if (!shopFeesOn || !hasEnabledVisitorFeePolicies(policies)) {
          setFeeNoticeLines([]);
          return;
        }
        setFeeNoticeLines(formatVisitorFeeNoticeLines(
          policies,
          (key, vars) => tLive(locale, key, vars),
        ));
      } catch {
        if (!cancelled) setFeeNoticeLines([]);
      }
    };

    loadFeeNotice();
    return () => {
      cancelled = true;
    };
  }, [feesEnabled, selectedService?.id, locale]);

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
      setError(t('booking.loadFail'));
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

  const handleServiceSelect = (service, fromPage = false) => {
    setSelectedService(service);
    setServiceFromPage(fromPage);
  };

  const handleCatalogServiceChange = (serviceId) => {
    const service = services.find((item) => String(item.id) === String(serviceId));
    if (!service) return;
    handleServiceSelect(service, false);
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
    setServiceFromPage(false);
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
      errors.name = t('booking.nameRequired');
    }

    if (!customerEmail.trim()) {
      errors.email = t('booking.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      errors.email = t('booking.emailInvalid');
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

      const created = response.appointment;
      setAppointment(created);

      if (!demoMode && serviceRequiresCheckout(selectedService)) {
        setStep('payment');
        try {
          const checkoutResponse = await post('/api/booking/checkout/create-session', {
            appointment_id: created.id,
            payment_type: checkoutPaymentType(selectedService),
          });
          if (checkoutResponse.checkout_url) {
            window.location.href = checkoutResponse.checkout_url;
            return;
          }
          throw new Error(t('checkoutFailed'));
        } catch (payErr) {
          setStep('form');
          throw payErr;
        }
      }

      setStep('confirmation');
    } catch (err) {
      const message = err.message || t('booking.createFail');
      if (/no longer available/i.test(message)) {
        setSelectedTime(null);
        if (selectedDate) {
          await fetchTimeSlots(selectedDate);
        }
        setStep('date');
      }
      setError(message);
      console.error('Error creating appointment:', err);
    } finally {
      setLoading(false);
    }
  };

  if (servicesLoading) {
    return (
      <div className="booking-widget">
        <div data-testid="services-loading">{t('booking.loading')}</div>
      </div>
    );
  }

  if (error && step === 'services') {
    return (
      <div className="booking-widget">
        <div data-testid="error-message" className="error">
          {error}
        </div>
        <button type="button" onClick={fetchServices}>{t('tryAgain')}</button>
      </div>
    );
  }

  if (services.length === 0 && step === 'services') {
    return (
      <div className="booking-widget">
        <div data-testid="services-empty">
          {t('booking.emptyNow')}
        </div>
      </div>
    );
  }

  if (step === 'services') {
    return (
      <BookingShell step={step} showStaff={showStaff} skipServiceStep={skipServiceStep}>
        <h2>{t('booking.selectService')}</h2>

        {pageCatalogMode ? (
          <CatalogServiceSelect
            services={services}
            selectedService={selectedService}
            onChange={handleCatalogServiceChange}
            t={t}
            showBrowseHint
          />
        ) : (
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
        )}

        {selectedService && (
          <div className="actions">
            <button
              type="button"
              data-testid="next-button"
              onClick={handleNextFromServices}
              className="btn-primary"
              disabled={businessMode === 'team' && staffLoading}
            >
              {t('booking.continue')}
            </button>
          </div>
        )}

        {selectedService && (
          <div data-testid="booking-summary" className="booking-summary">
            <h3>{t('booking.summary')}</h3>
            <p><strong>{t('booking.service')}:</strong> {selectedService.name}</p>
            {selectedStaffLabel && (
              <p><strong>{t('booking.provider')}:</strong> {selectedStaffLabel}</p>
            )}
            <p><strong>{t('booking.price')}</strong> ${(selectedService.price_cents / 100).toFixed(2)}</p>
          </div>
        )}
      </BookingShell>
    );
  }

  if (step === 'staff') {
    return (
      <BookingShell step={step} showStaff={showStaff} skipServiceStep={skipServiceStep}>
        <h2>{t('booking.chooseProvider')}</h2>

        <button
          type="button"
          data-testid="back-button"
          onClick={handleBackToServices}
          className="btn-secondary"
        >
          {t('booking.back')}
        </button>

        {pageCatalogMode && (
          <CatalogServiceSelect
            services={services}
            selectedService={selectedService}
            onChange={handleCatalogServiceChange}
            t={t}
          />
        )}

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
            <p>{t('booking.matchProvider')}</p>
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
              {t('booking.continue')}
            </button>
          </div>
        )}
      </BookingShell>
    );
  }

  if (step === 'date') {
    const visibleSlots = timeSlots.filter((slot) => slot.available !== false);

    return (
      <BookingShell step={step} showStaff={showStaff} skipServiceStep={skipServiceStep}>
        <h2>{t('booking.selectDate')}</h2>

        <button
          type="button"
          data-testid="back-button"
          onClick={handleBackFromDate}
          className="btn-secondary"
        >
          {t('booking.back')}
        </button>

        {pageCatalogMode && (
          <CatalogServiceSelect
            services={services}
            selectedService={selectedService}
            onChange={handleCatalogServiceChange}
            t={t}
          />
        )}

        <div data-testid="date-picker" className="date-picker">
          <p>{t('booking.chooseDay')}</p>
          <DatePicker
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>

        {error && (
          <div data-testid="error-message" className="error">
            {error}
          </div>
        )}

        {selectedDate && slotsLoading && (
          <p className="booking-slots-status" data-testid="slots-loading">{t('booking.slotsLoading')}</p>
        )}

        {selectedDate && !slotsLoading && visibleSlots.length === 0 && (
          <p className="booking-slots-status" data-testid="slots-empty">
            {t('booking.noSlots')}
          </p>
        )}

        {selectedDate && !slotsLoading && visibleSlots.length > 0 && (
          <div data-testid="time-slots" className="time-slots">
            <h3>{t('booking.availableTimes')}</h3>
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
                {t('booking.continue')}
              </button>
            )}
          </div>
        )}
      </BookingShell>
    );
  }

  if (step === 'payment') {
    return (
      <BookingShell step={step} showStaff={showStaff} skipServiceStep={skipServiceStep}>
        <div data-testid="booking-payment-redirect" className="booking-summary email-notice">
          <h2>{t('checkoutRedirecting')}</h2>
        </div>
      </BookingShell>
    );
  }

  if (step === 'form') {
    const needsCheckout = !demoMode && serviceRequiresCheckout(selectedService);
    const dueAmount = (depositDueCents(selectedService) / 100).toFixed(2);
    return (
      <BookingShell step={step} showStaff={showStaff} skipServiceStep={skipServiceStep}>
        <h2>{t('booking.yourInfo')}</h2>

        <button
          type="button"
          data-testid="back-button"
          onClick={() => setStep('date')}
          className="btn-secondary"
        >
          {t('booking.back')}
        </button>

        <div data-testid="customer-form" className="customer-form">
          <div className="form-group">
            <label htmlFor="customer-name">{t('booking.nameLabel')}</label>
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
            <label htmlFor="customer-email">{t('booking.emailLabel')}</label>
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
            <label htmlFor="customer-phone">{t('booking.phoneLabel')}</label>
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
            <label htmlFor="customer-notes">{t('booking.notesLabel')}</label>
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
            <div data-testid="booking-loading">{t('booking.processing')}</div>
          )}

          {needsCheckout && (
            <div data-testid="booking-payment-due" className="booking-summary email-notice">
              <p>
                {selectedService.payment_type === 'deposit'
                  ? t('booking.depositDue', {
                      percent: selectedService.deposit_percentage || 50,
                      amount: dueAmount,
                    })
                  : t('booking.fullDue', { amount: dueAmount })}
              </p>
            </div>
          )}

          {feeNoticeLines.length > 0 && (
            <div data-testid="booking-fee-notice" className="booking-summary email-notice">
              <h3>{t('booking.feeNotice.title')}</h3>
              {feeNoticeLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}

          <button
            type="button"
            data-testid="book-now-button"
            onClick={handleBooking}
            disabled={loading}
            className="btn-primary"
          >
            {loading
              ? t('booking.booking')
              : needsCheckout
                ? t('booking.payContinue')
                : t('booking.confirm')}
          </button>
        </div>
      </BookingShell>
    );
  }

  if (step === 'confirmation') {
    const isDemo = demoMode || appointment?.demo === true;
    return (
      <BookingShell step={step} showStaff={showStaff} skipServiceStep={skipServiceStep}>
        <div data-testid="confirmation-page" className="confirmation">
          <h2>{isDemo ? t('booking.demoConfirmed') : t('booking.confirmed')}</h2>

          <div data-testid="confirmation-message" className="success-message">
            <p>
              {isDemo
                ? t('booking.demoNote')
                : t('booking.success')}
            </p>
          </div>

          <div className="confirmation-details">
            <p><strong>{t('booking.code')}</strong></p>
            <p data-testid="confirmation-code" className="confirmation-code">
              {appointment?.confirmation_code}
            </p>

            <p><strong>{t('booking.service')}:</strong> {appointment?.service_name || selectedService?.name}</p>
            {(appointment?.staff_name || selectedStaffLabel) && (
              <p data-testid="confirmation-staff">
                <strong>{t('booking.provider')}:</strong> {appointment?.staff_name || selectedStaffLabel}
              </p>
            )}
            <p><strong>{t('booking.when')}</strong> {formatAppointmentWhen(selectedTime, selectedDate)}</p>
          </div>

          {!isDemo && (
            <p className="email-notice">
              {t('booking.emailNotice', { email: customerEmail })}
            </p>
          )}
        </div>
      </BookingShell>
    );
  }

  return null;
};

const DatePicker = ({ selectedDate, onDateSelect }) => {
  const { locale, t } = useLiveT();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const dateLocale = locale === 'es' ? 'es' : 'en';
  const monthYear = currentMonth.toLocaleString(dateLocale, {
    month: 'long',
    year: 'numeric',
  });
  const WEEKDAYS = Array.from({ length: 7 }, (_, index) => (
    new Date(Date.UTC(2024, 5, 2 + index)).toLocaleDateString(dateLocale, { weekday: 'short', timeZone: 'UTC' })
  ));

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
          aria-label={t('booking.prevMonth')}
        >
          ←
        </button>
        <h3>{monthYear}</h3>
        <button
          type="button"
          data-testid="next-month"
          onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          aria-label={t('booking.nextMonth')}
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
