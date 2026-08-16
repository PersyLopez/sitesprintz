/**
 * templateLayouts.js — Backward-compatibility shim.
 *
 * The original templateLayouts module exposed a per-template map of "layout
 * variations" (e.g. restaurant → casual / fine-dining) used by the legacy
 * LayoutSelector component. That concept has been superseded by the new
 * layout engine in layouts.js (atelier / craftsman / counsel / mercantile /
 * bazaar) + the level system in layoutTokens.js (solo / studio / established).
 *
 * This shim re-exports the legacy surface, deriving values from the new
 * system so existing imports keep working without resurrecting dead data.
 *
 * Legacy exports:
 *   TEMPLATE_LAYOUTS         — map of template(niche) → { base, category, color, defaultLayout, layouts }
 *   getLayoutsForTemplate(niche) → { defaultLayout, layouts } | null
 *   getLayoutKey(template, layout) — `${template}-${layout}` | template
 *   getLayoutName(template, layout) — display name
 *   hasLayoutVariations(template) — boolean
 *   getAllLayouts() — [{ template, layoutKey, name }]
 */

import { LAYOUTS, getLayout, getLayoutForNiche } from './layouts.js';
import { LEVELS } from './layoutTokens.js';
import { NICHE_CONFIGS } from './nicheTemplateBuilders.js';

// ---------------------------------------------------------------------------
// Layout "variations" — derive one variation per level for each layout.
// Each variation gets a friendly name + emoji + description + feature list.
// ---------------------------------------------------------------------------

const LEVEL_META = {
  solo: { emoji: '🟢', name: 'Solo' },
  studio: { emoji: '🔵', name: 'Studio' },
  established: { emoji: '🟣', name: 'Established' },
};

/**
 * Legacy variation aliases — the original templateLayouts exposed friendly
 * variation names (e.g. restaurant → casual / fine-dining) that don't map 1:1
 * to the new level-based variations. Preserve them so legacy lookups keep
 * working. Each alias is keyed by `${niche}/${variationId}`.
 */
const LEGACY_VARIATION_ALIASES = {
  'restaurant/casual': { name: 'Casual Dining', emoji: '🍔', description: 'Family-friendly neighborhood restaurant' },
  'restaurant/fine-dining': { name: 'Fine Dining', emoji: '🍷', description: 'Upscale dining with tasting menus' },
  'salon/modern-studio': { name: 'Modern Studio', emoji: '💈', description: 'Sleek, contemporary salon' },
  'gym/crossfit': { name: 'CrossFit', emoji: '🏋️', description: 'High-intensity functional fitness' },
  'consultant/strategic': { name: 'Strategic', emoji: '📊', description: 'Strategic advisory focus' },
  'freelancer/creative': { name: 'Creative', emoji: '🎨', description: 'Creative freelance portfolio' },
  'cleaning/residential': { name: 'Residential', emoji: '🏠', description: 'Home cleaning services' },
  'electrician/commercial': { name: 'Commercial', emoji: '⚡', description: 'Commercial electrical services' },
};

/**
 * Legacy default-layout aliases — map a niche to its legacy default variation id
 * so getLayoutsForTemplate().defaultLayout returns the historical value where
 * possible.
 */
const LEGACY_DEFAULT_LAYOUT = {
  restaurant: 'casual',
  salon: 'modern-studio',
  gym: 'crossfit',
  consultant: 'strategic',
  freelancer: 'creative',
  cleaning: 'residential',
  electrician: 'commercial',
};

/**
 * Build the `layouts` map (variations) for a given layout key.
 * The legacy API expects { name, emoji, description, features } per variation.
 * @param {string} layoutKey
 * @returns {Object} variations map keyed by variation id
 */
