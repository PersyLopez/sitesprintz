import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-token';

const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');
const draftsDir = path.join(publicDir, 'drafts');
const usersDir = path.join(publicDir, 'users');
const dataFile = path.join(publicDir, 'data', 'site.json');
const templatesDir = path.join(publicDir, 'data', 'templates');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Ensure directories exist
fs.mkdir(uploadsDir, { recursive: true }).catch(() => {});
fs.mkdir(draftsDir, { recursive: true }).catch(() => {});
fs.mkdir(usersDir, { recursive: true }).catch(() => {});

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

// Add favicon route to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content, but no error
});

function requireAdmin(req, res, next){
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if(token === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// JWT Authentication middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Authentication Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Check if user already exists
    const userFile = path.join(usersDir, `${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    
    try {
      await fs.access(userFile);
      return res.status(409).json({ error: 'User already exists' });
    } catch (err) {
      // User doesn't exist, proceed with registration
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      id: `user_${Date.now()}`,
      email: email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      sites: []
    };
    
    await fs.writeFile(userFile, JSON.stringify(user, null, 2));
    
    // Generate JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ success: true, token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Load user
    const userFile = path.join(usersDir, `${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    
    let user;
    try {
      const userData = await fs.readFile(userFile, 'utf-8');
      user = JSON.parse(userData);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ success: true, token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const { email } = req.user;
    const userFile = path.join(usersDir, `${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    
    const userData = await fs.readFile(userFile, 'utf-8');
    const user = JSON.parse(userData);
    
    res.json({ id: user.id, email: user.email, sites: user.sites });
  } catch (err) {
    res.status(404).json({ error: 'User not found' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  // JWT is stateless, so logout is handled client-side
  res.json({ success: true, message: 'Logged out successfully' });
});

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

// Publish Draft to Live Site
app.post('/api/drafts/:draftId/publish', async (req, res) => {
  try {
    const { draftId } = req.params;
    const { plan, email } = req.body; // plan: starter, business, pro
    
    // Load draft
    const draftFile = path.join(draftsDir, `${draftId}.json`);
    let draft;
    
    try {
      const draftRaw = await fs.readFile(draftFile, 'utf-8');
      draft = JSON.parse(draftRaw);
    } catch (err) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    
    // Check if draft is expired
    if (new Date(draft.expiresAt) < new Date()) {
      await fs.unlink(draftFile);
      return res.status(410).json({ error: 'Draft has expired' });
    }
    
    // Load template data
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
      // Business name
      if (draft.businessData.businessName && draft.businessData.businessName.trim()) {
        siteData.brand.name = draft.businessData.businessName;
      }
      
      // Hero section
      if (siteData.hero) {
        if (draft.businessData.heroTitle) siteData.hero.title = draft.businessData.heroTitle;
        if (draft.businessData.heroSubtitle) siteData.hero.subtitle = draft.businessData.heroSubtitle;
        if (draft.businessData.heroImage) siteData.hero.image = draft.businessData.heroImage;
      }
      
      // Contact information
      if (siteData.contact) {
        if (draft.businessData.email) siteData.contact.email = draft.businessData.email;
        if (draft.businessData.phone) siteData.contact.phone = draft.businessData.phone;
        if (draft.businessData.address) siteData.contact.subtitle = draft.businessData.address;
        if (draft.businessData.businessHours) siteData.contact.hours = draft.businessData.businessHours;
      }
      
      // Social media links (add new section if not exists)
      if (!siteData.social) siteData.social = {};
      if (draft.businessData.websiteUrl) siteData.social.website = draft.businessData.websiteUrl;
      if (draft.businessData.facebookUrl) siteData.social.facebook = draft.businessData.facebookUrl;
      if (draft.businessData.instagramUrl) siteData.social.instagram = draft.businessData.instagramUrl;
      if (draft.businessData.googleMapsUrl) siteData.social.maps = draft.businessData.googleMapsUrl;
      
      // Template-specific fields (preserve custom data)
      if (draft.businessData.templateSpecific && Object.keys(draft.businessData.templateSpecific).length > 0) {
        if (!siteData.custom) siteData.custom = {};
        Object.assign(siteData.custom, draft.businessData.templateSpecific);
      }
      
      // Update services/products
      if (Array.isArray(draft.businessData.services) && draft.businessData.services.length > 0) {
        if (siteData.products) {
          siteData.products = draft.businessData.services
            .filter(s => s.name && s.name.trim())
            .map(s => ({
              name: s.name,
              price: parseFloat(s.price) || 0,
              description: s.description || '',
              ...(s.image && { image: s.image }),
              ...(s.imageAlt && { imageAlt: s.imageAlt })
            }));
        } else if (siteData.services) {
          siteData.services.items = draft.businessData.services
            .filter(s => s.name && s.name.trim())
            .map(s => ({
              title: s.name,
              description: s.description || '',
              ...(s.price && { price: s.price }),
              ...(s.image && { image: s.image }),
              ...(s.imageAlt && { imageAlt: s.imageAlt })
            }));
        }
      }
      
      // Add publishing metadata
      siteData.published = {
        at: new Date().toISOString(),
        plan: plan,
        email: email,
        subdomain: null // will be set after generation
      };
    }
    
    // Generate unique subdomain
    const subdomain = generateSubdomain(siteData.brand.name);
    const sitesDir = path.join(publicDir, 'sites', subdomain);
    const siteConfigFile = path.join(sitesDir, 'site.json');
    const siteIndexFile = path.join(sitesDir, 'index.html');
    
    // Create site directory
    await fs.mkdir(sitesDir, { recursive: true });
    
    // Save site.json
    await fs.writeFile(siteConfigFile, JSON.stringify(siteData, null, 2));
    
    // Create index.html for the site (use a dynamic template)
    const siteHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Loading...</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
      .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
      .card { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px 0; }
      .btn { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
      .btn-primary { background: #3b82f6; }
      .btn-secondary { background: #6b7280; }
      .hero { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; padding: 60px 0; }
      .hero h1 { font-size: 3rem; font-weight: 700; margin: 0 0 20px 0; }
      .hero p { font-size: 1.2rem; color: #6b7280; margin: 0 0 30px 0; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
      .mt-2 { margin-top: 1rem; }
      .mt-3 { margin-top: 1.5rem; }
      .muted { color: #6b7280; }
      #app { min-height: 100vh; }
      #content { min-height: 100vh; }
    </style>
  </head>
  <body>
    <div id="app">Loading...</div>
    <div id="content"></div>
    <script src="/app.js"></script>
  </body>
</html>`;
    await fs.writeFile(siteIndexFile, siteHtml);
    
    // Update published metadata with subdomain
    if (siteData.published) {
      siteData.published.subdomain = subdomain;
      // Re-save site.json with subdomain
      await fs.writeFile(siteConfigFile, JSON.stringify(siteData, null, 2));
    }
    
    // Delete draft after successful publish
    await fs.unlink(draftFile);
    
    // TODO: Store user info and site association if authenticated
    
    res.json({
      success: true,
      subdomain: subdomain,
      url: `http://localhost:${PORT}/sites/${subdomain}/`, // Correct URL for current setup
      plan: plan,
      publishedAt: new Date().toISOString(),
      businessName: siteData.brand?.name || 'Your Business',
      whatsIncluded: getPlanFeatures(plan)
    });
    
    function getPlanFeatures(plan) {
      const features = {
        starter: ['Your unique subdomain', 'Mobile-responsive design', 'Contact form', 'Social media links', 'Basic support'],
        business: ['Everything in Starter', 'Custom domain support', 'Unlimited pages', 'SEO optimization', 'Analytics', 'Priority support'],
        pro: ['Everything in Business', 'All premium templates', 'Advanced customization', 'Custom branding', 'API access', '24/7 support']
      };
      return features[plan] || features.starter;
    }
    
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

// Helper function to generate subdomain from business name
function generateSubdomain(businessName) {
  // Convert to lowercase, remove special chars, replace spaces with hyphens
  let subdomain = businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30); // Limit length
  
  // Remove trailing hyphens
  subdomain = subdomain.replace(/-+$/g, '');
  
  // If empty, use default
  if (!subdomain) subdomain = 'mybusiness';
  
  // Add timestamp to make it unique
  subdomain += `-${Date.now().toString(36)}`;
  
  return subdomain;
}

// Route handler for /sites/{subdomain}/ paths
app.get('/sites/:subdomain/:filename', async (req, res, next) => {
  const { subdomain, filename } = req.params;
  const siteDir = path.join(publicDir, 'sites', subdomain);
  const fullPath = path.join(siteDir, filename);
  
  try {
    await fs.access(fullPath);
    res.sendFile(fullPath);
  } catch (err) {
    next();
  }
});

// Route handler for /sites/{subdomain}/ (root of site)
app.get('/sites/:subdomain/', async (req, res, next) => {
  const { subdomain } = req.params;
  const siteDir = path.join(publicDir, 'sites', subdomain);
  const siteIndexFile = path.join(siteDir, 'index.html');
  
  try {
    await fs.access(siteIndexFile);
    res.sendFile(siteIndexFile);
  } catch (err) {
    next();
  }
});

// Subdomain Routing Middleware
app.use((req, res, next) => {
  const hostname = req.get('host') || '';
  const subdomain = hostname.split('.')[0];
  
  // Skip for localhost or if it's a known route/api
  if (hostname.includes('localhost') || req.path.startsWith('/api/') || req.path.startsWith('/data/') || req.path.includes('.')) {
    return next();
  }
  
  // Check if subdomain exists in sites directory
  const sitesDir = path.join(publicDir, 'sites', subdomain);
  const siteIndexFile = path.join(sitesDir, 'index.html');
  
  // Check if site exists
  fs.access(siteIndexFile)
    .then(() => {
      // Site exists, serve from subdomain directory
      const siteConfigFile = path.join(sitesDir, 'site.json');
      
      fs.access(siteConfigFile)
        .then(() => {
          // Serve the site's index.html
          req.url = `/sites/${subdomain}/index.html`;
          next();
        })
        .catch(() => {
          // If no site.json, serve index.html directly
          req.url = `/sites/${subdomain}/index.html`;
          next();
        });
    })
    .catch(() => {
      // Not a subdomain site, continue with normal routing
      next();
    });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
