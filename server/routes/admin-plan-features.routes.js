/**
 * Admin Plan Features Routes
 * 
 * API endpoints for managing plan feature configuration from admin dashboard
 */

import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { 
  getPlanFeatures, 
  updatePlanFeatures,
  initializePlanFeatures 
} from '../services/planFeaturesService.js';
import { TIERS } from '../../src/config/tiers.js';

const router = express.Router();

// Canonical tier list from tiers.js
const VALID_TIERS = [TIERS.TRIAL, TIERS.STARTER, TIERS.GROWTH];

/**
 * GET /api/admin/plan-features
 * Get current plan features configuration
 */
router.get('/plan-features', requireAdmin, async (req, res) => {
  try {
    // Initialize if needed
    await initializePlanFeatures();
    
    // Get plan features from database
    const planFeatures = await getPlanFeatures();
    
    res.json({
      success: true,
      planFeatures
    });
  } catch (error) {
    console.error('Error fetching plan features:', error);
    res.status(500).json({ error: 'Failed to fetch plan features' });
  }
});

/**
 * PUT /api/admin/plan-features
 * Update plan features configuration
 */
router.put('/plan-features', requireAdmin, async (req, res) => {
  try {
    const { planFeatures } = req.body;

    if (!planFeatures || typeof planFeatures !== 'object') {
      return res.status(400).json({ error: 'Invalid planFeatures data' });
    }

    // Validate plan structure using canonical tiers
    for (const plan of VALID_TIERS) {
      if (!planFeatures[plan] || !Array.isArray(planFeatures[plan])) {
        return res.status(400).json({ 
          error: `Invalid plan features for ${plan}. Must be an array.` 
        });
      }
    }

    // Update in database
    await updatePlanFeatures(planFeatures);

    res.json({
      success: true,
      message: 'Plan features updated successfully',
      planFeatures
    });

  } catch (error) {
    console.error('Error updating plan features:', error);
    res.status(500).json({ 
      error: 'Failed to update plan features',
      details: error.message 
    });
  }
});

export default router;

