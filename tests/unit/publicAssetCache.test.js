import { describe, expect, it } from 'vitest';
import { marketingHtmlCacheHeader, publicAssetCacheHeader } from '../../server/utils/publicAssetCache.js';

describe('publicAssetCacheHeader', () => {
  it('marks fingerprinted Vite assets under /assets immutable', () => {
    expect(publicAssetCacheHeader('/assets/safeRedirect-DoR8ubSF.js')).toBe('public, max-age=31536000, immutable');
    expect(publicAssetCacheHeader('/assets/AdminSites-k6dTaM6_.js')).toBe('public, max-age=31536000, immutable');
    expect(publicAssetCacheHeader('/assets/Dashboard-CCrN97-I.js')).toBe('public, max-age=31536000, immutable');
    expect(publicAssetCacheHeader('/assets/layouts-F-IlsBQc.js')).toBe('public, max-age=31536000, immutable');
    expect(publicAssetCacheHeader('/assets/index-a1b2c3d4e5.css')).toBe('public, max-age=31536000, immutable');
    expect(publicAssetCacheHeader('/some/app/assets/main-9f8e7d6c5b.mjs')).toBe('public, max-age=31536000, immutable');
    expect(publicAssetCacheHeader('/repo/public/assets/chunk-Ab12Cd34.js')).toBe('public, max-age=31536000, immutable');
  });

  it('leaves all-lowercase hash segments (mutable words) on the existing default', () => {
    expect(publicAssetCacheHeader('/assets/hero-placeholder.jpg')).toBeNull();
    expect(publicAssetCacheHeader('/assets/hero-placeholder.svg')).toBeNull();
    expect(publicAssetCacheHeader('/assets/og-image.jpg')).toBeNull();
    expect(publicAssetCacheHeader('/assets/logo.svg')).toBeNull();
    expect(publicAssetCacheHeader('/assets/favicon.svg')).toBeNull();
    expect(publicAssetCacheHeader('/assets/app.js')).toBeNull();
  });

  it('only caches direct children of an assets directory', () => {
    expect(publicAssetCacheHeader('/css/styles-a1b2c3d4.css')).toBeNull();
    expect(publicAssetCacheHeader('/sites/wren-hair-studio/assets/site-1a2b3c4d.json')).toBeNull();
    expect(publicAssetCacheHeader('/sites/wren-hair-studio/index-B2w3xY9a.js')).toBeNull();
    expect(publicAssetCacheHeader('/assets')).toBeNull();
    expect(publicAssetCacheHeader('')).toBeNull();
    expect(publicAssetCacheHeader(null)).toBeNull();
  });
});

describe('marketingHtmlCacheHeader', () => {
  it('revalidates the marketing HTML shells', () => {
    expect(marketingHtmlCacheHeader('index.html')).toBe('public, max-age=0, must-revalidate');
    expect(marketingHtmlCacheHeader('view.html')).toBe('public, max-age=0, must-revalidate');
  });

  it('leaves other documents on the existing default', () => {
    expect(marketingHtmlCacheHeader('connect.html')).toBeNull();
    expect(marketingHtmlCacheHeader(null)).toBeNull();
  });
});