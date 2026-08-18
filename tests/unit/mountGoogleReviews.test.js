import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountGoogleReviews } from '../../src/utils/mountGoogleReviews.js';

describe('mountGoogleReviews', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('inserts Google reviews when the API returns data', async () => {
    document.body.innerHTML = '<div data-testid="reviews-widget" data-place-id="ChIJ-test"><div data-google-reviews-live></div></div>';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        rating: 4.8,
        user_ratings_total: 12,
        reviews: [{ author_name: 'Ada', text: 'Great cut', rating: 5 }],
      }),
    })));

    await mountGoogleReviews(document);

    expect(document.querySelector('[data-testid="google-reviews-rating"]')?.textContent).toContain('4.8');
    expect(document.body.textContent).toContain('Great cut');
    expect(document.body.textContent).toContain('Ada');
  });

  it('fails closed when the API errors', async () => {
    document.body.innerHTML = '<div data-testid="reviews-widget" data-place-id="ChIJ-test"><p>Static quote</p></div>';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));

    await mountGoogleReviews(document);

    expect(document.body.textContent).toContain('Static quote');
  });
});
