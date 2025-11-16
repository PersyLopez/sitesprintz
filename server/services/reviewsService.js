/**
 * Google Reviews Service
 * Fetches and caches reviews from Google Places API
 * 
 * Features:
 * - Google Places API integration
 * - 24-hour caching to reduce API calls
 * - Rate limit handling
 * - Review filtering (text-only)
 * - Cache statistics
 */

// In-memory cache
const reviewsCache = new Map();
const cacheStats = {
  hits: 0,
  misses: 0
};

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

class ReviewsService {
  /**
   * Fetch reviews for a place from Google Places API
   */
  static async fetchReviews(placeId) {
    if (!placeId) {
      throw new Error('Place ID is required');
    }

    // Check cache first
    const cached = this.getFromCache(placeId);
    if (cached) {
      cacheStats.hits++;
      return cached;
    }

    cacheStats.misses++;

    // Fetch from Google Places API
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&key=${GOOGLE_PLACES_API_KEY}`;
      
      // Use global.fetch if available (for testing), otherwise use regular fetch
      const fetchFn = typeof global !== 'undefined' && global.fetch ? global.fetch : fetch;
      const response = await fetchFn(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(data.error_message || `API error: ${data.status}`);
      }

      const result = {
        reviews: (data.result.reviews || []).filter(review => review.text && review.text.trim()),
        rating: data.result.rating || 0,
        user_ratings_total: data.result.user_ratings_total || 0
      };

      // Cache the result
      this.setCache(placeId, result);

      return result;
    } catch (error) {
      // If it's a known error, rethrow
      if (error.message.includes('Rate limit') || error.message.includes('Invalid') || error.message.includes('API error')) {
        throw error;
      }
      // Otherwise wrap in generic error
      throw new Error(`Failed to fetch reviews: ${error.message}`);
    }
  }

  /**
   * Get reviews from cache if not expired
   */
  static getFromCache(placeId) {
    const cached = reviewsCache.get(placeId);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > CACHE_TTL) {
      // Cache expired
      reviewsCache.delete(placeId);
      return null;
    }

    return cached.data;
  }

  /**
   * Store reviews in cache
   */
  static setCache(placeId, data) {
    reviewsCache.set(placeId, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache for a specific place or all places
   */
  static clearCache(placeId = null) {
    if (placeId) {
      reviewsCache.delete(placeId);
    } else {
      reviewsCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      size: reviewsCache.size,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: cacheStats.hits + cacheStats.misses > 0
        ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2)
        : 0
    };
  }
}

export default ReviewsService;
export { ReviewsService };

