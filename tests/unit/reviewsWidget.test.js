/**
 * Unit Tests for Google Reviews Widget
 * TDD Approach: RED phase - Define tests first
 * 
 * Reviews Widget should:
 * - Fetch reviews from Google Places API
 * - Cache reviews to reduce API calls
 * - Display star ratings
 * - Show review text and author
 * - Support configurable display count
 * - Handle API errors gracefully
 * - Respect rate limits
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Will implement these
let ReviewsWidget;
let ReviewsService;

describe('Google Reviews Widget', () => {
  let window, document;

  beforeEach(async () => {
    // Setup JSDOM
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="reviews-container"></div></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });
    
    window = dom.window;
    document = dom.window.document;
    global.window = window;
    global.document = document;
    global.fetch = vi.fn();

    // Import modules
    const widgetModule = await import('../../public/modules/reviews-widget.js');
    ReviewsWidget = widgetModule.default || window.ReviewsWidget;

    const serviceModule = await import('../../server/services/reviewsService.js');
    ReviewsService = serviceModule.default || serviceModule.ReviewsService;
    
    // Clear cache between tests
    if (ReviewsService) {
      ReviewsService.clearCache();
    }
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.fetch;
  });

  describe('ReviewsWidget (Client)', () => {
    describe('Initialization', () => {
      it('should create a widget instance', () => {
        const widget = new ReviewsWidget({
          placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
          containerId: 'reviews-container'
        });

        expect(widget).toBeDefined();
        expect(widget.config.placeId).toBe('ChIJN1t_tDeuEmsRUsoyG83frY4');
      });

      it('should fetch reviews on init', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            reviews: [
              {
                author_name: 'John Doe',
                rating: 5,
                text: 'Great service!',
                time: 1699564800
              }
            ],
            rating: 4.5,
            user_ratings_total: 120
          })
        });

        const widget = new ReviewsWidget({
          placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
          containerId: 'reviews-container'
        });

        await widget.init();

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/reviews/'),
          expect.any(Object)
        );
      });

      it('should not fetch if placeId is missing', async () => {
        const widget = new ReviewsWidget({
          containerId: 'reviews-container'
        });

        await widget.init();

        expect(fetch).not.toHaveBeenCalled();
      });
    });

    describe('Display', () => {
      it('should render star ratings', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            reviews: [
              { author_name: 'John', rating: 5, text: 'Great!', time: 1699564800 }
            ],
            rating: 4.5,
            user_ratings_total: 120
          })
        });

        const widget = new ReviewsWidget({
          placeId: 'test-place',
          containerId: 'reviews-container'
        });

        await widget.init();

        const container = document.getElementById('reviews-container');
        expect(container.innerHTML).toContain('★');
      });

      it('should display review text', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            reviews: [
              { author_name: 'John Doe', rating: 5, text: 'Excellent service!', time: 1699564800 }
            ],
            rating: 4.5,
            user_ratings_total: 120
          })
        });

        const widget = new ReviewsWidget({
          placeId: 'test-place',
          containerId: 'reviews-container'
        });

        await widget.init();

        const container = document.getElementById('reviews-container');
        expect(container.textContent).toContain('Excellent service!');
        expect(container.textContent).toContain('John Doe');
      });

      it('should limit displayed reviews to maxReviews', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            reviews: [
              { author_name: 'John', rating: 5, text: 'Great!', time: 1699564800 },
              { author_name: 'Jane', rating: 4, text: 'Good', time: 1699564800 },
              { author_name: 'Bob', rating: 5, text: 'Amazing', time: 1699564800 }
            ],
            rating: 4.7,
            user_ratings_total: 120
          })
        });

        const widget = new ReviewsWidget({
          placeId: 'test-place',
          containerId: 'reviews-container',
          maxReviews: 2
        });

        await widget.init();

        const container = document.getElementById('reviews-container');
        const reviewElements = container.querySelectorAll('.review-card');
        expect(reviewElements.length).toBe(2);
      });

      it('should display overall rating and count', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            reviews: [],
            rating: 4.8,
            user_ratings_total: 250
          })
        });

        const widget = new ReviewsWidget({
          placeId: 'test-place',
          containerId: 'reviews-container'
        });

        await widget.init();

        const container = document.getElementById('reviews-container');
        expect(container.textContent).toContain('4.8');
        expect(container.textContent).toContain('250');
      });
    });

    describe('Error Handling', () => {
      it('should handle API errors gracefully', async () => {
        global.fetch.mockRejectedValueOnce(new Error('API Error'));

        const widget = new ReviewsWidget({
          placeId: 'test-place',
          containerId: 'reviews-container'
        });

        await widget.init();

        const container = document.getElementById('reviews-container');
        expect(container.textContent).toContain('Unable to load reviews');
      });

      it('should handle empty reviews', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            reviews: [],
            rating: 0,
            user_ratings_total: 0
          })
        });

        const widget = new ReviewsWidget({
          placeId: 'test-place',
          containerId: 'reviews-container'
        });

        await widget.init();

        const container = document.getElementById('reviews-container');
        expect(container.textContent).toContain('No reviews yet');
      });
    });

    describe('Formatting', () => {
      it('should format relative time', async () => {
        const now = Date.now() / 1000;
        const threeDaysAgo = now - (3 * 24 * 60 * 60);

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            reviews: [
              { author_name: 'John', rating: 5, text: 'Great!', time: threeDaysAgo }
            ],
            rating: 5,
            user_ratings_total: 1
          })
        });

        const widget = new ReviewsWidget({
          placeId: 'test-place',
          containerId: 'reviews-container'
        });

        await widget.init();

        const container = document.getElementById('reviews-container');
        expect(container.textContent).toMatch(/\d+ days? ago/);
      });

      it('should truncate long reviews with "Read more"', async () => {
        const longText = 'A'.repeat(300);

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            reviews: [
              { author_name: 'John', rating: 5, text: longText, time: 1699564800 }
            ],
            rating: 5,
            user_ratings_total: 1
          })
        });

        const widget = new ReviewsWidget({
          placeId: 'test-place',
          containerId: 'reviews-container',
          maxLength: 150
        });

        await widget.init();

        const container = document.getElementById('reviews-container');
        expect(container.textContent).toContain('...');
        expect(container.textContent).toContain('Read more');
      });
    });
  });

  describe('ReviewsService (Backend)', () => {
    describe('fetchReviews()', () => {
      it('should fetch reviews from Google Places API', async () => {
        const mockApiResponse = {
          result: {
            reviews: [
              {
                author_name: 'John Doe',
                rating: 5,
                text: 'Great service!',
                time: 1699564800,
                profile_photo_url: 'https://example.com/photo.jpg'
              }
            ],
            rating: 4.5,
            user_ratings_total: 120
          },
          status: 'OK'
        };

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        });

        const reviews = await ReviewsService.fetchReviews('test-place-id');

        expect(reviews.reviews).toHaveLength(1);
        expect(reviews.rating).toBe(4.5);
        expect(reviews.user_ratings_total).toBe(120);
      });

      it('should cache reviews for 24 hours', async () => {
        const mockApiResponse = {
          result: {
            reviews: [{ author_name: 'John', rating: 5, text: 'Great!', time: 1699564800 }],
            rating: 5,
            user_ratings_total: 1
          },
          status: 'OK'
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockApiResponse
        });

        // First call
        await ReviewsService.fetchReviews('test-place-id');
        
        // Second call should use cache
        await ReviewsService.fetchReviews('test-place-id');

        // Should only call API once
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('should handle API rate limit errors', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ error_message: 'Rate limit exceeded' })
        });

        await expect(ReviewsService.fetchReviews('test-place-id'))
          .rejects.toThrow('Rate limit exceeded');
      });

      it('should handle invalid place ID', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'INVALID_REQUEST',
            error_message: 'Invalid place ID'
          })
        });

        await expect(ReviewsService.fetchReviews('invalid-id'))
          .rejects.toThrow('Invalid place ID');
      });

      it('should filter out reviews without text', async () => {
        const mockApiResponse = {
          result: {
            reviews: [
              { author_name: 'John', rating: 5, text: 'Great!', time: 1699564800 },
              { author_name: 'Jane', rating: 4, text: '', time: 1699564800 },
              { author_name: 'Bob', rating: 5, text: 'Amazing', time: 1699564800 }
            ],
            rating: 4.7,
            user_ratings_total: 3
          },
          status: 'OK'
        };

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        });

        const reviews = await ReviewsService.fetchReviews('test-place-id');

        // Should only include reviews with text
        expect(reviews.reviews).toHaveLength(2);
      });
    });

    describe('Cache Management', () => {
      it('should provide cache clear method', () => {
        ReviewsService.clearCache('test-place-id');
        
        // Should not throw
        expect(true).toBe(true);
      });

      it('should provide cache stats method', () => {
        const stats = ReviewsService.getCacheStats();
        
        expect(stats).toHaveProperty('size');
        expect(stats).toHaveProperty('hits');
        expect(stats).toHaveProperty('misses');
      });
    });
  });
});

