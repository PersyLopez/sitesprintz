import { useLocale } from '../../i18n/LocaleContext.jsx';
import { laborDisplayVars, laborInquiryMailto } from '../../utils/laborInquiryMailto';
import './LaborExtrasNote.css';

/**
 * Quiet extras under hosting plans — not a third subscription column.
 * Only landing should pass anchor so #pricing-extras is unique.
 */
function LaborExtrasNote({ compact = false, anchor = false, variant = 'default' }) {
  const { t } = useLocale();
  const vars = laborDisplayVars();
  if (!vars) {
    return null;
  }

  const href = laborInquiryMailto(variant === 'claim' ? 'build on request' : 'optional extras');
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
      {href ? (
        <a className="labor-extras-cta" href={href} data-testid="labor-extras-cta">
          {t('labor.extras.cta')}
        </a>
      ) : (
        <p className="labor-extras-cta" data-testid="labor-extras-cta-unavailable">
          {t('labor.extras.ctaUnavailable')}
        </p>
      )}
    </aside>
  );
}

export default LaborExtrasNote;
