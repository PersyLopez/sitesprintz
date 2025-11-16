import express from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database/db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendEmail, EmailTypes } from '../../email-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const publicDir = path.join(__dirname, '../../public');

// Helper functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateRandomPassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// POST /api/sites/guest-publish
router.post('/guest-publish', async (req, res) => {
  try {
    const { email, data } = req.body;
    
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    
    if (!data) {
      return res.status(400).json({ error: 'Site data required' });
    }
    
    const existingUser = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true }
    });
    
    let userId;
    
    if (!existingUser) {
      const tempPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      const user = await prisma.users.create({
        data: {
          email: email.toLowerCase(),
          password_hash: hashedPassword,
          role: 'user',
          status: 'pending',
          created_at: new Date()
        }
      });
      
      userId = user.id;
      
      try {
        await sendEmail(email, EmailTypes.WELCOME, { email });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    } else {
      userId = existingUser.id;
    }
    
    const businessName = data.brand?.name || data.meta?.businessName || 'my-site';
    const baseSubdomain = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    let subdomain = baseSubdomain;
    
    while (true) {
      const siteDir = path.join(publicDir, 'sites', subdomain);
      try {
        await fs.access(siteDir);
        subdomain = `${baseSubdomain}-${Math.random().toString(36).substr(2, 9)}`;
      } catch {
        break;
      }
    }
    
    const siteDir = path.join(publicDir, 'sites', subdomain);
    await fs.mkdir(siteDir, { recursive: true });
    await fs.mkdir(path.join(siteDir, 'data'), { recursive: true });
    
    await fs.writeFile(
      path.join(siteDir, 'data', 'site.json'),
      JSON.stringify(data, null, 2)
    );
    
    const indexContent = await fs.readFile(
      path.join(publicDir, 'site-template.html'),
      'utf-8'
    );
    await fs.writeFile(path.join(siteDir, 'index.html'), indexContent);
    
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 7);
    
    const siteId = subdomain;
    const templateId = data.template || 'starter';
    
    await prisma.sites.create({
      data: {
        id: siteId,
        user_id: userId,
        subdomain: subdomain,
        template_id: templateId,
        status: 'published',
        plan: 'free',
        published_at: new Date(),
        expires_at: trialExpiresAt,
        site_data: data,
        json_file_path: path.join('sites', subdomain, 'data', 'site.json'),
        created_at: new Date()
      }
    });
    
    res.json({
      success: true,
      subdomain,
      url: `${req.protocol}://${req.get('host')}/sites/${subdomain}`,
      businessName,
      trialDays: 7
    });
    
  } catch (err) {
    console.error('Guest publish error:', err);
    res.status(500).json({ error: 'Failed to publish site' });
  }
});

// GET /api/sites/:subdomain - Load site for editing
router.get('/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    // Get site from database using Prisma
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
    
    const ownerEmail = site.users?.email;
    
    // Check ownership
    if (ownerEmail !== userEmail && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this site' });
    }
    
    // Try to load site data from file first, then fall back to database
    let siteData;
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const siteJsonPath = path.join(siteDir, 'data', 'site.json');
    
    try {
      const fileContent = await fs.readFile(siteJsonPath, 'utf-8');
      siteData = JSON.parse(fileContent);
    } catch (error) {
      // Fall back to database
      if (site.site_data) {
        siteData = typeof site.site_data === 'string' 
          ? JSON.parse(site.site_data) 
          : site.site_data;
      } else {
        return res.status(500).json({ error: 'Site data not found' });
      }
    }
    
    res.json({
      subdomain: site.subdomain,
      templateId: site.template_id,
      status: site.status,
      plan: site.plan,
      publishedAt: site.published_at,
      expiresAt: site.expires_at,
      siteData: siteData
    });
    
  } catch (error) {
    console.error('Load site error:', error);
    res.status(500).json({ error: 'Failed to load site' });
  }
});

