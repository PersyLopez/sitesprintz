/**
 * LevelSelector — Level picker for the QuickStart Wizard.
 *
 * Shows three cards (Solo / Studio / Established) with the level name,
 * description, and the sections that level includes. Optionally shows a
 * "Recommended" badge when a siteData prop is provided and suggestLevel()
 * recommends that level.
 *
 * Props:
 *   value      — selected level key ('solo' | 'studio' | 'established')
 *   selected   — alias for value (backward compat)
 *   onChange    — callback(levelKey) when a card is clicked
 *   siteData    — optional site data to drive suggestLevel() hint
 *   layout      — optional layout key to derive section lists per level
 *   niche       — optional niche key so non-solo cards explain picker vs dispatch
 */

import { LEVELS, suggestLevel } from '../../config/layoutTokens';
import { getSkeleton } from '../../config/layouts';
import { getOperatingImplication } from '../../config/operatingModel';
import './LevelSelector.css';

function LevelSelector({ value, selected, onChange, siteData, layout, niche }) {
  const current = value ?? selected;
  const recommended = siteData ? suggestLevel(siteData) : null;

  return (
    <div className="level-selector">
      {Object.entries(LEVELS).map(([key, level]) => {
        const isSelected = key === current;
        const isRecommended = key === recommended;

        // Derive the sections this level includes for the given layout.
        let sectionList = null;
        if (layout) {
          const skeleton = getSkeleton(layout, key);
          if (skeleton && skeleton.length) {
            sectionList = skeleton;
          }
        }

        return (
          <div
            key={key}
            data-testid={`level-${key}`}
            className={`level-card ${isSelected ? 'selected' : ''}`}
            role="button"
            aria-pressed={isSelected}
            tabIndex={0}
            onClick={() => onChange(key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange(key);
              }
            }}
          >
            {isRecommended && (
              <span className="level-recommended-badge">Recommended</span>
            )}
            <h4>{level.name}</h4>
            <p>{level.description}</p>
            {niche && (
              <p className="level-implication">{getOperatingImplication(niche, key)}</p>
            )}
            {sectionList && (
              <ul className="level-sections">
                {sectionList.map((sectionType) => (
                  <li key={sectionType}>{sectionType}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default LevelSelector;