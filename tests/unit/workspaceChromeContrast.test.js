/**
 * Workspace chrome (html[data-theme]) selected-state pairs.
 * Keep in sync with src/styles/global.css --primary-dark / --on-primary.
 */

import { describe, it, expect } from 'vitest';
import { meetsAaText } from '../../src/utils/colorContrast.js';

const DARK = {
  bg: '#030712',
  text: '#f0f9ff',
  muted: '#94a3b8',
  selectedFill: '#4a6d82',
  onSelected: '#f4f2ee',
};

const LIGHT = {
  bg: '#f7f4ef',
  text: '#1c140f',
  muted: '#6b5d52',
  selectedFill: '#2f4a5c',
  onSelected: '#f7f4ef',
};

describe('workspace chrome contrast', () => {
  it.each([
    ['dark selected control', DARK.onSelected, DARK.selectedFill],
    ['light selected control', LIGHT.onSelected, LIGHT.selectedFill],
    ['dark body text', DARK.text, DARK.bg],
    ['light body text', LIGHT.text, LIGHT.bg],
    ['dark muted text', DARK.muted, DARK.bg],
    ['light muted text', LIGHT.muted, LIGHT.bg],
  ])('%s meets WCAG AA', (_name, foreground, background) => {
    expect(meetsAaText(foreground, background)).toBe(true);
  });
});
