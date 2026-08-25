import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../../hooks/useSite';
import { useLocale } from '../../../i18n/LocaleContext.jsx';
import { laborDisplayVars } from '../../../utils/laborInquiryMailto';
import {
  getRecommendedSiteThemes,
  getSiteTheme,
  colorsFromSiteTheme,
  DEFAULT_SITE_THEME_ID,
} from '../../../config/siteThemes';
import './ThemePicker.css';

function ThemePicker({ templateId }) {
  const { t } = useLocale();
  const extras = laborDisplayVars();
  const { siteData, updateField } = useSite();
  const niche = templateId || siteData._niche || siteData.template || siteData.templateId;
  const currentThemeId = siteData._themeId || siteData.colors?.themeId || DEFAULT_SITE_THEME_ID;

  const themes = useMemo(() => getRecommendedSiteThemes(niche), [niche]);
  const suggestedIds = useMemo(
    () => new Set(themes.filter((theme) => theme.recommendedFor.includes(niche)).map((theme) => theme.id)),
    [themes, niche]
  );

  const applyTheme = (themeId) => {
    updateField('_themeId', themeId);
    updateField('colors', colorsFromSiteTheme(themeId));
    updateField('_uniqueLook', null);
  };

  return (
    <div className="theme-picker" data-testid="theme-picker">
      <p className="theme-picker-lede">
        Six locked palettes. Contrast is already set — pick a look, not a hex code.
      </p>
      {extras && (
        <p className="theme-picker-extras">
          {t('labor.extras.themeHint', extras)}
          {' '}
          <Link to="/#pricing-extras">{t('labor.extras.themeHintLink')}</Link>
        </p>
      )}
      {siteData._uniqueLook?.id === 'unique-look' && (
        <p className="theme-picker-extras" data-testid="unique-look-active">
          This site has a unique look. Picking a palette below replaces it with a locked theme.
        </p>
      )}

      <div className="theme-grid">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isSelected={currentThemeId === theme.id}
            isSuggested={suggestedIds.has(theme.id)}
            onSelect={() => applyTheme(theme.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ThemeCard({ theme, isSelected, isSuggested, onSelect }) {
  const { tokens, mode } = getSiteTheme(theme.id);

  return (
    <button
      type="button"
      className={`theme-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      data-testid={`theme-card-${theme.id}`}
      aria-pressed={isSelected}
    >
      <div
        className="theme-card-preview"
        style={{ background: tokens.bg, borderColor: tokens.hairline }}
      >
        <div className="theme-swatch" style={{ background: tokens.accent }} />
        <div className="theme-swatch-secondary" style={{ background: tokens.surface }} />
        <span className="theme-mode-label">{mode === 'light' ? 'Light' : 'Dark'}</span>
      </div>
      <div className="theme-card-info">
        <div className="theme-card-header">
          <span className="theme-name">{theme.name}</span>
        </div>
        <p className="theme-card-desc">{theme.description}</p>
        {isSuggested && !isSelected && <span className="theme-badge recommended-badge">Suggested</span>}
        {isSelected && <span className="theme-badge selected-badge">Selected</span>}
      </div>
    </button>
  );
}

export default ThemePicker;
