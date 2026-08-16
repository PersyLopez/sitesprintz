import { useMemo } from 'react';
import { useSite } from '../../../hooks/useSite';
import {
  getRecommendedSiteThemes,
  getSiteTheme,
  colorsFromSiteTheme,
  DEFAULT_SITE_THEME_ID,
} from '../../../config/siteThemes';
import './ThemePicker.css';

function ThemePicker({ templateId }) {
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
  };

  return (
    <div className="theme-picker" data-testid="theme-picker">
      <p className="theme-picker-lede">
        Six locked palettes. Contrast is already set — pick a look, not a hex code.
      </p>

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
