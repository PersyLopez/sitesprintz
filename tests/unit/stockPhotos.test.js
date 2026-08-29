import { describe, it, expect } from 'vitest';
import { allowsDemoStockPhotos, filterStockImages, isStockImageUrl } from '../../src/utils/stockPhotos.js';

describe('stockPhotos', () => {
  it('detects Unsplash hosts', () => {
    expect(isStockImageUrl('https://images.unsplash.com/photo-1')).toBe(true);
    expect(isStockImageUrl('https://example.com/storefront.jpg')).toBe(false);
    expect(isStockImageUrl('')).toBe(false);
  });

  it('filters stock images unless allowStock is set', () => {
    const images = [
      { src: 'https://images.unsplash.com/photo-1', alt: 'Stock' },
      { src: 'https://cdn.example.com/shop.jpg', alt: 'Real' },
    ];
    expect(filterStockImages(images)).toHaveLength(1);
    expect(filterStockImages(images, { allowStock: true })).toHaveLength(2);
  });

  it('does not treat the first-party insert as stock', () => {
    expect(isStockImageUrl('/assets/hero-placeholder.jpg')).toBe(false);
  });

  it('allows stock on demo seeds via _demo or settings.demoMode', () => {
    expect(allowsDemoStockPhotos({})).toBe(false);
    expect(allowsDemoStockPhotos({ _demo: true })).toBe(true);
    expect(allowsDemoStockPhotos({ settings: { demoMode: true } })).toBe(true);
    expect(allowsDemoStockPhotos({ settings: { demoMode: false } })).toBe(false);
  });
});
