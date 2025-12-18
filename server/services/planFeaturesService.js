/**
 * Plan Features Service
 * 
 * Manages plan feature configuration from database
 * Falls back to planFeatures.js if database not available
 */

import { prisma } from '../../database/db.js';
import { PLAN_FEATURES as DEFAULT_PLAN_FEATURES } from '../../src/utils/planFeatures.js';

// Cache for plan features (refreshed on updates)
let planFeaturesCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load plan features from database
 * Returns object: { free: [...], starter: [...], pro: [...], premium: [...] }
 */
export async function loadPlanFeaturesFromDB() {
  try {
    const features = await prisma.$queryRaw`
      SELECT plan, feature, enabled
      FROM plan_features
      WHERE enabled = true
      ORDER BY plan, feature
    `;

    // Group by plan
    const planFeatures = {
      free: [],
      starter: [],
      pro: [],
      premium: []
    };

    features.forEach(row => {
      if (planFeatures[row.plan]) {
        planFeatures[row.plan].push(row.feature);
      }
    });

    return planFeatures;
  } catch (error) {
    console.error('Error loading plan features from database:', error);
    // Fall back to default configuration
    return DEFAULT_PLAN_FEATURES;
  }
}

/**
 * Get plan features (with caching)
 */
export async function getPlanFeatures() {
  const now = Date.now();
  
  // Return cached if still valid
  if (planFeaturesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return planFeaturesCache;
  }

  // Load from database
  planFeaturesCache = await loadPlanFeaturesFromDB();
  cacheTimestamp = now;
  
  return planFeaturesCache;
}

/**
 * Update plan features in database
 */
export async function updatePlanFeatures(planFeatures) {
  try {
    // Validate input
    const validPlans = ['free', 'starter', 'pro', 'premium'];
    for (const plan of validPlans) {
      if (!planFeatures[plan] || !Array.isArray(planFeatures[plan])) {
        throw new Error(`Invalid plan features for ${plan}. Must be an array.`);
      }
    }

    // Get all existing features for reference
    const allFeatures = await prisma.$queryRaw`
      SELECT DISTINCT feature FROM plan_features
    `;
    const existingFeatures = allFeatures.map(r => r.feature);

    // Update each plan
    for (const plan of validPlans) {
      const enabledFeatures = planFeatures[plan] || [];
      
      // Disable all features for this plan first
      await prisma.$executeRaw`
        UPDATE plan_features
        SET enabled = false, updated_at = NOW()
        WHERE plan = ${plan}
      `;

      // Enable specified features
      for (const feature of enabledFeatures) {
        // Upsert: insert if doesn't exist, update if exists
        await prisma.$executeRaw`
          INSERT INTO plan_features (plan, feature, enabled, created_at, updated_at)
          VALUES (${plan}, ${feature}, true, NOW(), NOW())
          ON CONFLICT (plan, feature)
          DO UPDATE SET enabled = true, updated_at = NOW()
        `;
      }
    }

    // Clear cache
    planFeaturesCache = null;
    cacheTimestamp = null;

    return { success: true };
  } catch (error) {
    console.error('Error updating plan features:', error);
    throw error;
  }
}

/**
 * Check if a plan has a specific feature
 */
export async function planHasFeature(plan, feature) {
  const features = await getPlanFeatures();
  const planFeatures = features[plan?.toLowerCase()] || [];
  return planFeatures.includes(feature);
}

/**
 * Initialize plan features table with defaults if empty
 */
export async function initializePlanFeatures() {
  try {
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM plan_features
    `;

    if (count[0].count === 0) {
      console.log('Initializing plan features table with defaults...');
      
      // Use default configuration
      const defaultFeatures = DEFAULT_PLAN_FEATURES;
      
      for (const [plan, features] of Object.entries(defaultFeatures)) {
        for (const feature of features) {
          await prisma.$executeRaw`
            INSERT INTO plan_features (plan, feature, enabled)
            VALUES (${plan}, ${feature}, true)
            ON CONFLICT (plan, feature) DO NOTHING
          `;
        }
      }
      
      console.log('Plan features initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing plan features:', error);
  }
}






