import { describe, it, expect } from 'vitest';
import {
  collectTranslatableStrings,
  applyLocaleOverlay,
} from '../../src/utils/localeOverlay.js';

const siteData = {
  brand: { name: 'Maria Bakery' },
  phone: '555-123-4567',
  email: 'maria@example.com',
  address: '123 Main St',
  sections: [
    {
      type: 'hero',
      enabled: true,
      content: {
        title: 'Fresh bread every morning',
        body: 'We bake daily',
        price: '$10',
        phone: '555-999-0000',
        href: 'https://maria.example.com',
      },
    },
  ],
};

describe('localeOverlay', () => {
  it('collects copy and skips brand, NAP, prices, and URLs', () => {
    const strings = collectTranslatableStrings(siteData);
    const values = Object.values(strings);

    expect(values).toContain('Fresh bread every morning');
    expect(values).toContain('We bake daily');
    expect(values).not.toContain('Maria Bakery');
    expect(values).not.toContain('555-123-4567');
    expect(values).not.toContain('maria@example.com');
    expect(values).not.toContain('123 Main St');
    expect(values).not.toContain('$10');
    expect(values).not.toContain('555-999-0000');
    expect(values).not.toContain('https://maria.example.com');
  });

  it('skips privateStreet so it is not copied into the Spanish overlay', () => {
    const strings = collectTranslatableStrings({
      contact: { privateStreet: '429 Walnut Avenue, Trenton, NJ', serviceAreaLabel: 'Trenton, NJ' },
    });
    expect(Object.values(strings)).not.toContain('429 Walnut Avenue, Trenton, NJ');
    expect(Object.values(strings)).toContain('Trenton, NJ');
  });

  it('applies Spanish overlay without changing skipped fields', () => {
    const overlay = {
      ...siteData,
      locales: {
        es: {
          sourceHash: 'test',
          strings: {
            'sections.0.content.title': 'Pan fresco cada mañana',
            'sections.0.content.body': 'Horneamos diario',
          },
        },
      },
    };

    const localized = applyLocaleOverlay(overlay, 'es');
    expect(localized.sections[0].content.title).toBe('Pan fresco cada mañana');
    expect(localized.sections[0].content.body).toBe('Horneamos diario');
    expect(localized.brand.name).toBe('Maria Bakery');
    expect(localized.phone).toBe('555-123-4567');
    expect(localized.address).toBe('123 Main St');
    expect(localized.sections[0].content.price).toBe('$10');
  });

  it('leaves English copy unchanged when locale is en', () => {
    const overlay = {
      ...siteData,
      locales: {
        es: {
          strings: { 'sections.0.content.title': 'Pan fresco' },
        },
      },
    };
    expect(applyLocaleOverlay(overlay, 'en').sections[0].content.title).toBe('Fresh bread every morning');
  });
});
