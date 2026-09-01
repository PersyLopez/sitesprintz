import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import {
  PRICING_CONFIG,
  PLATFORM_SUPPORT_EMAIL,
  setupOfferEndLabel,
} from '../../config/pricing.config';
import { laborInquiryMailto } from '../../utils/laborInquiryMailto';
import './SetupOfferModal.css';

function SetupOfferSun() {
  return (
    <svg className="setup-offer-sun" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="22" fill="#f4a261" opacity="0.95" />
      <circle cx="60" cy="60" r="32" fill="none" stroke="#f4a261" strokeWidth="2" opacity="0.45" />
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1="60"
          y1="14"
          x2="60"
          y2="6"
          stroke="#f4a261"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.55"
          transform={`rotate(${i * 30} 60 60)`}
        />
      ))}
    </svg>
  );
}

function SetupOfferModal({ onDismiss }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const end = setupOfferEndLabel(locale);
  const days = PRICING_CONFIG.trial.duration;
  const mailto = laborInquiryMailto('setup offer');

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = prefersReduced ? 0 : 600;
    const id = window.setTimeout(() => setOpen(true), delay);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <Modal
      isOpen={open}
      onClose={onDismiss}
      className="setup-offer-modal"
      ariaLabelledBy="setup-offer-title"
      ariaDescribedBy="setup-offer-body"
    >
      <div data-testid="setup-offer-modal">
        <SetupOfferSun />
        <p className="setup-offer-kicker">{t('setupOffer.kicker', { end })}</p>
        <h2 id="setup-offer-title" className="setup-offer-title">
          {t('setupOffer.title')}
        </h2>
        <p id="setup-offer-body" className="setup-offer-body">
          {t('setupOffer.body', { end, days })}
        </p>
        <div className="setup-offer-need-card">
          <p className="setup-offer-need-label">{t('setupOffer.needLabel')}</p>
          <p className="setup-offer-need">{t('setupOffer.need')}</p>
        </div>
        <div className="setup-offer-actions">
          <Link
            to="/build"
            className="btn-primary-large"
            data-testid="setup-offer-cta"
            onClick={onDismiss}
          >
            {t('setupOffer.cta')}
          </Link>
          <button
            type="button"
            className="setup-offer-dismiss"
            onClick={onDismiss}
            data-testid="setup-offer-dismiss"
          >
            {t('setupOffer.dismiss')}
          </button>
        </div>
        {mailto ? (
          <p className="setup-offer-email">
            <a href={mailto} data-testid="setup-offer-email-alt">
              {t('setupOffer.emailAlt', { email: PLATFORM_SUPPORT_EMAIL })}
            </a>
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

export default SetupOfferModal;
