import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateTemplateId } from '../utils/validators.js';
import { getTemplateFilePath, PathEscapeError } from '../utils/siteIsolation.js';

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
    
    // All templates are Pro templates now - ensure tier field is set
    templates = templates.map(t => ({
      ...t,
      tier: t.tier || 'pro'
    }));
    
    // All templates are Pro, so no tier filtering needed
    // (Keeping query parameter for backward compatibility, but all templates are Pro)
    
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
    const templateValidation = validateTemplateId(templateId);
    if (!templateValidation.valid) {
      return res.status(400).json({ error: templateValidation.error });
    }

    try {
      const templatePath = getTemplateFilePath(templateValidation.value);
      const templateData = await fs.readFile(templatePath, 'utf-8');
      const template = JSON.parse(templateData);
      
      res.json(template);
    } catch (error) {
      if (error instanceof PathEscapeError) {
        return res.status(400).json({ error: error.message });
      }
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

