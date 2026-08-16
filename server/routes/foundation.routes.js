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
import { FoundationService } from '../services/foundationService.js';
import { EmailService } from '../services/emailService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Service instance
let foundationService;
let dbQuery;
let emailService;

// Initialize with database query function
function initializeFoundationRoutes(dbQueryFunction) {
  dbQuery = dbQueryFunction;
  // Initialize foundation service with default Prisma client
  foundationService = new FoundationService();
  // Initialize email service
  emailService = new EmailService();
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
router.put('/config/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { foundation } = req.body;

    if (!foundation || typeof foundation !== 'object') {
      return res.status(400).json({ error: 'Invalid foundation configuration' });
    }

    // Add authentication check - verify user owns this site
    const siteResult = await dbQuery(
      'SELECT user_id FROM sites WHERE subdomain = $1',
      [subdomain]
    );
    
    const site = siteResult.rows[0];
    
    if (!site || site.user_id !== req.user?.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

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
    // First resolve the site_id from subdomain
    const siteIdResult = await dbQuery(
      'SELECT id FROM sites WHERE subdomain = $1',
      [subdomain]
    );
    
    if (siteIdResult.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const siteId = siteIdResult.rows[0].id;
    // submissions schema: (id serial, site_id, form_type, data jsonb, status, created_at)
    // Customer details are stored in the `data` JSON column.
    const submissionData = JSON.stringify({ name, email, phone: phone || null, message });
    await dbQuery(
      `INSERT INTO submissions (site_id, form_type, data, status, created_at)
       VALUES ($1, $2, $3::jsonb, $4, NOW())`,
      [siteId, 'contact', submissionData, 'unread']
    );

    // Send email notification to site owner
    try {
      await emailService.send({
        to: recipientEmail,
        subject: `New contact from ${name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${name} (${email})</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      });
    } catch (err) {
      console.error('Email send to owner failed:', err);
      // Don't fail the submission if email fails
    }

    // Send auto-responder to customer if enabled
    const autoResponder = siteData.foundation?.contactForm?.autoResponder;
    if (autoResponder && autoResponder.enabled) {
      try {
        await emailService.send({
          to: email,
          subject: autoResponder.subject || 'Thank you for contacting us',
          html: autoResponder.body || '<p>Thank you for your message. We will get back to you soon!</p>'
        });
      } catch (err) {
        console.error('Auto-responder send failed:', err);
        // Don't fail the submission if auto-responder fails
      }
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
router.get('/submissions/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;

    // Add authentication check - verify user owns this site
    const siteResult = await dbQuery(
      'SELECT id, user_id FROM sites WHERE subdomain = $1',
      [subdomain]
    );
    
    const site = siteResult.rows[0];
    
    if (!site || site.user_id !== req.user?.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await dbQuery(
      `SELECT id, form_type, data, status, created_at 
       FROM submissions 
       WHERE site_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [site.id]
    );

    // Flatten the JSON `data` column into top-level fields for the client.
    const submissions = result.rows.map((row) => {
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
      return {
        id: row.id,
        name: data.name || null,
        email: data.email || null,
        phone: data.phone || null,
        message: data.message || null,
        status: row.status,
        created_at: row.created_at
      };
    });

    res.json({
      submissions
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


