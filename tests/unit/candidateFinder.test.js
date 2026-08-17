import { describe, it, expect } from 'vitest';
import {
  classifyWebsite,
  mapTypesToNiche,
  parsePlaceIdFromMapsUrl,
  scoreCandidate,
} from '../../server/services/outreach/candidateFinder.js';

const fitBase = {
  name: 'Riverside Cuts',
  address: '12 Main St, Austin, TX',
  phone: '512-555-0100',
  businessStatus: 'OPERATIONAL',
};

describe('classifyWebsite', () => {
  it('returns none for empty or whitespace', () => {
    expect(classifyWebsite('')).toBe('none');
    expect(classifyWebsite('   ')).toBe('none');
    expect(classifyWebsite(null)).toBe('none');
    expect(classifyWebsite(undefined)).toBe('none');
  });

  it('returns social for facebook, instagram, linktree, nolt', () => {
    expect(classifyWebsite('https://www.facebook.com/riversidecuts')).toBe('social');
    expect(classifyWebsite('https://fb.com/riversidecuts')).toBe('social');
    expect(classifyWebsite('https://instagram.com/riversidecuts')).toBe('social');
    expect(classifyWebsite('https://linktr.ee/riversidecuts')).toBe('social');
    expect(classifyWebsite('https://linktree.com/riversidecuts')).toBe('social');
    expect(classifyWebsite('https://riversidecuts.nolt.io')).toBe('social');
  });

  it('returns real for builders and any other http(s) site', () => {
    expect(classifyWebsite('https://riverside.wixsite.com')).toBe('real');
    expect(classifyWebsite('https://riverside.squarespace.com')).toBe('real');
    expect(classifyWebsite('https://riverside.myshopify.com')).toBe('real');
    expect(classifyWebsite('https://riverside.wordpress.com')).toBe('real');
    expect(classifyWebsite('https://riverside.godaddysites.com')).toBe('real');
    expect(classifyWebsite('https://riverside.squares.site')).toBe('real');
    expect(classifyWebsite('https://riverside.sitesprintz.com')).toBe('real');
    expect(classifyWebsite('https://riversidecuts.com')).toBe('real');
  });
});

describe('scoreCandidate — rejects', () => {
  it('fails when business_status is present and not OPERATIONAL', () => {
    const result = scoreCandidate({ ...fitBase, businessStatus: 'CLOSED_PERMANENTLY' });
    expect(result.fit).toBe(false);
  });

  it('fails when name is missing', () => {
    const result = scoreCandidate({ ...fitBase, name: '  ' });
    expect(result.fit).toBe(false);
  });

  it('fails when address and phone are both missing', () => {
    const result = scoreCandidate({ ...fitBase, address: '', phone: '' });
    expect(result.fit).toBe(false);
  });

  it('fails when website_kind is real (custom domain or builder)', () => {
    const custom = scoreCandidate({ ...fitBase, website: 'https://riversidecuts.com' });
    expect(custom.websiteKind).toBe('real');
    expect(custom.fit).toBe(false);

    const wix = scoreCandidate({ ...fitBase, website: 'https://foo.wixsite.com/salon' });
    expect(wix.websiteKind).toBe('real');
    expect(wix.fit).toBe(false);
  });

  it('still fits social-only websites', () => {
    const result = scoreCandidate({
      ...fitBase,
      website: 'https://www.facebook.com/riversidecuts',
    });
    expect(result.websiteKind).toBe('social');
    expect(result.fit).toBe(true);
    expect(result.reasons).toContain('Facebook-only page');
  });
});

