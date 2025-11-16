/**
 * Pricing Management Routes
 * Admin-only routes for managing subscription pricing
 */

import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

export function initializePricingRoutes(dbQuery) {
  const router = express.Router();

  /**
   * GET /api/pricing
   * Get all active pricing plans (public endpoint)
   */
  router.get('/', async (req, res) => {
    try {
      const result = await dbQuery(
        `SELECT 
          plan,
          name,
          price_monthly,
          price_annual,
          description,
          features,
          trial_days,
          is_popular,
          display_order,
          ROUND(price_monthly::numeric / 100, 2) as price_monthly_dollars,
          ROUND(price_annual::numeric / 100, 2) as price_annual_dollars
        FROM pricing
        WHERE is_active = true
        ORDER BY display_order`
      );

      res.json({
        success: true,
        pricing: result.rows
      });
    } catch (error) {
      console.error('Error fetching pricing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pricing'
      });
    }
  });

  /**
   * GET /api/pricing/:plan
   * Get specific plan details (public endpoint)
   */
  router.get('/:plan', async (req, res) => {
    try {
      const { plan } = req.params;

      const result = await dbQuery(
        `SELECT 
          plan,
          name,
          price_monthly,
          price_annual,
          description,
          features,
          trial_days,
          is_popular,
          ROUND(price_monthly::numeric / 100, 2) as price_monthly_dollars,
          ROUND(price_annual::numeric / 100, 2) as price_annual_dollars
        FROM pricing
        WHERE plan = $1 AND is_active = true`,
        [plan]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      res.json({
        success: true,
        pricing: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch plan'
      });
    }
  });

  /**
   * GET /api/pricing/admin/all
   * Get all pricing plans (including inactive) - ADMIN ONLY
   */
  router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const result = await dbQuery(
        `SELECT 
          id,
          plan,
          name,
          price_monthly,
          price_annual,
          description,
          features,
          trial_days,
          is_active,
          is_popular,
          display_order,
          created_at,
          updated_at,
          ROUND(price_monthly::numeric / 100, 2) as price_monthly_dollars,
          ROUND(price_annual::numeric / 100, 2) as price_annual_dollars
        FROM pricing
        ORDER BY display_order`
      );

      res.json({
        success: true,
        pricing: result.rows
      });
    } catch (error) {
      console.error('Error fetching all pricing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pricing'
      });
    }
  });

  /**
   * PUT /api/pricing/admin/:plan
   * Update pricing for a plan - ADMIN ONLY
   */
  router.put('/admin/:plan', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { plan } = req.params;
      const {
        name,
        price_monthly,
        price_annual,
        description,
        features,
        trial_days,
        is_active,
        is_popular,
        display_order
      } = req.body;

      // Validate price_monthly (convert dollars to cents if needed)
      let priceInCents = price_monthly;
      if (typeof price_monthly === 'number' && price_monthly < 1000) {
        // Assume dollars, convert to cents
        priceInCents = Math.round(price_monthly * 100);
      }

      let annualPriceInCents = price_annual;
      if (price_annual && typeof price_annual === 'number' && price_annual < 10000) {
        // Assume dollars, convert to cents
        annualPriceInCents = Math.round(price_annual * 100);
      }

      const result = await dbQuery(
        `UPDATE pricing
        SET 
          name = COALESCE($1, name),
          price_monthly = COALESCE($2, price_monthly),
          price_annual = COALESCE($3, price_annual),
          description = COALESCE($4, description),
          features = COALESCE($5, features),
          trial_days = COALESCE($6, trial_days),
          is_active = COALESCE($7, is_active),
          is_popular = COALESCE($8, is_popular),
          display_order = COALESCE($9, display_order),
          updated_at = NOW(),
          updated_by = $10
        WHERE plan = $11
        RETURNING 
          plan,
          name,
          price_monthly,
          price_annual,
          description,
          features,
          trial_days,
          is_active,
          is_popular,
          display_order,
          ROUND(price_monthly::numeric / 100, 2) as price_monthly_dollars`,
        [
          name,
          priceInCents,
          annualPriceInCents,
          description,
          features ? JSON.stringify(features) : null,
          trial_days,
          is_active,
          is_popular,
          display_order,
          req.user.id,
          plan
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Pricing updated successfully',
        pricing: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating pricing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update pricing: ' + error.message
      });
    }
  });

  /**
   * GET /api/pricing/admin/history/:plan
   * Get pricing change history - ADMIN ONLY
   */
  router.get('/admin/history/:plan', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { plan } = req.params;

      const result = await dbQuery(
        `SELECT 
          ph.id,
          ph.plan,
          ROUND(ph.old_price::numeric / 100, 2) as old_price_dollars,
          ROUND(ph.new_price::numeric / 100, 2) as new_price_dollars,
          ph.change_reason,
          ph.changed_at,
          u.email as changed_by_email
        FROM pricing_history ph
        LEFT JOIN users u ON ph.changed_by = u.id
        WHERE ph.plan = $1
        ORDER BY ph.changed_at DESC
        LIMIT 50`,
        [plan]
      );

      res.json({
        success: true,
        history: result.rows
      });
    } catch (error) {
      console.error('Error fetching pricing history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pricing history'
      });
    }
  });

  /**
   * POST /api/pricing/admin/quick-update
   * Quick update all prices at once - ADMIN ONLY
   */
  router.post('/admin/quick-update', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { starter, pro, premium } = req.body;

      const updates = [];
      
      if (starter) {
        const starterPrice = typeof starter === 'number' && starter < 1000 
          ? Math.round(starter * 100) 
          : starter;
        updates.push(dbQuery(
          `UPDATE pricing SET price_monthly = $1, updated_by = $2, updated_at = NOW() WHERE plan = 'starter'`,
          [starterPrice, req.user.id]
        ));
      }

      if (pro) {
        const proPrice = typeof pro === 'number' && pro < 1000 
          ? Math.round(pro * 100) 
          : pro;
        updates.push(dbQuery(
          `UPDATE pricing SET price_monthly = $1, updated_by = $2, updated_at = NOW() WHERE plan = 'pro'`,
          [proPrice, req.user.id]
        ));
      }

      if (premium) {
        const premiumPrice = typeof premium === 'number' && premium < 1000 
          ? Math.round(premium * 100) 
          : premium;
        updates.push(dbQuery(
          `UPDATE pricing SET price_monthly = $1, updated_by = $2, updated_at = NOW() WHERE plan = 'premium'`,
          [premiumPrice, req.user.id]
        ));
      }

      await Promise.all(updates);

      // Fetch updated pricing
      const result = await dbQuery(
        `SELECT plan, name, 
          ROUND(price_monthly::numeric / 100, 2) as price_monthly_dollars
        FROM pricing
        ORDER BY display_order`
      );

      res.json({
        success: true,
        message: 'Pricing updated successfully',
        pricing: result.rows
      });
    } catch (error) {
      console.error('Error updating pricing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update pricing'
      });
    }
  });

  return router;
}

export default initializePricingRoutes;

