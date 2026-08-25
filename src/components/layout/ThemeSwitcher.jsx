import { useLocale } from '../../i18n/LocaleContext.jsx';
import { THEMES } from '../../utils/appTheme.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import '../i18n/LanguageSwitcher.css';

export default function ThemeSwitcher({ className = '' }) {
  const { t } = useLocale();
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`language-switcher theme-switcher ${className}`.trim()}
      data-testid="theme-switcher"
      role="group"
      aria-label={t('theme.label')}
    >
      {THEMES.map((code) => (
        <button
          key={code}
          type="button"
          className={`language-switcher-btn${theme === code ? ' is-active' : ''}`}
          data-testid={`theme-switcher-${code}`}
          aria-pressed={theme === code}
          onClick={() => setTheme(code)}
        >
          {t(`theme.${code}`)}
        </button>
      ))}
    </div>
  );
}