// PUT /api/sites/:subdomain - Update published site
router.put('/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { siteData } = req.body;
    const userEmail = req.user.email;
    
    if (!siteData) {
      return res.status(400).json({ error: 'Site data required' });
    }
    
    // Get site from database using Prisma
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
    
    const ownerEmail = site.users?.email;
    
    // Check ownership
    if (ownerEmail !== userEmail && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this site' });
    }
    
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const siteJsonPath = path.join(siteDir, 'data', 'site.json');
    const backupDir = path.join(siteDir, 'backups');
    
    // Create backup before updating
    try {
      await fs.mkdir(backupDir, { recursive: true });
      
      // Read current site data
      let currentData;
      try {
        currentData = await fs.readFile(siteJsonPath, 'utf-8');
      } catch (error) {
        // If file doesn't exist, use database version
        if (site.site_data) {
          currentData = JSON.stringify(
            typeof site.site_data === 'string' ? JSON.parse(site.site_data) : site.site_data,
            null,
            2
          );
        }
      }
      
      if (currentData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `site-${timestamp}.json`);
        await fs.writeFile(backupPath, currentData);
        
        // Keep only last 10 backups
        const backups = await fs.readdir(backupDir);
        if (backups.length > 10) {
          const sortedBackups = backups
            .filter(f => f.startsWith('site-'))
            .sort()
            .reverse();
          
          for (let i = 10; i < sortedBackups.length; i++) {
            await fs.unlink(path.join(backupDir, sortedBackups[i]));
          }
        }
      }
    } catch (backupError) {
      console.error('Backup creation failed:', backupError);
      // Continue with update even if backup fails
    }
    
    // Update site data file
    await fs.writeFile(siteJsonPath, JSON.stringify(siteData, null, 2));
    
    // Update database using Prisma
    await prisma.sites.update({
      where: { subdomain },
      data: { site_data: siteData }
    });
    
    res.json({
      success: true,
      message: 'Site updated successfully',
      subdomain
    });
    
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({ error: 'Failed to update site' });
  }
});

// PATCH /api/sites/:subdomain
router.patch('/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    const { changes } = req.body;
    
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const sitePath = path.join(siteDir, 'site.json');
    let existingSite;
    
    try {
      existingSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (existingSite.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized to edit this site' });
    }
    
    const checkpointDir = path.join(siteDir, 'checkpoints');
    await fs.mkdir(checkpointDir, { recursive: true });
    const checkpointPath = path.join(checkpointDir, `checkpoint.${Date.now()}.json`);
    await fs.writeFile(checkpointPath, JSON.stringify({
      timestamp: Date.now(),
      data: existingSite,
      changes: changes
    }, null, 2));
    
    const updatedSite = { ...existingSite };
    
    changes.forEach(({ field, value }) => {
      const keys = field.split('.');
      let obj = updatedSite;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      
      obj[keys[keys.length - 1]] = value;
    });
    
    updatedSite.published = {
      ...updatedSite.published,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(sitePath, JSON.stringify(updatedSite, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Changes saved',
      checkpointId: Date.now()
    });
  } catch (error) {
    console.error('Patch site error:', error);
    res.status(500).json({ error: 'Failed to save changes', details: error.message });
  }
});

