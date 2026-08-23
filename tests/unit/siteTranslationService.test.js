import { describe, it, expect, vi } from 'vitest';
import { attachSpanishLocale, hashSourceStrings } from '../../server/services/siteTranslationService.js';
import { collectTranslatableStrings } from '../../src/utils/localeOverlay.js';

function mockTranslate(map) {
  return vi.fn(async (_url, init) => {
    const body = JSON.parse(init.body);
    const translations = (body.q || []).map((text) => ({
      translatedText: map[text] || `ES:${text}`,
    }));
    return {
      ok: true,
      json: async () => ({ data: { translations } }),
      text: async () => '',
    };
  });
}

describe('attachSpanishLocale', () => {
  const siteData = {
    brand: { name: 'Maria Bakery' },
    phone: '555-123-4567',
    address: '123 Main St',
    sections: [
      {
        type: 'hero',
        content: {
          title: 'Fresh bread',
          body: 'We bake daily',
          price: '$12.00',
        },
      },
    ],
  };

  it('stores locales.es from a mocked Translation API', async () => {
    const fetchFn = mockTranslate({
      'Fresh bread': 'Pan fresco',
      'We bake daily': 'Horneamos diario',
    });

    const result = await attachSpanishLocale(siteData, { apiKey: 'test-key', fetchFn });

    expect(fetchFn).toHaveBeenCalled();
    expect(result.locales.es.strings).toMatchObject({
      'sections.0.content.title': 'Pan fresco',
      'sections.0.content.body': 'Horneamos diario',
    });
    expect(Object.values(result.locales.es.strings)).not.toContain('555-123-4567');
    expect(result.locales.es.sourceHash).toBe(hashSourceStrings(collectTranslatableStrings(siteData)));
  });

  it('skips the API when source hash already matches', async () => {
    const strings = { 'sections.0.content.title': 'Pan fresco' };
    const hashed = {
      ...siteData,
      locales: {
        es: {
          strings,
          sourceHash: hashSourceStrings(collectTranslatableStrings(siteData)),
        },
      },
    };
    const fetchFn = mockTranslate({});
    const result = await attachSpanishLocale(hashed, { apiKey: 'test-key', fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.locales.es.strings).toEqual(strings);
  });

  it('leaves body copy in English when the API key is missing', async () => {
    const fetchFn = mockTranslate({});
    const result = await attachSpanishLocale(siteData, { apiKey: '', fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.locales).toBeUndefined();
  });
});
