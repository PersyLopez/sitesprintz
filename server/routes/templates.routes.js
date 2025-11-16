import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const templatesDir = path.join(__dirname, '../../public/data/templates');

// GET /api/templates
router.get('/', async (req, res) => {
  try {
    const indexPath = path.join(templatesDir, 'index.json');
    const indexData = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    
    let templates = index.templates || [];
    
    // Exclude layout variations (templates with layout suffixes)
    const layoutVariations = ['casual', 'fine-dining', 'fast-casual', 'luxury-spa', 'modern-studio', 'neighborhood'];
    templates = templates.filter(t => {
      if (!t.id) return true;
      return !layoutVariations.some(variation => t.id.endsWith(`-${variation}`));
    });
    
    // Add tier field if not present (map from plan)
    // Also ensure all required metadata fields are present
    templates = templates.map(t => ({
      ...t,
      tier: t.tier || t.plan?.toLowerCase() || 'starter',
      // Ensure metadata fields exist for tests
      ...(t.tier ? {} : { tier: t.plan?.toLowerCase() || 'starter' })
    }));
    
    // Filter by tier if specified
    const tier = req.query.tier;
    if (tier) {
      templates = templates.filter(t => {
        const templateTier = t.tier || t.plan?.toLowerCase();
        return templateTier === tier.toLowerCase();
      });
    }
    
    res.json(templates);
  } catch (error) {
    console.error('Failed to load templates index:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

// GET /api/templates/preview/:templateId
router.get('/preview/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    
    // Handle invalid template ID format
    if (!templateId || templateId.includes('..') || templateId.includes('/')) {
      return res.status(400).json({ error: 'Invalid template ID format' });
    }
    
    const templatePath = path.join(templatesDir, `${templateId}.json`);
    
    try {
      const templateData = await fs.readFile(templatePath, 'utf-8');
      const template = JSON.parse(templateData);
      
      res.json(template);
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ error: 'Template not found' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to load template preview:', error);
    res.status(500).json({ error: 'Failed to load template preview' });
  }
});

export default router;