describe('scoreCandidate — additive score', () => {
  it('scores a no-website salon with reviews, hours, photos, phone', () => {
    const result = scoreCandidate({
      ...fitBase,
      website: '',
      rating: 4.6,
      reviewCount: 42,
      openingHours: { weekday_text: ['Mon: 9–5'] },
      photoCount: 3,
      types: ['beauty_salon', 'hair_care', 'point_of_interest'],
    });

    expect(result.fit).toBe(true);
    expect(result.websiteKind).toBe('none');
    expect(result.niche).toBe('salon');
    expect(result.layoutKey).toBe('atelier');
    expect(result.score).toBe(25 + 15 + 15 + 10 + 10 + 10 + 10);
    expect(result.reasons).toContain('No website');
    expect(result.reasons).toContain('4.6 from 42 reviews');
    expect(result.reasons).toContain('Has hours');
    expect(result.reasons).toContain('Has photos');
    expect(result.reasons).toContain('Has phone');
    expect(result.reasons).toContain('Matches salon niche');
  });

  it('adds +15 for social-only instead of +25', () => {
    const result = scoreCandidate({
      ...fitBase,
      website: 'https://instagram.com/gym',
      types: ['gym'],
    });
    expect(result.score).toBe(15 + 10 + 10); // social + phone + gym niche
    expect(result.reasons).toContain('Instagram-only page');
  });

  it('treats open_now false as having hours', () => {
    const result = scoreCandidate({
      ...fitBase,
      openingHours: { open_now: false },
    });
    expect(result.hasHours).toBe(true);
    expect(result.reasons).toContain('Has hours');
  });

  it('does not add review bonus outside 8–400', () => {
    const low = scoreCandidate({ ...fitBase, rating: 4.9, reviewCount: 7 });
    expect(low.reasons.some((r) => r.includes('reviews'))).toBe(false);
    expect(low.score).toBe(25 + 15 + 10); // none + rating + phone

    const high = scoreCandidate({ ...fitBase, rating: 4.9, reviewCount: 401 });
    expect(high.reasons.some((r) => r.includes('from 401'))).toBe(false);
  });

  it('clamps score to 0–100', () => {
    const result = scoreCandidate({
      ...fitBase,
      rating: 5,
      reviewCount: 8,
      openingHours: { open_now: true },
      photoCount: 1,
      types: ['hair_care'],
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('maps bakery to mercantile / restaurant with type bonus', () => {
    const result = scoreCandidate({
      ...fitBase,
      types: ['bakery', 'store', 'food', 'point_of_interest'],
    });
    expect(result.niche).toBe('restaurant');
    expect(result.layoutKey).toBe('mercantile');
    expect(result.reasons).toContain('Matches restaurant niche');
  });

  it('maps food_truck before generic restaurant', () => {
    const result = scoreCandidate({
      ...fitBase,
      types: ['food_truck', 'restaurant', 'food'],
    });
    expect(result.niche).toBe('food-stall');
    expect(result.layoutKey).toBe('bazaar');
  });

  it('falls back to atelier / unknown without type bonus', () => {
    const result = scoreCandidate({
      ...fitBase,
      types: ['point_of_interest', 'establishment'],
    });
    expect(result.niche).toBe('unknown');
    expect(result.layoutKey).toBe('atelier');
    expect(result.reasons.some((r) => r.startsWith('Matches'))).toBe(false);
    expect(result.score).toBe(25 + 10); // none + phone
  });

  it('treats unknown / unparseable website as none', () => {
    const result = scoreCandidate({ ...fitBase, website: 'not a url' });
    expect(result.websiteKind).toBe('none');
    expect(result.fit).toBe(true);
  });
});

describe('mapTypesToNiche', () => {
  it('maps craftsman and counsel types', () => {
    expect(mapTypesToNiche(['plumber'])).toMatchObject({ layoutKey: 'craftsman', niche: 'plumbing', matched: true });
    expect(mapTypesToNiche(['moving_company'])).toMatchObject({ layoutKey: 'craftsman', niche: 'cleaning', matched: true });
    expect(mapTypesToNiche(['lawyer'])).toMatchObject({ layoutKey: 'counsel', niche: 'consultant', matched: true });
    expect(mapTypesToNiche(['clothing_store'])).toMatchObject({
      layoutKey: 'mercantile',
      niche: 'product-showcase',
      matched: true,
    });
  });
});

describe('parsePlaceIdFromMapsUrl', () => {
  const pid = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

  it('parses place_id query, q=place_id, and query_place_id', () => {
    expect(parsePlaceIdFromMapsUrl(`https://www.google.com/maps?place_id=${pid}`)).toBe(pid);
    expect(parsePlaceIdFromMapsUrl(`https://www.google.com/maps/place/?q=place_id:${pid}`)).toBe(pid);
    expect(
      parsePlaceIdFromMapsUrl(`https://www.google.com/maps/search/?api=1&query=Cafe&query_place_id=${pid}`)
    ).toBe(pid);
  });

  it('parses place id from /maps/place/ChIJ… path', () => {
    expect(parsePlaceIdFromMapsUrl(`https://www.google.com/maps/place/${pid}/@30.2,-97.7,17z`)).toBe(pid);
  });

  it('returns null when no place id is present', () => {
    expect(parsePlaceIdFromMapsUrl('https://www.google.com/maps/place/Joe%27s+Pizza')).toBeNull();
    expect(parsePlaceIdFromMapsUrl('')).toBeNull();
    expect(parsePlaceIdFromMapsUrl(null)).toBeNull();
  });
});
