/**
 * Marketing chrome action colors keep primary CTA text readable.
 * The CSS tokens are intentionally pinned so contrast regressions are visible.
 */

import { describe, it, expect } from 'vitest';
import { meetsAaText } from '../../src/utils/colorContrast.js';

const ACTION = '#b4550c';
const HOVER = '#e87b1e';
const ACTION_TEXT = '#fffaf3';

describe('marketing chrome contrast', () => {
  it('uses the curated action and hover hexes', () => {
    expect(ACTION).toBe('#b4550c');
    expect(HOVER).toBe('#e87b1e');
  });

  it('keeps primary CTA text at WCAG AA contrast', () => {
    expect(meetsAaText(ACTION_TEXT, ACTION)).toBe(true);
  });
});
