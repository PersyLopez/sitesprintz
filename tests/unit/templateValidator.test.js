/**
 * Tests for template validator
 */

import { describe, it, expect } from 'vitest';
import { validateTemplateSections, getKnownSectionTypes } from '../../server/utils/templateValidator.js';

describe('validateTemplateSections', () => {
  it('returns valid for empty array', () => {
    const result = validateTemplateSections([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns invalid for non-array', () => {
    const result = validateTemplateSections(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Sections must be an array');
  });

  it('returns invalid for section without type', () => {
    const result = validateTemplateSections([{ content: { title: 'Test' } }]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("missing 'type' field");
  });

  it('returns invalid for unknown section type', () => {
    const result = validateTemplateSections([{ type: 'unknown-section', content: {} }]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("unknown section type 'unknown-section'");
  });

  it('returns valid for known section types', () => {
    const result = validateTemplateSections([
      { type: 'hero', content: { title: 'Test' } },
      { type: 'services', content: { items: [] } },
      { type: 'gallery', content: { images: [] } },
      { type: 'faq', content: { items: [] } },
    ]);
    expect(result.valid).toBe(true);
  });

  it('returns invalid for missing required fields', () => {
    // hero requires title
    const result = validateTemplateSections([
      { type: 'hero', content: {} },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("required field 'title' is missing");
  });

  it('returns valid for hero with title', () => {
    const result = validateTemplateSections([
      { type: 'hero', content: { title: 'Test', subtitle: 'Sub' } },
    ]);
    expect(result.valid).toBe(true);
  });

  it('returns invalid for invalid enabled type', () => {
    const result = validateTemplateSections([
      { type: 'hero', content: { title: 'Test' }, enabled: 'yes' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("'enabled' must be a boolean");
  });

  it('returns invalid for negative order', () => {
    const result = validateTemplateSections([
      { type: 'hero', content: { title: 'Test' }, order: -1 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("'order' must be a non-negative number");
  });

  it('returns valid for all known booking section types', () => {
    const result = validateTemplateSections([
      { type: 'interactive-calculator', content: {} },
      { type: 'subscription-booking', content: {} },
      { type: 'class-scheduler', content: {} },
    ]);
    expect(result.valid).toBe(true);
  });

  it('returns valid for content sections with correct casing', () => {
    const result = validateTemplateSections([
      { type: 'hero', content: { title: 'Test' } },
      { type: 'about', content: { text: 'About us' } },
      { type: 'contact', content: { email: 'test@test.com' } },
      { type: 'footer', content: {} },
      { type: 'nav', content: { items: [] } },
      { type: 'brand', content: { name: 'Test' } },
      { type: 'features', content: { items: [] } },
      { type: 'beforeAfter', content: { items: [] } },
      { type: 'serviceAreas', content: { areas: [] } },
    ]);
    expect(result.valid).toBe(true);
  });

  it('getKnownSectionTypes returns sorted array', () => {
    const types = getKnownSectionTypes();
    expect(types.length).toBeGreaterThan(20);
    expect(types[0]).toBe('about');
    expect(types).toEqual([...types].sort());
  });
});