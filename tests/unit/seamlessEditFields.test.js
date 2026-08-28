import { describe, it, expect } from 'vitest';
import { applyEditableField, getSiteDataVersion } from '../../src/utils/seamlessEditFields';

describe('applyEditableField', () => {
  it('updates brand name and businessName', () => {
    const data = { brand: { name: 'Old' } };
    applyEditableField(data, 'brand.name', 'Luxe');
    expect(data.brand.name).toBe('Luxe');
    expect(data.businessName).toBe('Luxe');
  });

  it('writes hero title into the sections array and catalog fallbacks', () => {
    const data = {
      sections: [{ type: 'hero', content: { title: 'Old' } }],
    };
    applyEditableField(data, 'hero.title', 'New headline');
    expect(data.sections[0].content.title).toBe('New headline');
    expect(data.hero.title).toBe('New headline');
    expect(data.heroTitle).toBe('New headline');
  });

  it('writes hero image into the section and catalog fallbacks', () => {
    const data = {
      sections: [{ type: 'hero', content: { title: 'Hello' } }],
    };
    applyEditableField(data, 'hero.image', '/uploads/shop.jpg');
    expect(data.sections[0].content.image).toBe('/uploads/shop.jpg');
    expect(data.hero.image).toBe('/uploads/shop.jpg');
    expect(data.heroImage).toBe('/uploads/shop.jpg');
  });

  it('writes a gallery tile src', () => {
    const data = { sections: [{ type: 'gallery', content: {} }] };
    applyEditableField(data, 'gallery.images.0.src', '/uploads/work.jpg');
    expect(data.sections[0].content.images[0].src).toBe('/uploads/work.jpg');
  });

  it('updates a service item name', () => {
    const data = {
      sections: [{ type: 'services', content: { items: [{ name: 'Cut' }] } }],
    };
    applyEditableField(data, 'services.items.0.name', 'Haircut & Style');
    expect(data.sections[0].content.items[0].name).toBe('Haircut & Style');
    expect(data.sections[0].content.items[0].title).toBe('Haircut & Style');
  });

  it('rejects invalid paths', () => {
    expect(() => applyEditableField({}, '..title', 'x')).toThrow(/Invalid field path/);
  });

  it('defaults missing version to 1', () => {
    expect(getSiteDataVersion({})).toBe(1);
    expect(getSiteDataVersion({ version: 4 })).toBe(4);
  });
});
