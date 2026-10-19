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

  it('writes contact.phone to the top-level, contact object, and contact section', () => {
    const data = {
      contactPhone: '555-0001',
      contact: { phone: '555-0001' },
      sections: [{ type: 'contact', content: { phone: '555-0001' } }],
    };
    applyEditableField(data, 'contact.phone', '(555) 010-2030');
    expect(data.contactPhone).toBe('(555) 010-2030');
    expect(data.contact.phone).toBe('(555) 010-2030');
    expect(data.sections.find((s) => s.type === 'contact').content.phone).toBe('(555) 010-2030');
  });

  it('writes contact.hours to businessHours, contact, and only hero/hours sections', () => {
    const data = {
      sections: [
        { type: 'hero', content: { title: 'Hi', hoursLine: 'Mon 9-5' } },
        { type: 'hours', content: { hours: 'Mon 9-5' } },
        { type: 'services', content: { items: [{ name: 'Cut' }] } },
      ],
    };
    applyEditableField(data, 'contact.hours', 'Mon-Fri 9-5');
    expect(data.businessHours).toBe('Mon-Fri 9-5');
    expect(data.contact.hours).toBe('Mon-Fri 9-5');
    expect(data.sections[0].content.hoursLine).toBe('Mon-Fri 9-5');
    expect(data.sections[1].content.hours).toBe('Mon-Fri 9-5');
    expect(data.sections[2].content.hours).toBeUndefined();
    expect(data.sections[2].content.hoursLine).toBeUndefined();
  });

  it('writes contact.address only as a service area label in area display mode', () => {
    const data = {
      contactAddress: '12 Main St',
      contact: { address: '12 Main St', addressDisplay: 'area', serviceAreaLabel: 'Montclair' },
      sections: [{ type: 'contact', content: { address: '12 Main St' } }],
    };
    applyEditableField(data, 'contact.address', 'Essex County');
    expect(data.contact.serviceAreaLabel).toBe('Essex County');
    expect(data.contact.address).toBe('12 Main St');
    expect(data.contactAddress).toBe('12 Main St');
    expect(data.contact.privateStreet).toBeUndefined();
    expect(data.sections[0].content.address).toBe('12 Main St');
  });

  it('parses the public area line into label and radius in area display mode', () => {
    const data = {
      contact: { addressDisplay: 'area', serviceAreaLabel: 'Montclair', serviceRadiusMiles: 10 },
      sections: [{ type: 'contact', content: {} }],
    };
    applyEditableField(data, 'contact.address', 'Serving Essex County · within 25 miles');
    expect(data.contact.serviceAreaLabel).toBe('Essex County');
    expect(data.contact.serviceRadiusMiles).toBe(25);
    expect(data.contact.address).toBeUndefined();
    expect(data.contactAddress).toBeUndefined();
    expect(data.contact.privateStreet).toBeUndefined();
    expect(data.sections[0].content.address).toBeUndefined();
  });

  it('keeps a plain area label and the existing radius when no wrapper is typed', () => {
    const data = {
      contact: { addressDisplay: 'area', serviceAreaLabel: 'Montclair', serviceRadiusMiles: 10 },
    };
    applyEditableField(data, 'contact.address', 'Essex County');
    expect(data.contact.serviceAreaLabel).toBe('Essex County');
    expect(data.contact.serviceRadiusMiles).toBe(10);
  });

  it('defaults missing version to 1', () => {
    expect(getSiteDataVersion({})).toBe(1);
    expect(getSiteDataVersion({ version: 4 })).toBe(4);
  });
});
