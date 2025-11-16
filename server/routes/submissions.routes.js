import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { emailService } from '../services/emailService.js';
import { prisma } from '../../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const publicDir = path.join(__dirname, '../../public');

// Helper functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,}$/;
  return phoneRegex.test(phone);
}

function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
}

// POST /api/submissions/contact
router.post('/contact', async (req, res) => {
  try {
    const { subdomain, name, email, phone, message, type, ...otherFields } = req.body;
    
    if (!subdomain || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields: subdomain, email, message' });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const submissionsFile = path.join(siteDir, 'submissions.json');
    
    // Check if site directory exists
    let siteExists = false;
    try {
      await fs.access(siteDir);
      siteExists = true;
    } catch (error) {
      // Site directory doesn't exist - check if it's in database
      try {
        const site = await prisma.sites.findUnique({
          where: { subdomain },
          select: { id: true, subdomain: true }
        });
        if (site) {
          // Site exists in database, create directory structure
          await fs.mkdir(siteDir, { recursive: true });
          await fs.mkdir(path.join(siteDir, 'data'), { recursive: true });
          siteExists = true;
        } else {
          return res.status(404).json({ error: 'Site not found' });
        }
      } catch (dbError) {
        return res.status(404).json({ error: 'Site not found' });
      }
    }
    
    const siteJsonPath = path.join(siteDir, 'data', 'site.json');
    // Also check root site.json for backward compatibility
    const siteJsonPathRoot = path.join(siteDir, 'site.json');
    let siteData;
    try {
      // Try data/site.json first, then site.json
      try {
        siteData = JSON.parse(await fs.readFile(siteJsonPath, 'utf-8'));
      } catch (error) {
        siteData = JSON.parse(await fs.readFile(siteJsonPathRoot, 'utf-8'));
      }
    } catch (error) {
      // If file doesn't exist, try to load from database
      try {
        const site = await prisma.sites.findUnique({
          where: { subdomain },
          select: { site_data: true }
        });
        if (site && site.site_data) {
          siteData = typeof site.site_data === 'string' 
            ? JSON.parse(site.site_data)
            : site.site_data;
        } else {
          console.error('Error loading site data:', error);
          return res.status(500).json({ error: 'Failed to load site data' });
        }
      } catch (dbError) {
        console.error('Error loading site data:', error);
        return res.status(500).json({ error: 'Failed to load site data' });
      }
    }
    
    const siteOwnerEmail = siteData.published?.email || siteData.contact?.email;
    const businessName = siteData.brand?.name || 'Your Business';
    
    const submission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type || 'contact',
      submittedAt: new Date().toISOString(),
      name: sanitizeString(name || '', 200),
      email: email,
      phone: phone || '',
      message: sanitizeString(message, 2000),
      status: 'unread',
      ...otherFields
    };
    
    let submissions = [];
    try {
      const existingData = await fs.readFile(submissionsFile, 'utf-8');
      submissions = JSON.parse(existingData);
    } catch (error) {
      submissions = [];
    }
    
    submissions.unshift(submission);
    
    if (submissions.length > 1000) {
      submissions = submissions.slice(0, 1000);
    }
    
    await fs.writeFile(submissionsFile, JSON.stringify(submissions, null, 2));
    
    // Also store in database for reliability
    try {
      const site = await prisma.sites.findUnique({
        where: { subdomain },
        select: { id: true }
      });
      
      if (site) {
        await prisma.submissions.create({
          data: {
            site_id: site.id,
            name: submission.name,
            email: submission.email,
            phone: submission.phone,
            message: submission.message,
            type: submission.type,
            status: submission.status,
            created_at: new Date(),
            data: otherFields
          }
        });
      }
    } catch (dbError) {
      console.error('Failed to store submission in database:', dbError);
      // Don't fail the request if DB storage fails - file storage is primary
    }
    
    if (siteOwnerEmail) {
      try {
        const siteUrl = `${process.env.SITE_URL || 'http://localhost:3000'}/sites/${subdomain}/`;
        
        await emailService.sendContactFormEmail({
          to: siteOwnerEmail,
          businessName,
          formData: {
            name: submission.name || 'Someone',
            email: submission.email,
            phone: submission.phone || 'Not provided',
            message: submission.message
          }
        });
      } catch (emailError) {
        console.error('Failed to send submission notification email:', emailError);
      }
    }
    
    res.json({
      success: true,
      message: 'Your message has been sent successfully.',
      submissionId: submission.id
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

// GET /api/submissions - Get all submissions for user's sites
router.get('/', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    // Get all submissions from user's sites
    const submissions = await prisma.submissions.findMany({
      where: {
        sites: {
          users: {
            email: userEmail
          }
        }
      },
      include: {
        sites: {
          select: {
            subdomain: true,
            site_data: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 100
    });
    
    const submissionsResponse = submissions.map(row => {
      const siteData = typeof row.sites.site_data === 'string' 
        ? JSON.parse(row.sites.site_data) 
        : row.sites.site_data;
      
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        message: row.message,
        type: row.type,
        status: row.status,
        submittedAt: row.created_at,
        subdomain: row.sites.subdomain,
        businessName: siteData?.brand?.name || 'Unknown Site',
        ...((row.data && typeof row.data === 'object') ? row.data : {})
      };
    });
    
    res.json({ submissions: submissionsResponse });
    
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to retrieve submissions' });
  }
});

// GET /api/submissions/:subdomain - Get submissions for a specific site
router.get('/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    // Verify user owns this site
    const site = await prisma.sites.findUnique({
      where: { subdomain },
      include: {
        users: {
          select: { email: true }
        }
      }
    });
    
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (site.users.email !== userEmail && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view these submissions' });
    }
    
    // Get submissions from database
    const submissions = await prisma.submissions.findMany({
      where: { site_id: site.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        message: true,
        type: true,
        status: true,
        created_at: true,
        data: true
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 100
    });
    
    const submissionsResponse = submissions.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      type: row.type,
      status: row.status,
      submittedAt: row.created_at,
      ...((row.data && typeof row.data === 'object') ? row.data : {})
    }));
    
    res.json({ submissions });
    
  } catch (error) {
    console.error('Get site submissions error:', error);
    res.status(500).json({ error: 'Failed to retrieve submissions' });
  }
});

// PATCH /api/submissions/:submissionId/read
router.patch('/:submissionId/read', requireAuth, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userEmail = req.user.email;
    
    // Verify user owns the site this submission belongs to
    const submission = await prisma.submissions.findUnique({
      where: { id: parseInt(submissionId, 10) },
      include: {
        sites: {
          include: {
            users: {
              select: { email: true }
            }
          }
        }
      }
    });
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    if (submission.sites.users.email !== userEmail && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to modify this submission' });
    }
    
    // Update submission status in database
    await prisma.submissions.update({
      where: { id: parseInt(submissionId, 10) },
      data: { status: 'read' }
    });
    
    res.json({
      success: true,
      message: 'Submission marked as read'
    });
    
  } catch (error) {
    console.error('Mark submission read error:', error);
    res.status(500).json({ error: 'Failed to update submission status' });
  }
});

export default router;


