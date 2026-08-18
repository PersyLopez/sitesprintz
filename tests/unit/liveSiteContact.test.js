import { describe, it, expect } from 'vitest';
import {
  resolvePrimaryCta,
  resolveSitePhone,
  shouldRemoveBranding,
  telHref,
} from '../../src/utils/liveSiteContact.js';

describe('liveSiteContact', () => {
  it('builds a digit-only tel href', () => {
    expect(telHref('(555) 010-0')).toBe('tel:5550100');
    expect(telHref('')).toBe('');
  });

  it('maps layout intent to a header CTA', () => {
    expect(resolvePrimaryCta({ _layout: 'atelier' }).href).toBe('#booking');
    expect(resolvePrimaryCta({ _layout: 'craftsman' }).label).toBe('Get a Quote');
    expect(resolvePrimaryCta({ _layout: 'mercantile' }).href).toBe('#catalog');
  });

  it('reads phone from contact or a contact section', () => {
    expect(resolveSitePhone({ contactPhone: '555-1' })).toBe('555-1');
    expect(resolveSitePhone({
      sections: [{ type: 'contact', content: { phone: '555-2' } }],
    })).toBe('555-2');
  });

  it('removes branding on Growth and when the setting is set', () => {
    expect(shouldRemoveBranding({ plan: 'growth' })).toBe(true);
    expect(shouldRemoveBranding({ settings: { removeBranding: true } })).toBe(true);
    expect(shouldRemoveBranding({ plan: 'starter' })).toBe(false);
  });
});
