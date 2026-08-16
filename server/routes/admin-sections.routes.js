/**
 * Admin Sections Routes
 * Global section availability and tier override management
 * Requires admin authentication
 */

import express from 'express';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/admin/sections
 * Get all section overrides
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    // TODO: Fetch from database (section_overrides table)
    // For now, return empty array (no overrides = use registry defaults)
    const overrides = [];
    res.json(overrides);
  } catch (error) {
    console.error('Error fetching section overrides:', error);
    res.status(500).json({ error: 'Failed to fetch section overrides' });
  }
});

/**
 * PUT /api/admin/sections/:sectionType
 * Update or create a section override
 */
router.put('/:sectionType', requireAdmin, async (req, res) => {
  try {
    const { sectionType } = req.params;
    const { enabled, tierOverride } = req.body;

    if (typeof enabled !== 'undefined' && typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    if (tierOverride && typeof tierOverride !== 'string') {
      return res.status(400).json({ error: 'tierOverride must be a string' });
    }

    // TODO: Save to database (section_overrides table)
    // INSERT OR UPDATE section_overrides SET enabled=?, tierOverride=? WHERE sectionType=?

    const override = {
      sectionType,
      enabled: enabled !== false,
      tierOverride: tierOverride || null,
      updatedAt: new Date().toISOString()
    };

    res.json(override);
  } catch (error) {
    console.error('Error updating section override:', error);
    res.status(500).json({ error: 'Failed to update section override' });
  }
});

/**
 * DELETE /api/admin/sections/:sectionType
 * Delete a section override (revert to registry defaults)
 */
router.delete('/:sectionType', requireAdmin, async (req, res) => {
  try {
    const { sectionType } = req.params;

    // TODO: Delete from database
    // DELETE FROM section_overrides WHERE sectionType=?

    res.json({ success: true, message: `Override deleted for ${sectionType}` });
  } catch (error) {
    console.error('Error deleting section override:', error);
    res.status(500).json({ error: 'Failed to delete section override' });
  }
});

export default router;