function buildVariations(layoutKey) {
  const layout = getLayout(layoutKey);
  if (!layout) return {};

  const variations = {};
  const levelKeys = Object.keys(layout.levels || { solo: [] });

  for (const levelKey of levelKeys) {
    const level = LEVELS[levelKey] || { name: levelKey, description: '' };
    const meta = LEVEL_META[levelKey] || { emoji: '⬜', name: level.name };
    const features = layout.features
      ? Object.entries(layout.features)
          .filter(([, cfg]) => cfg.offered)
          .map(([key]) => key)
      : [];

    variations[levelKey] = {
      name: `${layout.name} ${level.name}`,
      emoji: meta.emoji,
      description: level.description || layout.description,
      features,
    };
  }

  return variations;
}

// ---------------------------------------------------------------------------
// TEMPLATE_LAYOUTS — derived map keyed by niche id
// ---------------------------------------------------------------------------

function buildTemplateLayouts() {
  const map = {};

  const addEntry = (niche, layoutKey) => {
    const layout = getLayout(layoutKey);
    if (!layout) return;
    const variations = buildVariations(layoutKey);
    // Merge legacy aliases for this niche so old variation ids resolve.
    for (const [key, alias] of Object.entries(LEGACY_VARIATION_ALIASES)) {
      const [aliasNiche, aliasId] = key.split('/');
      if (aliasNiche !== niche) continue;
      variations[aliasId] = {
        ...(variations[aliasId] || {}),
        ...alias,
        features: variations[aliasId]?.features || (layout.features
          ? Object.entries(layout.features).filter(([, c]) => c.offered).map(([k]) => k)
          : []),
      };
    }
    const defaultLayout = LEGACY_DEFAULT_LAYOUT[niche] || Object.keys(variations)[0] || 'solo';
    if (map[niche]) return;
    map[niche] = {
      base: niche,
      category: layout.name,
      color: layout.character === 'approachable' ? 'ivory' : 'onyx',
      defaultLayout,
      layouts: variations,
    };
  };

  for (const niche of Object.keys(NICHE_CONFIGS)) {
    addEntry(niche, getLayoutForNiche(niche));
  }
  // Also expose entries for every layout's niches even if not in NICHE_CONFIGS
  // (e.g. bazaar niches) so legacy lookups don't break.
  for (const [layoutKey, layout] of Object.entries(LAYOUTS)) {
    for (const niche of layout.niches || []) {
      addEntry(niche, layoutKey);
    }
  }

  return map;
}

export const TEMPLATE_LAYOUTS = buildTemplateLayouts();

// ---------------------------------------------------------------------------
// getLayoutsForTemplate(niche) → { defaultLayout, layouts } | null
// ---------------------------------------------------------------------------

export function getLayoutsForTemplate(template) {
  const entry = TEMPLATE_LAYOUTS[template];
  if (!entry) return null;
  return {
    defaultLayout: entry.defaultLayout,
    layouts: entry.layouts,
  };
}

// ---------------------------------------------------------------------------
// getLayoutKey(template, layout) → composite key
// ---------------------------------------------------------------------------

export function getLayoutKey(template, layout) {
  if (!layout) return template;
  return `${template}-${layout}`;
}

// ---------------------------------------------------------------------------
// getLayoutName(template, layout) → display name
// ---------------------------------------------------------------------------

export function getLayoutName(template, layout) {
  const entry = TEMPLATE_LAYOUTS[template];
  if (!entry) return template;
  if (!layout) return entry.category;
  const variation = entry.layouts[layout];
  return variation ? variation.name : entry.category;
}

// ---------------------------------------------------------------------------
// hasLayoutVariations(template) → boolean
// ---------------------------------------------------------------------------

export function hasLayoutVariations(template) {
  const entry = TEMPLATE_LAYOUTS[template];
  return !!(entry && entry.layouts && Object.keys(entry.layouts).length > 0);
}

// ---------------------------------------------------------------------------
// getAllLayouts() → [{ template, layoutKey, name }]
// ---------------------------------------------------------------------------

export function getAllLayouts() {
  const all = [];
  for (const [template, entry] of Object.entries(TEMPLATE_LAYOUTS)) {
    for (const [layoutKey, variation] of Object.entries(entry.layouts)) {
      all.push({
        template,
        layoutKey,
        name: variation.name,
      });
    }
  }
  return all;
}