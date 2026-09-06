import { describe, it, expect } from 'vitest';
import {
  PHOTO_INSERT_SRC,
  genericServiceInsertSrc,
  renderPhotoPlaceholder,
  photoPlaceholderLabel,
} from '../../src/utils/photoPlaceholder.js';
import { isStockImageUrl } from '../../src/utils/stockPhotos.js';

describe('photoPlaceholder', () => {
  it('emits a first-party sample image plus replace label', () => {
    const html = renderPhotoPlaceholder('business');
    expect(html).toContain('data-testid="photo-placeholder"');
    expect(html).toContain('ss-photo-placeholder-img');
    expect(html).toContain(PHOTO_INSERT_SRC);
    expect(html).toContain(photoPlaceholderLabel('business'));
    expect(isStockImageUrl(PHOTO_INSERT_SRC)).toBe(false);
    expect(html).not.toMatch(/unsplash/i);
  });

  it('uses eager load for the hero insert', () => {
    const html = renderPhotoPlaceholder('business', { priority: true });
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="high"');
  });

  it('binds a replace field on the insert', () => {
    const html = renderPhotoPlaceholder('business', { photoField: 'hero.image' });
    expect(html).toContain('data-photo-field="hero.image"');
  });

  describe('genericServiceInsertSrc', () => {
    it('maps auto and salon service names to first-party inserts', () => {
      expect(genericServiceInsertSrc('Oil changes')).toBe('/assets/service-inserts/oil.jpg');
      expect(genericServiceInsertSrc('Tire sales and service')).toBe('/assets/service-inserts/tires.jpg');
      expect(genericServiceInsertSrc('Brake repair')).toBe('/assets/service-inserts/brakes.jpg');
      expect(genericServiceInsertSrc('Nail services')).toBe('/assets/service-inserts/nails.jpg');
      expect(genericServiceInsertSrc('Balayage highlights')).toBe('/assets/service-inserts/balayage.jpg');
      expect(genericServiceInsertSrc('Hair care / haircuts')).toBe('/assets/service-inserts/hair-care.jpg');
      expect(genericServiceInsertSrc('Haircut')).toBe('/assets/service-inserts/haircut.jpg');
      expect(genericServiceInsertSrc('Color')).toBe('/assets/service-inserts/coloring.jpg');
      expect(genericServiceInsertSrc('Highlighting')).toBe('/assets/service-inserts/highlighting.jpg');
      expect(genericServiceInsertSrc('Laser hair removal')).toBe('/assets/service-inserts/laser.svg');
      expect(genericServiceInsertSrc('Bridal styling')).toBe('/assets/service-inserts/bridal.svg');
    });

    it('does not map hair care to haircut scissors insert', () => {
      expect(genericServiceInsertSrc('Hair care / haircuts')).not.toBe('/assets/service-inserts/haircut.jpg');
      expect(genericServiceInsertSrc('Hair care / haircuts')).not.toBe('/assets/service-inserts/haircut.svg');
    });

    it('does not map balayage to color insert', () => {
      expect(genericServiceInsertSrc('Balayage')).not.toBe('/assets/service-inserts/color.svg');
      expect(genericServiceInsertSrc('Balayage highlights')).not.toBe('/assets/service-inserts/color.svg');
    });

    it('returns null for food dishes and unknown names', () => {
      expect(genericServiceInsertSrc('Chicken over rice')).toBeNull();
      expect(genericServiceInsertSrc('Roast beef sandwich')).toBeNull();
      expect(genericServiceInsertSrc('Dosa platter')).toBeNull();
      expect(genericServiceInsertSrc('Falafel wrap')).toBeNull();
      expect(genericServiceInsertSrc('Chocolate cake slice')).toBeNull();
      expect(genericServiceInsertSrc('Custom widget install')).toBeNull();
      expect(genericServiceInsertSrc('')).toBeNull();
    });
  });

  it('uses generic service insert src and offer-specific example label when opts.src is set', () => {
    const src = '/assets/service-inserts/oil.svg';
    const html = renderPhotoPlaceholder('service', {
      src,
      photoField: 'services.items.0.image',
      offerName: 'Oil changes',
    });
    expect(html).toContain(src);
    expect(html).toContain('Example of Oil changes — use your photo here');
    expect(html).not.toContain(PHOTO_INSERT_SRC);
    expect(html).not.toMatch(/unsplash/i);
  });

  it('escapes HTML in offer-specific service labels', () => {
    const html = renderPhotoPlaceholder('service', {
      src: '/assets/service-inserts/oil.svg',
      offerName: 'Oil & lube <special>',
    });
    expect(html).toContain('Example of Oil &amp; lube &lt;special&gt; — use your photo here');
  });
});
