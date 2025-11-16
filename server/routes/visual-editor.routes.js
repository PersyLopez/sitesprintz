/**
 * Visual Editor API Routes
 * 
 * REST API endpoints for visual editor with optimistic locking
 * Prevents race conditions in concurrent editing scenarios
 */

import express from 'express';
import path from 'path';
import { visualEditorService } from '../services/visualEditorService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * PATCH /api/sites/:subdomain
 * Update site with optimistic locking (version check)
 */
export async function patchSiteWithVersion(req, res) {
  try {
    const { subdomain } = req.params;
    const { version, changes } = req.body;
    const userEmail = req.user?.email;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!version || typeof version !== 'number') {
      return res.status(400).json({ error: 'Version number is required' });
    }
    
    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ error: 'Changes array is required' });
    }
    
    // Validate change format
    for (const change of changes) {
      if (!change.field || change.value === undefined) {
        return res.status(400).json({ 
          error: 'Each change must have field and value' 
        });
      }
    }
    
    const siteDir = path.join(process.cwd(), 'public', 'sites', subdomain);
    
    // Verify permissions
    try {
      await visualEditorService.verifyEditPermission(siteDir, userEmail);
    } catch (error) {
      return res.status(403).json({ error: error.message });
    }
    
    // Apply changes with version check
    const result = await visualEditorService.applyChangesWithVersionCheck(
      siteDir,
      changes,
      version
    );
    
    if (result.conflict) {
      // Version conflict - return current server state
      return res.status(409).json({
        error: 'Version conflict detected',
        currentVersion: result.currentVersion,
        expectedVersion: result.expectedVersion,
        serverData: result.serverData,
        message: 'Another update was made since you started editing. Please review the changes.'
      });
    }
    
    res.json({
      success: true,
      version: result.version,
      timestamp: result.timestamp,
      message: 'Changes saved successfully'
    });
    
  } catch (error) {
    console.error('Patch site error:', error);
    
    if (error.message.includes('Invalid field path')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to save changes',
      message: error.message 
    });
  }
}

/**
 * GET /api/sites/:subdomain/history
 * Get version history for a site
 */
export async function getVersionHistory(req, res) {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user?.email;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const siteDir = path.join(process.cwd(), 'public', 'sites', subdomain);
    
    // Verify permissions
    try {
      await visualEditorService.verifyEditPermission(siteDir, userEmail);
    } catch (error) {
      return res.status(403).json({ error: error.message });
    }
    
    const history = await visualEditorService.getVersionHistory(siteDir);
    
    res.json({
      success: true,
      history
    });
    
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ 
      error: 'Failed to load version history',
      message: error.message 
    });
  }
}

/**
 * POST /api/sites/:subdomain/restore/:versionId
 * Restore site to a previous version
 */
export async function restoreVersion(req, res) {
  try {
    const { subdomain, versionId } = req.params;
    const userEmail = req.user?.email;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const siteDir = path.join(process.cwd(), 'public', 'sites', subdomain);
    
    // Verify permissions
    try {
      await visualEditorService.verifyEditPermission(siteDir, userEmail);
    } catch (error) {
      return res.status(403).json({ error: error.message });
    }
    
    const result = await visualEditorService.restoreVersion(siteDir, versionId);
    
    res.json({
      success: true,
      restoredVersion: result.restoredVersion,
      newVersion: result.newVersion,
      message: 'Version restored successfully'
    });
    
  } catch (error) {
    console.error('Restore version error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to restore version',
      message: error.message 
    });
  }
}

/**
 * GET /api/sites/:subdomain/session
 * Get current edit session information
 */
export async function getEditSession(req, res) {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user?.email;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const siteDir = path.join(process.cwd(), 'public', 'sites', subdomain);
    
    const sessionInfo = await visualEditorService.getEditSessionInfo(
      siteDir,
      userEmail
    );
    
    res.json({
      success: true,
      session: sessionInfo
    });
    
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ 
      error: 'Failed to get session info',
      message: error.message 
    });
  }
}

// Register routes
router.patch('/sites/:subdomain', requireAuth, patchSiteWithVersion);
router.get('/sites/:subdomain/history', requireAuth, getVersionHistory);
router.post('/sites/:subdomain/restore/:versionId', requireAuth, restoreVersion);
router.get('/sites/:subdomain/session', requireAuth, getEditSession);

export default router;

