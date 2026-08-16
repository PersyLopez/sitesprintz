/**
 * Template catalog completeness — every niche must be selectable, registered, and renderable.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getSectionByType, createSectionInstance, getAllSections, canAccessSection } from '../../src/config/sectionRegistry.js';
import { LAYOUTS, getLayoutForNiche, getSkeleton } from '../../src/config/layouts.js';
import { NICHE_CONFIGS } from '../../src/config/nicheTemplateBuilders.js';
import { TEMPLATE_FEATURES, getTemplateById } from '../../src/utils/templateFeatures.js';
import { INDUSTRY_TEMPLATES, getIndustryDefaults } from '../../src/utils/industryDefaults.js';
import { BAZAAR_TYPES } from '../../src/config/bazaarDefaults.js';

const TEMPLATES_DIR = join(process.cwd(), 'public/data/templates');
const INDEX = JSON.parse(readFileSync(join(TEMPLATES_DIR, 'index.json'), 'utf-8'));
const CATALOG_IDS = INDEX.templates.map((t) => t.id);

const LAYOUT_SECTION_TYPES = new Set(
  Object.values(LAYOUTS).flatMap((layout) => [
    ...Object.keys(layout.sections || {}),
    ...Object.values(layout.levels || {}).flat(),
  ])
);

describe('template catalog completeness', () => {
  it('index.json lists every on-disk business template', () => {
    const files = readdirSync(TEMPLATES_DIR)
      .filter((name) => name.endsWith('.json') && !name.startsWith('index'));
    expect(files.sort()).toEqual([...CATALOG_IDS].map((id) => `${id}.json`).sort());
  });

  it('every catalog id has a JSON file, niche builder, feature map, and layout', () => {
    for (const id of CATALOG_IDS) {
      expect(() => JSON.parse(readFileSync(join(TEMPLATES_DIR, `${id}.json`), 'utf-8'))).not.toThrow();
      expect(NICHE_CONFIGS[id], id).toBeTruthy();
      expect(getTemplateById(id), id).toBeTruthy();
      expect(getLayoutForNiche(id), id).not.toBe('');
    }
  });

  it('index.json does not advertise Pro as a paid plan', () => {
    for (const template of INDEX.templates) {
      expect(String(template.plan || '')).not.toMatch(/^pro$/i);
    }
  });

  it('every layout skeleton section is in the section registry', () => {
    for (const type of LAYOUT_SECTION_TYPES) {
      expect(getSectionByType(type), type).toBeTruthy();
      expect(() => createSectionInstance(type)).not.toThrow();
    }
  });

  it('booking and native-booking both resolve in the registry', () => {
    expect(getSectionByType('booking')?.type).toBe('booking');
    expect(getSectionByType('native-booking')?.type).toBe('native-booking');
    expect(getAllSections().some((s) => s.type === 'catalog')).toBe(true);
    expect(getAllSections().some((s) => s.type === 'service-areas')).toBe(true);
    expect(getSectionByType('multi-step-form')?.type).toBe('contact');
  });

  it('canAccessSection uses ESM tier checks', () => {
    expect(canAccessSection('trial', 'hero')).toBe(true);
    expect(canAccessSection('starter', 'booking')).toBe(false);
    expect(canAccessSection('growth', 'booking')).toBe(true);
    expect(canAccessSection('pro', 'checkout')).toBe(true);
  });

  it('wizard industry defaults exist for every catalog niche', () => {
    for (const id of CATALOG_IDS) {
      const defaults = getIndustryDefaults(id);
      expect(defaults.template, id).toBe(id);
      expect(INDUSTRY_TEMPLATES[id], id).toBeTruthy();
    }
  });

  it('atelier solo skeleton is fully registered', () => {
    const skeleton = getSkeleton('atelier', 'solo');
    for (const type of skeleton) {
      expect(getSectionByType(type), type).toBeTruthy();
    }
  });

  it('bazaar pop-up types still have builders', () => {
    expect(BAZAAR_TYPES.map((t) => t.id)).toEqual(expect.arrayContaining(['food-stall', 'yard-sale']));
  });

  it('TEMPLATE_FEATURES covers all catalog ids', () => {
    const missing = CATALOG_IDS.filter((id) => !TEMPLATE_FEATURES[id]);
    expect(missing).toEqual([]);
  });
});