// DELETE /api/sites/:subdomain
router.delete('/:subdomain', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const sitePath = path.join(siteDir, 'site.json');
    
    let siteData;
    try {
      siteData = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (siteData.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized to delete this site' });
    }
    
    await fs.rm(siteDir, { recursive: true, force: true });
    
    await prisma.sites.delete({
      where: { subdomain }
    });
    
    res.json({ success: true, message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({ error: 'Failed to delete site' });
  }
});

// GET /api/sites/:subdomain/submissions
router.get('/:subdomain/submissions', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    const siteJsonPath = path.join(publicDir, 'sites', subdomain, 'site.json');
    let siteData;
    try {
      siteData = JSON.parse(await fs.readFile(siteJsonPath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (siteData.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized to view submissions for this site' });
    }
    
    const submissionsFile = path.join(publicDir, 'sites', subdomain, 'submissions.json');
    let submissions = [];
    try {
      const data = await fs.readFile(submissionsFile, 'utf-8');
      submissions = JSON.parse(data);
    } catch (error) {
      submissions = [];
    }
    
    res.json({
      success: true,
      submissions,
      total: submissions.length,
      unread: submissions.filter(s => s.status === 'unread').length
    });
    
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to load submissions' });
  }
});

// GET /api/sites/:subdomain/history
router.get('/:subdomain/history', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const sitePath = path.join(siteDir, 'site.json');
    let existingSite;
    
    try {
      existingSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (existingSite.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const backupDir = path.join(siteDir, 'backups');
    const checkpointDir = path.join(siteDir, 'checkpoints');
    
    let history = [];
    
    try {
      const backups = await fs.readdir(backupDir);
      for (const backup of backups) {
        if (backup.startsWith('site.backup.')) {
          const timestamp = parseInt(backup.split('.')[2]);
          history.push({
            id: `backup-${timestamp}`,
            timestamp: timestamp,
            type: 'backup',
            description: 'Manual save point',
            date: new Date(timestamp).toLocaleString()
          });
        }
      }
    } catch (e) {
      // No backups yet
    }
    
    try {
      const checkpoints = await fs.readdir(checkpointDir);
      const sorted = checkpoints
        .filter(f => f.startsWith('checkpoint.'))
        .map(f => parseInt(f.split('.')[1]))
        .sort((a, b) => b - a)
        .slice(0, 20);
      
      for (const timestamp of sorted) {
        const checkpointPath = path.join(checkpointDir, `checkpoint.${timestamp}.json`);
        try {
          const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf-8'));
          const changeDesc = checkpoint.changes?.map(c => c.field).join(', ') || 'Multiple changes';
          
          history.push({
            id: `checkpoint-${timestamp}`,
            timestamp: timestamp,
            type: 'checkpoint',
            description: `Updated: ${changeDesc}`,
            date: new Date(timestamp).toLocaleString()
          });
        } catch (e) {
          // Skip corrupted checkpoint
        }
      }
    } catch (e) {
      // No checkpoints yet
    }
    
    history.sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({ 
      success: true,
      history: history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// POST /api/sites/:subdomain/restore/:versionId
router.post('/:subdomain/restore/:versionId', requireAuth, async (req, res) => {
  try {
    const { subdomain, versionId } = req.params;
    const userEmail = req.user.email;
    
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const sitePath = path.join(siteDir, 'site.json');
    let currentSite;
    
    try {
      currentSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (currentSite.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const backupDir = path.join(siteDir, 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    const beforeRestorePath = path.join(backupDir, `site.before-restore.${Date.now()}.json`);
    await fs.writeFile(beforeRestorePath, JSON.stringify(currentSite, null, 2));
    
    let restoredData;
    
    if (versionId.startsWith('backup-')) {
      const timestamp = versionId.replace('backup-', '');
      const backupPath = path.join(backupDir, `site.backup.${timestamp}.json`);
      restoredData = JSON.parse(await fs.readFile(backupPath, 'utf-8'));
    } else if (versionId.startsWith('checkpoint-')) {
      const timestamp = versionId.replace('checkpoint-', '');
      const checkpointPath = path.join(siteDir, 'checkpoints', `checkpoint.${timestamp}.json`);
      const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf-8'));
      restoredData = checkpoint.data;
    } else {
      return res.status(400).json({ error: 'Invalid version ID' });
    }
    
    restoredData.published = {
      ...restoredData.published,
      lastUpdated: new Date().toISOString(),
      restoredFrom: versionId,
      restoredAt: new Date().toISOString()
    };
    
    await fs.writeFile(sitePath, JSON.stringify(restoredData, null, 2));
    
    res.json({ 
      success: true,
      message: 'Version restored successfully',
      restoredFrom: versionId
    });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

// GET /api/sites/:subdomain/session
router.get('/:subdomain/session', requireAuth, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    const siteDir = path.join(publicDir, 'sites', subdomain);
    const sitePath = path.join(siteDir, 'site.json');
    let existingSite;
    
    try {
      existingSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    } catch (error) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (existingSite.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const checkpointDir = path.join(siteDir, 'checkpoints');
    let lastCheckpoint = null;
    
    try {
      const checkpoints = await fs.readdir(checkpointDir);
      if (checkpoints.length > 0) {
        const latest = checkpoints
          .filter(f => f.startsWith('checkpoint.'))
          .map(f => parseInt(f.split('.')[1]))
          .sort((a, b) => b - a)[0];
        
        lastCheckpoint = {
          timestamp: latest,
          date: new Date(latest).toLocaleString()
        };
      }
    } catch (e) {
      // No checkpoints
    }
    
    res.json({
      success: true,
      session: {
        subdomain: subdomain,
        lastCheckpoint: lastCheckpoint,
        lastUpdated: existingSite.published?.lastUpdated
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session info' });
  }
});

// GET /api/sites/:siteId/products
router.get('/:siteId/products', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const siteFile = path.join(publicDir, 'sites', siteId, 'site.json');
    
    if (!fsSync.existsSync(siteFile)) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const siteData = JSON.parse(fsSync.readFileSync(siteFile, 'utf-8'));
    
    if (siteData.ownerEmail !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      products: siteData.products || [],
      siteName: siteData.businessName || siteData.brand?.name || siteId
    });
    
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// PUT /api/sites/:siteId/products
router.put('/:siteId/products', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { products } = req.body;
    
    const siteFile = path.join(publicDir, 'sites', siteId, 'site.json');
    
    if (!fsSync.existsSync(siteFile)) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const siteData = JSON.parse(fsSync.readFileSync(siteFile, 'utf-8'));
    
    if (siteData.ownerEmail !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products must be an array' });
    }
    
    siteData.products = products;
    
    fsSync.writeFileSync(siteFile, JSON.stringify(siteData, null, 2));
    
    res.json({ success: true, products: siteData.products });
    
  } catch (error) {
    console.error('Update products error:', error);
    res.status(500).json({ error: 'Failed to update products' });
  }
});

export default router;
