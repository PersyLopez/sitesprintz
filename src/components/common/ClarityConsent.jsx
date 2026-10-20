import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CLARITY_CONSENT_STORAGE_KEY, getClarityConsent, isClarityMarketingPath, syncClarity } from '../../utils/clarity';
import './ClarityConsent.css';

/**
 * Bottom consent banner for Microsoft Clarity on platform marketing pages.
 * Shown only while no consent choice is stored; Accept/Decline write the choice.
 */
export default function ClarityConsent() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isClarityMarketingPath(pathname) && getClarityConsent() === '');
  }, [pathname]);

  if (!visible) return null;

  const remember = (value) => {
    try {
      window.localStorage.setItem(CLARITY_CONSENT_STORAGE_KEY, value);
    } catch {
      // Storage can be blocked. Hide the banner either way.
    }
  };

  const accept = () => {
    remember('granted');
    syncClarity({
      isProd: import.meta.env.PROD,
      hostname: window.location.hostname,
      pathname,
    });
    setVisible(false);
  };

  const decline = () => {
    remember('denied');
    setVisible(false);
  };

  return (
    <div className="clarity-consent" data-testid="clarity-consent" role="region" aria-label="Analytics consent">
      <p className="clarity-consent__text">
        We use Microsoft Clarity on these pages to see how the site is used. See our{' '}
        <Link to="/legal/cookies">Cookie Policy</Link>.
      </p>
      <div className="clarity-consent__actions">
        <button type="button" className="clarity-consent__btn" data-testid="clarity-consent-accept" onClick={accept}>
          Accept
        </button>
        <button type="button" className="clarity-consent__btn clarity-consent__btn--decline" data-testid="clarity-consent-decline" onClick={decline}>
          Decline
        </button>
      </div>
    </div>
  );
}
