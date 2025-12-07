import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database/db.js';
import { sendEmail, EmailTypes } from '../utils/email-service-wrapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const publicDir = path.join(__dirname, '../../public');
const draftsDir = path.join(publicDir, 'drafts');
const templatesDir = path.join(publicDir, 'data', 'templates');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

function generateRandomPassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// POST /api/drafts
router.post('/', async (req, res) => {
  try {
    const draftData = req.body;

    // Support both old format (data.templateId) and new format (templateId)
    const templateId = draftData.templateId || draftData.data?.template || draftData.template;

    if (!draftData || !templateId) {
      return res.status(400).json({ error: 'Invalid draft data: templateId is required' });
    }

    if (draftData.businessData) {
      const bd = draftData.businessData;

      if (bd.email && !isValidEmail(bd.email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      if (bd.phone && !isValidPhone(bd.phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }

      if (bd.businessName) bd.businessName = sanitizeString(bd.businessName, 200);
      if (bd.heroTitle) bd.heroTitle = sanitizeString(bd.heroTitle, 200);
      if (bd.heroSubtitle) bd.heroSubtitle = sanitizeString(bd.heroSubtitle, 500);
      if (bd.address) bd.address = sanitizeString(bd.address, 300);
    }

    const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const draftFile = path.join(draftsDir, `${draftId}.json`);

    // Support both old format (data object) and new format (businessData)
    const businessData = draftData.businessData || draftData.data || {};

    const draft = {
      draftId: draftId,
      id: draftId,
      templateId: templateId,
      template: templateId,
      businessData: businessData,
      data: businessData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft'
    };

    await fs.writeFile(draftFile, JSON.stringify(draft, null, 2));

    res.json({
      success: true,
      id: draftId,
      draftId: draftId,
      previewUrl: `/preview/${draftId}`,
      expiresAt: draft.expiresAt,
      data: draft.businessData || {}
    });
  } catch (err) {
    console.error('Draft save error:', err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// GET /api/drafts/:draftId
router.get('/:draftId', async (req, res) => {
  try {
    const draftId = req.params.draftId;
    const draftFile = path.join(draftsDir, `${draftId}.json`);

    const draftRaw = await fs.readFile(draftFile, 'utf-8');
    const draft = JSON.parse(draftRaw);

    if (new Date(draft.expiresAt) < new Date()) {
      await fs.unlink(draftFile);
      return res.status(410).json({ error: 'Draft has expired' });
    }

    res.json({
      ...draft,
      id: draft.draftId || draft.id,
      data: draft.businessData || draft.data || {},
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: draft.updatedAt || draft.createdAt || new Date().toISOString()
    });
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Draft not found' });
    } else {
      res.status(500).json({ error: 'Failed to load draft' });
    }
  }
});

// DELETE /api/drafts/:draftId
router.delete('/:draftId', async (req, res) => {
  try {
    const draftId = req.params.draftId;
    const draftFile = path.join(draftsDir, `${draftId}.json`);
    await fs.unlink(draftFile);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

// POST /api/drafts/:draftId/publish
router.post('/:draftId/publish', async (req, res) => {
  try {
    const { draftId } = req.params;
    const body = req.body || {};
    const { plan, email } = body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    if (!plan || !['starter', 'business', 'pro', 'premium'].includes(plan.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const draftFile = path.join(draftsDir, `${draftId}.json`);
    let draft;

    try {
      const draftRaw = await fs.readFile(draftFile, 'utf-8');
      draft = JSON.parse(draftRaw);
    } catch (err) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (new Date(draft.expiresAt) < new Date()) {
      await fs.unlink(draftFile);
      return res.status(410).json({ error: 'Draft has expired' });
    }

    const templateFile = path.join(templatesDir, `${draft.templateId}.json`);
    let siteData;

    try {
      const templateRaw = await fs.readFile(templateFile, 'utf-8');
      siteData = JSON.parse(templateRaw);
    } catch (err) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Update site data with draft business data
    if (draft.businessData) {
      if (draft.businessData.businessName && draft.businessData.businessName.trim()) {
        siteData.brand.name = draft.businessData.businessName;
      }

      if (siteData.hero) {
        if (draft.businessData.heroTitle) siteData.hero.title = draft.businessData.heroTitle;
        if (draft.businessData.heroSubtitle) siteData.hero.subtitle = draft.businessData.heroSubtitle;
        if (draft.businessData.heroImage) siteData.hero.image = draft.businessData.heroImage;
      }

      if (siteData.contact) {
        if (draft.businessData.email) siteData.contact.email = draft.businessData.email;
        if (draft.businessData.phone) siteData.contact.phone = draft.businessData.phone;
        if (draft.businessData.address) siteData.contact.subtitle = draft.businessData.address;
        if (draft.businessData.businessHours) siteData.contact.hours = draft.businessData.businessHours;
      }

      if (!siteData.social) siteData.social = {};
      if (draft.businessData.websiteUrl) siteData.social.website = draft.businessData.websiteUrl;
      if (draft.businessData.facebookUrl) siteData.social.facebook = draft.businessData.facebookUrl;
      if (draft.businessData.instagramUrl) siteData.social.instagram = draft.businessData.instagramUrl;
      if (draft.businessData.googleMapsUrl) siteData.social.maps = draft.businessData.googleMapsUrl;
    }

    // Generate subdomain
    const businessName = siteData.brand?.name || 'my-site';
    const baseSubdomain = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let subdomain = baseSubdomain;
    let attempt = 0;

    while (true) {
      const siteDir = path.join(publicDir, 'sites', subdomain);
      try {
        await fs.access(siteDir);
        attempt++;
        subdomain = `${baseSubdomain}-${Math.random().toString(36).substr(2, 9)}`;
      } catch {
        break;
      }
    }

    // Create site directory
    const siteDir = path.join(publicDir, 'sites', subdomain);
    await fs.mkdir(siteDir, { recursive: true });
    await fs.mkdir(path.join(siteDir, 'data'), { recursive: true });

    // Save site data
    await fs.writeFile(
      path.join(siteDir, 'data', 'site.json'),
      JSON.stringify(siteData, null, 2)
    );

    // Copy site template
    const indexContent = await fs.readFile(
      path.join(publicDir, 'site-template.html'),
      'utf-8'
    );
    await fs.writeFile(path.join(siteDir, 'index.html'), indexContent);

    // Check/create user
    let user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    });

    let userId;
    if (!user) {
      const tempPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      user = await prisma.users.create({
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
      userId = user.id;
    }

    // Set trial expiration
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 7);

    // Save to database
    const siteId = subdomain;
    const templateId = draft.templateId;

    await prisma.sites.create({
      data: {
        id: siteId,
        user_id: userId,
        subdomain,
        template_id: templateId,
        status: 'published',
        plan,
        published_at: new Date(),
        expires_at: trialExpiresAt,
        site_data: JSON.stringify(siteData),
        json_file_path: path.join('sites', subdomain, 'data', 'site.json')
      }
    });

    // Delete draft after successful publish
    await fs.unlink(draftFile);

    res.json({
      success: true,
      subdomain,
      url: `${req.protocol}://${req.get('host')}/sites/${subdomain}`,
      businessName: siteData.brand?.name,
      trialDays: 7,
      site: {
        id: siteId,
        subdomain,
        url: `${req.protocol}://${req.get('host')}/sites/${subdomain}`,
        businessName: siteData.brand?.name,
        templateId: templateId,
        plan: plan
      }
    });

  } catch (err) {
    console.error('Publish draft error:', err);
    res.status(500).json({ error: 'Failed to publish draft' });
  }
});

export default router;

