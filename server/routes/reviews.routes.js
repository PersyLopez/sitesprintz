/**
 * Reviews API Routes
 * Endpoints for fetching Google Reviews
 */

import express from 'express';
import ReviewsService from '../services/reviewsService.js';

const router = express.Router();

/**
 * GET /api/reviews/:placeId
 * Fetch reviews for a Google Place (public endpoint with caching)
 */
router.get('/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({ error: 'Place ID is required' });
    }

    const reviews = await ReviewsService.fetchReviews(placeId);

    res.json(reviews);
  } catch (error) {
    console.error('Reviews fetch error:', error);
    
    // Send appropriate status code based on error
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({ error: error.message });
    }
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * DELETE /api/reviews/cache/:placeId
 * Clear cache for a specific place (authenticated)
 */
router.delete('/cache/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;

    ReviewsService.clearCache(placeId);

    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * GET /api/reviews/cache/stats
 * Get cache statistics (authenticated, for monitoring)
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = ReviewsService.getCacheStats();

    res.json(stats);
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({ error: 'Failed to fetch cache stats' });
  }
});

export default router;

