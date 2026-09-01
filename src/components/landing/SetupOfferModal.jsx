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
      title={t('setupOffer.title')}
      className="setup-offer-modal"
      ariaDescribedBy="setup-offer-body"
    >
      <div data-testid="setup-offer-modal">
        <p id="setup-offer-body" className="setup-offer-body">
          {t('setupOffer.body', { end, days })}
        </p>
        <p className="setup-offer-need">{t('setupOffer.need')}</p>
        <div className="setup-offer-actions">
          <Link
            to="/build"
            className="btn btn-primary"
            data-testid="setup-offer-cta"
            onClick={onDismiss}
          >
            {t('setupOffer.cta')}
          </Link>
          <button
            type="button"
            className="btn btn-secondary"
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
