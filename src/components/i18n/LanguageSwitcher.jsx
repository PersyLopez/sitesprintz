import { useLocation } from 'react-router-dom';
import { DEFAULT_LOCALE, LOCALES, isLocalizedAppRoute } from '../../i18n/locale.js';
import { tMarketing } from '../../i18n/marketing/index.js';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import './LanguageSwitcher.css';

export function languageSwitchIsUsable() {
  return LOCALES.some(
    (code) =>
      code !== DEFAULT_LOCALE &&
      tMarketing(code, 'nav.gallery') !== tMarketing(DEFAULT_LOCALE, 'nav.gallery')
  );
}

export default function LanguageSwitcher({ className = '' }) {
  const { locale, setLocale, t } = useLocale();
  const { pathname } = useLocation();

  if (!languageSwitchIsUsable() || !isLocalizedAppRoute(pathname)) {
    return null;
  }

  return (
    <div
      className={`language-switcher ${className}`.trim()}
      data-testid="language-switcher"
      role="group"
      aria-label={t('lang.label')}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={`language-switcher-btn${locale === code ? ' is-active' : ''}`}
          data-testid={`language-switcher-${code}`}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
