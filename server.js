import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import multer from 'multer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-token';

const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');
const draftsDir = path.join(publicDir, 'drafts');
const dataFile = path.join(publicDir, 'data', 'site.json');
const templatesDir = path.join(publicDir, 'data', 'templates');

// Ensure directories exist
fs.mkdir(uploadsDir, { recursive: true }).catch(() => {});
fs.mkdir(draftsDir, { recursive: true }).catch(() => {});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(express.static(publicDir));

function requireAdmin(req, res, next){
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if(token === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

app.get('/api/site', async (req, res) => {
  try{
    const raw = await fs.readFile(dataFile, 'utf-8');
    const json = JSON.parse(raw);
    res.json(json);
  }catch(err){
    // If no site.json yet, fall back to a sensible default template
    if (err && (err.code === 'ENOENT' || err.message?.includes('ENOENT'))) {
      try{
        const fallbackRaw = await fs.readFile(path.join(templatesDir, 'starter.json'), 'utf-8');
        const fallback = JSON.parse(fallbackRaw);
        return res.json(fallback);
      }catch(e){
        return res.status(500).json({ error: 'No site.json and failed to load default template' });
      }
    }
    res.status(500).json({ error: 'Failed to read site.json' });
  }
});

app.post('/api/site', requireAdmin, async (req, res) => {
  try{
    const incoming = req.body;
    if(typeof incoming !== 'object' || incoming == null){
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(incoming, null, 2));
    res.json({ ok: true });
  }catch(err){
    res.status(500).json({ error: 'Failed to write site.json' });
  }
});

// Upload image endpoint
app.post('/api/upload', requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({ 
      success: true, 
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename
    });
  });
});

// Delete uploaded image
app.delete('/api/uploads/:filename', requireAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    await fs.unlink(path.join(uploadsDir, filename));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Draft Management Endpoints
app.post('/api/drafts', async (req, res) => {
  try {
    const draftData = req.body;
    
    if (!draftData || !draftData.templateId) {
      return res.status(400).json({ error: 'Invalid draft data' });
    }
    
    // Generate unique draft ID
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const draftFile = path.join(draftsDir, `${draftId}.json`);
    
    // Add expiration timestamp (7 days from now)
    const draft = {
      draftId: draftId,
      templateId: draftData.templateId,
      businessData: draftData.businessData || {},
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft'
    };
    
    await fs.writeFile(draftFile, JSON.stringify(draft, null, 2));
    
    res.json({ 
      success: true, 
      draftId: draftId,
      previewUrl: `/preview/${draftId}`,
      expiresAt: draft.expiresAt
    });
  } catch (err) {
    console.error('Draft save error:', err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

app.get('/api/drafts/:draftId', async (req, res) => {
  try {
    const draftId = req.params.draftId;
    const draftFile = path.join(draftsDir, `${draftId}.json`);
    
    const draftRaw = await fs.readFile(draftFile, 'utf-8');
    const draft = JSON.parse(draftRaw);
    
    // Check if draft is expired
    if (new Date(draft.expiresAt) < new Date()) {
      await fs.unlink(draftFile);
      return res.status(410).json({ error: 'Draft has expired' });
    }
    
    res.json(draft);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Draft not found' });
    } else {
      res.status(500).json({ error: 'Failed to load draft' });
    }
  }
});

app.delete('/api/drafts/:draftId', async (req, res) => {
  try {
    const draftId = req.params.draftId;
    const draftFile = path.join(draftsDir, `${draftId}.json`);
    await fs.unlink(draftFile);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

// Save site data from setup flow
app.post('/api/setup', async (req, res) => {
  try {
    const setupData = req.body;
    console.log('Received setup data:', JSON.stringify(setupData, null, 2));
    
    if (!setupData) {
      return res.status(400).json({ error: 'No data received' });
    }
    
    if (!setupData.templateId) {
      return res.status(400).json({ error: 'templateId is required' });
    }
    
    // Load the template
    const templateFile = path.join(templatesDir, `${setupData.templateId}.json`);
    let siteData;
    
    try {
      const templateRaw = await fs.readFile(templateFile, 'utf-8');
      siteData = JSON.parse(templateRaw);
    } catch (err) {
      // Fallback to starter template if template not found
      const starterRaw = await fs.readFile(path.join(templatesDir, 'starter.json'), 'utf-8');
      siteData = JSON.parse(starterRaw);
    }
    
    // Update site data with setup information
    if (setupData.businessData && typeof setupData.businessData === 'object') {
      if (setupData.businessData.businessName && setupData.businessData.businessName.trim()) {
        siteData.brand.name = setupData.businessData.businessName;
      }
      
      if (siteData.hero) {
        if (setupData.businessData.heroTitle && setupData.businessData.heroTitle.trim()) {
          siteData.hero.title = setupData.businessData.heroTitle;
        }
        if (setupData.businessData.heroSubtitle && setupData.businessData.heroSubtitle.trim()) {
          siteData.hero.subtitle = setupData.businessData.heroSubtitle;
        }
        if (setupData.businessData.heroImage && setupData.businessData.heroImage.trim()) {
          siteData.hero.image = setupData.businessData.heroImage;
        }
      }
      
      if (siteData.contact) {
        if (setupData.businessData.email && setupData.businessData.email.trim()) siteData.contact.email = setupData.businessData.email;
        if (setupData.businessData.phone && setupData.businessData.phone.trim()) siteData.contact.phone = setupData.businessData.phone;
        if (setupData.businessData.address && setupData.businessData.address.trim()) siteData.contact.subtitle = setupData.businessData.address;
        if (setupData.businessData.businessHours && setupData.businessData.businessHours.trim()) siteData.contact.hours = setupData.businessData.businessHours;
      }
      
      // Update services/products
      if (Array.isArray(setupData.businessData.services) && setupData.businessData.services.length > 0) {
        // Determine if this template uses 'products' or 'services'
        if (siteData.products) {
          siteData.products = setupData.businessData.services
            .filter(s => s.name && s.name.trim())
            .map(s => ({
              name: s.name,
              price: parseFloat(s.price) || 0,
              description: s.description || '',
              ...(s.image && s.image.trim() && { image: s.image }),
              ...(s.imageAlt && { imageAlt: s.imageAlt })
            }));
        } else if (siteData.services) {
          siteData.services.items = setupData.businessData.services
            .filter(s => s.name && s.name.trim())
            .map(s => ({
              title: s.name,
              description: s.description || '',
              ...(s.price && { price: s.price }),
              ...(s.image && s.image.trim() && { image: s.image }),
              ...(s.imageAlt && { imageAlt: s.imageAlt })
            }));
        }
      }
    }
    
    // Create unique page ID
    const pageId = `${setupData.templateId}-${Date.now()}`;
    const pageDir = path.join(publicDir, 'pages', pageId);
    const pageDataFile = path.join(pageDir, 'site.json');
    
    // Save to new page directory
    await fs.mkdir(pageDir, { recursive: true });
    await fs.writeFile(pageDataFile, JSON.stringify(siteData, null, 2));
    
    // Create page index.html
    const pageHtml = await fs.readFile(path.join(publicDir, 'index.html'), 'utf-8');
    const modifiedHtml = pageHtml.replace(
      './data/site.json',
      `./site.json?page=${pageId}`
    );
    await fs.writeFile(path.join(pageDir, 'index.html'), modifiedHtml);
    
    res.json({ success: true, templateId: setupData.templateId, pageId: pageId });
  } catch (err) {
    console.error('Setup save error:', err);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
