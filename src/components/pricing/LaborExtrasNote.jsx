import { Link } from 'react-router-dom';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import { laborDisplayVars, laborInquiryMailto } from '../../utils/laborInquiryMailto';
import './LaborExtrasNote.css';

/**
 * Quiet extras under hosting plans — Brand match, Unique look, extra batch.
 */
function LaborExtrasNote({ compact = false, anchor = false, variant = 'default' }) {
  const { t } = useLocale();
  const vars = laborDisplayVars();
  if (!vars) {
    return null;
  }

  const mailtoHref = laborInquiryMailto(variant === 'claim' ? 'build on request' : 'optional extras');
  const headingId = compact ? 'labor-extras-heading-compact' : 'labor-extras-heading';
  const leadKey = variant === 'claim' ? 'labor.extras.claimLead' : 'labor.extras.lead';

  return (
    <aside
      id={anchor ? 'pricing-extras' : undefined}
      className={`labor-extras${compact ? ' labor-extras--compact' : ''}`}
      data-testid="labor-extras"
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="labor-extras-kicker">{t('labor.extras.kicker')}</h2>
      <p className="labor-extras-lead">{t(leadKey)}</p>
      <ul className="labor-extras-list">
        <li>{t('labor.extras.buildOnRequest', vars)}</li>
        <li>{t('labor.extras.care', vars)}</li>
        <li>{t('labor.extras.brand', vars)}</li>
        <li>{t('labor.extras.look', vars)}</li>
      </ul>
      <Link className="labor-extras-cta" to="/build" data-testid="labor-extras-cta">
        {t('labor.extras.cta')}
      </Link>
      {mailtoHref ? (
        <a className="labor-extras-cta-secondary" href={mailtoHref}>
          {t('labor.extras.ctaEmail')}
        </a>
      ) : null}
    </aside>
  );
}

export default LaborExtrasNote;
