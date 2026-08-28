import { describe, it, expect } from 'vitest';
import {
  PHOTO_INSERT_SRC,
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
});
