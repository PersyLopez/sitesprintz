import { LOCALES } from '../../i18n/locale.js';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import './LanguageSwitcher.css';

export default function LanguageSwitcher({ className = '' }) {
  const { locale, setLocale, t } = useLocale();

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
