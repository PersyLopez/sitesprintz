/**
 * Foundation Features Configuration API
 * 
 * Endpoints for managing foundation feature configuration
 * 
 * Now using FoundationService for proper separation of concerns
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { FoundationService } from '../services/foundationService.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Service instance
let foundationService;
let dbQuery;

// Initialize with database query function
function initializeFoundationRoutes(dbQueryFunction) {
  dbQuery = dbQueryFunction;
  // Initialize foundation service with database wrapper
  foundationService = new FoundationService({ query: dbQueryFunction });
  return router;
}

/**
 * GET /api/foundation/config/:subdomain
 * Get foundation configuration for a site
 */
router.get('/config/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    // Use service to get config
    const result = await foundationService.getConfig(subdomain);

    res.json({
      foundation: result.foundation,
      plan: result.plan
    });

  } catch (error) {
    if (error.message === 'Site not found') {
      return res.status(404).json({ error: 'Site not found' });
    }
    console.error('Foundation config fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * PUT /api/foundation/config/:subdomain
 * Update foundation configuration for a site
 * Requires authentication
 */
router.put('/config/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { foundation } = req.body;

    if (!foundation || typeof foundation !== 'object') {
      return res.status(400).json({ error: 'Invalid foundation configuration' });
    }

    // TODO: Add authentication check here
    // For now, allow updates (will be secured in next iteration)

    // Use service to update config
    const result = await foundationService.updateConfig(subdomain, foundation);

    // Also update the JSON file if it exists
    const publicDir = path.join(__dirname, '..', '..', 'public');
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const siteConfigFile = path.join(siteDir, 'site.json');

    try {
      // Check if file exists and update it
      await fs.access(siteConfigFile, fs.constants.F_OK);
      
      // Read current file
      const fileContent = await fs.readFile(siteConfigFile, 'utf-8');
      const siteData = JSON.parse(fileContent);
      
      // Update foundation config
      siteData.foundation = foundation;
      
      // Write back
      await fs.writeFile(siteConfigFile, JSON.stringify(siteData, null, 2));
      console.log(`✅ Updated foundation config for ${subdomain}`);
    } catch (fileError) {
      // File doesn't exist, that's okay
      console.log(`No site.json file for ${subdomain}, database updated only`);
    }

    res.json({
      success: true,
      foundation: result.foundation
    });

  } catch (error) {
    if (error.message === 'Site not found') {
      return res.status(404).json({ error: 'Site not found' });
    }
    if (error.message.includes('Invalid') || error.message.includes('Feature not available')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Foundation config update error:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

/**
 * POST /api/foundation/contact
 * Handle contact form submissions
 */
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, message, subdomain } = req.body;

    // Basic validation
    if (!name || !email || !message || !subdomain) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Get site configuration to find recipient email
    const siteResult = await dbQuery(
      'SELECT site_data FROM sites WHERE subdomain = $1',
      [subdomain]
    );

    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const site = siteResult.rows[0];
    const siteData = typeof site.site_data === 'string' 
      ? JSON.parse(site.site_data) 
      : site.site_data;

    const recipientEmail = siteData.foundation?.contactForm?.recipientEmail;
    
    if (!recipientEmail) {
      console.error('No recipient email configured for', subdomain);
      return res.status(400).json({ error: 'Contact form not configured' });
    }

    // Store submission in database
    const submissionId = crypto.randomUUID();
    await dbQuery(
      `INSERT INTO submissions (id, site_id, name, email, phone, message, form_type, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [submissionId, subdomain, name, email, phone || null, message, 'contact', 'unread']
    );

    // TODO: Send email notification to site owner
    // This will be implemented when we add the email service
    console.log(`📧 Contact form submission for ${subdomain}:`, { name, email });

    // TODO: Send auto-responder to customer if enabled
    const autoResponder = siteData.foundation?.contactForm?.autoResponder;
    if (autoResponder && autoResponder.enabled) {
      console.log(`📧 Auto-responder would be sent to ${email}`);
    }

    res.json({
      success: true,
      message: 'Your message has been received'
    });

  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

/**
 * GET /api/foundation/submissions/:subdomain
 * Get contact form submissions for a site
 * Requires authentication (site owner)
 */
router.get('/submissions/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    // TODO: Add authentication check - verify user owns this site

    const result = await dbQuery(
      `SELECT id, name, email, phone, message, status, created_at 
       FROM submissions 
       WHERE site_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [subdomain]
    );

    res.json({
      submissions: result.rows
    });

  } catch (error) {
    console.error('Submissions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * Default foundation configuration (for backwards compatibility)
 */
function getDefaultFoundationConfig() {
  return foundationService 
    ? foundationService.getDefaultConfig() 
    : require('../services/foundationService.js').getDefaultFoundationConfig();
}

export { initializeFoundationRoutes, getDefaultFoundationConfig };


